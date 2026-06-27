import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Assignment = {
  id: string;
  control_number: string | null;
  notary_id?: string | null;
  assigned_notary_id?: string | null;
  status: string | null;
  signing_type: string | null;
  borrower_name: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  documents_url: string | null;
  notary_fee: number | string | null;
};

type ProJob = {
  id: string;
  source_type: string | null;
  client_name: string | null;
  borrower_name: string | null;
  status: string | null;
  signing_type: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  fee: number | string | null;
};

type UnifiedAssignment = {
  id: string;
  source: "ins" | "external";
  sourceLabel: "INS" | "External";
  controlNumber: string | null;
  clientName: string | null;
  borrowerName: string | null;
  status: string | null;
  signingType: string | null;
  signingDate: string | null;
  signingTime: string | null;
  signingAddress: string | null;
  signingCity: string | null;
  signingState: string | null;
  signingZip: string | null;
  fee: number | string | null;
  documentsUrl: string | null;
  href: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100";

const primaryButtonClass =
  "rounded-xl bg-[#0B1F4D] px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950";

const secondaryButtonClass =
  "rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50";

function formatDate(date: string | null) {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
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

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";

  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";

  return `$${amount.toFixed(2)}`;
}

function normalizeStatus(status: string | null) {
  return (status ?? "").toLowerCase().trim();
}

function statusCategory(status: string | null) {
  const normalized = normalizeStatus(status);

  if (
    normalized === "not confirmed" ||
    normalized === "new request" ||
    normalized === "scheduled"
  ) {
    return "upcoming";
  }

  if (normalized === "confirmed") return "confirmed";

  if (normalized === "in progress" || normalized === "late") {
    return "in_progress";
  }

  if (
    normalized === "signing complete" ||
    normalized === "completed" ||
    normalized === "closed"
  ) {
    return "completed";
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return "cancelled";
  }

  return "upcoming";
}

function isClosedOrDone(status: string | null) {
  const category = statusCategory(status);
  return category === "completed" || category === "cancelled";
}

function isUpcomingDate(date: string | null) {
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const signingDate = new Date(`${date}T00:00:00`);
  signingDate.setHours(0, 0, 0, 0);

  return signingDate >= today;
}

function statusBadge(status: string | null) {
  const category = statusCategory(status);

  if (category === "upcoming") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (category === "confirmed") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (category === "in_progress") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (category === "completed") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (category === "cancelled") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function sourceBadge(source: "ins" | "external") {
  if (source === "ins") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function statusAccent(type: string) {
  if (type === "upcoming") return "bg-blue-500";
  if (type === "confirmed") return "bg-slate-500";
  if (type === "in_progress") return "bg-amber-500";
  if (type === "completed") return "bg-green-600";
  if (type === "cancelled") return "bg-red-600";

  return "bg-slate-400";
}

function assignmentCard(assignment: UnifiedAssignment) {
  return (
    <div
      key={`${assignment.source}-${assignment.id}`}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${sourceBadge(
              assignment.source
            )}`}
          >
            {assignment.sourceLabel}
          </span>

          <p className="mt-3 text-sm font-semibold text-slate-500">
            Control #
          </p>
          <p className="mt-1 font-bold text-slate-950">
            {assignment.controlNumber ?? "—"}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge(
            assignment.status
          )}`}
        >
          {assignment.status ?? "Unknown"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div>
          <p className="font-semibold text-slate-500">Signing</p>
          <p className="font-semibold text-slate-950">
            {formatDate(assignment.signingDate)}
          </p>
          <p className="text-slate-600">{formatTime(assignment.signingTime)}</p>
          <p className="text-xs text-slate-500">
            {assignment.signingType ?? "Signing"}
          </p>
        </div>

        <div>
          <p className="font-semibold text-slate-500">Borrower</p>
          <p className="font-semibold text-slate-950">
            {assignment.borrowerName ?? "—"}
          </p>
        </div>

        <div>
          <p className="font-semibold text-slate-500">Client</p>
          <p className="font-semibold text-slate-950">
            {assignment.clientName ?? "—"}
          </p>
        </div>

        <div>
          <p className="font-semibold text-slate-500">Location</p>
          <p className="font-semibold text-slate-950">
            {assignment.signingAddress ?? "—"}
          </p>
          <p className="text-slate-600">
            {assignment.signingCity ?? "—"}, {assignment.signingState ?? "IN"}{" "}
            {assignment.signingZip ?? ""}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Fee</p>
          <p className="font-bold text-slate-950">
            {formatMoney(assignment.fee)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {assignment.documentsUrl ? (
          <a
            href={assignment.documentsUrl}
            className={secondaryButtonClass}
            target="_blank"
          >
            View Docs
          </a>
        ) : (
          <span className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-semibold text-slate-400">
            No Docs
          </span>
        )}

        <Link href={assignment.href} className={primaryButtonClass}>
          View
        </Link>
      </div>
    </div>
  );
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    source?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;

  const search = params?.q?.trim() ?? "";
  const status = params?.status?.trim() ?? "";
  const source = params?.source?.trim() ?? "";
  const from = params?.from?.trim() ?? "";
  const to = params?.to?.trim() ?? "";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: insAssignments } = await supabase
    .from("assignments")
    .select("*")
    .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
    .order("signing_date", { ascending: true })
    .order("signing_time", { ascending: true });

  const { data: externalJobs } = await supabase
    .from("pro_jobs")
    .select("*")
    .eq("notary_id", user.id)
    .eq("source_type", "manual")
    .order("signing_date", { ascending: true })
    .order("signing_time", { ascending: true });

  const insRows: UnifiedAssignment[] = ((insAssignments ?? []) as Assignment[]).map(
    (assignment) => ({
      id: assignment.id,
      source: "ins",
      sourceLabel: "INS",
      controlNumber: assignment.control_number,
      clientName: null,
      borrowerName: assignment.borrower_name,
      status: assignment.status,
      signingType: assignment.signing_type,
      signingDate: assignment.signing_date,
      signingTime: assignment.signing_time,
      signingAddress: assignment.signing_address,
      signingCity: assignment.signing_city,
      signingState: assignment.signing_state,
      signingZip: assignment.signing_zip,
      fee: assignment.notary_fee,
      documentsUrl: assignment.documents_url,
      href: `/notary/assignments/${assignment.id}`,
    })
  );

  const externalRows: UnifiedAssignment[] = ((externalJobs ?? []) as ProJob[]).map(
    (job) => ({
      id: job.id,
      source: "external",
      sourceLabel: "External",
      controlNumber: null,
      clientName: job.client_name,
      borrowerName: job.borrower_name,
      status: job.status,
      signingType: job.signing_type,
      signingDate: job.signing_date,
      signingTime: job.signing_time,
      signingAddress: job.signing_address,
      signingCity: job.signing_city,
      signingState: job.signing_state,
      signingZip: job.signing_zip,
      fee: job.fee,
      documentsUrl: null,
      href: "/notary/pro/jobs",
    })
  );

  let rows = [...insRows, ...externalRows].sort((a, b) => {
    const aDate = `${a.signingDate ?? "9999-12-31"} ${a.signingTime ?? "23:59"}`;
    const bDate = `${b.signingDate ?? "9999-12-31"} ${b.signingTime ?? "23:59"}`;
    return aDate.localeCompare(bDate);
  });

  if (source === "ins" || source === "external") {
    rows = rows.filter((row) => row.source === source);
  }

  if (status) {
    rows = rows.filter((row) => statusCategory(row.status) === status);
  }

  if (from) {
    rows = rows.filter((row) => row.signingDate && row.signingDate >= from);
  }

  if (to) {
    rows = rows.filter((row) => row.signingDate && row.signingDate <= to);
  }

  if (search) {
    const lowered = search.toLowerCase();

    rows = rows.filter((row) =>
      [
        row.controlNumber,
        row.clientName,
        row.borrowerName,
        row.signingCity,
        row.signingZip,
        row.signingType,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(lowered))
    );
  }

  const upcomingCount = rows.filter(
    (assignment) =>
      !isClosedOrDone(assignment.status) && isUpcomingDate(assignment.signingDate)
  ).length;

  const confirmedCount = rows.filter(
    (assignment) => statusCategory(assignment.status) === "confirmed"
  ).length;

  const inProgressCount = rows.filter(
    (assignment) => statusCategory(assignment.status) === "in_progress"
  ).length;

  const completedCount = rows.filter(
    (assignment) => statusCategory(assignment.status) === "completed"
  ).length;

  const cancelledCount = rows.filter(
    (assignment) => statusCategory(assignment.status) === "cancelled"
  ).length;

  const insCount = rows.filter((assignment) => assignment.source === "ins").length;
  const externalCount = rows.filter(
    (assignment) => assignment.source === "external"
  ).length;

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-100">
              Notary Work Queue
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Assignments
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/90">
              Manage INS and External assignments from one workspace.
            </p>
          </div>

          <Link
            href="/notary/pro/jobs/new"
            className="rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-[#0B1F4D] transition hover:bg-blue-50"
          >
            + Add External Assignment
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Find Assignments</h2>
        <p className="mt-1 text-sm text-slate-500">
          Search by borrower, client, control number, city, or ZIP code.
        </p>

        <form
          method="get"
          className="mt-5 grid gap-3 md:grid-cols-[1.3fr_.8fr_.9fr_1fr_1fr_auto_auto]"
        >
          <input
            name="q"
            defaultValue={search}
            placeholder="Search assignments"
            className={inputClass}
          />

          <select name="source" defaultValue={source} className={inputClass}>
            <option value="">All Sources</option>
            <option value="ins">INS</option>
            <option value="external">External</option>
          </select>

          <select name="status" defaultValue={status} className={inputClass}>
            <option value="">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            name="from"
            type="date"
            defaultValue={from}
            className={inputClass}
          />

          <input
            name="to"
            type="date"
            defaultValue={to}
            className={inputClass}
          />

          <button className={primaryButtonClass}>Filter</button>

          <Link href="/notary/assignments" className={secondaryButtonClass}>
            Reset
          </Link>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-6">
        {[
          ["All", rows.length, "Every assignment", ""],
          ["INS", insCount, "INS originated", "ins"],
          ["External", externalCount, "Outside INS", "external"],
        ].map(([label, count, description, sourceValue]) => (
          <Link
            key={label}
            href={
              sourceValue
                ? `/notary/assignments?source=${sourceValue}`
                : "/notary/assignments"
            }
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-slate-50"
          >
            <div className="mb-4 h-1 w-10 rounded-full bg-[#0B1F4D]" />
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <p className="mt-2 text-4xl font-bold text-slate-950">{count}</p>
            <p className="mt-2 text-xs text-slate-500">{description}</p>
          </Link>
        ))}

        {[
          ["Upcoming", upcomingCount, "Scheduled work", "upcoming"],
          ["In Progress", inProgressCount, "Currently active", "in_progress"],
          ["Completed", completedCount, "Finished work", "completed"],
        ].map(([label, count, description, statusValue]) => (
          <Link
            key={label}
            href={`/notary/assignments?status=${statusValue}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-slate-50"
          >
            <div
              className={`mb-4 h-1 w-10 rounded-full ${statusAccent(
                String(statusValue)
              )}`}
            />
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <p className="mt-2 text-4xl font-bold text-slate-950">{count}</p>
            <p className="mt-2 text-xs text-slate-500">{description}</p>
          </Link>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              All Assignments
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              INS and External work in one list with source badges.
            </p>
          </div>

          <Link href="/notary/pro/jobs/new" className={primaryButtonClass}>
            + Add External Assignment
          </Link>
        </div>

        {!rows.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No assignments match your filters.
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {rows.map((assignment) => assignmentCard(assignment))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Source</th>
                    <th className="px-4 py-3 font-bold">Borrower</th>
                    <th className="px-4 py-3 font-bold">Client</th>
                    <th className="px-4 py-3 font-bold">Signing</th>
                    <th className="px-4 py-3 font-bold">Location</th>
                    <th className="px-4 py-3 font-bold">Fee</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Docs</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {rows.map((assignment) => (
                    <tr
                      key={`${assignment.source}-${assignment.id}`}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${sourceBadge(
                            assignment.source
                          )}`}
                        >
                          {assignment.sourceLabel}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-950">
                        {assignment.borrowerName ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {assignment.clientName ?? "—"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-950">
                          {formatDate(assignment.signingDate)}
                        </div>
                        <div className="text-slate-500">
                          {formatTime(assignment.signingTime)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {assignment.signingType ?? "Signing"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        <div>{assignment.signingAddress ?? "—"}</div>
                        <div className="text-slate-500">
                          {assignment.signingCity ?? "—"},{" "}
                          {assignment.signingState ?? "IN"}{" "}
                          {assignment.signingZip ?? ""}
                        </div>
                      </td>

                      <td className="px-4 py-4 font-bold text-slate-950">
                        {formatMoney(assignment.fee)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge(
                            assignment.status
                          )}`}
                        >
                          {assignment.status ?? "Unknown"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {assignment.documentsUrl ? (
                          <a
                            href={assignment.documentsUrl}
                            className="font-bold text-[#0B1F4D] hover:underline"
                            target="_blank"
                          >
                            View Docs
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={assignment.href}
                          className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-950"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}