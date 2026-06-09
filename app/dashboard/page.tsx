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

function getActionRequiredInfo(order: DashboardOrder) {
  const normalized = (order.status ?? "").toLowerCase();

  if (normalized === "new request") {
    return {
      label: "Needs Assignment",
      reason:
        "This order is new and has not moved into the assignment workflow yet.",
      nextAction: "Review the order details and assign a qualified notary.",
      badgeClass: "bg-blue-100 text-blue-800 ring-blue-200",
      accentClass: "border-l-blue-500",
    };
  }

  if (normalized === "late") {
    return {
      label: "Late",
      reason:
        "This order is marked Late and needs immediate admin follow-up.",
      nextAction:
        "Contact the notary, confirm the signing status, and update the order.",
      badgeClass: "bg-red-100 text-red-800 ring-red-200",
      accentClass: "border-l-red-500",
    };
  }

  if (normalized === "signing complete") {
    return {
      label: "Ready for Review",
      reason: "The signing is complete, but the file has not been closed.",
      nextAction:
        "Review scanbacks, verify shipping/tracking, then close the order.",
      badgeClass: "bg-orange-100 text-orange-800 ring-orange-200",
      accentClass: "border-l-orange-500",
    };
  }

  return {
    label: "Review Needed",
    reason: "This order is in the action queue and needs admin review.",
    nextAction: "Open the order and confirm the next required step.",
    badgeClass: "bg-slate-100 text-slate-700 ring-slate-200",
    accentClass: "border-l-slate-400",
  };
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = getQuarter(now);

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
      "id, control_number, borrower_name, status, client_fee, fee, notary_fee, created_at"
    );

  const { data: credentialRows } = await supabase
    .from("notary_credentials")
    .select(
      "id, user_id, credential_type, provider, credential_number, amount, issue_date, expiration_date, status, admin_notes"
    )
    .eq("status", "pending_review");

  const credentialReviews = (credentialRows ?? []) as CredentialReviewRow[];

  const credentialUserIds = Array.from(
    new Set(
      credentialReviews
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: credentialProfiles } = credentialUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", credentialUserIds)
    : { data: [] as ProfileRow[] };

  const profileMap = new Map(
    ((credentialProfiles ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const ordersForFinancials = (financialOrders ?? []) as DashboardOrder[];

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
    (order) => getQuarter(new Date(order.created_at)) === currentQuarter
  );

  const q1Orders = yearOrders.filter(
    (order) => getQuarter(new Date(order.created_at)) === 1
  );
  const q2Orders = yearOrders.filter(
    (order) => getQuarter(new Date(order.created_at)) === 2
  );
  const q3Orders = yearOrders.filter(
    (order) => getQuarter(new Date(order.created_at)) === 3
  );
  const q4Orders = yearOrders.filter(
    (order) => getQuarter(new Date(order.created_at)) === 4
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

  const needsAttention = ordersForFinancials
    .filter((order) =>
      ["New Request", "Late", "Signing Complete"].includes(order.status ?? "")
    )
    .slice(0, 6);

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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Action Required
            </h2>
            <p className="text-sm text-amber-700">
              Orders needing admin review, assignment, follow-up, or closure.
            </p>
          </div>

          <Link
            href="/dashboard/orders"
            className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
          >
            View Orders
          </Link>
        </div>

        {!needsAttention.length ? (
          <div className="p-8 text-sm text-slate-500">
            Nothing needs attention right now.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {needsAttention.map((order) => {
              const titleFee = getTitleFee(order);
              const notaryFee = getNotaryFee(order);
              const profit = titleFee - notaryFee;
              const actionInfo = getActionRequiredInfo(order);

              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block p-5 transition hover:bg-slate-50"
                >
                  <div
                    className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${actionInfo.accentClass}`}
                  >
                    <div className="grid gap-5 xl:grid-cols-[1.2fr_1.6fr_1fr_auto] xl:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-950">
                            {order.borrower_name ?? "Unnamed Order"}
                          </p>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${actionInfo.badgeClass}`}
                          >
                            {actionInfo.label}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          Control # {order.control_number ?? "—"}
                        </p>

                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Current Status
                        </p>
                        <span
                          className={`mt-1 inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${statusBadge(
                            order.status
                          )}`}
                        >
                          {order.status ?? "Unknown"}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Why this is showing
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {actionInfo.reason}
                        </p>

                        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Next admin action
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {actionInfo.nextAction}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-500">
                            Title Fee
                          </p>
                          <p className="font-bold text-slate-900">
                            {formatMoney(titleFee)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-500">
                            Notary Fee
                          </p>
                          <p className="font-bold text-slate-900">
                            {formatMoney(notaryFee)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-green-50 p-3">
                          <p className="text-xs font-semibold text-green-700">
                            Profit
                          </p>
                          <p className="font-bold text-green-950">
                            {formatMoney(profit)}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:bg-slate-50">
                        Review Order
                      </span>
                    </div>
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
            <p className="text-sm font-semibold text-slate-500">
              Payables MTD
            </p>
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
            <p className="text-sm font-semibold text-slate-500">
              Payables YTD
            </p>
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
