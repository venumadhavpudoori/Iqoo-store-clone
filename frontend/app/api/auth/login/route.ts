import { NextRequest, NextResponse } from "next/server";
import { setUserAuthCookie } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const backendRes = await fetch(`${BACKEND}/users/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      const errorMsg =
        typeof data.detail === "string"
          ? data.detail
          : data.error ?? "Authentication failed.";
      return NextResponse.json({ error: errorMsg }, { status: backendRes.status });
    }

    await setUserAuthCookie(data.token);

    return NextResponse.json(
      { message: data.message, user: data.user },
      { status: 200 }
    );
  } catch (err) {
    console.error("[frontend /api/auth/login]", err);
    return NextResponse.json(
      { error: "Could not reach the backend. Is FastAPI running on port 8000?" },
      { status: 503 }
    );
  }
}
