import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const supabase = await createSupabaseServerClient();

  const token = request.nextUrl.searchParams.get("token");
  const formData = await request.formData();

  const declineReason = String(formData.get("decline_reason") || "").trim();
  const declineNotes = String(formData.get("decline_notes") || "").trim();

  if (!declineReason) {
    return NextResponse.redirect(
      new URL(
        `/notary/offers/${offerId}${
          token ? `?token=${encodeURIComponent(token)}` : ""
        }`,
        request.url
      )
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: offer, error: offerError } = await supabase
    .from("assignment_offers")
    .select("id, notary_id, status, expires_at, response_token")
    .eq("id", offerId)
    .single();

  if (offerError || !offer) {
    return NextResponse.redirect(new URL("/notary/offers", request.url));
  }

  const hasLoginAccess = user && offer.notary_id === user.id;
  const hasTokenAccess = token && offer.response_token === token;

  if (!hasLoginAccess && !hasTokenAccess) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isExpired =
    offer.expires_at && new Date(offer.expires_at).getTime() < Date.now();

  if (isExpired || offer.status !== "sent") {
    return NextResponse.redirect(
      new URL(
        `/notary/offers/${offerId}${
          token ? `?token=${encodeURIComponent(token)}` : ""
        }`,
        request.url
      )
    );
  }

  const respondedAt = new Date().toISOString();

  await supabase
    .from("assignment_offers")
    .update({
      status: "declined",
      decline_reason: declineReason,
      decline_notes: declineNotes || null,
      responded_at: respondedAt,
    })
    .eq("id", offerId);

  await supabase.from("assignment_offer_events").insert({
    assignment_offer_id: offerId,
    event_type: "declined",
    notary_id: offer.notary_id,
    metadata: {
      decline_reason: declineReason,
      decline_notes: declineNotes || null,
      responded_at: respondedAt,
    },
  });

  return NextResponse.redirect(
    new URL(
      `/notary/offers/${offerId}${
        token ? `?token=${encodeURIComponent(token)}` : ""
      }`,
      request.url
    )
  );
}