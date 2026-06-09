export default function NotaryTermsPage() {
  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-medium text-blue-100">
            Indiana Notary Solutions
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Terms of Use
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/90">
            These terms explain the rules for using the Indiana Notary
            Solutions platform.
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
              "1. Acceptance of Terms",
              "By accessing or using Indiana Notary Solutions, you agree to these Terms of Use. If you do not agree, you should not use the platform.",
            ],
            [
              "2. Platform Purpose",
              "Indiana Notary Solutions provides tools for managing notary profiles, credentials, coverage areas, assignments, documents, communications, and payment-related information.",
            ],
            [
              "3. Notary Responsibilities",
              "Notaries are responsible for keeping their profile, credentials, commission details, coverage areas, availability, and payment information accurate and current.",
            ],
            [
              "4. Credential Review",
              "Credential uploads may be reviewed by Indiana Notary Solutions. Approval of credentials does not guarantee assignment volume, future work, or continued platform access.",
            ],
            [
              "5. Assignments",
              "Assignments may include borrower information, signing details, documents, instructions, fees, and status updates. Notaries must review assignment instructions carefully before accepting or completing work.",
            ],
            [
              "6. Documents and Confidentiality",
              "Documents and transaction information may contain sensitive personal, financial, or legal information. Users must protect this information and may only use it for the assigned transaction.",
            ],
            [
              "7. Payments",
              "Notary fees are displayed on assignments when available. Payment timing may depend on assignment completion, document acceptance, title company approval, and internal processing.",
            ],
            [
              "8. Account Access",
              "Users are responsible for maintaining account security. Indiana Notary Solutions may suspend or disable accounts for inaccurate information, expired credentials, misuse, noncompliance, or security concerns.",
            ],
            [
              "9. No Guarantee of Work",
              "Access to the platform does not guarantee assignments, income, payment volume, or business opportunities.",
            ],
            [
              "10. Limitation of Liability",
              "To the fullest extent allowed by law, Indiana Notary Solutions is not liable for indirect, incidental, special, consequential, or punitive damages arising from platform use.",
            ],
            [
              "11. Changes to These Terms",
              "Indiana Notary Solutions may update these terms from time to time. Continued use of the platform after updates means you accept the revised terms.",
            ],
          ].map(([title, body]) => (
            <section key={title} className="border-b border-slate-100 pb-6 last:border-b-0 last:pb-0">
              <h2 className="text-lg font-bold text-slate-950">{title}</h2>
              <p className="mt-2">{body}</p>

              {title === "3. Notary Responsibilities" && (
                <p className="mt-2">
                  Notaries are also responsible for complying with applicable
                  Indiana notary laws, title company requirements, signing
                  instructions, privacy obligations, and professional standards.
                </p>
              )}

              {title === "5. Assignments" && (
                <p className="mt-2">
                  Indiana Notary Solutions may reassign, cancel, delay, or close
                  assignments when necessary.
                </p>
              )}
            </section>
          ))}

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-bold">Important</p>
            <p className="mt-1 leading-6">
              This page is a working draft and should be reviewed by an attorney
              before being used as final legal terms.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}