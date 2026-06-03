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
  //"New Request",
  "Not Confirmed",
  "Confirmed",
  "In Progress",
  "Late",
  "Signing Complete",
];

const closedStatuses = ["Closed"];

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

  if (normalized === "not confirmed") return "bg-amber-100 text-amber-800";
  if (normalized === "confirmed") return "bg-blue-100 text-blue-800";
  if (normalized === "in progress") return "bg-purple-100 text-purple-800";
  if (normalized === "late") return "bg-red-100 text-red-800";
  if (normalized === "signing complete") return "bg-orange-100 text-orange-800";
  if (normalized === "closed") return "bg-green-100 text-green-800";

  return "bg-slate-100 text-slate-800";
}

function statusCardStyle(status: string) {
  if (status === "Not Confirmed") {
    return "border-amber-100 bg-amber-50 text-amber-950 hover:bg-amber-100";
  }

  if (status === "Confirmed") {
    return "border-blue-100 bg-blue-50 text-blue-950 hover:bg-blue-100";
  }

  if (status === "In Progress") {
    return "border-purple-100 bg-purple-50 text-purple-950 hover:bg-purple-100";
  }

  if (status === "Signing Complete") {
    return "border-orange-100 bg-orange-50 text-orange-950 hover:bg-orange-100";
  }

  if (status === "Closed") {
    return "border-green-100 bg-green-50 text-green-950 hover:bg-green-100";
  }

  return "border-slate-200 bg-white text-slate-950 hover:bg-slate-50";
}

