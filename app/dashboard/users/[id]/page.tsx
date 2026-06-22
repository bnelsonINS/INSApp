import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";
import {
  deleteUser,
  disableUser,
  reactivateUser,
  sendPasswordReset,
  setTemporaryPassword,
  updateUserProfile,
} from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderRecord = {
  id: string;
  borrower_name?: string | null;
  control_number?: string | null;
  status?: string | null;
  client_fee?: number | string | null;
  fee?: number | string | null;
  notary_fee?: number | string | null;
};

type CredentialDocumentRecord = {
  id: string;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  uploaded_at: string | null;
};

type CredentialRecord = {
  id: string;
  user_id?: string | null;
  credential_type?: string | null;
  type?: string | null;
  name?: string | null;
  provider?: string | null;
  credential_number?: string | null;
  amount?: number | string | null;
  status?: string | null;
  issue_date?: string | null;
  expires_at?: string | null;
  expiration_date?: string | null;
  commission_expiration_date?: string | null;
  admin_notes?: string | null;
  created_at?: string | null;
  credential_documents?: CredentialDocumentRecord[];
  documentUrl?: string | null;
  documentName?: string | null;
};

type CoverageCountyRecord = {
  id: string;
  county_name?: string | null;
  county?: string | null;
  name?: string | null;
};

