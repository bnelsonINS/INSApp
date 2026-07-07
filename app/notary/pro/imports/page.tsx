import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ImportDraft = {
  id: string;
  import_email_id: string | null;
  notary_id: string;
  status: string | null;
  source_company: string | null;
  source_email: string | null;
  borrower_name: string | null;
  client_company: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  order_number: string | null;
  control_number: string | null;
  loan_number: string | null;
  signing_type: string | null;
  fee: number | string | null;
  special_instructions: string | null;
  parser_type: string | null;
  confidence: number | string | null;
  created_at: string | null;
  pro_import_emails?: {
    subject: string | null;
    raw_body: string | null;
    html_body: string | null;
    source_email: string | null;
    source_name: string | null;
    received_at: string | null;
  } | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const [hours, minutes] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hours || 0), Number(minutes || 0), 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0.00";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function inputDate(value: string | null | undefined) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function inputTime(value: string | null | undefined) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function statusBadge(status: string | null | undefined) {
  const normalized = String(status ?? "pending_review").toLowerCase();

  if (normalized === "approved") return "bg-green-50 text-green-700 ring-green-200";
  if (normalized === "rejected") return "bg-red-50 text-red-700 ring-red-200";
  if (normalized === "failed_parse") return "bg-amber-50 text-amber-700 ring-amber-200";

  return "bg-blue-50 text-blue-700 ring-blue-200";
}

