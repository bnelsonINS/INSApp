import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: offer, error: offerError } = await supabase
    .from("assignment_offers")
    .select("id, notary_id, status, expires_at")
    .eq("id", offerId)
    .single();

  if (offerError || !offer) {
    return NextResponse.redirect(new URL("/notary/offers", request.url));
  }

  if (offer.notary_id !== user.id) {
    return NextResponse.redirect(new URL("/notary/assignments", request.url));
  }

  const isExpired =
    offer.expires_at && new Date(offer.expires_at).getTime() < Date.now();

  if (isExpired || offer.status !== "sent") {
    return NextResponse.redirect(
      new URL(`/notary/offers/${offerId}`, request.url)
    );
  }

  await supabase
    .from("assignment_offers")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", offerId);

  await supabase.from("assignment_offer_events").insert({
    assignment_offer_id: offerId,
    event_type: "declined",
    notary_id: user.id,
    metadata: {},
  });

  return NextResponse.redirect(
    new URL(`/notary/offers/${offerId}`, request.url)
  );
}