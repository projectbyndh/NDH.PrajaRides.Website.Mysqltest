import { connection } from "next/server";
import { pingDatabase } from "@/lib/db";
import { pendingUploads, pingStorage } from "@/lib/storage";

// Uptime check for the server: GET /api/health → 200 when the database and object storage answer,
// 503 otherwise. Reports only ok/failed, never connection details (/api/db-check names the error,
// and is not public). The checks go straight at the connection: no schema work, so a slow start-up
// is not reported as an outage.
//
// Every check is bounded, because the whole point of the endpoint is to answer: an uptime check
// that hangs along with the thing it is checking tells a monitor nothing, and would be stopped by
// nginx (504) rather than reporting a failure.
const TIMEOUT_MS = 12_000;

export async function GET() {
  await connection();
  const check = async (fn: () => Promise<unknown>) => {
    const t = Date.now();
    try {
      await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`no answer within ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)),
      ]);
      return { ok: true, ms: Date.now() - t };
    } catch (err) {
      console.error("[health]", err);
      return { ok: false, ms: Date.now() - t };
    }
  };
  const [database, storage] = await Promise.all([check(pingDatabase), check(pingStorage)]);
  // Photos waiting to reach object storage; more than an hour old means uploads keep failing.
  const uploads = await pendingUploads();
  const ok = database.ok && storage.ok && uploads.oldestMinutes < 60;
  return Response.json({ ok, database, storage, pendingUploads: uploads }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
