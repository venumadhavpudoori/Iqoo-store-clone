/**
 * GET /api/auth/me
 *
 * Proxies to FastAPI GET /auth/me using the stored JWT cookie.
 */
import { NextResponse } from "next/server";
import { getAuthCookie } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET() {
  const token = await getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const backendRes = await fetch(`${BACKEND}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Unauthorized." },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({ user: data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Backend unreachable." }, { status: 503 });
  }
}
