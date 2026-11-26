/**
 * POST /api/auth/signup
 *
 * Proxies to FastAPI POST /auth/signup.
 * On success → sets an httpOnly cookie with the JWT so the user is
 * immediately logged in without a second request.
 */
import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password } = body;

    // Basic client-side-style validation before forwarding
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // ── Forward to FastAPI backend ────────────────────────────────────────────
    const backendRes = await fetch(`${BACKEND}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      const errorMsg =
        typeof data.detail === "string"
          ? data.detail
          : data.error ?? "Could not create account.";
      return NextResponse.json({ error: errorMsg }, { status: backendRes.status });
    }

    // ── Set httpOnly cookie ───────────────────────────────────────────────────
    await setAuthCookie(data.token);

    return NextResponse.json(
      { message: data.message, user: data.user },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/auth/signup]", err);
    return NextResponse.json(
      { error: "Could not reach the backend. Is the FastAPI server running on port 8000?" },
      { status: 503 }
    );
  }
}
