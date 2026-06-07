"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ForgotPasswordPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(
      "Password reset email sent. Check your inbox and follow the link."
    );
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
              style={{
                width: "100%",
                borderRadius: "12px",
                backgroundColor: "#1e3a8a",
                padding: "12px 20px",
                fontWeight: 700,
                color: "#ffffff",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Sending..." : "Send reset link"}
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