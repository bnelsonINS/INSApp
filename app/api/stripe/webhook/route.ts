import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | string;

type StripeSubscriptionWithItems = Stripe.Subscription & {
  items?: {
    data?: Array<{
      price?: {
        id?: string | null;
      } | null;
      current_period_start?: number | null;
      current_period_end?: number | null;
    }>;
  };
};

type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | { id?: string | null } | null;
};

function stripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value) throw new Error("STRIPE_SECRET_KEY is missing.");
  return value;
}

function webhookSecret() {
  const value = process.env.STRIPE_WEBHOOK_SECRET;
  if (!value) throw new Error("STRIPE_WEBHOOK_SECRET is missing.");
  return value;
}

function normalizeStripeTime(value: number | null | undefined) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function subscriptionPlanAndStatus(status: SubscriptionStatus) {
  const cleanStatus = String(status || "").toLowerCase();

  if (["active", "trialing"].includes(cleanStatus)) {
    return { plan: "pro", status: cleanStatus };
  }

  if (["past_due", "unpaid", "incomplete"].includes(cleanStatus)) {
    return { plan: "pro", status: cleanStatus };
  }

  return { plan: "free", status: "inactive" };
}

function getSubscriptionIdFromValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

async function upsertNotarySubscriptionFromSubscription(
  subscription: StripeSubscriptionWithItems,
  fallbackNotaryId?: string | null,
) {
  const notaryId = String(
    subscription.metadata?.notary_id || fallbackNotaryId || "",
  ).trim();

  if (!notaryId) {
    console.error("Stripe subscription missing notary_id metadata:", {
      subscription_id: subscription.id,
      metadata: subscription.metadata,
      fallbackNotaryId,
    });
    return;
  }

  const subscriptionItem = subscription.items?.data?.[0];
  const priceId = subscriptionItem?.price?.id || null;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || null;

  const { plan, status } = subscriptionPlanAndStatus(subscription.status);

  const payload = {
    notary_id: notaryId,
    plan,
    status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_end: normalizeStripeTime(subscriptionItem?.current_period_end),
    updated_at: new Date().toISOString(),
  };

  console.log("Upserting notary subscription from Stripe:", {
    notary_id: notaryId,
    plan,
    status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    current_period_end: payload.current_period_end,
  });

  const { error } = await supabaseAdmin
    .from("notary_subscriptions")
    .upsert(payload, { onConflict: "notary_id" });

  if (error) {
    console.error(
      "notary_subscriptions upsert error:",
      JSON.stringify(error, null, 2),
    );
    throw error;
  }
}

async function upsertNotarySubscriptionFromStripeSubscription(
  stripe: Stripe,
  subscriptionId: string,
  fallbackNotaryId?: string | null,
) {
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["customer", "items.data.price"],
  })) as StripeSubscriptionWithItems;

  await upsertNotarySubscriptionFromSubscription(subscription, fallbackNotaryId);
}

async function markSubscriptionInactiveBySubscriptionId(subscriptionId: string) {
  const { error } = await supabaseAdmin
    .from("notary_subscriptions")
    .update({
      plan: "free",
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error(
      "notary_subscriptions inactive update error:",
      JSON.stringify(error, null, 2),
    );
    throw error;
  }
}

export async function POST(request: Request) {
  const stripe = new Stripe(stripeSecretKey());
  const body = await request.text();
  const headerStore = await headers();
  const signature = headerStore.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret());
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Webhook signature verification failed." },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const subscriptionId = getSubscriptionIdFromValue(session.subscription);

        if (!subscriptionId) {
          console.error("Checkout session completed without subscription ID:", {
            session_id: session.id,
            metadata: session.metadata,
            client_reference_id: session.client_reference_id,
          });
          break;
        }

        await upsertNotarySubscriptionFromStripeSubscription(
          stripe,
          subscriptionId,
          session.metadata?.notary_id || session.client_reference_id || null,
        );

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as StripeSubscriptionWithItems;

        await upsertNotarySubscriptionFromSubscription(
          subscription,
          subscription.metadata?.notary_id || null,
        );

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await markSubscriptionInactiveBySubscriptionId(subscription.id);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as StripeInvoiceWithSubscription;
        const subscriptionId = getSubscriptionIdFromValue(invoice.subscription);

        if (subscriptionId) {
          const { error } = await supabaseAdmin
            .from("notary_subscriptions")
            .update({
              plan: "pro",
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            console.error(
              "notary_subscriptions past_due update error:",
              JSON.stringify(error, null, 2),
            );
            throw error;
          }
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Stripe webhooks must use POST." },
    { status: 405 },
  );
}
