import Link from "next/link";
import { PageShell } from "../components/marketing-site";

export default function ContactPage() {
  return (
    <PageShell>
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">Contact</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">Let's talk about your signing workflow.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Use this page as the public contact route. Later, this form can be wired into Supabase, Resend, or your CRM.
            </p>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="font-black text-slate-950">Need access?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Title companies can request a demo. Notaries can apply through the signup flow.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href="/request-demo" className="rounded-full bg-[#0B1F4D] px-5 py-3 text-center text-sm font-black text-white">Request Demo</Link>
                <Link href="/signup" className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-black text-slate-700">Notary Sign Up</Link>
              </div>
            </div>
          </div>

          <form className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First Name" placeholder="First name" />
              <Field label="Last Name" placeholder="Last name" />
              <Field label="Email" placeholder="you@example.com" type="email" />
              <Field label="Phone" placeholder="(555) 555-5555" />
            </div>
            <div className="mt-5">
              <label className="text-sm font-black text-slate-800">I am a</label>
              <select className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0B1F4D]">
                <option>Title Company</option>
                <option>Signing Service</option>
                <option>Notary</option>
                <option>Other</option>
              </select>
            </div>
            <div className="mt-5">
              <label className="text-sm font-black text-slate-800">Message</label>
              <textarea placeholder="Tell us what you need help with..." rows={6} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#0B1F4D]" />
            </div>
            <button type="button" className="mt-6 w-full rounded-full bg-[#0B1F4D] px-6 py-3 text-sm font-black text-white hover:bg-[#12306f]">
              Submit Inquiry
            </button>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              This static form is ready for styling. Next step is wiring it to Supabase or email delivery.
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
