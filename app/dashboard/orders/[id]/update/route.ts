import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

function text(value: FormDataEntryValue | null) {
  const v = String(value ?? "").trim();
  return v === "" || v === "undefined" ? null : v;
}

function money(value: FormDataEntryValue | null) {
  const v = String(value ?? "").trim();
  if (v === "" || v === "undefined") return null;

  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "blank";
  return String(value);
}

function changed(oldValue: unknown, newValue: unknown) {
  return displayValue(oldValue) !== displayValue(newValue);
}

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not listed";

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return String(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numberValue);
}

function buildOrderLink(assignmentId: string) {
  const appUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://indiananotarysolutions.com"
  ).replace(/\/$/, "");

  const redirectTarget = `/notary/assignments/${assignmentId}`;

  return `${appUrl}/login?redirectTo=${encodeURIComponent(redirectTarget)}`;
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;

  return null;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: existingOrder, error: existingError } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .single();

  if (existingError || !existingOrder) {
    return NextResponse.json(
      {
        message: "Order not found before update",
        id,
        error: existingError?.message,
      },
      { status: 404 }
    );
  }

  const formData = await request.formData();

  const clientFee = money(formData.get("client_fee"));
  const notaryFee = money(formData.get("notary_fee"));
  const assignedNotaryId = text(formData.get("assigned_notary_id"));

  const oldAssignedNotaryId =
    existingOrder.assigned_notary_id ?? existingOrder.notary_id ?? null;

  const updatePayload = {
    status:
      assignedNotaryId && assignedNotaryId !== oldAssignedNotaryId
        ? "Not Confirmed"
        : text(formData.get("status")),

    signing_type: text(formData.get("signing_type")),
    borrower_name: text(formData.get("borrower_name")),
    borrower_phone: text(formData.get("borrower_phone")),
    borrower_email: text(formData.get("borrower_email")),
    signing_date: text(formData.get("signing_date")),
    signing_time: text(formData.get("signing_time")),
    signing_address: text(formData.get("signing_address")),
    signing_city: text(formData.get("signing_city")),
    signing_state: text(formData.get("signing_state")),
    signing_zip: text(formData.get("signing_zip")),
    special_instructions: text(formData.get("special_instructions")),

    client_fee: clientFee,
    notary_fee: notaryFee,
    fee: clientFee,
    assigned_notary_id: assignedNotaryId,
    notary_id: assignedNotaryId,
    assigned_at:
      assignedNotaryId && assignedNotaryId !== oldAssignedNotaryId
        ? new Date().toISOString()
        : existingOrder.assigned_at,
    updated_at: new Date().toISOString(),
  };

  const changes: string[] = [];

  const trackedFields = [
    ["Status", existingOrder.status, updatePayload.status],
    ["Signing type", existingOrder.signing_type, updatePayload.signing_type],
    ["Borrower name", existingOrder.borrower_name, updatePayload.borrower_name],
    ["Borrower phone", existingOrder.borrower_phone, updatePayload.borrower_phone],
    ["Borrower email", existingOrder.borrower_email, updatePayload.borrower_email],
    ["Signing date", existingOrder.signing_date, updatePayload.signing_date],
    ["Signing time", existingOrder.signing_time, updatePayload.signing_time],
    ["Signing address", existingOrder.signing_address, updatePayload.signing_address],
    ["Signing city", existingOrder.signing_city, updatePayload.signing_city],
    ["Signing state", existingOrder.signing_state, updatePayload.signing_state],
    ["Signing ZIP", existingOrder.signing_zip, updatePayload.signing_zip],
    ["Notary fee", existingOrder.notary_fee, updatePayload.notary_fee],
    ["Assigned notary", oldAssignedNotaryId, updatePayload.assigned_notary_id],
    [
      "Special instructions",
      existingOrder.special_instructions,
      updatePayload.special_instructions,
    ],
  ];

  for (const [label, oldValue, newValue] of trackedFields) {
    if (changed(oldValue, newValue)) {
      changes.push(
        `${label} changed from "${displayValue(oldValue)}" to "${displayValue(
          newValue
        )}"`
      );
    }
  }

  const { error } = await supabase
    .from("assignments")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        message: "Order update failed",
        id,
        error: error.message,
        details: error,
      },
      { status: 500 }
    );
  }

  const orderNumber = existingOrder.control_number || id;
  const orderLink = buildOrderLink(id);

  const shouldNotifyRemovedNotary =
    Boolean(oldAssignedNotaryId) && oldAssignedNotaryId !== assignedNotaryId;

  if (shouldNotifyRemovedNotary && oldAssignedNotaryId) {
    const { data: removedNotaryProfile, error: removedNotaryProfileError } =
      await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", oldAssignedNotaryId)
        .single();

    if (removedNotaryProfileError || !removedNotaryProfile?.email) {
      await supabase.from("assignment_activity").insert({
        assignment_id: id,
        actor_id: user.id,
        actor_name: profile.full_name || profile.email || "Admin",
        actor_role: profile.role,
        action: "Removal notification skipped",
        details:
          removedNotaryProfileError?.message ||
          "Removed notary profile or email was not found.",
      });
    } else {
      const removalMessage = `
Hello ${removedNotaryProfile.full_name || "there"},

You have been removed from Order-${orderNumber}.

Order Details

Order Number: Order-${orderNumber}
Borrower Name: ${existingOrder.borrower_name || "Not listed"}
Signing Date: ${existingOrder.signing_date || "Not listed"}
Signing Time: ${existingOrder.signing_time || "Not listed"}

No further action is required for this order unless Indiana Notary Solutions contacts you directly.

Indiana Notary Solutions
`.trim();

      const { error: removalNotificationError } = await supabase
        .from("notification_queue")
        .insert({
          user_id: oldAssignedNotaryId,
          channel: "email",
          type: "assignment_removed",
          status: "pending",
          subject: `Removed From Assignment - Order-${orderNumber}`,
          message: removalMessage,
          metadata: {
            email: removedNotaryProfile.email,
            assignment_id: id,
            control_number: orderNumber,
          },
          attempts: 0,
        });

      if (removalNotificationError) {
        await supabase.from("assignment_activity").insert({
          assignment_id: id,
          actor_id: user.id,
          actor_name: profile.full_name || profile.email || "Admin",
          actor_role: profile.role,
          action: "Removal email notification insert failed",
          details: removalNotificationError.message,
        });
      } else {
        await supabase.from("assignment_activity").insert({
          assignment_id: id,
          actor_id: user.id,
          actor_name: profile.full_name || profile.email || "Admin",
          actor_role: profile.role,
          action: "Notary Removal Notification Queued",
          details: `Removal email queued for ${
            removedNotaryProfile.full_name ||
            removedNotaryProfile.email ||
            oldAssignedNotaryId
          }.`,
        });
      }
    }
  }

  const shouldNotifyAssignedNotary =
    Boolean(assignedNotaryId) && oldAssignedNotaryId !== assignedNotaryId;

  if (shouldNotifyAssignedNotary && assignedNotaryId) {
    const { data: notaryProfile, error: notaryProfileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", assignedNotaryId)
      .single();

    const { data: notaryDetails } = await supabase
      .from("notary_profiles")
      .select("phone")
      .eq("user_id", assignedNotaryId)
      .maybeSingle();

    if (notaryProfileError || !notaryProfile?.email) {
      await supabase.from("assignment_activity").insert({
        assignment_id: id,
        actor_id: user.id,
        actor_name: profile.full_name || profile.email || "Admin",
        actor_role: profile.role,
        action: "Notification skipped",
        details:
          notaryProfileError?.message ||
          "Assigned notary profile or email was not found.",
      });
    } else {
      const emailMessage = `
Hello ${notaryProfile.full_name || "there"},

You have been assigned to Order-${orderNumber}.

Order Details

Order Number: Order-${orderNumber}
Status: ${updatePayload.status || "Not listed"}
Signing Type: ${updatePayload.signing_type || "Not listed"}
Borrower Name: ${updatePayload.borrower_name || "Not listed"}
Borrower Phone: ${updatePayload.borrower_phone || "Not listed"}
Borrower Email: ${updatePayload.borrower_email || "Not listed"}
Signing Date: ${updatePayload.signing_date || "Not listed"}
Signing Time: ${updatePayload.signing_time || "Not listed"}
Signing Address: ${updatePayload.signing_address || "Not listed"}
Signing City: ${updatePayload.signing_city || "Not listed"}
Signing State: ${updatePayload.signing_state || "Not listed"}
Signing ZIP: ${updatePayload.signing_zip || "Not listed"}
Notary Fee: ${formatMoney(updatePayload.notary_fee)}

Special Instructions

${updatePayload.special_instructions || "No special instructions listed."}

Please log in to your Indiana Notary Solutions dashboard to review the full assignment details.

Indiana Notary Solutions
`.trim();

      const { error: emailNotificationError } = await supabase
        .from("notification_queue")
        .insert({
          user_id: assignedNotaryId,
          channel: "email",
          type: "assignment_assigned",
          status: "pending",
          subject: `New Assignment - Order-${orderNumber}`,
          message: emailMessage,
          metadata: {
            email: notaryProfile.email,
            assignment_id: id,
            control_number: orderNumber,
            order_link: orderLink,
            cta_label: "View Assignment",
          },
          attempts: 0,
        });

      if (emailNotificationError) {
        await supabase.from("assignment_activity").insert({
          assignment_id: id,
          actor_id: user.id,
          actor_name: profile.full_name || profile.email || "Admin",
          actor_role: profile.role,
          action: "Email notification insert failed",
          details: emailNotificationError.message,
        });
      }

      const smsPhone = normalizePhone(notaryDetails?.phone);

      if (smsPhone) {
        const { error: smsNotificationError } = await supabase
          .from("notification_queue")
          .insert({
            user_id: assignedNotaryId,
            channel: "sms",
            type: "assignment_assigned",
            status: "pending",
            subject: null,
            message: `Indiana Notary Solutions: You have been assigned to Order-${orderNumber}. Please check your email for assignment details.`,
            metadata: {
              phone: smsPhone,
              assignment_id: id,
              control_number: orderNumber,
            },
            attempts: 0,
          });

        if (smsNotificationError) {
          await supabase.from("assignment_activity").insert({
            assignment_id: id,
            actor_id: user.id,
            actor_name: profile.full_name || profile.email || "Admin",
            actor_role: profile.role,
            action: "SMS notification insert failed",
            details: smsNotificationError.message,
          });
        }
      }
    }
  }

  if (changes.length > 0) {
    const { error: activityError } = await supabase
      .from("assignment_activity")
      .insert({
        assignment_id: id,
        actor_id: user.id,
        actor_name: profile.full_name || profile.email || "Admin",
        actor_role: profile.role,
        action: "Order updated",
        details: changes.join("\n"),
      });

    if (activityError) {
      console.error("Assignment activity insert failed:", activityError.message);
    }
  }

  return NextResponse.redirect(new URL(`/dashboard/orders/${id}`, request.url));
}