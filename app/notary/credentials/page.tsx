import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

const credentialTypes = [
  "Background Check",
  "E&O Insurance",
  "Notary Bond",
  "Notary Commission",
  "NNA Certification",
  "RON Certification",
  "Digital Certificate",
  "Proof Training",
  "Title Producer License",
  "W9",
];

const requiredCredentialTypes = [
  "Background Check",
  "E&O Insurance",
  "Notary Bond",
  "Notary Commission",
  "Title Producer License",
  "W9",
];

function getReviewStatus(status: string | null) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "In Review";
}

function getReviewStatusClass(status: string | null) {
  if (status === "approved") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function isExpired(expirationDate: string | null) {
  if (!expirationDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expires = new Date(expirationDate);
  expires.setHours(0, 0, 0, 0);

  return expires < today;
}

function getCredentialHealth(expirationDate: string | null) {
  if (!expirationDate) return "Missing Expiration";

  if (isExpired(expirationDate)) return "Expired";

  const today = new Date();
  const expires = new Date(expirationDate);

  const days = Math.ceil(
    (expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days <= 30) return "Expiring Soon";

  return "Current";
}

function getCredentialHealthClass(expirationDate: string | null) {
  const health = getCredentialHealth(expirationDate);

  if (health === "Current") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (health === "Expired") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

type Credential = {
  credential_type: string;
  status: string | null;
  expiration_date: string | null;
};

function checkCredentialReadiness(credentials: Credential[]) {
  const results = requiredCredentialTypes.map((type) => {
    const credential = credentials.find(
      (item) => item.credential_type === type && item.status === "approved"
    );

    if (!credential) {
      return {
        type,
        complete: false,
        issue: "Missing or not approved",
      };
    }

    if (type !== "W9" && !credential.expiration_date) {
      return {
        type,
        complete: false,
        issue: "Missing expiration date",
      };
    }

    if (type !== "W9" && isExpired(credential.expiration_date)) {
      return {
        type,
        complete: false,
        issue: "Expired",
      };
    }

    return {
      type,
      complete: true,
      issue: null,
    };
  });

  return {
    complete: results.every((item) => item.complete),
    results,
  };
}

export default async function NotaryCredentialsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: credentials } = await supabase
    .from("notary_credentials")
    .select(`
      *,
      credential_documents (
        id,
        file_name,
        file_url,
        file_type,
        uploaded_at
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const readiness = checkCredentialReadiness(credentials || []);

  const credentialsWithLinks = await Promise.all(
    (credentials || []).map(async (credential) => {
      const document = credential.credential_documents?.[0];

      if (!document?.file_url) {
        return { ...credential, documentUrl: null };
      }

      const { data } = await supabase.storage
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
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-medium text-blue-100">
            Notary Credentials
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Credentials & Compliance
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/90">
            Upload and track your commission, insurance, bond, certifications,
            title producer license, and tax documents.
          </p>
        </div>
      </section>

      <section
        className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm ${
          readiness.complete ? "border-l-green-500" : "border-l-amber-500"
        }`}
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {readiness.complete
                ? "Credentials Complete"
                : "Credentials Need Attention"}
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              {readiness.complete
                ? "All required credentials are approved and current."
                : "Some required credentials are missing, not approved, or expired."}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${
              readiness.complete
                ? "bg-green-50 text-green-700 ring-green-200"
                : "bg-amber-50 text-amber-700 ring-amber-200"
            }`}
          >
            {readiness.complete ? "Ready" : "Action Required"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {readiness.results.map((item) => (
            <div
              key={item.type}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-950">{item.type}</p>

                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                    item.complete
                      ? "bg-green-50 text-green-700 ring-green-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}
                >
                  {item.complete ? "Complete" : "Needs Attention"}
                </span>
              </div>

              {!item.complete && (
                <p className="mt-2 text-sm text-slate-600">{item.issue}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <form
        action="/notary/credentials/upload"
        method="post"
        encType="multipart/form-data"
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-bold text-slate-950">Add Credential</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a new credential document for admin review.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Credential Type
            </span>
            <select
              name="credential_type"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Select credential</option>
              {credentialTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Provider
            </span>
            <input
              name="provider"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Number / Policy / License
            </span>
            <input
              name="credential_number"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Amount
            </span>
            <input
              name="amount"
              type="number"
              step="0.01"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Issue Date
            </span>
            <input
              name="issue_date"
              type="date"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Expiration Date
            </span>
            <input
              name="expiration_date"
              type="date"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Upload Document
          </span>
          <input
            name="document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            required
            className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#0B1F4D] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:bg-slate-100"
          />
        </label>

        <div className="flex justify-end">
          <button className="w-full rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 sm:w-auto">
            Upload Credential
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            Your Credentials
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review uploaded credentials, documents, and approval status.
          </p>
        </div>

        <div className="divide-y divide-slate-200 md:hidden">
          {credentialsWithLinks.map((credential) => (
            <div key={credential.id} className="space-y-4 p-5">
              <div>
                <p className="font-bold text-slate-950">
                  {credential.credential_type}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {credential.provider || "No provider"}
                </p>
              </div>

              <div className="grid gap-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-500">Expiration</p>
                  <p className="text-slate-900">
                    {credential.expiration_date || "-"}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-500">
                    Review Status
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getReviewStatusClass(
                      credential.status
                    )}`}
                  >
                    {getReviewStatus(credential.status)}
                  </span>
                </div>

                <div>
                  <p className="font-semibold text-slate-500">
                    Credential Status
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getCredentialHealthClass(
                      credential.expiration_date
                    )}`}
                  >
                    {getCredentialHealth(credential.expiration_date)}
                  </span>
                </div>
              </div>

              <div className="text-sm">
                <p className="font-semibold text-slate-500">Document</p>
                {credential.documentUrl ? (
                  <a
                    href={credential.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex break-all font-bold text-[#0B1F4D] hover:underline"
                  >
                    {credential.documentName || "View Document"}
                  </a>
                ) : (
                  <span className="mt-1 inline-flex text-slate-500">
                    No document
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <a
                  href={`/notary/credentials/${credential.id}/edit`}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Edit
                </a>

                <a
                  href={`/notary/credentials/${credential.id}/document`}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0B1F4D] px-4 text-sm font-bold text-white transition hover:bg-blue-950"
                >
                  Replace Document
                </a>

                <form
                  action={`/notary/credentials/${credential.id}/delete`}
                  method="post"
                  className="m-0"
                >
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}

          {!credentialsWithLinks.length && (
            <p className="p-6 text-center text-slate-500">
              No credentials uploaded yet.
            </p>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Type</th>
                <th className="px-4 py-3 font-bold">Provider</th>
                <th className="px-4 py-3 font-bold">Expiration</th>
                <th className="px-4 py-3 font-bold">Review Status</th>
                <th className="px-4 py-3 font-bold">Credential Status</th>
                <th className="px-4 py-3 font-bold">Document</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {credentialsWithLinks.map((credential) => (
                <tr key={credential.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-4 font-semibold text-slate-950">
                    {credential.credential_type}
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {credential.provider || "-"}
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {credential.expiration_date || "-"}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getReviewStatusClass(
                        credential.status
                      )}`}
                    >
                      {getReviewStatus(credential.status)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getCredentialHealthClass(
                        credential.expiration_date
                      )}`}
                    >
                      {getCredentialHealth(credential.expiration_date)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {credential.documentUrl ? (
                      <a
                        href={credential.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#0B1F4D] hover:underline"
                      >
                        {credential.documentName || "View Document"}
                      </a>
                    ) : (
                      <span className="text-slate-500">No document</span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <a
                        href={`/notary/credentials/${credential.id}/edit`}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        Edit
                      </a>

                      <a
                        href={`/notary/credentials/${credential.id}/document`}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0B1F4D] px-4 text-xs font-bold text-white transition hover:bg-blue-950"
                      >
                        Replace
                      </a>

                      <form
                        action={`/notary/credentials/${credential.id}/delete`}
                        method="post"
                        className="m-0"
                      >
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}

              {!credentialsWithLinks.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No credentials uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}