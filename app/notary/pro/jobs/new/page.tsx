import Link from "next/link";
import { createManualProJob } from "../actions";

export default function NewProJobPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              INS Pro
            </p>
            <h1 className="text-3xl font-black text-slate-950">
              Add Non-INS Signing
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track outside work without mixing it into INS assignments.
            </p>
          </div>

          <Link
            href="/notary/pro/jobs"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Back to Jobs
          </Link>
        </div>

        <form
          action={createManualProJob}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Borrower Name *
              </span>
              <input
                name="borrower_name"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="John Smith"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Client / Company
              </span>
              <input
                name="client_name"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="ABC Title"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Signing Type
              </span>
              <select
                name="signing_type"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                defaultValue="Refinance"
              >
                <option>Refinance</option>
                <option>Purchase</option>
                <option>Seller Package</option>
                <option>HELOC</option>
                <option>Loan Modification</option>
                <option>General Notary Work</option>
                <option>Other</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Status</span>
              <select
                name="status"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                defaultValue="scheduled"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Signing Date
              </span>
              <input
                name="signing_date"
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Signing Time
              </span>
              <input
                name="signing_time"
                type="time"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-slate-700">Address</span>
              <input
                name="signing_address"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="123 Main St"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">City</span>
              <input
                name="signing_city"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="Indianapolis"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">State</span>
              <input
                name="signing_state"
                defaultValue="IN"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">ZIP</span>
              <input
                name="signing_zip"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="46204"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Fee</span>
              <input
                name="fee"
                type="number"
                step="0.01"
                min="0"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="125.00"
              />
            </label>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:col-span-2 sm:grid-cols-2">
              {[
                ["appointment_confirmed", "Appointment confirmed"],
                ["docs_received", "Docs received"],
                ["docs_printed", "Docs printed"],
                ["scanbacks_required", "Scanbacks required"],
              ].map(([name, label]) => (
                <label key={name} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <input name={name} type="checkbox" className="h-4 w-4" />
                  {label}
                </label>
              ))}
            </div>

            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-slate-700">Notes</span>
              <textarea
                name="notes"
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="Anything you want to remember..."
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/notary/pro/jobs"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-black text-white hover:bg-blue-950"
            >
              Save Signing
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}