import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  const formData = await request.formData();
  const declineReason = String(formData.get("decline_reason") || "").trim();
  const declineNotes = String(formData.get("decline_notes") || "").trim();

  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";

  if (!declineReason) {
    return NextResponse.redirect(
      new URL(`/offers/${offerId}${tokenQuery}`, request.url)
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: offer, error: offerError } = await supabaseAdmin
    .from("assignment_offers")
    .select("id, assignment_id, notary_id, status, expires_at, response_token")
    .eq("id", offerId)
    .single();

  if (offerError || !offer) {
    return NextResponse.redirect(new URL(`/offers/${offerId}`, request.url));
  }

  const hasLoginAccess = user && offer.notary_id === user.id;
  const hasTokenAccess = token && offer.response_token === token;

  if (!hasLoginAccess && !hasTokenAccess) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: assignment } = await supabaseAdmin
    .from("assignments")
    .select("id, assigned_notary_id")
    .eq("id", offer.assignment_id)
    .single();

  if (assignment?.assigned_notary_id) {
    return NextResponse.redirect(
      new URL(`/offers/${offerId}${tokenQuery}`, request.url)
    );
  }

  const isExpired =
    offer.expires_at && new Date(offer.expires_at).getTime() < Date.now();

  if (isExpired || offer.status !== "sent") {
    return NextResponse.redirect(
      new URL(`/offers/${offerId}${tokenQuery}`, request.url)
    );
  }

  const respondedAt = new Date().toISOString();

  await supabaseAdmin
    .from("assignment_offers")
    .update({
      status: "declined",
      decline_reason: declineReason,
      decline_notes: declineNotes || null,
      responded_at: respondedAt,
    })
    .eq("id", offerId);

  await supabaseAdmin.from("assignment_offer_events").insert({
    assignment_offer_id: offerId,
    event_type: "declined",
    notary_id: offer.notary_id,
    metadata: {
      decline_reason: declineReason,
      decline_notes: declineNotes || null,
      responded_at: respondedAt,
    },
  });

  const responseQuery = token
    ? `?token=${encodeURIComponent(token)}&response=declined`
    : "?response=declined";

  return NextResponse.redirect(
    new URL(`/offers/${offerId}${responseQuery}`, request.url)
  );
}