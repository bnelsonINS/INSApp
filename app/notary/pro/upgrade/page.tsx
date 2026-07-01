"use client";

import { useState } from "react";

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-6">

        <div className="rounded-3xl bg-[#0B1F4D] px-8 py-10 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            INS PRO
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Save Thousands on Taxes Every Year
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-blue-100">
            Turn Every Signing Into Better Tax Records

INS Pro automatically tracks your mileage, notarial acts, and business expenses for every assignment. Throughout the year you'll build organized records that can help maximize legitimate business deductions and make tax season dramatically easier.

Built for Professional Notaries

Instead of juggling spreadsheets, receipts, and multiple apps, INS Pro keeps everything connected to each assignment—from your journal and invoices to expenses, mileage, payments, and reports—all in one place.

An Investment That Pays for Itself

Many full-time signing agents recover far more in tax deductions than the cost of INS Pro. Better records, fewer missed deductions, and less time spent on bookkeeping mean you can focus on completing more signings and growing your business.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Everything Included
            </h2>

            <ul className="mt-6 space-y-4 text-slate-700">
              <li>✅ Electronic Notary Journal</li>
              <li>✅ Invoice Generator</li>
              <li>✅ Mileage Tracker</li>
              <li>✅ Expense Tracking</li>
              <li>✅ Payment History</li>
              <li>✅ Notarial Acts Log</li>
              <li>✅ Business Reports</li>
              <li>✅ One-click Assignment Workspace</li>
              <li>✅ Future AI Business Insights</li>
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-[#0B1F4D] bg-white p-8 shadow-lg">

            <p className="text-sm font-semibold uppercase tracking-widest text-[#0B1F4D]">
              Monthly Subscription
            </p>

            <div className="mt-4 flex items-end gap-2">
              <span className="text-6xl font-bold text-slate-900">$14.99</span>
              <span className="mb-2 text-slate-500">/month</span>
            </div>

            <p className="mt-4 text-slate-600">
              Cancel anytime. No contracts. Your subscription renews monthly.
            </p>

            <button
              className="mt-8 w-full rounded-xl bg-[#0B1F4D] px-6 py-4 text-lg font-bold text-white transition hover:bg-blue-950"
            >
              Upgrade Now
            </button>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                window.location.href = "/notary/dashboard";
              }}
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              )}
              {loading ? "Returning..." : "Maybe Later"}
            </button>
          </div>

        </div>

        <div className="mt-10 rounded-2xl border bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-bold text-slate-900">
            Why INS Pro?
          </h2>

          <p className="mt-4 text-slate-600 leading-7">
            INS Pro is built directly into the Indiana Notary Solutions
            platform. Unlike separate notary business apps, your assignments,
            journal entries, invoices, mileage, expenses, and payments stay
            connected automatically—eliminating duplicate data entry and saving
            valuable time.
          </p>

        </div>

      </div>
    </main>
  );
}
