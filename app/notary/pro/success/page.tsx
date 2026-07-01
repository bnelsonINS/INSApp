import Link from "next/link";

export default function InsProSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-green-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-black uppercase tracking-widest text-green-700">
          INS Pro
        </p>

        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Payment received
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          Your subscription is being activated. Stripe will send confirmation to
          Indiana Notary Solutions, and INS Pro should unlock automatically on
          your next page load.
        </p>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-slate-700">
          If the tools do not unlock immediately, wait a few seconds and refresh
          the assignment page. Webhooks are fast, but they are not magic. Close,
          but still not magic.
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/notary/dashboard"
            className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/notary/assignments"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            View Assignments
          </Link>
        </div>
      </div>
    </main>
  );
}
