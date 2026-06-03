import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, notary_id")
    .eq("id", id)
    .eq("notary_id", user.id)
    .single();

  if (!assignment) redirect("/notary/assignments");

  const formData = await request.formData();

  const signedDocuments = formData.get("signed_documents") as File | null;
  const shippingReceipt = formData.get("shipping_receipt") as File | null;

  async function uploadFile(file: File | null, documentType: string) {
    if (!file || file.size === 0) return;

    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("assignment-documents")
      .upload(filePath, file);

    if (uploadError) {
      console.error("File upload error:", uploadError);
      return;
    }

    const { error: insertError } = await supabase
      .from("assignment_uploaded_documents")
      .insert({
        assignment_id: id,
        uploaded_by: user!.id,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
      });

    if (insertError) {
      console.error("Document insert error:", insertError);
    }
  }

  await uploadFile(signedDocuments, "Signed Document Package");
  await uploadFile(shippingReceipt, "Shipping Receipt / Tracking");

  await supabase
    .from("assignments")
    .update({
      status: "Docs Uploaded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("notary_id", user.id);

  await supabase.from("assignment_activity").insert({
    assignment_id: id,
    actor_id: user.id,
    actor_name: user.email ?? "Notary",
    actor_role: "notary",
    action: "Documents Uploaded",
    details: "The notary uploaded completed assignment documents.",
  });

  redirect(`/notary/assignments/${id}`);
}