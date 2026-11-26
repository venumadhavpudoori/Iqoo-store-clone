import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { deleteThread } from "@/lib/thread";

export async function DELETE(
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

  try {
    const deleted = await deleteThread(threadId, session.id);
    if (!deleted) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }
    return NextResponse.json({ message: "Thread deleted." }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/threads/[id]]", err);
    return NextResponse.json(
      { error: "Failed to delete thread." },
      { status: 500 }
    );
  }
}
