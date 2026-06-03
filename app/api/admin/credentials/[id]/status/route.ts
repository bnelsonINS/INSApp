import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../../src/lib/supabase-server";

type CredentialStatus = "approved" | "rejected";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();
  const credentialId = params.id;

  const body = await request.json();
  const status = body.status as CredentialStatus;
  const rejectionReason = body.rejectionReason?.trim() || null;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin" || !adminProfile.is_active) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { data: credential, error: credentialError } = await supabase
    .from("notary_credentials")
    .select("id, status")
    .eq("id", credentialId)
    .single();

  if (credentialError || !credential) {
    return NextResponse.json({ error: "Credential not found." }, { status: 404 });
  }

  if (credential.status === status) {
    return NextResponse.json({
      success: true,
      status,
      message: `Credential is already ${status}.`,
    });
  }

  const { error: updateError } = await supabase
    .from("notary_credentials")
    .update({
      status,
      rejection_reason: status === "rejected" ? rejectionReason : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", credentialId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    status,
  });
}