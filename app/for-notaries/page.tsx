import Link from "next/link";
import { CTASection, FeatureCard, PageShell, SectionIntro } from "../components/marketing-site";

export default function NotariesPage() {
  return (
    <PageShell>
      <section className="bg-[#0B1F4D] px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">For Notaries</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Get assignments, stay organized, and grow your notary business.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-blue-100 sm:text-xl">
            INS helps notaries manage offers, assignments, status updates, scanbacks, credentials, earnings visibility, and the upcoming Professional Suite.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#0B1F4D] hover:bg-blue-50">Apply as a Notary</Link>
            <Link href="/professional-suite" className="rounded-full border border-white/30 px-6 py-3 text-center text-sm font-black text-white hover:bg-white/10">View Professional Suite</Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Notary portal"
          title="A better workspace for signing professionals."
          body="INS gives notaries a clear place to manage accepted assignments, upload credentials, update status milestones, submit scanbacks, and view work history."
        />
        <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon="📬" title="Offer Management" body="Review signing offers, accept, decline, or counter from a secure offer page." />
          <FeatureCard icon="🗓️" title="Assignment Dashboard" body="View upcoming assignments, signing details, addresses, notes, documents, and status requirements." />
          <FeatureCard icon="📤" title="Scanback Uploads" body="Upload completed documents and keep the order moving through review and completion." />
          <FeatureCard icon="🪪" title="Credential Management" body="Upload and maintain required notary credentials for approval and ongoing compliance." />
          <FeatureCard icon="⭐" title="Score Transparency" body="Performance scoring creates a clearer path toward trusted, preferred, and elite assignment opportunities." />
          <FeatureCard icon="💼" title="Business Tools" body="The planned $10/month Professional Suite helps track revenue, mileage, taxes, imported orders, and analytics." />
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-50 p-8 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">Simple pricing</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">INS Professional Suite is planned at $10/month.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                One price. No confusing tiers. Designed to help notaries organize their business without spending hours entering data manually.
              </p>
            </div>
            <div className="rounded-[2rem] bg-[#0B1F4D] p-8 text-white shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Included tools</p>
              <div className="mt-6 grid gap-3">
                {[
                  "Revenue tracking",
                  "Mileage tracking",
                  "Tax-ready reporting",
                  "Universal Order Import™",
                  "Manual order entry",
                  "Business analytics",
                ].map((item) => <p key={item} className="rounded-2xl bg-white/10 p-4 font-bold">✓ {item}</p>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </PageShell>
  );
}
