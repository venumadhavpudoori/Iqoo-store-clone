/**
 * POST /api/auth/login
 *
 * Proxies to FastAPI POST /auth/login.
 * On success → extracts the JWT from the backend response
 * and sets it as an httpOnly cookie so the middleware can read it.
 */
import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";

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

    // ── Forward to FastAPI backend ────────────────────────────────────────────
    const backendRes = await fetch(`${BACKEND}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      // Normalise FastAPI's { detail: "..." } → { error: "..." }
      const errorMsg =
        typeof data.detail === "string"
          ? data.detail
          : data.error ?? "Authentication failed.";
      return NextResponse.json({ error: errorMsg }, { status: backendRes.status });
    }

    // ── Set httpOnly cookie with the JWT returned by FastAPI ──────────────────
    await setAuthCookie(data.token);

    return NextResponse.json(
      { message: data.message, user: data.user },
      { status: 200 }
    );
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return NextResponse.json(
      { error: "Could not reach the backend. Is the FastAPI server running on port 8000?" },
      { status: 503 }
    );
  }
}
