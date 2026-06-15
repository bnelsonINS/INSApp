import type { SupabaseClient } from "@supabase/supabase-js";

const REQUIRED_CREDENTIAL_TYPES = [
  "Background Check",
  "E&O Insurance",
  "Notary Bond",
  "Notary Commission",
  "Title Producer License",
  "W9",
];

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_active: boolean | null;
  approval_status: string | null;
};

type NotaryProfileRow = {
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  commission_number: string | null;
  commission_expiration: string | null;
  home_phone: string | null;
  mobile_phone: string | null;
  accepts_text_messages: boolean | null;
  accepts_email_notifications: boolean | null;
};

type CredentialRow = {
  credential_type: string | null;
  status: string | null;
};

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ins-app.vercel.app"
  ).replace(/\/$/, "");
}

function hasValue(value: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function isProfileComplete(profile: NotaryProfileRow | null) {
  if (!profile) return false;

  return (
    hasValue(profile.first_name) &&
    hasValue(profile.last_name) &&
    hasValue(profile.address) &&
    hasValue(profile.city) &&
    hasValue(profile.state) &&
    hasValue(profile.zip) &&
    hasValue(profile.commission_number) &&
    hasValue(profile.commission_expiration) &&
    (hasValue(profile.home_phone) || hasValue(profile.mobile_phone)) &&
    (profile.accepts_text_messages === true ||
      profile.accepts_email_notifications === true)
  );
}

function areCredentialsSubmitted(credentials: CredentialRow[]) {
  return REQUIRED_CREDENTIAL_TYPES.every((requiredType) =>
    credentials.some(
      (credential) =>
        credential.credential_type === requiredType &&
        credential.status !== "rejected"
    )
  );
}

function getNotaryName(profile: NotaryProfileRow | null, user: ProfileRow) {
  const firstName = profile?.first_name || "";
  const lastName = profile?.last_name || "";
  const name = `${firstName} ${lastName}`.trim();

  return name || user.full_name || user.email || "Notary";
}

export async function checkAndSubmitNotaryForReview(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, approval_status")
    .eq("id", userId)
    .single<ProfileRow>();

  if (!userProfile) return;

  if (
    userProfile.approval_status === "ready_for_review" ||
    userProfile.approval_status === "approved"
  ) {
    return;
  }

  const { data: notaryProfile } = await supabase
    .from("notary_profiles")
    .select(
      `
      first_name,
      last_name,
      address,
      city,
      state,
      zip,
      commission_number,
      commission_expiration,
      home_phone,
      mobile_phone,
      accepts_text_messages,
      accepts_email_notifications
    `
    )
    .eq("user_id", userId)
    .single<NotaryProfileRow>();

  const { data: credentials } = await supabase
    .from("notary_credentials")
    .select("credential_type, status")
    .eq("user_id", userId)
    .returns<CredentialRow[]>();

  const profileComplete = isProfileComplete(notaryProfile);
  const credentialsSubmitted = areCredentialsSubmitted(credentials || []);

  if (!profileComplete || !credentialsSubmitted) return;

  const now = new Date().toISOString();

  await supabase
    .from("profiles")
    .update({
      approval_status: "ready_for_review",
      ready_for_review_at: now,
    })
    .eq("id", userId);

  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "admin")
    .eq("is_active", true)
    .returns<
      Array<{ id: string; email: string | null; full_name: string | null }>
    >();

  const notaryName = getNotaryName(notaryProfile, userProfile);
  const reviewUrl = `${getBaseUrl()}/dashboard/users/${userId}`;

  const notifications =
    admins
      ?.filter((admin) => admin.email)
      .map((admin) => ({
        user_id: admin.id,
        channel: "email",
        type: "notary_ready_for_review",
        status: "pending",
        subject: "Notary Ready For Review",
        message: `Hello Admin,

${notaryName} has completed their profile and credential submission.

Notary Details

Name: ${notaryName}
Email: ${userProfile.email ?? "-"}

Please review this notary in the admin dashboard.
`,
        metadata: {
          email: admin.email,
          admin_name: admin.full_name,
          notary_user_id: userId,
          notary_name: notaryName,
          notary_email: userProfile.email,
          review_url: reviewUrl,
          cta_label: "Review Notary",
        },
        attempts: 0,
      })) || [];

  if (notifications.length > 0) {
    await supabase.from("notification_queue").insert(notifications);
  }
}