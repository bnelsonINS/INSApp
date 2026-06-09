import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Assignment = {
  id: string;
  control_number: string | null;
  status: string | null;
  borrower_name: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_city: string | null;
  signing_state: string | null;
  notary_fee: number | string | null;
};

const primaryButtonClass =
  "rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950";

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
}

function moneyValue(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isNaN(amount) ? 0 : amount;
}

function formatDate(date: string | null) {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function paymentStatus(status: string | null) {
  if (status === "Closed") return "Paid / Closed";
  if (status === "Signing Complete") return "Pending Payment";
  return "Not Payable Yet";
}

function paymentBadge(status: string | null) {
  if (status === "Closed") return "bg-green-50 text-green-700 ring-green-200";
  if (status === "Signing Complete") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function statusBadge(status: string | null) {
  if (status === "Closed") return "bg-green-50 text-green-700 ring-green-200";
  if (status === "Signing Complete") {
    return "bg-green-50 text-green-700 ring-green-200";
  }
  if (status === "Late") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "Not Confirmed") return "bg-blue-50 text-blue-700 ring-blue-200";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default async function NotaryEarningsPage() {
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
    .order("signing_date", { ascending: false })
    .order("signing_time", { ascending: false });

  const safeAssignments = (assignments ?? []) as Assignment[];

  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const payableAssignments = safeAssignments.filter(
    (assignment) =>
      assignment.status === "Signing Complete" || assignment.status === "Closed"
  );

  const pendingAssignments = safeAssignments.filter(
    (assignment) => assignment.status === "Signing Complete"
  );

  const paidAssignments = safeAssignments.filter(
    (assignment) => assignment.status === "Closed"
  );

  const monthAssignments = paidAssignments.filter((assignment) =>
    assignment.signing_date?.startsWith(currentMonth)
  );

  const yearAssignments = paidAssignments.filter((assignment) =>
    assignment.signing_date?.startsWith(currentYear)
  );

  const pendingTotal = pendingAssignments.reduce(
    (sum, assignment) => sum + moneyValue(assignment.notary_fee),
    0
  );

  const monthTotal = monthAssignments.reduce(
    (sum, assignment) => sum + moneyValue(assignment.notary_fee),
    0
  );

  const yearTotal = yearAssignments.reduce(
    (sum, assignment) => sum + moneyValue(assignment.notary_fee),
    0
  );

  const lifetimeTotal = paidAssignments.reduce(
    (sum, assignment) => sum + moneyValue(assignment.notary_fee),
    0
  );

  const payableTotal = payableAssignments.reduce(
    (sum, assignment) => sum + moneyValue(assignment.notary_fee),
    0
  );

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-medium text-blue-100">Notary Payments</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Earnings
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/90">
            Track completed assignment fees, pending payments, paid work, and
            year-to-date earnings.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 h-1 w-10 rounded-full bg-[#0B1F4D]" />
          <p className="text-sm font-semibold text-slate-600">This Month</p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {formatMoney(monthTotal)}
          </p>
          <p className="mt-2 text-xs text-slate-500">Closed assignments</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 h-1 w-10 rounded-full bg-amber-500" />
          <p className="text-sm font-semibold text-slate-600">
            Pending Payments
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {formatMoney(pendingTotal)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Signing complete, awaiting closeout
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 h-1 w-10 rounded-full bg-green-600" />
          <p className="text-sm font-semibold text-slate-600">Paid YTD</p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {formatMoney(yearTotal)}
          </p>
          <p className="mt-2 text-xs text-slate-500">Closed this year</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 h-1 w-10 rounded-full bg-slate-500" />
          <p className="text-sm font-semibold text-slate-600">
            Lifetime Paid
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {formatMoney(lifetimeTotal)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            All closed assignments
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Payment Breakdown
          </h2>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-semibold text-slate-950">Pending</p>
                <p className="text-sm text-slate-500">
                  {pendingAssignments.length} assignment
                  {pendingAssignments.length === 1 ? "" : "s"}
                </p>
              </div>
              <p className="text-xl font-bold text-slate-950">
                {formatMoney(pendingTotal)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-semibold text-slate-950">Paid / Closed</p>
                <p className="text-sm text-slate-500">
                  {paidAssignments.length} assignment
                  {paidAssignments.length === 1 ? "" : "s"}
                </p>
              </div>
              <p className="text-xl font-bold text-slate-950">
                {formatMoney(lifetimeTotal)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-semibold text-slate-950">Payable Work</p>
                <p className="text-sm text-slate-500">
                  Pending plus paid assignments
                </p>
              </div>
              <p className="text-xl font-bold text-slate-950">
                {formatMoney(payableTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-950">
            How Payments Are Calculated
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-bold text-slate-950">Not Payable Yet</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Assignment has not been closed by the title company or is still
                waiting on payment.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-900">Pending Payment</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                The signing is complete. Indiana Notary Solutions is processing
                your payment after file closeout.
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-bold text-green-900">Paid / Closed</p>
              <p className="mt-2 text-sm leading-6 text-green-800">
                The assignment has been closed and payment has been processed.
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            This page currently calculates earnings from assignment status and
            notary fee. Payment is processed after the title company closes the
            file.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-bold text-slate-950">
            Assignment Earnings
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Every assignment connected to your earnings.
          </p>
        </div>

        {!safeAssignments.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No assignment earnings found yet.
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {safeAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        Control #
                      </p>
                      <p className="mt-1 font-bold text-slate-950">
                        {assignment.control_number ?? "—"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${paymentBadge(
                        assignment.status
                      )}`}
                    >
                      {paymentStatus(assignment.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-500">Signing</p>
                      <p className="font-semibold text-slate-950">
                        {formatDate(assignment.signing_date)}
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
                        {assignment.signing_city ?? "—"},{" "}
                        {assignment.signing_state ?? "IN"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Notary Fee
                      </p>
                      <p className="font-bold text-slate-950">
                        {formatMoney(assignment.notary_fee)}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`/notary/assignments/${assignment.id}`}
                    className={`mt-4 block ${primaryButtonClass}`}
                  >
                    View Assignment
                  </a>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Control #</th>
                    <th className="px-4 py-3 font-bold">Signing Date</th>
                    <th className="px-4 py-3 font-bold">Borrower</th>
                    <th className="px-4 py-3 font-bold">Location</th>
                    <th className="px-4 py-3 font-bold">Assignment Status</th>
                    <th className="px-4 py-3 font-bold">Payment Status</th>
                    <th className="px-4 py-3 font-bold">Notary Fee</th>
                    <th className="px-4 py-3 font-bold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {safeAssignments.map((assignment) => (
                    <tr
                      key={assignment.id}
                      className="transition hover:bg-slate-50"
                    >
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
                        {assignment.signing_city ?? "—"},{" "}
                        {assignment.signing_state ?? "IN"}
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
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${paymentBadge(
                            assignment.status
                          )}`}
                        >
                          {paymentStatus(assignment.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-bold text-slate-950">
                        {formatMoney(assignment.notary_fee)}
                      </td>

                      <td className="px-4 py-4">
                        <a
                          href={`/notary/assignments/${assignment.id}`}
                          className={primaryButtonClass}
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