import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../../src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  type?: string;
  start?: string;
  end?: string;
  client?: string;
  status?: string;
  county?: string;
  columns?: string | string[];
  sort?: string;
  direction?: string;
};

type AssignmentRow = {
  id: string;
  borrower_name: string | null;
  control_number: string | null;
  signing_date: string | null;
  signing_time?: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  signing_county?: string | null;
  county?: string | null;
  status: string | null;
  notary_fee: number | string | null;
  client_id: string | null;
  title_company_name?: string | null;
  title_company?: string | null;
  company_name?: string | null;
  client_company?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  signing_type?: string | null;
  loan_type?: string | null;
  product_type?: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name?: string | null;
  business_name?: string | null;
  company?: string | null;
  organization_name?: string | null;
};

const REPORT_TYPES = [
  { value: "assignments", label: "Assignments" },
  { value: "invoices", label: "Invoices - coming next" },
  { value: "mileage", label: "Mileage - coming next" },
  { value: "expenses", label: "Expenses - coming next" },
  { value: "payments", label: "Payments - coming next" },
  { value: "journal", label: "Journal - coming next" },
  { value: "notarial_acts", label: "Notarial Acts - coming next" },
];

const COLUMN_OPTIONS = [
  { key: "client", label: "Client" },
  { key: "assignment", label: "Assignment" },
  { key: "order", label: "Order #" },
  { key: "date", label: "Date" },
  { key: "time", label: "Time" },
  { key: "status", label: "Status" },
  { key: "fee", label: "Fee" },
  { key: "county", label: "County" },
  { key: "type", label: "Signing Type" },
  { key: "location", label: "Location" },
];

const DEFAULT_COLUMNS = ["client", "assignment", "order", "date", "status", "fee", "county"];

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultStartDate() {
  return `${new Date().getFullYear()}-01-01`;
}

