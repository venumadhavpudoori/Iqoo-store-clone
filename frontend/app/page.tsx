import Link from "next/link";
import { getUserSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function HomePage() {
  const user = await getUserSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            iQOO <span className="text-amber-400">Store</span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/account"
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition"
                >
                  My Account ({user.name})
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 text-center">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/30 mb-6">
          iQOO Flagship Storefront
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Welcome to iQOO Store
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto mb-8">
          {user
            ? `Signed in as ${user.name} (${user.email}) via ${user.provider}.`
            : "Sign in with email, Google, or Facebook to manage your orders and account."}
        </p>
        <div className="flex items-center justify-center gap-4">
          {user ? (
            <Link
              href="/account"
              className="px-6 py-3 rounded-xl font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition"
            >
              Go to My Account
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signup"
                className="px-6 py-3 rounded-xl font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition"
              >
                Create Account
              </Link>
              <Link
                href="/auth/login"
                className="px-6 py-3 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
