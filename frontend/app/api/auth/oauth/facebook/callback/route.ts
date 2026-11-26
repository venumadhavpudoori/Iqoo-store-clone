import { NextRequest, NextResponse } from "next/server";
import { exchangeFacebookCode, getAppBaseUrl } from "@/lib/oauth";
import { OAUTH_STATE_COOKIE, USER_COOKIE_NAME } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req.url);
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=${encodeURIComponent("Facebook sign-in was cancelled.")}`
    );
  }

  const savedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=${encodeURIComponent("Invalid OAuth state. Please try again.")}`
    );
  }

  try {
    const profile = await exchangeFacebookCode(code, baseUrl);

    const backendRes = await fetch(`${BACKEND}/users/auth/oauth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "facebook",
        provider_id: profile.providerId,
        email: profile.email,
        name: profile.name,
        avatar_url: profile.avatarUrl,
      }),
    });

    const data = await backendRes.json();
    if (!backendRes.ok) {
      throw new Error(data.detail ?? "Facebook authentication failed.");
    }

    const res = NextResponse.redirect(`${baseUrl}/account`);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    res.cookies.set(USER_COOKIE_NAME, data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Facebook authentication failed.";
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=${encodeURIComponent(message)}`
    );
  }
}
