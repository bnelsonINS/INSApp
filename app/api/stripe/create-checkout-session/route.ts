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
    "https://www.indiananotarysolutions.com"
  ).replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_INS_PRO_PRICE_ID;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe secret key is not configured." },
        { status: 500 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "INS Pro Stripe price ID is not configured." },
        { status: 500 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("INS Pro checkout profile lookup error:", profileError);
      return NextResponse.json(
        { error: "Unable to load profile for checkout." },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: existingSubscription, error: subscriptionError } =
      await supabaseAdmin
        .from("notary_subscriptions")
        .select("plan, status, stripe_customer_id")
        .eq("notary_id", user.id)
        .maybeSingle();

    if (subscriptionError) {
      console.error(
        "INS Pro checkout subscription lookup error:",
        subscriptionError
      );
      return NextResponse.json(
        { error: "Unable to load subscription for checkout." },
        { status: 500 }
      );
    }

    const isAlreadyPro =
      existingSubscription?.plan === "pro" &&
      ["active", "trialing"].includes(
        String(existingSubscription?.status ?? "").toLowerCase()
      );

    if (isAlreadyPro) {
      return NextResponse.redirect(new URL("/notary/dashboard", request.url));
    }

    const stripe = new Stripe(stripeSecretKey);
    const baseUrl = getBaseUrl();

    const notaryId = String(user.id);
    const email = String(profile.email || user.email || "");
    const source = "ins_pro_upgrade";

    const metadata = {
      notary_id: notaryId,
      email,
      source,
    };

    console.log("Creating INS Pro checkout session:", metadata);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",

      automatic_tax: {
        enabled: true,
      },

      billing_address_collection: "required",

      tax_id_collection: {
        enabled: true,
      },

      customer: existingSubscription?.stripe_customer_id || undefined,

      customer_email: existingSubscription?.stripe_customer_id
        ? undefined
        : email || undefined,

      client_reference_id: notaryId,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      metadata,

      subscription_data: {
        metadata,
      },

      success_url: `${baseUrl}/notary/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/notary/pro/cancel`,
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(checkoutSession.url, { status: 303 });
  } catch (error) {
    console.error("Stripe checkout session error:", error);

    return NextResponse.json(
      { error: "Unable to start INS Pro checkout." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST to create a checkout session." },
    { status: 405 }
  );
}