import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE_NAME, verifyUserToken } from "@/lib/auth";

const PROTECTED_PATHS = ["/account"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(USER_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const payload = await verifyUserToken(token);
  if (!payload) {
    const res = NextResponse.redirect(new URL("/auth/login", req.url));
    res.cookies.delete(USER_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
