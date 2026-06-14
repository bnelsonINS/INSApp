import Link from "next/link";
import { PageShell, SectionIntro } from "../components/marketing-site";

export default function PricingPage() {
  return (
    <PageShell>
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Pricing"
          title="Simple pricing. Start free and upgrade only if you need more."
          body="The INS platform is free for notaries. INS Professional is an optional $10/month add-on designed for notaries who want advanced business tools."
        />

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">Title Companies</p>
            <h2 className="mt-4 text-3xl font-black text-slate-950">Request Demo</h2>
            <p className="mt-4 text-slate-600 leading-7">
              INS title company pricing depends on operational needs, order volume, workflow requirements, and implementation scope.
            </p>
            <ul className="mt-6 space-y-3 text-sm font-semibold text-slate-700">
              <li>✓ Order and client management</li>
              <li>✓ Assignment and offer workflows</li>
              <li>✓ Document handling</li>
              <li>✓ QA and scoring tools</li>
              <li>✓ Admin attention center</li>
            </ul>
            <Link href="/request-demo" className="mt-8 inline-flex rounded-full bg-[#0B1F4D] px-6 py-3 text-sm font-black text-white hover:bg-[#12306f]">Request a Demo</Link>
          </div>

          <div className="rounded-[2rem] border-2 border-[#0B1F4D] bg-[#0B1F4D] p-8 text-white shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Notaries</p>
            <h2 className="mt-4 text-3xl font-black">INS Professional</h2>
            <p className="mt-3 text-5xl font-black">$10<span className="text-lg font-bold text-blue-200">/month</span></p>
            <p className="mt-4 text-blue-100 leading-7">
              One price for the planned notary business suite. No confusing tiers.
            </p>
            <ul className="mt-6 space-y-3 text-sm font-semibold text-blue-50">
              <li>✓ Automatic INS assignment sync</li>
              <li>✓ Universal Order Import™</li>
              <li>✓ Manual order entry</li>
              <li>✓ Revenue and mileage tracking</li>
              <li>✓ Tax-ready reporting</li>
              <li>✓ Business analytics</li>
            </ul>
            <Link href="/signup" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-[#0B1F4D] hover:bg-blue-50">Join as a Notary</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
