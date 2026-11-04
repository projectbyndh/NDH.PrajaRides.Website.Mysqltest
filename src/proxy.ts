import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, DRIVER_COOKIE, isValidAdminCookie, verifyDriverToken } from "@/lib/auth";

// Admin and driver pages need a signed cookie. Everything else passes straight through.
//
// This runs on every request so that each one can be logged ([req], see lib/boot-log.ts): when a
// site answers 504 or "Request Timeout", the first thing worth knowing is whether requests reach
// the app at all, or are being stopped by the web server in front of it. A request with no [req]
// line never arrived. Set LOG_REQUESTS=false to turn the lines off.
const LOG_REQUESTS = process.env.LOG_REQUESTS !== "false";

/** Matches the way a "/base/:path*" route does: the base itself, or anything under it. */
const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

const needsCookie = (pathname: string) =>
  under(pathname, "/admin") || under(pathname, "/api/admin") || under(pathname, "/driver");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LOG_REQUESTS) console.log(`[req] ${request.method} ${pathname}`);

  if (!needsCookie(pathname)) return NextResponse.next();

  if (pathname.startsWith("/driver")) {
    if (pathname === "/driver/login") return NextResponse.next();
    if (await verifyDriverToken(request.cookies.get(DRIVER_COOKIE)?.value)) return NextResponse.next();
    return NextResponse.redirect(new URL("/driver/login", request.url));
  }

  if (pathname === "/admin/login") return NextResponse.next();
  if (await isValidAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

// Everything except the build's own static files, which would otherwise bury the log.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)"],
};
