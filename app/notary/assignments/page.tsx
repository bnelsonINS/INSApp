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
  fee?: number | string | null;
};

const activeStatuses = [
  "Not Confirmed",
  "Confirmed",
  "In Progress",
  "Late",
  "Signing Complete",
];

const closedStatuses = ["Closed"];

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

function statusBadge(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "not confirmed") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (normalized === "confirmed") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (normalized === "in progress") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (normalized === "late") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (normalized === "signing complete") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (normalized === "closed") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function statusAccent(status: string) {
  if (status === "Not Confirmed") return "bg-blue-500";
  if (status === "Confirmed") return "bg-slate-500";
  if (status === "In Progress") return "bg-slate-500";
  if (status === "Signing Complete") return "bg-green-600";
  if (status === "Closed") return "bg-green-600";

  return "bg-slate-400";
}

function assignmentCard(assignment: Assignment) {
  return (
    <div
      key={assignment.id}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">Control #</p>
          <p className="mt-1 font-bold text-slate-950">
            {assignment.control_number ?? "—"}
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
            {formatDate(assignment.signing_date)}
          </p>
          <p className="text-slate-600">{formatTime(assignment.signing_time)}</p>
          <p className="text-xs text-slate-500">
            {assignment.signing_type ?? "Signing"}
          </p>
        </div>

        <div>
          <p className="font-semibold text-slate-500">Borrower</p>
          <p className="font-semibold text-slate-950">
            {assignment.borrower_name ?? "—"}
          </p>
        </div>

        <div>
          <p className="font-semibold text-slate-500">Location</p>
          <p className="font-semibold text-slate-950">
            {assignment.signing_address ?? "—"}
          </p>
          <p className="text-slate-600">
            {assignment.signing_city ?? "—"}, {assignment.signing_state ?? "IN"}{" "}
            {assignment.signing_zip ?? ""}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Notary Fee</p>
          <p className="font-bold text-slate-950">
            {formatMoney(assignment.notary_fee)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {assignment.documents_url ? (
          <a
            href={assignment.documents_url}
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

        <a
          href={`/notary/assignments/${assignment.id}`}
          className={primaryButtonClass}
        >
          View Assignment
        </a>
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
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;

  const search = params?.q?.trim() ?? "";
  const status = params?.status?.trim() ?? "";
  const from = params?.from?.trim() ?? "";
  const to = params?.to?.trim() ?? "";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let query = supabase
    .from("assignments")
    .select("*")
    .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
    .order("signing_date", { ascending: true })
    .order("signing_time", { ascending: true });

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("signing_date", from);
  if (to) query = query.lte("signing_date", to);

  if (search) {
    query = query.or(
      `control_number.ilike.%${search}%,borrower_name.ilike.%${search}%,signing_city.ilike.%${search}%,signing_zip.ilike.%${search}%`
    );
  }

  const { data: assignments } = await query;
  const safeAssignments = (assignments ?? []) as Assignment[];

  const activeAssignments = safeAssignments.filter((item) =>
    activeStatuses.includes(item.status ?? "")
  );

  const closedAssignments = safeAssignments.filter((item) =>
    closedStatuses.includes(item.status ?? "")
  );

  const notConfirmedCount = safeAssignments.filter(
    (assignment) => assignment.status === "Not Confirmed"
  ).length;

  const confirmedCount = safeAssignments.filter(
    (assignment) => assignment.status === "Confirmed"
  ).length;

  const inProgressCount = safeAssignments.filter(
    (assignment) =>
      assignment.status === "In Progress" || assignment.status === "Late"
  ).length;

  const signingCompleteCount = safeAssignments.filter(
    (assignment) => assignment.status === "Signing Complete"
  ).length;

  const closedCount = safeAssignments.filter(
    (assignment) => assignment.status === "Closed"
  ).length;

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-medium text-blue-100">
            Notary Work Queue
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Assignments
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/90">
            View active signings, documents, status updates, and closed work.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Find Assignments</h2>
        <p className="mt-1 text-sm text-slate-500">
          Search by control number, borrower, city, or ZIP code.
        </p>

        <form
          method="get"
          className="mt-5 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto]"
        >
          <input
            name="q"
            defaultValue={search}
            placeholder="Search assignments"
            className={inputClass}
          />

          <select name="status" defaultValue={status} className={inputClass}>
            <option value="">All Statuses</option>
            <option value="Not Confirmed">Not Confirmed</option>
            <option value="Confirmed">Confirmed</option>
            <option value="In Progress">In Progress</option>
            <option value="Late">Late</option>
            <option value="Signing Complete">Signing Complete</option>
            <option value="Closed">Closed</option>
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

          <a href="/notary/assignments" className={secondaryButtonClass}>
            Reset
          </a>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["Not Confirmed", notConfirmedCount, "Needs your response"],
          ["Confirmed", confirmedCount, "Appointment confirmed"],
          ["In Progress", inProgressCount, "Currently active"],
          ["Signing Complete", signingCompleteCount, "Awaiting closeout"],
          ["Closed", closedCount, "Processed work"],
        ].map(([label, count, description]) => (
          <a
            key={label}
            href={`/notary/assignments?status=${encodeURIComponent(
              String(label)
            )}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-slate-50"
          >
            <div
              className={`mb-4 h-1 w-10 rounded-full ${statusAccent(
                String(label)
              )}`}
            />
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <p className="mt-2 text-4xl font-bold text-slate-950">{count}</p>
            <p className="mt-2 text-xs text-slate-500">{description}</p>
          </a>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            Active Assignments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            These are assignments that still require action or are waiting to be
            closed.
          </p>
        </div>

        {!activeAssignments.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No active assignments right now.
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {activeAssignments.map((assignment) => assignmentCard(assignment))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Control #</th>
                    <th className="px-4 py-3 font-bold">Signing</th>
                    <th className="px-4 py-3 font-bold">Borrower</th>
                    <th className="px-4 py-3 font-bold">Location</th>
                    <th className="px-4 py-3 font-bold">Notary Fee</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Documents</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {activeAssignments.map((assignment) => (
                    <tr key={assignment.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-950">
                        {assignment.control_number ?? "—"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-950">
                          {formatDate(assignment.signing_date)}
                        </div>
                        <div className="text-slate-500">
                          {formatTime(assignment.signing_time)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {assignment.signing_type ?? "Signing"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {assignment.borrower_name ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        <div>{assignment.signing_address ?? "—"}</div>
                        <div className="text-slate-500">
                          {assignment.signing_city ?? "—"},{" "}
                          {assignment.signing_state ?? "IN"}{" "}
                          {assignment.signing_zip ?? ""}
                        </div>
                      </td>

                      <td className="px-4 py-4 font-bold text-slate-950">
                        {formatMoney(assignment.notary_fee)}
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
                        {assignment.documents_url ? (
                          <a
                            href={assignment.documents_url}
                            className="font-bold text-[#0B1F4D] hover:underline"
                            target="_blank"
                          >
                            View Docs
                          </a>
                        ) : (
                          <span className="text-slate-400">Not uploaded</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <a
                          href={`/notary/assignments/${assignment.id}`}
                          className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-950"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            Closed Assignments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            These assignments have been processed and fully closed.
          </p>
        </div>

        {!closedAssignments.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No closed assignments yet.
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {closedAssignments.map((assignment) => assignmentCard(assignment))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Control #</th>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Borrower</th>
                    <th className="px-4 py-3 font-bold">City</th>
                    <th className="px-4 py-3 font-bold">Notary Fee</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Documents</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {closedAssignments.map((assignment) => (
                    <tr key={assignment.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-950">
                        {assignment.control_number ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(assignment.signing_date)}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {assignment.borrower_name ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {assignment.signing_city ?? "—"}
                      </td>

                      <td className="px-4 py-4 font-bold text-slate-950">
                        {formatMoney(assignment.notary_fee)}
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
                        {assignment.documents_url ? (
                          <a
                            href={assignment.documents_url}
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
                        <a
                          href={`/notary/assignments/${assignment.id}`}
                          className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-950"
                        >
                          View
                        </a>
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