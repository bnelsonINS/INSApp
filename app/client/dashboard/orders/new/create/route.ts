import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../../../../src/lib/supabase-server";

function makeControlNumber(fileNumber: string) {
  if (fileNumber) return fileNumber;
  return `CL-${Date.now()}`;
}

function safeParsePropertyAddresses(value: FormDataEntryValue | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(String(value));

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((address) => ({
        street: String(address.street || "").trim(),
        address2: String(address.address2 || "").trim(),
        city: String(address.city || "").trim(),
        state: String(address.state || "").trim(),
        zip: String(address.zip || "").trim(),
      }))
      .filter(
        (address) =>
          address.street || address.address2 || address.city || address.zip
      );
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.is_active) {
    redirect("/login");
  }

  const formData = await request.formData();

  const lender = String(formData.get("lender") || "").trim();
  const fileNumber = String(formData.get("file_number") || "").trim();
  const specialInstructions = String(
    formData.get("special_instructions") || ""
  ).trim();

  const signingAddress = String(formData.get("signing_address") || "").trim();
  const signingCity = String(formData.get("signing_city") || "").trim();
  const signingState = String(formData.get("signing_state") || "IN").trim();
  const signingZip = String(formData.get("signing_zip") || "").trim();
  const signingDate = String(formData.get("signing_date") || "").trim();
  const signingTime = String(formData.get("signing_time") || "").trim();

  const signerFirstName = String(formData.get("signer_first_name") || "").trim();
  const signerLastName = String(formData.get("signer_last_name") || "").trim();
  const signerPhone = String(formData.get("signer_phone") || "").trim();
  const signerEmail = String(formData.get("signer_email") || "").trim();

  const propertyAddresses = safeParsePropertyAddresses(
    formData.get("property_addresses")
  );

  if (!signingAddress || !signingCity || !signingState || !signingZip) {
    redirect("/client/dashboard/orders/new?error=missing-location");
  }

  if (!signerFirstName || !signerLastName) {
    redirect("/client/dashboard/orders/new?error=missing-signer");
  }

  const borrowerName = `${signerFirstName} ${signerLastName}`.trim();
  const controlNumber = makeControlNumber(fileNumber);

  console.log("Creating client assignment for:", user.id);

  const { error } = await supabase.from("assignments").insert({
    client_id: user.id,
    notary_id: null,
    assigned_notary_id: null,

    status: "New Request",
    control_number: controlNumber,
    signing_type: lender || "Title Signing",
    borrower_name: borrowerName,

    signing_date: signingDate || null,
    signing_time: signingTime || null,
    signing_address: signingAddress,
    signing_city: signingCity,
    signing_state: signingState,
    signing_zip: signingZip,

    property_addresses: propertyAddresses,

    special_instructions: specialInstructions || null,
    borrower_phone: signerPhone || null,
    borrower_email: signerEmail || null,

    client_fee: null,
    notary_fee: null,
  });

  if (error) {
    console.error("Create client assignment error:", error);
    redirect("/client/dashboard/orders/new?error=create-failed");
  }

  redirect("/client/dashboard/orders");
}