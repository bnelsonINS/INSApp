import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://indiananotarysolutions.com"
  ).replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_INS_PRO_PRICE_ID;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe secret key is not configured." },
        { status: 500 },
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "INS Pro Stripe price ID is not configured." },
        { status: 500 },
      );
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: existingSubscription } = await supabaseAdmin
      .from("notary_subscriptions")
      .select("plan, status, stripe_customer_id")
      .eq("notary_id", user.id)
      .maybeSingle();

    const isAlreadyPro =
      existingSubscription?.plan === "pro" &&
      ["active", "trialing"].includes(
        String(existingSubscription?.status ?? "").toLowerCase(),
      );

    if (isAlreadyPro) {
      return NextResponse.redirect(new URL("/notary/dashboard", request.url));
    }

    const stripe = new Stripe(stripeSecretKey);
    const baseUrl = getBaseUrl();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existingSubscription?.stripe_customer_id || undefined,
      customer_email: existingSubscription?.stripe_customer_id
        ? undefined
        : profile.email || user.email || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/notary/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/notary/pro/cancel`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      subscription_data: {
        metadata: {
          notary_id: user.id,
          email: profile.email || user.email || "",
          source: "ins_pro_upgrade",
        },
      },
      metadata: {
        notary_id: user.id,
        email: profile.email || user.email || "",
        source: "ins_pro_upgrade",
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 },
      );
    }

    return NextResponse.redirect(checkoutSession.url, { status: 303 });
  } catch (error) {
    console.error("Stripe checkout session error:", error);

    return NextResponse.json(
      { error: "Unable to start INS Pro checkout." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST to create a checkout session." },
    { status: 405 },
  );
}
