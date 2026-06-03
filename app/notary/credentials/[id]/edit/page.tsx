import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

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

export default async function EditCredentialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: credential } = await supabase
    .from("notary_credentials")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!credential) redirect("/notary/credentials");

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit Credential</h1>

      <form
        action={`/notary/credentials/${id}/update`}
        method="post"
        encType="multipart/form-data"
        className="bg-white rounded-xl shadow p-6 space-y-4"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <label>
            <span className="text-sm font-medium">Credential Type</span>
            <select
              name="credential_type"
              defaultValue={credential.credential_type}
              required
              className="w-full border rounded-lg p-2"
            >
              {credentialTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-medium">Provider</span>
            <input
              name="provider"
              defaultValue={credential.provider || ""}
              className="w-full border rounded-lg p-2"
            />
          </label>

          <label>
            <span className="text-sm font-medium">Number / Policy / License</span>
            <input
              name="credential_number"
              defaultValue={credential.credential_number || ""}
              className="w-full border rounded-lg p-2"
            />
          </label>

          <label>
            <span className="text-sm font-medium">Amount</span>
            <input
              name="amount"
              type="number"
              step="0.01"
              defaultValue={credential.amount || ""}
              className="w-full border rounded-lg p-2"
            />
          </label>

          <label>
            <span className="text-sm font-medium">Issue Date</span>
            <input
              name="issue_date"
              type="date"
              defaultValue={credential.issue_date || ""}
              className="w-full border rounded-lg p-2"
            />
          </label>

          <label>
            <span className="text-sm font-medium">Expiration Date</span>
            <input
              name="expiration_date"
              type="date"
              defaultValue={credential.expiration_date || ""}
              className="w-full border rounded-lg p-2"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg">
            Save Changes
          </button>

          <a href="/notary/credentials" className="bg-slate-200 px-4 py-2 rounded-lg">
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}