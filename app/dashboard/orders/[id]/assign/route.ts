import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text === "" || text === "undefined" ? null : text;
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

function buildOrderLink(assignmentId: string) {
  const appUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ins-app.vercel.app"
  ).replace(/\/$/, "");

  return `${appUrl}/notary/orders/${assignmentId}`;
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

  const { data: existingOrder } = await supabase
    .from("assignments")
    .select(
      `
      id,
      notary_id,
      assigned_notary_id,
      control_number,
      signing_type,
      borrower_name,
      signing_date,
      signing_time,
      signing_address,
      signing_city,
      signing_state,
      signing_zip,
      fee,
      client_fee,
      notary_fee,
      documents_url,
      special_instructions,
      borrower_phone,
      borrower_email,
      status
    `
    )
    .eq("id", id)
    .single();

  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const notaryId = clean(formData.get("assigned_notary_id")) ?? clean(formData.get("notary_id"));

  const oldNotaryId =
    existingOrder.assigned_notary_id ?? existingOrder.notary_id ?? null;

  const idsToLookup = [oldNotaryId, notaryId].filter(Boolean) as string[];

  const { data: notaryProfiles } = idsToLookup.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", idsToLookup)
    : { data: [] };

  const oldNotary =
    notaryProfiles?.find((notary) => notary.id === oldNotaryId) ?? null;

  const newNotary =
    notaryProfiles?.find((notary) => notary.id === notaryId) ?? null;

  const oldNotaryName =
    oldNotary?.full_name || oldNotary?.email || "Unassigned";

  const newNotaryName =
    newNotary?.full_name || newNotary?.email || "Unassigned";

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("assignments")
    .update({
      notary_id: notaryId,
      assigned_notary_id: notaryId,
      assigned_at: notaryId ? now : null,
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        message: "Notary assignment update failed",
        error: error.message,
        details: error,
      },
      { status: 500 }
    );
  }

  let action = "Notary assigned";
  let details = `Notary assigned: ${newNotaryName}`;

  if (oldNotaryId && !notaryId) {
    action = "Notary unassigned";
    details = `Notary removed from order. Previous notary: ${oldNotaryName}`;
  }

  if (oldNotaryId && notaryId && oldNotaryId !== notaryId) {
    action = "Notary reassigned";
    details = `Notary changed from ${oldNotaryName} to ${newNotaryName}`;
  }

  if (oldNotaryId !== notaryId) {
    await supabase.from("assignment_activity").insert({
      assignment_id: id,
      actor_id: user.id,
      actor_name: profile.full_name || profile.email || "Admin",
      actor_role: profile.role,
      action,
      details,
    });
  }

  await supabase.from("assignment_activity").insert({
  assignment_id: id,
  actor_id: user.id,
  actor_name: profile.full_name || profile.email || "Admin",
  actor_role: profile.role,
  action: "Notification debug",
  details: JSON.stringify({
    notaryId,
    oldNotaryId,
    changed: oldNotaryId !== notaryId,
    hasNewNotary: Boolean(newNotary),
    newNotaryEmail: newNotary?.email ?? null,
  }),
});

  const shouldNotifyNewNotary = Boolean(notaryId && oldNotaryId !== notaryId);

  if (shouldNotifyNewNotary && newNotary) {
    const orderNumber = existingOrder.control_number || id;
    const orderLink = buildOrderLink(id);

    const { data: signers } = await supabase
      .from("assignment_signers")
      .select("name, phone, email, signer_order")
      .eq("assignment_id", id)
      .order("signer_order", { ascending: true });

    const signerList =
      signers && signers.length > 0
        ? signers
            .map((signer) => {
              const parts = [
                signer.name || "Unnamed signer",
                signer.phone ? `Phone: ${signer.phone}` : null,
                signer.email ? `Email: ${signer.email}` : null,
              ].filter(Boolean);

              return parts.join(" | ");
            })
            .join("\n")
        : existingOrder.borrower_name || "Not listed";

    const emailMessage = `
Hello ${newNotary.full_name || "there"},

You have been assigned to Order-${orderNumber}.

Order Details

Order Number: Order-${orderNumber}
Status: ${existingOrder.status || "Not listed"}
Signing Type: ${existingOrder.signing_type || "Not listed"}
Signing Date: ${formatDate(existingOrder.signing_date)}
Signing Time: ${formatTime(existingOrder.signing_time)}
Signing Address: ${existingOrder.signing_address || "Not listed"}
City/State/ZIP: ${existingOrder.signing_city || ""}, ${
      existingOrder.signing_state || ""
    } ${existingOrder.signing_zip || ""}
Notary Fee: ${formatMoney(existingOrder.notary_fee ?? existingOrder.fee)}
Documents URL: ${existingOrder.documents_url || "Not listed"}

Signer Information

${signerList}

Borrower Phone: ${existingOrder.borrower_phone || "Not listed"}
Borrower Email: ${existingOrder.borrower_email || "Not listed"}

Special Instructions

${existingOrder.special_instructions || "No special instructions listed."}

Please log in to your Indiana Notary Solutions dashboard to review the full assignment details.

Order link:
${orderLink}

Please log in to your Indiana Notary Solutions dashboard to review the assignment details.
`.trim();

    //const smsMessage = `Indiana Notary Solutions: You have been assigned to Order-${orderNumber}. Please check your email for assignment details.`;

    const notificationRows = [];

    if (newNotary.email) {
      notificationRows.push({
        user_id: notaryId,
        channel: "email",
        type: "assignment_assigned",
        status: "pending",
        subject: `New Assignment - Order-${orderNumber}`,
        message: emailMessage,
        metadata: {
          email: newNotary.email,
          assignment_id: id,
          control_number: orderNumber,
          order_link: orderLink,
        },
        attempts: 0,
      });
    }

    if (notificationRows.length > 0) {
      await supabase.from("notification_queue").insert(notificationRows);
    }
  }

  return NextResponse.redirect(new URL(`/dashboard/orders/${id}`, request.url));
}