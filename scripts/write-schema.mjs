// Regenerates db/schema.mysql.sql from src/lib/schema.ts so the two never drift.
//   npm run schema
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/schema.ts", import.meta.url), "utf8");
const marker = "export const SCHEMA = `";
const sql = src
  .slice(src.indexOf(marker) + marker.length, src.lastIndexOf("`"))
  // schema.ts is TypeScript, so every MySQL identifier quote is an escaped backtick.
  .replace(/\\`/g, "`")
  .trim();
const version = /SCHEMA_VERSION = (\d+)/.exec(src)[1];

writeFileSync(
  new URL("../db/schema.mysql.sql", import.meta.url),
  `-- Praja Ride schema for MySQL 8.0 / MariaDB 10.4+ (schema version ${version}).
-- Generated from src/lib/schema.ts — do not edit by hand; run: npm run schema
-- The app applies this automatically on start-up; running it by hand (or importing it in
-- phpMyAdmin) is optional. The type choices and why they were made are documented in schema.ts.

SET FOREIGN_KEY_CHECKS = 0;

${sql}

SET FOREIGN_KEY_CHECKS = 1;
`,
);
console.log(`db/schema.mysql.sql written (version ${version})`);
