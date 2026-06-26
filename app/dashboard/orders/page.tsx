import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AssignmentOrder = {
  id: string;
  control_number: string | null;
  status: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_type: string | null;
  borrower_name: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  notary_id?: string | null;
  assigned_notary_id?: string | null;
  client_fee?: number | string | null;
  notary_fee?: number | string | null;
  fee?: number | string | null;
};

const incomingStatuses = ["New Request"];
const assignedStatuses = ["Not Confirmed", "Confirmed", "In Progress", "Late"];
const qaStatuses = ["Docs Uploaded", "QA", "Signing Complete"];
const completedStatuses = ["Completed", "Closed"];

function formatDate(date: string | null) {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
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
  if (value === null || value === undefined || value === "") return "—";

  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";

  return `$${amount.toFixed(2)}`;
}

function getClientFee(order: AssignmentOrder) {
  return order.client_fee ?? order.fee ?? null;
}

function getProfit(order: AssignmentOrder) {
  const clientFee = getClientFee(order);
  const notaryFee = order.notary_fee;

  if (
    clientFee === null ||
    clientFee === undefined ||
    notaryFee === null ||
    notaryFee === undefined
  ) {
    return null;
  }

  return Number(clientFee) - Number(notaryFee);
}

function statusBadge(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "new request")
    return "bg-blue-50 text-blue-700 ring-blue-200";
  if (normalized === "not confirmed")
    return "bg-amber-50 text-amber-700 ring-amber-200";
  if (normalized === "confirmed")
    return "bg-purple-50 text-purple-700 ring-purple-200";
  if (normalized === "in progress")
    return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  if (normalized === "late")
    return "bg-red-50 text-red-700 ring-red-200";
  if (normalized === "docs uploaded")
    return "bg-orange-50 text-orange-700 ring-orange-200";
  if (normalized === "qa")
    return "bg-teal-50 text-teal-700 ring-teal-200";
  if (normalized === "signing complete")
    return "bg-orange-50 text-orange-700 ring-orange-200";
  if (normalized === "completed")
    return "bg-green-50 text-green-700 ring-green-200";
  if (normalized === "closed")
    return "bg-green-50 text-green-700 ring-green-200";
  if (normalized === "cancelled")
    return "bg-red-50 text-red-700 ring-red-200";

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function bucketLabel(bucket: string) {
  if (bucket === "incoming") return "Incoming Requests";
  if (bucket === "assigned") return "Assigned Orders";
  if (bucket === "qa") return "Awaiting QA";
  if (bucket === "completed") return "Completed Orders";
  return "All Orders";
}

function bucketDescription(bucket: string) {
  if (bucket === "incoming") {
    return "New title company requests that have not been assigned to a notary yet.";
  }

  if (bucket === "assigned") {
    return "Orders already assigned to a notary and still in progress.";
  }

  if (bucket === "qa") {
    return "Orders with completed signing work waiting for review.";
  }

  if (bucket === "completed") {
    return "Orders completed and sent back to the title company.";
  }

  return "All orders in Indiana Notary Solutions.";
}

function bucketCardStyle(bucket: string) {
  if (bucket === "incoming") {
    return "border-blue-200 bg-blue-50 text-blue-950 hover:bg-blue-100";
  }

  if (bucket === "assigned") {
    return "border-purple-200 bg-purple-50 text-purple-950 hover:bg-purple-100";
  }

  if (bucket === "qa") {
    return "border-orange-200 bg-orange-50 text-orange-950 hover:bg-orange-100";
  }

  if (bucket === "completed") {
    return "border-green-200 bg-green-50 text-green-950 hover:bg-green-100";
  }

  return "border-slate-200 bg-white text-slate-950 hover:bg-slate-50";
}

