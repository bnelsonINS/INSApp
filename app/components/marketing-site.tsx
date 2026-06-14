import Link from "next/link";

export const INS_NAVY = "#0B1F4D";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1F4D] text-sm font-black text-white shadow-sm">
            INS
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-slate-950 sm:text-base">
              Indiana Notary Solutions
            </p>
            <p className="hidden text-xs font-semibold text-slate-500 sm:block">
              Signing operations platform
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-bold text-slate-700 lg:flex">
          <Link href="/for-title-companies" className="hover:text-[#0B1F4D]">
            Title Companies
          </Link>
          <Link href="/for-notaries" className="hover:text-[#0B1F4D]">
            Notaries
          </Link>
          <Link href="/professional-suite" className="hover:text-[#0B1F4D]">
            Professional Suite
          </Link>
          <Link href="/pricing" className="hover:text-[#0B1F4D]">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-[#0B1F4D]">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:inline-flex"
          >
            Login
          </Link>
          <Link
            href="/request-demo"
            className="rounded-full bg-[#0B1F4D] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-[#12306f]"
          >
            Request Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1F4D] text-sm font-black text-white">
              INS
            </div>
            <div>
              <p className="font-black text-slate-950">Indiana Notary Solutions</p>
              <p className="text-sm text-slate-500">Modern signing operations.</p>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-600">
            INS connects signing operations, notary assignment, quality control,
            document workflows, and notary business tools into one secure platform.
          </p>
        </div>

        <FooterColumn
          title="Solutions"
          links={[
            ["Title Companies", "/for-title-companies"],
            ["Notaries", "/for-notaries"],
            ["Professional Suite", "/professional-suite"],
          ]}
        />
        <FooterColumn
          title="Company"
          links={[
            ["About", "/about"],
            ["Pricing", "/pricing"],
            ["Contact", "/contact"],
          ]}
        />
        <FooterColumn
          title="Access"
          links={[
            ["Login", "/login"],
            ["Notary Sign Up", "/signup"],
            ["Request Demo", "/request-demo"],
          ]}
        />
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs font-semibold text-slate-500">
        © {new Date().getFullYear()} Indiana Notary Solutions. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="font-black text-slate-950">{title}</p>
      <div className="mt-4 space-y-3">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="block text-sm font-semibold text-slate-600 hover:text-[#0B1F4D]">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </main>
  );
}

export function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">{body}</p>
    </div>
  );
}

export function FeatureCard({ title, body, icon }: { title: string; body: string; icon: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">{icon}</div>
      <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

export function CTASection() {
  return (
    <section className="bg-[#0B1F4D] px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Get started</p>
        <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
          Ready to modernize your signing operations?
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
          Start with a focused demo and see how INS can support your title workflow,
          notary network, QA process, and future business growth.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/request-demo" className="rounded-full bg-white px-6 py-3 text-sm font-black text-[#0B1F4D] shadow-sm hover:bg-blue-50">
            Request a Demo
          </Link>
          <Link href="/signup" className="rounded-full border border-white/30 px-6 py-3 text-sm font-black text-white hover:bg-white/10">
            Become a Notary
          </Link>
        </div>
      </div>
    </section>
  );
}

export function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xl rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur">
      <div className="rounded-[1.5rem] bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Admin Dashboard</p>
            <p className="mt-1 text-xl font-black text-slate-950">Attention Center</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Live</span>
        </div>
        <div className="mt-5 grid gap-3">
          {[
            ["New order received", "Ready for assignment", "bg-blue-50 text-blue-700"],
            ["Scanbacks overdue", "Needs admin attention", "bg-orange-50 text-orange-700"],
            ["Elite notary available", "Score 98%", "bg-emerald-50 text-emerald-700"],
          ].map(([title, status, cls]) => (
            <div key={title} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="font-black text-slate-950">{title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Control # INS-1042</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${cls}`}>{status}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[["Orders", "128"], ["Avg Score", "94%"], ["QA", "12"]].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-[#0B1F4D] p-4 text-white">
              <p className="text-xs font-bold text-blue-100">{label}</p>
              <p className="mt-1 text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WorkflowStrip() {
  const steps = ["Order", "Assign", "Offer", "Signing", "Scanbacks", "QA", "Complete"];
  return (
    <div className="mx-auto mt-12 grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {steps.map((step, index) => (
        <div key={step} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#0B1F4D] text-sm font-black text-white">{index + 1}</div>
          <p className="mt-3 text-sm font-black text-slate-900">{step}</p>
        </div>
      ))}
    </div>
  );
}
