/**
 * GET /api/superadmins
 *
 * Proxies to FastAPI GET /auth/admins (protected – requires valid JWT).
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
    const backendRes = await fetch(`${BACKEND}/auth/admins`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Forbidden." },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({ admins: data.admins }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Backend unreachable." }, { status: 503 });
  }
}
