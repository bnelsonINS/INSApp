import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Assignment = {
  id: string;
  control_number: string | null;
  status: string | null;
  signing_type: string | null;
  borrower_name: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  notary_fee: number | string | null;
  scanbacks_required?: boolean | null;
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

function isCurrentYear(date: string | null) {
  if (!date) return false;
  return date.startsWith(new Date().getFullYear().toString());
}

function isFutureOrToday(date: string | null) {
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const signingDate = new Date(`${date}T00:00:00`);
  return signingDate >= today;
}

function isClosedOrComplete(status: string | null) {
  const normalized = (status ?? "").toLowerCase();
  return normalized === "closed" || normalized === "signing complete";
}

export default async function INSProHomePage() {
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

  if (!profile || profile.role !== "notary" || !profile.is_active) {
    redirect("/login");
  }

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
    .order("signing_date", { ascending: true, nullsFirst: false })
    .order("signing_time", { ascending: true, nullsFirst: false });

  const jobs = (assignments ?? []) as Assignment[];

  const currentYearJobs = jobs.filter((job) => isCurrentYear(job.signing_date));

  const upcomingJobs = jobs.filter((job) => {
    const status = (job.status ?? "").toLowerCase();

    return (
      isFutureOrToday(job.signing_date) &&
      status !== "closed" &&
      status !== "cancelled" &&
      status !== "did not sign"
    );
  });

  const unconfirmedJobs = upcomingJobs.filter((job) => {
    const status = (job.status ?? "").toLowerCase();
    return status === "new request" || status === "not confirmed";
  });

  const completedJobs = currentYearJobs.filter((job) =>
    isClosedOrComplete(job.status)
  );

  const revenue = completedJobs.reduce(
    (sum, job) => sum + Number(job.notary_fee ?? 0),
    0
  );

  const estimatedExpenses = 0;
  const profit = revenue - estimatedExpenses;
  const averageProfit =
    completedJobs.length > 0 ? profit / completedJobs.length : 0;

  const unpaidJobs = currentYearJobs.filter((job) =>
    isClosedOrComplete(job.status)
  );

  const monthlyCounts = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;

    return currentYearJobs.filter((job) => {
      if (!job.signing_date) return false;
      const jobMonth = Number(job.signing_date.slice(5, 7));
      return jobMonth === month;
    }).length;
  });

  const maxMonthCount = Math.max(...monthlyCounts, 1);

  const alertCards = [
    {
      label: "Upcoming Signings",
      count: upcomingJobs.length,
      amount: null,
      tone: "slate",
    },
    {
      label: "Unconfirmed Appointments",
      count: unconfirmedJobs.length,
      amount: null,
      tone: "amber",
    },
    {
      label: "Docs Not Received",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Docs Not Printed",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Scanbacks Not Sent",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Journal Entry Missing",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Unsent Invoices",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Mileage Not Entered",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Notarial Acts Missing",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Time Not Entered",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Unpaid - Not Overdue",
      count: unpaidJobs.length,
      amount: revenue,
      tone: "blue",
    },
    {
      label: "Overdue 8-14 Days",
      count: 0,
      amount: 0,
      tone: "red",
    },
    {
      label: "Overdue 15+ Days",
      count: 0,
      amount: 0,
      tone: "red",
    },
  ];

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-3xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 p-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-200">
              INS Professional Suite
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Business Command Center
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-100">
              Track signings, income, mileage, invoices, expenses, and business
              tasks from one place.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/notary/assignments"
              className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-[#0B1F4D] transition hover:bg-slate-100"
            >
              Back to INS Assignments
            </Link>

            <Link
              href="/notary/pro"
              className="rounded-xl border border-white/30 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
            >
              INS Pro Home
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-3">
          {alertCards.map((card) => {
            const toneClass =
              card.tone === "blue"
                ? "border-blue-200 bg-blue-50 text-blue-900"
                : card.tone === "red"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : card.tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-slate-200 bg-white text-slate-900";

            return (
              <div
                key={card.label}
                className={`flex items-center justify-between rounded-2xl border p-4 shadow-sm ${toneClass}`}
              >
                <div>
                  <p className="text-sm font-black uppercase tracking-wide">
                    {card.label}
                  </p>

                  {card.amount !== null && (
                    <p className="mt-1 text-xs font-bold opacity-80">
                      {money(card.amount)}
                    </p>
                  )}
                </div>

                <div className="text-3xl font-black">{card.count}</div>
              </div>
            );
          })}
        </aside>

        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Signings
              </p>
              <p className="mt-2 text-3xl font-black text-blue-600">
                {currentYearJobs.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Revenue
              </p>
              <p className="mt-2 text-3xl font-black text-blue-600">
                {money(revenue)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Profit
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-600">
                {money(profit)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Avg Profit
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-600">
                {money(averageProfit)}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Signing Activity
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Monthly signing count for {new Date().getFullYear()}.
                </p>
              </div>

              <select className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                <option>{new Date().getFullYear()}</option>
              </select>
            </div>

            <div className="mt-8 flex h-72 items-end gap-3 border-b border-slate-200 px-2">
              {monthlyCounts.map((count, index) => {
                const height = Math.max((count / maxMonthCount) * 100, 3);

                return (
                  <div
                    key={months[index]}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="text-xs font-bold text-slate-500">
                      {count > 0 ? count : ""}
                    </div>

                    <div
                      className="w-full max-w-12 rounded-t-xl bg-blue-500"
                      style={{ height: `${height}%` }}
                    />

                    <div className="text-xs font-bold text-slate-500">
                      {months[index]}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Upcoming INS Jobs
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  These are pulled directly from your INS assignments.
                </p>
              </div>

              <Link
                href="/notary/assignments"
                className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-blue-950"
              >
                View All
              </Link>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              {upcomingJobs.length === 0 ? (
                <div className="p-6 text-sm font-medium text-slate-500">
                  No upcoming jobs yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {upcomingJobs.slice(0, 6).map((job) => (
                    <Link
                      key={job.id}
                      href={`/notary/assignments/${job.id}`}
                      className="block p-4 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                          <p className="font-black text-slate-950">
                            {job.borrower_name || "Unnamed Borrower"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {job.control_number || "No control #"} ·{" "}
                            {job.signing_type || "Signing"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {job.signing_city}, {job.signing_state}{" "}
                            {job.signing_zip}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="font-black text-slate-950">
                            {formatDate(job.signing_date)}{" "}
                            {formatTime(job.signing_time)}
                          </p>
                          <p className="mt-1 text-sm font-bold text-emerald-600">
                            {money(Number(job.notary_fee ?? 0))}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}