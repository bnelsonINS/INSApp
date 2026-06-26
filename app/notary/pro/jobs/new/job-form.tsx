"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addChoiceOption, createManualProJob } from "../actions";

type ChoiceOption = {
  id: string;
  category: string;
  value: string;
};

type Props = {
  choices: ChoiceOption[];
};

const tabs = [
  "Signing Details",
  "Signers",
  "Location",
  "Details",
  "Payment",
  "Review",
];

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400 focus:border-[#0B1F4D] focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 focus:border-[#0B1F4D] focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChoiceField({
  label,
  name,
  category,
  choices,
  placeholder,
}: {
  label: string;
  name: string;
  category: string;
  choices: ChoiceOption[];
  placeholder?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [localValue, setLocalValue] = useState("");

  const options = choices.filter((choice) => choice.category === category);

  function saveChoice() {
    if (!localValue.trim()) return;

    startTransition(async () => {
      await addChoiceOption(category, localValue);
    });
  }

  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
        {label}
        <button
          type="button"
          onClick={saveChoice}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-black text-[#0B1F4D] hover:bg-slate-50"
        >
          {isPending ? "Saving..." : "Add"}
        </button>
      </span>

      <input
        name={name}
        list={`${category}-list`}
        placeholder={placeholder}
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400 focus:border-[#0B1F4D] focus:outline-none focus:ring-2 focus:ring-blue-100"
      />

      <datalist id={`${category}-list`}>
        {options.map((option) => (
          <option key={option.id} value={option.value} />
        ))}
      </datalist>
    </label>
  );
}

function durationOptions() {
  const options = [];

  for (let minutes = 30; minutes <= 720; minutes += 30) {
    const hours = minutes / 60;
    const label =
      minutes < 60
        ? `${minutes} minutes`
        : Number.isInteger(hours)
          ? `${hours} hour${hours === 1 ? "" : "s"}`
          : `${Math.floor(hours)}.5 hours`;

    options.push({ label, value: String(minutes) });
  }

  return options;
}

function reminderOptions() {
  const options = [{ label: "No reminder", value: "" }];

  for (let minutes = 15; minutes <= 2880; minutes += 15) {
    let label = `${minutes} minutes before`;

    if (minutes >= 60 && minutes < 1440) {
      const hours = minutes / 60;
      label = Number.isInteger(hours)
        ? `${hours} hour${hours === 1 ? "" : "s"} before`
        : `${Math.floor(hours)}h 30m before`;
    }

    if (minutes >= 1440) {
      const days = minutes / 1440;
      label = Number.isInteger(days)
        ? `${days} day${days === 1 ? "" : "s"} before`
        : `1 day 12 hours before`;
    }

    options.push({ label, value: String(minutes) });
  }

  return options;
}

export default function JobForm({ choices }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <form
      action={createManualProJob}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 bg-white px-5 pt-5">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-black transition ${
                activeTab === tab
                  ? "border-[#0B1F4D] text-[#0B1F4D]"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {activeTab === "Signing Details" && (
          <section className="space-y-5">
            <h2 className="text-xl font-black text-slate-950">
              Signing Details
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Borrower Name"
                name="borrower_name"
                required
                placeholder="John Smith"
              />

              <ChoiceField
                label="Client / Company"
                name="client_name"
                category="client_name"
                choices={choices}
                placeholder="ABC Title"
              />

              <ChoiceField
                label="Signing Type"
                name="signing_type"
                category="signing_type"
                choices={choices}
                placeholder="Refinance"
              />

              <SelectField
                label="Status"
                name="status"
                defaultValue="scheduled"
                options={["scheduled", "confirmed", "completed", "cancelled"]}
              />

              <Field label="Signing Date" name="signing_date" type="date" />
              <Field label="Signing Time" name="signing_time" type="time" />

              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Signing Duration
                </span>
                <select
                  name="signing_duration_minutes"
                  defaultValue="60"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950"
                >
                  {durationOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Signing Reminder
                </span>
                <select
                  name="signing_reminder_minutes"
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950"
                >
                  {reminderOptions().map((option) => (
                    <option key={option.value || "none"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="mb-3 text-sm font-black text-slate-900">
                Appointment Options
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["add_to_google_calendar", "Add to Google Calendar"],
                  [
                    "add_to_phone_calendar_email",
                    "Add to phone/calendar via email",
                  ],
                  ["send_email_reminder", "Send email reminder"],
                  ["send_text_reminder", "Send text reminder"],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="flex items-center gap-3 text-sm font-bold text-slate-700"
                  >
                    <input name={name} type="checkbox" className="h-4 w-4" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "Signers" && (
          <section className="space-y-5">
            <h2 className="text-xl font-black text-slate-950">Signers</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Signer First" name="signer_first_name" />
              <Field label="Signer Last" name="signer_last_name" />
              <Field label="Company" name="signer_company" />
              <Field label="Phone #" name="signer_phone" />
              <Field label="Email" name="signer_email" type="email" />
            </div>

            <div className="flex flex-wrap gap-3 text-sm font-black text-blue-700">
              <button type="button">+ Add 2nd Signer</button>
              <button type="button">+ Add 3rd Signer</button>
              <button type="button">+ Add 4th Signer</button>
            </div>
          </section>
        )}

        {activeTab === "Location" && (
          <section className="space-y-5">
            <h2 className="text-xl font-black text-slate-950">Location</h2>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <input name="ron_signing" type="checkbox" className="h-4 w-4" />
                Remote online notarization
              </label>

              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <input
                  name="ipen_signing"
                  type="checkbox"
                  className="h-4 w-4"
                />
                IPEN signing
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-4">
                <Field
                  label="Signing Address"
                  name="signing_address"
                  placeholder="123 Main St"
                />
              </div>

              <div className="md:col-span-2">
                <Field label="City" name="signing_city" />
              </div>

              <Field label="State" name="signing_state" defaultValue="IN" />
              <Field label="ZIP" name="signing_zip" />
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400">
                Property Address
              </h3>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-4">
                  <Field label="Property Address" name="property_address" />
                </div>

                <div className="md:col-span-2">
                  <Field label="City" name="property_city" />
                </div>

                <Field label="State" name="property_state" defaultValue="IN" />
                <Field label="ZIP" name="property_zip" />
              </div>
            </div>
          </section>
        )}

        {activeTab === "Details" && (
          <section className="space-y-5">
            <h2 className="text-xl font-black text-slate-950">Details</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <ChoiceField
                label="Platform"
                name="platform"
                category="platform"
                choices={choices}
              />

              <ChoiceField
                label="Loan Type"
                name="loan_type"
                category="loan_type"
                choices={choices}
              />

              <Field label="Order/Escrow #" name="order_escrow_number" />
              <Field label="Tracking #" name="tracking_number" />

              <ChoiceField
                label="Signing Platform"
                name="signing_platform"
                category="signing_platform"
                choices={choices}
              />
            </div>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Special Instructions
              </span>
              <textarea
                name="notes"
                rows={6}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400"
              />
            </label>
          </section>
        )}

        {activeTab === "Payment" && (
          <section className="space-y-5">
            <h2 className="text-xl font-black text-slate-950">
              Payment & Invoice
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Invoice #" name="invoice_number" />
              <Field
                label="Payment Terms Days"
                name="payment_terms_days"
                type="number"
                defaultValue="0"
              />
              <Field label="Signing Fee" name="fee" type="number" />
            </div>

            <div className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-900">
              Multiple amounts, invoice generation, and payment tracking are
              next-phase features.
            </div>
          </section>
        )}

        {activeTab === "Review" && (
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-950">
              Review & Save
            </h2>

            <p className="text-sm text-slate-500">
              Review each tab, then save the signing. This will create a manual
              INS Pro job and keep it separate from INS assignments.
            </p>
          </section>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end">
        <Link
          href="/notary/pro/jobs"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          name="save_mode"
          value="save_add_another"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          Save & Add Another
        </button>

        <button
          type="submit"
          className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-black text-white hover:bg-blue-950"
        >
          Save
        </button>
      </div>
    </form>
  );
}