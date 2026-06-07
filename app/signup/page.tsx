"use client";

import Link from "next/link";
import { useState } from "react";

type Role = "notary" | "client";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("notary");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanBusinessName = businessName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFirstName || !cleanLastName || !cleanEmail) {
      setErrorMessage("First name, last name, and email are required.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const response = await fetch("/signup/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: cleanFirstName,
        lastName: cleanLastName,
        businessName: cleanBusinessName,
        email: cleanEmail,
        password,
        role,
      }),
    });

    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      setErrorMessage(result.error || "Unable to create account.");
      return;
    }

    setMessage(result.message || "Account created. You can now sign in.");

    setFirstName("");
    setLastName("");
    setBusinessName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("notary");
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 px-6 py-12 text-white">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              Create your account
            </h1>

            <p className="mt-4 text-lg text-blue-100">
              Join Indiana Notary Solutions as a notary or title company client.
            </p>

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5 text-sm text-blue-100 shadow-lg">
              Notaries can upload credentials, set coverage areas, and receive
              assignments.
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-100 px-6 py-12">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
            <h2 className="text-3xl font-bold text-slate-900">Sign up</h2>

            <p className="mt-2 text-slate-600">
              Start by creating your login account.
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

            <form onSubmit={handleSignup} className="mt-8 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    First name
                  </label>
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Last name
                  </label>
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Business name
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Account type
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="notary">Notary</option>
                  <option value="client">Client / Title Company</option>
                </select>
              </div>

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

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?
              </p>

              <Link
                href="/login"
                className="mt-2 inline-flex font-bold text-blue-800 hover:text-blue-950"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}