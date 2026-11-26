import { NextRequest, NextResponse } from "next/server";
import {
  generateOAuthState,
  getAppBaseUrl,
  getFacebookAuthUrl,
} from "@/lib/oauth";
import { OAUTH_STATE_COOKIE } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req.url);
  const state = generateOAuthState();

  try {
    const authUrl = getFacebookAuthUrl(state, baseUrl);
    const res = NextResponse.redirect(authUrl);
    res.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Facebook OAuth unavailable.";
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=${encodeURIComponent(message)}`
    );
  }
}
