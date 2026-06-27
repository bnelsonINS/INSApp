import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProCustomer = {
  id: string;
  company: string;
  city: string | null;
  state: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  email: string | null;
  office_phone: string | null;
  default_signing_fee: number | string | null;
  default_payment_terms_days: number | null;
};

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default async function ProCustomersPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: customers, error } = await supabase
    .from("pro_customers")
    .select("*")
    .eq("notary_id", user.id)
    .order("company", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (customers ?? []) as ProCustomer[];

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <section className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              INS Pro
            </p>
            <h1 className="text-3xl font-black text-slate-950">Customers</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage companies, contacts, defaults, and instructions.
            </p>
          </div>

          <Link
            href="/notary/pro/customers/new"
            className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-center text-sm font-black text-white hover:bg-blue-950"
          >
            + New Customer
          </Link>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-bold text-slate-700">No customers yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Add your first client/company to reuse on future jobs.
              </p>
              <Link
                href="/notary/pro/customers/new"
                className="mt-5 inline-block rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-black text-white hover:bg-blue-950"
              >
                + New Customer
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Company</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3 text-right">Default Fee</th>
                    <th className="px-5 py-3 text-right">Terms</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {rows.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-black text-slate-950">
                        {customer.company}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {[customer.contact_first_name, customer.contact_last_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {customer.email || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {customer.office_phone || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {customer.city || "—"}
                        {customer.state ? `, ${customer.state}` : ""}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-emerald-600">
                        {money(Number(customer.default_signing_fee ?? 0))}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">
                        {customer.default_payment_terms_days ?? 0} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}