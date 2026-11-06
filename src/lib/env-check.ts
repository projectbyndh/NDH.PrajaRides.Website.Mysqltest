import { strongSecret } from "./auth";
import { connectionStringProblem } from "./db";

// Settings the site needs in production (see .env.example). Reports names only, never values.
const REQUIRED = [
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
  "NEXT_PUBLIC_SITE_URL",
];

export function productionEnvProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems = REQUIRED.filter((k) => !env[k]?.trim()).map((k) => `${k} is not set`);
  if (env.ADMIN_PASSWORD && !strongSecret(env.ADMIN_PASSWORD)) problems.push("ADMIN_PASSWORD is too short or still the example value (use 12+ characters)");
  if (!env.SESSION_SECRET) problems.push("SESSION_SECRET is not set (a long random string; driver logins would otherwise depend on the admin password)");
  else if (!strongSecret(env.SESSION_SECRET)) problems.push("SESSION_SECRET is too short or still the example value");
  const site = env.NEXT_PUBLIC_SITE_URL;
  if (site && !/^https?:\/\/[^/]+$/.test(site.replace(/\/$/, ""))) problems.push("NEXT_PUBLIC_SITE_URL must be the site address only, e.g. https://prajaride.com");
  // Settings that cannot be parsed are reported here, at start-up, rather than being discovered
  // separately by every page that needs the database.
  const connection = connectionStringProblem(env);
  if (connection) problems.push(connection);
  // TLS off is only worth reporting when the connection actually crosses a network. On localhost
  // it never leaves the machine, which is the normal shared-hosting setup, so it is not a problem.
  const dbHost = (env.MYSQL_HOST ?? "").trim().toLowerCase();
  const localDb = ["localhost", "127.0.0.1", "::1"].includes(dbHost);
  if (env.MYSQL_SSL === "false" && !localDb && env.ALLOW_INSECURE_DATABASE !== "true") {
    problems.push("MYSQL_SSL=false while MYSQL_HOST is not localhost: the database connection would not be encrypted (ALLOW_INSECURE_DATABASE=true overrides, not recommended)");
  }
  return problems;
}
