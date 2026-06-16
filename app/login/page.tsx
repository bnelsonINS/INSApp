import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import SubmitButton from "../components/SubmitButton";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const redirectTo = params?.redirectTo;

  async function signIn(formData: FormData) {
    "use server";

    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const redirectTarget = String(formData.get("redirectTo") || "");

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect(
        `/login?error=Invalid email or password${
          redirectTarget
            ? `&redirectTo=${encodeURIComponent(redirectTarget)}`
            : ""
        }`
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login?error=Unable to sign in");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      redirectTarget &&
      redirectTarget.startsWith("/") &&
      !redirectTarget.startsWith("//")
    ) {
      redirect(redirectTarget);
    }

    if (profile?.role === "admin") redirect("/dashboard");
    if (profile?.role === "notary") redirect("/notary/dashboard");
    if (profile?.role === "client") redirect("/client/dashboard");

    redirect("/login?error=Account role not found");
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 px-6 py-12 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_35%)]" />

          <div className="relative max-w-xl text-center">
            <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-3xl border border-white/20 bg-white p-5 shadow-2xl">
              <Image
                src="/ins-logo.png"
                alt="Indiana Notary Solutions logo"
                width={170}
                height={170}
                priority
                className="object-contain"
              />
            </div>

            <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl">
              Indiana Notary Solutions
            </h1>

            <p className="mt-4 text-xl font-medium text-blue-100">
              Everything your signing business needs. One platform.
            </p>

            <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-blue-100/90">
              Manage assignments, credentials, documents, client orders,
              messaging, and financial tracking in one secure workspace built
              for admins, notaries, and title company clients.
            </p>

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5 text-sm leading-7 text-blue-50 shadow-lg backdrop-blur">
              Track orders, monitor earnings, manage compliance, and run your
              signing business with confidence.
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-100 px-6 py-12">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
            <h2 className="text-3xl font-bold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-2 text-slate-600">
              Sign in to access your account.
            </p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <form action={signIn} className="mt-8 space-y-5">
              <input type="hidden" name="redirectTo" value={redirectTo || ""} />

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Email address
                </label>

                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-blue-800 hover:text-blue-950"
                  >
                    Forgot password?
                  </Link>
                </div>

                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <SubmitButton
                pendingText="Signing in..."
                className="w-full rounded-xl bg-blue-900 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-950"
              >
                Sign in
              </SubmitButton>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6 text-center">
              <p className="text-sm text-slate-600">Need an account?</p>

              <Link
                href="/signup"
                className="mt-2 inline-flex font-bold text-blue-800 hover:text-blue-950"
              >
                Create your account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}