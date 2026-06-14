import Link from "next/link";
import { PageShell } from "../components/marketing-site";

export default function RequestDemoPage() {
  return (
    <PageShell>
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">Request Demo</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">See how INS can support your signing operation.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Tell us about your team, volume, and workflow. This page can later be connected to a real lead capture table and email notification workflow.
            </p>
            <div className="mt-8 grid gap-3">
              {[
                "Order intake and client visibility",
                "Notary assignment and offer rounds",
                "Document and scanback tracking",
                "QA and performance scoring",
                "Future ACH and notary business suite roadmap",
              ].map((item) => <p key={item} className="rounded-2xl bg-white p-4 text-sm font-black text-slate-800 shadow-sm">✓ {item}</p>)}
            </div>
          </div>

          <form className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" placeholder="Your name" />
              <Field label="Company" placeholder="Company name" />
              <Field label="Email" placeholder="you@company.com" type="email" />
              <Field label="Phone" placeholder="(555) 555-5555" />
            </div>
            <div className="mt-5">
              <label className="text-sm font-black text-slate-800">Role</label>
              <select className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0B1F4D]">
                <option>Title Company</option>
                <option>Signing Service</option>
                <option>Operations Manager</option>
                <option>Notary</option>
              </select>
            </div>
            <div className="mt-5">
              <label className="text-sm font-black text-slate-800">Monthly Signing Volume</label>
              <select className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0B1F4D]">
                <option>Under 25</option>
                <option>25–100</option>
                <option>100–500</option>
                <option>500+</option>
              </select>
            </div>
            <div className="mt-5">
              <label className="text-sm font-black text-slate-800">What are you trying to improve?</label>
              <textarea rows={6} placeholder="Assignment speed, document tracking, QA, notary performance, etc." className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0B1F4D]" />
            </div>
            <button type="button" className="mt-6 w-full rounded-full bg-[#0B1F4D] px-6 py-3 text-sm font-black text-white hover:bg-[#12306f]">
              Request Demo
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              Already have access? <Link href="/login" className="font-black text-[#0B1F4D]">Login here</Link>.
            </p>
          </form>
        </div>
      </section>
    </PageShell>
  );
}

function Field({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="text-sm font-black text-slate-800">{label}</label>
      <input type={type} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0B1F4D]" />
    </div>
  );
}
