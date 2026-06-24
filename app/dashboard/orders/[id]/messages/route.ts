import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../../src/lib/supabase-admin";

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://indiananotarysolutions.com"
  ).replace(/\/$/, "");
}

function buildAdminOrderLink(assignmentId: string) {
  return `${getBaseUrl()}/dashboard/orders/${assignmentId}`;
}

function buildClientOrderLink(assignmentId: string) {
  return `${getBaseUrl()}/login?redirectTo=${encodeURIComponent(
    `/client/dashboard/orders/${assignmentId}`
  )}`;
}

function buildNotaryOrderLink(assignmentId: string) {
  return `${getBaseUrl()}/login?redirectTo=${encodeURIComponent(
    `/notary/assignments/${assignmentId}`
  )}`;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get("assignment_id");

  if (!assignmentId) {
    return NextResponse.json(
      { error: "Missing assignment_id" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("order_messages")
    .select("id, assignment_id, sender_id, message, created_at")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const assignmentId = body.assignment_id;
  const message = body.message;

  if (!assignmentId || !message?.trim()) {
    return NextResponse.json(
      { error: "Missing assignment_id or message" },
      { status: 400 }
    );
  }

  const trimmedMessage = message.trim();

  const { data, error } = await supabase
    .from("order_messages")
    .insert({
      assignment_id: assignmentId,
      sender_id: user.id,
      message: trimmedMessage,
    })
    .select("id, assignment_id, sender_id, message, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: senderProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  const { data: assignment } = await supabaseAdmin
    .from("assignments")
    .select(
      "id, client_id, assigned_notary_id, notary_id, control_number, borrower_name"
    )
    .eq("id", assignmentId)
    .single();

  if (senderProfile && assignment) {
    const senderRole = String(senderProfile.role || "").toLowerCase();
    const orderNumber = assignment.control_number || assignmentId;
    const senderName =
      senderProfile.full_name || senderProfile.email || "Someone";

    const recipientMap = new Map<
      string,
      { recipientType: "admin" | "client" | "notary"; orderLink: string }
    >();

    if (senderRole === "notary") {
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("is_active", true);

      for (const admin of admins ?? []) {
        if (admin.id !== user.id) {
          recipientMap.set(admin.id, {
            recipientType: "admin",
            orderLink: buildAdminOrderLink(assignmentId),
          });
        }
      }
    }

    if (senderRole === "client") {
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("is_active", true);

      for (const admin of admins ?? []) {
        if (admin.id !== user.id) {
          recipientMap.set(admin.id, {
            recipientType: "admin",
            orderLink: buildAdminOrderLink(assignmentId),
          });
        }
      }

      const notaryId = assignment.assigned_notary_id || assignment.notary_id;

      if (notaryId && notaryId !== user.id) {
        recipientMap.set(notaryId, {
          recipientType: "notary",
          orderLink: buildNotaryOrderLink(assignmentId),
        });
      }
    }

    if (senderRole === "admin") {
      const clientId = assignment.client_id;
      const notaryId = assignment.assigned_notary_id || assignment.notary_id;

      if (clientId && clientId !== user.id) {
        recipientMap.set(clientId, {
          recipientType: "client",
          orderLink: buildClientOrderLink(assignmentId),
        });
      }

      if (notaryId && notaryId !== user.id) {
        recipientMap.set(notaryId, {
          recipientType: "notary",
          orderLink: buildNotaryOrderLink(assignmentId),
        });
      }
    }

    const recipientIds = Array.from(recipientMap.keys());

    if (recipientIds.length > 0) {
      const { data: recipientProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", recipientIds);

      const notifications =
        recipientProfiles
          ?.filter((recipient) => recipient.email)
          .map((recipient) => {
            const recipientInfo = recipientMap.get(recipient.id);

            return {
              user_id: recipient.id,
              channel: "email",
              type: "order_message_added",
              status: "pending",
              subject: `New Note Added - Order-${orderNumber}`,
              message: `
Hello ${recipient.full_name || "there"},

A new note was added to Order-${orderNumber}.

Order Number: Order-${orderNumber}
Borrower Name: ${assignment.borrower_name || "Not listed"}
From: ${senderName}

Message:
${trimmedMessage}

Please log in to your Indiana Notary Solutions dashboard to review and respond.

Indiana Notary Solutions
`.trim(),
              metadata: {
                email: recipient.email,
                assignment_id: assignmentId,
                control_number: orderNumber,
                order_link: recipientInfo?.orderLink,
                cta_label: "View Order",
                recipient_type: recipientInfo?.recipientType,
              },
              attempts: 0,
            };
          }) ?? [];

      if (notifications.length > 0) {
        await supabaseAdmin.from("notification_queue").insert(notifications);

        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-notifications`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
            }
          );
        } catch (error) {
          console.error("Failed to process order message notification:", error);
        }
      }
    }
  }

  return NextResponse.json({ message: data });
}