import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";
import ConfirmAppointmentBox from "./ConfirmAppointmentBox";
import CloseDetailsButton from "./CloseDetailsButton";
import SubmitButton from "../../../components/SubmitButton";
import SignaturePad from "./SignaturePad";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://indiananotarysolutions.com"
  ).replace(/\/$/, "");
}

function buildAdminOrderLink(assignmentId: string) {
  return `${getBaseUrl()}/dashboard/orders/${assignmentId}`;
}

function buildClientOrderLink(assignmentId: string) {
  return `${getBaseUrl()}/login?redirectTo=${encodeURIComponent(
    `/client/dashboard/orders/${assignmentId}`,
  )}`;
}

function formatDate(date: string | null) {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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

function formatActivityDate(date: string | null) {
  if (!date) return "Date unavailable";

  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function calendarDatePart(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function buildCalendarData({
  title,
  date,
  time,
  location,
  description,
}: {
  title: string;
  date: string | null;
  time: string | null;
  location: string;
  description: string;
}) {
  if (!date) return null;

  const [year, month, day] = date.split("-").map(Number);
  const [hours = 9, minutes = 0] = (time || "09:00").split(":").map(Number);

  if (!year || !month || !day) return null;

  const start = new Date(year, month - 1, day, hours, minutes, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const googleDates = `${calendarDatePart(start)}/${calendarDatePart(end)}`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Indiana Notary Solutions//Assignment Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@indiananotarysolutions.com`,
    `DTSTAMP:${calendarDatePart(new Date())}`,
    `DTSTART:${calendarDatePart(start)}`,
    `DTEND:${calendarDatePart(end)}`,
    `SUMMARY:${escapeCalendarText(title)}`,
    `LOCATION:${escapeCalendarText(location)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    googleDates,
    startIso,
    endIso,
    icsHref: `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`,
  };
}

function firstTextValue(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return "—";
}

const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

function extractProfileIdsFromText(value: string | null | undefined) {
  if (!value) return [];

  return Array.from(new Set(value.match(UUID_PATTERN) ?? []));
}

function formatActivityDetails(
  value: string | null | undefined,
  profileNameById: Map<string, string>,
) {
  if (!value) return "—";

  let formatted = value.replace(/"blank"/gi, '"Unassigned"');

  for (const [profileId, displayName] of profileNameById.entries()) {
    formatted = formatted.replaceAll(profileId, displayName);
  }

  return formatted;
}

function statusBadge(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "not confirmed")
    return "bg-yellow-100 text-yellow-800 ring-yellow-200";
  if (normalized === "confirmed")
    return "bg-blue-100 text-blue-800 ring-blue-200";
  if (normalized === "in progress")
    return "bg-purple-100 text-purple-800 ring-purple-200";
  if (normalized === "late") return "bg-red-100 text-red-800 ring-red-200";
  if (normalized === "signing complete")
    return "bg-orange-100 text-orange-800 ring-orange-200";
  if (normalized === "did not sign")
    return "bg-red-100 text-red-800 ring-red-200";
  if (normalized === "closed")
    return "bg-green-100 text-green-800 ring-green-200";
  if (normalized === "cancelled") return "bg-red-100 text-red-800 ring-red-200";

  return "bg-slate-100 text-slate-800 ring-slate-200";
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

function getEstimatedDropDate(signingDate: string | null) {
  if (!signingDate) return null;

  const date = new Date(`${signingDate}T00:00:00`);
  date.setDate(date.getDate() + 1);

  return date.toISOString().split("T")[0];
}

type AssignmentActionData = {
  id: string;
  status: string | null;
  borrower_name: string | null;
  borrower_phone: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
};

function nextAction(
  assignment: AssignmentActionData,
  signingDate: string,
  signingTime: string,
) {
  const normalized = (assignment.status ?? "").toLowerCase();

  if (
    normalized === "assigned" ||
    normalized === "not confirmed" ||
    normalized === "new request"
  ) {
    return (
      <ConfirmAppointmentBox
        assignmentId={assignment.id}
        borrowerName={assignment.borrower_name}
        borrowerPhone={assignment.borrower_phone}
        signingDate={signingDate}
        signingTime={signingTime}
        signingAddress={assignment.signing_address}
        signingCity={assignment.signing_city}
        signingState={assignment.signing_state}
        signingZip={assignment.signing_zip}
      />
    );
  }

  if (normalized === "confirmed") {
    return (
      <form action={`/notary/assignments/${assignment.id}/start`} method="post">
        <button className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950">
          Start Signing
        </button>
      </form>
    );
  }

  if (normalized === "in progress" || normalized === "late") {
    return (
      <a
        href="#upload-documents"
        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
      >
        Upload Documents
      </a>
    );
  }

  return null;
}

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  async function saveJournalPerson(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const personType = String(formData.get("new_person_type") ?? "signer")
      .trim()
      .toLowerCase();
    const fullName = String(formData.get("new_person_name") ?? "").trim();
    const address = String(formData.get("new_person_address") ?? "").trim();
    const city = String(formData.get("new_person_city") ?? "").trim();
    const state = String(formData.get("new_person_state") ?? "IN").trim();
    const zip = String(formData.get("new_person_zip") ?? "").trim();
    const idVerificationType = String(
      formData.get("new_person_verification_type") ?? "Driver's License",
    ).trim();
    const idNumber = String(formData.get("new_person_id_number") ?? "").trim();
    const idIssuedBy = String(
      formData.get("new_person_id_issued_by") ?? "",
    ).trim();
    const idIssuedDate = String(
      formData.get("new_person_id_issued_date") ?? "",
    ).trim();
    const idExpirationDate = String(
      formData.get("new_person_id_expiration_date") ?? "",
    ).trim();
    const idVerified = formData.get("new_person_id_verified") === "on";

    if (!assignmentId || !fullName) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: assignment } = await supabase
      .from("assignments")
      .select(
        "id, signing_date, signing_time, signing_address, signing_city, signing_state, signing_zip",
      )
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
      .single();

    if (!assignment) redirect("/notary/assignments");

    let { data: journalEntry } = await supabase
      .from("assignment_journal_entries")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id)
      .maybeSingle();

    if (!journalEntry) {
      const { data: insertedJournalEntry } = await supabase
        .from("assignment_journal_entries")
        .insert({
          assignment_id: assignmentId,
          notary_id: user.id,
          journal_date: assignment.signing_date,
          journal_time: assignment.signing_time,
          journal_type: "In-Person",
          location_mode: "address",
          address: assignment.signing_address,
          city: assignment.signing_city,
          state: assignment.signing_state ?? "IN",
          zip: assignment.signing_zip,
          status: "open",
        })
        .select("id")
        .single();

      journalEntry = insertedJournalEntry;
    }

    if (!journalEntry?.id) return;

    const { count } = await supabase
      .from("assignment_journal_people")
      .select("id", { count: "exact", head: true })
      .eq("journal_entry_id", journalEntry.id);

    await supabase.from("assignment_journal_people").insert({
      journal_entry_id: journalEntry.id,
      assignment_id: assignmentId,
      notary_id: user.id,
      person_type: personType === "witness" ? "witness" : "signer",
      full_name: fullName,
      address: address || null,
      city: city || null,
      state: state || "IN",
      zip: zip || null,
      id_verification_type: idVerificationType || null,
      id_number: idNumber || null,
      id_issued_by: idIssuedBy || null,
      id_issued_date: idIssuedDate || null,
      id_expiration_date: idExpirationDate || null,
      id_verified: idVerified,
      sort_order: count ?? 0,
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#journal-people`);
  }

  async function deleteJournalPerson(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const personId = String(formData.get("person_id") ?? "").trim();

    if (!assignmentId || !personId) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    await supabase
      .from("assignment_journal_people")
      .delete()
      .eq("id", personId)
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id);

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#journal-people`);
  }

  async function saveJournalDocuments(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const documentNames = formData
      .getAll("journal_documents")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const defaultNotarialAct = String(
      formData.get("journal_default_notarial_act") ?? "",
    ).trim();

    if (!assignmentId) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: assignment } = await supabase
      .from("assignments")
      .select(
        "id, signing_date, signing_time, signing_address, signing_city, signing_state, signing_zip",
      )
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
      .single();

    if (!assignment) redirect("/notary/assignments");

    let { data: journalEntry } = await supabase
      .from("assignment_journal_entries")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id)
      .maybeSingle();

    if (!journalEntry) {
      const { data: insertedJournalEntry } = await supabase
        .from("assignment_journal_entries")
        .insert({
          assignment_id: assignmentId,
          notary_id: user.id,
          journal_date: assignment.signing_date,
          journal_time: assignment.signing_time,
          journal_type: "In-Person",
          location_mode: "address",
          address: assignment.signing_address,
          city: assignment.signing_city,
          state: assignment.signing_state ?? "IN",
          zip: assignment.signing_zip,
          status: "open",
        })
        .select("id")
        .single();

      journalEntry = insertedJournalEntry;
    }

    if (!journalEntry?.id) return;

    await supabase
      .from("assignment_journal_documents")
      .delete()
      .eq("journal_entry_id", journalEntry.id)
      .eq("notary_id", user.id);

    if (documentNames.length > 0) {
      await supabase.from("assignment_journal_documents").insert(
        documentNames.map((documentName, index) => ({
          journal_entry_id: journalEntry!.id,
          assignment_id: assignmentId,
          notary_id: user.id,
          document_name: documentName,
          notarial_act: defaultNotarialAct || null,
          sort_order: index,
        })),
      );
    }

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#journal-documents`);
  }

  async function saveJournalEntry(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "");
    const journalDate = String(formData.get("journal_date") ?? "").trim();
    const journalTime = String(formData.get("journal_time") ?? "").trim();
    const journalType = String(
      formData.get("journal_type") ?? "In-Person",
    ).trim();
    const locationMode = String(
      formData.get("location_mode") ?? "address",
    ).trim();
    const address = String(formData.get("journal_address") ?? "").trim();
    const city = String(formData.get("journal_city") ?? "").trim();
    const state = String(formData.get("journal_state") ?? "IN").trim();
    const zip = String(formData.get("journal_zip") ?? "").trim();
    const notes = String(formData.get("journal_notes") ?? "").trim();
    const signerName = String(formData.get("signer_name") ?? "").trim();
    const signerAddress = String(formData.get("signer_address") ?? "").trim();
    const signerCity = String(formData.get("signer_city") ?? "").trim();
    const signerState = String(formData.get("signer_state") ?? "IN").trim();
    const signerZip = String(formData.get("signer_zip") ?? "").trim();
    const idVerificationType = String(
      formData.get("id_verification_type") ?? "Driver's License",
    ).trim();
    const idNumber = String(formData.get("id_number") ?? "").trim();
    const idIssuedBy = String(formData.get("id_issued_by") ?? "").trim();
    const idIssuedDate = String(formData.get("id_issued_date") ?? "").trim();
    const idExpirationDate = String(
      formData.get("id_expiration_date") ?? "",
    ).trim();
    const idVerified = formData.get("id_verified") === "on";
    const documentNames = formData
      .getAll("journal_documents")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const signedJournalPeople = Array.from(
      new Set(
        formData
          .getAll("journal_signed_people")
          .map((value) => String(value).trim())
          .filter(Boolean),
      ),
    );
    const signatureImages = Array.from(formData.entries()).filter(
      ([key, value]) =>
        key.startsWith("journal_signature_text_") &&
        String(value).startsWith("data:image/"),
    );
    const notarySignedJournal = formData.get("journal_notary_signed") === "on";

    if (!assignmentId) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: assignment } = await supabase
      .from("assignments")
      .select(
        "id, borrower_name, signing_date, signing_time, signing_address, signing_city, signing_state, signing_zip",
      )
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
      .single();

    if (!assignment) redirect("/notary/assignments");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const actorName = profile?.full_name || profile?.email || "Notary";

    const details = [
      "Journal entry saved.",
      `Date/Time: ${journalDate || "—"} ${journalTime || ""}`.trim(),
      `Type: ${journalType}`,
      `Location: ${locationMode === "gps" ? "GPS" : [address, city, state, zip].filter(Boolean).join(", ") || "—"}`,
      `Signer: ${signerName || assignment.borrower_name || "—"}`,
      `Signer Address: ${[signerAddress, signerCity, signerState, signerZip].filter(Boolean).join(", ") || "—"}`,
      `ID Verification: ${idVerificationType}`,
      `ID Number: ${idNumber || "—"}`,
      `ID Issued By: ${idIssuedBy || "—"}`,
      `ID Issued: ${idIssuedDate || "—"}`,
      `ID Expires: ${idExpirationDate || "—"}`,
      `ID Verified: ${idVerified ? "Yes" : "No"}`,
      `Documents: ${documentNames.length ? documentNames.join(", ") : "None selected"}`,
      `Journal Signatures: ${signedJournalPeople.length ? signedJournalPeople.join(", ") : "None marked"}`,
      `Signature Images Captured: ${signatureImages.length}`,
      `Notary Signed Journal: ${notarySignedJournal ? "Yes" : "No"}`,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    let { data: journalEntry } = await supabase
      .from("assignment_journal_entries")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id)
      .maybeSingle();

    if (!journalEntry) {
      const { data: insertedJournalEntry } = await supabase
        .from("assignment_journal_entries")
        .insert({
          assignment_id: assignmentId,
          notary_id: user.id,
          journal_date: journalDate || assignment.signing_date,
          journal_time: journalTime || assignment.signing_time,
          journal_type: journalType || "In-Person",
          location_mode: locationMode || "address",
          address: address || assignment.signing_address,
          city: city || assignment.signing_city,
          state: state || assignment.signing_state || "IN",
          zip: zip || assignment.signing_zip,
          notes: notes || null,
          status: "open",
        })
        .select("id")
        .single();

      journalEntry = insertedJournalEntry;
    } else {
      await supabase
        .from("assignment_journal_entries")
        .update({
          journal_date: journalDate || null,
          journal_time: journalTime || null,
          journal_type: journalType || "In-Person",
          location_mode: locationMode || "address",
          address: address || null,
          city: city || null,
          state: state || "IN",
          zip: zip || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", journalEntry.id)
        .eq("notary_id", user.id);
    }

    if (journalEntry?.id) {
      const existingPrimaryPerson = signerName
        ? await supabase
            .from("assignment_journal_people")
            .select("id")
            .eq("journal_entry_id", journalEntry.id)
            .eq("notary_id", user.id)
            .eq("person_type", "signer")
            .ilike("full_name", signerName)
            .maybeSingle()
        : { data: null };

      const primaryPersonPayload = {
        journal_entry_id: journalEntry.id,
        assignment_id: assignmentId,
        notary_id: user.id,
        person_type: "signer",
        full_name: signerName || assignment.borrower_name || "Primary Signer",
        address: signerAddress || null,
        city: signerCity || null,
        state: signerState || "IN",
        zip: signerZip || null,
        id_verification_type: idVerificationType || null,
        id_number: idNumber || null,
        id_issued_by: idIssuedBy || null,
        id_issued_date: idIssuedDate || null,
        id_expiration_date: idExpirationDate || null,
        id_verified: idVerified,
        sort_order: 0,
      };

      if (existingPrimaryPerson.data?.id) {
        await supabase
          .from("assignment_journal_people")
          .update(primaryPersonPayload)
          .eq("id", existingPrimaryPerson.data.id)
          .eq("notary_id", user.id);
      } else {
        await supabase.from("assignment_journal_people").insert(primaryPersonPayload);
      }

      const defaultNotarialAct = String(
        formData.get("journal_default_notarial_act") ?? "",
      ).trim();

      await supabase
        .from("assignment_journal_documents")
        .delete()
        .eq("journal_entry_id", journalEntry.id)
        .eq("notary_id", user.id);

      if (documentNames.length > 0) {
        await supabase.from("assignment_journal_documents").insert(
          documentNames.map((documentName, index) => ({
            journal_entry_id: journalEntry!.id,
            assignment_id: assignmentId,
            notary_id: user.id,
            document_name: documentName,
            notarial_act: defaultNotarialAct || null,
            sort_order: index,
          })),
        );
      }
    }

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: actorName,
      actor_role: "notary",
      action: "Journal Entry Saved",
      details,
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
  }

  async function addOrderNote(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "");
    const comment = String(formData.get("comment") ?? "").trim();

    if (!assignmentId || !comment) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, client_id, control_number, borrower_name")
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
      .single();

    if (!assignment) redirect("/notary/assignments");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const actorName = profile?.full_name || profile?.email || "Notary";

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      action: "Notary comment",
      actor_name: actorName,
      details: comment,
    });

    const orderNumber = assignment.control_number || assignmentId;

    const recipientMap = new Map<
      string,
      { recipientType: "admin" | "client"; orderLink: string }
    >();

    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("is_active", true);

    for (const admin of admins ?? []) {
      if (admin.id !== user.id) {
        recipientMap.set(admin.id, {
          recipientType: "admin",
          orderLink: buildAdminOrderLink(assignmentId),
        });
      }
    }

    if (assignment.client_id && assignment.client_id !== user.id) {
      recipientMap.set(assignment.client_id, {
        recipientType: "client",
        orderLink: buildClientOrderLink(assignmentId),
      });
    }

    const recipientIds = Array.from(recipientMap.keys());

    if (recipientIds.length > 0) {
      const { data: recipients } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", recipientIds);

      const notifications =
        recipients
          ?.filter((recipient) => recipient.email)
          .map((recipient) => {
            const info = recipientMap.get(recipient.id);

            return {
              user_id: recipient.id,
              channel: "email",
              type: "order_message_added",
              status: "pending",
              subject: `New Note Added - Order-${orderNumber}`,
              message: `
Hello ${recipient.full_name || "there"},

A new notary note was added to Order-${orderNumber}.

Order Number: Order-${orderNumber}
Borrower Name: ${assignment.borrower_name || "Not listed"}
From: ${actorName}

Message:
${comment}

Please log in to your Indiana Notary Solutions dashboard to review and respond.

Indiana Notary Solutions
`.trim(),
              metadata: {
                email: recipient.email,
                assignment_id: assignmentId,
                control_number: orderNumber,
                order_link: info?.orderLink,
                cta_label: "View Order",
                recipient_type: info?.recipientType,
              },
              attempts: 0,
            };
          }) ?? [];

      if (notifications.length > 0) {
        const { error: notificationError } = await supabaseAdmin
          .from("notification_queue")
          .insert(notifications);

        if (notificationError) {
          console.error(
            "Notary note notification insert error:",
            notificationError,
          );
        }

        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-notifications`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
            },
          );
        } catch (error) {
          console.error("Notary note notification processing error:", error);
        }
      }
    }

    revalidatePath(`/notary/assignments/${assignmentId}`);
  }

  async function uploadReturnedDocuments(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "");
    const files = formData
      .getAll("returned_documents")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (!assignmentId || files.length === 0) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: assignment } = await supabase
      .from("assignments")
      .select("id")
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
      .single();

    if (!assignment) redirect("/notary/assignments");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const actorName = profile?.full_name || profile?.email || "Notary";
    const uploadedNames: string[] = [];

    for (const file of files) {
      const cleanName = safeFileName(file.name || "returned-document.pdf");
      const filePath = `returned-documents/${assignmentId}/${Date.now()}-${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from("assignment-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        await supabase.from("assignment_activity").insert({
          assignment_id: assignmentId,
          actor_id: user.id,
          actor_name: actorName,
          actor_role: "notary",
          action: "Returned Document Upload Failed",
          details: uploadError.message,
        });

        continue;
      }

      await supabase.from("assignment_uploaded_documents").insert({
        assignment_id: assignmentId,
        uploaded_by: user.id,
        document_type: "Signed Document Package",
        file_name: file.name,
        file_path: filePath,
      });

      uploadedNames.push(file.name);
    }

    if (uploadedNames.length > 0) {
      await supabase.from("assignment_activity").insert({
        assignment_id: assignmentId,
        actor_id: user.id,
        actor_name: actorName,
        actor_role: "notary",
        action: "Returned Documents Uploaded",
        details: `The notary uploaded ${uploadedNames.length} file(s): ${uploadedNames.join(
          ", ",
        )}`,
      });
    }

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#upload-documents`);
  }

  async function markScanbacksComplete(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "");
    const signingStatus = String(formData.get("signing_status") ?? "");
    const shippingCarrier = String(
      formData.get("shipping_carrier") ?? "",
    ).trim();
    const trackingNumber = String(formData.get("tracking_number") ?? "").trim();
    const completionNotes = String(
      formData.get("completion_notes") ?? "",
    ).trim();
    const notifyClient = formData.get("notify_client") === "on";

    if (!assignmentId) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: assignment } = await supabase
      .from("assignments")
      .select(
        "id, status, signing_date, client_id, control_number, borrower_name",
      )
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
      .single();

    if (!assignment) redirect("/notary/assignments");

    const { data: existingDocs } = await supabase
      .from("assignment_uploaded_documents")
      .select("id")
      .eq("assignment_id", assignmentId)
      .limit(1);

    if (!existingDocs || existingDocs.length === 0) {
      revalidatePath(`/notary/assignments/${assignmentId}`);
      return;
    }

    const finalStatus =
      signingStatus === "did_not_sign" ? "Did Not Sign" : "Signing Complete";

    const dropDate =
      finalStatus === "Signing Complete"
        ? getEstimatedDropDate(assignment.signing_date)
        : null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const actorName = profile?.full_name || profile?.email || "Notary";

    await supabase
      .from("assignments")
      .update({
        status: finalStatus,
        shipping_carrier:
          finalStatus === "Signing Complete" ? shippingCarrier || null : null,
        tracking_number:
          finalStatus === "Signing Complete" ? trackingNumber || null : null,
        drop_date: dropDate,
        completion_notes: completionNotes || null,
        completed_at: new Date().toISOString(),
        client_email_notification_sent:
          finalStatus === "Signing Complete" ? notifyClient : false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`);

    if (
      finalStatus === "Signing Complete" &&
      notifyClient &&
      assignment.client_id
    ) {
      const { data: clientProfile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", assignment.client_id)
        .maybeSingle();

      const clientEmail = String(clientProfile?.email || "").trim();

      if (clientEmail) {
        await supabaseAdmin.from("notification_queue").insert({
          user_id: assignment.client_id,
          channel: "email",
          type: "signing_package_returned",
          status: "pending",
          subject: `Completed Signing Package Received - ${
            assignment.control_number || "Order"
          }`,
          message: `
Indiana Notary Solutions has received the completed signing package for the order below.

Control Number: ${assignment.control_number || "—"}
Signer: ${assignment.borrower_name || "—"}

The signing appointment has been completed and the executed documents have been returned.

View Order:
https://indiananotarysolutions.com/client/dashboard/orders/${assignment.id}

You may log in to your client dashboard at any time to view order details, status updates, and available documents.

Thank you for choosing Indiana Notary Solutions.
`.trim(),
          metadata: {
            recipient_email: clientEmail,
            recipient_name: clientProfile?.full_name || "Client",
          },
        });

        await supabaseAdmin.functions.invoke("process-notifications");
      }
    }

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: actorName,
      actor_role: "notary",
      action:
        finalStatus === "Signing Complete"
          ? "Scanbacks Upload Complete"
          : "Signing Marked Did Not Sign",
      details: [
        `Status updated to ${finalStatus}.`,
        shippingCarrier ? `Carrier: ${shippingCarrier}` : null,
        trackingNumber ? `Tracking #: ${trackingNumber}` : null,
        completionNotes ? `Notes: ${completionNotes}` : null,
        notifyClient ? "Client notification requested." : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
    .single();

  if (!assignment) redirect("/notary/assignments");

  const { data: activity } = await supabase
    .from("assignment_activity")
    .select("*")
    .eq("assignment_id", assignment.id)
    .order("created_at", { ascending: false });

  const activityProfileIds = Array.from(
    new Set(
      (activity ?? []).flatMap((item) =>
        extractProfileIdsFromText(item.details),
      ),
    ),
  );

  const { data: activityProfiles } = activityProfileIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", activityProfileIds)
    : { data: [] };

  const profileNameById = new Map<string, string>(
    (activityProfiles ?? []).map((profile) => [
      String(profile.id),
      String(profile.full_name || profile.email || profile.id),
    ]),
  );

  const { data: uploadedDocuments } = await supabase
    .from("assignment_uploaded_documents")
    .select("*")
    .eq("assignment_id", assignment.id)
    .order("created_at", { ascending: false });

  const documentsWithUrls = await Promise.all(
    (uploadedDocuments ?? []).map(async (doc) => {
      const { data } = await supabase.storage
        .from("assignment-documents")
        .createSignedUrl(doc.file_path, 60 * 60);

      return {
        ...doc,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  const { data: titleDocuments } = await supabaseAdmin
    .from("order_documents")
    .select("id, file_name, file_path, file_type, file_size")
    .eq("order_id", assignment.id)
    .order("file_name", { ascending: true });

  const { data: clientProfile } = assignment.client_id
    ? await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", assignment.client_id)
        .maybeSingle()
    : { data: null };

  const titleDocumentsWithUrls = await Promise.all(
    (titleDocuments ?? []).map(async (doc) => {
      const { data } = await supabaseAdmin.storage
        .from("client-order-documents")
        .createSignedUrl(doc.file_path, 60 * 60);

      return {
        ...doc,
        name: doc.file_name,
        displayName: doc.file_name,
        createdAt: null,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  const signingDate = formatDate(assignment.signing_date);
  const signingTime = formatTime(assignment.signing_time);
  const notaryFee = assignment.notary_fee ?? null;

  const titleCompanyName = firstTextValue(
    assignment.title_company_name,
    assignment.title_company,
    assignment.company_name,
    assignment.client_company,
    assignment.client_name,
    clientProfile?.company_name,
    clientProfile?.business_name,
    clientProfile?.company,
    clientProfile?.organization_name,
  );

  const titleCompanyContact = firstTextValue(
    assignment.title_contact_name,
    assignment.title_company_contact,
    assignment.client_contact_name,
    assignment.contact_name,
    assignment.escrow_officer,
    clientProfile?.contact_name,
    clientProfile?.primary_contact,
    clientProfile?.primary_contact_name,
    clientProfile?.full_name,
    clientProfile?.name,
  );

  const titleCompanyPhone = firstTextValue(
    assignment.title_company_phone,
    assignment.title_contact_phone,
    assignment.client_phone,
    assignment.contact_phone,
    clientProfile?.company_phone,
    clientProfile?.business_phone,
    clientProfile?.phone,
    clientProfile?.phone_number,
  );

  const titleCompanyEmail = firstTextValue(
    assignment.title_company_email,
    assignment.title_contact_email,
    assignment.client_email,
    assignment.contact_email,
    clientProfile?.company_email,
    clientProfile?.business_email,
    clientProfile?.email,
  );

  const fileNumber = firstTextValue(
    assignment.file_number,
    assignment.file_no,
    assignment.client_file_number,
    assignment.control_number,
  );

  const productName = firstTextValue(
    assignment.product_type,
    assignment.product,
    assignment.loan_type,
    assignment.transaction_type,
    assignment.order_type,
    assignment.signing_type,
  );

  const titleCompanyContactLines = [
    titleCompanyContact,
    titleCompanyPhone,
    titleCompanyEmail,
  ].filter((value) => value && value !== "—");

  const signingLocation = [
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
    .join(", ");

  const mapHref = signingLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        signingLocation,
      )}`
    : null;

  const calendarTitle = `${assignment.borrower_name ?? "Signing"}${
    assignment.control_number ? ` - ${assignment.control_number}` : ""
  }`;

  const calendarDescription = [
    "Indiana Notary Solutions assignment",
    assignment.signing_type ? `Type: ${assignment.signing_type}` : null,
    assignment.borrower_name ? `Signer: ${assignment.borrower_name}` : null,
    assignment.borrower_phone ? `Phone: ${assignment.borrower_phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const calendarData = buildCalendarData({
    title: calendarTitle,
    date: assignment.signing_date,
    time: assignment.signing_time,
    location: signingLocation,
    description: calendarDescription,
  });

  const encodedCalendarTitle = encodeURIComponent(calendarTitle);
  const encodedCalendarLocation = encodeURIComponent(signingLocation);
  const encodedCalendarDescription = encodeURIComponent(calendarDescription);

  const progressSteps = [
    "Not Confirmed",
    "Confirmed",
    "In Progress",
    "Signing Complete",
    "Closed",
  ];

  const normalizedStatus = (assignment.status ?? "").toLowerCase();

  const currentStepIndex =
    normalizedStatus === "late"
      ? progressSteps.findIndex((step) => step === "In Progress")
      : progressSteps.findIndex(
          (step) => step.toLowerCase() === normalizedStatus,
        );

  const showUploadDocuments =
    normalizedStatus !== "signing complete" &&
    normalizedStatus !== "did not sign" &&
    normalizedStatus !== "closed" &&
    normalizedStatus !== "cancelled";

  const canMarkScanbacksComplete =
    showUploadDocuments && documentsWithUrls.length > 0;

  const devUnlockInsPro = process.env.NEXT_PUBLIC_INS_PRO_DEV_UNLOCK === "true";

  const userEmail = String(user.email ?? "").toLowerCase();

  const { data: subscription } = await supabaseAdmin
    .from("profiles")
    .select(
      `
    id,
    email,
    notary_subscriptions (
      plan,
      status
    )
  `,
    )
    .ilike("email", userEmail)
    .maybeSingle();

  const subscriptionRecord = Array.isArray(subscription?.notary_subscriptions)
    ? subscription.notary_subscriptions[0]
    : subscription?.notary_subscriptions;

  const hasActiveProSubscription =
    subscriptionRecord?.plan === "pro" &&
    ["active", "trialing"].includes(
      String(subscriptionRecord?.status ?? "").toLowerCase(),
    );

  const hasInsPro = devUnlockInsPro || hasActiveProSubscription;

  let { data: journalEntry } = await supabase
    .from("assignment_journal_entries")
    .select("id, status, updated_at, journal_date, journal_time, journal_type, location_mode, address, city, state, zip, notes")
    .eq("assignment_id", assignment.id)
    .eq("notary_id", user.id)
    .maybeSingle();

  if (!journalEntry) {
    const { data: insertedJournalEntry } = await supabase
      .from("assignment_journal_entries")
      .insert({
        assignment_id: assignment.id,
        notary_id: user.id,
        journal_date: assignment.signing_date,
        journal_time: assignment.signing_time,
        journal_type: "In-Person",
        location_mode: "address",
        address: assignment.signing_address,
        city: assignment.signing_city,
        state: assignment.signing_state ?? "IN",
        zip: assignment.signing_zip,
        status: "open",
      })
      .select("id, status, updated_at, journal_date, journal_time, journal_type, location_mode, address, city, state, zip, notes")
      .single();

    journalEntry = insertedJournalEntry;
  }

  const { data: savedJournalPeople } = journalEntry?.id
    ? await supabase
        .from("assignment_journal_people")
        .select("*")
        .eq("journal_entry_id", journalEntry.id)
        .eq("notary_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: savedJournalDocuments } = journalEntry?.id
    ? await supabase
        .from("assignment_journal_documents")
        .select("*")
        .eq("journal_entry_id", journalEntry.id)
        .eq("notary_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  const journalDocuments = savedJournalDocuments ?? [];
  const savedJournalDocumentNames = journalDocuments
    .map((document) => String(document.document_name ?? "").trim())
    .filter(Boolean);

  const journalPeople = savedJournalPeople ?? [];

  const primaryBorrowerName = String(assignment.borrower_name ?? "")
    .trim()
    .toLowerCase();

  const savedPrimaryJournalPerson = journalPeople.find((person) => {
    const savedPersonName = String(person.full_name ?? "")
      .trim()
      .toLowerCase();
    const savedPersonType = String(
      person.person_type ?? "signer",
    ).toLowerCase();

    return (
      primaryBorrowerName &&
      savedPersonName === primaryBorrowerName &&
      savedPersonType === "signer"
    );
  });

  const primaryJournalPerson = {
    id: savedPrimaryJournalPerson?.id ?? "primary-signer",
    person_type: "signer",
    full_name:
      savedPrimaryJournalPerson?.full_name ??
      assignment.borrower_name ??
      "Primary Signer",
    address:
      savedPrimaryJournalPerson?.address ??
      journalEntry?.address ??
      assignment.signing_address,
    city:
      savedPrimaryJournalPerson?.city ??
      journalEntry?.city ??
      assignment.signing_city,
    state:
      savedPrimaryJournalPerson?.state ??
      journalEntry?.state ??
      assignment.signing_state ??
      "IN",
    zip:
      savedPrimaryJournalPerson?.zip ??
      journalEntry?.zip ??
      assignment.signing_zip,
    id_verification_type:
      savedPrimaryJournalPerson?.id_verification_type ?? "Driver's License",
    id_number: savedPrimaryJournalPerson?.id_number ?? null,
    id_issued_by: savedPrimaryJournalPerson?.id_issued_by ?? "Indiana BMV",
    id_issued_date: savedPrimaryJournalPerson?.id_issued_date ?? null,
    id_expiration_date: savedPrimaryJournalPerson?.id_expiration_date ?? null,
    id_verified: savedPrimaryJournalPerson?.id_verified ?? false,
    sort_order: 0,
  };

  const savedJournalPeopleWithoutPrimary = journalPeople.filter((person) => {
    const savedPersonName = String(person.full_name ?? "")
      .trim()
      .toLowerCase();
    const savedPersonType = String(
      person.person_type ?? "signer",
    ).toLowerCase();

    return !(
      primaryBorrowerName &&
      savedPersonName === primaryBorrowerName &&
      savedPersonType === "signer"
    );
  });

  const displayJournalPeople = [
    primaryJournalPerson,
    ...savedJournalPeopleWithoutPrimary,
  ];

  const workspaceTabs = [
    "Journal",
    "Invoice",
    "Mileage",
    "Notarial Acts",
    "Expenses",
    "Payments",
    "Print",
  ];

  const journalDocumentOptions = [
    "Assumption of Mortgage / Loan",
    "Buyer/ & Seller, 1st Only",
    "Car Title",
    "Debt Settlement",
    "Divorce Decree",
    "Estoppel Certificate",
    "Gap Mortgage",
    "Gap Mortgage Note",
    "General Warranty Deed",
    "Georgia Foreclosure Discl",
    "Grant Deed",
    "Grant Warranty Deed",
    "Grant, Bargain, Sale Deed",
    "Guarantee of Funds",
    "Guaranty Agreement",
    "Guaranty of Recourse Care",
    "Hazardous Substances Agreement",
    "HELOC",
    "HOA Affidavit",
    "Hold Harmless Agreement",
    "Hybrid Loan",
    "Identification Letter",
    "Identity Affidavit",
    "Indemnity & Hold Harmless",
    "Indenture",
    "Last Will And Testament",
    "Limited Guaranty",
    "Limited Power of Attorney",
    "Limited Power of Representation",
    "Limited Warranty Deed",
    "LLC Affidavit",
    "LLC Borrowing Resolution",
    "Loan Application",
    "Loan Modification",
    "Marital Status Affidavit",
    "Marriage And Homestead",
    "Mechanic Lien Indemnity",
    "Memorandum of Occupancy Agreement",
    "Modification of Dot",
    "Mortgage",
    "Mortgagors Affidavit",
    "No Escrow Affidavit",
    "No Florida Estate Tax Due",
    "No Lien Affidavit",
    "Non-Applicant Affidavit",
    "Non-Foreign Affidavit",
    "Nonresident Withholding",
    "Notice To Mortgagor",
    "Occupancy Affidavit",
    "Open End Mortgage",
    "Owners/Sellers Affidavit",
    "Personal Guaranty",
    "Power of Attorney",
    "Privacy Policy",
    "Property Affidavit",
    "Purchase Money Dot",
    "Purchasers Affidavit",
    "Quitclaim Deed",
    "Refinance",
    "Rent Roll Certification",
    "Residential Affidavit",
    "Restated & Consolidated Note",
    "Restated Mortgage",
    "Reverse Mortgage",
    "Reverse refinance",
    "Sales Agreement Addendum",
    "Same Name Affidavit",
    "Security Deed",
    "Shortfall Affidavit",
    "Signature/Name Affidavit",
    "Statutory Warranty Deed",
    "Survey Affidavit",
    "Tax Proration Agreement",
    "Taxable Or Exempt Transfer",
    "Title Affidavit",
    "Vehicle Title",
    "Waiver of Borrowers Right",
    "Waiver of Counsel",
    "Warranty Bill of Sale",
    "Warranty Deed",
    "Wire Funds Authorization",
  ];

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
                Control # {assignment.control_number ?? "—"}
              </p>

              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                {assignment.borrower_name ?? "Assignment"}
              </h1>

              <p className="mt-2 text-blue-100/90">
                {clientProfile?.id ? (
                  <Link
                    href={`/notary/clients/${clientProfile.id}`}
                    className="font-semibold text-red-400 underline decoration-red-400 underline-offset-4 transition hover:text-red-300"
                  >
                    {titleCompanyName}
                  </Link>
                ) : (
                  <span>{titleCompanyName}</span>
                )}{" "}
                • {signingDate} {signingTime && `at ${signingTime}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge(
                  assignment.status,
                )}`}
              >
                {assignment.status ?? "Unknown"}
              </span>

              {nextAction(assignment, signingDate, signingTime)}
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Assignment Summary
            </h2>

            <div className="mt-6 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Signer / Borrower
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-800">
                  {assignment.borrower_name || "—"}
                </p>

                {assignment.borrower_phone && (
                  <a
                    href={`tel:${assignment.borrower_phone.replace(/\D/g, "")}`}
                    className="mt-2 block text-base font-medium text-[#0B1F4D] transition hover:text-blue-700 hover:underline"
                  >
                    {assignment.borrower_phone.replace(
                      /(\d{3})(\d{3})(\d{4})/,
                      "($1) $2-$3",
                    )}
                  </a>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Appointment
                  </p>

                  {calendarData && (
                    <details className="relative">
                      <summary className="cursor-pointer list-none text-sm font-bold text-[#f20511] transition hover:text-blue-700 hover:underline [&::-webkit-details-marker]:hidden">
                        Add to Calendar
                      </summary>

                      <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                        <a
                          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedCalendarTitle}&dates=${calendarData.googleDates}&details=${encodedCalendarDescription}&location=${encodedCalendarLocation}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0B1F4D]"
                        >
                          Google
                        </a>

                        <a
                          href={`https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodedCalendarTitle}&startdt=${encodeURIComponent(calendarData.startIso)}&enddt=${encodeURIComponent(calendarData.endIso)}&body=${encodedCalendarDescription}&location=${encodedCalendarLocation}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0B1F4D]"
                        >
                          Microsoft 365
                        </a>

                        <a
                          href={`https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodedCalendarTitle}&startdt=${encodeURIComponent(calendarData.startIso)}&enddt=${encodeURIComponent(calendarData.endIso)}&body=${encodedCalendarDescription}&location=${encodedCalendarLocation}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0B1F4D]"
                        >
                          Outlook.com
                        </a>

                        <a
                          href={calendarData.icsHref}
                          download="ins-signing.ics"
                          className="block px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0B1F4D]"
                        >
                          Apple / Outlook
                        </a>
                      </div>
                    </details>
                  )}
                </div>

                <p className="mt-1 text-lg font-medium text-slate-700">
                  {signingDate}
                </p>

                <p className="text-lg font-medium text-slate-700">
                  {signingTime || "Time not set"}
                </p>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Signing Location
                  </p>

                  {mapHref && (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-[#f20511] transition hover:text-blue-700 hover:underline"
                    >
                      Show Map
                    </a>
                  )}
                </div>

                <p className="mt-1 text-lg font-medium text-slate-700">
                  {assignment.signing_address ?? "—"}
                </p>

                <p className="text-lg font-medium text-slate-700">
                  {assignment.signing_city ?? "—"},{" "}
                  {assignment.signing_state ?? "IN"}{" "}
                  {assignment.signing_zip ?? ""}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Notary Fee
                </p>

                <p className="mt-2 text-xl font-bold text-[#0B1F4D]">
                  {formatMoney(notaryFee)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Progress</h2>

            <div className="mt-4 space-y-3">
              {progressSteps.map((step, index) => {
                const completed =
                  currentStepIndex >= 0 && index <= currentStepIndex;

                return (
                  <div key={step} className="flex items-center gap-3 text-sm">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        completed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {completed ? "✓" : index + 1}
                    </div>

                    <span
                      className={
                        completed
                          ? "font-medium text-slate-900"
                          : "text-slate-500"
                      }
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Payment</h2>

            <div className="mt-4 text-sm">
              <p className="font-semibold text-slate-700">Your Fee</p>
              <p className="text-xl font-bold text-slate-900">
                {formatMoney(notaryFee)}
              </p>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Title Company Info
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Reference details for this signing.
            </p>

            <div className="mt-5 space-y-4 text-sm">
              <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
                <p className="font-bold text-slate-400">Product</p>
                <p className="min-w-0 break-words font-medium text-slate-800">
                  {productName}
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
                <p className="font-bold text-slate-400">Client</p>

                <div className="min-w-0 break-words font-medium">
                  {clientProfile?.id ? (
                    <Link
                      href={`/notary/clients/${clientProfile.id}`}
                      className="text-red-600 underline decoration-red-600 underline-offset-2 transition hover:text-red-700"
                    >
                      {titleCompanyName}
                    </Link>
                  ) : (
                    <p className="break-words text-slate-800">
                      {titleCompanyName}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
                <p className="font-bold text-slate-400">Contact</p>
                <div className="min-w-0 font-medium text-slate-800">
                  {titleCompanyContactLines.length > 0 ? (
                    titleCompanyContactLines.map((line, index) => (
                      <p
                        key={`${line}-${index}`}
                        className={
                          index === 0
                            ? "break-words"
                            : "mt-1 break-all text-slate-600"
                        }
                      >
                        {line}
                      </p>
                    ))
                  ) : (
                    <p>—</p>
                  )}
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
                <p className="font-bold text-slate-400">File #</p>
                <p className="min-w-0 break-words font-medium text-slate-800">
                  {fileNumber}
                </p>
              </div>
            </div>
          </section>
        </aside>

        <section className="min-w-0 space-y-6">
          <section
            id="assignment-workspace"
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                INS Pro Workspace
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Assignment Tools
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Journal, invoices, mileage, expenses, payments, and reporting
                will all roll into the notary Dashboard.
              </p>

              <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                {workspaceTabs.map((tab) => (
                  <a
                    key={tab}
                    href={
                      tab === "Journal"
                        ? "#journal-workspace"
                        : `#${tab.toLowerCase().replaceAll(" ", "-")}-workspace`
                    }
                    className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold ring-1 transition ${
                      tab === "Journal"
                        ? "bg-[#0B1F4D] text-white ring-[#0B1F4D] hover:bg-blue-950"
                        : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tab}
                  </a>
                ))}
              </div>
            </div>

            {!hasInsPro ? (
              <div className="p-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-black uppercase tracking-wide text-amber-700">
                    INS Pro Feature
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-slate-950">
                    Journal tools are visible, but locked until the notary
                    upgrades.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    This is where the upgrade modal will open. For development
                    testing, set{" "}
                    <span className="font-mono font-bold">
                      NEXT_PUBLIC_INS_PRO_DEV_UNLOCK=true
                    </span>{" "}
                    in Vercel/local env.
                  </p>
                  <button
                    type="button"
                    className="mt-4 rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                  >
                    Upgrade to INS Pro
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <details className="group">
                  <summary className="inline-flex cursor-pointer list-none items-center rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 [&::-webkit-details-marker]:hidden">
                    Open Journal Workspace
                  </summary>

                  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center">
                    <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                        <div>
                          <h4 className="text-lg font-bold">
                            Journal Entry
                          </h4>
                          <p className="text-sm text-white/90">
                            Edit people, ID verification, documents, signatures, and notes.
                          </p>
                        </div>

                        <CloseDetailsButton />
                      </div>

                      <div className="max-h-[82vh] overflow-y-auto p-5">
                        <form action={saveJournalEntry} className="space-y-5">

                  <input
                    type="hidden"
                    name="assignment_id"
                    value={assignment.id}
                  />

                  <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-bold text-slate-700">
                        Date
                      </label>
                      <input
                        type="date"
                        name="journal_date"
                        defaultValue={journalEntry?.journal_date ?? assignment.signing_date ?? ""}
                        required
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700">
                        Time
                      </label>
                      <input
                        type="time"
                        name="journal_time"
                        defaultValue={journalEntry?.journal_time ?? assignment.signing_time ?? ""}
                        required
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700">
                        Type
                      </label>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
                        {["In-Person", "RON", "IPEN"].map((type) => (
                          <label key={type} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="journal_type"
                              value={type}
                              defaultChecked={(journalEntry?.journal_type ?? "In-Person") === type}
                              className="h-4 w-4 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700">
                        Location Source
                      </label>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="location_mode"
                            value="address"
                            defaultChecked={(journalEntry?.location_mode ?? "address") === "address"}
                            className="h-4 w-4 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                          />
                          Address
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="location_mode"
                            value="gps"
                            defaultChecked={journalEntry?.location_mode === "gps"}
                            className="h-4 w-4 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                          />
                          GPS
                        </label>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700">
                        Signing Address
                      </label>
                      <input
                        name="journal_address"
                        defaultValue={journalEntry?.address ?? assignment.signing_address ?? ""}
                        required
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700">
                        City
                      </label>
                      <input
                        name="journal_city"
                        defaultValue={journalEntry?.city ?? assignment.signing_city ?? ""}
                        required
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div className="grid grid-cols-[1fr_1fr] gap-3">
                      <div>
                        <label className="block text-sm font-bold text-slate-700">
                          State
                        </label>
                        <input
                          name="journal_state"
                          defaultValue={journalEntry?.state ?? assignment.signing_state ?? "IN"}
                          required
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700">
                          ZIP
                        </label>
                        <input
                          name="journal_zip"
                          defaultValue={journalEntry?.zip ?? assignment.signing_zip ?? ""}
                          required
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h4 className="text-lg font-bold text-slate-950">
                          People
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Add signers and witnesses for this journal entry. The
                          borrower is pre-filled as the first signer.
                        </p>
                      </div>

                      <div>
                        <input
                          id="journal-person-modal"
                          type="checkbox"
                          className="peer sr-only"
                        />

                        <label
                          htmlFor="journal-person-modal"
                          className="inline-block cursor-pointer rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                        >
                          + Add Person
                        </label>

                        <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/50 p-4 peer-checked:flex sm:items-center">
                          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] p-5 text-white">
                              <h5 className="text-lg font-bold">Add Person</h5>

                              <label
                                htmlFor="journal-person-modal"
                                className="cursor-pointer text-2xl font-black leading-none"
                                aria-label="Close add person modal"
                              >
                                ×
                              </label>
                            </div>

                            <div className="p-5">
                              <input
                                id="new-person-choice"
                                type="radio"
                                name="new_person_panel"
                                className="peer/choice sr-only"
                                defaultChecked
                              />
                              <input
                                id="new-person-signer"
                                type="radio"
                                name="new_person_panel"
                                className="peer/signer sr-only"
                              />
                              <input
                                id="new-person-witness"
                                type="radio"
                                name="new_person_panel"
                                className="peer/witness sr-only"
                              />

                              <div className="peer-checked/choice:block hidden">
                                <p className="text-center text-lg font-bold text-slate-950">
                                  Who are you adding?
                                </p>

                                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                  <label
                                    htmlFor="new-person-signer"
                                    className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50"
                                  >
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl">
                                      👤
                                    </div>
                                    <p className="mt-4 text-lg font-black text-slate-950">
                                      New Signer
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      Add another signer with ID verification.
                                    </p>
                                  </label>

                                  <label
                                    htmlFor="new-person-witness"
                                    className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50"
                                  >
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
                                      👁️
                                    </div>
                                    <p className="mt-4 text-lg font-black text-slate-950">
                                      New Witness
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      Add a witness for this journal entry.
                                    </p>
                                  </label>
                                </div>
                              </div>

                              <div className="peer-checked/signer:block peer-checked/witness:block hidden">
                                <div className="mb-5 flex items-center justify-between gap-3">
                                  <label
                                    htmlFor="new-person-choice"
                                    className="cursor-pointer text-sm font-bold text-[#0B1F4D] hover:underline"
                                  >
                                    ← Back
                                  </label>

                                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                    Save to this journal
                                  </p>
                                </div>

                                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
                                  <div className="md:col-span-2">
                                    <p className="text-xl font-black text-slate-950">
                                      <span className="peer-checked/signer:inline hidden">
                                        New Signer
                                      </span>
                                      <span className="peer-checked/witness:inline hidden">
                                        New Witness
                                      </span>
                                    </p>
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">
                                      Name
                                    </label>
                                    <input
                                      name="new_person_name"
                                      placeholder="Full name"
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">
                                      Address
                                    </label>
                                    <input
                                      name="new_person_address"
                                      placeholder="Street address"
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-bold text-slate-700">
                                      City
                                    </label>
                                    <input
                                      name="new_person_city"
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>

                                  <div className="grid grid-cols-[1fr_1fr] gap-3">
                                    <div>
                                      <label className="block text-sm font-bold text-slate-700">
                                        State
                                      </label>
                                      <input
                                        name="new_person_state"
                                        defaultValue="IN"
                                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-bold text-slate-700">
                                        ZIP
                                      </label>
                                      <input
                                        name="new_person_zip"
                                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-bold text-slate-700">
                                      Verification Type
                                    </label>
                                    <select
                                      name="new_person_verification_type"
                                      defaultValue="Driver's License"
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    >
                                      <option>Driver's License</option>
                                      <option>State ID</option>
                                      <option>Passport</option>
                                      <option>Military ID</option>
                                      <option>Permanent Resident Card</option>
                                      <option>Other</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-bold text-slate-700">
                                      ID Number
                                    </label>
                                    <input
                                      name="new_person_id_number"
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-bold text-slate-700">
                                      ID Issued By
                                    </label>
                                    <input
                                      name="new_person_id_issued_by"
                                      defaultValue="Indiana BMV"
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>

                                  <div className="grid grid-cols-[1fr_1fr] gap-3">
                                    <div>
                                      <label className="block text-sm font-bold text-slate-700">
                                        ID Issued
                                      </label>
                                      <input
                                        type="date"
                                        name="new_person_id_issued_date"
                                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-bold text-slate-700">
                                        ID Expires
                                      </label>
                                      <input
                                        type="date"
                                        name="new_person_id_expiration_date"
                                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                      />
                                    </div>
                                  </div>

                                  <label className="md:col-span-2 flex items-center gap-3 text-sm font-bold text-slate-700">
                                    <input
                                      type="checkbox"
                                      name="new_person_id_verified"
                                      className="h-5 w-5 rounded border-slate-300 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                                    />
                                    I have verified this person&apos;s ID.
                                  </label>
                                </div>

                                <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-5">
                                  <label
                                    htmlFor="journal-person-modal"
                                    className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Cancel
                                  </label>

                                  <button
                                    type="submit"
                                    formAction={saveJournalPerson}
                                    name="new_person_type"
                                    value="signer"
                                    className="peer-checked/signer:inline-flex hidden rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                                  >
                                    Save Signer
                                  </button>

                                  <button
                                    type="submit"
                                    formAction={saveJournalPerson}
                                    name="new_person_type"
                                    value="witness"
                                    className="peer-checked/witness:inline-flex hidden rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                                  >
                                    Save Witness
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      id="journal-people"
                      className="mt-5 flex items-center justify-between gap-3"
                    >
                      <a
                        href={`#journal-person-card-${Math.max(displayJournalPeople.length - 1, 0)}`}
                        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-black text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex"
                        aria-label="Previous person"
                      >
                        ‹
                      </a>

                      <div className="flex flex-1 snap-x gap-4 overflow-x-auto pb-2">
                        {displayJournalPeople.map((person, index) => {
                          const personType = String(
                            person.person_type ?? "signer",
                          ).toLowerCase();
                          const isWitness = personType === "witness";
                          const isSavedPerson = person.id !== "primary-signer";
                          const addressLine = [
                            person.address,
                            person.city,
                            person.state ?? "IN",
                            person.zip,
                          ]
                            .filter(Boolean)
                            .join(", ");

                          return (
                            <div
                              id={`journal-person-card-${index}`}
                              key={String(person.id)}
                              className={`min-w-full snap-center rounded-2xl border p-5 sm:min-w-[320px] ${
                                isWitness
                                  ? "border-amber-200 bg-amber-50"
                                  : "border-blue-200 bg-blue-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p
                                    className={`text-xs font-black uppercase tracking-wide ${
                                      isWitness
                                        ? "text-amber-700"
                                        : "text-blue-700"
                                    }`}
                                  >
                                    Person {index + 1} of{" "}
                                    {displayJournalPeople.length}
                                  </p>
                                  <h5 className="mt-2 text-xl font-black text-slate-950">
                                    {person.full_name ?? "Unnamed Person"}
                                  </h5>
                                  <p className="mt-1 text-sm font-bold text-slate-600">
                                    {isWitness ? "Witness" : "Signer"}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                                    person.id_verified
                                      ? "bg-green-50 text-green-700 ring-green-200"
                                      : "bg-amber-50 text-amber-700 ring-amber-200"
                                  }`}
                                >
                                  {person.id_verified
                                    ? "ID Verified"
                                    : "ID Pending"}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                                <div>
                                  <p className="font-bold text-slate-500">
                                    Verification
                                  </p>
                                  <p className="font-semibold text-slate-950">
                                    {person.id_verification_type ??
                                      "Driver's License"}
                                  </p>
                                </div>

                                <div>
                                  <p className="font-bold text-slate-500">
                                    ID Number
                                  </p>
                                  <p className="font-semibold text-slate-950">
                                    {person.id_number || "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className="font-bold text-slate-500">
                                    Address
                                  </p>
                                  <p className="font-semibold text-slate-950">
                                    {addressLine || "—"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                <a
                                  href="#primary-signer-verification"
                                  className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-950"
                                >
                                  Edit Person
                                </a>

                                {isSavedPerson ? (
                                  <button
                                    type="submit"
                                    formAction={deleteJournalPerson}
                                    name="person_id"
                                    value={String(person.id)}
                                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                                  >
                                    Remove
                                  </button>
                                ) : (
                                  <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-400">
                                    Primary
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <a
                        href="#journal-person-card-0"
                        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-black text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex"
                        aria-label="Next person"
                      >
                        ›
                      </a>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Mobile users can swipe between people. Saved people now
                      reload from the journal database.
                    </p>
                  </div>

                  <div
                    id="primary-signer-verification"
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h4 className="text-lg font-bold text-slate-950">
                          Signer ID Verification
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Scan will read the PDF417 barcode on the back of an
                          Indiana driver's license. The button is wired as UI
                          now; scanner component comes next.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        Scan Indiana Driver's License
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-bold text-slate-700">
                          Signer Name
                        </label>
                        <input
                          name="signer_name"
                          defaultValue={primaryJournalPerson.full_name ?? ""}
                          required
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700">
                          Verification Type
                        </label>
                        <select
                          name="id_verification_type"
                          defaultValue={primaryJournalPerson.id_verification_type ?? "Driver's License"}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        >
                          <option>Driver's License</option>
                          <option>State ID</option>
                          <option>Passport</option>
                          <option>Military ID</option>
                          <option>Permanent Resident Card</option>
                          <option>Other</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700">
                          Signer Address
                        </label>
                        <input
                          name="signer_address"
                          defaultValue={primaryJournalPerson.address ?? ""}
                          placeholder="Street address from ID"
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700">
                          City
                        </label>
                        <input
                          name="signer_city"
                          defaultValue={primaryJournalPerson.city ?? ""}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div className="grid grid-cols-[1fr_1fr] gap-3">
                        <div>
                          <label className="block text-sm font-bold text-slate-700">
                            State
                          </label>
                          <input
                            name="signer_state"
                            defaultValue={primaryJournalPerson.state ?? "IN"}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700">
                            ZIP
                          </label>
                          <input
                            name="signer_zip"
                            defaultValue={primaryJournalPerson.zip ?? ""}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700">
                          ID Number
                        </label>
                        <input
                          name="id_number"
                          defaultValue={primaryJournalPerson.id_number ?? ""}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700">
                          ID Issued By
                        </label>
                        <input
                          name="id_issued_by"
                          defaultValue={primaryJournalPerson.id_issued_by ?? "Indiana BMV"}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700">
                          ID Issued
                        </label>
                        <input
                          type="date"
                          name="id_issued_date"
                          defaultValue={primaryJournalPerson.id_issued_date ?? ""}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700">
                          ID Expires
                        </label>
                        <input
                          type="date"
                          name="id_expiration_date"
                          defaultValue={primaryJournalPerson.id_expiration_date ?? ""}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <label className="mt-5 flex items-center gap-3 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        name="id_verified"
                        defaultChecked={Boolean(primaryJournalPerson.id_verified)}
                        className="h-5 w-5 rounded border-slate-300 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                      />
                      I have verified this signer&apos;s ID.
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h4 className="text-lg font-bold text-slate-950">
                          Documents / Notarial Acts
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Add documents from the full journal document list.
                          Selected documents will be saved with this journal
                          entry.
                        </p>
                      </div>

                      <div>
                        <input
                          id="journal-document-selector-modal"
                          type="checkbox"
                          className="peer sr-only"
                        />

                        <label
                          htmlFor="journal-document-selector-modal"
                          className="inline-block cursor-pointer rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                        >
                          Add / Edit Documents
                        </label>

                        <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/50 p-4 peer-checked:flex sm:items-center">
                          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] p-5 text-white">
                              <h5 className="text-lg font-bold">
                                Document Selector
                              </h5>

                              <label
                                htmlFor="journal-document-selector-modal"
                                className="cursor-pointer text-2xl font-black leading-none"
                                aria-label="Close document selector"
                              >
                                ×
                              </label>
                            </div>

                            <div className="space-y-5 p-5">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <label className="block text-sm font-bold text-slate-700">
                                  Select Documents
                                </label>

                                <select
                                  name="journal_documents"
                                  multiple
                                  size={16}
                                  defaultValue={savedJournalDocumentNames}
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                >
                                  {journalDocumentOptions.map(
                                    (documentName) => (
                                      <option
                                        key={documentName}
                                        value={documentName}
                                      >
                                        {documentName}
                                      </option>
                                    ),
                                  )}
                                </select>

                                <p className="mt-2 text-xs text-slate-500">
                                  Hold Ctrl on Windows or Command on Mac to
                                  select multiple documents.
                                </p>
                              </div>

                              <div className="grid gap-3 md:grid-cols-3">
                                <label className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
                                  Default Notarization
                                  <select
                                    name="journal_default_notarial_act"
                                    defaultValue={
                                      journalDocuments[0]?.notarial_act ?? ""
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                  >
                                    <option value="">Select later</option>
                                    <option value="Acknowledgment">
                                      Acknowledgment
                                    </option>
                                    <option value="Jurat">Jurat</option>
                                    <option value="Oath/Affirmation">
                                      Oath / Affirmation
                                    </option>
                                    <option value="Copy Certification">
                                      Copy Certification
                                    </option>
                                  </select>
                                </label>

                                <label className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
                                  Default Signer
                                  <input
                                    name="journal_document_signer"
                                    defaultValue={
                                      assignment.borrower_name ?? ""
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                  />
                                </label>

                                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                  <p className="font-bold text-slate-900">
                                    Coming next
                                  </p>
                                  <p className="mt-1">
                                    Per-document Ack/Jurat, signer, and witness
                                    selection.
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                                <button
                                  type="submit"
                                  formAction={saveJournalDocuments}
                                  formNoValidate
                                  className="group inline-flex items-center justify-center rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 focus:cursor-wait focus:bg-blue-950 focus:outline-none focus:ring-4 focus:ring-blue-100"
                                >
                                  <span className="group-focus:hidden">Done</span>
                                  <span className="hidden items-center gap-2 group-focus:inline-flex">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Saving documents...
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      id="journal-documents"
                      className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm"
                    >
                      {journalDocuments.length === 0 ? (
                        <p className="text-slate-500">
                          Use{" "}
                          <span className="font-bold text-slate-700">
                            Add / Edit Documents
                          </span>{" "}
                          to select one or more documents for this journal
                          entry.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-bold text-slate-900">
                              Selected Documents
                            </p>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                              {journalDocuments.length} selected
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {journalDocuments.map((document) => (
                              <div
                                key={document.id}
                                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                              >
                                <p className="font-bold text-slate-950">
                                  {document.document_name}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {document.notarial_act ||
                                    "Notarial act not selected"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h4 className="text-lg font-bold text-slate-950">
                          Journal Signatures
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Have each signer or witness open the signature pad and sign the journal entry.
                        </p>
                      </div>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                        Signature pad
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {displayJournalPeople.map((person, index) => {
                        const personType = String(
                          person.person_type ?? "signer",
                        ).toLowerCase();
                        const isWitness = personType === "witness";
                        const personName = String(
                          person.full_name ?? `Person ${index + 1}`,
                        );
                        const signatureModalId = `journal-signature-modal-${index}`;

                        return (
                          <div
                            key={`journal-signature-${String(person.id)}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <input
                              id={signatureModalId}
                              type="checkbox"
                              className="peer sr-only"
                            />

                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-slate-950">
                                  {personName}
                                </p>
                                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                                  {isWitness ? "Witness" : "Signer"}
                                </p>
                                <p className="mt-2 text-sm text-slate-600">
                                  Open the pad to collect this person&apos;s journal signature.
                                </p>
                              </div>

                              <label
                                htmlFor={signatureModalId}
                                className="cursor-pointer rounded-xl bg-[#0B1F4D] px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-950"
                              >
                                Open Pad
                              </label>
                            </div>

                            <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked:flex sm:items-center">
                              <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                <div className="flex items-center justify-between bg-[#5BC0EB] px-5 py-4 text-white">
                                  <h5 className="text-lg font-bold">
                                    Signature
                                  </h5>

                                  <label
                                    htmlFor={signatureModalId}
                                    className="cursor-pointer text-2xl font-black leading-none"
                                    aria-label="Close signature pad"
                                  >
                                    ×
                                  </label>
                                </div>

                                <div className="space-y-5 p-5">
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm font-semibold text-slate-600">
                                      Signing as
                                    </p>
                                    <p className="mt-1 text-xl font-black text-slate-950">
                                      {personName}
                                    </p>
                                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                                      {isWitness ? "Witness" : "Signer"}
                                    </p>
                                  </div>

                                  <SignaturePad
  name="Signature Pad"
  inputName={`journal_signature_text_${index}`}
  signedPeopleName="journal_signed_people"
  signedPeopleValue={personName}
/>

                                  <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                                    <label
                                      htmlFor={signatureModalId}
                                      className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                    >
                                      Done
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <label className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        name="journal_notary_signed"
                        className="mt-1 h-5 w-5 rounded border-slate-300 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                      />
                      <span>
                        I certify this journal entry is complete and ready to save.
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700">
                      Notes
                    </label>
                    <textarea
                      name="journal_notes"
                      rows={4}
                      defaultValue={journalEntry?.notes ?? ""}
                      placeholder="Optional journal notes..."
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Print
                    </button>

                    <SubmitButton
                      pendingText="Saving journal..."
                      className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                    >
                      Save Journal Entry
                    </SubmitButton>
                  </div>

                        </form>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}
            
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Special Instructions
            </h2>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-700">
              {assignment.special_instructions ? (
                <p>{assignment.special_instructions}</p>
              ) : (
                <p>No special instructions have been added.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Title Documents
            </h2>
            <p className="text-sm text-slate-500">
              Documents provided for this signing.
            </p>

            {!titleDocumentsWithUrls.length ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No title documents have been uploaded yet.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {titleDocumentsWithUrls.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {doc.displayName}
                      </p>
                    </div>

                    {doc.signedUrl ? (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                      >
                        Open Document
                      </a>
                    ) : (
                      <span className="text-slate-400">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            id="upload-documents"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900">
              Returned Documents
            </h2>
            <p className="text-sm text-slate-500">
              Signed documents you have uploaded.
            </p>

            {showUploadDocuments && (
              <>
                <form
                  id="returned-documents-upload-form"
                  action={uploadReturnedDocuments}
                  className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <input
                    type="hidden"
                    name="assignment_id"
                    value={assignment.id}
                  />

                  <label className="block text-sm font-bold text-slate-700">
                    Upload signed documents
                  </label>

                  <input
                    type="file"
                    name="returned_documents"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    multiple
                    required
                    className="
      mt-2 w-full rounded-xl border border-slate-300 bg-white p-3
      text-sm font-medium text-slate-900 shadow-sm outline-none
      file:mr-4 file:rounded-lg file:border-0
      file:bg-[#0B1F4D] file:px-4 file:py-2
      file:text-sm file:font-bold file:text-white
      hover:file:bg-blue-950
      focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100
    "
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Upload the signed package, scanbacks, or completed
                    documents.
                  </p>

                  <SubmitButton
                    pendingText="Uploading documents..."
                    className="mt-4 rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                  >
                    Upload Completed Documents
                  </SubmitButton>
                </form>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  {canMarkScanbacksComplete && (
                    <details className="group">
                      <summary className="list-none cursor-pointer rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
                        ✓ Scanbacks Upload Complete
                      </summary>

                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
                          <div className="flex items-center justify-between border-b p-5">
                            <h3 className="text-xl font-bold text-slate-900">
                              Signing Status
                            </h3>

                            <span className="text-sm font-medium text-slate-500">
                              Complete before closing
                            </span>
                          </div>

                          <form
                            action={markScanbacksComplete}
                            className="space-y-5 p-5"
                          >
                            <input
                              type="hidden"
                              name="assignment_id"
                              value={assignment.id}
                            />

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <input
                                  type="radio"
                                  name="signing_status"
                                  value="successful"
                                  defaultChecked
                                />
                                Signing Successful
                              </label>

                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <input
                                  type="radio"
                                  name="signing_status"
                                  value="did_not_sign"
                                />
                                Did Not Sign
                              </label>
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-slate-700">
                                Shipping Company
                              </label>

                              <select
                                name="shipping_carrier"
                                defaultValue=""
                                required
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                              >
                                <option value="" disabled>
                                  Select a Shipping Service
                                </option>
                                <option value="FedEx">FedEx</option>
                                <option value="UPS">UPS</option>
                                <option value="USPS">USPS</option>
                                <option value="DHL">DHL</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-slate-700">
                                Tracking Number
                              </label>

                              <input
                                name="tracking_number"
                                type="text"
                                required
                                placeholder="Enter tracking number"
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-slate-700">
                                Completion Notes
                              </label>

                              <textarea
                                name="completion_notes"
                                rows={4}
                                required
                                placeholder="Example: Funds collected. Documents signed successfully."
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                              />
                            </div>

                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <input
                                type="hidden"
                                name="notify_client"
                                value="on"
                              />

                              <input
                                type="checkbox"
                                checked
                                readOnly
                                aria-readonly="true"
                                className="h-4 w-4 rounded border-slate-300 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                              />

                              <span>Notify Client</span>
                            </label>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                              <p className="font-semibold text-slate-900">
                                Client notification preview
                              </p>
                              <p className="mt-3">
                                The client will be notified that this signing
                                status has been updated.
                              </p>
                              <p className="mt-3">
                                <span className="font-semibold">Signer:</span>{" "}
                                {assignment.borrower_name ?? "—"}
                              </p>
                              <p>
                                <span className="font-semibold">
                                  Appointment:
                                </span>{" "}
                                {signingDate}{" "}
                                {signingTime && `at ${signingTime}`}
                              </p>
                              <p>
                                <span className="font-semibold">Location:</span>{" "}
                                {assignment.signing_address ?? "—"},{" "}
                                {assignment.signing_city ?? "—"},{" "}
                                {assignment.signing_state ?? "IN"}{" "}
                                {assignment.signing_zip ?? ""}
                              </p>
                            </div>

                            <div className="flex justify-end gap-3 border-t pt-5">
                              <CloseDetailsButton />

                              <SubmitButton
                                pendingText="Updating status..."
                                className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                              >
                                Save
                              </SubmitButton>
                            </div>
                          </form>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              </>
            )}

            {!showUploadDocuments && (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
                Scanbacks upload has been marked complete. Returned documents
                are locked for this assignment.
              </div>
            )}

            {!documentsWithUrls.length ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No uploaded documents yet.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {documentsWithUrls.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {doc.document_type}
                      </p>
                      <p className="text-slate-500">{doc.file_name}</p>
                      <p className="text-xs text-slate-400">
                        Uploaded {formatActivityDate(doc.created_at)}
                      </p>
                    </div>

                    {doc.signedUrl ? (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                      >
                        View File
                      </a>
                    ) : (
                      <span className="text-slate-400">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Order Notes</h2>
            <p className="text-sm text-slate-500">
              Add a note for this order. It will show in the activity log below.
            </p>

            <form action={addOrderNote} className="mt-4 space-y-3">
              <input type="hidden" name="assignment_id" value={assignment.id} />

              <textarea
                name="comment"
                required
                rows={4}
                placeholder="Type your note..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />

              <SubmitButton
                pendingText="Adding note..."
                className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
              >
                Add Note
              </SubmitButton>
            </form>
          </section>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Activity</h2>

        {!activity?.length ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No activity yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {activity.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
              >
                <p className="text-base font-bold text-slate-900">
                  {item.action}
                </p>

                {item.actor_name && (
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {item.actor_name}
                  </p>
                )}

                <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                  {formatActivityDetails(item.details, profileNameById)}
                </p>

                <p className="mt-3 text-xs font-medium text-slate-400">
                  {formatActivityDate(item.created_at)}
                </p>
              </div>
            ))}

            {activity.length > 3 && (
              <details className="group space-y-3">
                <summary className="cursor-pointer list-none text-sm font-bold text-[#f20511] transition hover:text-blue-700 hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">View All</span>
                  <span className="hidden group-open:inline">Show Less</span>
                </summary>

                <div className="space-y-3">
                  {activity.slice(3).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                    >
                      <p className="text-base font-bold text-slate-900">
                        {item.action}
                      </p>

                      {item.actor_name && (
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {item.actor_name}
                        </p>
                      )}

                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                        {formatActivityDetails(item.details, profileNameById)}
                      </p>

                      <p className="mt-3 text-xs font-medium text-slate-400">
                        {formatActivityDate(item.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
