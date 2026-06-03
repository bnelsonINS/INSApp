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

  const formData = await request.formData();

  const amountValue = String(formData.get("amount") || "");

  await supabase
    .from("notary_credentials")
    .update({
      credential_type: String(formData.get("credential_type") || ""),
      provider: String(formData.get("provider") || "") || null,
      credential_number: String(formData.get("credential_number") || "") || null,
      amount: amountValue ? Number(amountValue) : null,
      issue_date: String(formData.get("issue_date") || "") || null,
      expiration_date: String(formData.get("expiration_date") || "") || null,
      status: "pending_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/notary/credentials");
}