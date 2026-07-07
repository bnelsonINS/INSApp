import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Assignment = {
  id: string;
  control_number: string | null;
  status: string | null;
  signing_type: string | null;
  borrower_name: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  notary_fee: number | string | null;
};

type NotaryProfile = {
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

type Credential = {
  credential_type: string | null;
  status: string | null;
  issue_date: string | null;
  expiration_date: string | null;
};

function formatShortDate(date: string | null) {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "";

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "$0.00";

  const amount = Number(value);
  if (Number.isNaN(amount)) return "$0.00";

  return `$${amount.toFixed(2)}`;
}

function isToday(date: string | null) {
  if (!date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return date === today;
}

function statusBadge(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "new request") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (normalized === "needs notary") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (normalized === "not confirmed") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (normalized === "confirmed") return "bg-slate-100 text-slate-700 ring-slate-200";
  if (normalized === "in progress") return "bg-slate-100 text-slate-700 ring-slate-200";
  if (normalized === "late") return "bg-red-50 text-red-700 ring-red-200";
  if (normalized === "signing complete") return "bg-green-50 text-green-700 ring-green-200";
  if (normalized === "closed") return "bg-green-50 text-green-700 ring-green-200";
  if (normalized === "cancelled") return "bg-red-50 text-red-700 ring-red-200";
  if (normalized === "did not sign") return "bg-red-50 text-red-700 ring-red-200";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function statusDot(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "new request") return "bg-blue-500";
  if (normalized === "needs notary") return "bg-blue-500";
  if (normalized === "not confirmed") return "bg-blue-500";
  if (normalized === "confirmed") return "bg-slate-500";
  if (normalized === "in progress") return "bg-slate-500";
  if (normalized === "late") return "bg-red-500";
  if (normalized === "signing complete") return "bg-green-500";
  if (normalized === "closed") return "bg-green-500";
  if (normalized === "cancelled") return "bg-red-500";
  if (normalized === "did not sign") return "bg-red-500";

  return "bg-slate-400";
}

function normalizeCredentialType(type: string | null) {
  return (type ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isFilled(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function isExpired(date: string | null | undefined) {
  if (!date) return true;

  const expirationDate = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expirationDate < today;
}

function hasCurrentCredential(
  credentials: Credential[],
  aliases: string[],
  options?: { requiresExpiration?: boolean; w9YearMinimum?: number }
) {
  const normalizedAliases = aliases.map(normalizeCredentialType);

  return credentials.some((credential) => {
    const normalizedType = normalizeCredentialType(credential.credential_type);
    const status = (credential.status ?? "").toLowerCase();

    if (!normalizedAliases.includes(normalizedType)) return false;
    if (status === "rejected" || status === "denied") return false;

    if (options?.requiresExpiration && isExpired(credential.expiration_date)) {
      return false;
    }

    if (options?.w9YearMinimum) {
      const year = credential.issue_date
        ? new Date(`${credential.issue_date}T00:00:00`).getFullYear()
        : null;

      if (year && year < options.w9YearMinimum) return false;
    }

    return true;
  });
}

function buildMissingProfileItems(profile: NotaryProfile | null) {
  const missingItems: string[] = [];

  if (!isFilled(profile?.first_name)) missingItems.push("First Name");
  if (!isFilled(profile?.last_name)) missingItems.push("Last Name");

  if (!isFilled(profile?.address)) missingItems.push("Address");
  if (!isFilled(profile?.city)) missingItems.push("City");
  if (!isFilled(profile?.state)) missingItems.push("State");
  if (!isFilled(profile?.zip)) missingItems.push("ZIP Code");

  if (!isFilled(profile?.commission_number)) {
    missingItems.push("Commission Number");
  }

  if (!isFilled(profile?.commission_expiration)) {
    missingItems.push("Commission Expiration");
  }

  if (!isFilled(profile?.home_phone) && !isFilled(profile?.mobile_phone)) {
    missingItems.push("Home Phone or Mobile Phone");
  }

  if (
    !profile?.accepts_text_messages &&
    !profile?.accepts_email_notifications
  ) {
    missingItems.push("Accept Text Messages or Accept Email Notifications");
  }

  return missingItems;
}

function buildMissingCredentialItems(credentials: Credential[]) {
  const requirements = [
    {
      label: "Non-expired Background Check",
      aliases: ["background_check", "background check"],
      requiresExpiration: true,
    },
    {
      label: "E&O Insurance",
      aliases: [
        "eo_insurance",
        "e_and_o_insurance",
        "errors_and_omissions_insurance",
        "e&o insurance",
      ],
      requiresExpiration: true,
    },
    {
      label: "Notary Bond",
      aliases: ["notary_bond", "bond", "notary bond"],
      requiresExpiration: true,
    },
    {
      label: "Notary Commission",
      aliases: ["notary_commission", "commission", "notary commission"],
      requiresExpiration: true,
    },
    {
      label: "Title Producer License",
      aliases: [
        "title_producer_license",
        "title producer license",
        "title_license",
        "title insurance producer license",
      ],
      requiresExpiration: true,
    },
    {
      label: "W9, 2018 or newer",
      aliases: ["w9", "w_9", "w-9"],
      w9YearMinimum: 2018,
    },
  ];

  return requirements
    .filter(
      (requirement) =>
        !hasCurrentCredential(credentials, requirement.aliases, {
          requiresExpiration: requirement.requiresExpiration,
          w9YearMinimum: requirement.w9YearMinimum,
        })
    )
    .map((requirement) => requirement.label);
}

export default async function NotaryDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { count: pendingImportCount } = await supabase
  .from("pro_import_drafts")
  .select("id", { count: "exact", head: true })
  .eq("notary_id", user.id)
  .eq("status", "pending_review");
  

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role, is_active, approval_status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "notary" || !profile.is_active) {
    redirect("/login");
  }

  const { data: notaryProfile } = await supabase
    .from("notary_profiles")
    .select(
      "first_name, last_name, address, city, state, zip, commission_number, commission_expiration, home_phone, mobile_phone, accepts_text_messages, accepts_email_notifications"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
    .order("signing_date", { ascending: true, nullsFirst: false })
    .order("signing_time", { ascending: true, nullsFirst: false });

  const safeAssignments = (assignments ?? []) as Assignment[];

  const todayAssignments = safeAssignments.filter((item) =>
    isToday(item.signing_date)
  );

  const visibleAssignments = safeAssignments.filter((item) => {
    const status = (item.status ?? "").toLowerCase();
    return status !== "closed" && status !== "cancelled";
  });

  const notConfirmed = safeAssignments.filter((item) => {
    const status = (item.status ?? "").toLowerCase();
    return status === "new request" || status === "not confirmed";
  }).length;

  const confirmed = safeAssignments.filter(
    (item) => item.status === "Confirmed"
  ).length;

  const inProgress = safeAssignments.filter(
    (item) => item.status === "In Progress" || item.status === "Late"
  ).length;

  const signingComplete = safeAssignments.filter(
    (item) => item.status === "Signing Complete"
  ).length;

  const closedThisMonth = safeAssignments.filter((item) => {
    if (item.status !== "Closed" || !item.signing_date) return false;

    const currentMonth = new Date().toISOString().slice(0, 7);
    return item.signing_date.startsWith(currentMonth);
  });

  const pendingPayment = safeAssignments
    .filter(
      (item) => item.status === "Signing Complete" || item.status === "Closed"
    )
    .reduce((sum, item) => sum + Number(item.notary_fee ?? 0), 0);

  const monthEarnings = closedThisMonth.reduce(
    (sum, item) => sum + Number(item.notary_fee ?? 0),
    0
  );

  const yearEarnings = safeAssignments
    .filter((item) => {
      if (item.status !== "Closed" || !item.signing_date) return false;

      const currentYear = new Date().getFullYear().toString();
      return item.signing_date.startsWith(currentYear);
    })
    .reduce((sum, item) => sum + Number(item.notary_fee ?? 0), 0);

  const { data: credentials } = await supabase
    .from("notary_credentials")
    .select("*")
    .eq("user_id", user.id);

  const safeCredentials = (credentials ?? []) as Credential[];
  const safeNotaryProfile = notaryProfile as NotaryProfile | null;

  const missingProfileItems = buildMissingProfileItems(safeNotaryProfile);
  const missingCredentialItems = buildMissingCredentialItems(safeCredentials);
  const hasMissingReadinessItems =
    missingProfileItems.length > 0 || missingCredentialItems.length > 0;
  //const isApproved = profile.approval_status === "approved";

  const credentialAlerts: string[] = [];
  const today = new Date();

  safeCredentials.forEach((credential) => {
    if (!credential.expiration_date) return;

    const expirationDate = new Date(credential.expiration_date);
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) {
      credentialAlerts.push(`${credential.credential_type} has expired`);
    } else if (daysUntilExpiration <= 30) {
      credentialAlerts.push(
        `${credential.credential_type} expires in ${daysUntilExpiration} day${
          daysUntilExpiration === 1 ? "" : "s"
        }`
      );
    }
  });

  const { count: countyCount } = await supabase
    .from("notary_coverage_counties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: zipCount } = await supabase
    .from("notary_coverage_zip_codes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      {(pendingImportCount ?? 0) > 0 && (
  <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Imported Jobs Ready for Review
        </p>

        <h2 className="mt-1 text-xl font-black text-slate-950">
          You have {pendingImportCount} imported{" "}
          {pendingImportCount === 1 ? "job" : "jobs"} waiting for review.
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Review the imported information before creating the job.
        </p>
      </div>

      <Link
        href="/notary/pro/imports"
        className="inline-flex rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-black text-white hover:bg-blue-950"
      >
        Review Imports
      </Link>
    </div>
  </section>
)}
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-blue-100">Welcome back</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {profile.full_name || profile.email}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
              Focus on today&apos;s signings, Not Confirmed, payments, and
              credential alerts.
            </p>
          </div>

          <a
            href="/notary/assignments"
            className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:bg-slate-100"
          >
            View Assignments
          </a>
        </div>
      </section>

      {hasMissingReadinessItems && (
        <section className="rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {hasMissingReadinessItems
                  ? "Profile Pending Approval"
                  : "Pending Review"}
              </h2>

              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                {hasMissingReadinessItems
                  ? "Some profile information or credentials are missing. Complete the required items before your account can be approved for assignments."
                  : "Your profile and credentials appear complete. Indiana Notary Solutions will review your account before you can receive assignments."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {missingProfileItems.length > 0 && (
                <a
                  href="/notary/profile"
                  className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-blue-950"
                >
                  Complete Profile
                </a>
              )}

              {missingCredentialItems.length > 0 && (
                <a
                  href="/notary/credentials"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Upload Credentials
                </a>
              )}

              {!hasMissingReadinessItems && (
                <a
                  href="/notary/credentials"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Review Credentials
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {credentialAlerts.length > 0 && (
        <section className="rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Credential Alert
              </h2>
              <div className="mt-2 space-y-1">
                {credentialAlerts.slice(0, 2).map((alert) => (
                  <p key={alert} className="text-sm font-medium text-slate-600">
                    <span className="font-bold text-amber-600">⚠</span> {alert}
                  </p>
                ))}
              </div>
            </div>

            <a
              href="/notary/credentials"
              className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-blue-950"
            >
              Review Credentials
            </a>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <a
          href="/notary/assignments?status=Not Confirmed"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-slate-50"
        >
          <div className="mb-4 h-1 w-10 rounded-full bg-blue-500" />
          <p className="text-sm font-semibold text-slate-600">
            Not Confirmed
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {notConfirmed}
          </p>
          <p className="mt-2 text-xs text-slate-500">Waiting on your response</p>
        </a>

        <a
          href="/notary/assignments"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-slate-50"
        >
          <div className="mb-4 h-1 w-10 rounded-full bg-[#0B1F4D]" />
          <p className="text-sm font-semibold text-slate-600">
            Today&apos;s Signings
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {todayAssignments.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">Scheduled for today</p>
        </a>

        <a
          href="/notary/earnings"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-200 hover:bg-slate-50"
        >
          <div className="mb-4 h-1 w-10 rounded-full bg-green-600" />
          <p className="text-sm font-semibold text-slate-600">
            Pending Payments
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {formatMoney(pendingPayment)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Signing complete or closed
          </p>
        </a>

        <a
          href="/notary/credentials"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-200 hover:bg-slate-50"
        >
          <div className="mb-4 h-1 w-10 rounded-full bg-amber-500" />
          <p className="text-sm font-semibold text-slate-600">
            Credential Alerts
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {credentialAlerts.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Expired or expiring soon
          </p>
        </a>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Assigned Signings
              </h2>
              <p className="text-sm text-slate-500">
                All active assignments attached to your notary account.
              </p>
            </div>

            <a
              href="/notary/assignments"
              className="text-sm font-bold text-[#0B1F4D] hover:underline"
            >
              View all
            </a>
          </div>

          {!visibleAssignments.length ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-800">
                No active assignments.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Nothing assigned right now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {visibleAssignments.map((assignment) => (
                <a
                  key={assignment.id}
                  href={`/notary/assignments/${assignment.id}`}
                  className="block p-5 transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <div className="min-w-20 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          {formatShortDate(assignment.signing_date)}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {formatTime(assignment.signing_time) || "TBD"}
                        </p>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-950">
                            {assignment.borrower_name ?? "Borrower"}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge(
                              assignment.status
                            )}`}
                          >
                            {assignment.status ?? "Unknown"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-600">
                          {assignment.signing_type ?? "Signing"}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          {assignment.signing_city ?? "—"},{" "}
                          {assignment.signing_state ?? "IN"}{" "}
                          {assignment.signing_zip ?? ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
                      <p className="text-lg font-bold text-slate-950">
                        {formatMoney(assignment.notary_fee)}
                      </p>
                      <p className="text-sm font-semibold text-[#0B1F4D]">
                        View order →
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Earnings Snapshot
            </h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-600">
                  This Month
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {formatMoney(monthEarnings)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-600">
                  Pending Payments
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {formatMoney(pendingPayment)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-600">
                  Paid YTD
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {formatMoney(yearEarnings)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Assignment Status
            </h2>

            <div className="mt-4 space-y-3">
              <a
                href="/notary/assignments?status=Not Confirmed"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusDot(
                      "Not Confirmed"
                    )}`}
                  />
                  Not Confirmed
                </span>
                <span className="font-bold text-slate-950">{notConfirmed}</span>
              </a>

              <a
                href="/notary/assignments?status=Confirmed"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusDot(
                      "Confirmed"
                    )}`}
                  />
                  Confirmed
                </span>
                <span className="font-bold text-slate-950">{confirmed}</span>
              </a>

              <a
                href="/notary/assignments?status=In Progress"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusDot(
                      "In Progress"
                    )}`}
                  />
                  In Progress
                </span>
                <span className="font-bold text-slate-950">{inProgress}</span>
              </a>

              <a
                href="/notary/assignments?status=Signing Complete"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusDot(
                      "Signing Complete"
                    )}`}
                  />
                  Signing Complete
                </span>
                <span className="font-bold text-slate-950">
                  {signingComplete}
                </span>
              </a>

              <a
                href="/notary/assignments?status=Closed"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusDot(
                      "Closed"
                    )}`}
                  />
                  Closed This Month
                </span>
                <span className="font-bold text-slate-950">
                  {closedThisMonth.length}
                </span>
              </a>
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Coverage Area
              </h2>
              <p className="text-sm text-slate-500">
                Areas where you are available for assignments.
              </p>
            </div>

            <a
              href="/notary/coverage"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Manage Coverage
            </a>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">Counties</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">
                {countyCount ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">ZIP Codes</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">
                {zipCount ?? 0}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Status Guide</h2>
          <p className="mt-1 text-sm text-slate-500">
            Quick reference for what each assignment status means.
          </p>

          <details className="mt-4 rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-bold text-slate-900">
              View status definitions
            </summary>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-bold text-slate-950">Not Confirmed</p>
                <p className="text-sm text-slate-600">
                  New assignment waiting for your response.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-bold text-slate-950">Confirmed</p>
                <p className="text-sm text-slate-600">
                  Appointment confirmed.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-bold text-slate-950">In Progress</p>
                <p className="text-sm text-slate-600">
                  Signing day or package in progress.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-bold text-slate-950">Signing Complete</p>
                <p className="text-sm text-slate-600">
                  You uploaded the completed package.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-bold text-slate-950">Closed</p>
                <p className="text-sm text-slate-600">
                  INS finished processing and title accepted the file.
                </p>
              </div>
            </div>
          </details>
        </section>
      </section>
    </main>
  );
}