import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ProJob = {
  id: string;
  notary_id: string;
  source_type: string | null;
  source_order_id: string | null;
  job_number: string | null;

  client_name: string | null;
  borrower_name: string | null;

  signing_type: string | null;
  signing_date: string | null;
  signing_time: string | null;

  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;

  fee: number | string | null;
  status: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return "No time set";

  const [hours, minutes] = value.split(":");
  const date = new Date();

  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value: number | string | null) {
  const amount = Number(value ?? 0);

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatStatus(status: string | null) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1 text-base font-semibold text-slate-900">
        {value || "—"}
      </div>
    </div>
  );
}

export default async function ProJobDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "notary" || !profile.is_active) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("pro_jobs")
    .select("*")
    .eq("id", id)
    .eq("notary_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error loading Pro job:", error);
    throw new Error(`Unable to load Pro job: ${error.message}`);
  }

  if (!data) {
    notFound();
  }

  const job = data as ProJob;

  const fullAddress = [
    job.signing_address,
    job.signing_city,
    job.signing_state,
    job.signing_zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Back button */}
        <div>
          <Link
            href="/notary/assignments"
            className="inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-blue-900"
          >
            ← Back to Assignments
          </Link>
        </div>

        {/* Header */}
        <section className="rounded-3xl bg-[#0B1F4D] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-200">
                External Assignment
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                {job.borrower_name || "Unnamed Borrower"}
              </h1>

              <p className="mt-2 text-base text-slate-300">
                {job.client_name || "No client specified"}
              </p>

              {job.job_number && (
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  Job #{job.job_number}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
                {formatStatus(job.status)}
              </span>

              <p className="text-2xl font-black text-white">
                {formatMoney(job.fee)}
              </p>
            </div>
          </div>
        </section>

        {/* Main information */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Appointment */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Signing Details
            </h2>

            <div className="mt-3">
              <Detail
                label="Signing Type"
                value={job.signing_type || "Signing"}
              />

              <Detail
                label="Signing Date"
                value={formatDate(job.signing_date)}
              />

              <Detail
                label="Signing Time"
                value={formatTime(job.signing_time)}
              />

              <Detail
                label="Status"
                value={formatStatus(job.status)}
              />

              <Detail
                label="Fee"
                value={
                  <span className="font-black text-emerald-600">
                    {formatMoney(job.fee)}
                  </span>
                }
              />
            </div>
          </section>

          {/* Location */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Signing Location
            </h2>

            <div className="mt-3">
              <Detail
                label="Street Address"
                value={job.signing_address || "No address provided"}
              />

              <Detail
                label="City"
                value={job.signing_city || "—"}
              />

              <Detail
                label="State"
                value={job.signing_state || "—"}
              />

              <Detail
                label="ZIP Code"
                value={job.signing_zip || "—"}
              />
            </div>

            {fullAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  fullAddress
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-950"
              >
                Open in Google Maps
              </a>
            )}
          </section>

          {/* Client */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Client Information
            </h2>

            <div className="mt-3">
              <Detail
                label="Client"
                value={job.client_name || "No client specified"}
              />

              <Detail
                label="Borrower / Signer"
                value={job.borrower_name || "No borrower specified"}
              />

              <Detail
                label="Source"
                value={
                  job.source_type === "manual"
                    ? "External / Manual"
                    : formatStatus(job.source_type)
                }
              />
            </div>
          </section>

          {/* Job information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Job Information
            </h2>

            <div className="mt-3">
              <Detail
                label="Job Number"
                value={job.job_number || "Not assigned"}
              />

              <Detail
                label="Job ID"
                value={
                  <span className="break-all font-mono text-sm">
                    {job.id}
                  </span>
                }
              />

              <Detail
                label="Source Type"
                value={formatStatus(job.source_type)}
              />
            </div>
          </section>
        </div>

        {/* Actions */}
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row">
          <Link
            href="/notary/assignments"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Back to Assignments
          </Link>

          <Link
            href="/notary/pro/jobs"
            className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-blue-950"
          >
            View All Pro Jobs
          </Link>
        </section>
      </div>
    </main>
  );
}