import { strongSecret } from "./auth";
import { connectionStringProblem } from "./db";

// Settings the site needs in production (see .env.example). Reports names only, never values.
const REQUIRED = [
  "DATABASE_URL",
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
  // A connection string that cannot be parsed is reported here, at start-up, rather than being
  // discovered separately by every page that needs the database.
  const connection = connectionStringProblem(env);
  if (connection) problems.push(connection);
  if (env.DATABASE_URL && !/sslmode=(require|verify-ca|verify-full)/.test(env.DATABASE_URL) && env.ALLOW_INSECURE_DATABASE !== "true") {
    problems.push("DATABASE_URL has no ?sslmode=require: the database connection would not be encrypted (enable SSL on the database server; ALLOW_INSECURE_DATABASE=true overrides, not recommended)");
  }
  return problems;
}
