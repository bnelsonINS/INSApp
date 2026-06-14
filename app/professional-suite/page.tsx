import Link from "next/link";
import {
  CTASection,
  FeatureCard,
  PageShell,
  SectionIntro,
} from "../components/marketing-site";

export default function ProfessionalSuitePage() {
  return (
    <PageShell>
      <section className="bg-[#0B1F4D] px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">
            INS Professional Suite
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
            Manage your notary jobs like a pro.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-blue-100 sm:text-xl">
            INS Professional is an optional $10/month add-on that helps notaries
            manage appointments, accounting, invoicing, mileage, expenses,
            payments, taxes, notarial acts, and electronic journal records from
            one organized workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#0B1F4D] hover:bg-blue-50"
            >
              Start Free
            </Link>

            <Link
              href="/pricing"
              className="rounded-full border border-white/30 px-6 py-3 text-center text-sm font-black text-white hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>

          <div className="mt-8 inline-flex rounded-full bg-emerald-100 px-5 py-3 text-sm font-black text-emerald-800">
            INS Platform is free • INS Professional is optional at $10/month
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Built for working notaries"
          title="A business system built specifically for notary work."
          body="Every growing notary business eventually needs more than sticky notes, spreadsheets, and saved emails. INS Professional helps you track every step of every job so nothing gets missed."
        />

        <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="📅"
            title="Appointments"
            body="Track upcoming appointments, confirmations, signing details, locations, fees, client notes, and follow-up tasks."
          />

          <FeatureCard
            icon="📄"
            title="Document Status"
            body="Keep track of whether documents have been received, reviewed, uploaded, or completed for each signing."
          />

          <FeatureCard
            icon="📤"
            title="Scanbacks"
            body="Track when scanbacks are required, uploaded, and completed so every job stays organized."
          />

          <FeatureCard
            icon="💵"
            title="Accounting"
            body="Organize income, expenses, payments, invoices, receipts, and business records in one notary-focused system."
          />

          <FeatureCard
            icon="🧾"
            title="Invoicing"
            body="Create, track, and manage invoices for clients, direct work, and appointments that require separate billing."
          />

          <FeatureCard
            icon="💳"
            title="Payment Tracking"
            body="Know which jobs are paid, unpaid, pending, overdue, or still waiting on client payment."
          />
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Advanced automation"
          title="Save time on the repetitive work."
          body="INS Professional is designed to reduce manual entry, organize your jobs faster, and help you spend more time completing signings instead of managing paperwork."
        />

        <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="⚡"
            title="Automatic INS Sync"
            body="Assignments completed through INS can automatically feed into your business records, revenue tracking, mileage estimates, and reports."
          />

          <FeatureCard
            icon="📥"
            title="Outside Order Imports"
            body="Forward confirmations from signing services, title companies, and other platforms so INS can help organize the job details."
          />

          <FeatureCard
            icon="✍️"
            title="Manual Entry"
            body="Add loan signings, general notary work, apostilles, field inspections, direct clients, and local appointments manually."
          />

          <FeatureCard
            icon="🔔"
            title="Appointment Reminders"
            body="Send reminders to customers so appointments stay on track and fewer details fall through the cracks."
          />

          <FeatureCard
            icon="💬"
            title="Message Templates"
            body="Create reusable email and text templates so you are not typing the same messages over and over again."
          />

          <FeatureCard
            icon="🗂️"
            title="Job Checklist"
            body="Track each step of the job, including confirmation, documents, appointment status, scanbacks, invoicing, and payment."
          />
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-[#0B1F4D] p-8 text-white shadow-sm lg:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">
                Works for more than loan signings
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                Track every type of notary job.
              </h2>

              <p className="mt-5 text-lg leading-8 text-blue-100">
                INS Professional is built for the real world. Your business may
                include loan signings, field inspections, apostilles, general
                notary work, estate documents, direct client appointments, and
                other services. Every job can live in one system.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                "Loan signings",
                "Field inspections",
                "Apostilles",
                "General notary work",
                "Estate packages",
                "Direct client appointments",
                "Title company work",
                "Signing service orders",
              ].map((item) => (
                <p
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4 font-bold"
                >
                  ✓ {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Taxes and deductions"
          title="Be ready before tax season shows up."
          body="INS Professional helps organize the records notaries commonly need for taxes, deductions, and year-end reporting. It does not replace your accountant, but it helps you show up prepared."
        />

        <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="🚗"
            title="Tracking Mileage"
            body="Track business miles connected to appointments and keep cleaner mileage records throughout the year."
          />

          <FeatureCard
            icon="🧾"
            title="Tracking Expenses"
            body="Record business expenses like printing, paper, toner, shipping, supplies, software, marketing, and more."
          />

          <FeatureCard
            icon="📚"
            title="Tracking Notarial Acts"
            body="Maintain records of notarial acts performed so your business activity is easier to review and organize."
          />

          <FeatureCard
            icon="🧮"
            title="Tax Reports"
            body="Prepare organized summaries for income, mileage, expenses, deductions, and business activity."
          />

          <FeatureCard
            icon="📊"
            title="Business Insights"
            body="See which clients, counties, services, and job types are helping your business grow."
          />

          <FeatureCard
            icon="📁"
            title="Year-End Records"
            body="Keep the information you need in one place instead of rebuilding your year from memory, emails, and receipts."
          />
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-50 p-8 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Ditch the shoebox
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Keep receipts and expenses where you can actually find them.
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Upload receipts from your computer, tablet, or phone and connect
                them to the expense they support. Months later, you can find the
                expense and view the receipt without digging through drawers,
                folders, or your glove compartment.
              </p>
            </div>

            <div className="rounded-[2rem] bg-white p-7 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
                Receipt tools
              </p>

              <div className="mt-6 grid gap-3">
                {[
                  "Upload receipts",
                  "Attach receipts to expenses",
                  "Organize expense categories",
                  "Search past purchases",
                  "Prepare cleaner tax records",
                  "Keep business proof in one place",
                ].map((item) => (
                  <p
                    key={item}
                    className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-700"
                  >
                    ✓ {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Electronic journal"
          title="Keep a secure record of your notarial work."
          body="INS Professional includes electronic journal tools designed to help you maintain organized records of notarizations, appointments, signer details, notarial acts, and related notes."
        />

        <div className="mx-auto mt-12 grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="📘"
            title="Electronic Journal"
            body="Maintain a searchable record of notarizations and related appointment details."
          />

          <FeatureCard
            icon="👤"
            title="Signer Information"
            body="Keep signer details connected to the appointment and notarial work performed."
          />

          <FeatureCard
            icon="🖊️"
            title="Notarial Acts"
            body="Track acknowledgments, jurats, oaths, affirmations, and other notarial acts."
          />

          <FeatureCard
            icon="🗓️"
            title="Calendar"
            body="View appointments, upcoming work, completed jobs, and follow-up tasks from one workspace."
          />

          <FeatureCard
            icon="🔎"
            title="Searchable History"
            body="Find past jobs, payments, notes, clients, receipts, and journal records when you need them."
          />

          <FeatureCard
            icon="🔒"
            title="Secure Records"
            body="Keep sensitive business and notarial information organized in a secure system."
          />
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-50 p-8 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Simple pricing
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Start free. Upgrade only if you want the business suite.
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                The INS platform is free for notaries. INS Professional is an
                optional $10/month add-on for notaries who want serious business
                tools without complicated pricing tiers.
              </p>
            </div>

            <div className="grid gap-5">
              <div className="rounded-[2rem] bg-white p-7 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-600">
                  Free
                </p>

                <h3 className="mt-3 text-2xl font-black text-slate-950">
                  INS Platform
                </h3>

                <p className="mt-2 text-4xl font-black text-slate-950">
                  $0/month
                </p>

                <div className="mt-6 grid gap-3">
                  {[
                    "Signing opportunities",
                    "Assignment details",
                    "Document access",
                    "Status updates",
                    "Credential storage",
                    "Work history",
                  ].map((item) => (
                    <p
                      key={item}
                      className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-700"
                    >
                      ✓ {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] bg-[#0B1F4D] p-7 text-white shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
                  Optional add-on
                </p>

                <h3 className="mt-3 text-2xl font-black">
                  INS Professional
                </h3>

                <p className="mt-2 text-4xl font-black">$10/month</p>

                <div className="mt-6 grid gap-3">
                  {[
                    "Accounting",
                    "Invoicing",
                    "Calendaring",
                    "Appointments",
                    "Tracking mileage",
                    "Tracking expenses",
                    "Tracking payments",
                    "Tracking notarial acts",
                    "Electronic journal",
                    "Tax-ready reports",
                    "Outside order imports",
                    "Manual order entry",
                    "Receipt storage",
                    "Email and text templates",
                  ].map((item) => (
                    <p
                      key={item}
                      className="rounded-2xl bg-white/10 p-4 font-bold"
                    >
                      ✓ {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </PageShell>
  );
}