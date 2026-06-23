import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../../src/lib/supabase-admin";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    redirect("/login");
  }

  const formData = await request.formData();

  const controlNumber = String(formData.get("control_number") ?? "").trim();
  const signingType = String(formData.get("signing_type") ?? "").trim();

  const signerNames = formData
    .getAll("signer_name")
    .map((value) => String(value).trim());

  const signerPhones = formData
    .getAll("signer_phone")
    .map((value) => String(value).trim());

  const signerEmails = formData
    .getAll("signer_email")
    .map((value) => String(value).trim());

  const primarySignerName = signerNames[0] ?? "";
  const primarySignerPhone = signerPhones[0] ?? "";
  const primarySignerEmail = signerEmails[0] ?? "";

  const signingDate = String(formData.get("signing_date") ?? "").trim();
  const signingTime = String(formData.get("signing_time") ?? "").trim();
  const signingAddress = String(formData.get("signing_address") ?? "").trim();
  const signingCity = String(formData.get("signing_city") ?? "").trim();
  const signingState = String(formData.get("signing_state") ?? "IN").trim();

  const signingZip = String(formData.get("signing_zip") ?? "")
    .trim()
    .replace(/\D/g, "")
    .slice(0, 5);

  const feeRaw = String(formData.get("fee") ?? "").trim();
  const specialInstructions = String(
    formData.get("special_instructions") ?? ""
  ).trim();

  const fee = feeRaw ? Number(feeRaw) : null;

  if (!primarySignerName) {
    redirect("/dashboard/orders/new");
  }

  let signingCounty: string | null = null;

  if (signingZip) {
    const { data: zipCodeRow, error: zipCodeError } = await supabaseAdmin
      .from("zip_codes")
      .select("county")
      .eq("zip_code", signingZip)
      .maybeSingle();

    if (zipCodeError) {
      console.error("ZIP county lookup error:", zipCodeError);
    }

    signingCounty = zipCodeRow?.county || null;

    console.log("ZIP county lookup:", {
      signingZip,
      signingCounty,
      zipCodeRow,
    });
  }

  const { data: order, error } = await supabaseAdmin
    .from("assignments")
    .insert({
      notary_id: null,
      status: "New Request",
      control_number: controlNumber || null,
      signing_type: signingType || null,
      borrower_name: primarySignerName,
      borrower_phone: primarySignerPhone || null,
      borrower_email: primarySignerEmail || null,
      signing_date: signingDate || null,
      signing_time: signingTime || null,
      signing_address: signingAddress || null,
      signing_city: signingCity || null,
      signing_state: signingState || "IN",
      signing_zip: signingZip || null,
      signing_county: signingCounty,
      fee,
      special_instructions: specialInstructions || null,
    })
    .select("id")
    .single();

  if (error || !order) {
    console.error("Create order error:", error);
    redirect("/dashboard/orders/new");
  }

  const signerRows = signerNames
    .map((name, index) => ({
      assignment_id: order.id,
      name,
      phone: signerPhones[index] || null,
      email: signerEmails[index] || null,
      signer_order: index + 1,
    }))
    .filter((signer) => signer.name);

  if (signerRows.length) {
    const { error: signerError } = await supabase
      .from("assignment_signers")
      .insert(signerRows);

    if (signerError) {
      console.error("Create signers error:", signerError);
    }
  }

  await supabase.from("assignment_activity").insert({
    assignment_id: order.id,
    actor_id: user.id,
    actor_name: user.email ?? "Admin",
    actor_role: "admin",
    action: "Order Created",
    details: "Admin created a new incoming signing request.",
  });

  redirect(`/dashboard/orders/${order.id}`);
}