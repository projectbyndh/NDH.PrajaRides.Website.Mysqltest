// Runs once when the server starts. In production it refuses to start with missing or unsafe
// settings, so a mistake in .env.production shows up immediately instead of as broken pages.
// It also starts the background retry of queued uploads (driver application photos).
//
// Each step logs before and after it, so a start-up that stops partway names the step it stopped
// on (see lib/boot-log.ts). On a managed host the panel's output log is the only record there is.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logBoot, watchProcess } = await import("./lib/boot-log");
  logBoot();
  watchProcess();

  if (process.env.NODE_ENV === "production") {
    const { productionEnvProblems } = await import("./lib/env-check");
    const problems = productionEnvProblems();
    if (problems.length) {
      // Logged as well as thrown: a thrown start-up error can be reported by the host as nothing
      // more than a process that exited, and then the reason never reaches the log.
      console.error(`[env] start-up refused, ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
      throw new Error(`Server settings (environment variables: .env / .env.production, or the hosting panel) need attention:\n- ${problems.join("\n- ")}`);
    }
    console.log("[env] production settings check passed");
  }

  // Queued photo uploads. Failures inside are already caught and retried; a throw here would stop
  // the server from starting, so it is logged rather than allowed to escape.
  try {
    const { startPendingUploads } = await import("./lib/storage");
    startPendingUploads();
    console.log("[boot] queued uploads: retry loop started");
  } catch (err) {
    console.error("[boot] queued uploads: could not start the retry loop:", err);
  }

  console.log("[boot] start-up finished, ready to serve requests");
}

/**
 * Every error thrown while handling a request, with the path that caused it.
 *
 * Next.js reports a failed render to the log as a digest - a hash standing in for the error, so
 * that nothing private reaches the browser - which leaves "Internal Server Error" with no way to
 * tell what broke. This is the hook that receives the real error, so the log names it.
 */
export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routePath?: string; routeType?: string; renderSource?: string },
) {
  const where = [request?.method, request?.path].filter(Boolean).join(" ") || "(unknown request)";
  const route = [context?.routePath, context?.routeType, context?.renderSource].filter(Boolean).join(" ");
  console.error(`[error] ${where}${route ? ` (${route})` : ""}:`, error);
}
