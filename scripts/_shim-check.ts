// Checks the tagged-template layer in src/lib/mysql.ts builds the SQL and parameters it should.
// A Query is lazy, so nothing here connects to a database: the text and params are inspected
// before anything is awaited.
//
//   node --conditions=react-server scripts/_shim-check.ts
process.env.MYSQL_HOST ||= "127.0.0.1";
process.env.MYSQL_DATABASE ||= "check";
process.env.MYSQL_USER ||= "check";
process.env.MYSQL_PASSWORD ||= "check";

const { client, inNepal, nepalToday, asJson, bool } = await import("../src/lib/mysql.ts");

const q = client();
let failures = 0;

function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`);
  }
}

// 1. A plain query binds every value as a parameter.
{
  const query = q`SELECT * FROM drivers WHERE id = ${"DRV101"} AND active = ${true}`;
  check("plain: text", query.text, "SELECT * FROM drivers WHERE id = ? AND active = ?");
  check("plain: params", query.params, ["DRV101", 1]);
}

// 2. q({...}) after INSERT writes a column list and a row.
{
  const query = q`INSERT INTO drivers ${q({ id: "DRV1", name: "A", active: false })}`;
  check("insert: text", query.text, "INSERT INTO drivers (`id`, `name`, `active`) VALUES (?, ?, ?)");
  check("insert: params", query.params, ["DRV1", "A", 0]);
}

// 3. The same helper after SET writes assignments instead, and the trailing value keeps its place.
{
  const query = q`UPDATE drivers SET ${q({ name: "B", ward: 5 })} WHERE id = ${"DRV1"}`;
  check("update: text", query.text, "UPDATE drivers SET `name` = ?, `ward` = ? WHERE id = ?");
  check("update: params", query.params, ["B", 5, "DRV1"]);
}

// 4. A nested query splices in, and its parameters stay in order around the outer ones.
{
  const cond = q`AND period = ${"2026-11"}`;
  const query = q`SELECT 1 FROM driver_rewards WHERE driver_id = ${"DRV1"} ${cond} AND status = ${"pending"}`;
  check("nested: text", query.text, "SELECT 1 FROM driver_rewards WHERE driver_id = ? AND period = ? AND status = ?");
  check("nested: params", query.params, ["DRV1", "2026-11", "pending"]);
}

// 5. An empty fragment is the "no condition" case the call sites use.
{
  const query = q`SELECT 1 WHERE a = ${1} ${q``}`;
  check("empty fragment", query.text.trim(), "SELECT 1 WHERE a = ?");
}

// 6. unsafe() carries raw SQL with no params, and converts $1 placeholders to ?.
{
  check("unsafe: raw", q.unsafe("COUNT(*)").text, "COUNT(*)");
  const query = q.unsafe("SELECT * FROM drivers WHERE id = $1 AND phone = $2", ["DRV1", "98"]);
  check("unsafe: $n text", query.text, "SELECT * FROM drivers WHERE id = ? AND phone = ?");
  check("unsafe: $n params", query.params, ["DRV1", "98"]);
}

// 7. json() stringifies, and a plain object parameter is stringified too (JSON columns).
{
  check("json()", q.json({ a: [1, 2] }).params, ['{"a":[1,2]}']);
  const query = q`UPDATE services SET ${q({ gallery: ["hero", "drivers"] })} WHERE slug = ${"x"}`;
  // Arrays stay arrays so `IN (?)` expands; JSON arrays reach the column through q.json().
  check("array param untouched", query.params, [["hero", "drivers"], "x"]);
  const obj = q`UPDATE site_settings SET ${q({ content: { a: 1 } })} WHERE id = 1`;
  check("object param stringified", obj.params, ['{"a":1}']);
}

// 8. An IN list keeps the array as one parameter, which is what mysql2 expands.
{
  const ids = ["a", "b", "c"];
  const query = q`SELECT 1 FROM application_photos WHERE application_id IN (${ids})`;
  check("IN list: text", query.text, "SELECT 1 FROM application_photos WHERE application_id IN (?)");
  check("IN list: params", query.params, [ids]);
}

// 9. undefined becomes NULL rather than reaching the driver as undefined.
{
  check("undefined -> null", q`SELECT ${undefined}`.params, [null]);
  check("Date kept as Date", q`SELECT ${new Date(0)}`.params[0] instanceof Date, true);
}

// 10. The Nepal-time helpers use a fixed offset, never a zone name.
{
  check("inNepal", inNepal("e.created_at"), "CONVERT_TZ(e.created_at, '+00:00', '+05:45')");
  check("nepalToday", nepalToday(), "DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:45'))");
}

// 11. The row-value readers cope with what MySQL and MariaDB each return.
{
  check("asJson: object", asJson({ a: 1 }, {}), { a: 1 });
  check("asJson: string", asJson('{"a":1}', {}), { a: 1 });
  check("asJson: null", asJson(null, []), []);
  check("asJson: broken", asJson("{not json", { fallback: true }), { fallback: true });
  check("bool", [bool(1), bool(0), bool(true), bool(null)], [true, false, true, false]);
}

// 12. The analytics pattern: fragments inside a SELECT list and a WHERE clause together.
{
  const phones = (where: string) => q.unsafe(`COUNT(DISTINCT CASE WHEN ${where} THEN e.dkey END)`);
  const monthRange = (period: string) =>
    q`e.created_at >= CONVERT_TZ(CONCAT(${period}, '-01 00:00:00'), '+05:45', '+00:00')`;
  const query = q`
    SELECT ${phones("e.event_type = 'scan'")} AS scans
    FROM referral_clicks e
    WHERE e.driver_id = ${"DRV1"} AND ${monthRange("2026-11")}`;
  check("analytics: param order", query.params, ["DRV1", "2026-11"]);
  check(
    "analytics: fragment spliced",
    query.text.includes("COUNT(DISTINCT CASE WHEN e.event_type = 'scan' THEN e.dkey END) AS scans"),
    true,
  );
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll shim checks passed");
process.exit(failures ? 1 : 0);
