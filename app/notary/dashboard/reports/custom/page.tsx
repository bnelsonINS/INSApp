import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CustomReportsPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-100">
          INS Pro
        </p>

        <h1 className="mt-1 text-3xl font-black">Custom Reports</h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
          Build reports from assignments, invoices, mileage, expenses, payments,
          journal records, and notarial acts.
        </p>

        <div className="mt-5">
          <Link
            href="/notary/dashboard/reports"
            className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-[#0B1F4D] hover:bg-slate-100"
          >
            Back to Reports
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-blue-700">
          Report Builder
        </p>

        <h2 className="mt-1 text-2xl font-black text-slate-950">
          Build Your First Custom Report
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Step one is working. Next we will add report type, date range,
          filters, columns, grouping, and results.
        </p>
      </section>
    </main>
  );
}