function defaultEndDate() {
  return `${new Date().getFullYear()}-12-31`;
}

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0.00";

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numberValue(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function formatTime(time: string | null | undefined) {
  if (!time) return "—";
  const [hours, minutes] = String(time).split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function profileName(profile: ProfileRow | null | undefined) {
  if (!profile) return "—";
  return (
    profile.company_name ||
    profile.business_name ||
    profile.company ||
    profile.organization_name ||
    profile.full_name ||
    profile.email ||
    "—"
  );
}

function assignmentTitle(assignment: AssignmentRow | null | undefined) {
  if (!assignment) return "Assignment";
  return assignment.borrower_name || assignment.control_number || "Assignment";
}

function assignmentCounty(assignment: AssignmentRow) {
  return assignment.signing_county || assignment.county || "—";
}

function assignmentLocation(assignment: AssignmentRow) {
  return (
    [
      assignment.signing_address,
      [assignment.signing_city, assignment.signing_state ?? "IN", assignment.signing_zip]
        .filter(Boolean)
        .join(" "),
    ]
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function assignmentType(assignment: AssignmentRow) {
  return assignment.signing_type || assignment.product_type || assignment.loan_type || "—";
}

function normalizeColumns(value: string | string[] | undefined) {
  if (!value) return DEFAULT_COLUMNS;
  const values = Array.isArray(value) ? value : [value];
  const valid = values.filter((item) => COLUMN_OPTIONS.some((column) => column.key === item));
  return valid.length ? valid : DEFAULT_COLUMNS;
}

function getDirectClientName(assignment: AssignmentRow) {
  return (
    assignment.title_company_name ||
    assignment.title_company ||
    assignment.company_name ||
    assignment.client_company ||
    assignment.client_name ||
    assignment.client_email ||
    ""
  );
}

function sortAssignments(rows: AssignmentRow[], sort: string, direction: string) {
  const multiplier = direction === "asc" ? 1 : -1;
  const copy = [...rows];

  copy.sort((a, b) => {
    let left: string | number = "";
    let right: string | number = "";

    if (sort === "date") {
      left = String(a.signing_date ?? "");
      right = String(b.signing_date ?? "");
    } else if (sort === "fee") {
      left = numberValue(a.notary_fee);
      right = numberValue(b.notary_fee);
    } else if (sort === "status") {
      left = String(a.status ?? "");
      right = String(b.status ?? "");
    } else if (sort === "county") {
      left = assignmentCounty(a);
      right = assignmentCounty(b);
    } else {
      left = assignmentTitle(a);
      right = assignmentTitle(b);
    }

    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * multiplier;
    }

    return String(left).localeCompare(String(right)) * multiplier;
  });

  return copy;
}

async function getCurrentNotary() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "notary" || !profile.is_active) {
    redirect("/login");
  }

  return { supabase, user };
}

export default async function CustomReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const { supabase, user } = await getCurrentNotary();

  const reportType = String(params.type ?? "assignments");
  const start = String(params.start ?? defaultStartDate());
  const end = String(params.end ?? defaultEndDate());
  const selectedClient = String(params.client ?? "all");
  const selectedStatus = String(params.status ?? "all");
  const selectedCounty = String(params.county ?? "all");
  const selectedSort = String(params.sort ?? "date");
  const selectedDirection = String(params.direction ?? "desc");
  const selectedColumns = normalizeColumns(params.columns);
  const hasGenerated = Boolean(params.type || params.start || params.end || params.client || params.status || params.county);

  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("assignments")
    .select("*")
    .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
    .gte("signing_date", start)
    .lte("signing_date", end)
    .order("signing_date", { ascending: false });

  if (assignmentsError) {
    console.error("Custom reports assignment lookup error:", assignmentsError);
  }

  let assignments = (assignmentsData ?? []) as AssignmentRow[];

  const clientIds = Array.from(
    new Set(assignments.map((assignment) => assignment.client_id).filter(Boolean) as string[]),
  );

  const { data: clientProfiles } = clientIds.length
    ? await supabaseAdmin.from("profiles").select("*").in("id", clientIds)
    : { data: [] };

  const clientById = new Map<string, ProfileRow>(
    ((clientProfiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  function resolvedClientName(assignment: AssignmentRow) {
    const fromProfile = assignment.client_id ? profileName(clientById.get(assignment.client_id)) : "";
    if (fromProfile && fromProfile !== "—") return fromProfile;

    const direct = getDirectClientName(assignment);
    if (direct) return direct;

    return assignment.client_id ? "Client Not Found" : "No Client Listed";
  }

  const clientFilterOptions = clientIds.map((clientId) => {
    const assignment = assignments.find((row) => row.client_id === clientId);
    return {
      id: clientId,
      name: assignment ? resolvedClientName(assignment) : profileName(clientById.get(clientId)),
    };
  });

  const countyOptions = Array.from(
    new Set(assignments.map((assignment) => assignmentCounty(assignment)).filter((county) => county && county !== "—")),
  ).sort();

  if (selectedClient !== "all") {
    assignments = assignments.filter((assignment) => assignment.client_id === selectedClient);
  }

  if (selectedStatus !== "all") {
    assignments = assignments.filter(
      (assignment) => String(assignment.status ?? "").toLowerCase() === selectedStatus,
    );
  }

  if (selectedCounty !== "all") {
    assignments = assignments.filter((assignment) => assignmentCounty(assignment) === selectedCounty);
  }

  assignments = sortAssignments(assignments, selectedSort, selectedDirection);

  const totalFees = assignments.reduce((sum, assignment) => sum + numberValue(assignment.notary_fee), 0);
  const completedCount = assignments.filter((assignment) =>
    ["closed", "signing complete"].includes(String(assignment.status ?? "").toLowerCase()),
  ).length;
  const openCount = assignments.length - completedCount;

  function renderCell(columnKey: string, assignment: AssignmentRow) {
    if (columnKey === "client") return resolvedClientName(assignment);
    if (columnKey === "assignment") {
      return (
        <Link href={`/notary/assignments/${assignment.id}`} className="font-black text-blue-700 hover:underline">
          {assignmentTitle(assignment)}
        </Link>
      );
    }
    if (columnKey === "order") return assignment.control_number || "—";
    if (columnKey === "date") return formatDate(assignment.signing_date);
    if (columnKey === "time") return formatTime(assignment.signing_time);
    if (columnKey === "status") return assignment.status || "—";
    if (columnKey === "fee") return money(assignment.notary_fee);
    if (columnKey === "county") return assignmentCounty(assignment);
    if (columnKey === "type") return assignmentType(assignment);
    if (columnKey === "location") return assignmentLocation(assignment);
    return "—";
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm print:hidden">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-100">INS Pro</p>
        <h1 className="mt-1 text-3xl font-black">Custom Reports</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
          Build reports from any INS Pro data you track. Version 1 runs custom Assignment reports.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/notary/dashboard/reports"
            className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-[#0B1F4D] hover:bg-slate-100"
          >
            Back to Reports
          </Link>
          <button
            type="button"
            onClick={undefined}
            className="hidden rounded-xl border border-white/30 px-5 py-3 text-sm font-black text-white"
          >
            Print
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
        <p className="text-xs font-black uppercase tracking-wide text-blue-700">Report Builder</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">Build a Custom Report</h2>

        <form className="mt-6 grid gap-5" action="/notary/dashboard/reports/custom">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Report Type</label>
              <select
                name="type"
                defaultValue={reportType}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value} disabled={type.value !== "assignments"}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Start Date</label>
              <input
                type="date"
                name="start"
                defaultValue={start}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">End Date</label>
              <input
                type="date"
                name="end"
                defaultValue={end}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Client</label>
              <select
                name="client"
                defaultValue={selectedClient}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              >
                <option value="all">All Clients</option>
                {clientFilterOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Status</label>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              >
                <option value="all">All Statuses</option>
                <option value="not confirmed">Not Confirmed</option>
                <option value="confirmed">Confirmed</option>
                <option value="in progress">In Progress</option>
                <option value="signing complete">Signing Complete</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
                <option value="did not sign">Did Not Sign</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">County</label>
              <select
                name="county"
                defaultValue={selectedCounty}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              >
                <option value="all">All Counties</option>
                {countyOptions.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Sort</label>
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <select
                  name="sort"
                  defaultValue={selectedSort}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
                >
                  <option value="date">Date</option>
                  <option value="assignment">Assignment</option>
                  <option value="status">Status</option>
                  <option value="fee">Fee</option>
                  <option value="county">County</option>
                </select>
                <select
                  name="direction"
                  defaultValue={selectedDirection}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900"
                >
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Columns</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {COLUMN_OPTIONS.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="columns"
                    value={column.key}
                    defaultChecked={selectedColumns.includes(column.key)}
                    className="h-4 w-4"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/notary/dashboard/reports/custom"
              className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Reset
            </Link>
            <button
              type="submit"
              className="rounded-xl bg-[#0B1F4D] px-6 py-3 text-sm font-black text-white hover:bg-blue-950"
            >
              Generate Custom Report
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center print:bg-[#0B1F4D] print:text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-700 print:text-blue-100">Custom Assignment Report</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 print:text-white">
              {formatDate(start)} - {formatDate(end)}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 print:text-blue-100">
              {hasGenerated ? "Generated from your INS Pro assignment records." : "Choose filters above, then generate your report."}
            </p>
          </div>

          <button
            type="button"
            onClick={undefined}
            className="hidden rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-black text-white print:hidden"
          >
            Print / Save PDF
          </button>
        </div>

        <div className="grid gap-4 border-b border-slate-200 p-5 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Rows</p>
            <p className="mt-2 text-3xl font-black text-[#0B1F4D]">{assignments.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Total Fees</p>
            <p className="mt-2 text-3xl font-black text-green-700">{money(totalFees)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{completedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Open / Other</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{openCount}</p>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {selectedColumns.map((columnKey) => {
                  const column = COLUMN_OPTIONS.find((item) => item.key === columnKey);
                  return (
                    <th key={columnKey} className="px-4 py-3 font-black">
                      {column?.label || columnKey}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length} className="px-4 py-8 text-center font-semibold text-slate-500">
                    No assignments found for this custom report.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="align-top">
                    {selectedColumns.map((columnKey) => (
                      <td key={`${assignment.id}-${columnKey}`} className="px-4 py-4 font-semibold text-slate-700">
                        {renderCell(columnKey, assignment)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-900 print:hidden">
        Version 1 is intentionally assignments only. Once this works, we add invoices, mileage,
        expenses, payments, journal, CSV export, and saved templates without blowing up the page.
      </section>
    </main>
  );
}
