import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../../../../src/lib/supabase-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assignmentId } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.is_active) {
    redirect("/login");
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from("assignments")
    .select(
      `
      id,
      client_id,
      control_number,
      borrower_name,
      signing_date,
      signing_time,
      signing_address,
      signing_city,
      signing_state,
      signing_zip,
      notary_id,
      assigned_notary_id
    `
    )
    .eq("id", assignmentId)
    .eq("client_id", user.id)
    .maybeSingle();

  if (assignmentError || !assignment) {
    console.error("Client assignment document upload load error:", {
      assignmentId,
      userId: user.id,
      assignmentError,
    });

    redirect("/client/dashboard/orders");
  }

  const formData = await request.formData();
  const document = formData.get("document");

  if (!(document instanceof File) || document.size === 0) {
    redirect(`/client/dashboard/orders/${assignmentId}?error=no-file`);
  }

  const safeFileName = document.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase();

  const filePath = `${user.id}/${assignmentId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("client-order-documents")
    .upload(filePath, document, {
      contentType: document.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Client assignment document upload error:", uploadError);
    redirect(`/client/dashboard/orders/${assignmentId}?error=upload-failed`);
  }

  const { error: insertError } = await supabaseAdmin
    .from("order_documents")
    .insert({
      order_id: assignmentId,
      client_id: user.id,
      file_name: document.name,
      file_path: filePath,
      file_type: document.type || null,
      file_size: document.size,
    });

  if (insertError) {
    console.error("Client assignment document insert error:", insertError);
    redirect(
      `/client/dashboard/orders/${assignmentId}?error=document-save-failed`
    );
  }

  const notaryUserId = assignment.assigned_notary_id || assignment.notary_id;

  if (notaryUserId) {
    const { data: notaryProfile, error: notaryProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", notaryUserId)
        .maybeSingle();

    if (notaryProfileError) {
      console.error("Client title document notary profile lookup error:", {
        assignmentId,
        notaryUserId,
        notaryProfileError,
      });
    }

    if (notaryProfile?.email) {
      const { error: notificationError } = await supabaseAdmin
        .from("notification_queue")
        .insert({
          user_id: notaryUserId,
          channel: "email",
          type: "title_documents_uploaded",
          status: "pending",
          subject: `New Title Documents - ${
            assignment.control_number || "Order"
          }`,
          message: `
New title documents have been uploaded for your assignment.

Control #: ${assignment.control_number || "—"}
Signer: ${assignment.borrower_name || "—"}
File: ${document.name}

Signing Date: ${assignment.signing_date || "—"}
Signing Time: ${assignment.signing_time || "—"}

Signing Address:
${assignment.signing_address || "—"}
${assignment.signing_city || "—"}, ${assignment.signing_state || "—"} ${
            assignment.signing_zip || ""
          }

Please log in to your Indiana Notary Solutions notary dashboard to review the documents.
          `.trim(),
          metadata: {
            recipient_email: notaryProfile.email,
            recipient_name: notaryProfile.full_name || "Notary",
          },
        });

      if (notificationError) {
  console.error("Client title document notification error:", {
    assignmentId,
    notaryUserId,
    notificationError,
  });
} else {
  const { error: processError } = await supabaseAdmin.functions.invoke(
    "process-notifications"
  );

  if (processError) {
    console.error("Failed to invoke process-notifications:", processError);
  }
}
    } else {
      console.error("No notary email found for title document notification:", {
        assignmentId,
        notaryUserId,
      });
    }
  }

  redirect(`/client/dashboard/orders/${assignmentId}`);
}