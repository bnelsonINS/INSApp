import Link from "next/link";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DashboardOrder = {
  id: string;
  control_number: string | null;
  borrower_name: string | null;
  status: string | null;
  client_fee: number | string | null;
  fee: number | string | null;
  notary_fee: number | string | null;
  created_at: string;
  assigned_at: string | null;
  assigned_notary_id: string | null;
  signing_date: string | null;
  signing_time: string | null;
};

type CredentialReviewRow = {
  id: string;
  user_id: string | null;
  credential_type: string | null;
  provider: string | null;
  credential_number: string | null;
  amount: number | string | null;
  issue_date: string | null;
  expiration_date: string | null;
  status: string | null;
  admin_notes: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type AdminAttentionNotice = {
  id: string;
  order: DashboardOrder;
  label: string;
  description: string;
  timing: string;
  badgeClass: string;
  sortPriority: number;
  sortDate: number;
};

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeSince(value: string | null | undefined) {
  if (!value) return "Unknown";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) return "Unknown";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m ago`;
  if (minutes <= 0) return `${hours}h ago`;

  return `${hours}h ${minutes}m ago`;
}

function getSigningDateTime(order: DashboardOrder) {
  if (!order.signing_date || !order.signing_time) return null;

  const datePart = order.signing_date.includes("T")
    ? order.signing_date.split("T")[0]
    : order.signing_date;

  const timePart = order.signing_time.slice(0, 5);
  const signingDateTime = new Date(`${datePart}T${timePart}:00`);

  if (Number.isNaN(signingDateTime.getTime())) return null;

  return signingDateTime;
}

function formatTimePast(value: Date | null) {
  if (!value) return "Unknown";

  const diffMs = Date.now() - value.getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) return "Not past signing time yet";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m past signing time`;
  if (minutes <= 0) return `${hours}h past signing time`;

  return `${hours}h ${minutes}m past signing time`;
}

function isSigningNotStarted(order: DashboardOrder, now: Date) {
  const signingDateTime = getSigningDateTime(order);
  if (!signingDateTime) return false;

  const fiveMinutesAfterSigning = signingDateTime.getTime() + 5 * 60 * 1000;
  const normalizedStatus = (order.status ?? "").toLowerCase();

  const alreadyStartedStatuses = [
    "in progress",
    "signing complete",
    "closed",
    "cancelled",
    "canceled",
    "late",
  ];

  return (
    Boolean(order.assigned_notary_id) &&
    now.getTime() >= fiveMinutesAfterSigning &&
    !alreadyStartedStatuses.includes(normalizedStatus)
  );
}

function isScanbacksOverdue(order: DashboardOrder, now: Date) {
  const signingDateTime = getSigningDateTime(order);
  if (!signingDateTime) return false;

  const twoHoursAfterSigning = signingDateTime.getTime() + 2 * 60 * 60 * 1000;
  const normalizedStatus = (order.status ?? "").toLowerCase();

  const scanbacksDoneStatuses = [
    "signing complete",
    "closed",
    "cancelled",
    "canceled",
  ];

  return (
    Boolean(order.assigned_notary_id) &&
    now.getTime() >= twoHoursAfterSigning &&
    normalizedStatus === "in progress" &&
    !scanbacksDoneStatuses.includes(normalizedStatus)
  );
}

