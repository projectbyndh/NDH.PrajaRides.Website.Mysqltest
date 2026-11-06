import "server-only";
import mysql from "mysql2/promise";

// The MySQL client the site runs on, in the tagged-template shape the rest of lib/ uses:
//
//   const q = await sql();
//   const rows = await q`SELECT * FROM drivers WHERE id = ${id}`;
//   await q`INSERT INTO drivers ${q({ id, name })}`;
//   await q`UPDATE drivers SET ${q({ name })} WHERE id = ${id}`;
//
// Every interpolated value becomes a bound "?" parameter, never text, so nothing is glued into
// SQL. Three behaviours the call sites depend on:
//
//  * A query is LAZY. `q`...`` builds a Query and runs only when awaited, which is what lets one
//    be nested inside another as a fragment: `q`... ${cond ? q`AND x = ${v}` : q``}``. The nested
//    query's text is spliced in and its parameters keep their place in the order.
//  * `q(object)` reads the SQL to its left: after "SET" it writes `col = ?, col = ?`, otherwise
//    `(cols) VALUES (?, ?)` — so INSERT and UPDATE can share one helper.
//  * A result is an array of rows that also carries `.count` (affected rows), because updates and
//    deletes in lib/ check it to tell "changed" from "no such row".

// Row values are `any` on purpose: a column's type is not known until the query runs, and the
// call sites in lib/ read them directly (r.driver_id, row.content). postgres.js typed rows the
// same way, so keeping it means the port did not have to add a cast to every property read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

/** Rows, plus `count`: affected rows for INSERT/UPDATE/DELETE, row count for SELECT. */
export interface Result extends Array<Row> {
  count: number;
}

type Exec = (text: string, params: unknown[]) => Promise<Result>;

/**
 * A query being built. Awaiting it runs it; interpolating it into another query splices it in.
 * `PromiseLike` rather than a real Promise, so it stays inert until something awaits it.
 */
export class Query implements PromiseLike<Result> {
  // Written as plain fields rather than constructor parameter properties, so this module also
  // runs under type-stripping runtimes (node file.ts), which the script checks rely on.
  readonly text: string;
  readonly params: unknown[];
  protected readonly exec: Exec;

  constructor(text: string, params: unknown[], exec: Exec) {
    this.text = text;
    this.params = params;
    this.exec = exec;
  }

  then<A = Result, B = never>(
    onFulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.exec(this.text, this.params).then(onFulfilled, onRejected);
  }
}

/** `q({...})` before the SQL around it is known — resolved when it is spliced in (see makeSql). */
class PendingValues extends Query {
  readonly values: Row;

  constructor(values: Row, exec: Exec) {
    super("", [], exec);
    this.values = values;
  }
}

/**
 * Values mysql2 will not take as they are:
 *  * booleans -> 1/0, for the TINYINT(1) columns the schema uses
 *  * plain objects -> JSON text, for the JSON columns
 * Arrays are left alone on purpose: mysql2 expands an array parameter into a value list, which is
 * how `WHERE id IN (?)` works. JSON arrays go through `q.json()` instead, which stringifies.
 * Dates are left alone too: the connection runs in UTC (timezone "Z"), so a Date is stored as the
 * instant it represents and read back the same.
 */
function normalize(v: unknown): unknown {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === undefined) return null;
  if (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return JSON.stringify(v);
  }
  return v;
}

/** Turns a values object into `col = ?, ...` (after SET) or `(cols) VALUES (?, ...)`. */
function valuesFragment(left: string, values: Row, exec: Exec): Query {
  const entries = Object.entries(values);
  if (!entries.length) throw new Error("q({}) needs at least one column");
  const cols = entries.map(([c]) => `\`${c}\``);
  const params = entries.map(([, v]) => normalize(v));
  if (/\bset\s*$/i.test(left)) return new Query(cols.map((c) => `${c} = ?`).join(", "), params, exec);
  return new Query(`(${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`, params, exec);
}

/** `$1`-style placeholders (what the Postgres code wrote) to MySQL's positional `?`. */
function toPositional(text: string, params: unknown[]): { text: string; params: unknown[] } {
  if (!/\$\d/.test(text)) return { text, params: params.map(normalize) };
  const ordered: unknown[] = [];
  const out = text.replace(/\$(\d+)/g, (_, n) => {
    ordered.push(normalize(params[Number(n) - 1]));
    return "?";
  });
  return { text: out, params: ordered };
}

