import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Assignment = {
  id: string;
  status: string | null;
  control_number: string | null;
  borrower_name: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  created_at: string;
};

function formatDate(date: string | null) {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadge(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "new request")
    return "bg-amber-100 text-amber-800 ring-amber-200";
  if (normalized === "not confirmed")
    return "bg-amber-100 text-amber-800 ring-amber-200";
  if (normalized === "confirmed")
    return "bg-blue-100 text-blue-800 ring-blue-200";
  if (normalized === "in progress")
    return "bg-purple-100 text-purple-800 ring-purple-200";
  if (normalized === "signing complete")
    return "bg-orange-100 text-orange-800 ring-orange-200";
  if (normalized === "closed")
    return "bg-green-100 text-green-800 ring-green-200";
  if (normalized === "cancelled")
    return "bg-red-100 text-red-800 ring-red-200";

  return "bg-slate-100 text-slate-800 ring-slate-200";
}

export default async function ClientDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
  id,
  role,
  is_active,
  full_name,
  phone,
  company_name,
  company_phone,
  company_address,
  company_city,
  company_state,
  company_zip,
  billing_email
`
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.is_active) {
    redirect("/login");
  }

  const profileIncomplete =
    !profile.full_name ||
    !profile.phone ||
    !profile.company_name ||
    !profile.company_phone ||
    !profile.company_address ||
    !profile.company_city ||
    !profile.company_state ||
    !profile.company_zip ||
    !profile.billing_email;

  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "id, status, control_number, borrower_name, signing_date, signing_time, signing_city, signing_state, signing_zip, created_at"
    )
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const safeAssignments = (assignments ?? []) as Assignment[];

  const activeOrders = safeAssignments.filter((item) => {
    const status = (item.status ?? "").toLowerCase();
    return status !== "closed" && status !== "cancelled";
  });

  const awaitingAssignment = safeAssignments.filter((item) => {
    const status = (item.status ?? "").toLowerCase();
    return (
      status === "new request" ||
      status === "needs notary" ||
      status === "not confirmed"
    );
  });

  const scheduled = safeAssignments.filter((item) => {
    const status = (item.status ?? "").toLowerCase();
    return status === "confirmed" || status === "in progress";
  });

  const completed = safeAssignments.filter((item) => {
    const status = (item.status ?? "").toLowerCase();
    return status === "signing complete" || status === "closed";
  });

  const stats = [
    {
      label: "Active Orders",
      value: String(activeOrders.length),
      note: "Currently in progress",
      className: "border-blue-200 bg-blue-50 text-blue-900",
    },
    {
      label: "Awaiting Assignment",
      value: String(awaitingAssignment.length),
      note: "Waiting for a notary",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    },
    {
      label: "Scheduled",
      value: String(scheduled.length),
      note: "Assigned and scheduled",
      className: "border-purple-200 bg-purple-50 text-purple-900",
    },
    {
      label: "Completed",
      value: String(completed.length),
      note: "Finished orders",
      className: "border-slate-200 bg-white text-slate-900",
    },
  ];

  const recentOrders = safeAssignments.slice(0, 5);

  return (
    <div className="space-y-6">
      {profileIncomplete && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">Some profile information is missing.</p>
              <p className="mt-1 text-sm text-amber-800">
                Complete your company and contact information before placing
                orders.
              </p>
            </div>

            <Link
              href="/client/profile"
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
            >
              Complete Profile
            </Link>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-100">Welcome back</p>

            <h1 className="mt-2 text-3xl font-bold">Client Dashboard</h1>

            <p className="mt-3 max-w-2xl text-sm text-blue-100/90">
              Submit signing requests, track order progress, upload documents,
              and communicate with Indiana Notary Solutions.
            </p>
          </div>

          <Link
            href="/client/dashboard/orders/new"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:bg-blue-50"
          >
            Create New Order
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-5 shadow-sm ${stat.className}`}
          >
            <p className="text-sm font-bold">{stat.label}</p>

            <p className="mt-3 text-3xl font-black text-slate-950">
              {stat.value}
            </p>

            <p className="mt-2 text-sm font-medium">{stat.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-slate-200 bg-white p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Recent Orders
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Your newest signing requests will appear here.
                </p>
              </div>

              <Link
                href="/client/dashboard/orders"
                className="inline-flex w-fit items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-[#0B1F4D] transition hover:bg-slate-50"
              >
                View all
              </Link>
            </div>
          </div>

          <div className="bg-slate-50 p-6">
            {recentOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="font-bold text-slate-700">No orders yet</p>

                <p className="mt-2 text-sm text-slate-500">
                  Create your first order to start tracking signings from the
                  client portal.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/client/dashboard/orders/${order.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0B1F4D]/30 hover:shadow-md"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {order.control_number || order.id.slice(0, 8)}
                        </p>

                        <p className="mt-2 text-sm font-medium text-slate-600">
                          {order.borrower_name || "Borrower"} ·{" "}
                          {order.signing_city || "—"},{" "}
                          {order.signing_state || "IN"}{" "}
                          {order.signing_zip || ""}
                        </p>

                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {formatDate(order.signing_date)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge(
                          order.status
                        )}`}
                      >
                        {order.status || "New Request"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>

          <div className="mt-5 space-y-3">
            <Link
              href="/client/dashboard/orders/new"
              className="block rounded-xl bg-[#0B1F4D] px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
            >
              Create Order
            </Link>

            <Link
              href="/client/dashboard/orders"
              className="block rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              View Orders
            </Link>

            <Link
              href="/client/dashboard/messages"
              className="block rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Messages
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}