import Link from "next/link";

export default function InsProCancelPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-black uppercase tracking-widest text-amber-700">
          INS Pro
        </p>

        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Checkout canceled
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          No subscription was started and your card was not charged. You can go
          back and upgrade whenever you are ready.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/notary/pro/upgrade"
            className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
          >
            Back to Upgrade
          </Link>

          <Link
            href="/notary/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Maybe Later
          </Link>
        </div>
      </div>
    </main>
  );
}
