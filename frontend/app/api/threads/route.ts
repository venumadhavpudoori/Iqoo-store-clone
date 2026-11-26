import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { createThread, getThreadsByUserId } from "@/lib/thread";

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const threads = await getThreadsByUserId(session.id);
    return NextResponse.json({ threads }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/threads]", err);
    return NextResponse.json(
      { error: "Failed to load threads." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content, contentHtml, topicTag, hashtags, mediaUrl } = body;

    const thread = await createThread({
      userId: session.id,
      title: String(title ?? ""),
      content: String(content ?? ""),
      contentHtml: String(contentHtml ?? ""),
      topicTag: topicTag ? String(topicTag) : undefined,
      hashtags: hashtags ? String(hashtags) : undefined,
      mediaUrl: mediaUrl ? String(mediaUrl) : null,
    });

    return NextResponse.json(
      { message: "Thread published successfully.", thread },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Could not create thread.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
