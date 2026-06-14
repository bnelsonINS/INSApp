import Link from "next/link";
import { CTASection, FeatureCard, PageShell, SectionIntro } from "../components/marketing-site";

export default function ProfessionalSuitePage() {
  return (
    <PageShell>
      <section className="bg-[#0B1F4D] px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">INS Professional Suite</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Your notary business, organized automatically.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-blue-100 sm:text-xl">
            A planned $10/month add-on that turns INS assignments and imported external orders into revenue tracking, mileage logs, tax summaries, analytics, and business records.
          </p>
          <Link href="/signup" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-[#0B1F4D] hover:bg-blue-50">Join the Notary Network</Link>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="The business suite"
          title="Built for work from INS and every other signing source."
          body="INS Professional is designed to become the notary's system of record, whether the assignment came from INS, another signing service, a title company, or manual entry."
        />
        <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon="⚡" title="Automatic INS Sync" body="Assignments completed through INS automatically feed revenue, payout history, client data, mileage estimates, and analytics." />
          <FeatureCard icon="📩" title="Universal Order Import™" body="Forward external order confirmations to importorder@indiananotarysolutions.com and let INS map the details into the suite." />
          <FeatureCard icon="✍️" title="Manual Entry" body="Add outside orders quickly when there is no email to forward or when a signing comes from a local relationship." />
          <FeatureCard icon="💵" title="Revenue Tracking" body="Track earnings by month, year, client, county, signing type, and source." />
          <FeatureCard icon="🚗" title="Mileage Logs" body="Capture business mileage estimates for INS assignments and imported orders to support tax planning." />
          <FeatureCard icon="🧾" title="Tax Center" body="Prepare Schedule C style summaries, expense categories, CSV exports, and accountant-friendly reports." />
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="Universal Order Import™"
            title="Forward the confirmation email. INS handles the mapping."
            body="Instead of connecting to Gmail or manually copying every field, notaries can forward external confirmations to a dedicated INS import address."
          />
          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {[
              ["1", "Forward Email", "Send the order confirmation to importorder@indiananotarysolutions.com."],
              ["2", "Extract Details", "INS identifies borrower, fee, date, time, address, client, and signing type."],
              ["3", "Review", "High-confidence imports are added, while uncertain imports are presented for review."],
              ["4", "Track", "Revenue, mileage, tax, and analytics records update automatically."],
            ].map(([num, title, body]) => (
              <div key={num} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1F4D] text-lg font-black text-white">{num}</div>
                <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </PageShell>
  );
}
