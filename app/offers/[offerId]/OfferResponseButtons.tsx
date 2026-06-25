"use client";

import { useState } from "react";

type PendingAction = "accept" | "decline" | "counter" | null;

export default function OfferResponseButtons({
  offerId,
  tokenQuery,
  requestingCompany,
}: {
  offerId: string;
  tokenQuery: string;
  requestingCompany: string;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [declineOpen, setDeclineOpen] = useState(false);

  const isPending = pendingAction !== null;

  return (
    <div className="mt-6 space-y-3">
      <form
        action={`/offers/${offerId}/accept${tokenQuery}`}
        method="post"
        onSubmit={() => setPendingAction("accept")}
      >
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingAction === "accept" ? (
            <>
              <Spinner />
              Accepting...
            </>
          ) : (
            "Accept Offer"
          )}
        </button>
      </form>

      <button
        type="button"
        disabled={isPending}
        onClick={() => setDeclineOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Decline Offer
      </button>

      {declineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-950">
              Decline Offer
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Select the reason you are declining this offer.
            </p>

            <form
              action={`/offers/${offerId}/decline${tokenQuery}`}
              method="post"
              className="mt-5 space-y-3"
              onSubmit={() => setPendingAction("decline")}
            >
              <DeclineReason
                value="not_available"
                label="I am not available at that time"
              />

              <DeclineReason
                value="too_far"
                label="The location is too far away"
              />

              <DeclineReason
                value="pay_too_low"
                label="The offered fee is too low"
              />

              <DeclineReason
                value="no_mobile_signings"
                label="I no longer perform this type of signing"
              />

              <DeclineReason
                value="unfamiliar_company"
                label={`I am unfamiliar with ${requestingCompany}`}
              />

              <DeclineReason
                value="prefer_not_company"
                label={`I prefer not to work with ${requestingCompany}`}
              />

              <DeclineReason value="other" label="Other" />

              <div>
                <label
                  htmlFor="decline_notes"
                  className="text-sm font-bold text-slate-700"
                >
                  Additional Details
                </label>

                <textarea
                  id="decline_notes"
                  name="decline_notes"
                  rows={4}
                  placeholder="Add details..."
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setDeclineOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pendingAction === "decline" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
                      Declining...
                    </span>
                  ) : (
                    "Submit Decline"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <form
        action={`/offers/${offerId}/counter${tokenQuery}`}
        method="post"
        className="rounded-xl border border-slate-200 p-4"
        onSubmit={() => setPendingAction("counter")}
      >
        <label
          htmlFor="counter_fee"
          className="text-sm font-semibold text-slate-700"
        >
          Counter Fee
        </label>

        <input
          id="counter_fee"
          name="counter_fee"
          type="number"
          min="1"
          step="1"
          required
          placeholder="Enter counter amount"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />

        <button
          type="submit"
          disabled={isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B1F4D] px-4 py-3 text-sm font-bold text-white hover:bg-[#12306f] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingAction === "counter" ? (
            <>
              <Spinner />
              Submitting...
            </>
          ) : (
            "Submit Counter"
          )}
        </button>
      </form>
    </div>
  );
}

function DeclineReason({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">
      <input
        type="radio"
        name="decline_reason"
        value={value}
        required
        className="mt-1"
      />
      <span>{label}</span>
    </label>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}