export type Sql = {
  /** Tagged template: every `${value}` becomes a bound parameter; nested queries splice in. */
  (strings: TemplateStringsArray, ...values: unknown[]): Query;
  /** Column/value object for INSERT or SET. */
  (values: Row): Query;
  /** SQL built in code (column lists, fixed conditions). `$1` placeholders are supported. */
  unsafe(text: string, params?: unknown[]): Query;
  /** A value for a JSON column. */
  json(value: unknown): Query;
  /** Everything in `fn` runs on one connection inside a transaction; throwing rolls back. */
  begin<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
};

type Runner = { query: (text: string, params: unknown[]) => Promise<unknown> };

function makeSql(runner: Runner, pool?: mysql.Pool): Sql {
  const exec: Exec = async (text, params) => {
    const out = (await runner.query(text, params)) as unknown;
    const first = Array.isArray(out) ? (out as unknown[])[0] : out;
    const rows: Row[] = Array.isArray(first) ? (first as Row[]) : [];
    const result = rows as Result;
    const header = first as { affectedRows?: number } | undefined;
    Object.defineProperty(result, "count", {
      value: Array.isArray(first) ? rows.length : (header?.affectedRows ?? 0),
      enumerable: false,
    });
    return result;
  };

  const sql = ((first: TemplateStringsArray | Row, ...values: unknown[]): Query => {
    // q({ col: value }) — called as a function, not as a tagged template.
    if (!Array.isArray((first as TemplateStringsArray).raw)) {
      return new PendingValues(first as Row, exec);
    }
    const strings = first as TemplateStringsArray;
    let text = "";
    const params: unknown[] = [];
    strings.forEach((part, i) => {
      text += part;
      if (i >= values.length) return;
      const v = values[i];
      if (v instanceof PendingValues) {
        const frag = valuesFragment(text, v.values, exec);
        text += frag.text;
        params.push(...frag.params);
      } else if (v instanceof Query) {
        text += v.text;
        params.push(...v.params);
      } else {
        text += "?";
        params.push(normalize(v));
      }
    });
    return new Query(text, params, exec);
  }) as Sql;

  sql.unsafe = (text: string, params: unknown[] = []) => {
    const p = toPositional(text, params);
    return new Query(p.text, p.params, exec);
  };
  sql.json = (value: unknown) => new Query("?", [JSON.stringify(value ?? null)], exec);
  sql.begin = async <T,>(fn: (tx: Sql) => Promise<T>): Promise<T> => {
    if (!pool) throw new Error("Nested transactions are not supported");
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(makeSql(conn as unknown as Runner));
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    } finally {
      conn.release();
    }
  };
  return sql;
}

// ---------------------------------------------------------------------------- connection

const CONNECTION_HELP =
  "MySQL is not configured. Set MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER and MYSQL_PASSWORD" +
  " (MYSQL_PORT defaults to 3306), or one MYSQL_URL reading" +
  " mysql://user:password@host:3306/dbname, with special characters in the password URL-encoded" +
  " (@ as %40, # as %23).";

const unquote = (v: string) =>
  v
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, "$2")
    .trim();

export type ConnectionSettings = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
};

/**
 * A host that never leaves this machine. TLS is pointless there and usually unavailable: a local
 * MySQL is typically built without it, and asking for it fails with "Server does not support
 * secure connection". So TLS defaults OFF for these and ON for everything else, where the
 * connection really does cross a network. MYSQL_SSL=true forces it back on either way.
 */
const isLocal = (host: string) => ["localhost", "127.0.0.1", "::1", ""].includes(host.trim().toLowerCase());

function sslDefault(host: string, env: NodeJS.ProcessEnv): boolean {
  if (env.MYSQL_SSL === "true") return true;
  if (env.MYSQL_SSL === "false") return false;
  return !isLocal(host);
}

/**
 * Where to connect, from MYSQL_URL or the MYSQL_* variables. Hosting panels and the ".env"
 * importers that feed them often keep the quotes around a pasted value, so they are stripped: a
 * quoted string is not a URL, and the alternative is "Invalid URL" thrown from whichever page
 * happened to need the database first — a long way from the setting that caused it.
 */
export function connectionSettings(env: NodeJS.ProcessEnv = process.env): ConnectionSettings {
  if (env.MYSQL_URL?.trim()) {
    const url = new URL(unquote(env.MYSQL_URL));
    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      ssl: url.searchParams.get("ssl") === "false" ? false : sslDefault(url.hostname, env),
    };
  }
  const host = unquote(env.MYSQL_HOST ?? "");
  return {
    host,
    port: Number(env.MYSQL_PORT || 3306),
    user: unquote(env.MYSQL_USER ?? ""),
    password: unquote(env.MYSQL_PASSWORD ?? ""),
    database: unquote(env.MYSQL_DATABASE ?? ""),
    ssl: sslDefault(host, env),
  };
}

