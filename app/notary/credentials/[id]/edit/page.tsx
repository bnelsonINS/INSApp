import Link from "next/link";
import { redirect } from "next/navigation";
import UploadSubmitButton from "../../../../components/UploadSubmitButton";
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

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100";

  const labelClass = "text-sm font-bold text-slate-700";

  return (
    <main className="space-y-6 bg-slate-50 p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
        <p className="text-sm font-semibold text-blue-100">
          Notary Credential
        </p>

        <h1 className="mt-2 text-3xl font-bold">Edit Credential</h1>

        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          Update your credential details below.
        </p>
      </section>

      <form
        action={`/notary/credentials/${id}/update`}
        method="post"
        encType="multipart/form-data"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Credential Type</span>

            <select
              name="credential_type"
              defaultValue={credential.credential_type}
              required
              className={inputClass}
            >
              {credentialTypes.map((type) => (
                <option key={type} value={type} className="text-slate-900">
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Provider</span>

            <input
              name="provider"
              defaultValue={credential.provider || ""}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Number / Policy / License</span>

            <input
              name="credential_number"
              defaultValue={credential.credential_number || ""}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Amount</span>

            <input
              name="amount"
              type="number"
              step="0.01"
              defaultValue={credential.amount || ""}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Issue Date</span>

            <input
              name="issue_date"
              type="date"
              defaultValue={credential.issue_date || ""}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Expiration Date</span>

            <input
              name="expiration_date"
              type="date"
              defaultValue={credential.expiration_date || ""}
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <UploadSubmitButton
            loadingText="Saving changes..."
            className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
          >
            Save Changes
          </UploadSubmitButton>

          <Link
            href="/notary/credentials"
            className="rounded-xl bg-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-900 transition hover:bg-slate-300"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}