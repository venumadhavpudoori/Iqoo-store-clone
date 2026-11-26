import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearUserAuthCookie, USER_COOKIE_NAME } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_COOKIE_NAME)?.value;

    if (token) {
      await fetch(`${BACKEND}/users/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).catch(() => {
        // Backend unreachable — still clear cookie
      });
    }
  } finally {
    await clearUserAuthCookie();
  }

  return NextResponse.json(
    { message: "Logged out successfully." },
    { status: 200 }
  );
}
