/**
 * Business logic for user threads/social posts in the frontend domain.
 */

import { query } from "./db";

export interface Thread {
  id: number;
  user_id: number;
  author_name?: string;
  title: string;
  content: string;
  content_html: string;
  topic_tag: string;
  hashtags: string;
  media_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateThreadInput {
  userId: number;
  title: string;
  content: string;
  contentHtml: string;
  topicTag?: string;
  hashtags?: string;
  mediaUrl?: string | null;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function normalizeHashtags(rawHashtags: string, content: string): string {
  const fromInput = rawHashtags
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));

  const fromContent = content.match(/#[a-zA-Z0-9_]+/g) ?? [];
  const merged = Array.from(new Set([...fromInput, ...fromContent]));
  return merged.join(" ");
}

export async function createThread(input: CreateThreadInput): Promise<Thread> {
  const title = input.title.trim();
  const content = input.content.trim();
  const contentHtml = sanitizeHtml(input.contentHtml.trim() || content);
  const topicTag = (input.topicTag ?? "").trim() || "iQOO Connect";
  const hashtags = normalizeHashtags(input.hashtags ?? "", content);
  const mediaUrl = (input.mediaUrl ?? "").trim() || null;

  if (!title) {
    throw new Error("Article title is required.");
  }
  if (title.length > 255) {
    throw new Error("Article title must be 255 characters or less.");
  }
  if (!content) {
    throw new Error("Article content is required.");
  }

  const { rows } = await query<Thread>(
    `WITH inserted AS (
       INSERT INTO threads (user_id, title, content, content_html, topic_tag, hashtags, media_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *
     )
     SELECT i.*, u.name AS author_name
     FROM inserted i
     JOIN users u ON u.id = i.user_id`,
    [
      input.userId,
      title,
      content,
      contentHtml,
      topicTag.slice(0, 60),
      hashtags,
      mediaUrl,
    ]
  );
  return rows[0];
}

export async function getThreadsByUserId(userId: number): Promise<Thread[]> {
  const { rows } = await query<Thread>(
    `SELECT t.id, t.user_id, u.name AS author_name, t.title, t.content, t.content_html,
            t.topic_tag, t.hashtags, t.media_url, t.views_count, t.likes_count,
            t.comments_count, t.shares_count, t.created_at, t.updated_at
     FROM threads t
     JOIN users u ON u.id = t.user_id
     WHERE t.user_id = $1
     ORDER BY t.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function toggleLikeThread(
  threadId: number,
  delta: 1 | -1
): Promise<number | null> {
  const { rows } = await query<{ likes_count: number }>(
    `UPDATE threads
     SET likes_count = GREATEST(0, likes_count + $1)
     WHERE id = $2
     RETURNING likes_count`,
    [delta, threadId]
  );
  return rows[0]?.likes_count ?? null;
}

export async function incrementShareThread(
  threadId: number
): Promise<number | null> {
  const { rows } = await query<{ shares_count: number }>(
    `UPDATE threads
     SET shares_count = shares_count + 1
     WHERE id = $1
     RETURNING shares_count`,
    [threadId]
  );
  return rows[0]?.shares_count ?? null;
}

export async function incrementViewThread(
  threadId: number
): Promise<number | null> {
  const { rows } = await query<{ views_count: number }>(
    `UPDATE threads
     SET views_count = views_count + 1
     WHERE id = $1
     RETURNING views_count`,
    [threadId]
  );
  return rows[0]?.views_count ?? null;
}

export async function deleteThread(
  threadId: number,
  userId: number
): Promise<boolean> {
  const { rowCount } = await query(
    `DELETE FROM threads WHERE id = $1 AND user_id = $2`,
    [threadId, userId]
  );
  return (rowCount ?? 0) > 0;
}
