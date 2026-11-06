// Runs the real data-layer functions against a real MySQL and reports which ones fail.
// Written for the port from PostgreSQL: the SQL was rewritten by hand, and this is what proves
// each statement is valid MySQL and still returns what the page expects.
//
//   docker run -d --name praja-mysql -e MYSQL_ROOT_PASSWORD=root \
//     -e MYSQL_DATABASE=u763937081_prajamysqldb -p 3307:3306 mysql:8
//   docker exec -i praja-mysql mysql -uroot -proot u763937081_prajamysqldb < db/migration.sql
//   node --conditions=react-server scripts/_query-check.ts
process.env.MYSQL_HOST = process.env.MYSQL_HOST ?? "127.0.0.1";
process.env.MYSQL_PORT = process.env.MYSQL_PORT ?? "3307";
process.env.MYSQL_USER = process.env.MYSQL_USER ?? "root";
process.env.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? "root";
process.env.MYSQL_DATABASE = process.env.MYSQL_DATABASE ?? "u763937081_prajamysqldb";

const db = await import("../src/lib/db.ts");
const rewards = await import("../src/lib/rewards.ts");
const drivers = await import("../src/lib/drivers.ts");
const applications = await import("../src/lib/applications.ts");
const bookings = await import("../src/lib/bookings.ts");
const contact = await import("../src/lib/contact.ts");
const siteImages = await import("../src/lib/site-image-store.ts");

const period = (await import("../src/lib/period.ts")).currentPeriod();

let failed = 0;
const show = (v: unknown) => {
  const s = JSON.stringify(v, (_, x) => (x instanceof Date ? x.toISOString() : x));
  return s && s.length > 150 ? `${s.slice(0, 150)}…` : s;
};

async function check(name: string, fn: () => Promise<unknown>) {
  try {
    const out = await fn();
    const size = Array.isArray(out) ? `${out.length} rows` : out instanceof Map ? `${out.size} entries` : "";
    console.log(`ok   ${name.padEnd(34)} ${size.padEnd(10)} ${show(out)}`);
  } catch (err) {
    failed++;
    const e = err as { code?: string; sqlMessage?: string; message?: string };
    console.log(`FAIL ${name.padEnd(34)} ${e.code ?? ""} ${e.sqlMessage ?? e.message}`);
  }
}

console.log("--- everything the admin dashboard runs, in its order ---");
await check("syncRewards()", () => rewards.syncRewards());
await check("getTotals()", () => db.getTotals());
await check("getLeaderboard()", () => db.getLeaderboard());
await check("getDaily(30)", () => db.getDaily(30));
await check("qualifiedCounts()", () => rewards.qualifiedCounts());
await check("getWeekComparison()", () => db.getWeekComparison());
await check("getMonthActivity(period)", () => db.getMonthActivity(period));
await check("getRecentActivity(8)", () => db.getRecentActivity(8));
await check("listDrivers()", () => drivers.listDrivers());
await check("listRewards({ period })", () => rewards.listRewards({ period }));
await check("countPendingApplications()", () => applications.countPendingApplications());
await check("countUnreadMessages()", () => contact.countUnreadMessages());
await check("listExpiringDocuments(30)", () => drivers.listExpiringDocuments(30));
await check("countNewBookings()", () => bookings.countNewBookings());

console.log("\n--- the rest of the data layer ---");
await check("getDownloadsByDriver(period)", () => db.getDownloadsByDriver(period));
await check("getDownloadsByDriver(null)", () => db.getDownloadsByDriver(null));
await check("getDriverMonthActivity()", () => db.getDriverMonthActivity("DRV107", period));
await check("nextDriverId()", () => drivers.nextDriverId());
await check("getDriver('DRV107')", () => drivers.getDriver("DRV107"));
await check("resolveReferral('DRV107')", () => drivers.resolveReferral("DRV107"));
await check("listExpiringDocuments(3650)", () => drivers.listExpiringDocuments(3650));
await check("lifetimeQualified('DRV107')", () => rewards.lifetimeQualified("DRV107"));
await check("dailyQualified('DRV107', 14)", () => rewards.dailyQualified("DRV107", 14));
await check("listTiers()", () => rewards.listTiers());
await check("listTiers(onlyActive)", () => rewards.listTiers(true));
await check("listApplications()", () => applications.listApplications());
await check("listApplications('pending')", () => applications.listApplications("pending"));
await check("listApplicationPhotos([...])", async () => {
  const apps = await applications.listApplications();
  return applications.listApplicationPhotos(apps.slice(0, 3).map((a) => a.id));
});
await check("listBookings()", () => bookings.listBookings());
await check("listContactMessages()", () => contact.listContactMessages());
await check("listSiteImages()", () => siteImages.listSiteImages());
await check("readSiteImage(custom slot)", async () => {
  const all = await siteImages.listSiteImages();
  const custom = all.find((s) => s.slot.startsWith("img-")) ?? all[0];
  return custom ? `${custom.slot} -> row found` : "no rows";
});

console.log("\n--- writes (this database is a throwaway) ---");
await check("setMessageRead + countUnread", async () => {
  const [m] = await contact.listContactMessages();
  if (!m) return "no messages";
  await contact.setMessageRead(m.id, true);
  const after = await contact.countUnreadMessages();
  await contact.setMessageRead(m.id, m.read);
  return `unread while one was marked read: ${after}`;
});
await check("setBookingStatus()", async () => {
  const [b] = await bookings.listBookings();
  if (!b) return "no bookings";
  const changed = await bookings.setBookingStatus(b.id, "confirmed");
  await bookings.setBookingStatus(b.id, b.status);
  return `rows affected: ${changed}`;
});
await check("markApplication()", async () => {
  const [a] = await applications.listApplications("pending");
  if (!a) return "no pending applications";
  await applications.markApplication(a.id, "pending", null, null);
  return "ok";
});
await check("registerDriverDevice() twice", async () => {
  await drivers.registerDriverDevice("00000000-0000-4000-8000-00000000beef", "DRV107");
  await drivers.registerDriverDevice("00000000-0000-4000-8000-00000000beef", "DRV107");
  return "no duplicate-key error (INSERT IGNORE)";
});
await check("attemptLogin(wrong pin)", () => drivers.attemptLogin("9814424469", "0000"));
await check("logClick(scan)", () =>
  db.logClick({
    driverId: "DRV107",
    eventType: "scan",
    platform: "android",
    deviceId: "00000000-0000-4000-8000-00000000cafe",
    ipAddress: "1.1.1.1",
    userAgent: "query-check",
    referrer: null,
  }));
await check("syncRewards() again", () => rewards.syncRewards());
await check("verifyDriver()", () => drivers.verifyDriver("DRV107"));

console.log(failed ? `\n${failed} FAILED` : "\nEvery query ran");
process.exit(failed ? 1 : 0);
