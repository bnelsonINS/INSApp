import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InvoiceBase = {
  id: string;
  assignment_id: string | null;
  notary_id: string | null;
  invoice_number: number | string | null;
  invoice_date: string | null;
  due_date: string | null;
  status: string | null;
  subtotal: number | string | null;
  mileage_total: number | string | null;
  expenses_total: number | string | null;
  payments_total: number | string | null;
  balance_due: number | string | null;
  notes: string | null;
  created_at: string | null;
};

type AssignmentRow = Record<string, any> & {
  id: string;
  client_id?: string | null;
  borrower_name?: string | null;
  control_number?: string | null;
  signing_date?: string | null;
  signing_address?: string | null;
  signing_city?: string | null;
  signing_state?: string | null;
  signing_zip?: string | null;
};

type ClientProfile = Record<string, any> & {
  id: string;
  email?: string | null;
  full_name?: string | null;
};

type InvoiceRow = InvoiceBase & {
  assignment: AssignmentRow | null;
  client: ClientProfile | null;
};

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
}

function dateText(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
}

function invoiceNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Draft";
  return `INS-INV-${String(value).padStart(6, "0")}`;
}

function statusLabel(value: string | null | undefined) {
  const status = String(value ?? "draft").toLowerCase();
  if (status === "not_required") return "Not Required";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClass(value: string | null | undefined) {
  const status = String(value ?? "draft").toLowerCase();

  if (status === "paid") return "bg-green-50 text-green-700 ring-green-200";
  if (status === "sent") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "overdue") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "unpaid") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "not_required") return "bg-slate-50 text-slate-700 ring-slate-200";

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function firstTextValue(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text && text !== "—") return text;
  }

  return "—";
}

function assignmentTitle(assignment: AssignmentRow | null) {
  return firstTextValue(assignment?.borrower_name, "Assignment");
}

function clientName(assignment: AssignmentRow | null, client: ClientProfile | null) {
  return firstTextValue(
    assignment?.title_company_name,
    assignment?.title_company,
    assignment?.company_name,
    assignment?.client_name,
    assignment?.client_company,
    assignment?.title_company_contact,
    client?.company_name,
    client?.business_name,
    client?.company,
    client?.organization_name,
    client?.full_name,
    client?.name,
    client?.email,
  );
}

function signingLocation(assignment: AssignmentRow | null) {
  if (!assignment) return "—";

  const cityStateZip = [
    assignment.signing_city,
    assignment.signing_state ?? "IN",
    assignment.signing_zip,
  ]
    .filter(Boolean)
    .join(" ");

  return [assignment.signing_address, cityStateZip].filter(Boolean).join(", ") || "—";
}

