import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, DRIVER_COOKIE, isValidAdminCookie, verifyDriverToken } from "./auth";
import { getDriver, type Driver } from "./drivers";

// The proxy already guards these routes; pages and server actions check again
// because server actions can be invoked directly.
export async function requireAdmin(): Promise<void> {
  if (!(await isValidAdminCookie((await cookies()).get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
}

export async function requireDriver(): Promise<Driver> {
  const id = await verifyDriverToken((await cookies()).get(DRIVER_COOKIE)?.value);
  const driver = id ? await getDriver(id) : null;
  if (!driver || !driver.active) redirect("/driver/login");
  return driver;
}
