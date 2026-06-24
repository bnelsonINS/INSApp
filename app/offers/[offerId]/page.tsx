import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../src/lib/supabase-admin";
import OfferResponseButtons from "./OfferResponseButtons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotaryOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { offerId } = await params;
  const { token } = await searchParams;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .single();
  }

  const { data: offer, error } = await supabaseAdmin
    .from("assignment_offers")
    .select(
      `
      id,
      assignment_id,
      notary_id,
      status,
      round_number,
      offered_fee,
      sent_at,
      expires_at,
      response_token,
      assignments (
        id,
        assigned_notary_id,
        control_number,
        borrower_name,
        signing_date,
        signing_time,
        signing_address,
        signing_city,
        signing_state,
        signing_zip,
        signing_county,
        signing_type,
        special_instructions
      )
    `
    )
    .eq("id", offerId)
    .single();

  if (error || !offer) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Offer Not Found</h1>
          <p className="mt-2 text-sm text-slate-600">
            This offer either does not exist or was not sent to your account.
          </p>

          <Link
            href="/notary"
            className="mt-6 inline-flex rounded-lg bg-[#0B1F4D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12306f]"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const hasLoginAccess = user && offer.notary_id === user.id;
  const hasTokenAccess = token && offer.response_token === token;

  if (!hasLoginAccess && !hasTokenAccess) {
    redirect("/login");
  }

  const assignment = Array.isArray(offer.assignments)
    ? offer.assignments[0]
    : offer.assignments;

  const isAssigned =
    !!assignment?.assigned_notary_id;

  const isAssignedToThisNotary =
    assignment?.assigned_notary_id === offer.notary_id;

  const isAssignedToAnotherNotary =
    isAssigned && !isAssignedToThisNotary;

  const isExpired =
    offer.expires_at && new Date(offer.expires_at).getTime() < Date.now();

  const canRespond =
    offer.status === "sent" && !isExpired && !isAssigned;

  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
          <p className="text-sm font-semibold text-blue-100">
            Indiana Notary Solutions
          </p>

          <h1 className="mt-2 text-3xl font-bold">Signing Offer</h1>

          <p className="mt-2 text-sm text-blue-100">
            Review the details below and respond to this offer.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Control Number
                </p>
                <h2 className="text-2xl font-bold text-slate-900">
                  {assignment?.control_number ?? "Not assigned"}
                </h2>
              </div>

              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                {isAssigned
                  ? "Assigned"
                  : isExpired
                    ? "Expired"
                    : offer.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Info label="Borrower" value={assignment?.borrower_name} />
              <Info label="Signing Type" value={assignment?.signing_type} />
              <Info label="Signing Date" value={assignment?.signing_date} />
              <Info label="Signing Time" value={assignment?.signing_time} />
              <Info label="County" value={assignment?.signing_county} />
              <Info label="ZIP" value={assignment?.signing_zip} />
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Location</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {assignment?.signing_address ?? "Address not provided"}
              </p>
              <p className="text-sm text-slate-700">
                {assignment?.signing_city ?? ""},{" "}
                {assignment?.signing_state ?? ""}{" "}
                {assignment?.signing_zip ?? ""}
              </p>
            </div>

            {assignment?.special_instructions ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Special Instructions
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">
                  {assignment.special_instructions}
                </p>
              </div>
            ) : null}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Offer Summary</h2>

            <div className="mt-4 space-y-4">
              <Info
                label="Offered Fee"
                value={
                  offer.offered_fee !== null && offer.offered_fee !== undefined
                    ? `$${offer.offered_fee}`
                    : "Not set"
                }
              />

              <Info label="Round" value={`Round ${offer.round_number ?? 1}`} />

              <Info
                label="Expires"
                value={
                  offer.expires_at
                    ? new Date(offer.expires_at).toLocaleString("en-US")
                    : "No expiration"
                }
              />
            </div>

            {!canRespond ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {isAssignedToThisNotary
                  ? "This signing has been assigned to you."
                  : isAssignedToAnotherNotary
                    ? "This signing has already been assigned to another notary."
                    : isExpired
                      ? "This offer has expired."
                      : "You have already responded to this offer."}
              </div>
            ) : (
              <OfferResponseButtons offerId={offer.id} tokenQuery={tokenQuery} />
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}