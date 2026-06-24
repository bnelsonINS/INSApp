import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not listed";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "Not listed";

  const [hours, minutes] = value.split(":");

  if (!hours || !minutes) return value;

  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildCancelledMessage({
  recipientName,
  orderNumber,
  borrowerName,
  signingDate,
  signingTime,
}: {
  recipientName: string;
  orderNumber: string;
  borrowerName: string | null;
  signingDate: string | null;
  signingTime: string | null;
}) {
  return `
Hello ${recipientName || "there"},

Order-${orderNumber} has been cancelled.

Order Details

Order Number: Order-${orderNumber}
Borrower Name: ${borrowerName || "Not listed"}
Signing Date: ${formatDate(signingDate)}
Signing Time: ${formatTime(signingTime)}

No action is needed on this cancelled order.

Indiana Notary Solutions
`.trim();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || id === "undefined") {
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !adminProfile ||
    adminProfile.role !== "admin" ||
    !adminProfile.is_active
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: order, error: orderError } = await supabase
    .from("assignments")
    .select(
      "id, client_id, control_number, borrower_name, signing_date, signing_time, assigned_notary_id, notary_id, status"
    )
    .eq("id", id)
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: "Order not found", details: orderError?.message },
      { status: 404 }
    );
  }

  const assignedNotaryId = order.assigned_notary_id ?? order.notary_id ?? null;
  const orderNumber = order.control_number || id;

  const { error: updateError } = await supabase
  .from("assignments")
  .update({
    status: "Cancelled",
    assigned_notary_id: null,
    notary_id: null,
    updated_at: new Date().toISOString(),
  })
  .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to cancel order", details: updateError.message },
      { status: 500 }
    );
  }

  await supabase.from("assignment_activity").insert({
    assignment_id: id,
    actor_id: user.id,
    actor_name: adminProfile.full_name || adminProfile.email || "Admin",
    actor_role: adminProfile.role,
    action: "Order Cancelled",
    details: `Order-${orderNumber} was cancelled.`,
  });

  if (assignedNotaryId) {
    const { data: notaryProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", assignedNotaryId)
      .single();

    if (notaryProfile?.email) {
      await supabase.from("notification_queue").insert({
        user_id: assignedNotaryId,
        channel: "email",
        type: "assignment_cancelled",
        status: "pending",
        subject: `Order Cancelled - Order-${orderNumber}`,
        message: buildCancelledMessage({
          recipientName: notaryProfile.full_name || "there",
          orderNumber,
          borrowerName: order.borrower_name,
          signingDate: order.signing_date,
          signingTime: order.signing_time,
        }),
        metadata: {
          email: notaryProfile.email,
          assignment_id: id,
          control_number: orderNumber,
          recipient_type: "notary",
        },
        attempts: 0,
      });
    }
  }

  if (order.client_id) {
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", order.client_id)
      .single();

    if (clientProfile?.email) {
      await supabase.from("notification_queue").insert({
        user_id: order.client_id,
        channel: "email",
        type: "assignment_cancelled",
        status: "pending",
        subject: `Order Cancelled - Order-${orderNumber}`,
        message: buildCancelledMessage({
          recipientName: clientProfile.full_name || "there",
          orderNumber,
          borrowerName: order.borrower_name,
          signingDate: order.signing_date,
          signingTime: order.signing_time,
        }),
        metadata: {
          email: clientProfile.email,
          assignment_id: id,
          control_number: orderNumber,
          recipient_type: "client",
        },
        attempts: 0,
      });
    }
  }

  return NextResponse.redirect(new URL(`/dashboard/orders/${id}`, request.url));
}