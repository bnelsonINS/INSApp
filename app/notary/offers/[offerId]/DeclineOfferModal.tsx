"use client";

import { useState } from "react";

type DeclineOfferModalProps = {
  offerId: string;
  token?: string;
  requestingCompany: string;
};

export default function DeclineOfferModal({
  offerId,
  token,
  requestingCompany,
}: DeclineOfferModalProps) {
  const [open, setOpen] = useState(false);

  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700"
      >
        Decline Offer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-950">
              Decline Offer
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Select the reason you are declining this offer.
            </p>

            <form
              action={`/notary/offers/${offerId}/decline${tokenQuery}`}
              method="post"
              className="mt-5 space-y-3"
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
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700"
                >
                  Submit Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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