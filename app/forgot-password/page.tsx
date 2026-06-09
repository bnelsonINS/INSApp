"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  }, []);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Password reset email sent. Check your inbox and follow the link.");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900">
            Forgot password?
          </h1>

          <p className="mt-2 text-slate-600">
            Enter your email address and we will send you a password reset link.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleReset} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Email address
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <button
  type="submit"
  disabled={loading}
  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1F4D] px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
>
  {loading ? (
    <>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      <span>Sending reset link...</span>
    </>
  ) : (
    "Send reset link"
  )}
</button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <Link
              href="/login"
              className="font-bold text-blue-800 hover:text-blue-950"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}