import Link from "next/link";
import {
  CTASection,
  FeatureCard,
  PageShell,
  SectionIntro,
  WorkflowStrip,
} from "./components/marketing-site";

function PublicPlatformMockup() {
  const upcomingSignings = [
    ["Purchase Signing", "Today • 2:00 PM • Carmel, IN"],
    ["Refinance", "Tomorrow • 10:30 AM • Fishers, IN"],
    ["Seller Package", "Friday • 4:00 PM • Indianapolis, IN"],
  ];

  const proStats = [
    ["Revenue", "$2,840"],
    ["Mileage", "412 mi"],
    ["Signings", "18"],
  ];

  return (
    <div className="relative flex items-center justify-center">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur">
        <div className="rounded-[1.5rem] bg-white p-6 shadow-xl sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
                Notary Workspace
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Manage your signings
              </h2>
            </div>

            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
              Online
            </span>
          </div>

          <div className="mt-8 space-y-3">
            {upcomingSignings.map(([title, detail]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <p className="font-black text-slate-950">{title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-[#0B1F4D] p-5 text-white">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
              INS Professional
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {proStats.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs font-bold text-blue-100">{label}</p>
                  <p className="mt-1 text-xl font-black">{value}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm font-semibold text-blue-100">
              Track signings, revenue, mileage, and tax-ready reports for
your notary business.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <PageShell>
      <section className="relative overflow-hidden bg-[#0B1F4D]">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_top_right,#60a5fa,transparent_35%),radial-gradient(circle_at_bottom_left,#22c55e,transparent_30%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-28">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-200">
              Indiana Notary Solutions
            </p>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              Signing operations, quality control, and notary business tools in
              one platform.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100 sm:text-xl">
              INS helps title companies manage orders, assign trusted notaries,
              track documents, monitor deadlines, and support notaries with
              business tools built for real signing work.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/request-demo"
                className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#0B1F4D] shadow-sm hover:bg-blue-50"
              >
                Request a Demo
              </Link>

              <Link
                href="/for-notaries"
                className="rounded-full border border-white/30 px-6 py-3 text-center text-sm font-black text-white hover:bg-white/10"
              >
                Explore Notary Tools
              </Link>
            </div>
          </div>

          <PublicPlatformMockup />
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="End-to-end workflow"
          title="One connected system for every stage of the signing process."
          body="From order intake through assignment, scanbacks, QA, and completion, INS gives teams the visibility they need without chasing spreadsheets, emails, and disconnected tools."
        />

        <WorkflowStrip />
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Why INS"
          title="Built for visibility, accountability, and better operations."
          body="INS brings together the tools signing teams need to move faster while maintaining quality, consistency, and trust."
        />

        <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Smarter Assignments"
            icon="📍"
            body="INS matches orders with qualified notaries using coverage, performance indicators, and operational status."
          />

          <FeatureCard
            title="Performance Standards"
            icon="⭐"
            body="Support consistent service with notary scoring, quality events, and lifetime performance history."
          />

          <FeatureCard
            title="Order Visibility"
            icon="🚦"
            body="Track each file from order intake through signing, scanbacks, QA, and completion."
          />

          <FeatureCard
            title="Secure Documents"
            icon="🔒"
            body="Access the documents you need—from title packages to scanbacks—through a secure, easy-to-use platform."
          />

          <FeatureCard
            title="Peace of Mind"
            icon="✅"
            body="From first contact to final documents, INS helps create a smoother experience for everyone involved."
          />

          <FeatureCard
            title="Grow Your Business"
            icon="📈"
            body="Whether you're building your notary practice or expanding your signing operation, INS is designed to support your growth every step of the way."
          />
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-[#0B1F4D] p-8 text-white shadow-sm lg:p-12">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">
              For title companies
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Manage the signing process with clarity.
            </h2>

            <p className="mt-5 text-lg leading-8 text-blue-100">
              Create orders, upload documents, monitor assignments, communicate
              with notaries, receive scanbacks, and keep every file moving.
            </p>

            <Link
              href="/for-title-companies"
              className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-[#0B1F4D] hover:bg-blue-50"
            >
              Learn More
            </Link>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-12">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              For notaries
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Receive work and run your business in one place.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Manage assignments, credentials, scanbacks, status updates, and
              the upcoming INS Professional Suite for revenue, mileage, tax
              reports, and order imports.
            </p>

            <Link
              href="/for-notaries"
              className="mt-8 inline-flex rounded-full bg-[#0B1F4D] px-6 py-3 text-sm font-black text-white hover:bg-[#12306f]"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-slate-200 bg-slate-50 p-8 shadow-sm lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                OPTIONAL ADD-ON • INS PROFESSIONAL SUITE
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                A $10/month business suite for working notaries.
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                The INS platform is free to use. INS Professional is an optional $10/month add-on that helps notaries track revenue, mileage, signings, analytics, and tax-ready reports—all in one place.
              </p>

              <div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700">
  Free Platform • Optional $10/month Upgrade
</div>

              <Link
                href="/professional-suite"
                className="mt-8 inline-flex rounded-full bg-[#0B1F4D] px-6 py-3 text-sm font-black text-white hover:bg-[#12306f]"
              >
                View the Suite
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [
                  "Automatic Revenue",
                  "INS orders feed directly into notary earnings.",
                ],
                [
                  "All Your Signings, One Place",
                  "Forward confirmations from other signing services to automatically organize your orders inside INS.",
                ],
                [
                  "Mileage & Taxes",
                  "Track business miles and prepare tax summaries.",
                ],
                [
                  "Business Insights",
                  "Discover where your business is growing with easy-to-understand reports on your clients, signings, earnings, and trends.",
                ],
              ].map(([title, body]) => (
                <div key={title} className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-lg font-black text-slate-950">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </PageShell>
  );
}