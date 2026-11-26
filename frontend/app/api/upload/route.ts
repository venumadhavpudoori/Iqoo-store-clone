import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_COOKIE_NAME } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const forwardData = new FormData();
    forwardData.append("file", file);

    const backendRes = await fetch(`${BACKEND}/upload/image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: forwardData,
    });

    const data = await backendRes.json();
    if (!backendRes.ok) {
      const errorMsg =
        typeof data.detail === "string"
          ? data.detail
          : data.error ?? "Upload failed.";
      return NextResponse.json({ error: errorMsg }, { status: backendRes.status });
    }

    return NextResponse.json({ url: data.url }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json(
      { error: "Could not reach backend upload service." },
      { status: 503 }
    );
  }
}
