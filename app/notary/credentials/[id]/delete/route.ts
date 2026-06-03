import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: documents } = await supabase
    .from("credential_documents")
    .select("file_url")
    .eq("credential_id", id)
    .eq("user_id", user.id);

  if (documents && documents.length > 0) {
    await supabase.storage
      .from("notary-documents")
      .remove(documents.map((document) => document.file_url));
  }

  await supabase
    .from("credential_documents")
    .delete()
    .eq("credential_id", id)
    .eq("user_id", user.id);

  const { error: credentialDeleteError } = await supabase
    .from("notary_credentials")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (credentialDeleteError) {
    console.error("Credential delete failed:", credentialDeleteError);
    redirect("/notary/credentials?error=credential-delete-failed");
  }

  redirect("/notary/credentials");
}