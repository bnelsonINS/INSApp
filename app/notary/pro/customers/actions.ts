"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim() || null;
}

function numberValue(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").trim();
  return raw ? Number(raw) : null;
}

export async function createProCustomer(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const company = value(formData, "company");

  if (!company) {
    throw new Error("Company name is required.");
  }

  const { error } = await supabase.from("pro_customers").insert({
    notary_id: user.id,

    company,
    address: value(formData, "address"),
    address_2: value(formData, "address_2"),
    city: value(formData, "city"),
    state: value(formData, "state") || "IN",
    zip: value(formData, "zip"),

    contact_first_name: value(formData, "contact_first_name"),
    contact_last_name: value(formData, "contact_last_name"),
    contact_title: value(formData, "contact_title"),

    email: value(formData, "email"),
    office_phone: value(formData, "office_phone"),
    cell_phone: value(formData, "cell_phone"),
    fax: value(formData, "fax"),
    website: value(formData, "website"),

    default_signing_fee: numberValue(formData, "default_signing_fee") || 0,
    default_appointment_duration_minutes:
      numberValue(formData, "default_appointment_duration_minutes") || 60,
    default_payment_terms_days:
      numberValue(formData, "default_payment_terms_days") || 0,
    default_payment_type: value(formData, "default_payment_type"),
    default_loan_type: value(formData, "default_loan_type"),
    default_notarial_acts: numberValue(formData, "default_notarial_acts"),
    default_scanbacks_required:
      formData.get("default_scanbacks_required") === "on",

    invoice_alert_enabled: formData.get("invoice_alert_enabled") === "on",
    mileage_alert_enabled: formData.get("mileage_alert_enabled") === "on",
    notarial_acts_alert_enabled:
      formData.get("notarial_acts_alert_enabled") === "on",
    journal_alert_enabled: formData.get("journal_alert_enabled") === "on",

    special_instructions: value(formData, "special_instructions"),
    private_notes: value(formData, "private_notes"),
    banner_message: value(formData, "banner_message"),
  });

  if (error) throw new Error(error.message);

  redirect("/notary/pro/customers");
}