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

  const formData = await request.formData();
  const counterFeeRaw = String(formData.get("counter_fee") || "");
  const counterFee = Number(counterFeeRaw);

  if (!counterFee || Number.isNaN(counterFee) || counterFee <= 0) {
    return NextResponse.redirect(
      new URL(`/notary/offers/${offerId}?error=invalid-counter`, request.url)
    );
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
    return NextResponse.redirect(new URL("/notary/orders", request.url));
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
      status: "countered",
      counter_fee: counterFee,
      responded_at: new Date().toISOString(),
    })
    .eq("id", offerId);

  await supabase.from("assignment_offer_events").insert({
    assignment_offer_id: offerId,
    event_type: "countered",
    notary_id: user.id,
    metadata: {
      counter_fee: counterFee,
    },
  });

  return NextResponse.redirect(
    new URL(`/notary/offers/${offerId}`, request.url)
  );
}