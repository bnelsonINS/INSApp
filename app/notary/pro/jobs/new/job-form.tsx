"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addChoiceOption, createManualProJob } from "../actions";

type ChoiceOption = {
  id: string;
  category: string;
  value: string;
};

type ProCustomer = {
  id: string;
  company: string;
  address: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  default_signing_fee: number | string | null;
  default_appointment_duration_minutes: number | null;
  default_payment_terms_days: number | null;
  default_loan_type: string | null;
  default_scanbacks_required: boolean | null;
  special_instructions: string | null;
  banner_message: string | null;
};

type Props = {
  choices: ChoiceOption[];
  customers: ProCustomer[];
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"select" | "new">("select");
  const [isPending, startTransition] = useTransition();
  const [selectedValue, setSelectedValue] = useState("");
  const [search, setSearch] = useState("");
  const [newValue, setNewValue] = useState("");

  const options = choices
    .filter((choice) => choice.category === category)
    .filter((choice) =>
      choice.value.toLowerCase().includes(search.toLowerCase())
    );

  function closeModal() {
    setIsOpen(false);
    setMode("select");
    setSearch("");
    setNewValue("");
  }

  function selectOption(value: string) {
    setSelectedValue(value);
    closeModal();
  }

  function openNewMode() {
    setMode("new");
    setNewValue(search);
  }

  function saveNewOption() {
    const cleanValue = newValue.trim();

    if (!cleanValue) return;

    startTransition(async () => {
      await addChoiceOption(category, cleanValue);
      setSelectedValue(cleanValue);
      closeModal();
      router.refresh();
    });
  }

  return (
    <div className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>

      <input type="hidden" name={name} value={selectedValue} />

      <button
        type="button"
        onClick={() => {
          setMode("select");
          setIsOpen(true);
        }}
        className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-950 hover:bg-slate-50 focus:border-[#0B1F4D] focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <span className={selectedValue ? "text-slate-950" : "text-slate-400"}>
          {selectedValue || placeholder || `Select ${label}`}
        </span>

        <span className="text-lg font-black text-slate-400">⋯</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#0B1F4D] px-5 py-4 text-white">
              <h3 className="text-lg font-black">
                {mode === "new" ? `New ${label}` : `Select ${label}`}
              </h3>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl font-black text-white"
              >
                ×
              </button>
            </div>

            {mode === "select" ? (
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400 focus:border-[#0B1F4D] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={openNewMode}
                    className="rounded-xl border-2 border-blue-700 bg-white px-4 py-3 text-sm font-black text-[#0B1F4D] hover:bg-blue-50"
                  >
                    New {label}
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200">
                  {options.length === 0 ? (
                    <div className="p-4 text-sm font-semibold text-slate-500">
                      No saved options found. Click New {label} to add one.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => selectOption(option.value)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-slate-900 hover:bg-slate-50"
                        >
                          <span>{option.value}</span>
                          <span className="text-slate-300">›</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-5">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">
                    {label}
                  </span>
                  <input
                    value={newValue}
                    onChange={(event) => setNewValue(event.target.value)}
                    placeholder={`Enter new ${label}`}
                    autoFocus
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400 focus:border-[#0B1F4D] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("select")}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={saveNewOption}
                    disabled={isPending || !newValue.trim()}
                    className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-black text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
        : "1 day 12 hours before";
    }

    options.push({ label, value: String(minutes) });
  }

  return options;
}

export default function JobForm({ choices, customers }: Props) {
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
                ].map(([checkboxName, checkboxLabel]) => (
                  <label
                    key={checkboxName}
                    className="flex items-center gap-3 text-sm font-bold text-slate-700"
                  >
                    <input
                      name={checkboxName}
                      type="checkbox"
                      className="h-4 w-4"
                    />
                    {checkboxLabel}
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