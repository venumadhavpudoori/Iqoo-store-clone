/**
 * Open-source OAuth 2.0 Authorization Code helpers for Google & Facebook.
 * Uses standard Web Crypto + fetch with zero proprietary SDK lock-in.
 */

export type OAuthProviderName = "google" | "facebook";

export function getAppBaseUrl(requestUrl?: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (requestUrl) {
    return new URL(requestUrl).origin;
  }
  return "http://localhost:3000";
}

export function generateOAuthState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Google OAuth 2.0 ──────────────────────────────────────────────────────────

export function getGoogleAuthUrl(state: string, baseUrl: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to frontend/.env.local."
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/auth/oauth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  baseUrl: string
): Promise<{
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are missing.");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${baseUrl}/api/auth/oauth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("Failed to exchange Google authorization code.");
  }

  const tokenData = await tokenRes.json();
  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }
  );

  if (!profileRes.ok) {
    throw new Error("Failed to fetch Google user profile.");
  }

  const profile = await profileRes.json();
  if (!profile.email) {
    throw new Error("Google account did not return an email address.");
  }

  return {
    providerId: String(profile.id),
    email: profile.email,
    name: profile.name || profile.email.split("@")[0],
    avatarUrl: profile.picture ?? null,
  };
}

// ─── Facebook OAuth 2.0 ────────────────────────────────────────────────────────

export function getFacebookAuthUrl(state: string, baseUrl: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    throw new Error(
      "Facebook OAuth is not configured. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to frontend/.env.local."
    );
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${baseUrl}/api/auth/oauth/facebook/callback`,
    response_type: "code",
    scope: "email,public_profile",
    state,
  });

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeFacebookCode(
  code: string,
  baseUrl: string
): Promise<{
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Facebook OAuth credentials are missing.");
  }

  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: `${baseUrl}/api/auth/oauth/facebook/callback`,
    code,
  });

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`
  );

  if (!tokenRes.ok) {
    throw new Error("Failed to exchange Facebook authorization code.");
  }

  const tokenData = await tokenRes.json();
  const profileParams = new URLSearchParams({
    fields: "id,name,email,picture.type(large)",
    access_token: tokenData.access_token,
  });

  const profileRes = await fetch(
    `https://graph.facebook.com/v19.0/me?${profileParams.toString()}`
  );

  if (!profileRes.ok) {
    throw new Error("Failed to fetch Facebook user profile.");
  }

  const profile = await profileRes.json();
  if (!profile.email) {
    throw new Error(
      "Facebook account did not provide an email address. Ensure email permission is granted."
    );
  }

  return {
    providerId: String(profile.id),
    email: profile.email,
    name: profile.name || profile.email.split("@")[0],
    avatarUrl: profile.picture?.data?.url ?? null,
  };
}
