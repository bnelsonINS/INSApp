import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AssignmentOrder = {
  id: string;
  control_number: string | null;
  borrower_name: string | null;
  status: string | null;
  signing_date: string | null;
  signing_city: string | null;
  signing_state: string | null;
  client_fee: number | string | null;
  fee: number | string | null;
  notary_fee: number | string | null;
  assigned_notary_id?: string | null;
  notary_id?: string | null;
  created_at: string | null;
};

function moneyValue(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isNaN(amount) ? 0 : amount;
}

function formatMoney(value: number | string | null | undefined) {
  return `$${moneyValue(value).toFixed(2)}`;
}

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTitleFee(order: AssignmentOrder) {
  return moneyValue(order.client_fee ?? order.fee);
}

function getNotaryFee(order: AssignmentOrder) {
  return moneyValue(order.notary_fee);
}

function getProfit(order: AssignmentOrder) {
  return getTitleFee(order) - getNotaryFee(order);
}

function getMargin(order: AssignmentOrder) {
  const titleFee = getTitleFee(order);
  if (!titleFee) return 0;
  return (getProfit(order) / titleFee) * 100;
}

function getQuarter(date: Date) {
  return Math.floor(date.getMonth() / 3) + 1;
}

function sumTitleFees(orders: AssignmentOrder[]) {
  return orders.reduce((sum, order) => sum + getTitleFee(order), 0);
}

function sumNotaryFees(orders: AssignmentOrder[]) {
  return orders.reduce((sum, order) => sum + getNotaryFee(order), 0);
}

function sumProfit(orders: AssignmentOrder[]) {
  return orders.reduce((sum, order) => sum + getProfit(order), 0);
}

function average(value: number, count: number) {
  if (!count) return 0;
  return value / count;
}

function statusBadge(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "new request") return "bg-blue-50 text-blue-800 ring-blue-200";
  if (normalized === "not confirmed") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (normalized === "confirmed") return "bg-purple-50 text-purple-800 ring-purple-200";
  if (normalized === "in progress") return "bg-indigo-50 text-indigo-800 ring-indigo-200";
  if (normalized === "late") return "bg-red-50 text-red-800 ring-red-200";
  if (normalized === "signing complete") return "bg-orange-50 text-orange-800 ring-orange-200";
  if (normalized === "closed") return "bg-green-50 text-green-800 ring-green-200";
  if (normalized === "completed") return "bg-green-50 text-green-800 ring-green-200";

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function titlePaymentStatus(status: string | null) {
  if (status === "Closed" || status === "Completed") return "Collected";
  if (status === "Signing Complete") return "Ready to Invoice";
  if (status === "New Request") return "Not Billable Yet";
  return "Open";
}

function notaryPaymentStatus(status: string | null) {
  if (status === "Closed" || status === "Completed") return "Paid / Closed";
  if (status === "Signing Complete") return "Owed";
  return "Not Payable Yet";
}

function paymentBadge(label: string) {
  if (label === "Collected" || label === "Paid / Closed") {
    return "bg-green-50 text-green-800 ring-green-200";
  }

  if (label === "Ready to Invoice" || label === "Owed") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (label === "Not Billable Yet" || label === "Not Payable Yet") {
    return "bg-slate-50 text-slate-700 ring-slate-200";
  }

  return "bg-blue-50 text-blue-800 ring-blue-200";
}

