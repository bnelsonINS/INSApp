"use client";

import Link from "next/link";
import { createProCustomer } from "../actions";

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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-b border-slate-200 pb-6 last:border-b-0">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

export default function CustomerForm() {
  return (
    <form
      action={createProCustomer}
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <Section title="Company">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company Name" name="company" required />
          <Field label="Website" name="website" />

          <div className="md:col-span-2">
            <Field label="Address" name="address" />
          </div>

          <div className="md:col-span-2">
            <Field label="Address 2" name="address_2" />
          </div>

          <Field label="City" name="city" />
          <Field label="State" name="state" defaultValue="IN" />
          <Field label="ZIP" name="zip" />
        </div>
      </Section>

      <Section title="Primary Contact">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="First Name" name="contact_first_name" />
          <Field label="Last Name" name="contact_last_name" />
          <Field label="Title" name="contact_title" />
          <Field label="Email" name="email" type="email" />
          <Field label="Office Phone" name="office_phone" />
          <Field label="Cell Phone" name="cell_phone" />
          <Field label="Fax" name="fax" />
        </div>
      </Section>

      <Section title="Defaults">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Default Signing Fee"
            name="default_signing_fee"
            type="number"
            defaultValue="0"
          />

          <Field
            label="Default Duration Minutes"
            name="default_appointment_duration_minutes"
            type="number"
            defaultValue="60"
          />

          <Field
            label="Payment Terms Days"
            name="default_payment_terms_days"
            type="number"
            defaultValue="0"
          />

          <Field label="Payment Type" name="default_payment_type" />
          <Field label="Default Loan Type" name="default_loan_type" />
          <Field
            label="Default Notarial Acts"
            name="default_notarial_acts"
            type="number"
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
          <input
            name="default_scanbacks_required"
            type="checkbox"
            className="h-4 w-4"
          />
          Scanbacks required by default
        </label>
      </Section>

      <Section title="Alerts">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["invoice_alert_enabled", "Invoice alert enabled"],
            ["mileage_alert_enabled", "Mileage alert enabled"],
            ["notarial_acts_alert_enabled", "Notarial acts alert enabled"],
            ["journal_alert_enabled", "Journal alert enabled"],
          ].map(([name, label]) => (
            <label
              key={name}
              className="flex items-center gap-3 text-sm font-bold text-slate-700"
            >
              <input
                name={name}
                type="checkbox"
                defaultChecked
                className="h-4 w-4"
              />
              {label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Instructions & Notes">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            Banner / Warning Message
          </span>
          <textarea
            name="banner_message"
            rows={3}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            Special Instructions
          </span>
          <textarea
            name="special_instructions"
            rows={4}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            Private Notes
          </span>
          <textarea
            name="private_notes"
            rows={4}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950"
          />
        </label>
      </Section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/notary/pro/customers"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-black text-white hover:bg-blue-950"
        >
          Save Customer
        </button>
      </div>
    </form>
  );
}