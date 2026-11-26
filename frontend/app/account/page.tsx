import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getUserSession, USER_COOKIE_NAME } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

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
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center text-2xl font-bold shrink-0">
              {user.name[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-zinc-400 text-sm">{user.email}</p>
              <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/30 capitalize">
                Signed in via {user.provider}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Account Status</div>
              <div className="text-lg font-semibold mt-1 text-emerald-400">
                {user.is_active ? "Active" : "Inactive"}
              </div>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Auth Provider</div>
              <div className="text-lg font-semibold mt-1 capitalize">{user.provider}</div>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Last Login</div>
              <div className="text-sm font-medium mt-1 text-zinc-300">
                {user.last_login_at
                  ? new Date(user.last_login_at).toLocaleString()
                  : "Just now"}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