type CoverageZipRecord = {
  id: string;
  zip_code?: string | null;
  zip?: string | null;
  postal_code?: string | null;
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

async function getRowsByPossibleKeys<T>(
  table: string,
  userId: string,
  keys: string[]
): Promise<T[]> {
  for (const key of keys) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq(key, userId);

    if (!error) return (data ?? []) as T[];
  }

  return [];
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

function getCredentialType(credential: CredentialRecord) {
  return (
    credential.credential_type ||
    credential.type ||
    credential.name ||
    "Credential"
  );
}

function getCredentialExpiration(credential: CredentialRecord) {
  return (
    credential.expiration_date ||
    credential.expires_at ||
    credential.commission_expiration_date ||
    null
  );
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

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = name || email || "User";

  return source
    .split(/[ @._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!user) redirect("/dashboard/users");

  const { data: notaryProfile } = await supabaseAdmin
    .from("notary_profiles")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();

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
    .order("created_at", { ascending: false })
    .limit(10);

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

  const assignedOrders = await getRowsByPossibleKeys<OrderRecord>(
  "assignments",
  id,
  ["assigned_notary_id", "notary_id", "user_id"]
);

  const coverageCounties = await getRowsByPossibleKeys<CoverageCountyRecord>(
    "notary_coverage_counties",
    id,
    ["user_id", "notary_id"]
  );

  const coverageZips = await getRowsByPossibleKeys<CoverageZipRecord>(
    "notary_coverage_zips",
    id,
    ["user_id", "notary_id"]
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
  <Link
    href="/dashboard/users"
    className="text-sm font-bold text-blue-100 transition hover:text-white"
  >
    ← Back to Users
  </Link>

  <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <h1 className="text-4xl font-bold text-white">
        {displayValue(user.full_name)}
      </h1>

      <p className="mt-2 text-blue-100/90">
        {displayValue(user.email)}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
            user.is_active
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {user.is_active ? "Active" : "Inactive"}
        </span>

        <span className="rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
          {displayValue(user.role)}
        </span>

        {user.approval_status && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
            {getStatusLabel(user.approval_status)}
          </span>
        )}
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
          Joined
        </p>
        <p className="mt-1 font-semibold text-white">
          {formatDate(user.created_at)}
        </p>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
          Updated
        </p>
        <p className="mt-1 font-semibold text-white">
          {formatDate(user.updated_at)}
        </p>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
          Credentials
        </p>
        <p className="mt-1 font-semibold text-white">
          {credentialsWithLinks.length}
        </p>
      </div>
    </div>
  </div>
</section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-slate-900">Admin Actions</h2>
            <p className="text-sm text-slate-500">
              Manage this user’s account, role, password, and access.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
            <form
              action={updateUserProfile}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <input type="hidden" name="id" value={id} />

              <h3 className="text-sm font-bold text-slate-900">
                Profile Details
              </h3>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Full Name
                  </span>
                  <input
                    name="full_name"
                    defaultValue={user.full_name ?? ""}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Role
                  </span>
                  <select
                    name="role"
                    defaultValue={user.role ?? "notary"}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="admin">Admin</option>
                    <option value="notary">Notary</option>
                    <option value="client">Client</option>
                  </select>
                </label>

                <label className="block">
  <span className="text-sm font-semibold text-slate-700">
    Approval Status
  </span>

  <select
    name="approval_status"
    defaultValue={user.approval_status ?? "ready_for_review"}
    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
  >
    <option value="ready_for_review">Ready For Review</option>
    <option value="approved">Approved</option>
    <option value="rejected">Rejected</option>
  </select>
</label>

                <button className="w-full rounded-xl bg-[#0B1F4D] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950">
                  Save Profile
                </button>
              </div>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">
                Access Tools
              </h3>

              <div className="mt-4 space-y-3">
                <form action={sendPasswordReset}>
                  <input type="hidden" name="email" value={user.email ?? ""} />
                  <button className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50">
                    Send Password Reset
                  </button>
                </form>

                <form action={setTemporaryPassword}>
                  <input type="hidden" name="id" value={id} />
                  <button className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50">
                    Set Temporary Password
                  </button>
                </form>

                {user.is_active ? (
                  <form action={disableUser}>
                    <input type="hidden" name="id" value={id} />
                    <button className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-amber-700">
                      Disable User
                    </button>
                  </form>
                ) : (
                  <form action={reactivateUser}>
                    <input type="hidden" name="id" value={id} />
                    <button className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700">
                      Reactivate User
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <h3 className="text-sm font-black text-red-900">Danger Zone</h3>

              <p className="mt-2 text-sm text-red-700">
                Deleting a user is permanent enough to ruin your day. Disable
                first unless you are sure.
              </p>

              <form action={deleteUser} className="mt-4">
                <input type="hidden" name="id" value={id} />
                <button className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700">
                  Delete User
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-900">Notary Profile</h2>

          {notaryProfile ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Name
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {displayValue(notaryProfile.first_name)}{" "}
                  {displayValue(notaryProfile.last_name)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Business
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {displayValue(notaryProfile.business_name)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Phone
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {displayValue(notaryProfile.mobile_phone)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Address
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {displayValue(notaryProfile.address)}
                  {notaryProfile.address_line_2
                    ? `, ${notaryProfile.address_line_2}`
                    : ""}
                  <br />
                  {displayValue(notaryProfile.city)},{" "}
                  {displayValue(notaryProfile.state)}{" "}
                  {displayValue(notaryProfile.zip)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Commission
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  #{displayValue(notaryProfile.commission_number)}
                  <br />
                  Expires: {formatDate(notaryProfile.commission_expiration)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Coverage Radius
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {notaryProfile.coverage_radius
                    ? `${notaryProfile.coverage_radius} miles`
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No notary profile has been created yet.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-900">Coverage Area</h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-900">Counties</p>

              {coverageCounties.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {coverageCounties.map((county) => (
                    <span
                      key={county.id}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200"
                    >
                      {county.county_name || county.county || county.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No counties selected.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-900">ZIP Codes</p>

              {coverageZips.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {coverageZips.map((zip) => (
                    <span
                      key={zip.id}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"
                    >
                      {zip.zip_code || zip.zip || zip.postal_code}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No ZIP codes selected.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Credentials
              </h2>
              <p className="text-sm text-slate-500">
                Showing the latest 10 credentials.
              </p>
            </div>

            <Link
              href={`/dashboard/users/${id}/credentials`}
              className="text-sm font-bold text-[#0B1F4D] hover:text-blue-950"
            >
              View All Credentials →
            </Link>
          </div>

          <div className="mt-5 grid gap-4">
            {credentialsWithLinks.length > 0 ? (
              credentialsWithLinks.map((credential) => {
                const credentialType = getCredentialType(credential);
                const expirationDate = getCredentialExpiration(credential);
                const status = credential.status || "pending_review";
                const isReviewed =
                  status === "approved" || status === "rejected";

                return (
                  <div
                    key={credential.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-sm"
                  >
                    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            {credentialType}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getCredentialBadge(
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
                        </div>

                        {credential.admin_notes && (
                          <div className="mt-4 rounded-xl bg-red-100 p-3 text-sm text-red-700">
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
                          <p>Expires: {formatDate(expirationDate)}</p>
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
                              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
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
                              className={`text-sm font-black ${
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
                                : "This credential has been rejected. The notary must upload or replace the credential before it can be reviewed again."}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-sm font-bold text-slate-900">
                              Review Credential
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Approve the credential or reject it with a note.
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
                                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
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
                                  className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />

                                <button
                                  type="submit"
                                  className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
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
              <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No credentials uploaded.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-900">Assigned Orders</h2>

          {assignedOrders.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Borrower</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Client Fee</th>
                    <th className="px-4 py-3">Notary Fee</th>
                    <th className="px-4 py-3">View</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {assignedOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {order.control_number || order.id}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {displayValue(order.borrower_name)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {displayValue(order.status)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatMoney(order.client_fee || order.fee)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatMoney(order.notary_fee)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="font-bold text-[#0B1F4D] hover:text-blue-950"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No assigned orders found.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}