/**
 * What is wrong with the MySQL settings, or null when they can be used. Lets the start-up check
 * name a missing or malformed setting at boot, instead of leaving every page to discover it.
 */
export function connectionProblem(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.MYSQL_URL?.trim()) {
    try {
      const url = new URL(unquote(env.MYSQL_URL));
      return url.hostname && url.pathname.replace(/^\//, "") ? null : CONNECTION_HELP;
    } catch {
      return CONNECTION_HELP;
    }
  }
  const missing = (["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER"] as const).filter((k) => !env[k]?.trim());
  return missing.length ? `${missing.join(", ")} not set. ${CONNECTION_HELP}` : null;
}

// A database that answers "no" is survivable: every page falls back to its starting content. A
// database that answers *nothing* is not, so the wait is bounded. A host that drops packets
// instead of refusing them would otherwise stall on the operating system's TCP timeout of around
// two minutes, and nginx returns 504 before the page has sent anything.
const CONNECT_TIMEOUT = Number(process.env.DATABASE_CONNECT_TIMEOUT || 8) * 1000;

const globalForPool = globalThis as unknown as { mysqlPool?: mysql.Pool };

export function mysqlPool(): mysql.Pool {
  if (globalForPool.mysqlPool) return globalForPool.mysqlPool;
  const problem = connectionProblem();
  if (problem) throw new Error(problem);
  const c = connectionSettings();
  globalForPool.mysqlPool = mysql.createPool({
    host: c.host,
    port: c.port,
    user: c.user,
    password: c.password,
    database: c.database,
    connectionLimit: 5,
    waitForConnections: true,
    connectTimeout: CONNECT_TIMEOUT,
    charset: "utf8mb4_unicode_ci",
    // Every timestamp in this database is UTC (see db/schema.mysql.sql). "Z" makes mysql2 read and
    // write DATETIME as UTC rather than in the Node process's local zone, so Dates round-trip.
    timezone: "Z",
    // Managed MySQL hosts offer TLS, but rarely with a CA this process already trusts.
    ssl: c.ssl ? { rejectUnauthorized: false } : undefined,
    supportBigNumbers: true,
    bigNumberStrings: false,
  });
  return globalForPool.mysqlPool;
}

/** A client bound to the pool. Schema work lives in lib/db.ts. */
export const client = (): Sql => {
  const p = mysqlPool();
  return makeSql(p as unknown as Runner, p);
};

/** MySQL's duplicate-key error — what lib/ retries on when a random referral code clashes. */
export const isDuplicateKey = (err: unknown): boolean =>
  (err as { code?: string }).code === "ER_DUP_ENTRY" || (err as { errno?: number }).errno === 1062;

/** Whether a duplicate-key error is about a particular index, e.g. "ref_code". */
export const duplicateKeyIs = (err: unknown, index: string): boolean =>
  isDuplicateKey(err) && !!(err as { message?: string }).message?.includes(index);

/**
 * Nepal time as a fixed offset rather than the zone name "Asia/Kathmandu".
 *
 * CONVERT_TZ with a zone NAME returns NULL unless the server's time zone tables have been loaded,
 * and on shared hosting they usually have not — every Nepal-time figure on the dashboards would
 * quietly become NULL instead of failing loudly. Nepal has no daylight saving and has been at
 * +05:45 since 1986, so the fixed offset is exactly equivalent and cannot be switched off.
 */
export const NEPAL_OFFSET = "+05:45";

/** A UTC column read as Nepal local time. */
export const inNepal = (column: string) => `CONVERT_TZ(${column}, '+00:00', '${NEPAL_OFFSET}')`;

/** Today's date in Nepal. */
export const nepalToday = () => `DATE(${inNepal("UTC_TIMESTAMP()")})`;

/** The first instant of a 'YYYY-MM' period, as UTC (what the created_at columns hold). */
export const periodStartUtc = "CONVERT_TZ(CONCAT(?, '-01 00:00:00'), '" + NEPAL_OFFSET + "', '+00:00')";

/**
 * MySQL hands JSON columns back already parsed; MariaDB stores JSON as LONGTEXT and returns a
 * string. Both shapes can arrive here, so both are accepted.
 */
export function asJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

/** MySQL returns TINYINT(1) as 0/1, while the app's types say boolean. */
export const bool = (v: unknown): boolean => v === true || v === 1 || v === "1";
