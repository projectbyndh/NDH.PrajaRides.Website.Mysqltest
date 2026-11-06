// MySQL for the scripts in this folder, with the same tagged-template shape lib/mysql.ts gives the
// app, so a script reads like the code it supports:
//
//   import { connect } from "./_db.mjs";
//   const sql = await connect(env);
//   const rows = await sql`SELECT slot FROM site_images`;
//   await sql.end();
//
// Values are bound parameters, never text. Deliberately small: the scripts need plain queries,
// `unsafe` for DDL, `begin` for a transaction and `end` to close.
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";

/** KEY=value lines of a .env file, with surrounding quotes stripped. */
export function readEnvFile(url) {
  try {
    return Object.fromEntries(
      readFileSync(url, "utf8")
        .split(/\r?\n/)
        .map((l) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(l))
        .filter(Boolean)
        .map((m) => [m[1], m[2].trim().replace(/^(['"])([\s\S]*)\1$/, "$2")]),
    );
  } catch {
    return {};
  }
}

// TLS is pointless and usually unavailable on a host that never leaves this machine; see the
// matching note in src/lib/mysql.ts.
const isLocal = (host) => ["localhost", "127.0.0.1", "::1", ""].includes(String(host).trim().toLowerCase());
const sslDefault = (host, env) =>
  env.MYSQL_SSL === "true" ? true : env.MYSQL_SSL === "false" ? false : !isLocal(host);

export function settings(env = process.env) {
  if (env.MYSQL_URL) {
    const u = new URL(env.MYSQL_URL);
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      ssl: u.searchParams.get("ssl") === "false" ? false : sslDefault(u.hostname, env),
    };
  }
  const missing = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER"].filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`${missing.join(", ")} not set. Set the MYSQL_* variables (or MYSQL_URL) in .env.`);
  }
  return {
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT || 3306),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD ?? "",
    database: env.MYSQL_DATABASE,
    ssl: sslDefault(env.MYSQL_HOST, env),
  };
}

export async function connect(env = process.env) {
  const c = settings(env);
  const conn = await mysql.createConnection({
    host: c.host,
    port: c.port,
    user: c.user,
    password: c.password,
    database: c.database,
    // Timestamps are stored as UTC, so the connection reads and writes them as UTC (see
    // db/schema.mysql.sql). Without this a script would shift every date it wrote.
    timezone: "Z",
    charset: "utf8mb4_unicode_ci",
    connectTimeout: 20_000,
    ssl: c.ssl ? { rejectUnauthorized: false } : undefined,
  });

  const run = async (text, params) => {
    const [rows] = await conn.query(text, params);
    if (Array.isArray(rows)) return rows;
    const out = [];
    out.count = rows?.affectedRows ?? 0;
    return out;
  };

  const sql = (strings, ...values) => {
    if (!Array.isArray(strings?.raw)) throw new Error("sql must be used as a tagged template");
    let text = "";
    const params = [];
    strings.forEach((part, i) => {
      text += part;
      if (i >= values.length) return;
      const v = values[i];
      text += "?";
      params.push(typeof v === "boolean" ? (v ? 1 : 0) : v === undefined ? null : v);
    });
    return run(text, params);
  };
  sql.unsafe = (text, params = []) => run(text, params);
  sql.begin = async (fn) => {
    await conn.beginTransaction();
    try {
      const result = await fn(sql);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    }
  };
  sql.end = () => conn.end();
  return sql;
}

/**
 * The schema from src/lib/schema.ts as single statements, so a script can bring a database up to
 * date with exactly the SQL the app would run. Read out of the file rather than imported, because
 * these scripts are plain .mjs and schema.ts is TypeScript.
 */
export function schemaFromSource(schemaTsUrl) {
  const src = readFileSync(schemaTsUrl, "utf8");
  const body = src.slice(src.indexOf("export const SCHEMA = `") + "export const SCHEMA = `".length, src.lastIndexOf("`"));
  const version = Number(/SCHEMA_VERSION = (\d+)/.exec(src)[1]);
  const statements = body
    .replace(/\\`/g, "`")
    .split(/;\s*$/m)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !/^\s*--/.test(line))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
  return { version, statements };
}

/** Brings a database up to the schema in src/lib/schema.ts. */
export async function applySchema(sql, schemaTsUrl) {
  const { version, statements } = schemaFromSource(schemaTsUrl);
  await sql`CREATE TABLE IF NOT EXISTS \`schema_meta\` (\`id\` INT NOT NULL, \`version\` INT NOT NULL, PRIMARY KEY (\`id\`))`;
  for (const statement of statements) await sql.unsafe(statement);
  await sql`
    INSERT INTO \`schema_meta\` (id, version) VALUES (1, ${version})
    ON DUPLICATE KEY UPDATE version = VALUES(version)`;
  return version;
}
