import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FEDERAL_MILEAGE_RATE = 0.725;

type AssignmentMileageRow = {
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

type AssignmentSummary = {
  id: string;
  borrower_name: string | null;
  control_number: string | null;
  signing_date: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
};

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
}

function formatMiles(value: number | string | null | undefined) {
  const miles = Number(value ?? 0);
  if (!Number.isFinite(miles)) return "0.00";
  return miles.toFixed(2);
}

function getMileageAmount(row: AssignmentMileageRow) {
  const savedAmount = Number(row.amount ?? 0);

  if (Number.isFinite(savedAmount) && savedAmount > 0) {
    return savedAmount;
  }

  const miles = Number(row.miles ?? 0);
  const rate = Number(row.rate ?? FEDERAL_MILEAGE_RATE);

  if (!Number.isFinite(miles) || !Number.isFinite(rate)) {
    return 0;
  }

  return miles * rate;
}

function cleanMileageNotes(notes: string | null | undefined): string[] {
  if (!notes) return ["Mileage entry"];

  const cleanedNotes = notes
    .split("|")
    .map((part: string) => part.trim())
    .filter(Boolean);

  return cleanedNotes.length > 0 ? cleanedNotes : ["Mileage entry"];
}

function buildSigningLocation(assignment: AssignmentSummary | undefined) {
  if (!assignment) return "—";

  const cityStateZip = [
    assignment.signing_city,
    assignment.signing_state ?? "IN",
    assignment.signing_zip,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    [assignment.signing_address, cityStateZip].filter(Boolean).join(", ") || "—"
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

export default async function MileagePage() {
  const { supabase, user } = await getCurrentNotary();

  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;
  const thisMonth = new Date().toISOString().slice(0, 7);

  const { data: mileageRows, error: mileageError } = await supabase
    .from("assignment_mileage")
    .select(
      "id, assignment_id, notary_id, mileage_date, miles, rate, amount, notes, created_at"
    )
    .eq("notary_id", user.id)
    .gte("mileage_date", startOfYear)
    .lte("mileage_date", endOfYear)
    .order("mileage_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (mileageError) {
    console.error("Mileage dashboard lookup error:", mileageError);
  }

  const safeMileageRows = (mileageRows ?? []) as AssignmentMileageRow[];

  const assignmentIds = Array.from(
    new Set(
      safeMileageRows
        .map((row) => row.assignment_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const { data: assignments, error: assignmentsError } = assignmentIds.length
    ? await supabase
        .from("assignments")
        .select(
          "id, borrower_name, control_number, signing_date, signing_address, signing_city, signing_state, signing_zip"
        )
        .in("id", assignmentIds)
    : { data: [], error: null };

  if (assignmentsError) {
    console.error("Mileage dashboard assignment lookup error:", assignmentsError);
  }

  const assignmentById = new Map<string, AssignmentSummary>(
    ((assignments ?? []) as AssignmentSummary[]).map((assignment) => [
      assignment.id,
      assignment,
    ])
  );

  const totalMiles = safeMileageRows.reduce(
    (sum, row) => sum + Number(row.miles ?? 0),
    0
  );

  const totalDeduction = safeMileageRows.reduce(
    (sum, row) => sum + getMileageAmount(row),
    0
  );

  const monthMiles = safeMileageRows
    .filter((row) => String(row.mileage_date ?? "").startsWith(thisMonth))
    .reduce((sum, row) => sum + Number(row.miles ?? 0), 0);

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-100">
              INS Pro
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Mileage Tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
              Assignment mileage and Google Maps mileage saved from your INS Pro
              workspace. Current rate: $0.725 per mile.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Business Miles YTD
          </p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">
            {totalMiles.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Estimated Deduction
          </p>
          <p className="mt-2 text-4xl font-bold text-green-700">
            {formatMoney(totalDeduction)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Trips Logged
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {safeMileageRows.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            This Month
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {monthMiles.toFixed(2)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Mileage Entries
            </h2>
            <p className="text-sm text-slate-500">
              Showing assignment mileage for {currentYear}. Add or correct
              mileage from the assignment workspace.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
            Rate: $0.725 / mile
          </div>
        </div>

        {mileageError ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-red-700">
              Mileage could not be loaded.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Check the server logs for the Supabase error.
            </p>
          </div>
        ) : !safeMileageRows.length ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-slate-800">
              No mileage logged yet.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Open an assignment, use the INS Pro Mileage workspace, and the
              saved mileage will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Assignment</th>
                  <th className="px-5 py-3 font-bold">Location / Notes</th>
                  <th className="px-5 py-3 text-right font-bold">Miles</th>
                  <th className="px-5 py-3 text-right font-bold">Rate</th>
                  <th className="px-5 py-3 text-right font-bold">
                    Deduction
                  </th>
                  <th className="px-5 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {safeMileageRows.map((row) => {
                  const assignment = row.assignment_id
                    ? assignmentById.get(row.assignment_id)
                    : undefined;

                  const noteLines = cleanMileageNotes(row.notes);
                  const assignmentHref = row.assignment_id
                    ? `/notary/assignments/${row.assignment_id}#assignment-workspace`
                    : "/notary/assignments";

                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {formatDate(row.mileage_date)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">
                          {assignment?.borrower_name || "Assignment mileage"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Control # {assignment?.control_number || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-700">
                          {buildSigningLocation(assignment)}
                        </p>

                        <div className="mt-2 space-y-1">
                          {noteLines.map((line: string, index: number) => (
                            <p
                              key={`${row.id}-note-${index}`}
                              className="max-w-xl break-words text-xs text-slate-500"
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-slate-950">
                        {formatMiles(row.miles)}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-slate-700">
                        {formatMoney(row.rate)}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-green-700">
                        {formatMoney(getMileageAmount(row))}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={assignmentHref}
                          className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                          Open Assignment
                        </Link>
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
