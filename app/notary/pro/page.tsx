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
    case "unpaid":
      return "Unpaid - Not Overdue";
    case "overdue-8-14":
      return "Overdue 8-14 Days";
    case "overdue-15-plus":
      return "Overdue 15+ Days";
    default:
      return "Upcoming Signings";
  }
}

function ProIcon({ type }: { type: string }) {
  const className = "h-6 w-6";

  if (type === "calendar") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
      </svg>
    );
  }

  if (type === "clock") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }

  if (type === "money") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 8.5H11a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9.5M12 7v10" />
      </svg>
    );
  }

  if (type === "warning") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      </svg>
    );
  }

  if (type === "invoice") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    );
  }

  if (type === "car") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 16h14l-1.5-5h-11L5 16Zm2 0v3m10-3v3M7 19h.01M17 19h.01M8 11l1-4h6l1 4" />
      </svg>
    );
  }

  if (type === "book") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 11h8" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M13 5l7 7-7 7" />
    </svg>
  );
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

  const topAlertCards = [
    {
      label: "Upcoming Signings",
      filter: "upcoming",
      count: upcomingJobs.length,
      amount: null,
      icon: "calendar",
      tone: "blue",
    },
    {
      label: "Unconfirmed Appointments",
      filter: "unconfirmed",
      count: unconfirmedJobs.length,
      amount: null,
      icon: "clock",
      tone: "amber",
    },
    {
      label: "Unpaid - Not Overdue",
      filter: "unpaid",
      count: unpaidJobs.length,
      amount: revenue,
      icon: "money",
      tone: "blue",
    },
    {
      label: "Overdue 15+ Days",
      filter: "overdue-15-plus",
      count: 0,
      amount: 0,
      icon: "warning",
      tone: "red",
    },
  ];

  const alertList = [
    {
      label: "Upcoming Signings",
      filter: "upcoming",
      count: upcomingJobs.length,
      amount: null,
      icon: "calendar",
      tone: "blue",
    },
    {
      label: "Unconfirmed Appointments",
      filter: "unconfirmed",
      count: unconfirmedJobs.length,
      amount: null,
      icon: "clock",
      tone: "amber",
    },
    {
      label: "Unpaid - Not Overdue",
      filter: "unpaid",
      count: unpaidJobs.length,
      amount: revenue,
      icon: "money",
      tone: "blue",
    },
    {
      label: "Overdue 8-14 Days",
      filter: "overdue-8-14",
      count: 0,
      amount: 0,
      icon: "warning",
      tone: "red",
    },
    {
      label: "Overdue 15+ Days",
      filter: "overdue-15-plus",
      count: 0,
      amount: 0,
      icon: "warning",
      tone: "red",
    },
  ];

  const quickActions = [
    {
  label: "View Pro Jobs",
  href: "/notary/pro/jobs",
  icon: "calendar",
},
    {
  label: "Add Non-INS Signing",
  href: "/notary/pro/jobs/new",
  icon: "invoice",
},
    {
      label: "Mileage Log",
      href: "/notary/pro?filter=upcoming",
      icon: "car",
    },
    {
      label: "Notary Journal",
      href: "/notary/pro?filter=upcoming",
      icon: "book",
    },
    {
      label: "Send Invoice",
      href: "/notary/pro?filter=unpaid",
      icon: "send",
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
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="grid gap-4 lg:grid-cols-4">
          {topAlertCards.map((card) => {
            const active = activeFilter === card.filter;

            const tone =
              card.tone === "red"
                ? "text-red-600 bg-red-100 border-red-200"
                : card.tone === "amber"
                  ? "text-amber-700 bg-amber-100 border-amber-200"
                  : "text-blue-700 bg-blue-100 border-blue-200";

            return (
              <Link
                key={card.filter}
                href={`/notary/pro?filter=${card.filter}&timeframe=${activeTimeFrame}`}
                className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  active ? "ring-2 ring-[#0B1F4D] ring-offset-2" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${tone}`}
                  >
                    <ProIcon type={card.icon} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase tracking-wide text-slate-600">
                      {card.label}
                    </p>
                    <div className="mt-1 flex items-end gap-3">
                      <p
                        className={`text-4xl font-black ${
                          card.tone === "red"
                            ? "text-red-600"
                            : card.tone === "amber"
                              ? "text-amber-700"
                              : "text-blue-700"
                        }`}
                      >
                        {card.count}
                      </p>

                      {card.amount !== null && (
                        <p
                          className={`pb-1 text-sm font-bold ${
                            card.tone === "red"
                              ? "text-red-600"
                              : "text-blue-700"
                          }`}
                        >
                          {money(card.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Signings
            </p>
            <p className="mt-2 text-4xl font-black text-blue-700">
              {timeFrameJobs.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Revenue
            </p>
            <p className="mt-2 text-4xl font-black text-blue-700">
              {money(revenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Profit
            </p>
            <p className="mt-2 text-4xl font-black text-emerald-600">
              {money(profit)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Avg Profit
            </p>
            <p className="mt-2 text-4xl font-black text-emerald-600">
              {money(averageProfit)}
            </p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Signing Activity
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Signing count for selected time frame.
                </p>
              </div>

              <TimeFrameSelect
                currentYear={currentYear}
                selectedTimeFrame={activeTimeFrame}
              />
            </div>

            <div className="mt-6 grid h-72 grid-cols-12 items-end gap-2 border-b border-slate-200 px-2">
              {monthlyCounts.map((count, index) => {
                const barHeight =
                  count > 0 ? Math.max((count / maxMonthCount) * 220, 28) : 0;

                return (
                  <div
                    key={months[index]}
                    className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                  >
                    <div className="text-xs font-bold text-slate-600">
                      {count}
                    </div>

                    <div
                      className="w-full max-w-10 rounded-t-lg bg-blue-600"
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Top Alerts</h2>

            <div className="mt-4 space-y-2">
              {alertList.map((alert) => {
                const tone =
                  alert.tone === "red"
                    ? "text-red-600 bg-red-50"
                    : alert.tone === "amber"
                      ? "text-amber-700 bg-amber-50"
                      : "text-blue-700 bg-blue-50";

                return (
                  <Link
                    key={alert.filter}
                    href={`/notary/pro?filter=${alert.filter}&timeframe=${activeTimeFrame}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
                      >
                        <ProIcon type={alert.icon} />
                      </div>
                      <p className="truncate text-sm font-bold text-slate-900">
                        {alert.label}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-lg font-black ${
                          alert.tone === "red"
                            ? "text-red-600"
                            : alert.tone === "amber"
                              ? "text-amber-700"
                              : "text-slate-950"
                        }`}
                      >
                        {alert.count}
                      </p>
                      {alert.amount !== null && (
                        <p
                          className={`text-xs font-bold ${
                            alert.tone === "red"
                              ? "text-red-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {money(alert.amount)}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <Link
              href={`/notary/pro?filter=upcoming&timeframe=${activeTimeFrame}`}
              className="mt-4 block rounded-xl px-4 py-3 text-center text-sm font-black text-blue-700 transition hover:bg-blue-50"
            >
              View All Alerts
            </Link>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {getFilterTitle(activeFilter)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing jobs that match the selected INS Pro alert card.
                </p>
              </div>

              <Link
                href={`/notary/pro?filter=upcoming&timeframe=${activeTimeFrame}`}
                className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-blue-950"
              >
                View All
              </Link>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="p-6 text-sm font-medium text-slate-500">
                No jobs match this filter yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Borrower</th>
                      <th className="px-5 py-3">Control #</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Date & Time</th>
                      <th className="px-5 py-3">Location</th>
                      <th className="px-5 py-3 text-right">Fee</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredJobs.slice(0, 8).map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-black text-slate-950">
                          {job.borrower_name || "Unnamed Borrower"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {job.control_number || "No control #"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {job.signing_type || "Signing"}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {formatDate(job.signing_date)}{" "}
                          {formatTime(job.signing_time)}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {job.signing_city}, {job.signing_state}{" "}
                          {job.signing_zip}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-emerald-600">
                          {money(Number(job.notary_fee ?? 0))}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/notary/assignments/${job.id}`}
                            className="font-black text-blue-700"
                          >
                            ›
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Quick Actions
            </h2>

            <div className="mt-4 space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-[#0B1F4D]">
                      <ProIcon type={action.icon} />
                    </div>
                    <p className="font-bold text-slate-900">{action.label}</p>
                  </div>

                  <span className="text-xl font-black text-slate-400">›</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}