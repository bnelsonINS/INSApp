import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../../../../src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CredentialDocumentRecord = {
  id: string;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  uploaded_at: string | null;
};

type CredentialRecord = {
  id: string;
  credential_type?: string | null;
  provider?: string | null;
  credential_number?: string | null;
  amount?: number | string | null;
  status?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  admin_notes?: string | null;
  created_at?: string | null;
  credential_documents?: CredentialDocumentRecord[];
  documentUrl?: string | null;
  documentName?: string | null;
};

async function approveCredential(formData: FormData) {
  "use server";

  const credentialId = String(formData.get("credential_id") || "");
  const userId = String(formData.get("user_id") || "");

  if (!credentialId || !userId) return;

  const { error } = await supabaseAdmin
    .from("notary_credentials")
    .update({
      status: "approved",
      admin_notes: null,
    })
    .eq("id", credentialId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath(`/dashboard/users/${userId}/credentials`);
  revalidatePath("/dashboard");
}

async function rejectCredential(formData: FormData) {
  "use server";

  const credentialId = String(formData.get("credential_id") || "");
  const userId = String(formData.get("user_id") || "");
  const adminNotes = String(formData.get("admin_notes") || "").trim();

  if (!credentialId || !userId) return;

  const rejectionReason = adminNotes || "Rejected by admin.";

  const { error } = await supabaseAdmin
    .from("notary_credentials")
    .update({
      status: "rejected",
      admin_notes: rejectionReason,
    })
    .eq("id", credentialId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath(`/dashboard/users/${userId}/credentials`);
  revalidatePath("/dashboard");
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "$0.00";

  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function displayValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "—";
}

function getCredentialBadge(status: string | null | undefined) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function getStatusLabel(status: string | null | undefined) {
  if (!status) return "Pending Review";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function UserCredentialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", id)
    .single();

  if (!user) redirect("/dashboard/users");

  const { data: credentialsRaw } = await supabaseAdmin
    .from("notary_credentials")
    .select(
      `
      *,
      credential_documents (
        id,
        file_name,
        file_url,
        file_type,
        uploaded_at
      )
    `
    )
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const credentialsWithLinks = await Promise.all(
    ((credentialsRaw ?? []) as CredentialRecord[]).map(async (credential) => {
      const document = credential.credential_documents?.[0];

      if (!document?.file_url) {
        return {
          ...credential,
          documentUrl: null,
          documentName: null,
        };
      }

      const { data } = await supabaseAdmin.storage
        .from("notary-documents")
        .createSignedUrl(document.file_url, 60 * 10);

      return {
        ...credential,
        documentUrl: data?.signedUrl || null,
        documentName: document.file_name,
      };
    })
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link
            href={`/dashboard/users/${id}`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to User
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
            Credential History
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            {user.full_name || user.email}
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                All Credentials
              </h2>
              <p className="text-sm text-slate-600">
                Full credential upload and review history.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {credentialsWithLinks.length} total
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            {credentialsWithLinks.length > 0 ? (
              credentialsWithLinks.map((credential) => {
                const status = credential.status || "pending_review";
                const isReviewed =
                  status === "approved" || status === "rejected";

                return (
                  <div
                    key={credential.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            {credential.credential_type || "Credential"}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCredentialBadge(
                              status
                            )}`}
                          >
                            {getStatusLabel(status)}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-slate-700">
                          <p>Provider: {displayValue(credential.provider)}</p>
                          <p>
                            Number / Policy / License:{" "}
                            {displayValue(credential.credential_number)}
                          </p>
                          <p>Amount: {formatMoney(credential.amount)}</p>
                          <p>Uploaded: {formatDate(credential.created_at)}</p>
                        </div>

                        {credential.admin_notes && (
                          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                            <strong>Admin Note:</strong>{" "}
                            {credential.admin_notes}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Dates
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-slate-700">
                          <p>Issued: {formatDate(credential.issue_date)}</p>
                          <p>
                            Expires: {formatDate(credential.expiration_date)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Document
                        </p>

                        {credential.documentUrl ? (
                          <div className="mt-2">
                            <a
                              href={credential.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex rounded-xl border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-900 hover:text-white"
                            >
                              View Document
                            </a>

                            <p className="mt-2 break-all text-xs text-slate-500">
                              {credential.documentName}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">
                            No document uploaded.
                          </p>
                        )}
                      </div>

                      <div>
                        {isReviewed ? (
                          <div
                            className={`rounded-xl border p-4 ${
                              status === "approved"
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-red-200 bg-red-50"
                            }`}
                          >
                            <p
                              className={`text-sm font-bold ${
                                status === "approved"
                                  ? "text-emerald-800"
                                  : "text-red-800"
                              }`}
                            >
                              {status === "approved"
                                ? "Credential Approved"
                                : "Credential Rejected"}
                            </p>

                            <p
                              className={`mt-2 text-sm ${
                                status === "approved"
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {status === "approved"
                                ? "This credential has already been approved."
                                : "This credential has been rejected."}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                            <p className="text-sm font-bold text-slate-900">
                              Review Credential
                            </p>

                            <div className="mt-4 space-y-3">
                              <form action={approveCredential}>
                                <input
                                  type="hidden"
                                  name="credential_id"
                                  value={credential.id}
                                />
                                <input type="hidden" name="user_id" value={id} />

                                <button
                                  type="submit"
                                  className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-700"
                                >
                                  Approve
                                </button>
                              </form>

                              <form
                                action={rejectCredential}
                                className="space-y-2"
                              >
                                <input
                                  type="hidden"
                                  name="credential_id"
                                  value={credential.id}
                                />
                                <input type="hidden" name="user_id" value={id} />

                                <textarea
                                  name="admin_notes"
                                  placeholder="Reason for rejection"
                                  required
                                  className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                />

                                <button
                                  type="submit"
                                  className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No credentials uploaded.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}