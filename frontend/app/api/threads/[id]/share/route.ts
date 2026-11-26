import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { incrementShareThread } from "@/lib/thread";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const threadId = Number(id);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return NextResponse.json({ error: "Invalid thread ID." }, { status: 400 });
  }

  const sharesCount = await incrementShareThread(threadId);
  if (sharesCount === null) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  return NextResponse.json({ shares_count: sharesCount }, { status: 200 });
}