function orderCard(order: AssignmentOrder) {
  return (
    <div
      key={order.id}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Control #</p>
          <p className="break-words font-bold text-slate-950">
            {order.control_number ?? "—"}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge(
            order.status,
          )}`}
        >
          {order.status ?? "Unknown"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-900">
        <div>
          <p className="text-slate-500">Borrower</p>
          <p className="font-semibold text-slate-950">{order.borrower_name ?? "—"}</p>
        </div>

        <div>
          <p className="text-slate-500">Signing</p>
          <p className="font-semibold text-slate-950">{formatDate(order.signing_date)}</p>
          <p className="text-slate-600">{formatTime(order.signing_time)}</p>
          <p className="text-xs text-slate-500">
            {order.signing_type ?? "Signing"}
          </p>
        </div>

        <div>
          <p className="text-slate-500">Location</p>
          <p className="font-semibold text-slate-950">{order.signing_address ?? "—"}</p>
          <p className="text-slate-600">
            {order.signing_city ?? "—"}, {order.signing_state ?? "IN"}{" "}
            {order.signing_zip ?? ""}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs text-blue-700">Title Fee</p>
            <p className="font-bold text-blue-950">
              {formatMoney(getClientFee(order))}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Notary Fee</p>
            <p className="font-bold text-amber-950">
              {formatMoney(order.notary_fee)}
            </p>
          </div>

          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-xs text-green-700">Profit</p>
            <p className="font-bold text-green-950">
              {formatMoney(getProfit(order))}
            </p>
          </div>
        </div>
      </div>

      <a
        href={`/dashboard/orders/${order.id}`}
        className="mt-4 block rounded-xl bg-slate-950 px-4 py-2 text-center text-sm font-bold text-white hover:bg-slate-800"
      >
        View Order
      </a>
    </div>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    bucket?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const bucket = params?.bucket ?? "all";
  const search = params?.q?.trim() ?? "";

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

  let query = supabase
    .from("assignments")
    .select("*")
    .order("created_at", { ascending: false });

  if (bucket === "incoming") query = query.in("status", incomingStatuses);
  if (bucket === "assigned") query = query.in("status", assignedStatuses);
  if (bucket === "qa") query = query.in("status", qaStatuses);
  if (bucket === "completed") query = query.in("status", completedStatuses);

  if (search) {
    query = query.or(
      `control_number.ilike.%${search}%,borrower_name.ilike.%${search}%,signing_city.ilike.%${search}%,signing_zip.ilike.%${search}%`,
    );
  }

  const { data: orders } = await query;
  const safeOrders = (orders ?? []) as AssignmentOrder[];

  const incomingCount = safeOrders.filter((order) =>
    incomingStatuses.includes(order.status ?? ""),
  ).length;

  const assignedCount = safeOrders.filter((order) =>
    assignedStatuses.includes(order.status ?? ""),
  ).length;

  const qaCount = safeOrders.filter((order) =>
    qaStatuses.includes(order.status ?? ""),
  ).length;

  const completedCount = safeOrders.filter((order) =>
    completedStatuses.includes(order.status ?? ""),
  ).length;

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-100">
              Admin Order Queue
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Orders</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/90">
              Sort incoming title company requests, assigned orders, QA files,
              and completed work.
            </p>
          </div>

          <a
            href="/dashboard/orders/new"
            className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:bg-blue-50"
          >
            + New Order
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <a
          href="/dashboard/orders?bucket=incoming"
          className={`rounded-2xl border p-5 shadow-sm transition ${bucketCardStyle(
            "incoming",
          )}`}
        >
          <p className="text-sm font-semibold">Incoming Requests</p>
          <p className="mt-2 text-4xl font-bold">{incomingCount}</p>
          <p className="mt-2 text-xs opacity-75">Needs assignment</p>
        </a>

        <a
          href="/dashboard/orders?bucket=assigned"
          className={`rounded-2xl border p-5 shadow-sm transition ${bucketCardStyle(
            "assigned",
          )}`}
        >
          <p className="text-sm font-semibold">Assigned Orders</p>
          <p className="mt-2 text-4xl font-bold">{assignedCount}</p>
          <p className="mt-2 text-xs opacity-75">With notaries</p>
        </a>

        <a
          href="/dashboard/orders?bucket=qa"
          className={`rounded-2xl border p-5 shadow-sm transition ${bucketCardStyle(
            "qa",
          )}`}
        >
          <p className="text-sm font-semibold">Awaiting QA</p>
          <p className="mt-2 text-4xl font-bold">{qaCount}</p>
          <p className="mt-2 text-xs opacity-75">Needs review</p>
        </a>

        <a
          href="/dashboard/orders?bucket=completed"
          className={`rounded-2xl border p-5 shadow-sm transition ${bucketCardStyle(
            "completed",
          )}`}
        >
          <p className="text-sm font-semibold">Completed</p>
          <p className="mt-2 text-4xl font-bold">{completedCount}</p>
          <p className="mt-2 text-xs opacity-75">Finished orders</p>
        </a>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Find Orders</h2>
        <p className="text-sm text-slate-500">
          Search by control number, borrower, city, or ZIP code.
        </p>

        <form
          method="get"
          className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]"
        >
          <input
            name="q"
            defaultValue={search}
            placeholder="Search by control #, borrower, city, or ZIP"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
          />

          {bucket !== "all" && (
            <input type="hidden" name="bucket" value={bucket} />
          )}

          <button className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950">
            Search
          </button>

          <a
            href="/dashboard/orders"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </a>
        </form>
      </section>

      <section className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["incoming", "Incoming Requests"],
          ["assigned", "Assigned"],
          ["qa", "Awaiting QA"],
          ["completed", "Completed"],
        ].map(([key, label]) => (
          <a
            key={key}
            href={`/dashboard/orders${key === "all" ? "" : `?bucket=${key}`}`}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              bucket === key
                ? "bg-[#0B1F4D] text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            }`}
          >
            {label}
          </a>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            {bucketLabel(bucket)}
          </h2>
          <p className="text-sm text-slate-500">{bucketDescription(bucket)}</p>
        </div>

        {!safeOrders.length ? (
          <div className="p-8 text-sm text-slate-500">No orders found.</div>
        ) : (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {safeOrders.map((order) => orderCard(order))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[1180px] w-full text-left text-sm text-slate-900">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-[150px] px-4 py-3">Control #</th>
                    <th className="w-[170px] px-4 py-3">Signing</th>
                    <th className="w-[160px] px-4 py-3">Borrower</th>
                    <th className="w-[230px] px-4 py-3">Location</th>
                    <th className="w-[110px] px-4 py-3">Notary</th>
                    <th className="w-[110px] px-4 py-3">Title Fee</th>
                    <th className="w-[120px] px-4 py-3">Notary Fee</th>
                    <th className="w-[100px] px-4 py-3">Profit</th>
                    <th className="w-[150px] px-4 py-3">Status</th>
                    <th className="w-[90px] px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {safeOrders.map((order) => (
                    <tr key={order.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 align-top">
                        <div className="max-w-[135px] break-words font-bold leading-snug text-slate-950">
                          {order.control_number ?? "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-slate-900">
                        <div className="font-medium text-slate-900">
                          {formatDate(order.signing_date)}
                        </div>
                        <div className="text-slate-500">
                          {formatTime(order.signing_time)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.signing_type ?? "Signing"}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top font-medium text-slate-900">
                        <div className="break-words">
                          {order.borrower_name ?? "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-slate-900">
                        <div className="break-words font-medium text-slate-900">
                          {order.signing_address ?? "—"}
                        </div>
                        <div className="text-slate-500">
                          {order.signing_city ?? "—"},{" "}
                          {order.signing_state ?? "IN"}{" "}
                          {order.signing_zip ?? ""}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        {order.assigned_notary_id || order.notary_id ? (
                          <span className="font-medium text-slate-700">
                            Assigned
                          </span>
                        ) : (
                          <span className="font-semibold text-red-600">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 align-top font-semibold text-slate-900">
                        {formatMoney(getClientFee(order))}
                      </td>

                      <td className="px-4 py-4 align-top font-semibold text-slate-900">
                        {formatMoney(order.notary_fee)}
                      </td>

                      <td className="px-4 py-4 align-top font-bold text-slate-900">
                        {formatMoney(getProfit(order))}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ring-1 ${statusBadge(
                            order.status,
                          )}`}
                        >
                          {order.status ?? "Unknown"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right align-top">
                        <a
                          href={`/dashboard/orders/${order.id}`}
                          className="inline-flex rounded-xl bg-[#0B1F4D] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-950"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}