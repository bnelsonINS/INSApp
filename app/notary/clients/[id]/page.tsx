import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NotaryClientProfilePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !currentProfile ||
    currentProfile.role !== "notary" ||
    !currentProfile.is_active
  ) {
    redirect("/login");
  }

  const { data: clientProfile } = await supabaseAdmin
  .from("profiles")
  .select(
    `
    id,
    full_name,
    email,
    company_name,
    company_phone,
    company_address,
    company_city,
    company_state,
    company_zip,
    billing_email,
    phone,
    client_role,
    default_signing_instructions,
    client_terms,
    logo_url
  `
  )
  .eq("id", id)
  .eq("role", "client")
  .single();

  if (!clientProfile) {
    redirect("/notary/assignments");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-semibold text-blue-100">
            Read Only Client Profile
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {clientProfile.company_name || clientProfile.full_name || "Client"}
          </h1>

          <p className="mt-3 max-w-3xl text-sm text-blue-100/90">
            Client details for reference only. Notaries cannot edit this profile.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Company Info</h2>

        <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
          <Info label="Company Name" value={clientProfile.company_name} />
          <Info label="Contact Name" value={clientProfile.full_name} />
          <Info label="Company Phone" value={clientProfile.company_phone} />
          <Info label="Phone" value={clientProfile.phone} />
          <Info label="Email" value={clientProfile.email} />
          <Info label="Billing Email" value={clientProfile.billing_email} />
          <Info label="Role" value={clientProfile.client_role} />

          <div className="md:col-span-2">
            <Info
              label="Address"
              value={[
                clientProfile.company_address,
                clientProfile.company_city,
                clientProfile.company_state,
                clientProfile.company_zip,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Client Terms</h2>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {clientProfile.client_terms || "No client terms listed."}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Default Signing Instructions
        </h2>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {clientProfile.default_signing_instructions ||
            "No default signing instructions listed."}
        </p>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words font-medium text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}