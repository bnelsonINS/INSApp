import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || id === "undefined") {
    redirect("/dashboard/orders");
  }

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

  const { data: order, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !order) {
    redirect("/dashboard/orders");
  }

  const { data: notaries } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "notary")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  return (
    <main className="p-4 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-5 shadow sm:p-6">
        <a
          href={`/dashboard/orders/${id}`}
          className="text-sm font-medium text-blue-700 underline"
        >
          ← Back to Order
        </a>

        <h1 className="mt-4 text-2xl font-bold">Edit Order</h1>
        <p className="text-sm text-slate-500">
          Control # {order.control_number ?? "—"}
        </p>

        <form
          action={`/dashboard/orders/${id}/update`}
          method="POST"
          className="mt-6 grid gap-4"
        >
          <div>
            <label className="text-sm font-semibold">Status</label>
            <select
              name="status"
              defaultValue={order.status ?? "New Request"}
              className="mt-1 w-full rounded-lg border p-2"
            >
              <option>New Request</option>
              <option>Not Confirmed</option>
              <option>Confirmed</option>
              <option>In Progress</option>
              <option>Late</option>
              <option>Docs Uploaded</option>
              <option>QA</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Assigned Notary</label>
            <select
              name="assigned_notary_id"
              defaultValue={order.assigned_notary_id ?? order.notary_id ?? ""}
              className="mt-1 w-full rounded-lg border p-2"
            >
              <option value="">Unassigned</option>
              {notaries?.map((notary) => (
                <option key={notary.id} value={notary.id}>
                  {notary.full_name || notary.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Choose “Unassigned” to remove the notary from this order.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold">Signing Type</label>
            <input
              name="signing_type"
              defaultValue={order.signing_type ?? ""}
              className="mt-1 w-full rounded-lg border p-2"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Borrower Name</label>
            <input
              name="borrower_name"
              defaultValue={order.borrower_name ?? ""}
              className="mt-1 w-full rounded-lg border p-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Borrower Phone</label>
              <input
                name="borrower_phone"
                defaultValue={order.borrower_phone ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Borrower Email</label>
              <input
                name="borrower_email"
                defaultValue={order.borrower_email ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Signing Date</label>
              <input
                type="date"
                name="signing_date"
                defaultValue={order.signing_date ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Signing Time</label>
              <input
                type="time"
                name="signing_time"
                defaultValue={order.signing_time ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Signing Address</label>
            <input
              name="signing_address"
              defaultValue={order.signing_address ?? ""}
              className="mt-1 w-full rounded-lg border p-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold">City</label>
              <input
                name="signing_city"
                defaultValue={order.signing_city ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">State</label>
              <input
                name="signing_state"
                defaultValue={order.signing_state ?? "IN"}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">ZIP</label>
              <input
                name="signing_zip"
                defaultValue={order.signing_zip ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Title Company Fee</label>
              <input
                type="number"
                step="0.01"
                name="client_fee"
                defaultValue={order.client_fee ?? order.fee ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Notary Fee</label>
              <input
                type="number"
                step="0.01"
                name="notary_fee"
                defaultValue={order.notary_fee ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Special Instructions</label>
            <textarea
              name="special_instructions"
              defaultValue={order.special_instructions ?? ""}
              rows={7}
              className="mt-1 w-full rounded-lg border p-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold">Shipping Carrier</label>
              <input
                name="shipping_carrier"
                defaultValue={order.shipping_carrier ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Tracking Number</label>
              <input
                name="tracking_number"
                defaultValue={order.tracking_number ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Drop Date</label>
              <input
                type="date"
                name="drop_date"
                defaultValue={order.drop_date ?? ""}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white"
            >
              Save Changes
            </button>

            <a
              href={`/dashboard/orders/${id}`}
              className="rounded-lg border px-5 py-2 text-center font-semibold"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}