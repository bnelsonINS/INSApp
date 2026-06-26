import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";
import TimeFrameSelect from "./time-frame-select";

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

type PageProps = {
  searchParams?: Promise<{
    filter?: string;
    timeframe?: string;
  }>;
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

function jobMatchesTimeFrame(job: Assignment, timeFrame: string) {
  if (timeFrame === "since-inception") return true;
  if (!job.signing_date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const jobDate = new Date(`${job.signing_date}T00:00:00`);
  jobDate.setHours(0, 0, 0, 0);

  if (/^\d{4}$/.test(timeFrame)) {
    return job.signing_date.startsWith(timeFrame);
  }

  if (timeFrame === "this-month") {
    return (
      jobDate.getFullYear() === today.getFullYear() &&
      jobDate.getMonth() === today.getMonth()
    );
  }

  if (timeFrame === "last-month") {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    return (
      jobDate.getFullYear() === lastMonth.getFullYear() &&
      jobDate.getMonth() === lastMonth.getMonth()
    );
  }

  if (timeFrame === "this-week") {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return jobDate >= start && jobDate <= end;
  }

  if (timeFrame === "last-week") {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - 7);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return jobDate >= start && jobDate <= end;
  }

  if (timeFrame === "last-10-weeks") {
    const start = new Date(today);
    start.setDate(today.getDate() - 70);

    return jobDate >= start && jobDate <= today;
  }

  return job.signing_date.startsWith(String(today.getFullYear()));
}

function getFilterTitle(filter: string) {
  switch (filter) {
    case "upcoming":
      return "Upcoming Signings";
    case "unconfirmed":
      return "Unconfirmed Appointments";
    case "docs-not-received":
      return "Docs Not Received";
    case "docs-not-printed":
      return "Docs Not Printed";
    case "scanbacks-not-sent":
      return "Scanbacks Not Sent";
    case "journal-missing":
      return "Journal Entry Missing";
    case "unsent-invoices":
      return "Unsent Invoices";
    case "mileage-missing":
      return "Mileage Not Entered";
    case "notarial-acts-missing":
      return "Notarial Acts Missing";
    case "time-missing":
      return "Time Not Entered";
    case "unpaid":
      return "Unpaid - Not Overdue";
    case "overdue-8-14":
      return "Overdue 8-14 Days";
    case "overdue-15-plus":
      return "Overdue 15+ Days";
    default:
      return "Upcoming INS Jobs";
  }
}

export default async function INSProHomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const currentYear = new Date().getFullYear();

  const activeFilter = resolvedSearchParams?.filter ?? "upcoming";
  const activeTimeFrame = resolvedSearchParams?.timeframe ?? `${currentYear}`;

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

  const timeFrameJobs = jobs.filter((job) =>
    jobMatchesTimeFrame(job, activeTimeFrame)
  );

  const upcomingJobs = timeFrameJobs.filter((job) => {
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

  const completedJobs = timeFrameJobs.filter((job) =>
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

  const unpaidJobs = completedJobs;

  const filteredJobs =
    activeFilter === "upcoming"
      ? upcomingJobs
      : activeFilter === "unconfirmed"
        ? unconfirmedJobs
        : activeFilter === "unpaid"
          ? unpaidJobs
          : [];

  const monthlyCounts = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;

    return timeFrameJobs.filter((job) => {
      if (!job.signing_date) return false;
      const jobMonth = Number(job.signing_date.slice(5, 7));
      return jobMonth === month;
    }).length;
  });

  const maxMonthCount = Math.max(...monthlyCounts, 1);

  const alertCards = [
    {
      label: "Upcoming Signings",
      filter: "upcoming",
      count: upcomingJobs.length,
      amount: null,
      tone: "slate",
    },
    {
      label: "Unconfirmed Appointments",
      filter: "unconfirmed",
      count: unconfirmedJobs.length,
      amount: null,
      tone: "amber",
    },
    {
      label: "Docs Not Received",
      filter: "docs-not-received",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Docs Not Printed",
      filter: "docs-not-printed",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Scanbacks Not Sent",
      filter: "scanbacks-not-sent",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Journal Entry Missing",
      filter: "journal-missing",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Unsent Invoices",
      filter: "unsent-invoices",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Mileage Not Entered",
      filter: "mileage-missing",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Notarial Acts Missing",
      filter: "notarial-acts-missing",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Time Not Entered",
      filter: "time-missing",
      count: 0,
      amount: null,
      tone: "slate",
    },
    {
      label: "Unpaid - Not Overdue",
      filter: "unpaid",
      count: unpaidJobs.length,
      amount: revenue,
      tone: "blue",
    },
    {
      label: "Overdue 8-14 Days",
      filter: "overdue-8-14",
      count: 0,
      amount: 0,
      tone: "red",
    },
    {
      label: "Overdue 15+ Days",
      filter: "overdue-15-plus",
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
    <main className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="-mx-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0 xl:overflow-visible xl:pb-0">
          <div className="flex gap-3 xl:block xl:space-y-3">
            {alertCards.map((card) => {
              const isActive = activeFilter === card.filter;

              const toneClass =
                card.tone === "blue"
                  ? "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100"
                  : card.tone === "red"
                    ? "border-red-200 bg-red-50 text-red-900 hover:bg-red-100"
                    : card.tone === "amber"
                      ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50";

              return (
                <Link
                  key={card.filter}
                  href={`/notary/pro?filter=${card.filter}&timeframe=${activeTimeFrame}`}
                  className={`flex min-w-[240px] items-center justify-between rounded-2xl border p-4 shadow-sm transition sm:min-w-[275px] xl:min-w-0 ${toneClass} ${
                    isActive ? "ring-2 ring-[#0B1F4D] ring-offset-2" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide sm:text-sm">
                      {card.label}
                    </p>

                    {card.amount !== null && (
                      <p className="mt-1 text-xs font-bold opacity-80">
                        {money(card.amount)}
                      </p>
                    )}
                  </div>

                  <div className="ml-4 shrink-0 text-2xl font-black sm:text-3xl">
                    {card.count}
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">
                Signings
              </p>
              <p className="mt-2 text-3xl font-black text-blue-600 sm:text-4xl">
                {timeFrameJobs.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">
                Revenue
              </p>
              <p className="mt-2 break-words text-2xl font-black text-blue-600 sm:text-4xl">
                {money(revenue)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">
                Profit
              </p>
              <p className="mt-2 break-words text-2xl font-black text-emerald-600 sm:text-4xl">
                {money(profit)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">
                Avg Profit
              </p>
              <p className="mt-2 break-words text-2xl font-black text-emerald-600 sm:text-4xl">
                {money(averageProfit)}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
                  Signing Activity
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Signing count for selected time frame.
                </p>
              </div>

              <div className="w-full md:w-auto">
                <TimeFrameSelect
                  currentYear={currentYear}
                  selectedTimeFrame={activeTimeFrame}
                />
              </div>
            </div>

            <div className="mt-6 w-full overflow-hidden">
              <div className="grid h-72 grid-cols-12 items-end gap-1 border-b border-slate-200 px-1 sm:gap-3 sm:px-2">
                {monthlyCounts.map((count, index) => {
                  const barHeight =
                    count > 0
                      ? Math.max((count / maxMonthCount) * 220, 32)
                      : 0;

                  return (
                    <div
                      key={months[index]}
                      className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                    >
                      <div className="text-xs font-bold text-slate-500">
                        {count > 0 ? count : ""}
                      </div>

                      <div
                        className="w-full max-w-10 rounded-t-lg bg-blue-500 sm:max-w-12 sm:rounded-t-xl"
                        style={{ height: `${barHeight}px` }}
                      />

                      <div className="text-[10px] font-bold text-slate-500 sm:text-xs">
                        {months[index]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
                  {getFilterTitle(activeFilter)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing jobs that match the selected INS Pro alert card.
                </p>
              </div>

              <Link
                href={`/notary/pro?filter=upcoming&timeframe=${activeTimeFrame}`}
                className="w-full rounded-xl bg-[#0B1F4D] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-950 md:w-auto md:py-2"
              >
                Reset Filter
              </Link>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              {filteredJobs.length === 0 ? (
                <div className="p-6 text-sm font-medium text-slate-500">
                  No jobs match this filter yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredJobs.slice(0, 25).map((job) => (
                    <Link
                      key={job.id}
                      href={`/notary/assignments/${job.id}`}
                      className="block p-4 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">
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

                        <div className="shrink-0 text-left md:text-right">
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