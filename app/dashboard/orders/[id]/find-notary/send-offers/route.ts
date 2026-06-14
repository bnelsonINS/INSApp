import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../../src/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const formData = await request.formData();
  const selectedNotaryIds = formData.getAll("notary_ids").map(String);

  if (selectedNotaryIds.length === 0) {
    return NextResponse.redirect(
      new URL(`/dashboard/orders/${id}/find-notary`, request.url)
    );
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      `
      id,
      control_number,
      borrower_name,
      signing_date,
      signing_time,
      signing_address,
      signing_city,
      signing_state,
      signing_zip,
      signing_county,
      notary_fee,
      assigned_notary_id
    `
    )
    .eq("id", id)
    .single();

  if (!assignment) {
    return NextResponse.redirect(new URL("/dashboard/orders", request.url));
  }

  if (assignment.assigned_notary_id) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/orders/${id}/find-notary?error=already-assigned`,
        request.url
      )
    );
  }

  const { data: notaries } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", selectedNotaryIds);

  const notaryById = new Map((notaries || []).map((n) => [n.id, n]));

  const { data: existingOffers } = await supabase
    .from("assignment_offers")
    .select("round_number")
    .eq("assignment_id", id);

  const highestRound =
    existingOffers && existingOffers.length > 0
      ? Math.max(...existingOffers.map((offer) => offer.round_number || 0))
      : 0;

  const nextRound = highestRound + 1;

  const { data: rules } = await supabase
    .from("assignment_rules")
    .select("default_offer_expiration_minutes")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const expirationMinutes = rules?.default_offer_expiration_minutes ?? 30;
  const expiresAt = new Date(
    Date.now() + expirationMinutes * 60 * 1000
  ).toISOString();

  const now = new Date().toISOString();

  const offersToInsert = selectedNotaryIds.map((notaryId) => ({
    assignment_id: id,
    notary_id: notaryId,
    round_number: nextRound,
    status: "sent",
    offered_fee: assignment.notary_fee,
    sent_at: now,
    expires_at: expiresAt,
    response_token: crypto.randomUUID(),
  }));

  const { data: insertedOffers, error: offerError } = await supabase
    .from("assignment_offers")
    .insert(offersToInsert)
    .select("id, assignment_id, notary_id, response_token");

  if (offerError) {
    console.error("Send offers error:", offerError);
    return NextResponse.redirect(
      new URL(`/dashboard/orders/${id}/find-notary`, request.url)
    );
  }

  if (insertedOffers && insertedOffers.length > 0) {
    const eventsToInsert = insertedOffers.map((offer) => ({
      assignment_offer_id: offer.id,
      assignment_id: offer.assignment_id,
      notary_id: offer.notary_id,
      event_type: "offer_sent",
      actor_id: user.id,
      actor_role: "admin",
      message: `Round ${nextRound} offer sent.`,
      metadata: {
        round_number: nextRound,
        expires_at: expiresAt,
        offered_fee: assignment.notary_fee,
      },
    }));

    await supabase.from("assignment_offer_events").insert(eventsToInsert);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

    const notificationsToInsert = insertedOffers
      .map((offer) => {
        const notary = notaryById.get(offer.notary_id);

        if (!notary?.email) return null;

        const offerUrl = `${baseUrl}/offers/${offer.id}?token=${offer.response_token}`;

        const subject = `New Signing Offer - ${
          assignment.control_number ?? "INS Order"
        }`;

        const message = [
          `Hello ${notary.full_name ?? "Notary"},`,
          "",
          "Indiana Notary Solutions has a new signing offer available for you.",
          "",
          `Control Number: ${assignment.control_number ?? "Not assigned"}`,
          `Borrower: ${assignment.borrower_name ?? "Not provided"}`,
          `Signing Date: ${assignment.signing_date ?? "Not scheduled"}`,
          `Signing Time: ${assignment.signing_time ?? "Not scheduled"}`,
          `Location: ${assignment.signing_address ?? ""}, ${
            assignment.signing_city ?? ""
          }, ${assignment.signing_state ?? ""} ${
            assignment.signing_zip ?? ""
          }`,
          `County: ${assignment.signing_county ?? "Not provided"}`,
          `Fee: ${
            assignment.notary_fee ? `$${assignment.notary_fee}` : "Not set"
          }`,
          "",
          `This offer expires at: ${new Date(expiresAt).toLocaleString(
            "en-US"
          )}`,
          "",
          "Review this offer here:",
          offerUrl,
          "",
          "You will be able to accept, decline, or counter from that page.",
          "",
          "Indiana Notary Solutions",
        ].join("\n");

        return {
          user_id: offer.notary_id,
          channel: "email",
          type: "assignment_offer_sent",
          status: "pending",
          subject,
          message,
          metadata: {
            email: notary.email,
            recipient_email: notary.email,
            recipient_name: notary.full_name,
            assignment_id: offer.assignment_id,
            assignment_offer_id: offer.id,
            notary_id: offer.notary_id,
            round_number: nextRound,
            expires_at: expiresAt,
            offered_fee: assignment.notary_fee,
            control_number: assignment.control_number,
            offer_url: offerUrl,
          },
        };
      })
      .filter(
        (notification): notification is NonNullable<typeof notification> =>
          notification !== null
      );

    if (notificationsToInsert.length > 0) {
      const { error: notificationError } = await supabase
        .from("notification_queue")
        .insert(notificationsToInsert);

      if (notificationError) {
        console.error("Notification queue insert error:", notificationError);
      }
    }
  }

  return NextResponse.redirect(
    new URL(`/dashboard/orders/${id}/find-notary`, request.url)
  );
}