function formatTimePastScanbacks(value: Date | null) {
  if (!value) return "Unknown";

  const twoHoursAfterSigning = new Date(value.getTime() + 2 * 60 * 60 * 1000);
  const diffMs = Date.now() - twoHoursAfterSigning.getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) return "Not overdue yet";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m overdue`;
  if (minutes <= 0) return `${hours}h overdue`;

  return `${hours}h ${minutes}m overdue`;
}

function getTitleFee(order: DashboardOrder) {
  const amount = Number(order.client_fee ?? order.fee ?? 0);
  return Number.isNaN(amount) ? 0 : amount;
}

function getNotaryFee(order: DashboardOrder) {
  const amount = Number(order.notary_fee ?? 0);
  return Number.isNaN(amount) ? 0 : amount;
}

function sumTitleFees(orders: DashboardOrder[]) {
  return orders.reduce((sum, order) => sum + getTitleFee(order), 0);
}

function sumNotaryFees(orders: DashboardOrder[]) {
  return orders.reduce((sum, order) => sum + getNotaryFee(order), 0);
}

function getQuarter(date: Date) {
  return Math.floor(date.getMonth() / 3) + 1;
}

function statusBadge(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "new request") return "bg-blue-100 text-blue-800";
  if (normalized === "not confirmed") return "bg-amber-100 text-amber-800";
  if (normalized === "confirmed") return "bg-purple-100 text-purple-800";
  if (normalized === "in progress") return "bg-indigo-100 text-indigo-800";
  if (normalized === "late") return "bg-red-100 text-red-800";
  if (normalized === "signing complete") return "bg-orange-100 text-orange-800";
  if (normalized === "closed") return "bg-green-100 text-green-800";

  return "bg-slate-100 text-slate-700";
}

function credentialStatusLabel(status: string | null) {
  const normalized = (status ?? "").replaceAll("_", " ");

  if (!normalized) return "Needs Review";

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = getQuarter(now);
  const confirmationOverdueCutoff = new Date(
    now.getTime() - 2 * 60 * 60 * 1000,
  ).toISOString();

  const { count: totalOrders } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true });

  const { count: activeNotaries } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "notary")
    .eq("is_active", true);

  const { count: openAssignments } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .not("status", "in", '("Closed","Cancelled")');

  const { count: unassignedOrders } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .is("assigned_notary_id", null);

  const { count: signingComplete } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .eq("status", "Signing Complete");

  const { data: financialOrders } = await supabase
    .from("assignments")
    .select(
      "id, control_number, borrower_name, status, client_fee, fee, notary_fee, created_at, assigned_at, assigned_notary_id, signing_date, signing_time",
    );

  const { data: credentialRows } = await supabase
    .from("notary_credentials")
    .select(
      "id, user_id, credential_type, provider, credential_number, amount, issue_date, expiration_date, status, admin_notes",
    )
    .eq("status", "pending_review");

  const credentialReviews = (credentialRows ?? []) as CredentialReviewRow[];

  const credentialUserIds = Array.from(
    new Set(
      credentialReviews
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: credentialProfiles } = credentialUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", credentialUserIds)
    : { data: [] as ProfileRow[] };

  const ordersForFinancials = (financialOrders ?? []) as DashboardOrder[];

  const confirmationOverdueOrders = ordersForFinancials
    .filter(
      (order) =>
        order.status === "Not Confirmed" &&
        Boolean(order.assigned_notary_id) &&
        Boolean(order.assigned_at) &&
        new Date(order.assigned_at as string).toISOString() <=
          confirmationOverdueCutoff,
    )
    .sort((a, b) => {
      const aTime = new Date(a.assigned_at ?? "").getTime();
      const bTime = new Date(b.assigned_at ?? "").getTime();
      return aTime - bTime;
    });

  const confirmationNotaryIds = Array.from(
    new Set(
      confirmationOverdueOrders
        .map((order) => order.assigned_notary_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: confirmationNotaryProfiles } = confirmationNotaryIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", confirmationNotaryIds)
    : { data: [] as ProfileRow[] };

  const confirmationNotaryMap = new Map(
    ((confirmationNotaryProfiles ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const profileMap = new Map(
    ((credentialProfiles ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const monthOrders = ordersForFinancials.filter((order) => {
    const date = new Date(order.created_at);
    return (
      date.getFullYear() === currentYear && date.getMonth() === currentMonth
    );
  });

  const yearOrders = ordersForFinancials.filter((order) => {
    const date = new Date(order.created_at);
    return date.getFullYear() === currentYear;
  });

  const currentQuarterOrders = yearOrders.filter(
    (order) => getQuarter(new Date(order.created_at)) === currentQuarter,
  );

  const q1Orders = yearOrders.filter(
    (order) => getQuarter(new Date(order.created_at)) === 1,
  );
  const q2Orders = yearOrders.filter(
    (order) => getQuarter(new Date(order.created_at)) === 2,
  );
  const q3Orders = yearOrders.filter(
    (order) => getQuarter(new Date(order.created_at)) === 3,
  );
  const q4Orders = yearOrders.filter(
    (order) => getQuarter(new Date(order.created_at)) === 4,
  );

  const billablesMTD = sumTitleFees(monthOrders);
  const payablesMTD = sumNotaryFees(monthOrders);
  const profitMTD = billablesMTD - payablesMTD;

  const billablesYTD = sumTitleFees(yearOrders);
  const payablesYTD = sumNotaryFees(yearOrders);
  const profitYTD = billablesYTD - payablesYTD;

  const billablesCurrentQuarter = sumTitleFees(currentQuarterOrders);
  const profitCurrentQuarter =
    billablesCurrentQuarter - sumNotaryFees(currentQuarterOrders);

  const confirmationOverdueNotices: AdminAttentionNotice[] =
    confirmationOverdueOrders.map((order) => ({
      id: `confirmation-${order.id}`,
      order,
      label: "Confirmation Overdue",
      description: "Notary has not confirmed appointment",
      timing: `Assigned ${formatTimeSince(order.assigned_at)}`,
      badgeClass: "bg-red-100 text-red-800 ring-red-200",
      sortPriority: 1,
      sortDate: new Date(order.assigned_at ?? order.created_at).getTime(),
    }));

  const needsAssignmentNotices: AdminAttentionNotice[] = ordersForFinancials
    .filter((order) => order.status === "New Request")
    .map((order) => ({
      id: `needs-assignment-${order.id}`,
      order,
      label: "Needs Assignment",
      description: "Order needs a notary assigned",
      timing: `Created ${formatTimeSince(order.created_at)}`,
      badgeClass: "bg-blue-100 text-blue-800 ring-blue-200",
      sortPriority: 2,
      sortDate: new Date(order.created_at).getTime(),
    }));

  const lateNotices: AdminAttentionNotice[] = ordersForFinancials
    .filter((order) => order.status === "Late")
    .map((order) => ({
      id: `late-${order.id}`,
      order,
      label: "Late",
      description: "Order is marked late and needs follow-up",
      timing: `Created ${formatTimeSince(order.created_at)}`,
      badgeClass: "bg-red-100 text-red-800 ring-red-200",
      sortPriority: 3,
      sortDate: new Date(order.created_at).getTime(),
    }));

  const signingNotStartedNotices: AdminAttentionNotice[] = ordersForFinancials
    .filter((order) => isSigningNotStarted(order, now))
    .map((order) => {
      const signingDateTime = getSigningDateTime(order);

      return {
        id: `signing-not-started-${order.id}`,
        order,
        label: "Signing Not Started",
        description: "Notary has not marked the order In Progress",
        timing: formatTimePast(signingDateTime),
        badgeClass: "bg-amber-100 text-amber-800 ring-amber-200",
        sortPriority: 3,
        sortDate:
          signingDateTime?.getTime() ?? new Date(order.created_at).getTime(),
      };
    });

  const scanbacksOverdueNotices: AdminAttentionNotice[] = ordersForFinancials
    .filter((order) => isScanbacksOverdue(order, now))
    .map((order) => {
      const signingDateTime = getSigningDateTime(order);

      return {
        id: `scanbacks-overdue-${order.id}`,
        order,
        label: "Scanbacks Overdue",
        description: "Scanbacks have not been uploaded",
        timing: formatTimePastScanbacks(signingDateTime),
        badgeClass: "bg-red-100 text-red-800 ring-red-200",
        sortPriority: 4,
        sortDate:
          signingDateTime?.getTime() ?? new Date(order.created_at).getTime(),
      };
    });

  const readyForReviewNotices: AdminAttentionNotice[] = ordersForFinancials
    .filter((order) => order.status === "Signing Complete")
    .map((order) => ({
      id: `ready-review-${order.id}`,
      order,
      label: "Ready for Review",
      description: "Signing is complete and needs admin QA",
      timing: `Updated status: ${order.status}`,
      badgeClass: "bg-orange-100 text-orange-800 ring-orange-200",
      sortPriority: 5,
      sortDate: new Date(order.created_at).getTime(),
    }));

  const adminAttentionNotices = [
    ...confirmationOverdueNotices,
    ...needsAssignmentNotices,
    ...lateNotices,
    ...signingNotStartedNotices,
    ...scanbacksOverdueNotices,
    ...readyForReviewNotices,
  ]
    .sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }

      return a.sortDate - b.sortDate;
    })
    .slice(0, 10);

  const quarters = [
    { label: "Q1", orders: q1Orders },
    { label: "Q2", orders: q2Orders },
    { label: "Q3", orders: q3Orders },
    { label: "Q4", orders: q4Orders },
  ];

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
        <p className="text-sm font-semibold text-blue-100">Admin Overview</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-blue-100/90">
          Track orders, notaries, assignment status, credential reviews, and
          platform financials.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Total Orders</p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">
            {totalOrders ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Active Notaries
          </p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">
            {activeNotaries ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Open Assignments
          </p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">
            {openAssignments ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Unassigned Orders
          </p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">
            {unassignedOrders ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            Operational Alerts
          </p>
          <p className="mt-2 text-4xl font-bold text-red-800">
            {confirmationOverdueOrders.length +
              signingNotStartedNotices.length +
              scanbacksOverdueNotices.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Needs QA</p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">
            {signingComplete ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Credentials Review
          </p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">
            {credentialReviews.length}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Admin Attention Needed
            </h2>
            <p className="text-sm text-red-700">
              Operational notices that need admin review, assignment, follow-up,
              or closure.
            </p>
          </div>

          <Link
            href="/dashboard/orders"
            className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
          >
            View Orders
          </Link>
        </div>

        {!adminAttentionNotices.length ? (
          <div className="p-8 text-sm text-slate-500">
            Nothing needs attention right now.
          </div>
        ) : (
          <div className="divide-y">
            {adminAttentionNotices.map((notice) => {
              const notary = notice.order.assigned_notary_id
                ? confirmationNotaryMap.get(notice.order.assigned_notary_id)
                : null;

              return (
                <Link
                  key={notice.id}
                  href={`/dashboard/orders/${notice.order.id}`}
                  className="block p-5 transition hover:bg-slate-50"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_1.5fr_1fr_auto] lg:items-center">
                    <div>
                      <p className="font-bold text-slate-950">
                        {notice.order.borrower_name ?? "Unnamed Order"}
                      </p>
                      <p className="text-sm text-slate-500">
                        Control # {notice.order.control_number ?? "—"}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-950">
                        {notice.description}
                      </p>
                      <p className="text-sm text-slate-500">{notice.timing}</p>
                      {notice.label === "Confirmation Overdue" ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Notary: {notary?.full_name ?? "Unknown Notary"}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-sm text-slate-600">
                      <p>Status: {notice.order.status ?? "Unknown"}</p>
                      <p>Created: {formatDate(notice.order.created_at)}</p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${notice.badgeClass}`}
                    >
                      {notice.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Credential Uploads Needing Review
            </h2>
            <p className="text-sm text-red-700">
              Notaries who uploaded credentials that need admin approval.
            </p>
          </div>

          <Link
            href="/dashboard/users"
            className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
          >
            View Users
          </Link>
        </div>

        {!credentialReviews.length ? (
          <div className="p-8 text-sm text-slate-500">
            No credential uploads need review right now.
          </div>
        ) : (
          <div className="divide-y">
            {credentialReviews.slice(0, 6).map((credential) => {
              const profile = credential.user_id
                ? profileMap.get(credential.user_id)
                : null;

              return (
                <Link
                  key={credential.id}
                  href={
                    credential.user_id
                      ? `/dashboard/users/${credential.user_id}`
                      : "/dashboard/users"
                  }
                  className="block p-5 transition hover:bg-slate-50"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_1.5fr_1fr_auto] lg:items-center">
                    <div>
                      <p className="font-bold text-slate-950">
                        {profile?.full_name ?? "Unknown Notary"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {profile?.email ?? "No email found"}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-950">
                        {credential.credential_type ?? "Credential"}
                      </p>
                      <p className="text-sm text-slate-500">
                        Provider: {credential.provider ?? "—"}
                      </p>
                    </div>

                    <div className="text-sm text-slate-600">
                      <p>Issued: {formatDate(credential.issue_date)}</p>
                      <p>Expires: {formatDate(credential.expiration_date)}</p>
                    </div>

                    <span className="w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 ring-1 ring-red-200">
                      {credentialStatusLabel(credential.status)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Financials</h2>
          <p className="text-sm text-slate-500">
            Billables are title fees. Payables are notary fees. Profit is the
            difference.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">
              Billables MTD
            </p>
            <p className="mt-2 text-3xl font-bold text-[#0B1F4D]">
              {formatMoney(billablesMTD)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">Payables MTD</p>
            <p className="mt-2 text-3xl font-bold text-[#0B1F4D]">
              {formatMoney(payablesMTD)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">Profit MTD</p>
            <p className="mt-2 text-3xl font-bold text-[#0B1F4D]">
              {formatMoney(profitMTD)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-600">
              Current Quarter Profit
            </p>
            <p className="mt-2 text-3xl font-bold text-[#0B1F4D]">
              {formatMoney(profitCurrentQuarter)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">
              Billables YTD
            </p>
            <p className="mt-2 text-3xl font-bold text-[#0B1F4D]">
              {formatMoney(billablesYTD)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">Payables YTD</p>
            <p className="mt-2 text-3xl font-bold text-[#0B1F4D]">
              {formatMoney(payablesYTD)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">Profit YTD</p>
            <p className="mt-2 text-3xl font-bold text-[#0B1F4D]">
              {formatMoney(profitYTD)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">
              Current Quarter Billables
            </p>
            <p className="mt-2 text-3xl font-bold text-[#0B1F4D]">
              {formatMoney(billablesCurrentQuarter)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quarters.map((quarter) => {
            const billables = sumTitleFees(quarter.orders);
            const payables = sumNotaryFees(quarter.orders);
            const profit = billables - payables;

            return (
              <div
                key={quarter.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-lg font-bold text-slate-950">
                  {quarter.label}
                </p>

                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <span className="font-semibold text-slate-500">
                      Billables:
                    </span>{" "}
                    {formatMoney(billables)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">
                      Payables:
                    </span>{" "}
                    {formatMoney(payables)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">
                      Profit:
                    </span>{" "}
                    {formatMoney(profit)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Quick Actions</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/orders"
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Manage Orders
          </Link>

          <Link
            href="/dashboard/users"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Manage Users
          </Link>

          <Link
            href="/dashboard/orders/new"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Create Order
          </Link>
        </div>
      </section>
    </main>
  );
}
