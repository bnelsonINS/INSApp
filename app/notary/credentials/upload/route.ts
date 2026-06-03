import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { checkAndSubmitNotaryForReview } from "../../../../src/lib/notary-readiness";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const formData = await request.formData();

  const credential_type = String(formData.get("credential_type") || "");
  const provider = String(formData.get("provider") || "");
  const credential_number = String(formData.get("credential_number") || "");
  const amountValue = String(formData.get("amount") || "");
  const issue_date = String(formData.get("issue_date") || "");
  const expiration_date = String(formData.get("expiration_date") || "");
  const document = formData.get("document") as File | null;

  if (!credential_type || !document) {
    redirect("/notary/credentials?error=missing-fields");
  }

  const { data: credential, error: credentialError } = await supabase
    .from("notary_credentials")
    .insert({
      user_id: user.id,
      credential_type,
      provider: provider || null,
      credential_number: credential_number || null,
      amount: amountValue ? Number(amountValue) : null,
      issue_date: issue_date || null,
      expiration_date: expiration_date || null,
      status: "pending_review",
    })
    .select()
    .single();

  if (credentialError || !credential) {
    console.error("Credential create failed:", credentialError);
    redirect("/notary/credentials?error=credential-create-failed");
  }

  const fileExt = document.name.split(".").pop() || "pdf";
  const filePath = `${user.id}/${credential.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("notary-documents")
    .upload(filePath, document, {
      contentType: document.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("File upload failed:", uploadError);

    await supabase
      .from("notary_credentials")
      .delete()
      .eq("id", credential.id)
      .eq("user_id", user.id);

    redirect("/notary/credentials?error=file-upload-failed");
  }

  const { error: documentError } = await supabase
    .from("credential_documents")
    .insert({
      credential_id: credential.id,
      user_id: user.id,
      file_name: document.name,
      file_url: filePath,
      file_type: document.type,
    });

  if (documentError) {
    console.error("Document row create failed:", documentError);

    await supabase.storage.from("notary-documents").remove([filePath]);

    await supabase
      .from("notary_credentials")
      .delete()
      .eq("id", credential.id)
      .eq("user_id", user.id);

    redirect("/notary/credentials?error=document-save-failed");
  }

  await checkAndSubmitNotaryForReview(supabase, user.id);

  redirect("/notary/credentials");
}