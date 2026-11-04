// Regenerates db/schema.sql from src/lib/schema.ts so the two never drift.
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync(new URL("../src/lib/schema.ts", import.meta.url), "utf8");
const sql = src.slice(src.indexOf("`") + 1, src.lastIndexOf("`")).trim();
writeFileSync(
  new URL("../db/schema.sql", import.meta.url),
  `-- NepCab referral schema (PostgreSQL 13+). Generated from src/lib/schema.ts.\n-- The app applies this automatically; running it by hand is optional.\n\n${sql}\n`,
);
