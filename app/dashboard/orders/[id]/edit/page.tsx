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

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-[#0B1F4D] focus:outline-none focus:ring-2 focus:ring-[#0B1F4D]/20";

  const labelClass = "text-sm font-semibold text-slate-800";

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <a
          href={`/dashboard/orders/${id}`}
          className="text-sm font-semibold text-blue-700 underline"
        >
          ← Back to Order
        </a>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">Edit Order</h1>
        <p className="text-sm font-medium text-slate-600">
          Control # {order.control_number ?? "—"}
        </p>

        <form
          action={`/dashboard/orders/${id}/update`}
          method="POST"
          className="mt-6 grid gap-4"
        >
          <div>
            <label className={labelClass}>Status</label>
            <select
              name="status"
              defaultValue={order.status ?? "New Request"}
              className={inputClass}
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
            <label className={labelClass}>Assigned Notary</label>
            <select
              name="assigned_notary_id"
              defaultValue={order.assigned_notary_id ?? order.notary_id ?? ""}
              className={inputClass}
            >
              <option value="">Unassigned</option>
              {notaries?.map((notary) => (
                <option key={notary.id} value={notary.id}>
                  {notary.full_name || notary.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Choose “Unassigned” to remove the notary from this order.
            </p>
          </div>

          <div>
            <label className={labelClass}>Signing Type</label>
            <input
              name="signing_type"
              defaultValue={order.signing_type ?? ""}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Borrower Name</label>
            <input
              name="borrower_name"
              defaultValue={order.borrower_name ?? ""}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Borrower Phone</label>
              <input
                name="borrower_phone"
                defaultValue={order.borrower_phone ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Borrower Email</label>
              <input
                name="borrower_email"
                defaultValue={order.borrower_email ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Signing Date</label>
              <input
                type="date"
                name="signing_date"
                defaultValue={order.signing_date ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Signing Time</label>
              <input
                type="time"
                name="signing_time"
                defaultValue={order.signing_time ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Signing Address</label>
            <input
              name="signing_address"
              defaultValue={order.signing_address ?? ""}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>City</label>
              <input
                name="signing_city"
                defaultValue={order.signing_city ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>State</label>
              <input
                name="signing_state"
                defaultValue={order.signing_state ?? "IN"}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>ZIP</label>
              <input
                name="signing_zip"
                defaultValue={order.signing_zip ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Title Company Fee</label>
              <input
                type="number"
                step="0.01"
                name="client_fee"
                defaultValue={order.client_fee ?? order.fee ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Notary Fee</label>
              <input
                type="number"
                step="0.01"
                name="notary_fee"
                defaultValue={order.notary_fee ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Special Instructions</label>
            <textarea
              name="special_instructions"
              defaultValue={order.special_instructions ?? ""}
              rows={7}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Shipping Carrier</label>
              <input
                name="shipping_carrier"
                defaultValue={order.shipping_carrier ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Tracking Number</label>
              <input
                name="tracking_number"
                defaultValue={order.tracking_number ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Drop Date</label>
              <input
                type="date"
                name="drop_date"
                defaultValue={order.drop_date ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Save Changes
            </button>

            <a
              href={`/dashboard/orders/${id}`}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-center font-semibold text-slate-800 hover:bg-slate-100"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}