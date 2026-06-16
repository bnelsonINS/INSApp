import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../../src/lib/supabase-server";

function normalizeCounty(value: string | null) {
  return (value || "").toLowerCase().replace(" county", "").trim();
}

function getCurrentMonthStart() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-01`;
}

function getScoreStatus(score: number) {
  if (score >= 95) return "Elite";
  if (score >= 90) return "Preferred";
  if (score >= 80) return "Standard";
  if (score >= 70) return "Watch List";
  return "Restricted";
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://indiananotarysolutions.com"
  ).replace(/\/$/, "");
}

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
  const selectedNotaryIds = formData
    .getAll("notary_ids")
    .map(String)
    .filter(Boolean);

  const allowLowScoreOverride =
    formData.get("allow_low_score_override") === "true";

  if (selectedNotaryIds.length === 0) {
    return NextResponse.redirect(
      new URL(`/dashboard/orders/${id}/find-notary?error=no-notaries`, request.url)
    );
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .select(`
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
    `)
    .eq("id", id)
    .single();

  if (!assignment) {
    return NextResponse.redirect(new URL("/dashboard/orders", request.url));
  }

  if (assignment.assigned_notary_id) {
    return NextResponse.redirect(
      new URL(`/dashboard/orders/${id}/find-notary?error=already-assigned`, request.url)
    );
  }

  const { data: notaries } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      home_zip,
      travel_radius_miles,
      approval_status,
      is_active,
      role
    `)
    .in("id", selectedNotaryIds)
    .eq("role", "notary")
    .eq("is_active", true);

  const validNotaries = notaries || [];

  if (validNotaries.length === 0) {
    return NextResponse.redirect(
      new URL(`/dashboard/orders/${id}/find-notary?error=no-valid-notaries`, request.url)
    );
  }

  const validNotaryIds = validNotaries.map((notary) => notary.id);
  const currentMonthStart = getCurrentMonthStart();

  const [
    { data: monthlyScores },
    { data: metrics },
    { data: countyCoverage },
    { data: zipCoverage },
  ] = await Promise.all([
    supabase
      .from("notary_monthly_scores")
      .select("notary_id, current_score, month_start")
      .eq("month_start", currentMonthStart)
      .in("notary_id", validNotaryIds),

    supabase
      .from("notary_performance_metrics")
      .select("notary_id, total_assignments_completed, response_rate")
      .in("notary_id", validNotaryIds),

    supabase
      .from("notary_coverage_counties")
      .select("user_id, county")
      .in("user_id", validNotaryIds),

    supabase
      .from("notary_coverage_zip_codes")
      .select("user_id, zip_code")
      .in("user_id", validNotaryIds),
  ]);

  const scoreByNotaryId = new Map(
    (monthlyScores || []).map((score) => [
      score.notary_id,
      score.current_score ?? 100,
    ])
  );

  const metricByNotaryId = new Map(
    (metrics || []).map((metric) => [metric.notary_id, metric])
  );

  const jobZip = (assignment.signing_zip || "").trim();
  const jobCounty = normalizeCounty(assignment.signing_county);

  const rankedNotaries = validNotaries
    .filter((notary) => {
      const approval = (notary.approval_status || "").toLowerCase();
      return approval === "approved";
    })
    .map((notary) => {
      const score = scoreByNotaryId.get(notary.id) ?? 100;
      const metric = metricByNotaryId.get(notary.id);

      const zipMatches =
        zipCoverage?.some(
          (zip) => zip.user_id === notary.id && zip.zip_code === jobZip
        ) ?? false;

      const countyMatches =
        countyCoverage?.some(
          (county) =>
            county.user_id === notary.id &&
            normalizeCounty(county.county) === jobCounty
        ) ?? false;

      const distanceRank = zipMatches ? 1 : countyMatches ? 2 : 3;

      return {
        ...notary,
        score,
        scoreStatus: getScoreStatus(score),
        distanceRank,
        zipMatches,
        countyMatches,
        lifetimeClosings: metric?.total_assignments_completed ?? 0,
        responseRate: metric?.response_rate ?? 0,
        isRestricted: score < 70,
      };
    })
    .sort((a, b) => {
      if (a.distanceRank !== b.distanceRank) return a.distanceRank - b.distanceRank;
      if (b.score !== a.score) return b.score - a.score;
      if (b.lifetimeClosings !== a.lifetimeClosings) {
        return b.lifetimeClosings - a.lifetimeClosings;
      }
      return b.responseRate - a.responseRate;
    });

  const restrictedNotaries = rankedNotaries.filter(
    (notary) => notary.isRestricted
  );

  if (restrictedNotaries.length > 0 && !allowLowScoreOverride) {
    return NextResponse.redirect(
      new URL(`/dashboard/orders/${id}/find-notary?error=restricted-notary`, request.url)
    );
  }

  const notaryById = new Map(rankedNotaries.map((notary) => [notary.id, notary]));

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

  const offersToInsert = rankedNotaries.map((notary) => ({
    assignment_id: id,
    notary_id: notary.id,
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
      new URL(`/dashboard/orders/${id}/find-notary?error=send-failed`, request.url)
    );
  }

  if (insertedOffers && insertedOffers.length > 0) {
    const eventsToInsert = insertedOffers.map((offer) => {
      const notary = notaryById.get(offer.notary_id);

      return {
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
          score_at_offer: notary?.score ?? 100,
          score_status_at_offer: notary?.scoreStatus ?? "Elite",
          distance_rank_at_offer: notary?.distanceRank ?? null,
          zip_match_at_offer: notary?.zipMatches ?? false,
          county_match_at_offer: notary?.countyMatches ?? false,
          low_score_override_used:
            Boolean(notary?.isRestricted) && allowLowScoreOverride,
        },
      };
    });

    await supabase.from("assignment_offer_events").insert(eventsToInsert);

    const baseUrl = getBaseUrl();

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
          }, ${assignment.signing_state ?? ""} ${assignment.signing_zip ?? ""}`,
          `County: ${assignment.signing_county ?? "Not provided"}`,
          `Fee: ${assignment.notary_fee ? `$${assignment.notary_fee}` : "Not set"}`,
          "",
          `This offer expires at: ${new Date(expiresAt).toLocaleString("en-US")}`,
          "",
          "Please use the button below to review and respond to this signing offer.",
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
            cta_label: "Review Signing Offer",
            score_at_offer: notary.score,
            score_status_at_offer: notary.scoreStatus,
            distance_rank_at_offer: notary.distanceRank,
            zip_match_at_offer: notary.zipMatches,
            county_match_at_offer: notary.countyMatches,
            low_score_override_used:
              notary.isRestricted && allowLowScoreOverride,
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
    new URL(`/dashboard/orders/${id}/find-notary?success=offers-sent`, request.url)
  );
}