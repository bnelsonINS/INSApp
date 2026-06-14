import { CTASection, PageShell } from "../components/marketing-site";

export default function AboutPage() {
  return (
    <PageShell>
      <section className="bg-[#0B1F4D] px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">About INS</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Built for the real work behind every signing.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-blue-100 sm:text-xl">
            Indiana Notary Solutions was created to bring structure, visibility, and accountability to signing operations while giving notaries better tools to manage their business.
          </p>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">Our view</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">The signing process deserves better infrastructure.</h2>
          </div>
          <div className="space-y-6 text-lg leading-8 text-slate-600">
            <p>
              Signing operations involve many moving pieces: title companies, notaries, borrowers, documents, deadlines, scanbacks, QA review, payments, and exceptions. Too often, these steps are managed across disconnected inboxes, spreadsheets, and manual reminders.
            </p>
            <p>
              INS is being built as a connected platform that supports the full lifecycle of the signing process. The goal is simple: give organizations and notaries the tools they need to move work forward with fewer gaps and more confidence.
            </p>
            <p>
              The platform combines operational workflows with notary performance scoring and a planned Professional Suite for notaries who want to manage revenue, mileage, taxes, and imported orders from one place.
            </p>
          </div>
        </div>
      </section>

      <CTASection />
    </PageShell>
  );
}
