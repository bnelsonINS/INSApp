import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default async function AdminReadOnlyClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin" || !adminProfile.is_active) {
    redirect("/login");
  }

  const { data: clientProfile, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !clientProfile) {
    redirect("/dashboard/orders");
  }

  const companyName =
    clientProfile.company_name ||
    clientProfile.title_company_name ||
    clientProfile.business_name ||
    clientProfile.full_name ||
    "Client Profile";

  const contactName =
    clientProfile.contact_name ||
    clientProfile.full_name ||
    clientProfile.name ||
    "";

  const phone =
    clientProfile.phone ||
    clientProfile.phone_number ||
    clientProfile.contact_phone ||
    "";

  const address =
    clientProfile.address ||
    clientProfile.street_address ||
    clientProfile.address_line_1 ||
    clientProfile.company_address ||
    "";

  const city =
    clientProfile.city ||
    clientProfile.company_city ||
    "";

  const state =
    clientProfile.state ||
    clientProfile.company_state ||
    "";

  const zip =
    clientProfile.zip ||
    clientProfile.zip_code ||
    clientProfile.company_zip ||
    "";

  const clientTerms = clientProfile.client_terms || "";

  const defaultInstructions =
    clientProfile.default_signing_instructions ||
    clientProfile.signing_instructions ||
    clientProfile.special_instructions ||
    "";

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="overflow-hidden rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
          <Link
            href="/dashboard/orders"
            className="text-sm font-bold text-blue-100 underline underline-offset-4 transition hover:text-white"
          >
            ← Back to Orders
          </Link>

          <p className="mt-5 text-sm font-semibold text-blue-100">
            Read-Only Client Profile
          </p>

          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {companyName}
          </h1>

          <p className="mt-2 text-sm text-blue-100/90">
            This page is view-only. No client information can be edited here.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Company Info</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Company Name
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {valueOrDash(companyName)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Contact Name
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {valueOrDash(contactName)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Email
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {valueOrDash(clientProfile.email)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Phone
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {valueOrDash(phone)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Address</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                Street Address
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {valueOrDash(address)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                City
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {valueOrDash(city)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                State
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {valueOrDash(state)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                ZIP
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {valueOrDash(zip)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Client Terms</h2>

          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {clientTerms || "No client terms saved."}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Default Signing Instructions
          </h2>

          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {defaultInstructions || "No default signing instructions saved."}
          </p>
        </section>
      </section>
    </main>
  );
}