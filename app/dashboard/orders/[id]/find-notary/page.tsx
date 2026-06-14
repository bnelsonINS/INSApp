import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

function normalizeCounty(value: string | null) {
  return (value || "").toLowerCase().replace(" county", "").trim();
}

function formatMoney(amount: number | null) {
  if (amount === null || amount === undefined) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return "Not scheduled";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "Time not set";
  const [hours, minutes] = time.split(":");
  const d = new Date();
  d.setHours(Number(hours), Number(minutes));
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function FindNotaryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      `
      id,
      control_number,
      status,
      signing_type,
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

  if (!assignment) redirect("/dashboard/orders");

  const hasAssignedNotary = Boolean(assignment.assigned_notary_id);

  const { data: assignedNotary } = assignment.assigned_notary_id
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", assignment.assigned_notary_id)
        .single()
    : { data: null };

  const { data: existingOffers } = await supabase
    .from("assignment_offers")
    .select(
      `
      id,
      assignment_id,
      notary_id,
      round_number,
      status,
      offered_fee,
      sent_at,
      expires_at
    `
    )
    .eq("assignment_id", assignment.id)
    .order("round_number", { ascending: true })
    .order("sent_at", { ascending: false });

  const acceptedOffers =
    existingOffers?.filter((offer) => offer.status === "accepted") ?? [];

  const highestRound =
    existingOffers && existingOffers.length > 0
      ? Math.max(...existingOffers.map((offer) => offer.round_number || 0))
      : 0;

  const nextRound = highestRound + 1;

  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  const currentYear = new Date().getFullYear();

  const { data: notaries } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      email,
      home_zip,
      travel_radius_miles,
      approval_status,
      is_active,
      role
    `
    )
    .eq("role", "notary")
    .eq("is_active", true);

  const notaryById = new Map((notaries || []).map((n) => [n.id, n]));

  const notaryIds = (notaries || []).map((n) => n.id);
  const safeIds =
    notaryIds.length > 0 ? notaryIds : ["00000000-0000-0000-0000-000000000000"];

  const [
    { data: countyCoverage },
    { data: zipCoverage },
    { data: scores },
    { data: metrics },
  ] = await Promise.all([
    supabase
      .from("notary_coverage_counties")
      .select("user_id, county")
      .in("user_id", safeIds),

    supabase
      .from("notary_coverage_zip_codes")
      .select("user_id, zip_code")
      .in("user_id", safeIds),

    supabase
      .from("notary_quarterly_scores")
      .select("notary_id, current_score")
      .eq("quarter", currentQuarter)
      .eq("year", currentYear)
      .in("notary_id", safeIds),

    supabase
      .from("notary_performance_metrics")
      .select("notary_id, total_assignments_completed, response_rate")
      .in("notary_id", safeIds),
  ]);

  const scoreByNotaryId = new Map(
    (scores || []).map((score) => [score.notary_id, score.current_score])
  );

  const jobZip = (assignment.signing_zip || "").trim();
  const jobCounty = normalizeCounty(assignment.signing_county);

  const candidates = (notaries || [])
    .filter((notary) => {
      const approval = (notary.approval_status || "").toLowerCase();
      return approval === "approved";
    })
    .map((notary) => {
      const zipMatches =
        zipCoverage?.some(
          (z) => z.user_id === notary.id && z.zip_code === jobZip
        ) ?? false;

      const countyMatches =
        countyCoverage?.some(
          (c) =>
            c.user_id === notary.id &&
            normalizeCounty(c.county) === jobCounty
        ) ?? false;

      const score = scoreByNotaryId.get(notary.id) ?? 100;

      const metric = metrics?.find((m) => m.notary_id === notary.id);

      const matchReasons = [
        zipMatches ? "ZIP" : null,
        countyMatches ? "County" : null,
      ].filter(Boolean) as string[];

      const latestOffer = existingOffers?.find(
        (offer) => offer.notary_id === notary.id
      );

      return {
        ...notary,
        zipMatches,
        countyMatches,
        matchReasons,
        matchStrength: matchReasons.length,
        score,
        lifetimeClosings: metric?.total_assignments_completed ?? 0,
        responseRate: metric?.response_rate ?? 0,
        latestOffer,
      };
    })
    .filter((candidate) => candidate.matchStrength > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchStrength !== a.matchStrength) {
        return b.matchStrength - a.matchStrength;
      }
      if (b.lifetimeClosings !== a.lifetimeClosings) {
        return b.lifetimeClosings - a.lifetimeClosings;
      }
      return b.responseRate - a.responseRate;
    });

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Assignment Workspace
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Find a Notary
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Select qualified candidates and send assignment offers by round.
          </p>
        </div>

        <Link
          href={`/dashboard/orders/${assignment.id}`}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
        >
          Back to Order
        </Link>
      </div>

      {hasAssignedNotary ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-bold">This signing has already been assigned.</p>

          <p className="mt-1">
            Assigned to{" "}
            <span className="font-bold">
              {assignedNotary?.full_name ?? "Unknown Notary"}
            </span>
            {assignedNotary?.email ? <span> ({assignedNotary.email})</span> : null}
            .
          </p>

          <Link
            href={`/dashboard/orders/${assignment.id}`}
            className="mt-3 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          >
            View Order
          </Link>
        </div>
      ) : acceptedOffers.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          <p className="font-bold">
            {acceptedOffers.length} notary response
            {acceptedOffers.length === 1 ? "" : "s"} accepted.
          </p>

          <p className="mt-1">
            Review the offer history below and assign the notary you want. New
            rounds are still allowed until a notary is assigned.
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
        <div className="grid gap-6 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-100">
              Control Number
            </p>
            <p className="mt-1 text-lg font-bold">
              {assignment.control_number ?? "Not assigned"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-blue-100">
              Borrower
            </p>
            <p className="mt-1 text-lg font-bold">
              {assignment.borrower_name ?? "Unnamed Borrower"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-blue-100">
              Signing
            </p>
            <p className="mt-1 text-lg font-bold">
              {formatDate(assignment.signing_date)} •{" "}
              {formatTime(assignment.signing_time)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-blue-100">
              Current Fee
            </p>
            <p className="mt-1 text-lg font-bold">
              {formatMoney(assignment.notary_fee)}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-blue-300/30 pt-6 text-sm font-semibold">
          {assignment.signing_address ?? "Address not set"},{" "}
          {assignment.signing_city ?? "City"},{" "}
          {assignment.signing_state ?? "State"}{" "}
          {assignment.signing_zip ?? "ZIP"} •{" "}
          {assignment.signing_county ?? "County not set"}
        </div>
      </section>

      <form
        action={`/dashboard/orders/${assignment.id}/find-notary/send-offers`}
        method="POST"
      >
        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Candidate Results
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {candidates.length} matching notary candidate(s) found.
                </p>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h3 className="text-lg font-bold text-slate-900">
                  No matching notaries found.
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  No approved active notaries currently match this order by ZIP
                  or county.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Select</th>
                      <th className="px-4 py-3">Notary</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Match</th>
                      <th className="px-4 py-3">Lifetime</th>
                      <th className="px-4 py-3">Response</th>
                      <th className="px-4 py-3">Offer</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {candidates.map((candidate) => (
                      <tr
                        key={candidate.id}
                        className={hasAssignedNotary ? "opacity-60" : ""}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            name="notary_ids"
                            value={candidate.id}
                            disabled={hasAssignedNotary}
                            className="h-4 w-4 rounded border-slate-300 disabled:cursor-not-allowed"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900">
                            {candidate.full_name ?? "Unnamed Notary"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Home ZIP: {candidate.home_zip ?? "Not set"} •
                            Radius:{" "}
                            {candidate.travel_radius_miles ?? "Not set"} mi
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            {candidate.score}%
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {candidate.matchStrength > 1 && (
                              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                                ⭐ Multiple
                              </span>
                            )}
                            {candidate.zipMatches && (
                              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                                ZIP
                              </span>
                            )}
                            {candidate.countyMatches && (
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                County
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-700">
                          {candidate.lifetimeClosings}
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-700">
                          {candidate.responseRate}%
                        </td>

                        <td className="px-4 py-4">
                          {candidate.latestOffer ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              Round {candidate.latestOffer.round_number}{" "}
                              {candidate.latestOffer.status}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              Not sent
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Assignment Summary
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Fee</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(assignment.notary_fee)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-slate-900">
                    {hasAssignedNotary
                      ? "Assigned"
                      : assignment.status ?? "Unknown"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Candidates</span>
                  <span className="font-semibold text-slate-900">
                    {candidates.length}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Accepted Responses</span>
                  <span className="font-semibold text-slate-900">
                    {acceptedOffers.length}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Next Round</span>
                  <span className="font-semibold text-slate-900">
                    {hasAssignedNotary ? "Disabled" : `Round ${nextRound}`}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Send Offers
              </h2>

              {hasAssignedNotary ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  This assignment already has an assigned notary. Sending more
                  rounds is disabled.
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-600">
                    Select one or more available notaries from the candidate
                    list, then send the next round of offers.
                  </p>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-[#0B1F4D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#12306f]"
                  >
                    Send Round {nextRound}
                  </button>
                </>
              )}
            </section>
          </aside>
        </div>
      </form>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Offer History</h2>

        {!existingOffers || existingOffers.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
            No offers have been sent for this assignment.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Notary</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {existingOffers.map((offer) => {
                  const offerNotary = notaryById.get(offer.notary_id);
                  const offerScore = scoreByNotaryId.get(offer.notary_id);

                  return (
                    <tr key={offer.id}>
                      <td className="px-4 py-4 font-bold text-slate-900">
                        Round {offer.round_number}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {offerNotary?.full_name ?? "Unknown Notary"}
                        </p>
                        <p className="text-xs text-slate-600">
                          {offerNotary?.email ?? offer.notary_id}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {offerScore !== undefined && offerScore !== null ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            {offerScore}%
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            Not scored
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {offer.status}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {formatMoney(offer.offered_fee)}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {offer.sent_at
                          ? new Date(offer.sent_at).toLocaleString()
                          : "Not set"}
                      </td>

                      <td className="px-4 py-4">
                        {!hasAssignedNotary && offer.status === "accepted" ? (
                          <form
                            action={`/dashboard/orders/${assignment.id}/find-notary/assign-offer/${offer.id}`}
                            method="POST"
                          >
                            <button
                              type="submit"
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              Assign
                            </button>
                          </form>
                        ) : offer.status === "assigned" ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            Assigned
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}