import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProJob = {
  id: string;
  source_type: string | null;
  job_number: string | null;
  client_name: string | null;
  borrower_name: string | null;
  signing_type: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  fee: number | string | null;
  status: string | null;
  payment_received: boolean | null;
};

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(date: string | null) {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "";

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ProJobsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: jobs, error } = await supabase
    .from("pro_jobs")
    .select("*")
    .eq("notary_id", user.id)
    .order("signing_date", { ascending: true, nullsFirst: false })
    .order("signing_time", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  const proJobs = (jobs ?? []) as ProJob[];

  const totalFee = proJobs.reduce((sum, job) => sum + Number(job.fee ?? 0), 0);
  const manualJobs = proJobs.filter((job) => job.source_type === "manual");
  const insJobs = proJobs.filter((job) => job.source_type === "ins");
  const unpaidJobs = proJobs.filter((job) => !job.payment_received);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              INS Pro
            </p>
            <h1 className="text-3xl font-black text-slate-950">Jobs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track INS and Non-INS signings in one business workspace.
            </p>
          </div>

          <Link
            href="/notary/pro/jobs/new"
            className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-center text-sm font-black text-white hover:bg-blue-950"
          >
            + Add Non-INS Signing
          </Link>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Total Jobs
            </p>
            <p className="mt-2 text-4xl font-black text-blue-700">
              {proJobs.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Manual Jobs
            </p>
            <p className="mt-2 text-4xl font-black text-slate-950">
              {manualJobs.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              INS Jobs
            </p>
            <p className="mt-2 text-4xl font-black text-slate-950">
              {insJobs.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Total Fees
            </p>
            <p className="mt-2 text-4xl font-black text-emerald-600">
              {money(totalFee)}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-2xl font-black text-slate-950">All Jobs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manual jobs stay here. INS assignments will sync here later.
            </p>
          </div>

          {proJobs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-bold text-slate-700">No jobs yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Add your first Non-INS signing to start tracking it.
              </p>
              <Link
                href="/notary/pro/jobs/new"
                className="mt-5 inline-block rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-black text-white hover:bg-blue-950"
              >
                + Add Non-INS Signing
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Borrower</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Fee</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {proJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-black text-slate-950">
                        {job.borrower_name || "Unnamed Borrower"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                            job.source_type === "ins"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {job.source_type === "ins" ? "INS" : "Manual"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {job.client_name || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {job.signing_type || "Signing"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatDate(job.signing_date)}{" "}
                        {formatTime(job.signing_time)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {job.signing_city || "—"}
                        {job.signing_state ? `, ${job.signing_state}` : ""}{" "}
                        {job.signing_zip || ""}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {job.status || "scheduled"}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-emerald-600">
                        {money(Number(job.fee ?? 0))}
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