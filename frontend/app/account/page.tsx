import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getUserSession, USER_COOKIE_NAME } from "@/lib/auth";
import { getThreadsByUserId } from "@/lib/thread";
import LogoutButton from "@/components/LogoutButton";
import ThreadEditor, { ThreadItem } from "@/components/ThreadEditor";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  provider: string;
  is_active: boolean;
  last_login_at: string | null;
}

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchCurrentUser(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${BACKEND}/users/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function AccountPage() {
  const session = await getUserSession();
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE_NAME)?.value;

  if (!session || !token) redirect("/auth/login");

  const user = await fetchCurrentUser(token);
  if (!user) redirect("/auth/login");

  const rawThreads = await getThreadsByUserId(user.id).catch(() => []);
  const initialThreads: ThreadItem[] = rawThreads.map((t) => ({
    id: t.id,
    author_name: t.author_name ?? user.name,
    title: t.title,
    content: t.content,
    content_html: t.content_html,
    topic_tag: t.topic_tag,
    hashtags: t.hashtags,
    media_url: t.media_url,
    views_count: t.views_count,
    likes_count: t.likes_count,
    comments_count: t.comments_count,
    shares_count: t.shares_count,
    created_at: new Date(t.created_at).toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            iQOO <span className="text-amber-400">Store</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-300 hidden sm:inline">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <ThreadEditor initialThreads={initialThreads} authorName={user.name} />
      </main>
    </div>
  );
}
