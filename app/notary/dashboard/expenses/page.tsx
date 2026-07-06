import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExpenseRow = {
  id: string;
  assignment_id: string | null;
  notary_id: string;
  expense_date: string | null;
  category: string | null;
  description: string | null;
  amount: number | string | null;
  vendor: string | null;
  notes: string | null;
  receipt_file_name?: string | null;
  receipt_file_path?: string | null;
  created_at: string | null;
  assignment?: AssignmentRow | null;
};

type AssignmentRow = {
  id: string;
  borrower_name?: string | null;
  control_number?: string | null;
  signing_date?: string | null;
  signing_address?: string | null;
  signing_city?: string | null;
  signing_state?: string | null;
  signing_zip?: string | null;
  client_id?: string | null;
  title_company_name?: string | null;
  title_company?: string | null;
  company_name?: string | null;
  client_company?: string | null;
  client_name?: string | null;
};

const CATEGORY_ORDER = [
  "Document Printing",
  "Document Shipping",
  "Postage",
  "Parking/Tolls",
  "Office Supplies",
  "Software",
  "Phone/Fax",
  "Insurance",
  "Training",
  "Misc.",
];

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function buildSigningLocation(assignment: AssignmentRow | null | undefined) {
  if (!assignment) return "—";

  const cityStateZip = [
    assignment.signing_city,
    assignment.signing_state,
    assignment.signing_zip,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    [assignment.signing_address, cityStateZip].filter(Boolean).join(", ") || "—"
  );
}

function getAssignmentTitle(assignment: AssignmentRow | null | undefined) {
  return assignment?.borrower_name || "Assignment";
}

function getClientName(assignment: AssignmentRow | null | undefined) {
  return (
    assignment?.title_company_name ||
    assignment?.title_company ||
    assignment?.company_name ||
    assignment?.client_company ||
    assignment?.client_name ||
    "—"
  );
}

function normalizeAssignments(value: unknown): AssignmentRow | null {
  if (Array.isArray(value))
    return (value[0] as AssignmentRow | undefined) ?? null;
  return (value as AssignmentRow | null) ?? null;
}

