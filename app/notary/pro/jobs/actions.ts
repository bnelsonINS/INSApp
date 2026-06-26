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

export async function addChoiceOption(category: string, option: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cleanOption = option.trim();

  if (!category || !cleanOption) return;

  await supabase.from("pro_job_choice_options").upsert(
    {
      notary_id: user.id,
      category,
      value: cleanOption,
    },
    {
      onConflict: "notary_id,category,value",
    }
  );
}

export async function createManualProJob(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const borrowerName = value(formData, "borrower_name");

  if (!borrowerName) {
    throw new Error("Borrower name is required.");
  }

  const { error } = await supabase.from("pro_jobs").insert({
    notary_id: user.id,
    source_type: "manual",

    client_name: value(formData, "client_name"),
    borrower_name: borrowerName,

    signer_first_name: value(formData, "signer_first_name"),
    signer_last_name: value(formData, "signer_last_name"),
    signer_company: value(formData, "signer_company"),
    signer_phone: value(formData, "signer_phone"),
    signer_email: value(formData, "signer_email"),

    signing_type: value(formData, "signing_type"),
    signing_date: value(formData, "signing_date"),
    signing_time: value(formData, "signing_time"),
    signing_duration_minutes: numberValue(formData, "signing_duration_minutes"),
    signing_reminder_minutes: numberValue(formData, "signing_reminder_minutes"),

    signing_address: value(formData, "signing_address"),
    signing_city: value(formData, "signing_city"),
    signing_state: value(formData, "signing_state") || "IN",
    signing_zip: value(formData, "signing_zip"),

    property_address: value(formData, "property_address"),
    property_city: value(formData, "property_city"),
    property_state: value(formData, "property_state"),
    property_zip: value(formData, "property_zip"),

    fee: Number(formData.get("fee") || 0),
    status: value(formData, "status") || "scheduled",

    appointment_confirmed: formData.get("appointment_confirmed") === "on",
    docs_received: formData.get("docs_received") === "on",
    docs_printed: formData.get("docs_printed") === "on",
    scanbacks_required: formData.get("scanbacks_required") === "on",

    add_to_google_calendar: formData.get("add_to_google_calendar") === "on",
    add_to_phone_calendar_email:
      formData.get("add_to_phone_calendar_email") === "on",
    send_email_reminder: formData.get("send_email_reminder") === "on",
    send_text_reminder: formData.get("send_text_reminder") === "on",
    ron_signing: formData.get("ron_signing") === "on",
    ipen_signing: formData.get("ipen_signing") === "on",

    invoice_number: value(formData, "invoice_number"),
    payment_terms_days: Number(formData.get("payment_terms_days") || 0),

    platform: value(formData, "platform"),
    loan_type: value(formData, "loan_type"),
    order_escrow_number: value(formData, "order_escrow_number"),
    tracking_number: value(formData, "tracking_number"),
    signing_platform: value(formData, "signing_platform"),

    notes: value(formData, "notes"),
  });

  if (error) throw new Error(error.message);

  redirect("/notary/pro/jobs");
}