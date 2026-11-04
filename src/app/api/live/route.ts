import { connection } from "next/server";

// Liveness check for the server itself: GET /api/live → 200 as long as Node is answering.
// It touches nothing — no database, no object storage, no content — on purpose. When the site
// returns 504 this is what separates "the app is hung or down" from "a dependency it waits on is
// unreachable": /api/live answering while /api/health times out means the app is fine and
// something it talks to is not.
export async function GET() {
  await connection();
  return new Response(`ok ${new Date().toISOString()}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
