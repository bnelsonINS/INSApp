import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";
import DocumentReplaceForm from "./document-replace-form";

export default async function ReplaceDocumentPage({
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
      <div>
        <h1 className="mt-2 text-3xl font-bold text-black">
  Replace Document
</h1>
        <p className="text-slate-600">
          Replace the uploaded document for {credential.credential_type}.
        </p>
      </div>

      <DocumentReplaceForm credentialId={id} userId={user.id} />
    </main>
  );
}