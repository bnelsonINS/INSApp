import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { checkAndSubmitNotaryForReview } from "../../../../src/lib/notary-readiness";

function value(formData: FormData, key: string) {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function hasValue(value: string | null) {
  return Boolean(value && value.trim().length > 0);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const formData = await request.formData();

  const firstName = value(formData, "first_name");
  const lastName = value(formData, "last_name");
  const address = value(formData, "address");
  const city = value(formData, "city");
  const state = value(formData, "state");
  const zip = value(formData, "zip");
  const commissionNumber = value(formData, "commission_number");
  const commissionExpiration = value(formData, "commission_expiration");

  const homePhone = value(formData, "home_phone");
  const mobilePhone = value(formData, "mobile_phone");

  const acceptsTextMessages = checked(formData, "accepts_text_messages");
  const acceptsEmailNotifications = checked(
    formData,
    "accepts_email_notifications"
  );

  const profileRequirementsComplete =
    hasValue(firstName) &&
    hasValue(lastName) &&
    hasValue(address) &&
    hasValue(city) &&
    hasValue(state) &&
    hasValue(zip) &&
    hasValue(commissionNumber) &&
    hasValue(commissionExpiration) &&
    (hasValue(homePhone) || hasValue(mobilePhone)) &&
    (acceptsTextMessages || acceptsEmailNotifications);

  const coverageRadius = String(formData.get("coverage_radius") || "");

  const achRoutingNumber = String(formData.get("ach_routing_number") || "");
  const achAccountNumber = String(formData.get("ach_account_number") || "");

  await supabase.from("notary_profiles").upsert({
    user_id: user.id,

    ach_bank_name: value(formData, "ach_bank_name"),
    ach_account_type: value(formData, "ach_account_type"),
    ach_routing_last4: achRoutingNumber ? achRoutingNumber.slice(-4) : undefined,
    ach_account_last4: achAccountNumber ? achAccountNumber.slice(-4) : undefined,
    ach_verified: false,

    first_name: firstName,
    last_name: lastName,
    business_name: value(formData, "business_name"),
    website: value(formData, "website"),
    bio: value(formData, "bio"),

    address,
    address_line_2: value(formData, "address_line_2"),
    city,
    state,
    zip,
    county: value(formData, "county"),

    phone: mobilePhone,
    home_phone: homePhone,
    mobile_phone: mobilePhone,
    work_phone: value(formData, "work_phone"),
    fax: value(formData, "fax"),

    commission_number: commissionNumber,
    commission_expiration: commissionExpiration,
    coverage_radius: coverageRadius ? Number(coverageRadius) : null,
    ron_enabled: checked(formData, "ron_enabled"),
    languages_spoken: value(formData, "languages_spoken"),

    laser_printer: checked(formData, "laser_printer"),
    dual_tray_printer: checked(formData, "dual_tray_printer"),
    mobile_scanner: checked(formData, "mobile_scanner"),
    high_speed_internet: checked(formData, "high_speed_internet"),

    receiving_notifications: checked(formData, "receiving_notifications"),
    public_profile_enabled: checked(formData, "public_profile_enabled"),
    accepts_text_messages: acceptsTextMessages,
    accepts_email_notifications: acceptsEmailNotifications,
    accepts_weekend_signings: checked(formData, "accepts_weekend_signings"),
    accepts_evening_signings: checked(formData, "accepts_evening_signings"),

    emergency_contact_name: value(formData, "emergency_contact_name"),
    emergency_contact_phone: value(formData, "emergency_contact_phone"),

    payment_address_same: checked(formData, "payment_address_same"),
    payment_name: value(formData, "payment_name"),
    payment_address: value(formData, "payment_address"),
    payment_city: value(formData, "payment_city"),
    payment_state: value(formData, "payment_state"),
    payment_zip: value(formData, "payment_zip"),

    updated_at: new Date().toISOString(),
  });

  if (!profileRequirementsComplete) {
    await supabase
      .from("profiles")
      .update({
        approval_status: "pending",
        ready_for_review_at: null,
      })
      .eq("id", user.id)
      .neq("approval_status", "approved");
  }

  if (profileRequirementsComplete) {
    await checkAndSubmitNotaryForReview(supabase, user.id);
  }

  redirect("/notary/profile");
}