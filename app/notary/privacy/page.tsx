export default function NotaryPrivacyPage() {
  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-medium text-blue-100">
            Indiana Notary Solutions
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Privacy Policy
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/90">
            This policy explains what information we collect, how we use it,
            and how we protect it.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 w-fit">
          Last Updated: June 1, 2026
        </p>

        <div className="mt-6 space-y-8 text-sm leading-7 text-slate-700">
          {[
            [
              "1. Information We Collect",
              "We may collect profile information, contact information, notary commission details, credential records, uploaded documents, assignment details, coverage areas, payment setup information, and platform activity.",
            ],
            [
              "2. Credential and Document Information",
              "Users may upload credentials, certificates, background check records, insurance information, tax documents, and assignment documents. These records may be reviewed for compliance, assignment eligibility, and operational purposes.",
            ],
            [
              "3. Payment Information",
              "We may collect bank-related information needed to process ACH payments. Sensitive account details should be stored securely and masked wherever possible after saving.",
            ],
            [
              "4. How We Use Information",
              "We use information to manage user accounts, verify notary credentials, assign work, communicate about signings, process payments, maintain records, improve the platform, and comply with legal or business obligations.",
            ],
            [
              "5. Sharing Information",
              "Information may be shared with title companies, clients, administrators, service providers, payment processors, or other parties involved in a transaction when necessary to complete assignments or operate the platform.",
            ],
            [
              "6. Communications",
              "We may contact users by email, phone, SMS, or platform messages about assignments, credentials, account updates, payments, and service-related notices.",
            ],
            [
              "7. Data Security",
              "We use reasonable safeguards to protect information. No system is perfect, so users should also protect their login credentials and avoid sharing sensitive information outside approved workflows.",
            ],
            [
              "8. Data Retention",
              "We may retain information as needed for business operations, assignment records, payment records, compliance, dispute resolution, security, and legal obligations.",
            ],
            [
              "9. User Choices",
              "Users may update profile, contact, coverage, credential, and payment information through the platform where available. Some records may need to be retained for compliance or business purposes.",
            ],
            [
              "10. Policy Updates",
              "We may update this Privacy Policy from time to time. Continued use of the platform after updates means you acknowledge the updated policy.",
            ],
          ].map(([title, body]) => (
            <section
              key={title}
              className="border-b border-slate-100 pb-6 last:border-b-0 last:pb-0"
            >
              <h2 className="text-lg font-bold text-slate-950">
                {title}
              </h2>

              <p className="mt-2">{body}</p>
            </section>
          ))}

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
            <p className="font-bold">Your Privacy Matters</p>

            <p className="mt-2 leading-6">
              Indiana Notary Solutions is committed to protecting sensitive
              borrower, client, and notary information. Access to information
              is limited to authorized users and service providers with a
              legitimate business need.
            </p>

            <p className="mt-2 leading-6">
              While we implement safeguards designed to protect your data, users
              also play an important role by maintaining strong passwords,
              protecting their devices, and reporting suspected unauthorized
              access promptly.
            </p>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-bold">Important</p>

            <p className="mt-2 leading-6">
              This Privacy Policy is a working draft and should be reviewed by
              legal counsel before being used as your final published privacy
              policy.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}