export default async function AdminFinancialsPage() {
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

  const { data } = await supabase
    .from("assignments")
    .select(
      "id, control_number, borrower_name, status, signing_date, signing_city, signing_state, client_fee, fee, notary_fee, assigned_notary_id, notary_id, created_at"
    )
    .order("signing_date", { ascending: false });

  const orders = (data ?? []) as AssignmentOrder[];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toISOString().slice(0, 7);
  const currentQuarter = getQuarter(now);

  const paidOrders = orders.filter(
    (order) => order.status === "Closed" || order.status === "Completed"
  );

  const pendingNotaryOrders = orders.filter(
    (order) => order.status === "Signing Complete"
  );

  const monthOrders = orders.filter((order) =>
    order.signing_date?.startsWith(currentMonth)
  );

  const yearOrders = orders.filter((order) =>
    order.signing_date?.startsWith(String(currentYear))
  );

  const quarterOrders = yearOrders.filter((order) => {
    if (!order.signing_date) return false;
    return getQuarter(new Date(`${order.signing_date}T00:00:00`)) === currentQuarter;
  });

  const billablesMTD = sumTitleFees(monthOrders);
  const payablesMTD = sumNotaryFees(monthOrders);
  const profitMTD = billablesMTD - payablesMTD;

  const billablesQTD = sumTitleFees(quarterOrders);
  const payablesQTD = sumNotaryFees(quarterOrders);
  const profitQTD = billablesQTD - payablesQTD;

  const billablesYTD = sumTitleFees(yearOrders);
  const payablesYTD = sumNotaryFees(yearOrders);
  const profitYTD = billablesYTD - payablesYTD;

  const lifetimeBillables = sumTitleFees(orders);
  const lifetimePayables = sumNotaryFees(orders);
  const lifetimeProfit = lifetimeBillables - lifetimePayables;

  const pendingNotaryPayments = sumNotaryFees(pendingNotaryOrders);
  const paidNotaryFees = sumNotaryFees(paidOrders);

  const averageTitleFee = average(lifetimeBillables, orders.length);
  const averageNotaryFee = average(lifetimePayables, orders.length);
  const averageProfit = average(lifetimeProfit, orders.length);
  const profitMargin = lifetimeBillables
    ? (lifetimeProfit / lifetimeBillables) * 100
    : 0;

  const q1Orders = yearOrders.filter((order) => {
    if (!order.signing_date) return false;
    return getQuarter(new Date(`${order.signing_date}T00:00:00`)) === 1;
  });

  const q2Orders = yearOrders.filter((order) => {
    if (!order.signing_date) return false;
    return getQuarter(new Date(`${order.signing_date}T00:00:00`)) === 2;
  });

  const q3Orders = yearOrders.filter((order) => {
    if (!order.signing_date) return false;
    return getQuarter(new Date(`${order.signing_date}T00:00:00`)) === 3;
  });

  const q4Orders = yearOrders.filter((order) => {
    if (!order.signing_date) return false;
    return getQuarter(new Date(`${order.signing_date}T00:00:00`)) === 4;
  });

  const quarters = [
    { label: "Q1", orders: q1Orders },
    { label: "Q2", orders: q2Orders },
    { label: "Q3", orders: q3Orders },
    { label: "Q4", orders: q4Orders },
  ];

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">Company Financials</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Financials</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/90">
            Track billables, notary payables, profit, pending payments, and order
            financial performance.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Billables MTD</p>
          <p className="mt-2 text-4xl font-bold text-blue-950">
            {formatMoney(billablesMTD)}
          </p>
          <p className="mt-2 text-xs text-blue-700">Title company fees</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-700">Payables MTD</p>
          <p className="mt-2 text-4xl font-bold text-amber-950">
            {formatMoney(payablesMTD)}
          </p>
          <p className="mt-2 text-xs text-amber-700">Notary fees</p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-green-700">Profit MTD</p>
          <p className="mt-2 text-4xl font-bold text-green-950">
            {formatMoney(profitMTD)}
          </p>
          <p className="mt-2 text-xs text-green-700">Billables minus payables</p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-purple-700">Profit Margin</p>
          <p className="mt-2 text-4xl font-bold text-purple-950">
            {profitMargin.toFixed(1)}%
          </p>
          <p className="mt-2 text-xs text-purple-700">Lifetime average</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-bold text-slate-950">
            Revenue / Payables / Profit
          </h2>
          <p className="text-sm text-slate-600">
            Current month, quarter, year, and lifetime totals.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">Billables QTD</p>
              <p className="mt-1 text-2xl font-bold text-blue-950">
                {formatMoney(billablesQTD)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-700">Payables QTD</p>
              <p className="mt-1 text-2xl font-bold text-amber-950">
                {formatMoney(payablesQTD)}
              </p>
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">Profit QTD</p>
              <p className="mt-1 text-2xl font-bold text-green-950">
                {formatMoney(profitQTD)}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">Billables YTD</p>
              <p className="mt-1 text-2xl font-bold text-blue-950">
                {formatMoney(billablesYTD)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-700">Payables YTD</p>
              <p className="mt-1 text-2xl font-bold text-amber-950">
                {formatMoney(payablesYTD)}
              </p>
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">Profit YTD</p>
              <p className="mt-1 text-2xl font-bold text-green-950">
                {formatMoney(profitYTD)}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">
                Lifetime Billables
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-950">
                {formatMoney(lifetimeBillables)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-700">
                Lifetime Payables
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-950">
                {formatMoney(lifetimePayables)}
              </p>
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">
                Lifetime Profit
              </p>
              <p className="mt-1 text-2xl font-bold text-green-950">
                {formatMoney(lifetimeProfit)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Averages</h2>
          <p className="text-sm text-slate-600">
            Useful for pricing and margin checks.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">
                Avg Title Fee
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-950">
                {formatMoney(averageTitleFee)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-700">
                Avg Notary Fee
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-950">
                {formatMoney(averageNotaryFee)}
              </p>
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">
                Avg Profit / Order
              </p>
              <p className="mt-1 text-2xl font-bold text-green-950">
                {formatMoney(averageProfit)}
              </p>
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Notary Payment Queue
          </h2>
          <p className="text-sm text-slate-600">
            Signing-complete orders that likely need notary payment review.
          </p>

          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-700">
              Pending Notary Payments
            </p>
            <p className="mt-1 text-3xl font-bold text-amber-950">
              {formatMoney(pendingNotaryPayments)}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {!pendingNotaryOrders.length ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                No pending notary payments.
              </p>
            ) : (
              pendingNotaryOrders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50 hover:shadow-sm"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{order.control_number ?? "—"}</p>
                      <p className="text-sm text-slate-600">
                        {order.borrower_name ?? "Unnamed Order"}
                      </p>
                    </div>
                    <p className="font-bold text-amber-700">
                      {formatMoney(order.notary_fee)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">1099 Watch</h2>
          <p className="text-sm text-slate-600">
            Simple placeholder until payment batches and notary totals are
            added.
          </p>

          <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-700">
              Paid Notary Fees
            </p>
            <p className="mt-1 text-3xl font-bold text-green-950">
              {formatMoney(paidNotaryFees)}
            </p>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-700">
            For real 1099 tracking, add a payment table later with payment date,
            payment batch ID, notary ID, amount paid, and tax year. Otherwise,
            tax season will be less “accounting” and more “archaeology.”
          </div>
        </section>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Quarterly Breakdown
        </h2>
        <p className="text-sm text-slate-600">
          Billables, payables, and profit by quarter for the current year.
        </p>

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
                <p className="text-xl font-bold text-slate-950">
                  {quarter.label}
                </p>

                <div className="mt-3 space-y-2 text-sm font-medium text-slate-800">
                  <p>
                    <span className="font-semibold text-blue-700">
                      Billables:
                    </span>{" "}
                    {formatMoney(billables)}
                  </p>
                  <p>
                    <span className="font-semibold text-amber-700">
                      Payables:
                    </span>{" "}
                    {formatMoney(payables)}
                  </p>
                  <p>
                    <span className="font-semibold text-green-700">
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

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            Order Financial Table
          </h2>
          <p className="text-sm text-slate-600">
            Full financial view by assignment.
          </p>
        </div>

        {!orders.length ? (
          <div className="p-8 text-sm font-medium text-slate-700">No orders found.</div>
        ) : (
          <>
            <div className="space-y-4 p-4 md:hidden">
              {orders.map((order) => {
                const titleStatus = titlePaymentStatus(order.status);
                const notaryStatus = notaryPaymentStatus(order.status);

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Control #
                        </p>
                        <p className="text-base font-bold text-slate-950">
                          {order.control_number ?? "—"}
                        </p>
                      </div>

                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="shrink-0 rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                      >
                        View
                      </Link>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Borrower
                        </p>
                        <p className="font-semibold text-slate-900">
                          {order.borrower_name ?? "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Signing Date
                        </p>
                        <p className="font-semibold text-slate-900">
                          {formatDate(order.signing_date)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Title Fee
                        </p>
                        <p className="font-semibold text-slate-900">
                          {formatMoney(getTitleFee(order))}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Notary Fee
                        </p>
                        <p className="font-semibold text-slate-900">
                          {formatMoney(getNotaryFee(order))}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Profit
                        </p>
                        <p className="font-bold text-slate-950">
                          {formatMoney(getProfit(order))}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Margin
                        </p>
                        <p className="font-semibold text-slate-900">
                          {getMargin(order).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge(
                          order.status
                        )}`}
                      >
                        {order.status ?? "Unknown"}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${paymentBadge(
                          titleStatus
                        )}`}
                      >
                        Title: {titleStatus}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${paymentBadge(
                          notaryStatus
                        )}`}
                      >
                        Notary: {notaryStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden w-full max-w-full overflow-x-auto md:block">
              <table className="w-[1200px] min-w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="whitespace-nowrap p-3">Control #</th>
                    <th className="whitespace-nowrap p-3">Borrower</th>
                    <th className="whitespace-nowrap p-3">Signing Date</th>
                    <th className="whitespace-nowrap p-3">Title Fee</th>
                    <th className="whitespace-nowrap p-3">Notary Fee</th>
                    <th className="whitespace-nowrap p-3">Profit</th>
                    <th className="whitespace-nowrap p-3">Margin</th>
                    <th className="whitespace-nowrap p-3">Order Status</th>
                    <th className="whitespace-nowrap p-3">Title Payment</th>
                    <th className="whitespace-nowrap p-3">Notary Payment</th>
                    <th className="whitespace-nowrap p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => {
                    const titleStatus = titlePaymentStatus(order.status);
                    const notaryStatus = notaryPaymentStatus(order.status);

                    return (
                      <tr key={order.id} className="border-t border-slate-200 transition hover:bg-slate-50">
                        <td className="whitespace-nowrap p-3 font-semibold text-slate-950">
                          {order.control_number ?? "—"}
                        </td>

                        <td className="p-3 font-medium text-slate-800">{order.borrower_name ?? "—"}</td>

                        <td className="whitespace-nowrap p-3 font-medium text-slate-800">
                          {formatDate(order.signing_date)}
                        </td>

                        <td className="whitespace-nowrap p-3 font-semibold text-slate-950">
                          {formatMoney(getTitleFee(order))}
                        </td>

                        <td className="whitespace-nowrap p-3 font-semibold text-slate-950">
                          {formatMoney(getNotaryFee(order))}
                        </td>

                        <td className="whitespace-nowrap p-3 font-bold text-slate-950">
                          {formatMoney(getProfit(order))}
                        </td>

                        <td className="whitespace-nowrap p-3 font-medium text-slate-800">
                          {getMargin(order).toFixed(1)}%
                        </td>

                        <td className="whitespace-nowrap p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge(
                              order.status
                            )}`}
                          >
                            {order.status ?? "Unknown"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${paymentBadge(
                              titleStatus
                            )}`}
                          >
                            {titleStatus}
                          </span>
                        </td>

                        <td className="whitespace-nowrap p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${paymentBadge(
                              notaryStatus
                            )}`}
                          >
                            {notaryStatus}
                          </span>
                        </td>

                        <td className="whitespace-nowrap p-3 text-right">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}