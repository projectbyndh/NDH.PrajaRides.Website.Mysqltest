// Diagnostics for a server that will not stay up, or will not answer. Everything here goes to
// stdout/stderr, because that is the only log the hosting panel keeps: this app writes no log
// files of its own.
//
// Each tag answers a question that cannot be seen from outside the server:
//   [boot]   did the process start, as what, and did the panel's settings reach it?
//   [env]    did the production settings check pass, and if not, exactly which ones failed?
//   [alive]  is it still running a minute later, and is memory climbing towards a kill?
//   [req]    did a request ever arrive at all, or is it being stopped before the app?
//   [fatal]  why did it die - with the stack, which the panel's output log does not show
//   [exit]   who stopped it: a crash of its own, or the platform sending a signal?
//
// Once the cause is found these can be quieted without a code change: LOG_REQUESTS=false and
// LOG_ALIVE_SECONDS=0.

const startedAt = Date.now();

const since = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

// Checked by name only and reported as yes/NO, never by value. This is a different question from
// whether they are set at build time: a panel can supply one environment to the build and another
// to the running server, and only the running one matters here.
const SETTINGS = [
  "MYSQL_HOST",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "OBJECT_STORAGE_ENDPOINT",
  "OBJECT_STORAGE_BUCKET",
  "OBJECT_STORAGE_ACCESS_KEY",
  "OBJECT_STORAGE_SECRET_KEY",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
  "NEXT_PUBLIC_SITE_URL",
];

/** What this process is, and what it was given. First thing in the log after the Next.js banner. */
export function logBoot(): void {
  const m = process.memoryUsage();
  console.log(
    `[boot] pid=${process.pid} node=${process.version} ${process.platform}/${process.arch}` +
      ` NODE_ENV=${process.env.NODE_ENV ?? "-"} NEXT_RUNTIME=${process.env.NEXT_RUNTIME ?? "-"}` +
      ` rss=${mb(m.rss)} heap=${mb(m.heapUsed)}/${mb(m.heapTotal)}`,
  );
  // PORT is the one most likely to be wrong on a managed host: the server binds PORT when it is
  // set and 3000 when it is not, and the web server in front has to be sending requests to the
  // same number.
  console.log(
    `[boot] PORT=${process.env.PORT ?? "(unset, so the server listens on 3000)"}` +
      ` HOSTNAME=${process.env.HOSTNAME ?? "(unset, so it binds 0.0.0.0)"} cwd=${process.cwd()}`,
  );
  console.log(`[boot] settings: ${SETTINGS.map((n) => `${n}=${process.env[n]?.trim() ? "yes" : "NO"}`).join(" ")}`);
}

/**
 * Records why the process ends, and that it is still alive in between.
 *
 * Adding a listener for any of these suppresses Node's own default, so where nothing else was
 * listening each handler ends the process the way Node would have. The point is to add a line to
 * the log, not to change when the server lives or dies - a swallowed crash would turn a restart
 * loop into a silently broken server, which is harder to diagnose, not easier.
 */
export function watchProcess(): void {
  const handledUncaught = process.listenerCount("uncaughtException") > 0;
  process.on("uncaughtException", (err, origin) => {
    console.error(`[fatal] uncaughtException from ${origin} after ${since()}:`, err);
    if (!handledUncaught) process.exit(1);
  });

  const handledRejection = process.listenerCount("unhandledRejection") > 0;
  process.on("unhandledRejection", (reason) => {
    console.error(`[fatal] unhandledRejection after ${since()}:`, reason);
    if (!handledRejection) process.exit(1);
  });

  // A deploy or a restart arrives as SIGTERM. Seeing one means the platform stopped this process
  // on purpose; a death with no signal line before it was the process's own fault, or a kill -9
  // (which cannot be caught and usually means it ran out of memory).
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    const handled = process.listenerCount(signal) > 0;
    process.on(signal, () => {
      console.error(
        `[exit] ${signal} after ${since()} rss=${mb(process.memoryUsage().rss)}:` +
          " the platform asked this process to stop",
      );
      if (!handled) process.exit(0);
    });
  }

  process.on("exit", (code) => {
    console.error(`[exit] code=${code} after ${since()} rss=${mb(process.memoryUsage().rss)}`);
  });

  // A heartbeat separates "died" from "hung": if the last line before a restart is an [alive] line
  // with memory climbing, it was killed for using too much; if the heartbeats simply stop with no
  // [fatal] and no [exit], something outside the process ended it.
  const seconds = Number(process.env.LOG_ALIVE_SECONDS ?? 60);
  if (seconds > 0) {
    setInterval(() => {
      const m = process.memoryUsage();
      console.log(`[alive] up ${since()} rss=${mb(m.rss)} heap=${mb(m.heapUsed)}/${mb(m.heapTotal)}`);
    }, seconds * 1000).unref();
  }
}
