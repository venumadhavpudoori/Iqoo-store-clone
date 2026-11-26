import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_COOKIE_NAME } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const backendRes = await fetch(`${BACKEND}/users/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
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
