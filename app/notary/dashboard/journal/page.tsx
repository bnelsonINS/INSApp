import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JournalEntry = {
  id: string;
  assignment_id: string | null;
  notary_id: string;
  journal_date: string | null;
  journal_time: string | null;
  journal_type: string | null;
  location_mode: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string | null;
  notes: string | null;
  completed_at: string | null;
  updated_at: string | null;
  created_at?: string | null;
};

type JournalPerson = {
  id: string;
  journal_entry_id: string;
  assignment_id: string | null;
  notary_id: string;
  person_type: string | null;
  full_name: string | null;
  id_verification_type: string | null;
  id_verified: boolean | null;
  signature_data: string | null;
  signed_at: string | null;
};

type JournalDocument = {
  id: string;
  journal_entry_id: string;
  assignment_id: string | null;
  notary_id: string;
  document_name: string | null;
  notarial_act: string | null;
};

type AssignmentSummary = {
  id: string;
  borrower_name: string | null;
  control_number: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  status: string | null;
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

function formatTime(time: string | null | undefined) {
  if (!time) return "";

  const [hours, minutes] = String(time).split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildLocation(entry: JournalEntry, assignment?: AssignmentSummary) {
  const cityStateZip = [
    entry.city || assignment?.signing_city,
    entry.state || assignment?.signing_state || "IN",
    entry.zip || assignment?.signing_zip,
  ]
    .filter(Boolean)
    .join(" ");

  return [entry.address || assignment?.signing_address, cityStateZip]
    .filter(Boolean)
    .join(", ") || "—";
}

function statusBadge(status: string | null | undefined) {
  const normalized = String(status ?? "open").toLowerCase();

  if (normalized === "completed") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (normalized === "open") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function displayStatus(status: string | null | undefined) {
  const normalized = String(status ?? "open").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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

export default async function JournalPage() {
  const { supabase, user } = await getCurrentNotary();

  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const { data: journalEntries, error: journalError } = await supabase
    .from("assignment_journal_entries")
    .select(
      "id, assignment_id, notary_id, journal_date, journal_time, journal_type, location_mode, address, city, state, zip, status, notes, completed_at, updated_at, created_at"
    )
    .eq("notary_id", user.id)
    .gte("journal_date", startOfYear)
    .lte("journal_date", endOfYear)
    .order("journal_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (journalError) {
    console.error("Journal dashboard lookup error:", journalError);
  }

  const safeJournalEntries = (journalEntries ?? []) as JournalEntry[];

  const journalIds = safeJournalEntries.map((entry) => entry.id);
  const assignmentIds = Array.from(
    new Set(
      safeJournalEntries
        .map((entry) => entry.assignment_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const { data: assignments, error: assignmentsError } = assignmentIds.length
    ? await supabase
        .from("assignments")
        .select(
          "id, borrower_name, control_number, signing_date, signing_time, signing_address, signing_city, signing_state, signing_zip, status"
        )
        .in("id", assignmentIds)
    : { data: [], error: null };

  if (assignmentsError) {
    console.error("Journal dashboard assignment lookup error:", assignmentsError);
  }

  const { data: people, error: peopleError } = journalIds.length
    ? await supabase
        .from("assignment_journal_people")
        .select(
          "id, journal_entry_id, assignment_id, notary_id, person_type, full_name, id_verification_type, id_verified, signature_data, signed_at"
        )
        .eq("notary_id", user.id)
        .in("journal_entry_id", journalIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (peopleError) {
    console.error("Journal people lookup error:", peopleError);
  }

  const { data: documents, error: documentsError } = journalIds.length
    ? await supabase
        .from("assignment_journal_documents")
        .select(
          "id, journal_entry_id, assignment_id, notary_id, document_name, notarial_act"
        )
        .eq("notary_id", user.id)
        .in("journal_entry_id", journalIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (documentsError) {
    console.error("Journal documents lookup error:", documentsError);
  }

  const assignmentById = new Map<string, AssignmentSummary>(
    ((assignments ?? []) as AssignmentSummary[]).map((assignment) => [
      assignment.id,
      assignment,
    ])
  );

  const peopleByJournalId = new Map<string, JournalPerson[]>();
  for (const person of (people ?? []) as JournalPerson[]) {
    const rows = peopleByJournalId.get(person.journal_entry_id) ?? [];
    rows.push(person);
    peopleByJournalId.set(person.journal_entry_id, rows);
  }

  const documentsByJournalId = new Map<string, JournalDocument[]>();
  for (const document of (documents ?? []) as JournalDocument[]) {
    const rows = documentsByJournalId.get(document.journal_entry_id) ?? [];
    rows.push(document);
    documentsByJournalId.set(document.journal_entry_id, rows);
  }

  const completedCount = safeJournalEntries.filter(
    (entry) => String(entry.status ?? "").toLowerCase() === "completed"
  ).length;

  const openCount = safeJournalEntries.length - completedCount;

  const signerCount = ((people ?? []) as JournalPerson[]).filter(
    (person) => String(person.person_type ?? "signer").toLowerCase() === "signer"
  ).length;

  const documentCount = ((documents ?? []) as JournalDocument[]).length;

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-100">
              INS Pro
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Journal
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
              Assignment journal entries, signers, documents, ID verification,
              and completion status in one place.
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
            Journal Entries YTD
          </p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">
            {safeJournalEntries.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Completed
          </p>
          <p className="mt-2 text-4xl font-bold text-green-700">
            {completedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Open
          </p>
          <p className="mt-2 text-4xl font-bold text-amber-600">
            {openCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Signers / Documents
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {signerCount}/{documentCount}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Journal Entries
            </h2>
            <p className="text-sm text-slate-500">
              Showing assignment journal records for {currentYear}. Edit journal
              details from the assignment workspace.
            </p>
          </div>
        </div>

        {journalError ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-red-700">
              Journal entries could not be loaded.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Check the server logs for the Supabase error.
            </p>
          </div>
        ) : !safeJournalEntries.length ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-slate-800">
              No journal entries yet.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Open an assignment and use the INS Pro Journal workspace. Saved
              entries will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Assignment</th>
                  <th className="px-5 py-3 font-bold">Signers</th>
                  <th className="px-5 py-3 font-bold">Documents</th>
                  <th className="px-5 py-3 font-bold">Location</th>
                  <th className="px-5 py-3 text-right font-bold">Status</th>
                  <th className="px-5 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {safeJournalEntries.map((entry) => {
                  const assignment = entry.assignment_id
                    ? assignmentById.get(entry.assignment_id)
                    : undefined;
                  const entryPeople = peopleByJournalId.get(entry.id) ?? [];
                  const entryDocuments = documentsByJournalId.get(entry.id) ?? [];
                  const verifiedPeople = entryPeople.filter((person) => person.id_verified);
                  const signedPeople = entryPeople.filter((person) =>
                    String(person.signature_data ?? "").startsWith("data:image/")
                  );

                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        <p>{formatDate(entry.journal_date || assignment?.signing_date)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTime(entry.journal_time || assignment?.signing_time) || "Time not set"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">
                          {assignment?.borrower_name || "Assignment"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Control # {assignment?.control_number || "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.journal_type || "In-Person"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {entryPeople.length ? (
                          <div className="space-y-2">
                            {entryPeople.slice(0, 3).map((person) => (
                              <div key={person.id}>
                                <p className="font-semibold text-slate-800">
                                  {person.full_name || "Unnamed signer"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {person.id_verified ? "ID verified" : "ID not verified"}
                                  {person.signature_data ? " • Signed" : ""}
                                </p>
                              </div>
                            ))}
                            {entryPeople.length > 3 && (
                              <p className="text-xs font-semibold text-slate-500">
                                +{entryPeople.length - 3} more
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-500">No signers saved</p>
                        )}
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {verifiedPeople.length}/{entryPeople.length} IDs • {signedPeople.length} signatures
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {entryDocuments.length ? (
                          <div className="space-y-1">
                            {entryDocuments.slice(0, 4).map((document) => (
                              <p
                                key={document.id}
                                className="max-w-xs break-words text-xs font-semibold text-slate-700"
                              >
                                {document.document_name || "Document"}
                              </p>
                            ))}
                            {entryDocuments.length > 4 && (
                              <p className="text-xs font-semibold text-slate-500">
                                +{entryDocuments.length - 4} more
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-500">No documents saved</p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-xs break-words font-semibold text-slate-700">
                          {buildLocation(entry, assignment)}
                        </p>
                        {entry.notes && (
                          <p className="mt-2 max-w-xs break-words text-xs text-slate-500">
                            {entry.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge(
                            entry.status
                          )}`}
                        >
                          {displayStatus(entry.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {entry.assignment_id ? (
                          <Link
                            href={`/notary/assignments/${entry.assignment_id}#assignment-workspace`}
                            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            Open Assignment
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">No assignment</span>
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
