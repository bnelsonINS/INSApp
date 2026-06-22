import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../../src/lib/supabase-server";
import {
  sendCredentialApprovedEmail,
  sendCredentialRejectedEmail,
} from "../../../../../../src/lib/email";

type CredentialStatus = "approved" | "rejected";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const credentialId = id;

  const body = await request.json();
  const status = body.status as CredentialStatus;
  const adminNotes = String(body.rejectionReason || body.admin_notes || "").trim();

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
    .select("id, user_id, credential_type, status")
    .eq("id", credentialId)
    .single();

  if (credentialError || !credential) {
    return NextResponse.json({ error: "Credential not found." }, { status: 404 });
  }

  const { data: notaryProfile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", credential.user_id)
    .single();

  if (!notaryProfile?.email) {
    return NextResponse.json(
      { error: "Notary email not found." },
      { status: 400 }
    );
  }

  const rejectionReason =
    status === "rejected" ? adminNotes || "Rejected by admin." : null;

  const { error: updateError } = await supabase
    .from("notary_credentials")
    .update({
      status,
      admin_notes: rejectionReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credentialId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  try {
    if (status === "approved") {
      await sendCredentialApprovedEmail({
        to: notaryProfile.email,
        fullName: notaryProfile.full_name || "Notary",
        credentialType: credential.credential_type || "Credential",
      });
    }

    if (status === "rejected") {
      await sendCredentialRejectedEmail({
        to: notaryProfile.email,
        fullName: notaryProfile.full_name || "Notary",
        credentialType: credential.credential_type || "Credential",
        rejectionReason: rejectionReason || "Rejected by admin.",
      });
    }
  } catch (emailError) {
    console.error("Credential status email failed:", emailError);
  }

  return NextResponse.json({
    success: true,
    status,
  });
}