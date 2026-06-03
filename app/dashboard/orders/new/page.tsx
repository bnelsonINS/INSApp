import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import SignersForm from "./signers-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewOrderPage() {
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

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Order</h1>
        <p className="text-slate-600">
          Create a new title company signing request.
        </p>
      </div>

      <form
        action="/dashboard/orders/new/create"
        method="post"
        className="space-y-6"
      >
        <section className="rounded-xl bg-white p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold">Order Details</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium">Control Number</span>
              <input
                name="control_number"
                placeholder="Example: SA-1002"
                className="w-full rounded-lg border p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Signing Type</span>
              <select
                name="signing_type"
                className="w-full rounded-lg border p-2"
                defaultValue=""
              >
                <option value="">Select type</option>
                <option value="Refinance">Refinance</option>
                <option value="Purchase">Purchase</option>
                <option value="Seller Package">Seller Package</option>
                <option value="HELOC">HELOC</option>
                <option value="Reverse Mortgage">Reverse Mortgage</option>
                <option value="Loan Application">Loan Application</option>
                <option value="General Notary Work">
                  General Notary Work
                </option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Signing Date</span>
              <input
                name="signing_date"
                type="date"
                className="w-full rounded-lg border p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Signing Time</span>
              <input
                name="signing_time"
                type="time"
                className="w-full rounded-lg border p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Fee</span>
              <input
                name="fee"
                type="number"
                step="0.01"
                placeholder="125.00"
                className="w-full rounded-lg border p-2"
              />
            </label>
          </div>
        </section>

        <SignersForm />

        <section className="rounded-xl bg-white p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold">Signing Location</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium">Address</span>
              <input
                name="signing_address"
                placeholder="123 Main Street"
                className="w-full rounded-lg border p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">City</span>
              <input
                name="signing_city"
                placeholder="Sellersburg"
                className="w-full rounded-lg border p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">ZIP Code</span>
              <input
                name="signing_zip"
                maxLength={5}
                placeholder="47172"
                className="w-full rounded-lg border p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">State</span>
              <input
                name="signing_state"
                defaultValue="IN"
                maxLength={2}
                className="w-full rounded-lg border p-2"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold">Special Instructions</h2>

          <textarea
            name="special_instructions"
            rows={5}
            placeholder="Add any instructions for the notary..."
            className="w-full rounded-lg border p-3"
          />
        </section>

        <div className="flex flex-col gap-3 md:flex-row">
          <button className="rounded-lg bg-slate-900 px-5 py-2 text-white">
            Create Order
          </button>

          <a
            href="/dashboard/orders"
            className="rounded-lg border px-5 py-2 text-center"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}