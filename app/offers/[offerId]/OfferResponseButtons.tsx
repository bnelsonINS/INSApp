"use client";

import { useState } from "react";

type PendingAction = "accept" | "decline" | "counter" | null;

export default function OfferResponseButtons({
  offerId,
  tokenQuery,
}: {
  offerId: string;
  tokenQuery: string;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

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

      <form
        action={`/offers/${offerId}/decline${tokenQuery}`}
        method="post"
        onSubmit={() => setPendingAction("decline")}
      >
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingAction === "decline" ? (
            <>
              <Spinner />
              Declining...
            </>
          ) : (
            "Decline Offer"
          )}
        </button>
      </form>

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
          min="0"
          step="1"
          required
          disabled={isPending}
          placeholder="Enter counter amount"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
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

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}