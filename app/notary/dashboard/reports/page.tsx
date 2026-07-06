import Link from "next/link";
import Script from "next/script";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FEDERAL_MILEAGE_RATE = 0.725;

type SearchParams = {
  range?: string;
  start?: string;
  end?: string;
  client?: string;
  status?: string;
};

type AssignmentRow = {
  id: string;
  borrower_name: string | null;
  control_number: string | null;
  signing_date: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  signing_county?: string | null;
  county?: string | null;
  status: string | null;
  notary_fee: number | string | null;
  signing_type?: string | null;
  loan_type?: string | null;
  product_type?: string | null;
  client_id: string | null;
  created_at: string | null;
};

type InvoiceRow = {
  id: string;
  assignment_id: string | null;
  notary_id: string;
  invoice_number: number | string | null;
  invoice_date: string | null;
  due_date: string | null;
  status: string | null;
  subtotal: number | string | null;
  mileage_total: number | string | null;
  expenses_total: number | string | null;
  payments_total: number | string | null;
  balance_due: number | string | null;
  created_at: string | null;
};

type ExpenseRow = {
  id: string;
  assignment_id: string | null;
  notary_id: string;
  expense_date: string | null;
  category: string | null;
  description: string | null;
  amount: number | string | null;
  vendor: string | null;
  receipt_file_path?: string | null;
  receipt_file_name?: string | null;
  created_at: string | null;
};

type ExpenseReportRow = ExpenseRow & {
  receipt_url: string | null;
  receipt_kind: "image" | "pdf" | "file" | "none";
};

type MileageRow = {
  id: string;
  assignment_id: string | null;
  notary_id: string;
  mileage_date: string | null;
  miles: number | string | null;
  rate: number | string | null;
  amount: number | string | null;
  notes: string | null;
  created_at: string | null;
};

type PaymentRow = {
  id: string;
  assignment_id: string | null;
  invoice_id: string | null;
  notary_id: string;
  payment_date: string | null;
  amount: number | string | null;
  payment_method: string | null;
  reference: string | null;
  created_at: string | null;
};

type JournalEntryRow = {
  id: string;
  assignment_id: string | null;
  notary_id: string;
  journal_date: string | null;
  status: string | null;
  journal_type: string | null;
  completed_at: string | null;
};

type NotarialActRow = {
  id: string;
  assignment_id: string | null;
  notary_id: string;
  act_date: string | null;
  acts_count: number | string | null;
  fee_per_act: number | string | null;
  amount: number | string | null;
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

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfQuarter(date: Date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function endOfQuarter(date: Date) {
  return new Date(
    date.getFullYear(),
    Math.floor(date.getMonth() / 3) * 3 + 3,
    0,
  );
}

function getDateRange(params: SearchParams) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const range = String(params.range ?? "this_year");

  if (range === "custom" && params.start && params.end) {
    return {
      label: `${formatDate(params.start)} - ${formatDate(params.end)}`,
      start: params.start,
      end: params.end,
      range,
    };
  }

  if (range === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      label: "This Month",
      start: inputDate(start),
      end: inputDate(end),
      range,
    };
  }

  if (range === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      label: "Last Month",
      start: inputDate(start),
      end: inputDate(end),
      range,
    };
  }

  if (range === "this_quarter") {
    return {
      label: "This Quarter",
      start: inputDate(startOfQuarter(now)),
      end: inputDate(endOfQuarter(now)),
      range,
    };
  }

  if (range === "last_quarter") {
    const lastQuarterDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return {
      label: "Last Quarter",
      start: inputDate(startOfQuarter(lastQuarterDate)),
      end: inputDate(endOfQuarter(lastQuarterDate)),
      range,
    };
  }

  if (range === "last_year") {
    return {
      label: String(currentYear - 1),
      start: `${currentYear - 1}-01-01`,
      end: `${currentYear - 1}-12-31`,
      range,
    };
  }

  if (range === "all") {
    return {
      label: "All Dates",
      start: "1900-01-01",
      end: "2999-12-31",
      range,
    };
  }

  return {
    label: String(currentYear),
    start: `${currentYear}-01-01`,
    end: `${currentYear}-12-31`,
    range: "this_year",
  };
}

function formatInvoiceNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Draft";
  return `INS-INV-${String(value).padStart(6, "0")}`;
}

