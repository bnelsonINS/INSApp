"use client";

import { useState } from "react";

type Signer = {
  id: number;
};

export default function SignersForm() {
  const [signers, setSigners] = useState<Signer[]>([{ id: 1 }]);
  const [nextId, setNextId] = useState(2);

  function addSigner() {
    setSigners((prev) => [...prev, { id: nextId }]);
    setNextId((prev) => prev + 1);
  }

  function removeSigner(id: number) {
    setSigners((prev) => prev.filter((signer) => signer.id !== id));
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Signer / Borrower
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add all signers who will be part of this appointment.
          </p>
        </div>

        <button
          type="button"
          onClick={addSigner}
          className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
        >
          + Add Signer
        </button>
      </div>

      <div className="space-y-4">
        {signers.map((signer, index) => (
          <div
            key={signer.id}
            className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Signer {index + 1}
              </h3>

              {signers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSigner(signer.id)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700">
                  Signer Name
                </span>

                <input
                  name="signer_name"
                  required={index === 0}
                  placeholder="John Smith"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700">
                  Signer Phone
                </span>

                <input
                  name="signer_phone"
                  placeholder="(555) 555-5555"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700">
                  Signer Email
                </span>

                <input
                  name="signer_email"
                  type="email"
                  placeholder="signer@example.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}