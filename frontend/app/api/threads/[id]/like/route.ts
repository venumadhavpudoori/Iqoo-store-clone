import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { toggleLikeThread } from "@/lib/thread";

export async function POST(
  req: NextRequest,
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

  const body = await req.json().catch(() => ({}));
  const delta: 1 | -1 = body.liked === false ? -1 : 1;

  const likesCount = await toggleLikeThread(threadId, delta);
  if (likesCount === null) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  return NextResponse.json({ likes_count: likesCount }, { status: 200 });
}
