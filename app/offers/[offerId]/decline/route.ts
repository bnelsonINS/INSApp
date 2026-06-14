import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: offer, error: offerError } = await supabase
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

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, assigned_notary_id")
    .eq("id", offer.assignment_id)
    .single();

  if (assignment?.assigned_notary_id) {
    return NextResponse.redirect(
      new URL(`/offers/${offerId}?token=${token ?? ""}`, request.url)
    );
  }

  const isExpired =
    offer.expires_at && new Date(offer.expires_at).getTime() < Date.now();

  if (isExpired || offer.status !== "sent") {
    return NextResponse.redirect(
      new URL(`/offers/${offerId}?token=${token ?? ""}`, request.url)
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
    notary_id: offer.notary_id,
    metadata: {},
  });

  return NextResponse.redirect(
    new URL(`/offers/${offerId}?token=${token ?? ""}`, request.url)
  );
}