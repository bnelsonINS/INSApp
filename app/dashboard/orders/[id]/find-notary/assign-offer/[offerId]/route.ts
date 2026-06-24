import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../../../../src/lib/supabase-admin";

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

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://indiananotarysolutions.com"
  ).replace(/\/$/, "");
}

function buildOrderLink(assignmentId: string) {
  const redirectTarget = `/notary/assignments/${assignmentId}`;

  return `${getBaseUrl()}/login?redirectTo=${encodeURIComponent(
    redirectTarget
  )}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  const { id, offerId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: assignment } = await supabaseAdmin
    .from("assignments")
    .select(
      `
      id,
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

  if (!assignment) {
    return NextResponse.redirect(new URL("/dashboard/orders", request.url));
  }

  if (assignment.assigned_notary_id) {
    return NextResponse.redirect(
      new URL(`/dashboard/orders/${id}/find-notary`, request.url)
    );
  }

  const { data: offer } = await supabaseAdmin
    .from("assignment_offers")
    .select(
      "id, assignment_id, notary_id, status, offered_fee, counter_fee"
    )
    .eq("id", offerId)
    .eq("assignment_id", id)
    .single();

  if (
    !offer ||
    !["accepted", "countered"].includes(String(offer.status).toLowerCase())
  ) {
    return NextResponse.redirect(
      new URL(`/dashboard/orders/${id}/find-notary`, request.url)
    );
  }

  const finalNotaryFee =
    offer.status === "countered" && offer.counter_fee !== null
      ? offer.counter_fee
      : offer.offered_fee;

  const { data: newNotary } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", offer.notary_id)
    .single();

  const now = new Date().toISOString();

  await supabaseAdmin
    .from("assignments")
    .update({
      assigned_notary_id: offer.notary_id,
      notary_id: offer.notary_id,
      notary_fee: finalNotaryFee,
      status: "assigned",
      assigned_at: now,
      updated_at: now,
    })
    .eq("id", id);

  await supabaseAdmin
    .from("assignment_offers")
    .update({
      status: "assigned",
      responded_at: now,
    })
    .eq("id", offerId);

  await supabaseAdmin
    .from("assignment_offers")
    .update({
      status: "closed",
    })
    .eq("assignment_id", id)
    .neq("id", offerId)
    .in("status", ["sent", "accepted", "countered"]);

  await supabaseAdmin.from("assignment_offer_events").insert({
    assignment_offer_id: offerId,
    assignment_id: id,
    notary_id: offer.notary_id,
    event_type: "assigned",
    actor_id: user.id,
    actor_role: "admin",
    message: "Admin assigned this notary to the signing.",
    metadata: {
      assigned_at: now,
      final_notary_fee: finalNotaryFee,
      original_offer_status: offer.status,
    },
  });

  if (newNotary?.email) {
    const orderNumber = assignment.control_number || id;
    const orderLink = buildOrderLink(id);

    const { data: signers } = await supabaseAdmin
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
        : assignment.borrower_name || "Not listed";

    const emailMessage = `
Hello ${newNotary.full_name || "there"},

You have been assigned to Order-${orderNumber}.

Order Details

Order Number: Order-${orderNumber}
Status: assigned
Signing Type: ${assignment.signing_type || "Not listed"}
Signing Date: ${formatDate(assignment.signing_date)}
Signing Time: ${formatTime(assignment.signing_time)}
Signing Address: ${assignment.signing_address || "Not listed"}
City/State/ZIP: ${assignment.signing_city || ""}, ${
      assignment.signing_state || ""
    } ${assignment.signing_zip || ""}
Notary Fee: ${formatMoney(finalNotaryFee ?? assignment.notary_fee ?? assignment.fee)}
Documents URL: ${assignment.documents_url || "Not listed"}

Signer Information

${signerList}

Borrower Phone: ${assignment.borrower_phone || "Not listed"}
Borrower Email: ${assignment.borrower_email || "Not listed"}

Special Instructions

${assignment.special_instructions || "No special instructions listed."}

Please log in to your Indiana Notary Solutions dashboard to review the full assignment details.

Indiana Notary Solutions
`.trim();

    await supabaseAdmin.from("notification_queue").insert({
      user_id: offer.notary_id,
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
        cta_label: "View Assignment",
      },
      attempts: 0,
    });

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
      console.error("Failed to process assignment notification:", error);
    }
  }

  return NextResponse.redirect(new URL(`/dashboard/orders/${id}`, request.url));
}