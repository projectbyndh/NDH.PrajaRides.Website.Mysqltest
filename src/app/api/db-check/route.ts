import { connection } from "next/server";
import { safeEqual } from "@/lib/auth";
import { pingDatabase } from "@/lib/db";

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

/** What to do about the error, by the code postgres.js / PostgreSQL reports. */
function advice(code: string): string {
  switch (code) {
    case "CONNECT_TIMEOUT":
    case "ETIMEDOUT":
      return "The database host accepted no connection and sent no refusal: packets are being dropped. Open port 5432 to this server's IP on the database host's firewall, and set listen_addresses = '*' in postgresql.conf plus a line for this IP in pg_hba.conf.";
    case "ECONNREFUSED":
      return "The host answered but nothing is listening on that port: PostgreSQL is stopped, or is listening on localhost only (listen_addresses in postgresql.conf).";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "The host name in DATABASE_URL does not resolve. Check the spelling, or use the IP address.";
    case "28P01":
      return "The password in DATABASE_URL is wrong. Special characters must be URL-encoded (@ → %40, # → %23).";
    case "28000":
      return "The database rejected this user or this client IP: add a line for it in pg_hba.conf, then reload PostgreSQL.";
    case "3D000":
      return "That database name does not exist on the server.";
    case "53300":
      return "The database is out of connection slots (max_connections). Other clients are holding them.";
    default:
      return "See the message above.";
  }
}

export async function GET(request: Request) {
  await connection();
  if (!allowed(request)) return new Response("Not found\n", { status: 404 });

  const url = process.env.DATABASE_URL;
  const lines = [
    `DATABASE_URL set: ${!!url}`,
    `sslmode in DATABASE_URL: ${url ? /sslmode=([^&]+)/.exec(url)?.[1] ?? "none" : "-"}`,
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