export default async function InvoicesPage() {
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

  const { data: rawInvoices, error } = await supabaseAdmin
    .from("assignment_invoices")
    .select(
      "id, assignment_id, notary_id, invoice_number, invoice_date, due_date, status, subtotal, mileage_total, expenses_total, payments_total, balance_due, notes, created_at",
    )
    .eq("notary_id", user.id)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Invoices lookup error:", error);
  }

  const assignmentIds = Array.from(
    new Set(
      (rawInvoices ?? [])
        .map((invoice) => String(invoice.assignment_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  // Use select("*") here on purpose. Your assignments table has had column-name drift
  // across the app. Selecting a missing named column makes Supabase return no rows.
  const { data: assignmentRows, error: assignmentsError } = assignmentIds.length
    ? await supabaseAdmin
        .from("assignments")
        .select("*")
        .in("id", assignmentIds)
    : { data: [], error: null };

  if (assignmentsError) {
    console.error("Invoice assignment lookup error:", assignmentsError);
  }

  const assignmentById = new Map<string, AssignmentRow>(
    ((assignmentRows ?? []) as AssignmentRow[]).map((assignment) => [
      String(assignment.id),
      assignment,
    ]),
  );

  const clientIds = Array.from(
    new Set(
      ((assignmentRows ?? []) as AssignmentRow[])
        .map((assignment) => String(assignment.client_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  const { data: clientRows, error: clientsError } = clientIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select("*")
        .in("id", clientIds)
    : { data: [], error: null };

  if (clientsError) {
    console.error("Invoice client lookup error:", clientsError);
  }

  const clientById = new Map<string, ClientProfile>(
    ((clientRows ?? []) as ClientProfile[]).map((client) => [String(client.id), client]),
  );

  const rows = ((rawInvoices ?? []) as InvoiceBase[]).map((invoice) => {
    const assignment = invoice.assignment_id
      ? assignmentById.get(String(invoice.assignment_id)) ?? null
      : null;

    const client = assignment?.client_id
      ? clientById.get(String(assignment.client_id)) ?? null
      : null;

    return {
      ...invoice,
      assignment,
      client,
    };
  }) as InvoiceRow[];

  const totalInvoiced = rows.reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0);
  const totalPaid = rows.reduce((sum, row) => sum + Number(row.payments_total ?? 0), 0);
  const totalBalance = rows.reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0);

  const unpaidCount = rows.filter((row) => {
    const status = String(row.status ?? "draft").toLowerCase();
    return status === "unpaid" || status === "sent" || Number(row.balance_due ?? 0) > 0;
  }).length;

  const paidCount = rows.filter(
    (row) => String(row.status ?? "").toLowerCase() === "paid",
  ).length;

  const overdueCount = rows.filter((row) => {
    const due = row.due_date ? new Date(`${row.due_date}T00:00:00`) : null;
    const status = String(row.status ?? "draft").toLowerCase();
    return Boolean(due && due < new Date() && status !== "paid" && status !== "not_required");
  }).length;

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-100">
              INS Pro
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Invoices
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
              View invoice records created from assignment workspaces. Payments, balances,
              mileage, and expenses roll up here.
            </p>
          </div>

          <Link
            href="/notary/dashboard"
            className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">Invoices</p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">{rows.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">Invoiced</p>
          <p className="mt-2 text-4xl font-bold text-slate-950">{money(totalInvoiced)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">Paid</p>
          <p className="mt-2 text-4xl font-bold text-green-700">{money(totalPaid)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">Balance Due</p>
          <p className="mt-2 text-4xl font-bold text-amber-700">{money(totalBalance)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">Overdue</p>
          <p className="mt-2 text-4xl font-bold text-red-700">{overdueCount}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Invoice History</h2>
            <p className="text-sm text-slate-500">
              Showing all assignment invoices. Paid: {paidCount}. Open: {unpaidCount}.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
            Source: Assignment Invoices
          </div>
        </div>

        {!rows.length ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-slate-800">No invoices yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              Open an assignment and use the Invoice workspace to create one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Invoice</th>
                  <th className="px-5 py-3 font-bold">Assignment</th>
                  <th className="px-5 py-3 font-bold">Client</th>
                  <th className="px-5 py-3 font-bold">Due</th>
                  <th className="px-5 py-3 text-right font-bold">Invoice</th>
                  <th className="px-5 py-3 text-right font-bold">Paid</th>
                  <th className="px-5 py-3 text-right font-bold">Balance</th>
                  <th className="px-5 py-3 text-right font-bold">Status</th>
                  <th className="px-5 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => {
                  const assignment = row.assignment;
                  const client = row.client;

                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">
                          {invoiceNumber(row.invoice_number)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {dateText(row.invoice_date)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">
                          {assignmentTitle(assignment)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Control # {firstTextValue(assignment?.control_number)}
                        </p>
                        <p className="mt-1 max-w-xs break-words text-xs text-slate-500">
                          {signingLocation(assignment)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-700">
                          {clientName(assignment, client)}
                        </p>
                        {client?.email && (
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {client.email}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {dateText(row.due_date)}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-slate-950">
                        {money(row.subtotal)}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-green-700">
                        {money(row.payments_total)}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-amber-700">
                        {money(row.balance_due)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass(row.status)}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {row.assignment_id ? (
                          <Link
                            href={`/notary/assignments/${row.assignment_id}#assignment-workspace`}
                            className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            Open
                          </Link>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
