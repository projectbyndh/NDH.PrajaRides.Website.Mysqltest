// Copies the whole PostgreSQL database (schema + every row) to MySQL / MariaDB.
//
//   node scripts/pg-to-mysql.mjs                     # schema + data, straight into MySQL
//   node scripts/pg-to-mysql.mjs --schema-only       # create the tables, copy nothing
//   node scripts/pg-to-mysql.mjs --data-only         # tables already exist
//   node scripts/pg-to-mysql.mjs --truncate          # empty the MySQL tables first (re-run clean)
//   node scripts/pg-to-mysql.mjs --tables drivers,photos
//   node scripts/pg-to-mysql.mjs --dump db/migration.sql   # no MySQL connection: write a .sql file
//
// Reads DATABASE_URL (source) and MYSQL_URL, or MYSQL_HOST / MYSQL_PORT / MYSQL_DATABASE /
// MYSQL_USER / MYSQL_PASSWORD (target), from .env — override with --env-file <path>.
//
// --dump exists because shared hosting (Hostinger included) usually refuses MySQL connections from
// anywhere but the server itself: "Remote MySQL" has to be switched on and this machine's IP
// allow-listed first. Until then the dump file imports through phpMyAdmin and loads the same rows.
//
// The table list and column types come from the live Postgres catalog rather than from
// db/schema.sql, so a column added on the server but not yet in the repo still comes across.
//
// Rows are read with every awkward type already rendered as text by Postgres itself
// (timestamps as UTC 'YYYY-MM-DD HH:MM:SS.mmm', dates as 'YYYY-MM-DD', uuid and jsonb as text).
// Converting in SQL instead of in JavaScript keeps the driver's time zone, locale and JSON parsing
// out of a one-way migration: what Postgres printed is what MySQL stores.

import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import postgres from "postgres";
import mysqlLib from "mysql2/promise";
import { escape as sqlEscape } from "mysql2";

// ---------------------------------------------------------------- arguments and configuration

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || i === argv.length - 1 ? fallback : argv[i + 1];
};

const OPT = {
  envFile: value("env-file", ".env"),
  schemaOnly: flag("schema-only"),
  dataOnly: flag("data-only"),
  truncate: flag("truncate"),
  dump: value("dump"),
  only: value("tables")?.split(",").map((t) => t.trim()).filter(Boolean) ?? null,
  batchRows: Number(value("batch", 500)),
  maxPacketMb: Number(value("max-packet-mb", 2)),
};

function loadEnv(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return {};
  }
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue; // comment or blank
    out[m[1]] = m[2].trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
  }
  return out;
}

const env = { ...loadEnv(OPT.envFile), ...process.env };

function mysqlConfig() {
  if (env.MYSQL_URL) {
    const u = new URL(env.MYSQL_URL);
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  }
  const missing = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"].filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(
      `MySQL is not configured: ${missing.join(", ")} missing from ${OPT.envFile}.` +
        " Set MYSQL_URL or those four variables, or run with --dump <file> to write a .sql file instead.",
    );
  }
  return {
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT || 3306),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
  };
}

// ---------------------------------------------------------------- type mapping

// Postgres type -> MySQL column type. The odd ones are explained in db/schema.mysql.sql.
function mysqlType(col) {
  const { udt, length, nullable, hasDefault, defaultText } = col;
  const textDefault = !nullable && hasDefault && /^''::/.test(defaultText ?? "");
  switch (udt) {
    case "uuid":
      return "CHAR(36)";
    case "varchar":
    case "bpchar":
      return `${udt === "bpchar" ? "CHAR" : "VARCHAR"}(${length ?? 255})`;
    case "text":
      // MySQL rejects a DEFAULT on TEXT, so a NOT NULL DEFAULT '' column becomes a VARCHAR wide
      // enough for the copy. posts.body is the one long one and keeps MEDIUMTEXT (no default).
      return textDefault && col.table + "." + col.name !== "posts.body" ? "VARCHAR(1000)" : "MEDIUMTEXT";
    case "bool":
      return "TINYINT(1)";
    case "int2":
      return "SMALLINT";
    case "int4":
      return "INT";
    case "int8":
      return "BIGINT";
    case "float4":
      return "FLOAT";
    case "float8":
      return "DOUBLE";
    case "numeric":
      return "DECIMAL(20,6)";
    case "date":
      return "DATE";
    case "time":
      return "TIME";
    case "timestamp":
    case "timestamptz":
      return "DATETIME(3)";
    case "bytea":
      return "LONGBLOB";
    case "json":
    case "jsonb":
      return "JSON";
    default:
      return "MEDIUMTEXT"; // arrays, enums and anything exotic survive as their text form
  }
}

