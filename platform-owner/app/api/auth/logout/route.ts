/**
 * POST /api/auth/logout
 *
 * Tells the FastAPI backend about the logout (stateless acknowledgement),
 * then clears the httpOnly cookie from the browser.
 */
import { NextResponse } from "next/server";
import { clearAuthCookie, getAuthCookie } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST() {
  try {
    const token = await getAuthCookie();

    // Notify backend (fire-and-forget – logout is stateless on JWT)
    if (token) {
      await fetch(`${BACKEND}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).catch(() => {
        // Backend may be down – still clear cookie
      });
    }
  } finally {
    await clearAuthCookie();
  }

  return NextResponse.json({ message: "Logged out successfully." }, { status: 200 });
}
