import { redirect } from "next/navigation";
import { getSessionUser, getAuthCookie } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

interface SuperAdmin {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchSuperAdmins(token: string): Promise<SuperAdmin[]> {
  try {
    const res = await fetch(`${BACKEND}/auth/admins`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.admins ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const token = await getAuthCookie();
  if (!user || !token) redirect("/auth/login");

  const admins = await fetchSuperAdmins(token);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Top navigation */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-semibold leading-tight">Platform Owner</h1>
              <p className="text-blue-400 text-xs">Superadmin Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{user.username}</p>
              <p className="text-blue-400 text-xs">{user.email}</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600/30 text-blue-300 border border-blue-500/40">
              superadmin
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome banner */}
        <div className="mb-10 bg-gradient-to-r from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-2xl px-8 py-6">
          <h2 className="text-2xl font-bold text-white">
            Welcome back, {user.username}! 👋
          </h2>
          <p className="text-blue-300 mt-1">
            You are signed in as a <strong className="text-blue-200">superadmin</strong>. You have full platform access.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          <StatCard
            icon="👥"
            label="Superadmins"
            value={`${admins.length} / 2`}
            sub="Platform limit: 2"
          />
          <StatCard
            icon="✅"
            label="Active Accounts"
            value={String(admins.filter((a) => a.is_active).length)}
            sub="Currently active"
          />
          <StatCard
            icon="🔐"
            label="Your Role"
            value="Superadmin"
            sub="Full platform access"
          />
        </div>

        {/* Superadmin list */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-4">Superadmin Accounts</h3>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left text-blue-300 font-medium px-6 py-4">#</th>
                  <th className="text-left text-blue-300 font-medium px-6 py-4">Name</th>
                  <th className="text-left text-blue-300 font-medium px-6 py-4">Email</th>
                  <th className="text-left text-blue-300 font-medium px-6 py-4">Status</th>
                  <th className="text-left text-blue-300 font-medium px-6 py-4">Last Login</th>
                  <th className="text-left text-blue-300 font-medium px-6 py-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin, i) => (
                  <tr
                    key={admin.id}
                    className={`border-b border-white/5 hover:bg-white/5 transition ${
                      admin.id === user.id ? "bg-blue-600/10" : ""
                    }`}
                  >
                    <td className="px-6 py-4 text-blue-400">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {admin.username[0].toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{admin.username}</span>
                        {admin.id === user.id && (
                          <span className="text-xs text-blue-400">(you)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-blue-200">{admin.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        admin.is_active
                          ? "bg-green-500/20 text-green-400 border border-green-500/40"
                          : "bg-red-500/20 text-red-400 border border-red-500/40"
                      }`}>
                        {admin.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-blue-300 text-xs">
                      {admin.last_login_at
                        ? new Date(admin.last_login_at).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 text-blue-300 text-xs">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {admins.length === 0 && (
              <div className="text-center py-10 text-blue-400">
                No superadmins found. Run the seed script.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-blue-300 text-xs font-medium uppercase tracking-wider mb-1">{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-blue-400 text-xs mt-1">{sub}</div>
    </div>
  );
}
