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
    <section className="rounded-xl bg-white p-6 shadow space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Signer / Borrower</h2>
          <p className="text-sm text-slate-500">
            Add all signers who will be part of this appointment.
          </p>
        </div>

        <button
          type="button"
          onClick={addSigner}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white"
        >
          + Add Signer
        </button>
      </div>

      <div className="space-y-4">
        {signers.map((signer, index) => (
          <div key={signer.id} className="rounded-lg border p-4 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="font-semibold">Signer {index + 1}</h3>

              {signers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSigner(signer.id)}
                  className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">Signer Name</span>
                <input
                  name="signer_name"
                  required={index === 0}
                  placeholder="John Smith"
                  className="w-full rounded-lg border p-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium">Signer Phone</span>
                <input
                  name="signer_phone"
                  placeholder="(555) 555-5555"
                  className="w-full rounded-lg border p-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium">Signer Email</span>
                <input
                  name="signer_email"
                  type="email"
                  placeholder="signer@example.com"
                  className="w-full rounded-lg border p-2"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}