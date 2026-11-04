import { connection } from "next/server";
import { safeEqual } from "@/lib/auth";
import { pingDatabase } from "@/lib/db";
import { connectionSettings } from "@/lib/mysql";

// Why the database is not answering: GET /api/db-check. The uptime check (/api/health) reports only
// ok/failed because it is public; this one names the error, so it is not. It is reachable from the
// server itself (`curl -s localhost:3000/api/db-check`), which is where the question gets asked,
// and from anywhere else only with ?token=<DIAGNOSTICS_TOKEN>.
//
// Unlike the rest of the site it goes straight at the connection: no schema check, and the
// remembered failure in lib/db is ignored, so the answer is the database's answer right now.

const TIMEOUT_MS = 10_000;

// On the server itself the request goes straight to Node and the Host header is still localhost,
// while nginx passes the site's own name through (proxy_set_header Host $host, see
// deploy/nginx.conf). So a request carrying the domain arrived off the internet and needs the
// token; one carrying localhost was made on the server. (X-Forwarded-For can't be used for this:
// Next fills it in itself from the socket when the header is absent.)
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The Host header without its port, read from the header itself: Next rewrites request.url. */
function hostOf(request: Request): string {
  const host = (request.headers.get("host") ?? "").trim().toLowerCase();
  return host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
}

function allowed(request: Request): boolean {
  if (LOCAL_HOSTS.has(hostOf(request))) return true;
  const expected = process.env.DIAGNOSTICS_TOKEN;
  const given = new URL(request.url).searchParams.get("token");
  return !!expected && !!given && safeEqual(given, expected);
}

/** What to do about the error, by the code mysql2 / MySQL reports. */
function advice(code: string): string {
  switch (code) {
    case "CONNECT_TIMEOUT":
    case "ETIMEDOUT":
      return "The database host accepted no connection and sent no refusal: packets are being dropped. Open port 3306 to this server's IP on the database host's firewall. On shared hosting that is the Remote MySQL page, which needs this server's IP allow-listed.";
    case "ECONNREFUSED":
      return "The host answered but nothing is listening on that port: MySQL is stopped, or is bound to localhost only (bind-address in my.cnf).";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "The host name in MYSQL_HOST does not resolve. Check the spelling, or use the IP address.";
    case "ER_ACCESS_DENIED_ERROR":
      return "MySQL refused the user and password, OR refuses connections from this machine's IP. Both report the same error: check MYSQL_PASSWORD, and that this server's IP is allow-listed for the database (Remote MySQL on shared hosting). The error message names the IP MySQL saw.";
    case "ER_HOST_NOT_PRIVILEGED":
      return "MySQL will not accept connections from this machine's address at all: allow-list it for the database (Remote MySQL on shared hosting).";
    case "ER_BAD_DB_ERROR":
      return "That database name does not exist on the server. On shared hosting the name is prefixed, e.g. u123456_name.";
    case "ER_DBACCESS_DENIED_ERROR":
      return "The user exists but has no rights on that database: grant them in the hosting panel.";
    case "ER_CON_COUNT_ERROR":
      return "The server is out of connection slots (max_connections). Other clients are holding them.";
    case "PROTOCOL_CONNECTION_LOST":
      return "The server closed the connection. It may be restarting, or a proxy is dropping idle connections.";
    default:
      return "See the message above.";
  }
}

export async function GET(request: Request) {
  await connection();
  if (!allowed(request)) return new Response("Not found\n", { status: 404 });

  // Host, port and database only: never the user or the password.
  const c = connectionSettings();
  const lines = [
    `MySQL host: ${c.host || "(not set)"}:${c.port}`,
    `database: ${c.database || "(not set)"}`,
    `TLS: ${c.ssl ? "on" : "off"}`,
    `connect timeout: ${process.env.DATABASE_CONNECT_TIMEOUT || 8}s`,
  ];

  const started = Date.now();
  try {
    // The pool has its own connect timeout; this one also covers a connection that opens and then
    // never answers the query, so the route always replies.
    await Promise.race([
      pingDatabase(),
      new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error(`No answer within ${TIMEOUT_MS / 1000}s`), { code: "CONNECT_TIMEOUT" })), TIMEOUT_MS)),
    ]);
    lines.push("", `DB OK in ${Date.now() - started} ms`);
    return text(lines, 200);
  } catch (err) {
    const { code, message } = (err ?? {}) as { code?: string; message?: string };
    lines.push(
      "",
      `DB FAILED after ${Date.now() - started} ms`,
      `code: ${code ?? "-"}`,
      `message: ${message ?? String(err)}`,
      "",
      advice(code ?? ""),
    );
    return text(lines, 503);
  }
}

const text = (lines: string[], status: number) =>
  new Response(`${lines.join("\n")}\n`, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
