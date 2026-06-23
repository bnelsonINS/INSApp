"use client";

import { useState } from "react";

type Props = {
  assignmentId: string;
  borrowerName: string | null;
  borrowerPhone: string | null;
  signingDate: string;
  signingTime: string;
  signingAddress: string | null;
  signingCity: string | null;
  signingState: string | null;
  signingZip: string | null;
};

export default function ConfirmAppointmentBox({
  assignmentId,
  borrowerName,
  borrowerPhone,
  signingDate,
  signingTime,
  signingAddress,
  signingCity,
  signingState,
  signingZip,
}: Props) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<"confirmed" | "unavailable">(
    "confirmed"
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
      >
        Confirm Appointment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white text-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-xl font-bold">Signer Availability</h2>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form
              action={`/notary/assignments/${assignmentId}/confirm`}
              method="post"
              className="p-5"
            >
              <p className="text-sm text-slate-700">
                Please call{" "}
                <span className="font-bold">
                  {borrowerName ?? "the signer"}
                </span>
                {borrowerPhone ? (
                  <>
                    {" "}
                    at{" "}
                    <a
                      href={`tel:${borrowerPhone}`}
                      className="font-bold text-blue-700 underline"
                    >
                      {borrowerPhone}
                    </a>
                  </>
                ) : null}{" "}
                to confirm their availability for this signing appointment and
                location.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-slate-900">
                  <input
                    type="radio"
                    name="action_type"
                    value="confirmed"
                    checked={choice === "confirmed"}
                    onChange={() => setChoice("confirmed")}
                  />
                  <span className="text-sm font-semibold">
                    Confirm Appointment
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
                  <input
                    type="radio"
                    name="action_type"
                    value="unavailable"
                    checked={choice === "unavailable"}
                    onChange={() => setChoice("unavailable")}
                  />
                  <span className="text-sm font-semibold">
                    Signer is unavailable
                  </span>
                </label>
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 p-5 text-center">
                <p className="text-lg font-bold text-slate-900">
                  {signingDate}
                  {signingTime ? ` at ${signingTime}` : ""}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {signingAddress ?? "No address listed"}
                  <br />
                  {signingCity ?? "—"}, {signingState ?? "IN"}{" "}
                  {signingZip ?? ""}
                </p>
              </div>

              {choice === "unavailable" && (
                <div className="mt-5 space-y-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Only use this option if the signer is unavailable for the
                    current appointment time.
                  </div>

                  <label className="block text-sm font-bold text-slate-700">
                    Additional details
                  </label>

                  <textarea
                    name="unavailable_details"
                    rows={5}
                    required
                    placeholder="List any suggested alternative times. Can you still perform the signing?"
                    className="w-full rounded-lg border p-3 text-sm outline-none focus:border-slate-900"
                  />
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`rounded-lg px-5 py-2 text-sm font-bold text-white ${
                    choice === "confirmed"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-blue-700 hover:bg-blue-800"
                  }`}
                >
                  {choice === "confirmed" ? "Confirm" : "Send Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}