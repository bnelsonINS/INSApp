import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

const filters = ["Last Name", "Order #", "Appointment Date", "Status"];

export default async function ClientOrdersPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.is_active) {
    redirect("/login");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      lender,
      file_number,
      signing_city,
      signing_state,
      signing_zip,
      signing_date,
      signing_time,
      status,
      created_at,
      order_signers (
        first_name,
        last_name,
        phone,
        email
      )
    `
    )
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const safeOrders = orders ?? [];

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, review, and track your signing orders.
          </p>
        </div>

        <Link
          href="/client/dashboard/orders/new"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
        >
          + Create Order
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500">
            {filters.map((filter) => (
              <option key={filter}>{filter}</option>
            ))}
          </select>

          <input
            type="text"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Search orders..."
          />

          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Search
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order # ↕</th>
                <th className="px-4 py-3">Signers ↕</th>
                <th className="px-4 py-3">Appointment ↕</th>
                <th className="px-4 py-3">Client ↕</th>
                <th className="px-4 py-3">Product ↕</th>
                <th className="px-4 py-3">Notary ↕</th>
                <th className="px-4 py-3">Paid?</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            {safeOrders.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8">
                      <p className="text-lg font-bold text-slate-800">
                        No orders yet
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Create your first order to start tracking signings from
                        the client portal.
                      </p>

                      <Link
                        href="/client/dashboard/orders/new"
                        className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                      >
                        + Create Order
                      </Link>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100">
                {safeOrders.map((order) => {
                  const signer = order.order_signers?.[0];

                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <Link
                          href={`/client/dashboard/orders/${order.id}`}
                          className="font-bold text-blue-700 hover:underline"
                        >
                          {order.file_number || order.id.slice(0, 8)}
                        </Link>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {signer
                            ? `${signer.first_name} ${signer.last_name}`
                            : "No signer"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {order.signing_city || "—"},{" "}
                          {order.signing_state || "IN"}{" "}
                          {order.signing_zip || ""}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {order.signing_date || "Not scheduled"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.signing_time || "Time TBD"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {profile.full_name || "Client"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Client Portal
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {order.lender || "Signing"}
                      </td>

                      <td className="px-4 py-4 text-slate-700">—</td>

                      <td className="px-4 py-4 text-slate-700">—</td>

                      <td className="px-4 py-4">
                        <span className="font-bold text-blue-700">0</span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          {order.status || "Needs Notary"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}