function categoryBadgeClass(category: string | null | undefined) {
  const normalized = String(category ?? "").toLowerCase();

  if (normalized.includes("print"))
    return "bg-blue-50 text-blue-700 ring-blue-200";
  if (normalized.includes("ship") || normalized.includes("postage")) {
    return "bg-purple-50 text-purple-700 ring-purple-200";
  }
  if (normalized.includes("parking") || normalized.includes("toll")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (normalized.includes("office"))
    return "bg-green-50 text-green-700 ring-green-200";
  if (normalized.includes("software"))
    return "bg-indigo-50 text-indigo-700 ring-indigo-200";

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

export default async function ExpensesPage() {
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

  const { data: rawExpenses, error } = await supabase
    .from("assignment_expenses")
    .select(
      `
        *,
        assignments (*)
      `,
    )
    .eq("notary_id", user.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Expenses lookup error:", error);
  }

  const expenseRows = ((rawExpenses ?? []) as any[]).map((expense) => ({
    ...expense,
    assignment: normalizeAssignments(expense.assignments),
  })) as ExpenseRow[];

  const totalExpenses = expenseRows.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthExpenses = expenseRows
    .filter((row) => String(row.expense_date ?? "").startsWith(currentMonth))
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const receiptCount = expenseRows.filter(
    (row) => row.receipt_file_path,
  ).length;

  const categoryTotals = CATEGORY_ORDER.map((category) => {
    const total = expenseRows
      .filter(
        (row) =>
          String(row.category ?? "").toLowerCase() === category.toLowerCase(),
      )
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    return { category, total };
  }).filter((item) => item.total > 0);

  const uncategorizedTotal = expenseRows
    .filter((row) => {
      const category = String(row.category ?? "").toLowerCase();
      return !CATEGORY_ORDER.some((item) => item.toLowerCase() === category);
    })
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  if (uncategorizedTotal > 0) {
    categoryTotals.push({ category: "Other", total: uncategorizedTotal });
  }

  return (
    <main className="min-w-0 space-y-6 bg-slate-50 p-3 sm:p-4 lg:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-100">
              INS Pro
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Expenses
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-100/90">
              View expense records created from assignment workspaces. Printing,
              shipping, postage, receipts, and business costs roll up here.
            </p>
          </div>

          <Link
            href="/notary/dashboard"
            className="w-full rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:bg-slate-100 sm:w-auto"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Expenses
          </p>
          <p className="mt-2 text-3xl font-bold text-[#0B1F4D] sm:text-4xl">
            {expenseRows.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Total Spent
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
            {formatMoney(totalExpenses)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold uppercase text-slate-500">
            This Month
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
            {formatMoney(thisMonthExpenses)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Receipts
          </p>
          <p className="mt-2 text-3xl font-bold text-green-700 sm:text-4xl">
            {receiptCount}
          </p>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Expense History
              </h2>
              <p className="text-sm text-slate-500">
                Showing all assignment expenses. Add or edit expenses from the
                assignment workspace.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              Source: Assignment Expenses
            </div>
          </div>

          {!expenseRows.length ? (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold text-slate-800">
                No expenses yet.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Open an assignment and use the Expenses workspace to add one.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200 lg:hidden">
                {expenseRows.map((row) => {
                  const assignment = row.assignment;
                  const assignmentHref = assignment?.id
                    ? `/notary/assignments/${assignment.id}#assignment-workspace`
                    : null;

                  return (
                    <article key={row.id} className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-950">
                            {getAssignmentTitle(assignment)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {formatDate(row.expense_date)} • Control #{" "}
                            {assignment?.control_number || "—"}
                          </p>
                        </div>

                        <p className="shrink-0 text-base font-black text-slate-950">
                          {formatMoney(row.amount)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-bold leading-tight ring-1 ${categoryBadgeClass(
                            row.category,
                          )}`}
                        >
                          <span className="min-w-0 truncate">
                            {row.category || "Misc."}
                          </span>
                        </span>

                        {row.receipt_file_name || row.receipt_file_path ? (
                          <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200">
                            Receipt attached
                          </span>
                        ) : null}
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600">
                        <p>
                          <span className="font-bold text-slate-700">
                            Client:
                          </span>{" "}
                          {getClientName(assignment)}
                        </p>
                        <p className="break-words">
                          <span className="font-bold text-slate-700">
                            Location:
                          </span>{" "}
                          {buildSigningLocation(assignment)}
                        </p>
                        <p className="break-words">
                          <span className="font-bold text-slate-700">
                            Vendor:
                          </span>{" "}
                          {row.vendor || row.description || "Expense"}
                        </p>
                        {row.notes && (
                          <p className="break-words text-xs text-slate-500">
                            {row.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end">
                        {assignmentHref ? (
                          <Link
                            href={assignmentHref}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            Open Assignment
                          </Link>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            No assignment link
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Date</th>
                      <th className="px-5 py-3 font-bold">Assignment</th>
                      <th className="px-5 py-3 font-bold">Client</th>
                      <th className="px-5 py-3 font-bold">Category</th>
                      <th className="px-5 py-3 font-bold">Vendor / Notes</th>
                      <th className="px-5 py-3 text-right font-bold">Amount</th>
                      <th className="px-5 py-3 text-right font-bold">
                        Receipt
                      </th>
                      <th className="px-5 py-3 text-right font-bold">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {expenseRows.map((row) => {
                      const assignment = row.assignment;
                      const assignmentHref = assignment?.id
                        ? `/notary/assignments/${assignment.id}#assignment-workspace`
                        : null;

                      return (
                        <tr key={row.id} className="align-top">
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {formatDate(row.expense_date)}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-950">
                              {getAssignmentTitle(assignment)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Control # {assignment?.control_number || "—"}
                            </p>
                            <p className="mt-1 max-w-xs break-words text-xs text-slate-500">
                              {buildSigningLocation(assignment)}
                            </p>
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-700">
                            {getClientName(assignment)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex max-w-[150px] items-center rounded-full px-3 py-1 text-xs font-bold leading-tight ring-1 ${categoryBadgeClass(
                                row.category,
                              )}`}
                              title={row.category || "Misc."}
                            >
                              <span className="truncate">
                                {row.category || "Misc."}
                              </span>
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-700">
                              {row.vendor || row.description || "Expense"}
                            </p>
                            {row.notes && (
                              <p className="mt-1 max-w-sm break-words text-xs text-slate-500">
                                {row.notes}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-bold text-slate-950">
                            {formatMoney(row.amount)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {row.receipt_file_name || row.receipt_file_path ? (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200">
                                Attached
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {assignmentHref ? (
                              <Link
                                href={assignmentHref}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                              >
                                Open
                              </Link>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-xl font-bold text-slate-950">
              Category Breakdown
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Quick view of where your business money is going.
            </p>

            {!categoryTotals.length ? (
              <p className="mt-5 text-sm text-slate-500">
                No category totals yet.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {categoryTotals.map((item) => {
                  const percent =
                    totalExpenses > 0 ? item.total / totalExpenses : 0;

                  return (
                    <div key={item.category} className="min-w-0">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                        <p
                          className="min-w-0 truncate font-bold text-slate-700"
                          title={item.category}
                        >
                          {item.category}
                        </p>
                        <p className="shrink-0 font-black text-slate-950">
                          {formatMoney(item.total)}
                        </p>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#0B1F4D]"
                          style={{ width: `${Math.max(5, percent * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">
              INS Pro Tip
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              Attach receipts from the assignment.
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This page is the roll-up view. Use each assignment&apos;s Expenses
              workspace to add receipts, categories, vendors, and notes.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
