"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export async function createManualProJob(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const borrowerName = String(formData.get("borrower_name") || "").trim();

  if (!borrowerName) {
    throw new Error("Borrower name is required.");
  }

  const { error } = await supabase.from("pro_jobs").insert({
    notary_id: user.id,
    source_type: "manual",
    client_name: String(formData.get("client_name") || "").trim() || null,
    borrower_name: borrowerName,
    signing_type: String(formData.get("signing_type") || "").trim() || null,
    signing_date: String(formData.get("signing_date") || "") || null,
    signing_time: String(formData.get("signing_time") || "") || null,
    signing_address: String(formData.get("signing_address") || "").trim() || null,
    signing_city: String(formData.get("signing_city") || "").trim() || null,
    signing_state: String(formData.get("signing_state") || "IN").trim() || "IN",
    signing_zip: String(formData.get("signing_zip") || "").trim() || null,
    fee: Number(formData.get("fee") || 0),
    status: String(formData.get("status") || "scheduled"),
    appointment_confirmed: formData.get("appointment_confirmed") === "on",
    docs_received: formData.get("docs_received") === "on",
    docs_printed: formData.get("docs_printed") === "on",
    scanbacks_required: formData.get("scanbacks_required") === "on",
    notes: String(formData.get("notes") || "").trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/notary/pro/jobs");
}