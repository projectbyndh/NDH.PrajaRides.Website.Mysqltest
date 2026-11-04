// Creates demo driver accounts for local testing. Never run this against production.
//   node --env-file=.env.local scripts/seed-demo.mjs
import { randomBytes, scryptSync } from "node:crypto";
import { applySchema, connect, readEnvFile } from "./_db.mjs";

// Demo logins: phone + PIN at /driver. Keep in sync with README → "Local demo accounts".
const DEMO_DRIVERS = [
  { id: "DRV101", name: "Demo Driver One", phone: "9800000001", pin: "1111", vehicleNo: "Lu 1 Pa 1001", vehicleType: "car" },
  { id: "DRV102", name: "Demo Driver Two", phone: "9800000002", pin: "2222", vehicleNo: "Lu 2 Pa 2002", vehicleType: "bike" },
];

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo accounts in production");

const env = { ...readEnvFile(new URL("../.env.local", import.meta.url)), ...readEnvFile(new URL("../.env", import.meta.url)), ...process.env };
const sql = await connect(env);
await applySchema(sql, new URL("../src/lib/schema.ts", import.meta.url));

for (const d of DEMO_DRIVERS) {
  const salt = randomBytes(16);
  const pinHash = `scrypt:${salt.toString("hex")}:${scryptSync(d.pin, salt, 32).toString("hex")}`;
  await sql`
    INSERT INTO drivers (id, name, phone, vehicle_no, vehicle_type, pin_hash)
    VALUES (${d.id}, ${d.name}, ${d.phone}, ${d.vehicleNo}, ${d.vehicleType}, ${pinHash})
    ON DUPLICATE KEY UPDATE pin_hash = VALUES(pin_hash), failed_logins = 0, locked_until = NULL`;
  console.log(`✓ ${d.id}  ${d.name}`);
}
await sql.end();
console.log("Demo drivers ready. Logins are listed in README → Local demo accounts.");
