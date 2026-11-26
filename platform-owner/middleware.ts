import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/api/auth/login",
  "/api/auth/signup",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths without token
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("platform_owner_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "superadmin") {
    const response = NextResponse.redirect(new URL("/auth/login", req.url));
    response.cookies.delete("platform_owner_token");
    return response;
  }

  // Inject user info as a header for server components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", String(payload.id));
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
