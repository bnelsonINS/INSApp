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
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <h1 className="text-3xl font-bold">New Order</h1>

          <p className="mt-2 text-blue-100/90">
            Create a new title company signing request.
          </p>
        </div>
      </section>

      <form
        action="/dashboard/orders/new/create"
        method="post"
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Order Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Basic information for this signing request.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-semibold text-slate-700">
                Control Number
              </span>

              <input
                name="control_number"
                placeholder="Example: SA-1002"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold text-slate-700">
                Signing Type
              </span>

              <select
                name="signing_type"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
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
              <span className="text-sm font-semibold text-slate-700">
                Signing Date
              </span>

              <input
                name="signing_date"
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold text-slate-700">
                Signing Time
              </span>

              <input
                name="signing_time"
                type="time"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold text-slate-700">
                Fee
              </span>

              <input
                name="fee"
                type="number"
                step="0.01"
                placeholder="125.00"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
        </section>

        <SignersForm />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Signing Location
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Where the appointment will take place.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Address
              </span>

              <input
                name="signing_address"
                placeholder="123 Main Street"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold text-slate-700">
                City
              </span>

              <input
                name="signing_city"
                placeholder="Sellersburg"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold text-slate-700">
                ZIP Code
              </span>

              <input
                name="signing_zip"
                maxLength={5}
                placeholder="47172"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-semibold text-slate-700">
                State
              </span>

              <input
                name="signing_state"
                defaultValue="IN"
                maxLength={2}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Special Instructions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Include any notes or requirements for the assigned notary.
            </p>
          </div>

          <textarea
            name="special_instructions"
            rows={5}
            placeholder="Add any instructions for the notary..."
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
          />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
          >
            Create Order
          </button>

          <a
            href="/dashboard/orders"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}