function displayStatus(status: string | null | undefined) {
  const clean = String(status ?? "draft").replace(/_/g, " ");
  return clean.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clientName(profile: ProfileRow | null | undefined) {
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

function assignmentLocation(assignment: AssignmentRow | null | undefined) {
  if (!assignment) return "—";
  return (
    [
      assignment.signing_address,
      [
        assignment.signing_city,
        assignment.signing_state ?? "IN",
        assignment.signing_zip,
      ]
        .filter(Boolean)
        .join(" "),
    ]
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function assignmentType(assignment: AssignmentRow | null | undefined) {
  if (!assignment) return "Other";
  return (
    assignment.signing_type ||
    assignment.product_type ||
    assignment.loan_type ||
    "Other"
  );
}

function assignmentCounty(assignment: AssignmentRow | null | undefined) {
  if (!assignment) return "Unknown";
  return assignment.signing_county || assignment.county || "Unknown";
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function statusPill(status: string | null | undefined) {
  const normalized = String(status ?? "draft").toLowerCase();

  if (normalized === "paid") return "bg-green-50 text-green-700 ring-green-200";
  if (normalized === "overdue") return "bg-red-50 text-red-700 ring-red-200";
  if (normalized === "unpaid" || normalized === "sent")
    return "bg-amber-50 text-amber-700 ring-amber-200";
  if (normalized === "not_required")
    return "bg-slate-50 text-slate-700 ring-slate-200";

  return "bg-blue-50 text-blue-700 ring-blue-200";
}

function receiptLabel(expense: ExpenseRow) {
  return (
    expense.receipt_file_name ||
    expense.receipt_file_path ||
    "No receipt attached"
  );
}

function receiptKind(
  path: string | null | undefined,
  name: string | null | undefined,
) {
  const value = String(name || path || "").toLowerCase();

  if (!value) return "none" as const;
  if (
    value.endsWith(".png") ||
    value.endsWith(".jpg") ||
    value.endsWith(".jpeg") ||
    value.endsWith(".webp") ||
    value.endsWith(".gif")
  ) {
    return "image" as const;
  }
  if (value.endsWith(".pdf")) return "pdf" as const;
  return "file" as const;
}

async function buildReceiptUrl(path: string | null | undefined) {
  if (!path) return null;

  const cleanPath = String(path).trim();
  if (!cleanPath) return null;
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://"))
    return cleanPath;

  const bucketAttempts: { bucket: string; objectPath: string }[] = [];
  const parts = cleanPath.split("/").filter(Boolean);

  if (parts.length > 1) {
    bucketAttempts.push({
      bucket: parts[0],
      objectPath: parts.slice(1).join("/"),
    });
  }

  for (const bucket of [
    "assignment-receipts",
    "expense-receipts",
    "receipts",
    "assignment-expenses",
    "notary-receipts",
    "documents",
  ]) {
    bucketAttempts.push({ bucket, objectPath: cleanPath });
  }

  for (const attempt of bucketAttempts) {
    const { data, error } = await supabaseAdmin.storage
      .from(attempt.bucket)
      .createSignedUrl(attempt.objectPath, 60 * 60);

    if (!error && data?.signedUrl) return data.signedUrl;
  }

  return null;
}

function ReceiptAttachment({ expense }: { expense: ExpenseReportRow }) {
  const label = receiptLabel(expense);

  if (!expense.receipt_file_path && !expense.receipt_file_name) {
    return (
      <span className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
        No receipt
      </span>
    );
  }

  if (expense.receipt_url && expense.receipt_kind === "image") {
    return (
      <a
        href={expense.receipt_url}
        target="_blank"
        rel="noreferrer"
        className="block max-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
      >
        <img
          src={expense.receipt_url}
          alt={`Receipt for ${expense.category || "expense"}`}
          className="h-28 w-full rounded-lg object-contain print:h-40"
        />
        <span className="mt-2 block truncate text-xs font-bold text-blue-700">
          {label}
        </span>
      </a>
    );
  }

  if (expense.receipt_url) {
    return (
      <a
        href={expense.receipt_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"
      >
        Open receipt: {label}
      </a>
    );
  }

  return (
    <span className="inline-flex max-w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
      Receipt saved: {label}
    </span>
  );
}

function reportPrintTitle(title: string, rangeLabel: string) {
  return `${title} - ${rangeLabel}`;
}

function Bar({ value, max }: { value: number; max: number }) {
  const width = Math.max(4, Math.min(100, max > 0 ? (value / max) * 100 : 0));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-[#0B1F4D]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const { supabase, user } = await getCurrentNotary();
  const selectedRange = getDateRange(params);
  const selectedClient = String(params.client ?? "all");
  const selectedStatus = String(params.status ?? "all");

  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("assignments")
    .select("*")
    .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
    .gte("signing_date", selectedRange.start)
    .lte("signing_date", selectedRange.end)
    .order("signing_date", { ascending: false });

  if (assignmentsError) {
    console.error("Reports assignments lookup error:", assignmentsError);
  }

  let assignments = (assignmentsData ?? []) as AssignmentRow[];

  if (selectedClient !== "all") {
    assignments = assignments.filter(
      (assignment) => assignment.client_id === selectedClient,
    );
  }

  if (selectedStatus !== "all") {
    assignments = assignments.filter(
      (assignment) =>
        String(assignment.status ?? "").toLowerCase() === selectedStatus,
    );
  }

  const assignmentIds = assignments.map((assignment) => assignment.id);
  const clientIds = Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.client_id)
        .filter(Boolean) as string[],
    ),
  );

  const { data: allClientProfiles } = clientIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, email, company_name, business_name, company, organization_name",
        )
        .in("id", clientIds)
    : { data: [] };

  const clientById = new Map<string, ProfileRow>(
    ((allClientProfiles ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const assignmentById = new Map<string, AssignmentRow>(
    assignments.map((assignment) => [assignment.id, assignment]),
  );

  const invoicesQuery = supabaseAdmin
    .from("assignment_invoices")
    .select("*")
    .eq("notary_id", user.id)
    .order("invoice_date", { ascending: false });

  const { data: allInvoices, error: invoicesError } = await invoicesQuery;

  if (invoicesError) {
    console.error("Reports invoices lookup error:", invoicesError);
  }

  const invoices = ((allInvoices ?? []) as InvoiceRow[]).filter((invoice) => {
    if (!invoice.assignment_id || !assignmentById.has(invoice.assignment_id))
      return false;
    const invoiceDate = String(invoice.invoice_date ?? "").slice(0, 10);
    return (
      invoiceDate >= selectedRange.start && invoiceDate <= selectedRange.end
    );
  });

  const { data: expensesData, error: expensesError } = assignmentIds.length
    ? await supabaseAdmin
        .from("assignment_expenses")
        .select("*")
        .eq("notary_id", user.id)
        .in("assignment_id", assignmentIds)
        .gte("expense_date", selectedRange.start)
        .lte("expense_date", selectedRange.end)
        .order("expense_date", { ascending: false })
    : { data: [], error: null };

  if (expensesError) {
    console.error("Reports expenses lookup error:", expensesError);
  }

  const expenses = (await Promise.all(
    ((expensesData ?? []) as ExpenseRow[]).map(async (expense) => ({
      ...expense,
      receipt_url: await buildReceiptUrl(expense.receipt_file_path),
      receipt_kind: receiptKind(
        expense.receipt_file_path,
        expense.receipt_file_name,
      ),
    })),
  )) satisfies ExpenseReportRow[];

  const { data: mileageData, error: mileageError } = assignmentIds.length
    ? await supabaseAdmin
        .from("assignment_mileage")
        .select("*")
        .eq("notary_id", user.id)
        .in("assignment_id", assignmentIds)
        .gte("mileage_date", selectedRange.start)
        .lte("mileage_date", selectedRange.end)
        .order("mileage_date", { ascending: false })
    : { data: [], error: null };

  if (mileageError) {
    console.error("Reports mileage lookup error:", mileageError);
  }

  const mileage = (mileageData ?? []) as MileageRow[];

  const { data: paymentsData, error: paymentsError } = assignmentIds.length
    ? await supabaseAdmin
        .from("assignment_payments")
        .select("*")
        .eq("notary_id", user.id)
        .in("assignment_id", assignmentIds)
        .gte("payment_date", selectedRange.start)
        .lte("payment_date", selectedRange.end)
        .order("payment_date", { ascending: false })
    : { data: [], error: null };

  if (paymentsError) {
    console.error("Reports payments lookup error:", paymentsError);
  }

  const payments = (paymentsData ?? []) as PaymentRow[];

  const { data: journalData, error: journalError } = assignmentIds.length
    ? await supabaseAdmin
        .from("assignment_journal_entries")
        .select("*")
        .eq("notary_id", user.id)
        .in("assignment_id", assignmentIds)
        .gte("journal_date", selectedRange.start)
        .lte("journal_date", selectedRange.end)
        .order("journal_date", { ascending: false })
    : { data: [], error: null };

  if (journalError) {
    console.error("Reports journal lookup error:", journalError);
  }

  const journalEntries = (journalData ?? []) as JournalEntryRow[];

  const { data: notarialActsData, error: notarialActsError } =
    assignmentIds.length
      ? await supabaseAdmin
          .from("assignment_notarial_acts")
          .select("*")
          .eq("notary_id", user.id)
          .in("assignment_id", assignmentIds)
          .gte("act_date", selectedRange.start)
          .lte("act_date", selectedRange.end)
          .order("act_date", { ascending: false })
      : { data: [], error: null };

  if (notarialActsError) {
    console.error("Reports notarial acts lookup error:", notarialActsError);
  }

  const notarialActs = (notarialActsData ?? []) as NotarialActRow[];

  const totalInvoiced = invoices.reduce(
    (sum, row) => sum + numberValue(row.subtotal),
    0,
  );
  const totalPaid = invoices.reduce(
    (sum, row) => sum + numberValue(row.payments_total),
    0,
  );
  const totalBalance = invoices.reduce(
    (sum, row) => sum + numberValue(row.balance_due),
    0,
  );
  const totalExpenses = expenses.reduce(
    (sum, row) => sum + numberValue(row.amount),
    0,
  );
  const totalMiles = mileage.reduce(
    (sum, row) => sum + numberValue(row.miles),
    0,
  );
  const totalMileageDeduction = mileage.reduce((sum, row) => {
    const storedAmount = numberValue(row.amount);
    if (storedAmount > 0) return sum + storedAmount;
    return (
      sum +
      numberValue(row.miles) * numberValue(row.rate || FEDERAL_MILEAGE_RATE)
    );
  }, 0);
  const totalNotarialActs = notarialActs.reduce(
    (sum, row) => sum + numberValue(row.acts_count),
    0,
  );
  const totalNotarialFees = notarialActs.reduce(
    (sum, row) => sum + numberValue(row.amount),
    0,
  );
  const netIncome = totalInvoiced - totalExpenses - totalMileageDeduction;

  const completedAssignments = assignments.filter((assignment) =>
    ["closed", "signing complete"].includes(
      String(assignment.status ?? "").toLowerCase(),
    ),
  );
  const cancelledAssignments = assignments.filter((assignment) =>
    ["cancelled", "canceled", "did not sign"].includes(
      String(assignment.status ?? "").toLowerCase(),
    ),
  );

  const today = inputDate(new Date());
  const overdueInvoices = invoices.filter((invoice) => {
    const balance = numberValue(invoice.balance_due);
    const status = String(invoice.status ?? "").toLowerCase();
    return (
      balance > 0 &&
      invoice.due_date &&
      invoice.due_date < today &&
      status !== "paid"
    );
  });

  const categoryTotals = new Map<string, number>();
  for (const expense of expenses) {
    const category = expense.category || "Misc.";
    categoryTotals.set(
      category,
      (categoryTotals.get(category) ?? 0) + numberValue(expense.amount),
    );
  }
  categoryTotals.set(
    "Mileage - Personal Auto",
    (categoryTotals.get("Mileage - Personal Auto") ?? 0) +
      totalMileageDeduction,
  );

  const categoryRows = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const maxCategoryAmount = Math.max(
    ...categoryRows.map((row) => row.amount),
    0,
  );

  const clientTotals = new Map<
    string,
    {
      name: string;
      orders: number;
      income: number;
      paid: number;
      balance: number;
      expenses: number;
      miles: number;
    }
  >();

  for (const assignment of assignments) {
    const key = assignment.client_id || "unknown";
    const existing = clientTotals.get(key) ?? {
      name: assignment.client_id
        ? clientName(clientById.get(assignment.client_id))
        : "No Client Listed",
      orders: 0,
      income: 0,
      paid: 0,
      balance: 0,
      expenses: 0,
      miles: 0,
    };

    existing.orders += 1;
    clientTotals.set(key, existing);
  }

  for (const invoice of invoices) {
    const assignment = invoice.assignment_id
      ? assignmentById.get(invoice.assignment_id)
      : null;
    const key = assignment?.client_id || "unknown";
    const existing = clientTotals.get(key) ?? {
      name: assignment?.client_id
        ? clientName(clientById.get(assignment.client_id))
        : "No Client Listed",
      orders: 0,
      income: 0,
      paid: 0,
      balance: 0,
      expenses: 0,
      miles: 0,
    };

    existing.income += numberValue(invoice.subtotal);
    existing.paid += numberValue(invoice.payments_total);
    existing.balance += numberValue(invoice.balance_due);
    clientTotals.set(key, existing);
  }

  for (const expense of expenses) {
    const assignment = expense.assignment_id
      ? assignmentById.get(expense.assignment_id)
      : null;
    const key = assignment?.client_id || "unknown";
    const existing = clientTotals.get(key);
    if (existing) existing.expenses += numberValue(expense.amount);
  }

  for (const row of mileage) {
    const assignment = row.assignment_id
      ? assignmentById.get(row.assignment_id)
      : null;
    const key = assignment?.client_id || "unknown";
    const existing = clientTotals.get(key);
    if (existing) existing.miles += numberValue(row.miles);
  }

  const clientRows = Array.from(clientTotals.values()).sort(
    (a, b) => b.income - a.income,
  );
  const maxClientIncome = Math.max(...clientRows.map((row) => row.income), 0);

  const typeTotals = new Map<string, { count: number; income: number }>();
  for (const assignment of assignments) {
    const key = assignmentType(assignment);
    const existing = typeTotals.get(key) ?? { count: 0, income: 0 };
    existing.count += 1;
    existing.income += invoices
      .filter((invoice) => invoice.assignment_id === assignment.id)
      .reduce((sum, invoice) => sum + numberValue(invoice.subtotal), 0);
    typeTotals.set(key, existing);
  }
  const typeRows = Array.from(typeTotals.entries())
    .map(([type, values]) => ({ type, ...values }))
    .sort((a, b) => b.count - a.count);

  const countyTotals = new Map<
    string,
    { count: number; income: number; miles: number }
  >();
  for (const assignment of assignments) {
    const key = assignmentCounty(assignment);
    const existing = countyTotals.get(key) ?? { count: 0, income: 0, miles: 0 };
    existing.count += 1;
    existing.income += invoices
      .filter((invoice) => invoice.assignment_id === assignment.id)
      .reduce((sum, invoice) => sum + numberValue(invoice.subtotal), 0);
    existing.miles += mileage
      .filter((row) => row.assignment_id === assignment.id)
      .reduce((sum, row) => sum + numberValue(row.miles), 0);
    countyTotals.set(key, existing);
  }
  const countyRows = Array.from(countyTotals.entries())
    .map(([county, values]) => ({ county, ...values }))
    .sort((a, b) => b.income - a.income);

  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(new Date().getFullYear(), index, 1);
    const key = `${date.getFullYear()}-${String(index + 1).padStart(2, "0")}`;
    return {
      key,
      label: date.toLocaleDateString("en-US", { month: "short" }),
      signings: 0,
      income: 0,
      expenses: 0,
      miles: 0,
    };
  });

  for (const assignment of assignments) {
    const key = String(assignment.signing_date ?? "").slice(0, 7);
    const month = months.find((item) => item.key === key);
    if (month) month.signings += 1;
  }

  for (const invoice of invoices) {
    const key = String(invoice.invoice_date ?? "").slice(0, 7);
    const month = months.find((item) => item.key === key);
    if (month) month.income += numberValue(invoice.subtotal);
  }

  for (const expense of expenses) {
    const key = String(expense.expense_date ?? "").slice(0, 7);
    const month = months.find((item) => item.key === key);
    if (month) month.expenses += numberValue(expense.amount);
  }

  for (const row of mileage) {
    const key = String(row.mileage_date ?? "").slice(0, 7);
    const month = months.find((item) => item.key === key);
    if (month) month.miles += numberValue(row.miles);
  }

  const maxMonthlyIncome = Math.max(...months.map((month) => month.income), 1);
  const averageFee = assignments.length
    ? totalInvoiced / assignments.length
    : 0;
  const averageProfitPerSigning = completedAssignments.length
    ? netIncome / completedAssignments.length
    : 0;
  const averageMilesPerSigning = assignments.length
    ? totalMiles / assignments.length
    : 0;

  const reportCards = [
    {
      title: "Profit & Loss",
      description: "Income, expenses, mileage deduction, and net income.",
      href: "#profit-loss",
      printTarget: "profit-loss",
      tag: "Use for taxes",
    },
    {
      title: "Sales Report",
      description: "Client revenue, signing totals, and monthly trends.",
      href: "#sales-report",
      printTarget: "sales-report",
      tag: "Revenue",
    },
    {
      title: "Mileage Report",
      description: "Miles, mileage deduction, and average miles per signing.",
      href: "#mileage-report",
      printTarget: "mileage-report",
      tag: "IRS deduction",
    },
    {
      title: "Invoice Aging",
      description: "Unpaid, overdue, paid, and balance due reporting.",
      href: "#invoice-aging",
      printTarget: "invoice-aging",
      tag: "Collections",
    },
    {
      title: "Expenses Report",
      description: "Expense categories, receipts, vendors, and totals.",
      href: "#expense-report",
      printTarget: "expense-report",
      tag: "Schedule C",
    },
    {
      title: "Journal Report",
      description:
        "Journal entry status, notarial acts, and compliance totals.",
      href: "#journal-report",
      printTarget: "journal-report",
      tag: "Compliance",
    },
    {
      title: "Client Profitability",
      description: "Revenue, expenses, miles, balance, and profit by client.",
      href: "#client-report",
      printTarget: "client-report",
      tag: "Clients",
    },
    {
      title: "Performance Report",
      description: "Assignments, counties, signing types, and averages.",
      href: "#performance-report",
      printTarget: "performance-report",
      tag: "Analytics",
    },
  ];

  return (
    <main className="min-w-0 space-y-6 overflow-x-hidden bg-slate-50 p-3 sm:p-6 print:bg-white print:p-0">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm print:hidden">
        <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-100">
              INS Pro
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Reports
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-100/90">
              Generate business reports from assignments, invoices, mileage,
              expenses, payments, and journal records.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/notary/dashboard"
              className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:bg-slate-100"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Report Filters</h2>
            <p className="mt-1 text-sm text-slate-500">
              Current view:{" "}
              <span className="font-bold text-slate-700">
                {selectedRange.label}
              </span>
            </p>
          </div>

          <form
            className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
            action="/notary/dashboard/reports"
          >
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Date Range
              </label>
              <select
                name="range"
                defaultValue={selectedRange.range}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
              >
                <option value="this_year">This Year</option>
                <option value="last_year">Last Year</option>
                <option value="this_quarter">This Quarter</option>
                <option value="last_quarter">Last Quarter</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="all">All Dates</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Start
              </label>
              <input
                type="date"
                name="start"
                defaultValue={params.start ?? selectedRange.start}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                End
              </label>
              <input
                type="date"
                name="end"
                defaultValue={params.end ?? selectedRange.end}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Client
              </label>
              <select
                name="client"
                defaultValue={selectedClient}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Clients</option>
                {clientIds.map((clientId) => (
                  <option key={clientId} value={clientId}>
                    {clientName(clientById.get(clientId))}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Status
              </label>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
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

            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:justify-end lg:col-span-5">
              <Link
                href="/notary/dashboard/reports"
                className="inline-flex w-full justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Reset
              </Link>
              <button
                type="submit"
                className="inline-flex w-full justify-center rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 sm:w-auto"
              >
                Generate Report
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
        {reportCards.map((card) => (
          <div
            key={card.title}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0B1F4D] hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-black text-slate-950 group-hover:text-[#0B1F4D]">
                {card.title}
              </h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                {card.tag}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {card.description}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a
                href={card.href}
                className="inline-flex w-full justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                View
              </a>
              <button
                type="button"
                data-print-target={card.printTarget}
                className="inline-flex w-full justify-center rounded-xl bg-[#0B1F4D] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 sm:w-auto"
              >
                Print
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6 print:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Assignments
          </p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl text-[#0B1F4D]">
            {assignments.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Invoiced
          </p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl text-slate-950">
            {money(totalInvoiced)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">Paid</p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl text-green-700">
            {money(totalPaid)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Expenses
          </p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl text-red-700">
            {money(totalExpenses)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Mileage
          </p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl text-slate-950">
            {totalMiles.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Net Income
          </p>
          <p
            className={`mt-2 text-3xl font-bold sm:text-4xl ${netIncome >= 0 ? "text-green-700" : "text-red-700"}`}
          >
            {money(netIncome)}
          </p>
        </div>
      </section>

      <section
        id="profit-loss"
        data-print-title={reportPrintTitle(
          "Profit & Loss Report",
          selectedRange.label,
        )}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm print:break-inside-avoid"
      >
        <div className="border-b border-slate-200 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Profit & Loss
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Profit & Loss Report
          </h2>
          <p className="mt-1 text-sm text-slate-500">{selectedRange.label}</p>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-lg font-black text-slate-950">
                <span>Total Income</span>
                <span>{money(totalInvoiced)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Signings</span>
                <span>{money(totalInvoiced)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Payments Received</span>
                <span>{money(totalPaid)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Open Balance</span>
                <span>{money(totalBalance)}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-lg font-black text-slate-950">
                <span>Total Expenses</span>
                <span>{money(totalExpenses + totalMileageDeduction)}</span>
              </div>
              {categoryRows.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No expenses found for this filter.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {categoryRows.map((row) => {
                    const matchingExpenses = expenses.filter(
                      (expense) =>
                        (expense.category || "Misc.") === row.category,
                    );
                    const isMileageCategory =
                      row.category === "Mileage - Personal Auto";

                    return (
                      <details
                        key={row.category}
                        open
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <summary className="cursor-pointer list-none">
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-slate-800">
                            <span className="min-w-0 truncate">
                              {row.category}
                            </span>
                            <span className="shrink-0">
                              {money(row.amount)}
                            </span>
                          </div>
                          <Bar value={row.amount} max={maxCategoryAmount} />
                          <p className="mt-2 text-xs font-semibold text-blue-700 print:hidden">
                            View transaction detail
                          </p>
                        </summary>

                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                          {isMileageCategory ? (
                            mileage.length === 0 ? (
                              <p className="p-3 text-xs font-semibold text-slate-500">
                                No mileage entries attached to this report.
                              </p>
                            ) : (
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 uppercase text-slate-500">
                                  <tr>
                                    <th className="px-3 py-2 font-bold">
                                      Date
                                    </th>
                                    <th className="px-3 py-2 font-bold">
                                      Assignment
                                    </th>
                                    <th className="px-3 py-2 text-right font-bold">
                                      Miles
                                    </th>
                                    <th className="px-3 py-2 text-right font-bold">
                                      Deduction
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {mileage.map((entry) => {
                                    const assignment = entry.assignment_id
                                      ? assignmentById.get(entry.assignment_id)
                                      : null;

                                    return (
                                      <tr key={`pl-mileage-${entry.id}`}>
                                        <td className="px-3 py-2 font-semibold text-slate-700">
                                          {formatDate(entry.mileage_date)}
                                        </td>
                                        <td className="px-3 py-2">
                                          <p className="font-bold text-slate-900">
                                            {assignmentTitle(assignment)}
                                          </p>
                                          <p className="text-slate-500">
                                            {assignment?.control_number || "—"}
                                          </p>
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                                          {numberValue(entry.miles).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-black text-green-700">
                                          {money(
                                            entry.amount ||
                                              numberValue(entry.miles) *
                                                numberValue(
                                                  entry.rate ||
                                                    FEDERAL_MILEAGE_RATE,
                                                ),
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )
                          ) : matchingExpenses.length === 0 ? (
                            <p className="p-3 text-xs font-semibold text-slate-500">
                              No transactions listed under this category.
                            </p>
                          ) : (
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 uppercase text-slate-500">
                                <tr>
                                  <th className="px-3 py-2 font-bold">Date</th>
                                  <th className="px-3 py-2 font-bold">
                                    Vendor
                                  </th>
                                  <th className="px-3 py-2 font-bold">Notes</th>
                                  <th className="px-3 py-2 font-bold">
                                    Receipt
                                  </th>
                                  <th className="px-3 py-2 text-right font-bold">
                                    Amount
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {matchingExpenses.map((expense) => (
                                  <tr key={`pl-expense-${expense.id}`}>
                                    <td className="px-3 py-2 font-semibold text-slate-700">
                                      {formatDate(expense.expense_date)}
                                    </td>
                                    <td className="px-3 py-2 font-semibold text-slate-900">
                                      {expense.vendor || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">
                                      {expense.description || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">
                                      <ReceiptAttachment expense={expense} />
                                    </td>
                                    <td className="px-3 py-2 text-right font-black text-slate-950">
                                      {money(expense.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-lg font-black text-slate-950">
                <span>Net Income</span>
                <span
                  className={netIncome >= 0 ? "text-green-700" : "text-red-700"}
                >
                  {money(netIncome)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Notarial Fees Value</span>
                <span>{money(totalNotarialFees)}</span>
              </div>
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
                Notarial fee handling can be tax-sensitive. This report
                separates notarial act value from signing income so you can
                review it with your tax professional.
              </p>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-950">Tax Snapshot</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3 font-bold text-slate-700 ring-1 ring-slate-200">
                <span>Mileage Deduction</span>
                <span>{money(totalMileageDeduction)}</span>
              </div>
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3 font-bold text-slate-700 ring-1 ring-slate-200">
                <span>Business Miles</span>
                <span>{totalMiles.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3 font-bold text-slate-700 ring-1 ring-slate-200">
                <span>Expense Entries</span>
                <span>{expenses.length}</span>
              </div>
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3 font-bold text-slate-700 ring-1 ring-slate-200">
                <span>Receipts</span>
                <span>
                  {
                    expenses.filter(
                      (row) => row.receipt_file_path || row.receipt_file_name,
                    ).length
                  }
                </span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section
        id="sales-report"
        data-print-title={reportPrintTitle("Sales Report", selectedRange.label)}
        className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]"
      >
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Sales Report
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Client Revenue
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Revenue, orders, payment status, and estimated client
              profitability.
            </p>
          </div>

          <div className="w-full overflow-hidden">
            <table className="w-full min-w-0 table-fixed text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="hidden px-2 py-3 font-bold md:table-cell md:px-5">
                    Client
                  </th>
                  <th className="px-2 py-3 sm:px-5 text-right font-bold">
                    Orders
                  </th>
                  <th className="px-2 py-3 sm:px-5 text-right font-bold">
                    Revenue
                  </th>
                  <th className="hidden px-2 py-3 text-right font-bold md:table-cell md:px-5">
                    Paid
                  </th>
                  <th className="hidden px-2 py-3 text-right font-bold sm:table-cell sm:px-5">
                    Balance
                  </th>
                  <th className="px-2 py-3 sm:px-5 text-right font-bold">
                    Miles
                  </th>
                  <th className="px-2 py-3 sm:px-5 font-bold">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clientRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-2 py-8 sm:px-5 text-center text-sm font-semibold text-slate-500"
                    >
                      No client revenue found for this filter.
                    </td>
                  </tr>
                ) : (
                  clientRows.map((row) => (
                    <tr key={row.name}>
                      <td className="px-2 py-4 sm:px-5 font-bold text-slate-950">
                        {row.name}
                      </td>
                      <td className="px-2 py-4 sm:px-5 text-right font-semibold text-slate-700">
                        {row.orders}
                      </td>
                      <td className="px-2 py-4 sm:px-5 text-right font-black text-slate-950">
                        {money(row.income)}
                      </td>
                      <td className="px-2 py-4 sm:px-5 text-right font-bold text-green-700">
                        {money(row.paid)}
                      </td>
                      <td className="px-2 py-4 sm:px-5 text-right font-bold text-amber-700">
                        {money(row.balance)}
                      </td>
                      <td className="px-2 py-4 sm:px-5 text-right font-semibold text-slate-700">
                        {row.miles.toFixed(2)}
                      </td>
                      <td className="px-2 py-4 sm:px-5">
                        <Bar value={row.income} max={maxClientIncome} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Monthly Trends
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Income by Month
          </h2>
          <div className="mt-6 w-full overflow-hidden pb-2">
            <div className="grid w-full grid-cols-12 items-end gap-1 sm:gap-2">
              {months.map((month) => (
                <div
                  key={month.key}
                  className="flex min-h-[170px] min-w-0 flex-col justify-end gap-1 text-center sm:min-h-48"
                >
                  <p className="truncate text-[8px] font-semibold text-slate-500 sm:text-[10px] sm:font-bold">
                    {money(month.income).replace(".00", "")}
                  </p>
                  <div
                    className="mx-auto w-full max-w-8 rounded-t-lg bg-blue-600"
                    style={{
                      height: `${Math.max(6, (month.income / maxMonthlyIncome) * 160)}px`,
                    }}
                  />
                  <p className="truncate text-[9px] font-bold text-slate-500 sm:text-xs">
                    {month.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section
        id="mileage-report"
        data-print-title={reportPrintTitle(
          "Mileage Report",
          selectedRange.label,
        )}
        className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Mileage Report
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Mileage Summary
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Business Miles
              </p>
              <p className="mt-2 text-3xl font-black text-[#0B1F4D]">
                {totalMiles.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Deduction
              </p>
              <p className="mt-2 text-3xl font-black text-green-700">
                {money(totalMileageDeduction)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Trips Logged
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {mileage.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Avg Miles / Signing
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {averageMilesPerSigning.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-800">
            Current mileage rate used in INS Pro: $
            {FEDERAL_MILEAGE_RATE.toFixed(3)} per mile.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-black text-slate-950">
              Mileage Entries
            </h2>
          </div>
          <div className="w-full overflow-hidden">
            <table className="w-full min-w-0 table-fixed text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-3 sm:px-5 font-bold">Date</th>
                  <th className="px-2 py-3 font-bold sm:px-5">Assignment</th>
                  <th className="px-2 py-3 sm:px-5 text-right font-bold">
                    Miles
                  </th>
                  <th className="hidden px-2 py-3 text-right font-bold sm:table-cell sm:px-5">
                    Rate
                  </th>
                  <th className="px-2 py-3 sm:px-5 text-right font-bold">
                    Deduction
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mileage.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-8 sm:px-5 text-center font-semibold text-slate-500"
                    >
                      No mileage found.
                    </td>
                  </tr>
                ) : (
                  mileage.map((row) => {
                    const assignment = row.assignment_id
                      ? assignmentById.get(row.assignment_id)
                      : null;
                    return (
                      <tr key={row.id}>
                        <td className="px-2 py-4 sm:px-5 font-semibold text-slate-700">
                          {formatDate(row.mileage_date)}
                        </td>
                        <td className="px-2 py-4 sm:px-5">
                          <p className="font-bold text-slate-950">
                            {assignmentTitle(assignment)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {assignment?.control_number || "—"}
                          </p>
                        </td>
                        <td className="px-2 py-4 sm:px-5 text-right font-bold text-slate-950">
                          {numberValue(row.miles).toFixed(2)}
                        </td>
                        <td className="hidden px-2 py-4 text-right font-semibold text-slate-700 sm:table-cell sm:px-5">
                          $
                          {numberValue(
                            row.rate || FEDERAL_MILEAGE_RATE,
                          ).toFixed(3)}
                        </td>
                        <td className="px-2 py-4 sm:px-5 text-right font-black text-green-700">
                          {money(
                            row.amount ||
                              numberValue(row.miles) *
                                numberValue(row.rate || FEDERAL_MILEAGE_RATE),
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        id="invoice-aging"
        data-print-title={reportPrintTitle(
          "Invoice Aging Report",
          selectedRange.label,
        )}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Invoice Aging
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Invoices & Payments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Paid:{" "}
            {
              invoices.filter(
                (row) => String(row.status ?? "").toLowerCase() === "paid",
              ).length
            }
            . Open:{" "}
            {invoices.length -
              invoices.filter(
                (row) => String(row.status ?? "").toLowerCase() === "paid",
              ).length}
            . Overdue: {overdueInvoices.length}.
          </p>
        </div>
        <div className="w-full overflow-hidden">
          <table className="w-full min-w-0 table-fixed text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-3 sm:px-5 font-bold">Invoice</th>
                <th className="px-2 py-3 font-bold sm:px-5">Assignment</th>
                <th className="hidden px-2 py-3 font-bold md:table-cell md:px-5">
                  Client
                </th>
                <th className="hidden px-2 py-3 font-bold sm:table-cell sm:px-5">
                  Due
                </th>
                <th className="px-2 py-3 sm:px-5 text-right font-bold">
                  Total
                </th>
                <th className="hidden px-2 py-3 text-right font-bold md:table-cell md:px-5">
                  Paid
                </th>
                <th className="hidden px-2 py-3 text-right font-bold sm:table-cell sm:px-5">
                  Balance
                </th>
                <th className="hidden px-2 py-3 font-bold lg:table-cell lg:px-5">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-2 py-8 sm:px-5 text-center font-semibold text-slate-500"
                  >
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const assignment = invoice.assignment_id
                    ? assignmentById.get(invoice.assignment_id)
                    : null;
                  const client = assignment?.client_id
                    ? clientById.get(assignment.client_id)
                    : null;
                  return (
                    <tr key={invoice.id}>
                      <td className="px-2 py-4 sm:px-5 font-bold text-slate-950">
                        {formatInvoiceNumber(invoice.invoice_number)}
                      </td>
                      <td className="px-2 py-4 sm:px-5">
                        <p className="font-bold text-slate-950">
                          {assignmentTitle(assignment)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {assignment?.control_number || "—"}
                        </p>
                      </td>
                      <td className="hidden px-2 py-4 font-semibold text-slate-700 md:table-cell md:px-5">
                        {clientName(client)}
                      </td>
                      <td className="hidden px-2 py-4 font-semibold text-slate-700 sm:table-cell sm:px-5">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-2 py-4 sm:px-5 text-right font-black text-slate-950">
                        {money(invoice.subtotal)}
                      </td>
                      <td className="hidden px-2 py-4 text-right font-bold text-green-700 md:table-cell md:px-5">
                        {money(invoice.payments_total)}
                      </td>
                      <td className="hidden px-2 py-4 text-right font-bold text-amber-700 sm:table-cell sm:px-5">
                        {money(invoice.balance_due)}
                      </td>
                      <td className="hidden px-2 py-4 lg:table-cell lg:px-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusPill(invoice.status)}`}
                        >
                          {displayStatus(invoice.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="expense-report"
        data-print-title={reportPrintTitle(
          "Expense Report",
          selectedRange.label,
        )}
        className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]"
      >
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Expense Report
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Recent Expenses
            </h2>
          </div>
          <div className="w-full overflow-hidden">
            <table className="w-full min-w-0 table-fixed text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-3 sm:px-5 font-bold">Date</th>
                  <th className="px-2 py-3 sm:px-5 font-bold">Category</th>
                  <th className="px-2 py-3 font-bold sm:px-5">Vendor</th>
                  <th className="px-2 py-3 font-bold sm:px-5">Assignment</th>
                  <th className="px-2 py-3 sm:px-5 text-right font-bold">
                    Amount
                  </th>
                  <th className="hidden px-2 py-3 font-bold sm:table-cell sm:px-5">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {expenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-2 py-8 sm:px-5 text-center font-semibold text-slate-500"
                    >
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => {
                    const assignment = expense.assignment_id
                      ? assignmentById.get(expense.assignment_id)
                      : null;
                    return (
                      <tr key={expense.id}>
                        <td className="px-2 py-4 sm:px-5 font-semibold text-slate-700">
                          {formatDate(expense.expense_date)}
                        </td>
                        <td className="px-2 py-4 sm:px-5 font-bold text-slate-950">
                          {expense.category || "Misc."}
                        </td>
                        <td className="px-2 py-4 sm:px-5">
                          <p className="font-semibold text-slate-700">
                            {expense.vendor || expense.description || "Expense"}
                          </p>
                          {expense.description && (
                            <p className="mt-1 text-xs text-slate-500">
                              {expense.description}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-4 sm:px-5 font-semibold text-slate-700">
                          {assignmentTitle(assignment)}
                        </td>
                        <td className="px-2 py-4 sm:px-5 text-right font-black text-slate-950">
                          {money(expense.amount)}
                        </td>
                        <td className="hidden px-2 py-4 sm:table-cell sm:px-5">
                          <ReceiptAttachment expense={expense} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Category Breakdown
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Where Money Went
          </h2>
          <div className="mt-5 space-y-4">
            {categoryRows.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">
                No categories yet.
              </p>
            ) : (
              categoryRows.map((row) => (
                <div key={row.category}>
                  <div className="mb-1 flex justify-between gap-3 text-sm font-bold text-slate-700">
                    <span className="truncate">{row.category}</span>
                    <span>{money(row.amount)}</span>
                  </div>
                  <Bar value={row.amount} max={maxCategoryAmount} />
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      <section
        id="journal-report"
        data-print-title={reportPrintTitle(
          "Journal Report",
          selectedRange.label,
        )}
        className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Journal Report
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Compliance Summary
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Journal Entries
              </p>
              <p className="mt-2 text-3xl font-black text-[#0B1F4D]">
                {journalEntries.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Completed
              </p>
              <p className="mt-2 text-3xl font-black text-green-700">
                {
                  journalEntries.filter(
                    (row) =>
                      String(row.status ?? "").toLowerCase() === "completed",
                  ).length
                }
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Notarial Acts
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {totalNotarialActs}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Act Value
              </p>
              <p className="mt-2 text-3xl font-black text-green-700">
                {money(totalNotarialFees)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-black text-slate-950">
              Journal Entries
            </h2>
          </div>
          <div className="w-full overflow-hidden">
            <table className="w-full min-w-0 table-fixed text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-3 sm:px-5 font-bold">Date</th>
                  <th className="px-2 py-3 font-bold sm:px-5">Assignment</th>
                  <th className="px-2 py-3 sm:px-5 font-bold">Type</th>
                  <th className="hidden px-2 py-3 font-bold lg:table-cell lg:px-5">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {journalEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-8 sm:px-5 text-center font-semibold text-slate-500"
                    >
                      No journal entries found.
                    </td>
                  </tr>
                ) : (
                  journalEntries.map((entry) => {
                    const assignment = entry.assignment_id
                      ? assignmentById.get(entry.assignment_id)
                      : null;
                    return (
                      <tr key={entry.id}>
                        <td className="px-2 py-4 sm:px-5 font-semibold text-slate-700">
                          {formatDate(entry.journal_date)}
                        </td>
                        <td className="px-2 py-4 sm:px-5">
                          <p className="font-bold text-slate-950">
                            {assignmentTitle(assignment)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {assignment?.control_number || "—"}
                          </p>
                        </td>
                        <td className="px-2 py-4 sm:px-5 font-semibold text-slate-700">
                          {entry.journal_type || "—"}
                        </td>
                        <td className="px-2 py-4 sm:px-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${String(entry.status ?? "").toLowerCase() === "completed" ? "bg-green-50 text-green-700 ring-green-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}
                          >
                            {displayStatus(entry.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        id="client-report"
        data-print-title={reportPrintTitle(
          "Client Profitability Report",
          selectedRange.label,
        )}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Client Profitability
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Client Performance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            This shows which clients are actually worth your time. Revenue
            without profit is just busywork wearing a tie.
          </p>
        </div>

        <div className="block divide-y divide-slate-200 md:hidden">
          {clientRows.length === 0 ? (
            <div className="p-6 text-center text-sm font-semibold text-slate-500">
              No client performance data found.
            </div>
          ) : (
            clientRows.map((row) => {
              const clientMileageDeduction = row.miles * FEDERAL_MILEAGE_RATE;
              const profit = row.income - row.expenses - clientMileageDeduction;

              return (
                <article key={`mobile-profit-${row.name}`} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">
                        {row.name}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {row.orders} orders
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Est. Profit
                      </p>
                      <p
                        className={`mt-1 text-lg font-black ${profit >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {money(profit)}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-bold uppercase text-slate-500">
                        Revenue
                      </dt>
                      <dd className="mt-1 font-black text-slate-950">
                        {money(row.income)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-bold uppercase text-slate-500">
                        Expenses
                      </dt>
                      <dd className="mt-1 font-black text-red-700">
                        {money(row.expenses)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-bold uppercase text-slate-500">
                        Mileage
                      </dt>
                      <dd className="mt-1 font-black text-slate-950">
                        {row.miles.toFixed(2)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                      <dt className="text-xs font-bold uppercase text-slate-500">
                        Balance
                      </dt>
                      <dd className="mt-1 font-black text-amber-700">
                        {money(row.balance)}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })
          )}
        </div>

        <div className="hidden w-full overflow-hidden md:block">
          <table className="w-full min-w-0 table-fixed text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="w-[24%] px-4 py-3 font-bold">Client</th>
                <th className="w-[10%] px-4 py-3 text-right font-bold">
                  Orders
                </th>
                <th className="w-[14%] px-4 py-3 text-right font-bold">
                  Revenue
                </th>
                <th className="w-[14%] px-4 py-3 text-right font-bold">
                  Expenses
                </th>
                <th className="w-[12%] px-4 py-3 text-right font-bold">
                  Mileage
                </th>
                <th className="w-[12%] px-4 py-3 text-right font-bold">
                  Balance
                </th>
                <th className="w-[14%] px-4 py-3 text-right font-bold">
                  Est. Profit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {clientRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center font-semibold text-slate-500"
                  >
                    No client performance data found.
                  </td>
                </tr>
              ) : (
                clientRows.map((row) => {
                  const clientMileageDeduction =
                    row.miles * FEDERAL_MILEAGE_RATE;
                  const profit =
                    row.income - row.expenses - clientMileageDeduction;
                  return (
                    <tr key={`profit-${row.name}`}>
                      <td className="px-4 py-4 font-bold text-slate-950">
                        <span className="block truncate">{row.name}</span>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-700">
                        {row.orders}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-950">
                        {money(row.income)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-red-700">
                        {money(row.expenses)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-700">
                        {row.miles.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-amber-700">
                        {money(row.balance)}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-black ${profit >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {money(profit)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="performance-report"
        data-print-title={reportPrintTitle(
          "Performance Report",
          selectedRange.label,
        )}
        className="grid gap-6 xl:grid-cols-3"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Performance
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Key Metrics
          </h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between rounded-xl bg-slate-50 p-3 font-bold text-slate-700 ring-1 ring-slate-200">
              <span>Completed</span>
              <span>{completedAssignments.length}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-3 font-bold text-slate-700 ring-1 ring-slate-200">
              <span>Cancelled / Did Not Sign</span>
              <span>{cancelledAssignments.length}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-3 font-bold text-slate-700 ring-1 ring-slate-200">
              <span>Average Fee</span>
              <span>{money(averageFee)}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-3 font-bold text-slate-700 ring-1 ring-slate-200">
              <span>Avg Profit / Completed</span>
              <span>{money(averageProfitPerSigning)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Signing Types
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Type Breakdown
          </h2>
          <div className="mt-5 space-y-4">
            {typeRows.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">
                No signing types found.
              </p>
            ) : (
              typeRows.map((row) => (
                <div key={row.type}>
                  <div className="mb-1 flex justify-between gap-3 text-sm font-bold text-slate-700">
                    <span className="truncate">{row.type}</span>
                    <span>{row.count}</span>
                  </div>
                  <Bar
                    value={row.count}
                    max={Math.max(...typeRows.map((item) => item.count), 1)}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            County Report
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            County Performance
          </h2>
          <div className="mt-5 space-y-4">
            {countyRows.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">
                No county data found.
              </p>
            ) : (
              countyRows.slice(0, 8).map((row) => (
                <div key={row.county}>
                  <div className="mb-1 flex justify-between gap-3 text-sm font-bold text-slate-700">
                    <span className="truncate">{row.county}</span>
                    <span>{money(row.income)}</span>
                  </div>
                  <p className="mb-1 text-xs font-semibold text-slate-500">
                    {row.count} assignments • {row.miles.toFixed(2)} miles
                  </p>
                  <Bar
                    value={row.income}
                    max={Math.max(...countyRows.map((item) => item.income), 1)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <Script
        id="ins-pro-report-printing"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              function escapeHtml(value) {
                return String(value || '')
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#039;');
              }

              function cleanClone(clone) {
                clone.querySelectorAll('button, a[href^="#"], [data-print-remove]').forEach(function (node) {
                  node.remove();
                });

                clone.querySelectorAll('details').forEach(function (node) {
                  node.setAttribute('open', 'open');
                });

                clone.querySelectorAll('a').forEach(function (link) {
                  if (link.href && link.textContent && !link.textContent.includes('http')) {
                    link.setAttribute('data-print-url', link.href);
                  }
                });

                clone.querySelectorAll('img').forEach(function (img) {
                  img.setAttribute('loading', 'eager');
                  img.setAttribute('decoding', 'sync');
                });

                return clone;
              }

              function receiptPageHtml(clone) {
                var receiptLinks = Array.from(clone.querySelectorAll('a[href]')).filter(function (link) {
                  var text = (link.textContent || '').toLowerCase();
                  var href = (link.getAttribute('href') || '').toLowerCase();
                  return text.includes('receipt') || href.includes('receipt') || href.includes('storage') || link.querySelector('img');
                });

                if (!receiptLinks.length) return '';

                var seen = {};
                var cards = receiptLinks.map(function (link) {
                  var href = link.getAttribute('href') || '';
                  if (!href || seen[href]) return '';
                  seen[href] = true;

                  var image = link.querySelector('img');
                  var label = (link.textContent || 'Receipt attachment').trim();
                  var lowerHref = href.toLowerCase();
                  var isImage = image || /\.(png|jpg|jpeg|webp|gif)(\?|#|$)/.test(lowerHref);
                  var isPdf = /\.pdf(\?|#|$)/.test(lowerHref) || label.toLowerCase().includes('.pdf');

                  var preview = '';
                  if (isImage) {
                    var imageSrc = image ? (image.getAttribute('src') || href) : href;
                    preview = '<img class="receipt-image" src="' + escapeHtml(imageSrc) + '" alt="Receipt preview" />';
                  } else if (isPdf) {
                    preview = '<object class="receipt-object" data="' + escapeHtml(href) + '#toolbar=0&navpanes=0&scrollbar=1" type="application/pdf"><iframe class="receipt-object" src="' + escapeHtml(href) + '#toolbar=0&navpanes=0&scrollbar=1"></iframe><div class="receipt-fallback">PDF receipt attached<br><span>' + escapeHtml(label) + '</span></div></object>';
                  } else {
                    preview = '<iframe class="receipt-object" src="' + escapeHtml(href) + '"></iframe>';
                  }

                  return '<div class="receipt-card"><div class="receipt-preview">' + preview + '</div><div class="receipt-detail"><div class="receipt-label">Receipt Attachment</div><div class="receipt-name">' + escapeHtml(label) + '</div><div class="receipt-note">This attachment is included as supporting documentation for the report transaction above.</div></div></div>';
                }).filter(Boolean).join('');

                if (!cards) return '';

                return '<section class="receipt-pages"><div class="section-heading"><div><div class="eyebrow">Receipts</div><h2>Receipt Attachments</h2><p>Attached receipts are displayed below as source documentation.</p></div></div><div class="receipt-grid">' + cards + '</div></section>';
              }

              function reportStyles() {
                return [
                  '@page{size:letter;margin:.45in .42in .65in .42in;}',
                  'html,body{margin:0;padding:0;background:#eef4f8;color:#101828;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;}',
                  '.print-toolbar{position:sticky;top:0;z-index:9999;background:#0B1F4D;color:white;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 2px 10px rgba(15,23,42,.18);}',
                  '.print-toolbar-title{font-size:14px;font-weight:900;}',
                  '.print-toolbar button{border:0;border-radius:10px;background:white;color:#0B1F4D;padding:10px 16px;font-size:13px;font-weight:900;cursor:pointer;}',
                  'body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
                  '.print-shell{max-width:980px;margin:0 auto;padding:18px 18px 52px;background:#fff;}',
                  '.cover{min-height:520px;border:1px solid #d8e4ef;background:white;border-radius:18px;overflow:hidden;margin-bottom:18px;page-break-after:always;}',
                  '.cover-top{background:#0B1F4D!important;color:white!important;padding:26px 30px;display:flex;align-items:flex-start;justify-content:space-between;gap:24px;}',
                  '.brand{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.16em;color:#93c5fd!important;}',
                  '.cover-title{font-size:32px;line-height:1.05;font-weight:900;margin:8px 0 8px;color:white!important;}',
                  '.cover-subtitle{font-size:13px;line-height:1.5;color:#dbeafe!important;max-width:620px;}',
                  '.meta-box{min-width:190px;border:1px solid rgba(255,255,255,.24);border-radius:14px;padding:12px;background:rgba(255,255,255,.08)!important;font-size:10px;line-height:1.6;color:#eff6ff!important;}',
                  '.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:24px 30px;}',
                  '.summary-card{border:1px solid #d8e4ef;border-radius:14px;padding:14px;background:#f8fafc;}',
                  '.summary-card .label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:#64748b;}',
                  '.summary-card .value{font-size:24px;font-weight:900;color:#0B1F4D;margin-top:6px;}',
                  '.cover-note{margin:0 30px 24px;border-left:5px solid #0B1F4D;background:#f8fafc;padding:14px 16px;font-size:11px;line-height:1.55;color:#334155;}',
                  '.report-page{background:white;border:1px solid #d8e4ef;border-radius:16px;margin:0 0 16px;overflow:hidden;page-break-inside:avoid;}',
                  '.section-heading{background:#f8fafc;border-bottom:1px solid #d8e4ef;padding:15px 18px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start;}',
                  '.eyebrow,.text-xs{font-size:9px!important;text-transform:uppercase!important;letter-spacing:.12em!important;font-weight:900!important;color:#1d4ed8!important;}',
                  'h1,h2,h3{margin:0;color:#0f172a;break-after:avoid;} h2{font-size:22px!important;line-height:1.15!important;margin-top:3px!important;} h3{font-size:15px!important;}',
                  'p{margin:4px 0 0;line-height:1.45;color:#475569;}',
                  '.report-body{padding:16px 18px;}',
                  'section,article,aside,div{box-shadow:none!important;}',
                  'section:not(.cover):not(.receipt-pages){background:white!important;border:1px solid #d8e4ef!important;border-radius:16px!important;margin:0 0 16px!important;overflow:hidden!important;page-break-inside:avoid;}',
                  'section:not(.cover)>div:first-child{background:#f8fafc!important;border-bottom:1px solid #d8e4ef!important;padding:15px 18px!important;}',
                  '.grid{display:block!important}.space-y-6>*+*{margin-top:18px!important}.space-y-4>*+*{margin-top:12px!important}.space-y-3>*+*{margin-top:9px!important}',
                  '.flex,.inline-flex{display:flex!important}.items-center{align-items:center!important}.items-start{align-items:flex-start!important}.justify-between{justify-content:space-between!important}.justify-center{justify-content:center!important}.gap-3{gap:12px!important}.gap-4{gap:16px!important}.shrink-0{flex-shrink:0!important}.min-w-0{min-width:0!important}',
                  '.rounded-2xl,.rounded-xl{border-radius:12px!important}.rounded-full{border-radius:999px!important}',
                  '.ring-1,.border{border:1px solid #d8e4ef!important}.p-5,.p-4,.p-3{padding:12px!important}',
                  '.mt-1{margin-top:3px!important}.mt-2{margin-top:6px!important}.mt-3{margin-top:8px!important}.mt-4{margin-top:10px!important}.mt-5{margin-top:12px!important}.mt-6{margin-top:14px!important}',
                  '.bg-\\[\\#0B1F4D\\],.bg-blue-600{background:#0B1F4D!important;color:white!important}.bg-slate-50{background:#f8fafc!important}.bg-white{background:white!important}.bg-blue-50{background:#eff6ff!important}.bg-green-50{background:#f0fdf4!important}.bg-amber-50{background:#fffbeb!important}.bg-red-50{background:#fef2f2!important}',
                  '.text-green-700{color:#15803d!important}.text-red-700{color:#b91c1c!important}.text-amber-700{color:#b45309!important}.text-blue-700{color:#1d4ed8!important}.text-slate-950{color:#020617!important}.text-slate-900{color:#0f172a!important}.text-slate-700{color:#334155!important}.text-slate-500{color:#64748b!important}',
                  '.font-black{font-weight:900!important}.font-bold{font-weight:700!important}.font-semibold{font-weight:600!important}.text-right{text-align:right!important}.uppercase{text-transform:uppercase!important}',
                  '.truncate{overflow:visible!important;text-overflow:clip!important;white-space:normal!important}',
                  'table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;table-layout:auto!important;margin-top:10px;font-size:9.5px;background:white!important;border:1px solid #d8e4ef!important;border-radius:11px!important;overflow:hidden!important;}',
                  'thead{display:table-header-group;background:#eef4fb!important;} tr{page-break-inside:avoid;} th,td{border-bottom:1px solid #d8e4ef!important;border-right:1px solid #e5edf6!important;padding:7px 8px!important;text-align:left;vertical-align:top;white-space:normal!important;} th:last-child,td:last-child{border-right:0!important;} tbody tr:last-child td{border-bottom:0!important;} th{text-transform:uppercase;font-size:8.5px;color:#334155;font-weight:900;background:#f3f7fb!important;}',
                  'details{page-break-inside:avoid;border:1px solid #d8e4ef!important;border-radius:14px!important;margin:12px 0!important;padding:12px!important;background:#fff!important;} summary{display:block!important;cursor:default!important;list-style:none!important;} summary::-webkit-details-marker{display:none!important;}',
                  '.hidden{display:table-cell!important}.md\\:hidden,.sm\\:hidden{display:none!important}.md\\:table-cell,.sm\\:table-cell,.lg\\:table-cell{display:table-cell!important}',
                  'a{color:#1d4ed8;text-decoration:none;font-weight:800;word-break:break-word;}',
                  'img{max-width:260px!important;max-height:220px!important;object-fit:contain!important;border:1px solid #d8e4ef!important;border-radius:10px!important;background:white!important;padding:5px!important;}',
                  '.receipt-pages{page-break-before:always;background:white;border:1px solid #d8e4ef;border-radius:16px;overflow:hidden;margin-top:18px;}',
                  '.receipt-grid{padding:18px;display:grid;grid-template-columns:1fr;gap:18px;}',
                  '.receipt-card{display:grid;grid-template-columns:minmax(0,1.25fr) 260px;gap:24px;align-items:start;border-bottom:1px solid #d8e4ef;padding-bottom:18px;page-break-inside:avoid;}',
                  '.receipt-card:last-child{border-bottom:0;padding-bottom:0;}',
                  '.receipt-preview{min-height:520px;display:flex;align-items:flex-start;justify-content:center;background:#fff;border:1px solid #e5edf6;border-radius:14px;padding:14px;overflow:hidden;}',
                  '.receipt-image{width:100%!important;max-width:100%!important;max-height:700px!important;object-fit:contain!important;border:0!important;padding:0!important;}',
                  '.receipt-fallback{width:100%;min-height:220px;border:2px dashed #bfdbfe;border-radius:14px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:900;color:#0B1F4D;background:#eff6ff;line-height:1.5;}',
                  '.receipt-fallback span{display:block;margin-top:8px;font-size:10px;color:#475569;font-weight:700;}',
                  '.receipt-detail{padding:8px 0;font-size:11px;line-height:1.55;color:#334155;}',
                  '.receipt-object{width:100%;height:520px;border:0;background:white;border-radius:10px;}',
                  '.receipt-note{font-size:10px;line-height:1.5;color:#475569;margin-top:8px;}',
                  '.receipt-label{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;font-weight:900;}',
                  '.receipt-name{font-size:15px;font-weight:900;color:#0f172a;margin:6px 0 8px;word-break:break-word;}',
                  '.print-disclaimer{margin-top:18px;background:#f8fafc;border:1px solid #d8e4ef;border-radius:14px;padding:14px;font-size:9.5px;line-height:1.45;color:#475569;page-break-inside:avoid;}',
                  '.print-footer{position:fixed;left:.42in;right:.42in;bottom:.18in;background:#0B1F4D;color:white;padding:7px 12px;border-radius:8px;display:flex;justify-content:space-between;font-size:9px;font-weight:800;}',
                  '@media print{.print-toolbar{display:none!important}.print-shell{padding:0 0 34px;max-width:none}.cover{min-height:9.25in}.receipt-card{grid-template-columns:minmax(0,1.35fr) 240px}.receipt-preview{min-height:620px}.receipt-object{height:620px}.print-footer{display:flex}}'
                ].join('');
              }

              function buildCover(title, generatedAt, clone) {
                var statCards = Array.from(document.querySelectorAll('section.grid div.rounded-2xl')).slice(0, 6).map(function (card) {
                  var label = card.querySelector('p:first-child') ? card.querySelector('p:first-child').textContent.trim() : '';
                  var value = card.querySelector('p:nth-child(2)') ? card.querySelector('p:nth-child(2)').textContent.trim() : '';
                  if (!label || !value) return '';
                  return '<div class="summary-card"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + escapeHtml(value) + '</div></div>';
                }).join('');

                return '<section class="cover"><div class="cover-top"><div><div class="brand">Indiana Notary Solutions • INS Pro</div><h1 class="cover-title">' + escapeHtml(title) + '</h1><div class="cover-subtitle">Professional report package with summary totals, transaction detail, source records, receipt previews, and review disclaimer.</div></div><div class="meta-box"><strong>Generated</strong><br>' + escapeHtml(generatedAt) + '<br><br><strong>Report Source</strong><br>INS Pro workspace data</div></div><div class="summary-grid">' + statCards + '</div><div class="cover-note"><strong>Review Required:</strong> Reports are estimates based on data saved in your INS Pro account. Verify totals, classifications, mileage, receipts, and tax treatment before filing taxes or using this report for official purposes.</div></section>';
              }

              function printTarget(targetId) {
                var source = document.getElementById(targetId);
                if (!source) return;

                var title = source.getAttribute('data-print-title') || 'INS Pro Report';
                var clone = cleanClone(source.cloneNode(true));
                clone.classList.add('report-page');

                var printWindow = window.open('', '_blank', 'width=1100,height=850');
                if (!printWindow) {
                  window.print();
                  return;
                }

                var generatedAt = new Date().toLocaleString();
                var receipts = receiptPageHtml(clone);
                var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title><style>' + reportStyles() + '</style></head><body><div class="print-toolbar"><div class="print-toolbar-title">' + escapeHtml(title) + '</div><button type="button" onclick="window.print()">Print / Save PDF</button></div><div class="print-shell">' + buildCover(title, generatedAt, clone) + clone.outerHTML + receipts + '<div class="print-disclaimer"><strong>Report Disclaimer</strong><br><br>The information contained in this report is generated from data entered into the Indiana Notary Solutions platform by you or other authorized users. While Indiana Notary Solutions makes reasonable efforts to accurately calculate totals, summaries, mileage, expenses, invoices, journal activity, and other report data, we do not guarantee the accuracy, completeness, or suitability of any report.<br><br>These reports are provided for informational and business management purposes only and should not be relied upon as accounting, tax, legal, or financial advice.<br><br>It is your responsibility to review and verify all information before using these reports for tax filings, financial statements, audits, regulatory compliance, or any other official purpose.<br><br>Indiana Notary Solutions, LLC shall not be liable for any errors, omissions, inaccurate data entry, calculation discrepancies, lost profits, tax liabilities, penalties, or damages arising from the use of these reports or reliance upon the information contained within them.<br><br>Users are strongly encouraged to consult a qualified CPA, tax professional, or attorney regarding the appropriate use of these records.</div></div><div class="print-footer"><span>Powered by Indiana Notary Solutions PRO</span><span>' + escapeHtml(generatedAt) + '</span></div></body></html>';

                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();

                printWindow.focus();
              }

              document.addEventListener('click', function (event) {
                var button = event.target.closest('[data-print-target]');
                if (!button) return;
                event.preventDefault();
                printTarget(button.getAttribute('data-print-target'));
              });
            })();
          `,
        }}
      />
    </main>
  );
}
