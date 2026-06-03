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
  if (status === "approved") return "🟢 Approved";
  if (status === "rejected") return "🔴 Rejected";
  return "🟡 In Review";
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
  if (!expirationDate) return "🟡 Missing Expiration";

  if (isExpired(expirationDate)) return "🔴 Expired";

  const today = new Date();
  const expires = new Date(expirationDate);

  const days = Math.ceil(
    (expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days <= 30) return "🟡 Expiring Soon";

  return "🟢 Current";
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
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Notary Credentials
        </h1>
        <p className="text-slate-600">
          Upload and track your commission, insurance, bond, certifications, and
          tax documents.
        </p>
      </div>

      <section
        className={`rounded-xl border p-6 shadow-sm ${
          readiness.complete
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <h2
          className={`text-lg font-semibold ${
            readiness.complete ? "text-emerald-800" : "text-amber-800"
          }`}
        >
          {readiness.complete
            ? "Credentials Complete"
            : "Credentials Incomplete"}
        </h2>

        <p className="mt-1 text-sm text-slate-700">
          {readiness.complete
            ? "All required credentials are approved and current."
            : "Some required credentials are missing, not approved, or expired."}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {readiness.results.map((item) => (
            <div key={item.type} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-900">{item.type}</p>

                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.complete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
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
        className="bg-white rounded-xl shadow p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold">Add Credential</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-medium">Credential Type</span>
            <select
              name="credential_type"
              required
              className="w-full border rounded-lg p-2"
            >
              <option value="">Select credential</option>
              {credentialTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Provider</span>
            <input name="provider" className="w-full border rounded-lg p-2" />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">
              Number / Policy / License
            </span>
            <input
              name="credential_number"
              className="w-full border rounded-lg p-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Amount</span>
            <input
              name="amount"
              type="number"
              step="0.01"
              className="w-full border rounded-lg p-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Issue Date</span>
            <input
              name="issue_date"
              type="date"
              className="w-full border rounded-lg p-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Expiration Date</span>
            <input
              name="expiration_date"
              type="date"
              className="w-full border rounded-lg p-2"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Upload Document</span>
          <input
            name="document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            required
            className="w-full border rounded-lg p-2"
          />
        </label>

        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg">
          Upload Credential
        </button>
      </form>

      <section className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Your Credentials</h2>
        </div>

        <div className="md:hidden divide-y">
          {credentialsWithLinks.map((credential) => (
            <div key={credential.id} className="p-4 space-y-3">
              <div>
                <p className="font-semibold">{credential.credential_type}</p>
                <p className="text-sm text-slate-600">
                  {credential.provider || "No provider"}
                </p>
              </div>

              <div className="text-sm space-y-1">
                <p>
                  <strong>Expiration:</strong>{" "}
                  {credential.expiration_date || "-"}
                </p>
                <p>
                  <strong>Review Status:</strong>{" "}
                  {getReviewStatus(credential.status)}
                </p>
                <p>
                  <strong>Credential Status:</strong>{" "}
                  {getCredentialHealth(credential.expiration_date)}
                </p>
              </div>

              <div className="text-sm">
                <strong>Document:</strong>{" "}
                {credential.documentUrl ? (
                  <a
                    href={credential.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline break-all"
                  >
                    {credential.documentName || "View Document"}
                  </a>
                ) : (
                  <span className="text-slate-500">No document</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href={`/notary/credentials/${credential.id}/edit`}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Edit
                </a>

                <a
                  href={`/notary/credentials/${credential.id}/document`}
                  className="bg-purple-600 text-white px-3 py-1 rounded"
                >
                  Replace Document
                </a>

                <form
                  action={`/notary/credentials/${credential.id}/delete`}
                  method="post"
                >
                  <button
                    type="submit"
                    className="bg-red-600 text-white px-3 py-1 rounded"
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

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Expiration</th>
                <th className="p-3">Review Status</th>
                <th className="p-3">Credential Status</th>
                <th className="p-3">Document</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {credentialsWithLinks.map((credential) => (
                <tr key={credential.id} className="border-t">
                  <td className="p-3">{credential.credential_type}</td>
                  <td className="p-3">{credential.provider || "-"}</td>
                  <td className="p-3">{credential.expiration_date || "-"}</td>
                  <td className="p-3">
                    {getReviewStatus(credential.status)}
                  </td>
                  <td className="p-3">
                    {getCredentialHealth(credential.expiration_date)}
                  </td>
                  <td className="p-3">
                    {credential.documentUrl ? (
                      <a
                        href={credential.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {credential.documentName || "View Document"}
                      </a>
                    ) : (
                      <span className="text-slate-500">No document</span>
                    )}
                  </td>
                  <td className="p-3 flex gap-2">
                    <a
                      href={`/notary/credentials/${credential.id}/edit`}
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </a>

                    <a
                      href={`/notary/credentials/${credential.id}/document`}
                      className="bg-purple-600 text-white px-3 py-1 rounded"
                    >
                      Replace Document
                    </a>

                    <form
                      action={`/notary/credentials/${credential.id}/delete`}
                      method="post"
                    >
                      <button
                        type="submit"
                        className="bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {!credentialsWithLinks.length && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
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