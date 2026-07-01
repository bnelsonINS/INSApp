import Link from "next/link";

export default function UpgradePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-6">

        <div className="rounded-3xl bg-[#0B1F4D] px-8 py-10 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            INS PRO
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Upgrade Your Notary Business
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-blue-100">
            INS Pro gives you the tools professional signing agents use every
            day to manage their business, track assignments, complete journals,
            generate invoices, monitor mileage, and prepare for tax season.
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
              <span className="text-6xl font-bold">$14.99</span>
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

            <Link
              href="/notary/dashboard"
              className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-700"
            >
              Maybe Later
            </Link>
          </div>

        </div>

        <div className="mt-10 rounded-2xl border bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-bold">
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