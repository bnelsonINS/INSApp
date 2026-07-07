import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REPORT_TYPES = [
  { value: "assignments", label: "Assignments" },
  { value: "invoices", label: "Invoices" },
  { value: "mileage", label: "Mileage" },
  { value: "expenses", label: "Expenses" },
  { value: "payments", label: "Payments" },
  { value: "journal", label: "Journal" },
  { value: "notarial_acts", label: "Notarial Acts" },
];

const COLUMNS = [
  "Client",
  "Assignment",
  "Order #",
  "Date",
  "Status",
  "Fee",
  "Paid",
  "Balance",
  "Miles",
  "Expenses",
];

export default function CustomReportsPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-100">
          INS Pro
        </p>
        <h1 className="mt-1 text-3xl font-black">Custom Reports</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
          Build reports from any INS Pro data you track.
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
          Build a Custom Report
        </h2>

        <form className="mt-6 grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                Report Type
              </label>
              <select
                name="type"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                Start Date
              </label>
              <input
                type="date"
                name="start"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                End Date
              </label>
              <input
                type="date"
                name="end"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Columns
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {COLUMNS.map((column) => (
                <label
                  key={column}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="columns"
                    value={column}
                    defaultChecked
                    className="h-4 w-4"
                  />
                  {column}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-black text-[#0B1F4D]">
              Next step
            </p>
            <p className="mt-1 text-sm text-slate-600">
              We will wire this form to Supabase and show the results table below.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-[#0B1F4D] px-6 py-3 text-sm font-black text-white hover:bg-blue-950"
            >
              Generate Custom Report
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}