function displayStatus(status: string | null | undefined) {
  return String(status ?? "pending_review")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ImportReviewPage() {
  async function saveDraftEdits(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const draftId = String(formData.get("draft_id") ?? "").trim();
    if (!draftId) return;

    const feeValue = Number(formData.get("fee") ?? 0);

    await supabase
      .from("pro_import_drafts")
      .update({
        source_company: String(formData.get("source_company") ?? "").trim() || null,
        source_email: String(formData.get("source_email") ?? "").trim() || null,
        borrower_name: String(formData.get("borrower_name") ?? "").trim() || null,
        client_company: String(formData.get("client_company") ?? "").trim() || null,
        signing_date: String(formData.get("signing_date") ?? "").trim() || null,
        signing_time: String(formData.get("signing_time") ?? "").trim() || null,
        signing_address: String(formData.get("signing_address") ?? "").trim() || null,
        signing_city: String(formData.get("signing_city") ?? "").trim() || null,
        signing_state: String(formData.get("signing_state") ?? "").trim() || "IN",
        signing_zip: String(formData.get("signing_zip") ?? "").trim() || null,
        order_number: String(formData.get("order_number") ?? "").trim() || null,
        control_number: String(formData.get("control_number") ?? "").trim() || null,
        loan_number: String(formData.get("loan_number") ?? "").trim() || null,
        signing_type: String(formData.get("signing_type") ?? "").trim() || null,
        fee: Number.isFinite(feeValue) ? feeValue : null,
        special_instructions: String(formData.get("special_instructions") ?? "").trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .eq("notary_id", user.id);

    revalidatePath("/notary/pro/imports");
    redirect(`/notary/pro/imports?selected=${draftId}`);
  }

  async function rejectDraft(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const draftId = String(formData.get("draft_id") ?? "").trim();
    if (!draftId) return;

    await supabase
      .from("pro_import_drafts")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .eq("notary_id", user.id);

    revalidatePath("/notary/pro/imports");
    redirect("/notary/pro/imports");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: draftsData, error } = await supabase
    .from("pro_import_drafts")
    .select(
      `
      *,
      pro_import_emails (
        subject,
        raw_body,
        html_body,
        source_email,
        source_name,
        received_at
      )
    `,
    )
    .eq("notary_id", user.id)
    .in("status", ["pending_review", "failed_parse"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Import drafts lookup error:", error);
  }

  const drafts = (draftsData ?? []) as ImportDraft[];
  const pendingCount = drafts.filter(
    (draft) => String(draft.status ?? "").toLowerCase() === "pending_review",
  ).length;
  const failedCount = drafts.filter(
    (draft) => String(draft.status ?? "").toLowerCase() === "failed_parse",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
          <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-100">
                INS Pro Imports
              </p>
              <h1 className="mt-1 text-3xl font-black">Imported Jobs Review</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
                Review imported confirmation emails before they become external jobs.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/notary/dashboard"
                className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Dashboard
              </Link>
              <Link
                href="/notary/pro/jobs"
                className="rounded-xl bg-white px-5 py-3 text-sm font-black text-[#0B1F4D] transition hover:bg-slate-100"
              >
                External Jobs
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Pending Review
            </p>
            <p className="mt-2 text-3xl font-black text-[#0B1F4D]">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Failed Parse
            </p>
            <p className="mt-2 text-3xl font-black text-amber-700">{failedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Total Waiting
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">{drafts.length}</p>
          </div>
        </section>

        {drafts.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-black text-slate-950">No imports waiting for review.</p>
            <p className="mt-2 text-sm text-slate-500">
              Once forwarded confirmations start coming in, drafts will show here.
            </p>
          </section>
        ) : (
          <section className="space-y-5">
            {drafts.map((draft) => {
              const email = draft.pro_import_emails;
              const originalBody = email?.raw_body || email?.html_body || "No original email body saved.";

              return (
                <details
                  key={draft.id}
                  open={drafts.length === 1}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <summary className="cursor-pointer list-none border-b border-slate-200 bg-white p-5 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusBadge(draft.status)}`}>
                            {displayStatus(draft.status)}
                          </span>
                          {draft.parser_type && (
                            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                              Parser: {draft.parser_type}
                            </span>
                          )}
                          {draft.confidence !== null && draft.confidence !== undefined && (
                            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                              Confidence: {String(draft.confidence)}
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 truncate text-xl font-black text-slate-950">
                          {draft.borrower_name || email?.subject || "Imported Job Draft"}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {draft.client_company || draft.source_company || "Client not detected"} • {formatDate(draft.signing_date)} {formatTime(draft.signing_time)}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                          {email?.subject || "No email subject"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-right text-sm md:min-w-64">
                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                          <p className="text-xs font-black uppercase text-slate-500">Fee</p>
                          <p className="mt-1 font-black text-slate-950">{money(draft.fee)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                          <p className="text-xs font-black uppercase text-slate-500">Order #</p>
                          <p className="mt-1 truncate font-black text-slate-950">{draft.order_number || draft.control_number || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </summary>

                  <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <form action={saveDraftEdits} className="space-y-5">
                      <input type="hidden" name="draft_id" value={draft.id} />

                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm font-black text-[#0B1F4D]">Review before approval</p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          Fix anything the parser got wrong. Approval will be wired in the next step and will create the external job.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Borrower / Signer" name="borrower_name" defaultValue={draft.borrower_name} required />
                        <Field label="Client Company" name="client_company" defaultValue={draft.client_company} />
                        <Field label="Source Company" name="source_company" defaultValue={draft.source_company} />
                        <Field label="Source Email" name="source_email" defaultValue={draft.source_email || email?.source_email} />
                        <Field label="Signing Date" name="signing_date" type="date" defaultValue={inputDate(draft.signing_date)} />
                        <Field label="Signing Time" name="signing_time" type="time" defaultValue={inputTime(draft.signing_time)} />
                        <Field label="Fee" name="fee" type="number" step="0.01" defaultValue={String(draft.fee ?? "")} />
                        <Field label="Signing Type" name="signing_type" defaultValue={draft.signing_type} />
                      </div>

                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_100px_140px]">
                        <Field label="Signing Address" name="signing_address" defaultValue={draft.signing_address} />
                        <Field label="City" name="signing_city" defaultValue={draft.signing_city} />
                        <Field label="State" name="signing_state" defaultValue={draft.signing_state || "IN"} />
                        <Field label="ZIP" name="signing_zip" defaultValue={draft.signing_zip} />
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <Field label="Order Number" name="order_number" defaultValue={draft.order_number} />
                        <Field label="Control Number" name="control_number" defaultValue={draft.control_number} />
                        <Field label="Loan Number" name="loan_number" defaultValue={draft.loan_number} />
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Special Instructions
                        </label>
                        <textarea
                          name="special_instructions"
                          rows={6}
                          defaultValue={draft.special_instructions ?? ""}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                        <button
                          type="submit"
                          className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                        >
                          Save Edits
                        </button>

                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-xl bg-slate-300 px-5 py-3 text-sm font-black text-white"
                          title="Approval gets wired in the next step."
                        >
                          Approve Import Soon
                        </button>
                      </div>
                    </form>

                    <aside className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Original Email
                        </p>
                        <p className="mt-2 text-sm font-black text-slate-950">
                          {email?.subject || "No subject"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          From: {email?.source_name || "—"} {email?.source_email ? `<${email.source_email}>` : ""}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Received: {email?.received_at ? new Date(email.received_at).toLocaleString() : "—"}
                        </p>
                      </div>

                      <details className="rounded-2xl border border-slate-200 bg-white p-4" open>
                        <summary className="cursor-pointer text-sm font-black text-slate-950">
                          View Email Text
                        </summary>
                        <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                          {originalBody}
                        </pre>
                      </details>

                      <form action={rejectDraft}>
                        <input type="hidden" name="draft_id" value={draft.id} />
                        <button
                          type="submit"
                          className="w-full rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                        >
                          Reject / Remove From Review
                        </button>
                      </form>
                    </aside>
                  </div>
                </details>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}