function assignmentCard(assignment: Assignment) {
  return (
    <div key={assignment.id} className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Control #</p>
          <p className="font-bold">{assignment.control_number ?? "—"}</p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
            assignment.status
          )}`}
        >
          {assignment.status ?? "Unknown"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div>
          <p className="text-slate-500">Signing</p>
          <p className="font-medium">{formatDate(assignment.signing_date)}</p>
          <p className="text-slate-600">{formatTime(assignment.signing_time)}</p>
          <p className="text-xs text-slate-500">
            {assignment.signing_type ?? "Signing"}
          </p>
        </div>

        <div>
          <p className="text-slate-500">Borrower</p>
          <p className="font-medium">{assignment.borrower_name ?? "—"}</p>
        </div>

        <div>
          <p className="text-slate-500">Location</p>
          <p className="font-medium">{assignment.signing_address ?? "—"}</p>
          <p className="text-slate-600">
            {assignment.signing_city ?? "—"}, {assignment.signing_state ?? "IN"}{" "}
            {assignment.signing_zip ?? ""}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Notary Fee</p>
          <p className="font-semibold">{formatMoney(assignment.notary_fee)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {assignment.documents_url ? (
          <a
            href={assignment.documents_url}
            className="rounded-xl border px-4 py-2 text-center text-sm font-semibold hover:bg-slate-50"
            target="_blank"
          >
            View Docs
          </a>
        ) : (
          <span className="rounded-xl border px-4 py-2 text-center text-sm text-slate-400">
            No Docs
          </span>
        )}

        <a
          href={`/notary/assignments/${assignment.id}`}
          className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800"
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
    <main className="space-y-6 p-4 sm:p-6">
      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow">
        <p className="text-sm text-slate-300">Notary Work Queue</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Assignments</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          View active signings, documents, status updates, and closed work.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Find Assignments</h2>
        <p className="text-sm text-slate-500">
          Search by control number, borrower, city, or ZIP code.
        </p>

        <form
          method="get"
          className="mt-4 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto]"
        >
          <input
            name="q"
            defaultValue={search}
            placeholder="Search assignments"
            className="rounded-xl border p-3"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border p-3"
          >
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
            className="rounded-xl border p-3"
          />

          <input
            name="to"
            type="date"
            defaultValue={to}
            className="rounded-xl border p-3"
          />

          <button className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">
            Filter
          </button>

          <a
            href="/notary/assignments"
            className="rounded-xl border px-5 py-3 text-center font-bold hover:bg-slate-50"
          >
            Reset
          </a>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <a
          href="/notary/assignments?status=Not Confirmed"
          className={`rounded-2xl border p-5 shadow-sm ${statusCardStyle(
            "Not Confirmed"
          )}`}
        >
          <p className="text-sm font-semibold">Not Confirmed</p>
          <p className="mt-2 text-4xl font-bold">{notConfirmedCount}</p>
          <p className="mt-2 text-xs opacity-75">Needs your response</p>
        </a>

        <a
          href="/notary/assignments?status=Confirmed"
          className={`rounded-2xl border p-5 shadow-sm ${statusCardStyle(
            "Confirmed"
          )}`}
        >
          <p className="text-sm font-semibold">Confirmed</p>
          <p className="mt-2 text-4xl font-bold">{confirmedCount}</p>
          <p className="mt-2 text-xs opacity-75">Appointment confirmed</p>
        </a>

        <a
          href="/notary/assignments?status=In Progress"
          className={`rounded-2xl border p-5 shadow-sm ${statusCardStyle(
            "In Progress"
          )}`}
        >
          <p className="text-sm font-semibold">In Progress</p>
          <p className="mt-2 text-4xl font-bold">{inProgressCount}</p>
          <p className="mt-2 text-xs opacity-75">Currently active</p>
        </a>

        <a
          href="/notary/assignments?status=Signing Complete"
          className={`rounded-2xl border p-5 shadow-sm ${statusCardStyle(
            "Signing Complete"
          )}`}
        >
          <p className="text-sm font-semibold">Signing Complete</p>
          <p className="mt-2 text-4xl font-bold">{signingCompleteCount}</p>
          <p className="mt-2 text-xs opacity-75">Awaiting closeout</p>
        </a>

        <a
          href="/notary/assignments?status=Closed"
          className={`rounded-2xl border p-5 shadow-sm ${statusCardStyle(
            "Closed"
          )}`}
        >
          <p className="text-sm font-semibold">Closed</p>
          <p className="mt-2 text-4xl font-bold">{closedCount}</p>
          <p className="mt-2 text-xs opacity-75">Processed work</p>
        </a>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-blue-100 bg-blue-50 p-5">
          <h2 className="text-xl font-bold text-blue-950">
            Active Assignments
          </h2>
          <p className="text-sm text-blue-700">
            These are assignments that still require action or are waiting to be
            closed.
          </p>
        </div>

        {!activeAssignments.length ? (
          <div className="p-8 text-sm text-slate-500">
            No active assignments right now.
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {activeAssignments.map((assignment) => assignmentCard(assignment))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Control #</th>
                    <th className="p-3">Signing</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Notary Fee</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Documents</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {activeAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-medium">
                        {assignment.control_number ?? "—"}
                      </td>

                      <td className="p-3">
                        <div className="font-medium">
                          {formatDate(assignment.signing_date)}
                        </div>
                        <div className="text-slate-500">
                          {formatTime(assignment.signing_time)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {assignment.signing_type ?? "Signing"}
                        </div>
                      </td>

                      <td className="p-3">{assignment.borrower_name ?? "—"}</td>

                      <td className="p-3">
                        <div>{assignment.signing_address ?? "—"}</div>
                        <div className="text-slate-500">
                          {assignment.signing_city ?? "—"},{" "}
                          {assignment.signing_state ?? "IN"}{" "}
                          {assignment.signing_zip ?? ""}
                        </div>
                      </td>

                      <td className="p-3 font-semibold">
                        {formatMoney(assignment.notary_fee)}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                            assignment.status
                          )}`}
                        >
                          {assignment.status ?? "Unknown"}
                        </span>
                      </td>

                      <td className="p-3">
                        {assignment.documents_url ? (
                          <a
                            href={assignment.documents_url}
                            className="font-medium text-blue-700 underline"
                            target="_blank"
                          >
                            View Docs
                          </a>
                        ) : (
                          <span className="text-slate-400">Not uploaded</span>
                        )}
                      </td>

                      <td className="p-3">
                        <a
                          href={`/notary/assignments/${assignment.id}`}
                          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
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

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-green-100 bg-green-50 p-5">
          <h2 className="text-xl font-bold text-green-950">
            Closed Assignments
          </h2>
          <p className="text-sm text-green-700">
            These assignments have been processed and fully closed.
          </p>
        </div>

        {!closedAssignments.length ? (
          <div className="p-8 text-sm text-slate-500">
            No closed assignments yet.
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {closedAssignments.map((assignment) => assignmentCard(assignment))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Control #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Notary Fee</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Documents</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {closedAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-medium">
                        {assignment.control_number ?? "—"}
                      </td>

                      <td className="p-3">
                        {formatDate(assignment.signing_date)}
                      </td>

                      <td className="p-3">{assignment.borrower_name ?? "—"}</td>

                      <td className="p-3">
                        {assignment.signing_city ?? "—"}
                      </td>

                      <td className="p-3 font-semibold">
                        {formatMoney(assignment.notary_fee)}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                            assignment.status
                          )}`}
                        >
                          {assignment.status ?? "Unknown"}
                        </span>
                      </td>

                      <td className="p-3">
                        {assignment.documents_url ? (
                          <a
                            href={assignment.documents_url}
                            className="font-medium text-blue-700 underline"
                            target="_blank"
                          >
                            View Docs
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        <a
                          href={`/notary/assignments/${assignment.id}`}
                          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
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