// MySQL DEFAULT clause for a Postgres column default, or "" when it cannot carry over.
function mysqlDefault(col) {
  const d = col.defaultText;
  if (!d) return "";
  const type = mysqlType(col);
  if (/^(TEXT|MEDIUMTEXT|LONGTEXT|LONGBLOB|JSON)$/.test(type)) return ""; // MySQL forbids these
  if (/nextval\(/.test(d)) return ""; // SERIAL: handled as AUTO_INCREMENT
  if (/^(now\(\)|CURRENT_TIMESTAMP)/i.test(d)) return " DEFAULT CURRENT_TIMESTAMP(3)";
  if (/^gen_random_uuid\(\)/.test(d)) return ""; // the app supplies the id
  if (/^(true|false)$/i.test(d)) return ` DEFAULT ${/^true$/i.test(d) ? 1 : 0}`;
  const str = /^'([\s\S]*)'::/.exec(d);
  if (str) return ` DEFAULT ${sqlEscape(str[1])}`;
  const num = /^-?\d+(\.\d+)?$/.exec(d);
  if (num) return ` DEFAULT ${d}`;
  return "";
}

// A row value, ready for mysql2. Postgres already rendered dates/json/uuid as text (see selectList).
const toMysql = (v) => (typeof v === "boolean" ? (v ? 1 : 0) : v === undefined ? null : v);

// ---------------------------------------------------------------- reading the source

function pgConnect() {
  const raw = env.DATABASE_URL;
  if (!raw?.trim()) throw new Error(`DATABASE_URL is not set in ${OPT.envFile}.`);
  const url = new URL(raw.trim().replace(/^(['"])([\s\S]*)\1$/, "$2"));
  url.searchParams.delete("channel_binding");
  return postgres(url.toString(), {
    max: 1,
    prepare: false,
    connect_timeout: Number(env.DATABASE_CONNECT_TIMEOUT || 20),
    ssl: /sslmode=require/.test(url.search) ? { rejectUnauthorized: false } : undefined,
    onnotice: () => {},
  });
}

async function describe(sql) {
  const tables = await sql`
    SELECT table_name AS name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`;

  const out = [];
  for (const { name } of tables) {
    if (OPT.only && !OPT.only.includes(name)) continue;
    const cols = await sql`
      SELECT column_name, udt_name, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${name}
      ORDER BY ordinal_position`;
    const [{ n: rows }] = await sql.unsafe(`SELECT count(*)::int AS n FROM "${name}"`);
    out.push({
      name,
      rows,
      columns: cols.map((c) => ({
        table: name,
        name: c.column_name,
        udt: c.udt_name,
        length: c.character_maximum_length,
        nullable: c.is_nullable === "YES",
        hasDefault: c.column_default != null,
        defaultText: c.column_default,
        serial: /nextval\(/.test(c.column_default ?? ""),
      })),
    });
  }

  // Keys and indexes, so the MySQL tables are not a pile of unindexed columns.
  const keys = await sql`
    SELECT c.conrelid::regclass::text AS tbl, c.contype::text AS kind,
           pg_get_constraintdef(c.oid) AS def,
           c.confrelid::regclass::text AS reftbl
    FROM pg_constraint c
    WHERE c.connamespace = 'public'::regnamespace AND c.contype IN ('p','u','f','c')`;
  const indexes = await sql`
    SELECT tablename AS tbl, indexname AS name, indexdef AS def
    FROM pg_indexes WHERE schemaname = 'public'`;

  for (const t of out) {
    t.keys = keys.filter((k) => k.tbl === t.name || k.tbl === `"${t.name}"`);
    t.indexes = indexes.filter((i) => i.tbl === t.name);
  }
  return out;
}

// Parent tables first, so a foreign key never points at an empty table mid-load.
function order(tables) {
  const byName = new Map(tables.map((t) => [t.name, t]));
  const done = new Set();
  const sorted = [];
  const visit = (t, seen = new Set()) => {
    if (done.has(t.name) || seen.has(t.name)) return;
    seen.add(t.name);
    for (const k of t.keys.filter((k) => k.kind === "f")) {
      const parent = byName.get(k.reftbl?.replace(/"/g, ""));
      if (parent && parent !== t) visit(parent, seen);
    }
    done.add(t.name);
    sorted.push(t);
  };
  tables.forEach((t) => visit(t));
  return sorted;
}

// ---------------------------------------------------------------- DDL

const quote = (id) => `\`${id}\``;

function createTable(t) {
  const lines = [];
  for (const c of t.columns) {
    const type = mysqlType(c);
    const auto = c.serial ? " AUTO_INCREMENT" : "";
    lines.push(
      `  ${quote(c.name)} ${type}${c.nullable ? " NULL" : " NOT NULL"}${mysqlDefault(c)}${auto}`,
    );
  }

  const cols = (def) => {
    const m = /\(([^)]*)\)/.exec(def);
    return m
      ? m[1]
          .split(",")
          .map((s) => s.trim().replace(/\s+(ASC|DESC)$/i, "").replace(/"/g, ""))
          .map(quote)
          .join(", ")
      : "";
  };

  const pk = t.keys.find((k) => k.kind === "p");
  if (pk) lines.push(`  PRIMARY KEY (${cols(pk.def)})`);

  const seen = new Set();
  for (const i of t.indexes) {
    if (pk && i.def.includes("UNIQUE") && cols(i.def) === cols(pk.def)) continue;
    if (/_pkey\b/.test(i.name)) continue;
    const list = cols(i.def);
    if (!list || seen.has(list)) continue;
    seen.add(list);
    lines.push(`  ${i.def.includes("UNIQUE") ? "UNIQUE KEY" : "KEY"} ${quote(i.name)} (${list})`);
  }

  for (const k of t.keys.filter((k) => k.kind === "f")) {
    const m = /FOREIGN KEY \(([^)]*)\) REFERENCES ([^\s(]+)\(([^)]*)\)(.*)$/.exec(k.def);
    if (!m) continue;
    const onDelete = /ON DELETE CASCADE/i.test(m[4]) ? " ON DELETE CASCADE" : "";
    lines.push(
      `  CONSTRAINT ${quote(`${t.name}_${m[1].replace(/\W/g, "")}_fk`)} FOREIGN KEY (${m[1]
        .split(",")
        .map((s) => quote(s.trim().replace(/"/g, "")))
        .join(", ")}) REFERENCES ${quote(m[2].replace(/"/g, ""))} (${m[3]
        .split(",")
        .map((s) => quote(s.trim().replace(/"/g, "")))
        .join(", ")})${onDelete}`,
    );
  }

  for (const k of t.keys.filter((k) => k.kind === "c")) {
    const m = /CHECK \(\((.*)\)\)$/.exec(k.def);
    // Postgres prints checks with quoted identifiers and ::casts; only the simple ones port cleanly.
    if (m && !/::/.test(m[1])) lines.push(`  CHECK (${m[1].replace(/"/g, "`")})`);
  }

  return (
    `CREATE TABLE IF NOT EXISTS ${quote(t.name)} (\n${lines.join(",\n")}\n)` +
    ` ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  );
}

// ---------------------------------------------------------------- reading rows

// Let Postgres render the values: UTC timestamps in MySQL's own format, dates without a time,
// uuid/json as text. bytea stays binary and arrives as a Buffer.
function selectList(t) {
  return t.columns
    .map((c) => {
      const col = `"${c.name}"`;
      if (c.udt === "timestamptz" || c.udt === "timestamp")
        return `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.MS') AS "${c.name}"`;
      if (c.udt === "date") return `to_char(${col}, 'YYYY-MM-DD') AS "${c.name}"`;
      if (c.udt === "time") return `to_char(${col}, 'HH24:MI:SS') AS "${c.name}"`;
      if (c.udt === "uuid" || c.udt === "jsonb" || c.udt === "json") return `${col}::text AS "${c.name}"`;
      return `${col} AS "${c.name}"`;
    })
    .join(", ");
}

// Rows are grouped into statements small enough for max_allowed_packet: the photo tables hold
// image bytes, and one row there can be larger than every row of another table put together.
function* batches(rows, { maxBytes, maxRows }) {
  let batch = [];
  let bytes = 0;
  for (const row of rows) {
    const size = row.reduce(
      (n, v) => n + (Buffer.isBuffer(v) ? v.length : v == null ? 4 : String(v).length),
      0,
    );
    if (batch.length && (batch.length >= maxRows || bytes + size > maxBytes)) {
      yield batch;
      batch = [];
      bytes = 0;
    }
    batch.push(row);
    bytes += size;
  }
  if (batch.length) yield batch;
}

// ---------------------------------------------------------------- the two writers

function fileWriter(path) {
  writeFileSync(
    path,
    [
      `-- Praja Ride: PostgreSQL -> MySQL migration (schema + data).`,
      `-- Import into u763937081_prajamysqldb through phpMyAdmin, or:  mysql <db> < ${path}`,
      `SET NAMES utf8mb4;`,
      `SET FOREIGN_KEY_CHECKS = 0;`,
      `SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';`,
      ``,
    ].join("\n"),
  );
  return {
    label: `file ${path}`,
    async ddl(statement) {
      appendFileSync(path, `${statement}\n\n`);
    },
    async insert(table, columns, rows) {
      const values = rows
        .map((r) => `(${r.map((v) => sqlEscape(toMysql(v))).join(",")})`)
        .join(",\n  ");
      appendFileSync(
        path,
        `INSERT IGNORE INTO ${quote(table)} (${columns.map(quote).join(", ")}) VALUES\n  ${values};\n`,
      );
    },
    async truncate(table) {
      appendFileSync(path, `DELETE FROM ${quote(table)};\n`);
    },
    async counts() {
      return null; // nothing to count: the rows are not loaded yet
    },
    async close() {
      appendFileSync(path, `\nSET FOREIGN_KEY_CHECKS = 1;\n`);
    },
  };
}

async function mysqlWriter() {
  const cfg = mysqlConfig();
  const conn = await mysqlLib.createConnection({
    ...cfg,
    multipleStatements: false,
    dateStrings: true,
    // Hostinger and most managed MySQL hosts offer TLS; allow it without a local CA bundle.
    ssl: env.MYSQL_SSL === "false" ? undefined : { rejectUnauthorized: false },
  });
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  await conn.query("SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO'");
  const [[ver]] = await conn.query("SELECT version() AS v");
  return {
    label: `${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database} (MySQL ${ver.v})`,
    async ddl(statement) {
      await conn.query(statement);
    },
    async insert(table, columns, rows) {
      await conn.query(
        `INSERT IGNORE INTO ${quote(table)} (${columns.map(quote).join(", ")}) VALUES ?`,
        [rows.map((r) => r.map(toMysql))],
      );
    },
    async truncate(table) {
      await conn.query(`DELETE FROM ${quote(table)}`);
    },
    async counts(tables) {
      const out = {};
      for (const t of tables) {
        const [[row]] = await conn.query(`SELECT count(*) AS n FROM ${quote(t.name)}`);
        out[t.name] = Number(row.n);
      }
      return out;
    },
    async close() {
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      await conn.end();
    },
  };
}

// ---------------------------------------------------------------- run

const sql = pgConnect();
let out;
try {
  const [{ db, user }] = await sql`SELECT current_database() AS db, current_user AS user`;
  console.log(`source  Postgres ${user}@${db}`);

  const tables = order(await describe(sql));
  if (!tables.length) throw new Error("No tables found in the Postgres 'public' schema.");

  out = OPT.dump ? fileWriter(OPT.dump) : await mysqlWriter();
  console.log(`target  ${out.label}`);
  console.log(
    `tables  ${tables.length}, ${tables.reduce((n, t) => n + t.rows, 0).toLocaleString()} rows total\n`,
  );

  if (!OPT.dataOnly) {
    for (const t of tables) await out.ddl(createTable(t));
    console.log(`schema  ${tables.length} tables created (existing ones left alone)`);
  }

  const copied = {};
  if (!OPT.schemaOnly) {
    if (OPT.truncate) for (const t of [...tables].reverse()) await out.truncate(t.name);

    const maxBytes = Math.floor(OPT.maxPacketMb * 1024 * 1024);
    for (const t of tables) {
      const columns = t.columns.map((c) => c.name);
      let n = 0;
      if (t.rows > 0) {
        const cursor = sql.unsafe(`SELECT ${selectList(t)} FROM "${t.name}"`).cursor(OPT.batchRows);
        for await (const chunk of cursor) {
          const rows = chunk.map((row) => columns.map((c) => row[c]));
          for (const batch of batches(rows, { maxBytes, maxRows: OPT.batchRows })) {
            await out.insert(t.name, columns, batch);
            n += batch.length;
          }
          process.stdout.write(`\rcopy    ${t.name} ${n}/${t.rows}`.padEnd(60));
        }
      }
      copied[t.name] = n;
      console.log(`\rcopy    ${t.name.padEnd(22)} ${String(n).padStart(8)} rows`.padEnd(60));
    }
  }

  const after = OPT.schemaOnly ? null : await out.counts(tables);
  console.log("\n--- result ---");
  let bad = 0;
  for (const t of tables) {
    const target = after ? after[t.name] : null;
    const ok = target == null || target >= t.rows;
    if (!ok) bad++;
    console.log(
      `${ok ? "ok  " : "DIFF"} ${t.name.padEnd(22)} postgres ${String(t.rows).padStart(8)}` +
        (target == null ? "" : `   mysql ${String(target).padStart(8)}`),
    );
  }
  if (OPT.dump) console.log(`\nWrote ${OPT.dump}. Import it in phpMyAdmin, then re-run with --data-only to verify.`);
  else if (bad) {
    console.error(`\n${bad} table(s) short of the source count. Re-run with --truncate for a clean load.`);
    process.exitCode = 1;
  } else console.log("\nEvery table matched or exceeded the source row count.");
} catch (err) {
  console.error(`\nFAILED: ${err.message}`);
  process.exitCode = 1;
} finally {
  await out?.close().catch(() => {});
  await sql.end({ timeout: 5 }).catch(() => {});
}
