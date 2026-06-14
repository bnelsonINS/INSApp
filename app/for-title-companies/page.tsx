import Link from "next/link";
import { CTASection, FeatureCard, PageShell, SectionIntro } from "../components/marketing-site";

export default function TitleCompaniesPage() {
  return (
    <PageShell>
      <section className="bg-[#0B1F4D] px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">For Title Companies</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">A clearer way to manage signing operations.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-blue-100 sm:text-xl">
            INS gives title teams a central workspace for orders, documents, notary assignment, operational deadlines, scanbacks, QA, and performance visibility.
          </p>
          <Link href="/request-demo" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-[#0B1F4D] hover:bg-blue-50">
            Request a Demo
          </Link>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Operational control"
          title="Replace scattered follow-up with structured workflows."
          body="INS is designed to help teams understand what is happening, who is responsible, and what needs attention on every file."
        />
        <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon="📥" title="Order Intake" body="Create and manage orders with borrower details, signing information, client records, signers, and document status." />
          <FeatureCard icon="🧭" title="Smart Notary Matching" body="Our proprietary matching algorithm helps identify the best notary for each signing based on factors like location, performance, and availability." />
          <FeatureCard icon="📨" title="Offer Rounds" body="INS sends offers, track responses, view accepted offers, and assign the notary that best fits the file." />
          <FeatureCard icon="📄" title="Document Workflow" body="Upload and organize title packages, assignment documents, scanbacks, and related files." />
          <FeatureCard icon="🔔" title="Proactive Monitoring" body="Our platform continuously monitors the signing process and notifies our team when follow-up or intervention may be required." />
          <FeatureCard icon="🧪" title="QA Foundation" body="Support file review, issue tracking, scoring deductions, notes, and future automated QA findings." />
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-50 p-8 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">Built around accountability</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Know which files need attention before clients call you.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                INS helps you monitor assignment progress, notary confirmations, signing status, scanback requirements, and QA readiness from a single operational dashboard.
              </p>
            </div>
            <div className="space-y-4">
              {[
                "Centralized order and client records",
                "Assignment and offer event history",
                "Notary score and lifetime performance visibility",
                "Scanback and QA tracking",
                "Notes visible across authorized user roles",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white p-4 text-sm font-black text-slate-800 shadow-sm">✓ {item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </PageShell>
  );
}
