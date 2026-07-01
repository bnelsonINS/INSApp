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

const FEDERAL_MILEAGE_RATE = 0.725;
const INDIANA_NOTARIAL_ACT_FEE = 10;
const EXPENSE_CATEGORIES = [
  "Accountant Fees",
  "Advertising",
  "Banking Fees",
  "Document Printing",
  "Document Shipping",
  "Insurance",
  "Licensing & Filings",
  "Meals & Entertainment",
  "Mileage - Personal Auto",
  "Misc.",
  "Office Supplies",
  "Parking/Tolls",
  "Phone/Fax",
  "Postage",
  "Signing Tabs",
  "Software",
  "Training",
];

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

function formatInputDate(date: string | null | undefined) {
  if (!date) return "";
  return String(date).slice(0, 10);
}

function addDaysToDate(date: string | null | undefined, days: number) {
  if (!date) return "";
  const nextDate = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function formatInvoiceNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Draft";
  const numberText = String(value).padStart(6, "0");
  return `INS-INV-${numberText}`;
}

function invoiceStatusBadge(status: string | null | undefined) {
  const normalized = String(status ?? "draft").toLowerCase();

  if (normalized === "paid") return "bg-green-50 text-green-700 ring-green-200";
  if (normalized === "not_required") return "bg-slate-50 text-slate-700 ring-slate-200";
  if (normalized === "sent") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (normalized === "overdue") return "bg-red-50 text-red-700 ring-red-200";
  if (normalized === "unpaid") return "bg-amber-50 text-amber-700 ring-amber-200";

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function displayInvoiceStatus(status: string | null | undefined) {
  const normalized = String(status ?? "draft").toLowerCase();

  if (normalized === "not_required") return "Not Required";
  return normalized
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" " );
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


function optionalTextValue(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text && text !== "—") return text;
  }

  return "";
}

function buildBusinessLocation(profile: Record<string, any> | null | undefined) {
  if (!profile) return "";

  const fullBusinessLocation = optionalTextValue(
    profile.business_location_full_address,
    profile.business_location,
    profile.business_full_address,
    profile.business_mailing_address,
    profile.business_address_full,
  );

  if (fullBusinessLocation) return fullBusinessLocation;

  const street = optionalTextValue(
    profile.business_location_address,
    profile.business_address,
    profile.business_street_address,
    profile.business_street,
    profile.office_address,
    profile.office_street_address,
  );

  const city = optionalTextValue(
    profile.business_location_city,
    profile.business_city,
    profile.office_city,
  );

  const state = optionalTextValue(
    profile.business_location_state,
    profile.business_state,
    profile.office_state,
  );

  const zip = optionalTextValue(
    profile.business_location_zip,
    profile.business_zip,
    profile.business_zip_code,
    profile.office_zip,
  );

  // Do not treat state alone (example: "IN") as a usable business location.
  // Mileage needs an actual starting address, not just a state value.
  if (!street && !city && !zip) return "";

  const cityStateZip = [city, state, zip].filter(Boolean).join(" ");

  return [street, cityStateZip].filter(Boolean).join(", ");
}

type GoogleMileageRoute = {
  miles: number;
  distanceText: string;
  durationText: string | null;
  amount: number;
};

function parseGoogleDuration(duration: string | null | undefined) {
  if (!duration) return null;

  const seconds = Number(String(duration).replace("s", ""));
  if (!Number.isFinite(seconds)) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
  if (hours > 0) return `${hours} hr`;
  return `${minutes} min`;
}

async function calculateGoogleMileageRoute({
  origin,
  destination,
}: {
  origin: string;
  destination: string;
}): Promise<GoogleMileageRoute | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || !origin.trim() || !destination.trim()) return null;

  try {
    const googleResponse = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.localizedValues",
        },
        body: JSON.stringify({
          origin: { address: origin.trim() },
          destination: { address: destination.trim() },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          computeAlternativeRoutes: false,
          units: "IMPERIAL",
        }),
      },
    );

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      console.error("Google Routes API error:", data);
      return null;
    }

    const route = data.routes?.[0];
    const distanceMeters = Number(route?.distanceMeters ?? 0);

    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null;

    const miles = Math.round((distanceMeters / 1609.344) * 100) / 100;
    const amount = Math.round(miles * FEDERAL_MILEAGE_RATE * 100) / 100;

    return {
      miles,
      distanceText:
        route.localizedValues?.distance?.text || `${miles.toFixed(2)} mi`,
      durationText:
        route.localizedValues?.duration?.text || parseGoogleDuration(route.duration),
      amount,
    };
  } catch (error) {
    console.error("Automatic mileage calculation error:", error);
    return null;
  }
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ workspace?: string; expense_saved?: string; expense_error?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeWorkspace = String(resolvedSearchParams.workspace ?? "").toLowerCase();
  const expenseSaved = String(resolvedSearchParams.expense_saved ?? "") === "1";
  const expenseError = String(resolvedSearchParams.expense_error ?? "").trim();

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
    const primarySignatureData = String(
      formData.get("journal_signature_text_0") ?? "",
    ).trim();
    const journalComplete = formData.get("journal_notary_signed") === "on";

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
      `Notary Signed Journal: ${journalComplete ? "Yes" : "No"}`,
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
          status: journalComplete ? "completed" : "open",
          completed_at: journalComplete ? new Date().toISOString() : null,
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
          status: journalComplete ? "completed" : "open",
          completed_at: journalComplete ? new Date().toISOString() : null,
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
        signature_data: primarySignatureData.startsWith("data:image/")
          ? primarySignatureData
          : null,
        signed_at:
          signedJournalPeople.includes(
            signerName || assignment.borrower_name || "Primary Signer",
          ) && primarySignatureData.startsWith("data:image/")
            ? new Date().toISOString()
            : null,
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



  async function saveInvoice(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const invoiceId = String(formData.get("invoice_id") ?? "").trim();
    const invoiceDate = String(formData.get("invoice_date") ?? "").trim();
    const dueDate = String(formData.get("due_date") ?? "").trim();
    const status = String(formData.get("invoice_status") ?? "draft").trim();
    const notes = String(formData.get("invoice_notes") ?? "").trim();
    const description = String(formData.get("invoice_description") ?? "").trim();
    const feeAmount = Number(formData.get("invoice_fee_amount") ?? 0);

    if (!assignmentId) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, borrower_name, control_number, notary_fee")
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
      .single();

    if (!assignment) redirect("/notary/assignments");

    const cleanFeeAmount = Number.isFinite(feeAmount) ? feeAmount : 0;
    const invoicePayload = {
      assignment_id: assignmentId,
      notary_id: user.id,
      invoice_date: invoiceDate || new Date().toISOString().slice(0, 10),
      due_date: dueDate || null,
      status: status || "draft",
      notes: notes || null,
      subtotal: cleanFeeAmount,
      updated_at: new Date().toISOString(),
    };

    let savedInvoiceId = invoiceId;

    if (savedInvoiceId) {
      await supabase
        .from("assignment_invoices")
        .update(invoicePayload)
        .eq("id", savedInvoiceId)
        .eq("notary_id", user.id);
    } else {
      const { data: existingInvoice } = await supabase
        .from("assignment_invoices")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("notary_id", user.id)
        .maybeSingle();

      if (existingInvoice?.id) {
        savedInvoiceId = existingInvoice.id;
        await supabase
          .from("assignment_invoices")
          .update(invoicePayload)
          .eq("id", savedInvoiceId)
          .eq("notary_id", user.id);
      } else {
        const { data: insertedInvoice } = await supabase
          .from("assignment_invoices")
          .insert(invoicePayload)
          .select("id")
          .single();

        savedInvoiceId = insertedInvoice?.id ?? "";
      }
    }

    if (!savedInvoiceId) return;

    await supabase
      .from("assignment_invoice_items")
      .delete()
      .eq("invoice_id", savedInvoiceId)
      .eq("notary_id", user.id);

    if (cleanFeeAmount > 0 || description) {
      await supabase.from("assignment_invoice_items").insert({
        invoice_id: savedInvoiceId,
        assignment_id: assignmentId,
        notary_id: user.id,
        description:
          description ||
          `Signing fee for ${assignment.borrower_name || assignment.control_number || "assignment"}`,
        quantity: 1,
        unit_price: cleanFeeAmount,
        line_total: cleanFeeAmount,
        sort_order: 0,
      });
    }

    const { data: mileageRows } = await supabase
      .from("assignment_mileage")
      .select("amount")
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id);

    const { data: expenseRows } = await supabase
      .from("assignment_expenses")
      .select("amount")
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id);

    const { data: paymentRows } = await supabase
      .from("assignment_payments")
      .select("amount")
      .eq("invoice_id", savedInvoiceId)
      .eq("notary_id", user.id);

    const mileageTotal = (mileageRows ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    const expensesTotal = (expenseRows ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    const paymentsTotal = (paymentRows ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    const balanceDue = cleanFeeAmount - paymentsTotal;
    const finalStatus = status || (balanceDue <= 0 && paymentsTotal > 0 ? "paid" : "draft");

    await supabase
      .from("assignment_invoices")
      .update({
        subtotal: cleanFeeAmount,
        mileage_total: mileageTotal,
        expenses_total: expensesTotal,
        payments_total: paymentsTotal,
        balance_due: balanceDue,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", savedInvoiceId)
      .eq("notary_id", user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: profile?.full_name || profile?.email || "Notary",
      actor_role: "notary",
      action: "Invoice Saved",
      details: [
        `Status: ${displayInvoiceStatus(finalStatus)}`,
        `Subtotal: ${formatMoney(cleanFeeAmount)}`,
        `Mileage Tax Record: ${formatMoney(mileageTotal)}`,
        `Expenses Tax Record: ${formatMoney(expensesTotal)}`,
        `Payments: ${formatMoney(paymentsTotal)}`,
        `Balance Due: ${formatMoney(balanceDue)}`,
      ].join("\n"),
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
  }

  async function addInvoicePayment(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const invoiceId = String(formData.get("invoice_id") ?? "").trim();
    const paymentDate = String(formData.get("payment_date") ?? "").trim();
    const amount = Number(formData.get("payment_amount") ?? 0);
    const paymentMethod = String(formData.get("payment_method_choice") || formData.get("payment_method") || "").trim();
    const reference = String(formData.get("payment_reference") ?? "").trim();
    const notes = String(formData.get("payment_notes") ?? "").trim();

    if (!assignmentId || !invoiceId || !Number.isFinite(amount) || amount <= 0) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: invoice } = await supabase
      .from("assignment_invoices")
      .select("id, subtotal, mileage_total, expenses_total")
      .eq("id", invoiceId)
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id)
      .single();

    if (!invoice) redirect(`/notary/assignments/${assignmentId}`);

    await supabase.from("assignment_payments").insert({
      invoice_id: invoiceId,
      assignment_id: assignmentId,
      notary_id: user.id,
      payment_date: paymentDate || new Date().toISOString().slice(0, 10),
      amount,
      payment_method: paymentMethod || null,
      reference: reference || null,
      notes: notes || null,
    });

    const { data: paymentRows } = await supabase
      .from("assignment_payments")
      .select("amount")
      .eq("invoice_id", invoiceId)
      .eq("notary_id", user.id);

    const paymentsTotal = (paymentRows ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    const totalDue = Number(invoice.subtotal ?? 0);
    const balanceDue = totalDue - paymentsTotal;

    await supabase
      .from("assignment_invoices")
      .update({
        payments_total: paymentsTotal,
        balance_due: balanceDue,
        status: balanceDue <= 0 ? "paid" : "unpaid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("notary_id", user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: profile?.full_name || profile?.email || "Notary",
      actor_role: "notary",
      action: "Invoice Payment Added",
      details: [
        `Payment: ${formatMoney(amount)}`,
        paymentMethod ? `Method: ${paymentMethod}` : null,
        reference ? `Reference: ${reference}` : null,
        `Balance Due: ${formatMoney(balanceDue)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
  }

  async function deleteInvoicePayment(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const invoiceId = String(formData.get("invoice_id") ?? "").trim();
    const paymentId = String(formData.get("payment_id") ?? "").trim();

    if (!assignmentId || !invoiceId || !paymentId) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: invoice } = await supabase
      .from("assignment_invoices")
      .select("id, subtotal, mileage_total, expenses_total, status")
      .eq("id", invoiceId)
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id)
      .single();

    if (!invoice) redirect(`/notary/assignments/${assignmentId}`);

    const { data: deletedPayment } = await supabase
      .from("assignment_payments")
      .delete()
      .eq("id", paymentId)
      .eq("invoice_id", invoiceId)
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id)
      .select("amount, payment_method, reference")
      .maybeSingle();

    const { data: paymentRows } = await supabase
      .from("assignment_payments")
      .select("amount")
      .eq("invoice_id", invoiceId)
      .eq("notary_id", user.id);

    const paymentsTotal = (paymentRows ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    const totalDue = Number(invoice.subtotal ?? 0);
    const balanceDue = totalDue - paymentsTotal;
    const currentStatus = String(invoice.status ?? "draft").toLowerCase();
    const nextStatus =
      currentStatus === "not_required"
        ? "not_required"
        : balanceDue <= 0 && paymentsTotal > 0
          ? "paid"
          : totalDue > 0
            ? "unpaid"
            : "draft";

    await supabase
      .from("assignment_invoices")
      .update({
        payments_total: paymentsTotal,
        balance_due: balanceDue,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("notary_id", user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: profile?.full_name || profile?.email || "Notary",
      actor_role: "notary",
      action: "Invoice Payment Removed",
      details: [
        deletedPayment?.amount ? `Removed Payment: ${formatMoney(deletedPayment.amount)}` : "Payment removed.",
        deletedPayment?.payment_method ? `Method: ${deletedPayment.payment_method}` : null,
        deletedPayment?.reference ? `Reference: ${deletedPayment.reference}` : null,
        `Balance Due: ${formatMoney(balanceDue)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
  }



  async function saveMileageEntry(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const invoiceId = String(formData.get("invoice_id") ?? "").trim();
    const mileageDate = String(formData.get("mileage_date") ?? "").trim();
    const startingLocation = String(formData.get("mileage_starting_location") ?? "").trim();
    const destinationLocation = String(formData.get("mileage_destination_location") ?? "").trim();
    const miles = Number(formData.get("mileage_miles") ?? 0);
    const rate = Number(formData.get("mileage_rate") ?? FEDERAL_MILEAGE_RATE);
    const notes = String(formData.get("mileage_notes") ?? "").trim();

    if (!assignmentId || !Number.isFinite(miles) || miles <= 0) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, borrower_name, control_number, notary_fee")
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
      .single();

    if (!assignment) redirect("/notary/assignments");

    const { data: notaryProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const { data: notaryProfileDetails } = await supabase
      .from("notary_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const defaultStartingLocation =
      buildBusinessLocation(notaryProfile as Record<string, any> | null) ||
      buildBusinessLocation(notaryProfileDetails as Record<string, any> | null);
    const finalStartingLocation = startingLocation || defaultStartingLocation;
    const cleanRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
    const amount = miles * cleanRate;
    const mileageDescription = [
      finalStartingLocation && destinationLocation
        ? `${finalStartingLocation} to ${destinationLocation}`
        : null,
      notes,
    ]
      .filter(Boolean)
      .join(" | ");

    await supabase.from("assignment_mileage").insert({
      assignment_id: assignmentId,
      notary_id: user.id,
      mileage_date: mileageDate || new Date().toISOString().slice(0, 10),
      miles,
      rate: cleanRate,
      amount,
      notes: mileageDescription || null,
    });

    if (invoiceId) {
      const { data: invoice } = await supabase
        .from("assignment_invoices")
        .select("id, subtotal, expenses_total, payments_total, status")
        .eq("id", invoiceId)
        .eq("assignment_id", assignmentId)
        .eq("notary_id", user.id)
        .maybeSingle();

      if (invoice) {
        const { data: mileageRows } = await supabase
          .from("assignment_mileage")
          .select("amount")
          .eq("assignment_id", assignmentId)
          .eq("notary_id", user.id);

        const mileageTotal = (mileageRows ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0,
        );
        const totalDue = Number(invoice.subtotal ?? 0);
        const balanceDue = totalDue - Number(invoice.payments_total ?? 0);
        const currentStatus = String(invoice.status ?? "draft").toLowerCase();
        const nextStatus =
          currentStatus === "not_required"
            ? "not_required"
            : balanceDue <= 0 && Number(invoice.payments_total ?? 0) > 0
              ? "paid"
              : totalDue > 0
                ? "unpaid"
                : "draft";

        await supabase
          .from("assignment_invoices")
          .update({
            mileage_total: mileageTotal,
            balance_due: balanceDue,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId)
          .eq("notary_id", user.id);
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: profile?.full_name || profile?.email || "Notary",
      actor_role: "notary",
      action: "Mileage Added",
      details: [
        `Miles: ${miles.toFixed(2)}`,
        `Rate: ${formatMoney(cleanRate)}`,
        `Amount: ${formatMoney(amount)}`,
        finalStartingLocation ? `From: ${finalStartingLocation}` : null,
        destinationLocation ? `To: ${destinationLocation}` : null,
        notes ? `Notes: ${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
  }

  async function deleteMileageEntry(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const invoiceId = String(formData.get("invoice_id") ?? "").trim();
    const mileageId = String(formData.get("mileage_id") ?? "").trim();

    if (!assignmentId || !mileageId) {
      redirect(`/notary/assignments/${assignmentId || id}#assignment-workspace`);
    }

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
      .maybeSingle();

    if (!assignment) redirect("/notary/assignments");

    const {
      data: deletedMileage,
      error: deleteMileageError,
    } = await supabaseAdmin
      .from("assignment_mileage")
      .delete()
      .eq("id", mileageId)
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id)
      .select("miles, rate, amount, notes")
      .maybeSingle();

    if (deleteMileageError) {
      console.error("Mileage delete error:", deleteMileageError);

      await supabaseAdmin.from("assignment_activity").insert({
        assignment_id: assignmentId,
        actor_id: user.id,
        actor_name: user.email || "Notary",
        actor_role: "notary",
        action: "Mileage Remove Failed",
        details: deleteMileageError.message,
      });

      revalidatePath(`/notary/assignments/${assignmentId}`);
      redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
    }

    if (invoiceId) {
      const { data: invoice, error: invoiceFetchError } = await supabaseAdmin
        .from("assignment_invoices")
        .select("id, subtotal, expenses_total, payments_total, status")
        .eq("id", invoiceId)
        .eq("assignment_id", assignmentId)
        .eq("notary_id", user.id)
        .maybeSingle();

      if (invoiceFetchError) {
        console.error("Mileage delete invoice fetch error:", invoiceFetchError);
      }

      if (invoice) {
        const { data: mileageRows, error: mileageRowsError } = await supabaseAdmin
          .from("assignment_mileage")
          .select("amount")
          .eq("assignment_id", assignmentId)
          .eq("notary_id", user.id);

        if (mileageRowsError) {
          console.error("Mileage delete total refresh error:", mileageRowsError);
        }

        const mileageTotal = (mileageRows ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0,
        );
        const totalDue = Number(invoice.subtotal ?? 0);
        const balanceDue = totalDue - Number(invoice.payments_total ?? 0);
        const currentStatus = String(invoice.status ?? "draft").toLowerCase();
        const nextStatus =
          currentStatus === "not_required"
            ? "not_required"
            : balanceDue <= 0 && Number(invoice.payments_total ?? 0) > 0
              ? "paid"
              : totalDue > 0
                ? "unpaid"
                : "draft";

        const { error: invoiceUpdateError } = await supabaseAdmin
          .from("assignment_invoices")
          .update({
            mileage_total: mileageTotal,
            balance_due: balanceDue,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId)
          .eq("notary_id", user.id);

        if (invoiceUpdateError) {
          console.error("Mileage delete invoice update error:", invoiceUpdateError);
        }
      }
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    await supabaseAdmin.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: profile?.full_name || profile?.email || "Notary",
      actor_role: "notary",
      action: "Mileage Removed",
      details: [
        deletedMileage?.miles
          ? `Miles: ${Number(deletedMileage.miles).toFixed(2)}`
          : "Mileage entry removed.",
        deletedMileage?.amount ? `Amount: ${formatMoney(deletedMileage.amount)}` : null,
        deletedMileage?.notes ? `Notes: ${deletedMileage.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
  }


  async function saveNotarialActs(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const noActs = formData.get("no_notarial_acts") === "on";
    const dates = formData.getAll("notarial_act_date").map((value) => String(value).trim());
    const counts = formData.getAll("notarial_act_count").map((value) => Number(value));
    const fees = formData.getAll("notarial_act_fee").map((value) => Number(value));

    if (!assignmentId) redirect(`/notary/assignments/${id}#assignment-workspace`);

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, borrower_name, signing_date")
      .eq("id", assignmentId)
      .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
      .maybeSingle();

    if (!assignment) redirect("/notary/assignments");

    const { error: deleteExistingError } = await supabaseAdmin
      .from("assignment_notarial_acts")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id);

    if (deleteExistingError) {
      console.error("Notarial acts reset error:", deleteExistingError);
      revalidatePath(`/notary/assignments/${assignmentId}`);
      redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
    }

    const rows = noActs
      ? []
      : counts
          .map((count, index) => {
            const cleanCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
            const cleanFee = Number.isFinite(fees[index]) && fees[index] >= 0
              ? Number(fees[index])
              : INDIANA_NOTARIAL_ACT_FEE;
            const amount = Math.round(cleanCount * cleanFee * 100) / 100;

            if (cleanCount <= 0) return null;

            return {
              assignment_id: assignmentId,
              notary_id: user.id,
              act_date: dates[index] || assignment.signing_date || new Date().toISOString().slice(0, 10),
              acts_count: cleanCount,
              fee_per_act: cleanFee,
              amount,
              sort_order: index,
            };
          })
          .filter(
            (row): row is {
              assignment_id: string;
              notary_id: string;
              act_date: string;
              acts_count: number;
              fee_per_act: number;
              amount: number;
              sort_order: number;
            } => row !== null,
          );

    if (rows.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("assignment_notarial_acts")
        .insert(rows);

      if (insertError) {
        console.error("Notarial acts insert error:", insertError);
        revalidatePath(`/notary/assignments/${assignmentId}`);
        redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
      }
    }

    const totalActs = rows.reduce((sum, row: any) => sum + Number(row?.acts_count ?? 0), 0);
    const totalFees = rows.reduce((sum, row: any) => sum + Number(row?.amount ?? 0), 0);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    await supabaseAdmin.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: profile?.full_name || profile?.email || "Notary",
      actor_role: "notary",
      action: "Notarial Acts Saved",
      details: noActs
        ? "No notarial acts for this signing."
        : [
            `Acts: ${totalActs}`,
            `Fee Per Act: ${formatMoney(INDIANA_NOTARIAL_ACT_FEE)}`,
            `Total Notarial Fees: ${formatMoney(totalFees)}`,
          ].join("\n"),
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}#assignment-workspace`);
  }


  async function saveExpenseEntry(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const invoiceId = String(formData.get("invoice_id") ?? "").trim();
    const expenseDate = String(formData.get("expense_date") ?? "").trim();
    const selectedCategory = String(formData.get("expense_category") ?? "").trim();
    const customCategory = String(formData.get("expense_custom_category") ?? "").trim();
    const amount = Number(formData.get("expense_amount") ?? 0);
    const vendor = String(formData.get("expense_vendor") ?? "").trim();
    const notes = String(formData.get("expense_notes") ?? "").trim();
    const receiptFile = formData.get("expense_receipt");

    if (!assignmentId || !Number.isFinite(amount) || amount <= 0) {
      redirect(`/notary/assignments/${assignmentId || id}#assignment-workspace`);
    }

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
      .maybeSingle();

    if (!assignment) redirect("/notary/assignments");

    const cleanCategory = customCategory || selectedCategory || "Misc.";
    const cleanAmount = Math.round(amount * 100) / 100;

    const { data: insertedExpense, error: insertExpenseError } = await supabaseAdmin
      .from("assignment_expenses")
      .insert({
        assignment_id: assignmentId,
        notary_id: user.id,
        expense_date: expenseDate || new Date().toISOString().slice(0, 10),
        category: cleanCategory,
        description: notes || vendor || cleanCategory,
        amount: cleanAmount,
        vendor: vendor || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (insertExpenseError || !insertedExpense?.id) {
      console.error("Expense insert error:", insertExpenseError);
      const message = encodeURIComponent(
        insertExpenseError?.message || "Expense could not be saved.",
      );
      revalidatePath(`/notary/assignments/${assignmentId}`);
      redirect(
        `/notary/assignments/${assignmentId}?workspace=expenses&expense_error=${message}#assignment-workspace`,
      );
    }

    if (receiptFile instanceof File && receiptFile.size > 0) {
      const allowedReceiptTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
      ];

      if (!allowedReceiptTypes.includes(receiptFile.type)) {
        const message = encodeURIComponent(
          "Expense saved, but receipt must be a PDF, PNG, JPG, JPEG, or WEBP file.",
        );
        revalidatePath(`/notary/assignments/${assignmentId}`);
        redirect(
          `/notary/assignments/${assignmentId}?workspace=expenses&expense_error=${message}#assignment-workspace`,
        );
      }

      const maxReceiptSizeBytes = 10 * 1024 * 1024;

      if (receiptFile.size > maxReceiptSizeBytes) {
        const message = encodeURIComponent(
          "Expense saved, but receipt must be 10MB or smaller.",
        );
        revalidatePath(`/notary/assignments/${assignmentId}`);
        redirect(
          `/notary/assignments/${assignmentId}?workspace=expenses&expense_error=${message}#assignment-workspace`,
        );
      }

      const fileExt = receiptFile.name.split(".").pop() || "receipt";
      const receiptPath = `${user.id}/${assignmentId}/${insertedExpense.id}-${Date.now()}-${safeFileName(receiptFile.name || `receipt.${fileExt}`)}`;

      const { error: receiptUploadError } = await supabaseAdmin.storage
        .from("expense-receipts")
        .upload(receiptPath, receiptFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: receiptFile.type || "application/octet-stream",
        });

      if (receiptUploadError) {
        console.error("Expense receipt upload error:", receiptUploadError);
        const message = encodeURIComponent(
          `Expense saved, but receipt upload failed: ${receiptUploadError.message}`,
        );
        revalidatePath(`/notary/assignments/${assignmentId}`);
        redirect(
          `/notary/assignments/${assignmentId}?workspace=expenses&expense_error=${message}#assignment-workspace`,
        );
      }

      const { error: receiptUpdateError } = await supabaseAdmin
        .from("assignment_expenses")
        .update({
          receipt_file_path: receiptPath,
          receipt_file_name: receiptFile.name || "Receipt",
          receipt_mime_type: receiptFile.type || null,
          receipt_size_bytes: receiptFile.size,
          updated_at: new Date().toISOString(),
        })
        .eq("id", insertedExpense.id)
        .eq("assignment_id", assignmentId)
        .eq("notary_id", user.id);

      if (receiptUpdateError) {
        console.error("Expense receipt save error:", receiptUpdateError);
        const message = encodeURIComponent(
          `Expense saved, but receipt metadata could not be attached: ${receiptUpdateError.message}`,
        );
        revalidatePath(`/notary/assignments/${assignmentId}`);
        redirect(
          `/notary/assignments/${assignmentId}?workspace=expenses&expense_error=${message}#assignment-workspace`,
        );
      }
    }

    if (invoiceId) {
      const { data: invoice } = await supabaseAdmin
        .from("assignment_invoices")
        .select("id, subtotal, mileage_total, payments_total, status")
        .eq("id", invoiceId)
        .eq("assignment_id", assignmentId)
        .eq("notary_id", user.id)
        .maybeSingle();

      if (invoice) {
        const { data: expenseRows } = await supabaseAdmin
          .from("assignment_expenses")
          .select("amount")
          .eq("assignment_id", assignmentId)
          .eq("notary_id", user.id);

        const expensesTotal = (expenseRows ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0,
        );
        const totalDue = Number(invoice.subtotal ?? 0);
        const balanceDue = totalDue - Number(invoice.payments_total ?? 0);
        const currentStatus = String(invoice.status ?? "draft").toLowerCase();
        const nextStatus =
          currentStatus === "not_required"
            ? "not_required"
            : balanceDue <= 0 && Number(invoice.payments_total ?? 0) > 0
              ? "paid"
              : totalDue > 0
                ? "unpaid"
                : "draft";

        await supabaseAdmin
          .from("assignment_invoices")
          .update({
            expenses_total: expensesTotal,
            balance_due: balanceDue,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId)
          .eq("notary_id", user.id);
      }
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    await supabaseAdmin.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: profile?.full_name || profile?.email || "Notary",
      actor_role: "notary",
      action: "Expense Added",
      details: [
        `Category: ${cleanCategory}`,
        `Amount: ${formatMoney(cleanAmount)}`,
        vendor ? `Vendor: ${vendor}` : null,
        notes ? `Notes: ${notes}` : null,
        receiptFile instanceof File && receiptFile.size > 0
          ? `Receipt: ${receiptFile.name || "Attached"}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}?workspace=expenses&expense_saved=1#assignment-workspace`);
  }

  async function deleteExpenseEntry(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "").trim();
    const invoiceId = String(formData.get("invoice_id") ?? "").trim();
    const expenseId = String(formData.get("expense_id") ?? "").trim();

    if (!assignmentId || !expenseId) {
      redirect(`/notary/assignments/${assignmentId || id}?workspace=expenses#assignment-workspace`);
    }

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
      .maybeSingle();

    if (!assignment) redirect("/notary/assignments");

    const { data: deletedExpense, error: deleteExpenseError } = await supabaseAdmin
      .from("assignment_expenses")
      .delete()
      .eq("id", expenseId)
      .eq("assignment_id", assignmentId)
      .eq("notary_id", user.id)
      .select("category, amount, vendor, notes, receipt_file_path, receipt_file_name")
      .maybeSingle();

    if (deleteExpenseError) {
      console.error("Expense delete error:", deleteExpenseError);
      revalidatePath(`/notary/assignments/${assignmentId}`);
      redirect(`/notary/assignments/${assignmentId}?workspace=expenses#assignment-workspace`);
    }

    if (deletedExpense?.receipt_file_path) {
      const { error: receiptRemoveError } = await supabaseAdmin.storage
        .from("expense-receipts")
        .remove([String(deletedExpense.receipt_file_path)]);

      if (receiptRemoveError) {
        console.error("Expense receipt remove error:", receiptRemoveError);
      }
    }

    if (invoiceId) {
      const { data: invoice } = await supabaseAdmin
        .from("assignment_invoices")
        .select("id, subtotal, mileage_total, payments_total, status")
        .eq("id", invoiceId)
        .eq("assignment_id", assignmentId)
        .eq("notary_id", user.id)
        .maybeSingle();

      if (invoice) {
        const { data: expenseRows } = await supabaseAdmin
          .from("assignment_expenses")
          .select("amount")
          .eq("assignment_id", assignmentId)
          .eq("notary_id", user.id);

        const expensesTotal = (expenseRows ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0,
        );
        const totalDue = Number(invoice.subtotal ?? 0);
        const balanceDue = totalDue - Number(invoice.payments_total ?? 0);
        const currentStatus = String(invoice.status ?? "draft").toLowerCase();
        const nextStatus =
          currentStatus === "not_required"
            ? "not_required"
            : balanceDue <= 0 && Number(invoice.payments_total ?? 0) > 0
              ? "paid"
              : totalDue > 0
                ? "unpaid"
                : "draft";

        await supabaseAdmin
          .from("assignment_invoices")
          .update({
            expenses_total: expensesTotal,
            balance_due: balanceDue,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId)
          .eq("notary_id", user.id);
      }
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    await supabaseAdmin.from("assignment_activity").insert({
      assignment_id: assignmentId,
      actor_id: user.id,
      actor_name: profile?.full_name || profile?.email || "Notary",
      actor_role: "notary",
      action: "Expense Removed",
      details: [
        deletedExpense?.category ? `Category: ${deletedExpense.category}` : "Expense removed.",
        deletedExpense?.amount ? `Amount: ${formatMoney(deletedExpense.amount)}` : null,
        deletedExpense?.vendor ? `Vendor: ${deletedExpense.vendor}` : null,
        deletedExpense?.notes ? `Notes: ${deletedExpense.notes}` : null,
        deletedExpense?.receipt_file_name
          ? `Receipt Removed: ${deletedExpense.receipt_file_name}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    revalidatePath(`/notary/assignments/${assignmentId}`);
    redirect(`/notary/assignments/${assignmentId}?workspace=expenses#assignment-workspace`);
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

  const { data: notaryProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: notaryProfileDetails } = await supabase
    .from("notary_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const notaryBusinessLocation =
    buildBusinessLocation(notaryProfile as Record<string, any> | null) ||
    buildBusinessLocation(notaryProfileDetails as Record<string, any> | null);

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

  const todayForInvoice = new Date().toISOString().slice(0, 10);
  const defaultInvoiceDate = assignment.signing_date ?? todayForInvoice;
  const defaultInvoiceDueDate = addDaysToDate(defaultInvoiceDate, 14);
  const startingInvoiceFee = Number(assignment.notary_fee ?? 0);

  let { data: assignmentInvoice } = await supabase
    .from("assignment_invoices")
    .select("*")
    .eq("assignment_id", assignment.id)
    .eq("notary_id", user.id)
    .maybeSingle();

  if (!assignmentInvoice && hasInsPro) {
    const { data: insertedInvoice } = await supabase
      .from("assignment_invoices")
      .insert({
        assignment_id: assignment.id,
        notary_id: user.id,
        invoice_date: defaultInvoiceDate,
        due_date: defaultInvoiceDueDate || null,
        status: startingInvoiceFee > 0 ? "unpaid" : "draft",
        subtotal: startingInvoiceFee,
        balance_due: startingInvoiceFee,
      })
      .select("*")
      .single();

    assignmentInvoice = insertedInvoice;

    if (insertedInvoice?.id && startingInvoiceFee > 0) {
      await supabase.from("assignment_invoice_items").insert({
        invoice_id: insertedInvoice.id,
        assignment_id: assignment.id,
        notary_id: user.id,
        description: `Signing fee for ${assignment.borrower_name || assignment.control_number || "assignment"}`,
        quantity: 1,
        unit_price: startingInvoiceFee,
        line_total: startingInvoiceFee,
        sort_order: 0,
      });
    }
  }

  const { data: invoiceItems } = assignmentInvoice?.id
    ? await supabase
        .from("assignment_invoice_items")
        .select("*")
        .eq("invoice_id", assignmentInvoice.id)
        .eq("notary_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: invoicePayments } = assignmentInvoice?.id
    ? await supabase
        .from("assignment_payments")
        .select("*")
        .eq("invoice_id", assignmentInvoice.id)
        .eq("notary_id", user.id)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: invoiceExpenses } = await supabaseAdmin
    .from("assignment_expenses")
    .select("*")
    .eq("assignment_id", assignment.id)
    .eq("notary_id", user.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const { count: existingMileageCount } = await supabase
    .from("assignment_mileage")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignment.id)
    .eq("notary_id", user.id);

  let automaticMileageStatus:
    | "saved"
    | "already_saved"
    | "missing_addresses"
    | "not_available"
    | "failed" = "not_available";
  let automaticMileageMessage = "Automatic mileage has not run yet.";

  if ((existingMileageCount ?? 0) > 0) {
    automaticMileageStatus = "already_saved";
    automaticMileageMessage =
      "Mileage is already saved for this assignment, so Google was not called again.";
  } else if (!notaryBusinessLocation || !signingLocation) {
    automaticMileageStatus = "missing_addresses";
    automaticMileageMessage =
      "Automatic mileage needs both a complete Business Location and signing destination.";
  }

  if (
    hasInsPro &&
    assignmentInvoice?.id &&
    (existingMileageCount ?? 0) === 0 &&
    notaryBusinessLocation &&
    signingLocation
  ) {
    const calculatedMileage = await calculateGoogleMileageRoute({
      origin: notaryBusinessLocation,
      destination: signingLocation,
    });

    if (calculatedMileage?.miles) {
      const mileageNotes = [
        `Auto-calculated by Google Maps: ${notaryBusinessLocation} to ${signingLocation}`,
        calculatedMileage.distanceText
          ? `Distance: ${calculatedMileage.distanceText}`
          : null,
        calculatedMileage.durationText
          ? `Estimated drive time: ${calculatedMileage.durationText}`
          : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const { error: autoMileageInsertError } = await supabaseAdmin
        .from("assignment_mileage")
        .insert({
          assignment_id: assignment.id,
          notary_id: user.id,
          mileage_date: assignment.signing_date || todayForInvoice,
          miles: calculatedMileage.miles,
          rate: FEDERAL_MILEAGE_RATE,
          amount: calculatedMileage.amount,
          notes: mileageNotes,
        });

      if (autoMileageInsertError) {
        console.error("Automatic mileage insert error:", autoMileageInsertError);
        automaticMileageStatus = "failed";
        automaticMileageMessage =
          autoMileageInsertError.message ||
          "Google calculated mileage, but INS Pro could not save it.";
      } else {
        const currentInvoiceSubtotal = Number(assignmentInvoice.subtotal ?? 0);
        const currentExpensesTotal = (invoiceExpenses ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0,
        );
        const currentPaymentsTotal = (invoicePayments ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0,
        );
        const nextMileageTotal = calculatedMileage.amount;
        const nextBalanceDue = currentInvoiceSubtotal - currentPaymentsTotal;
        const currentStatus = String(assignmentInvoice.status ?? "draft").toLowerCase();
        const nextStatus =
          currentStatus === "not_required"
            ? "not_required"
            : nextBalanceDue <= 0 && currentPaymentsTotal > 0
              ? "paid"
              : currentInvoiceSubtotal > 0
                ? "unpaid"
                : "draft";

        const { error: invoiceMileageUpdateError } = await supabaseAdmin
          .from("assignment_invoices")
          .update({
            mileage_total: nextMileageTotal,
            balance_due: nextBalanceDue,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", assignmentInvoice.id)
          .eq("notary_id", user.id);

        if (invoiceMileageUpdateError) {
          console.error(
            "Automatic mileage invoice update error:",
            invoiceMileageUpdateError,
          );
        }

        automaticMileageStatus = "saved";
        automaticMileageMessage = `${calculatedMileage.distanceText || `${calculatedMileage.miles.toFixed(2)} mi`} saved from Google Maps${
          calculatedMileage.durationText
            ? ` with estimated drive time ${calculatedMileage.durationText}`
            : ""
        }.`;
      }
    } else {
      automaticMileageStatus = "failed";
      automaticMileageMessage =
        "Google could not calculate a driving route for these addresses. Check the addresses or enter miles manually.";
    }
  }

  const { data: invoiceMileage } = await supabase
    .from("assignment_mileage")
    .select("*")
    .eq("assignment_id", assignment.id)
    .eq("notary_id", user.id)
    .order("mileage_date", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: savedNotarialActs } = await supabase
    .from("assignment_notarial_acts")
    .select("*")
    .eq("assignment_id", assignment.id)
    .eq("notary_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const invoiceItemRows = invoiceItems ?? [];
  const invoicePaymentRows = invoicePayments ?? [];
  const invoiceExpenseRows = await Promise.all(
    (invoiceExpenses ?? []).map(async (row: any) => {
      if (!row.receipt_file_path) {
        return { ...row, receiptSignedUrl: null };
      }

      const { data: receiptUrlData, error: receiptUrlError } = await supabaseAdmin.storage
        .from("expense-receipts")
        .createSignedUrl(String(row.receipt_file_path), 60 * 60);

      if (receiptUrlError) {
        console.error("Expense receipt signed URL error:", receiptUrlError);
      }

      return {
        ...row,
        receiptSignedUrl: receiptUrlData?.signedUrl ?? null,
      };
    }),
  );
  const invoiceMileageRows = invoiceMileage ?? [];
  const notarialActRows = savedNotarialActs ?? [];
  const notarialActsTotalCount = notarialActRows.reduce(
    (sum, row) => sum + Number(row.acts_count ?? 0),
    0,
  );
  const notarialActsTotalFees = notarialActRows.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  const notarialActFormRows =
    notarialActRows.length > 0 ? notarialActRows : [null, null];
  const latestMileageRow = invoiceMileageRows[0] ?? null;
  const latestMileageMiles = Number(latestMileageRow?.miles ?? 0);
  const latestMileageRate = Number(latestMileageRow?.rate ?? FEDERAL_MILEAGE_RATE);
  const latestMileageAmount =
    latestMileageMiles > 0 && latestMileageRate >= 0
      ? latestMileageMiles * latestMileageRate
      : 0;
  const invoiceSubtotal = Number(
    assignmentInvoice?.subtotal ??
      invoiceItemRows.reduce((sum, item) => sum + Number(item.line_total ?? 0), 0),
  );
  const invoiceMileageTotal = invoiceMileageRows.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  const invoiceExpensesTotal = invoiceExpenseRows.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  const invoicePaymentsTotal = invoicePaymentRows.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  const invoiceBalanceDue = invoiceSubtotal - invoicePaymentsTotal;
  const invoiceDescription =
    invoiceItemRows[0]?.description ||
    [
      `${formatInputDate(assignment.signing_date) || "Signing"} - Signing fee for ${assignment.control_number || "order"} ${assignment.borrower_name || ""}`.trim(),
      signingLocation ? `(${signingLocation})` : null,
    ]
      .filter(Boolean)
      .join(" ");
  const billToLines = [
    titleCompanyName !== "—" ? titleCompanyName : null,
    titleCompanyContact !== "—" ? titleCompanyContact : null,
    titleCompanyEmail !== "—" ? titleCompanyEmail : null,
    titleCompanyPhone !== "—" ? titleCompanyPhone : null,
  ].filter(Boolean);
  const invoiceTotalDue = invoiceSubtotal;
  const invoiceEmailTo = titleCompanyEmail !== "—" ? titleCompanyEmail : "";
  const invoiceEmailSubject = `Invoice - ${assignment.borrower_name || "Signing"} - ${assignment.control_number || formatInvoiceNumber(assignmentInvoice?.invoice_number)}`;
  const invoiceEmailBody = [
    "Hello,",
    "",
    `Please find the invoice for the order for ${assignment.borrower_name || "the signer"}.`,
    "",
    "If this order was processed through a signing platform with direct payment, or if payment has already been received, please disregard this email.",
    "",
    "Thank you for your business and continued trust in Indiana Notary Solutions, LLC.",
    "",
    "Brandon Nelson",
    "Indiana Notary Solutions, LLC",
    "502-807-8123",
    "BNelson@IndianaNotarySolutions.com",
    "https://www.IndianaNotarySolutions.com",
  ].join("\n");
  const invoiceMailtoHref = `mailto:${encodeURIComponent(invoiceEmailTo)}?subject=${encodeURIComponent(invoiceEmailSubject)}&body=${encodeURIComponent(invoiceEmailBody)}`;


  const printNotaryName = firstTextValue(
    notaryProfile?.full_name,
    notaryProfileDetails?.full_name,
    [notaryProfileDetails?.first_name, notaryProfileDetails?.last_name]
      .filter(Boolean)
      .join(" "),
    user.email,
  );
  const printNotaryPhone = firstTextValue(
    notaryProfileDetails?.mobile_phone,
    notaryProfileDetails?.phone,
    notaryProfile?.phone,
    notaryProfile?.phone_number,
  );
  const printNotaryEmail = firstTextValue(notaryProfile?.email, user.email);
  const signerEmail = firstTextValue(
    assignment.borrower_email,
    assignment.signer_email,
    assignment.borrower_contact_email,
  );
  const propertyAddress = [
    optionalTextValue(
      assignment.property_address,
      assignment.property_street_address,
      assignment.subject_property_address,
    ),
    [
      optionalTextValue(assignment.property_city, assignment.subject_property_city),
      optionalTextValue(assignment.property_state, assignment.subject_property_state),
      optionalTextValue(
        assignment.property_zip,
        assignment.property_zip_code,
        assignment.subject_property_zip,
      ),
    ]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const signingPlatform = firstTextValue(
    assignment.signing_platform,
    assignment.platform,
    assignment.source_platform,
    assignment.vendor_platform,
  );
  const printInstructions = optionalTextValue(
    assignment.special_instructions,
    assignment.instructions,
    assignment.signing_instructions,
    assignment.order_instructions,
    assignment.notes,
    assignment.client_notes,
  );
  const printActivityNotes = (activity ?? []).slice(0, 8);
  const printUploadedDocsCount = documentsWithUrls.length;
  const printTitleDocsCount = titleDocumentsWithUrls.length;
  const printAssignmentUrl = `${getBaseUrl()}/notary/assignments/${assignment.id}`;
  const printQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(printAssignmentUrl)}`;
  const printNotaryLogoUrl = optionalTextValue(
    notaryProfile?.logo_url,
    notaryProfile?.business_logo_url,
    notaryProfile?.profile_logo_url,
    notaryProfileDetails?.logo_url,
    notaryProfileDetails?.business_logo_url,
    notaryProfileDetails?.profile_logo_url,
  );

  let { data: journalEntry } = await supabase
    .from("assignment_journal_entries")
    .select("id, status, updated_at, completed_at, journal_date, journal_time, journal_type, location_mode, address, city, state, zip, notes")
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
      .select("id, status, updated_at, completed_at, journal_date, journal_time, journal_type, location_mode, address, city, state, zip, notes")
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
    signature_data: savedPrimaryJournalPerson?.signature_data ?? null,
    signed_at: savedPrimaryJournalPerson?.signed_at ?? null,
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

  const journalStatus = String(journalEntry?.status ?? "open").toLowerCase();
  const journalIsComplete = journalStatus === "completed";
  const signedJournalPeopleCount = displayJournalPeople.filter(
    (person) => String(person.signature_data ?? "").startsWith("data:image/"),
  ).length;

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
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6 print:bg-white print:p-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden !important; }

              body:not([data-print-mode]) #invoice-print-area,
              body:not([data-print-mode]) #invoice-print-area *,
              body[data-print-mode="invoice"] #invoice-print-area,
              body[data-print-mode="invoice"] #invoice-print-area * {
                visibility: visible !important;
              }

              body:not([data-print-mode]) #invoice-print-area,
              body[data-print-mode="invoice"] #invoice-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                display: block !important;
                width: 100% !important;
                border: 0 !important;
                box-shadow: none !important;
              }

              body[data-print-mode="signing"] #signing-print-area,
              body[data-print-mode="signing"] #signing-print-area *,
              body[data-print-mode="signing-with-invoice"] #signing-print-area,
              body[data-print-mode="signing-with-invoice"] #signing-print-area * {
                visibility: visible !important;
              }

              body[data-print-mode="signing"] #signing-print-area,
              body[data-print-mode="signing-with-invoice"] #signing-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                display: block !important;
                width: 100% !important;
                border: 0 !important;
                box-shadow: none !important;
              }

              body[data-print-mode="signing"] .print-invoice-optional,
              body[data-print-mode="signing"] .print-invoice-optional * {
                display: none !important;
                visibility: hidden !important;
              }

              .no-print { display: none !important; }
            }
          `,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            function updateMileageAmount() {
              var milesInput = document.getElementById("mileage-miles-input");
              var rateInput = document.getElementById("mileage-rate-input");
              var amountOutput = document.getElementById("mileage-amount-output");
              var amountHelper = document.getElementById("mileage-amount-helper");

              if (!milesInput || !rateInput || !amountOutput) return;

              var miles = parseFloat(milesInput.value || "0");
              var rate = parseFloat(rateInput.value || "0");
              var amount = 0;

              if (!isNaN(miles) && !isNaN(rate) && miles > 0 && rate >= 0) {
                amount = miles * rate;
              }

              amountOutput.textContent = "$" + amount.toFixed(2);

              if (amountHelper) {
                if (miles > 0 && rate >= 0) {
                  amountHelper.textContent = miles.toFixed(2) + " miles × $" + rate.toFixed(3) + " per mile";
                } else {
                  amountHelper.textContent = "Enter miles manually to calculate a new mileage amount.";
                }
              }
            }

            function updateNotarialActsAmount() {
              var rows = document.querySelectorAll('[data-notarial-row="true"]');
              var output = document.getElementById("notarial-acts-total-output");
              var helper = document.getElementById("notarial-acts-helper");
              var noActsCheckbox = document.getElementById("notarial-no-acts-checkbox");
              var disabled = Boolean(noActsCheckbox && noActsCheckbox.checked);
              var total = 0;
              var totalActs = 0;

              rows.forEach(function (row) {
                var countInput = row.querySelector('[data-notarial-count="true"]');
                var feeInput = row.querySelector('[data-notarial-fee="true"]');
                var rowOutput = row.querySelector('[data-notarial-row-amount="true"]');
                var removeButton = row.querySelector('[data-remove-notarial-row="true"]');
                var count = parseInt((countInput && countInput.value) || "0", 10);
                var fee = parseFloat((feeInput && feeInput.value) || "0");
                var rowTotal = 0;

                if (!isNaN(count) && !isNaN(fee) && count > 0 && fee >= 0) {
                  totalActs += count;
                  rowTotal = count * fee;
                  total += rowTotal;
                }

                if (rowOutput) rowOutput.textContent = "$" + rowTotal.toFixed(2);

                if (countInput) {
                  countInput.disabled = disabled;
                  if (disabled) countInput.value = "";
                }

                if (feeInput) feeInput.disabled = disabled;
                if (removeButton) removeButton.disabled = disabled;
              });

              if (output) output.textContent = "$" + total.toFixed(2);
              if (helper) {
                helper.textContent = totalActs > 0
                  ? totalActs + " act" + (totalActs === 1 ? "" : "s") + " × Indiana max fee"
                  : "Enter notarial acts to calculate the fee.";
              }

              if (disabled) {
                if (output) output.textContent = "$0.00";
                if (helper) helper.textContent = "No notarial acts for this signing.";
              }
            }

            function addNotarialActsRow() {
              var table = document.getElementById("notarial-acts-table");
              if (!table) return;

              var defaultDate = table.getAttribute("data-default-date") || "";
              var defaultFee = table.getAttribute("data-default-fee") || "10.00";
              var row = document.createElement("div");
              row.setAttribute("data-notarial-row", "true");
              row.className = "grid grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,.9fr)_auto] gap-3 px-4 py-3 text-sm";
              row.innerHTML =
                '<input type="date" name="notarial_act_date" value="' + defaultDate + '" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100" />' +
                '<input type="number" name="notarial_act_count" min="0" step="1" data-notarial-count="true" placeholder="0" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100" />' +
                '<input type="number" name="notarial_act_fee" min="0" step="0.01" data-notarial-fee="true" value="' + defaultFee + '" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100" />' +
                '<p data-notarial-row-amount="true" class="flex items-center justify-end font-black text-[#0B1F4D]">$0.00</p>' +
                '<button type="button" data-remove-notarial-row="true" class="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Remove</button>';

              table.appendChild(row);
              updateNotarialActsAmount();
            }

            document.addEventListener("DOMContentLoaded", function () {
              updateMileageAmount();
              updateNotarialActsAmount();
            });

            document.addEventListener("click", async function (event) {
              var target = event.target;
              if (!target) return;

              if (target.id === "add-notarial-act-row-button") {
                addNotarialActsRow();
                return;
              }

              if (target.getAttribute && target.getAttribute("data-remove-notarial-row") === "true") {
                var row = target.closest('[data-notarial-row="true"]');
                if (row) row.remove();
                updateNotarialActsAmount();
                return;
              }

              if (target.id === "invoice-use-balance-button" || target.hasAttribute("data-use-balance-target")) {
                var amountTargetId = target.getAttribute("data-use-balance-target") || "invoice-payment-amount";
                var amountInput = document.getElementById(amountTargetId);
                if (!amountInput) return;

                amountInput.value = target.getAttribute("data-balance") || "0.00";
                amountInput.focus();
                return;
              }

              if (target.getAttribute && target.getAttribute("data-payment-method-save")) {
                var pickerName = target.getAttribute("data-payment-method-save");
                var targetInputId = target.getAttribute("data-payment-method-target");
                var modalId = target.getAttribute("data-payment-method-modal");
                var methodInput = targetInputId ? document.getElementById(targetInputId) : null;
                var selectedMethod = document.querySelector('input[data-payment-method-picker="' + pickerName + '"]:checked');

                if (methodInput && selectedMethod) {
                  methodInput.value = selectedMethod.value || "";
                  methodInput.dispatchEvent(new Event("input", { bubbles: true }));
                  methodInput.dispatchEvent(new Event("change", { bubbles: true }));
                }

                if (modalId) {
                  var modalCheckbox = document.getElementById(modalId);
                  if (modalCheckbox) modalCheckbox.checked = false;
                }

                return;
              }

              var printButton = target.closest ? target.closest("#print-signing-button") : null;
              if (printButton) {
                var includeInvoice = document.getElementById("print-include-invoice");
                var source = document.getElementById("signing-print-area");

                if (!source) {
                  alert("Printout content is missing. Refresh the page and try again.");
                  return;
                }

                var clonedSource = source.cloneNode(true);

                if (!(includeInvoice && includeInvoice.checked)) {
                  clonedSource
                    .querySelectorAll(".print-invoice-optional")
                    .forEach(function (section) {
                      section.remove();
                    });
                }

                var printHtml =
                  "<!doctype html>" +
                  "<html>" +
                  "<head>" +
                  "<meta charset='utf-8' />" +
                  "<title>Signing Summary - " +
                  (source.getAttribute("data-control-number") || "Assignment") +
                  "</title>" +
                  "<meta name='viewport' content='width=device-width, initial-scale=1' />" +
                  "</head>" +
                  "<body>" +
                  clonedSource.innerHTML +
                  "</body>" +
                  "</html>";

                var printBlob = new Blob([printHtml], { type: "text/html;charset=utf-8" });
                var printUrl = URL.createObjectURL(printBlob);
                var printWindow = window.open(printUrl, "_blank", "noopener,noreferrer,width=1100,height=900");

                if (!printWindow) {
                  URL.revokeObjectURL(printUrl);
                  alert("Popup blocked. Allow popups for Indiana Notary Solutions, then try again.");
                  return;
                }

                setTimeout(function () {
                  URL.revokeObjectURL(printUrl);
                }, 60000);

                return;
              }

              if (target.id === "calculate-mileage-button") {
                var originInput = document.getElementById("mileage-origin-input");
                var destinationInput = document.getElementById("mileage-destination-input");
                var milesInput = document.getElementById("mileage-miles-input");
                var routeHelper = document.getElementById("mileage-route-helper");
                var driveTimeOutput = document.getElementById("mileage-drive-time-output");

                if (!originInput || !destinationInput || !milesInput) return;

                var origin = (originInput.value || "").trim();
                var destination = (destinationInput.value || "").trim();

                if (!origin || !destination) {
                  if (routeHelper) routeHelper.textContent = "Enter both starting location and destination first.";
                  return;
                }

                var originalText = target.textContent || "Calculate Miles";
                target.disabled = true;
                target.classList.add("cursor-wait", "opacity-80");
                target.textContent = "Calculating...";

                if (routeHelper) routeHelper.textContent = "Getting driving distance from Google Maps...";
                if (driveTimeOutput) driveTimeOutput.textContent = "—";

                try {
                  var response = await fetch("/api/mileage/route", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ origin: origin, destination: destination }),
                  });

                  var data = await response.json();

                  if (!response.ok) {
                    throw new Error(data.error || "Unable to calculate route.");
                  }

                  milesInput.value = Number(data.miles || 0).toFixed(2);

                  if (driveTimeOutput) {
                    driveTimeOutput.textContent = data.durationText || "—";
                  }

                  if (routeHelper) {
                    routeHelper.textContent = (data.distanceText || (Number(data.miles || 0).toFixed(2) + " mi")) + " driving distance";
                  }

                  updateMileageAmount();
                } catch (error) {
                  if (routeHelper) routeHelper.textContent = error.message || "Unable to calculate mileage.";
                } finally {
                  target.disabled = false;
                  target.classList.remove("cursor-wait", "opacity-80");
                  target.textContent = originalText;
                }
              }
            });

            document.addEventListener("input", function (event) {
              var target = event.target;
              if (!target) return;

              if (target.id === "mileage-miles-input" || target.id === "mileage-rate-input") {
                updateMileageAmount();
                return;
              }

              if (
                target.getAttribute("data-notarial-count") === "true" ||
                target.getAttribute("data-notarial-fee") === "true" ||
                target.id === "notarial-no-acts-checkbox"
              ) {
                updateNotarialActsAmount();
              }
            });

            document.addEventListener("submit", function (event) {
              var form = event.target;
              if (!form || !(form instanceof HTMLFormElement)) return;

              var submitter = event.submitter;
              if (!submitter || !(submitter instanceof HTMLElement)) return;

              var busyText = submitter.getAttribute("data-busy-text");
              if (!busyText) return;

              submitter.setAttribute("aria-disabled", "true");
              if ("disabled" in submitter) {
                submitter.disabled = true;
              }

              submitter.classList.add("cursor-wait", "opacity-80");

              var originalText = submitter.textContent || "";
              submitter.setAttribute("data-original-text", originalText);

              submitter.innerHTML =
                '<span class="inline-flex items-center gap-2">' +
                '<span class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>' +
                '<span>' + busyText + '</span>' +
                '</span>';

              var paymentId = submitter.getAttribute("data-busy-payment-id");
              if (paymentId) {
                document
                  .querySelectorAll('[data-payment-container="' + paymentId + '"]')
                  .forEach(function (container) {
                    container.classList.add("opacity-50", "pointer-events-none");
                  });

                document
                  .querySelectorAll('[data-busy-payment-id="' + paymentId + '"]')
                  .forEach(function (button) {
                    if (button !== submitter && "disabled" in button) {
                      button.disabled = true;
                    }
                    button.classList.add("cursor-wait", "opacity-60");
                  });
              }

              var expenseId = submitter.getAttribute("data-busy-expense-id");
              if (expenseId) {
                document
                  .querySelectorAll('[data-expense-container="' + expenseId + '"]')
                  .forEach(function (container) {
                    container.classList.add("opacity-50", "pointer-events-none");
                  });

                document
                  .querySelectorAll('[data-busy-expense-id="' + expenseId + '"]')
                  .forEach(function (button) {
                    if (button !== submitter && "disabled" in button) {
                      button.disabled = true;
                    }
                    button.classList.add("cursor-wait", "opacity-60");
                  });
              }

              var mileageId = submitter.getAttribute("data-busy-mileage-id");
              if (mileageId) {
                document
                  .querySelectorAll('[data-mileage-container="' + mileageId + '"]')
                  .forEach(function (container) {
                    container.classList.add("opacity-50", "pointer-events-none");
                  });

                document
                  .querySelectorAll('[data-busy-mileage-id="' + mileageId + '"]')
                  .forEach(function (button) {
                    if (button !== submitter && "disabled" in button) {
                      button.disabled = true;
                    }
                    button.classList.add("cursor-wait", "opacity-60");
                  });
              }
            }, true);
          `,
        }}
      />
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

              <div className="mt-5 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 md:flex md:flex-wrap">
                {workspaceTabs.map((tab) => {
                  if (tab === "Journal") {
                    return (
                      <label
                        key={tab}
                        htmlFor="journal-workspace-modal"
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#0B1F4D] px-3 py-2 text-center text-sm font-bold leading-tight text-white ring-1 ring-[#0B1F4D] transition hover:bg-blue-950 md:shrink-0 md:px-4"
                      >
                        {tab}
                      </label>
                    );
                  }

                  if (tab === "Invoice") {
                    return (
                      <label
                        key={tab}
                        htmlFor="invoice-workspace-modal"
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#0B1F4D] px-3 py-2 text-center text-sm font-bold leading-tight text-white ring-1 ring-[#0B1F4D] transition hover:bg-blue-950 md:shrink-0 md:px-4"
                      >
                        {tab}
                      </label>
                    );
                  }

                  if (tab === "Mileage") {
                    return (
                      <label
                        key={tab}
                        htmlFor="mileage-workspace-modal"
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#0B1F4D] px-3 py-2 text-center text-sm font-bold leading-tight text-white ring-1 ring-[#0B1F4D] transition hover:bg-blue-950 md:shrink-0 md:px-4"
                      >
                        {tab}
                      </label>
                    );
                  }

                  if (tab === "Notarial Acts") {
                    return (
                      <label
                        key={tab}
                        htmlFor="notarial-acts-workspace-modal"
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#0B1F4D] px-3 py-2 text-center text-sm font-bold leading-tight text-white ring-1 ring-[#0B1F4D] transition hover:bg-blue-950 md:shrink-0 md:px-4"
                      >
                        {tab}
                      </label>
                    );
                  }

                  if (tab === "Expenses") {
                    return (
                      <label
                        key={tab}
                        htmlFor="expenses-workspace-modal"
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#0B1F4D] px-3 py-2 text-center text-sm font-bold leading-tight text-white ring-1 ring-[#0B1F4D] transition hover:bg-blue-950 md:shrink-0 md:px-4"
                      >
                        {tab}
                      </label>
                    );
                  }

                  if (tab === "Payments") {
                    return (
                      <label
                        key={tab}
                        htmlFor="payments-workspace-modal"
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#0B1F4D] px-3 py-2 text-center text-sm font-bold leading-tight text-white ring-1 ring-[#0B1F4D] transition hover:bg-blue-950 md:shrink-0 md:px-4"
                      >
                        {tab}
                      </label>
                    );
                  }

                  if (tab === "Print") {
                    return (
                      <label
                        key={tab}
                        htmlFor="print-workspace-modal"
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#0B1F4D] px-3 py-2 text-center text-sm font-bold leading-tight text-white ring-1 ring-[#0B1F4D] transition hover:bg-blue-950 md:shrink-0 md:px-4"
                      >
                        {tab}
                      </label>
                    );
                  }

                  return (
                    <span
                      key={tab}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-50 px-3 py-2 text-center text-sm font-bold leading-tight text-slate-400 ring-1 ring-slate-200 md:shrink-0 md:px-4"
                    >
                      {tab}
                    </span>
                  );
                })}
              </div>
            </div>

            {!hasInsPro ? (
              <div className="p-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-black uppercase tracking-wide text-amber-700">
                    INS Pro Feature
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-slate-950">
                    Please upgrade to use INS Pro features
                  </h3>
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
                <div>
                  <input
                    id="journal-workspace-modal"
                    type="checkbox"
                    className="peer/journal sr-only"
                  />
                  <input
                    id="invoice-workspace-modal"
                    type="checkbox"
                    className="peer/invoice sr-only"
                  />

                  <input
                    id="mileage-workspace-modal"
                    type="checkbox"
                    className="peer/mileage sr-only"
                  />

                  <input
                    id="notarial-acts-workspace-modal"
                    type="checkbox"
                    className="peer/notarial sr-only"
                  />

                  <input
                    id="expenses-workspace-modal"
                    type="checkbox"
                    defaultChecked={activeWorkspace === "expenses"}
                    className="peer/expenses sr-only"
                  />

                  <input
                    id="payments-workspace-modal"
                    type="checkbox"
                    className="peer/payments sr-only"
                  />

                  <input
                    id="print-workspace-modal"
                    type="checkbox"
                    className="peer/print sr-only"
                  />

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Workspace Status
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold sm:gap-3">
                      <span
                        className={`rounded-full px-3 py-1 ring-1 ${invoiceStatusBadge(assignmentInvoice?.status)}`}
                      >
                        Invoice {displayInvoiceStatus(assignmentInvoice?.status)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                        Balance {formatMoney(invoiceBalanceDue)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                        Mileage {formatMoney(invoiceMileageTotal)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                        Expenses {formatMoney(invoiceExpensesTotal)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                        Notarial Acts {notarialActsTotalCount}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                        Notarial Fees {formatMoney(notarialActsTotalFees)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ring-1 ${
                          journalIsComplete
                            ? "bg-green-50 text-green-700 ring-green-200"
                            : "bg-amber-50 text-amber-700 ring-amber-200"
                        }`}
                      >
                        {journalIsComplete ? "Journal Complete" : "Journal Open"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                        {displayJournalPeople.length} people
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                        {journalDocuments.length} documents
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                        {signedJournalPeopleCount} signatures
                      </span>
                    </div>
                  </div>



                  <div
                    id="signing-print-area"
                    data-control-number={assignment.control_number ?? "Assignment"}
                    className="hidden"
                  >
                    <style>{`
                      * { box-sizing: border-box; }
                      body { margin: 0; background: #eef3f8; color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
                      .print-shell { max-width: 1120px; margin: 0 auto; background: #ffffff; min-height: 100vh; }
                      .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 22px; background: #0B1F4D; color: #ffffff; box-shadow: 0 2px 12px rgba(15, 23, 42, 0.18); }
                      .toolbar-title { font-size: 14px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
                      .toolbar-actions { display: flex; gap: 10px; flex-wrap: wrap; }
                      .toolbar button, .toolbar a { border: 1px solid rgba(255,255,255,.45); background: rgba(255,255,255,.12); color: #ffffff; border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 800; text-decoration: none; cursor: pointer; }
                      .toolbar button:hover, .toolbar a:hover { background: rgba(255,255,255,.2); }
                      .page { padding: 34px; }
                      .hero { border-radius: 24px; overflow: hidden; border: 1px solid #dbeafe; box-shadow: 0 12px 34px rgba(15, 23, 42, 0.08); }
                      .hero-top { display: grid; grid-template-columns: 1.1fr auto 180px; gap: 22px; align-items: center; padding: 24px; background: linear-gradient(135deg, #0B1F4D, #16418a); color: white; }
                      .brand-lockup { display: flex; gap: 16px; align-items: center; min-width: 0; }
                      .logo-box { width: 76px; height: 76px; border-radius: 18px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center; overflow: hidden; flex: 0 0 auto; }
                      .logo-box img { width: 100%; height: 100%; object-fit: contain; background: #ffffff; padding: 6px; }
                      .logo-fallback { font-size: 24px; font-weight: 900; letter-spacing: .04em; }
                      .brand-kicker { font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: #bfdbfe; }
                      .brand-name { margin-top: 5px; font-size: 28px; font-weight: 900; line-height: 1.05; }
                      .brand-meta { margin-top: 8px; color: #dbeafe; font-size: 13px; line-height: 1.45; }
                      .status-card { text-align: right; }
                      .status-pill { display: inline-flex; align-items: center; border-radius: 999px; background: #fef3c7; color: #92400e; padding: 7px 12px; font-weight: 900; font-size: 12px; border: 1px solid rgba(251, 191, 36, .55); }
                      .control { margin-top: 12px; color: #dbeafe; font-size: 13px; font-weight: 800; }
                      .qr-card { background: white; color: #0f172a; border-radius: 18px; padding: 12px; text-align: center; box-shadow: 0 12px 28px rgba(0,0,0,.2); }
                      .qr-card img { width: 132px; height: 132px; display: block; margin: 0 auto; }
                      .qr-card p { margin: 8px 0 0; font-size: 10px; font-weight: 800; color: #475569; }
                      .appointment-bar { display: flex; justify-content: space-between; gap: 18px; padding: 18px 24px; background: #e0f2fe; border-top: 1px solid rgba(255,255,255,.3); color: #0B1F4D; }
                      .appointment-title { font-size: 26px; font-weight: 900; }
                      .appointment-sub { margin-top: 4px; font-size: 14px; color: #334155; font-weight: 700; }
                      .section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-top: 22px; }
                      .card { border: 1px solid #dbe3ef; border-radius: 20px; background: #ffffff; overflow: hidden; }
                      .card.full { grid-column: 1 / -1; }
                      .card-header { padding: 14px 18px; background: #f8fafc; border-bottom: 1px solid #dbe3ef; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
                      .card-title { margin: 0; font-size: 16px; font-weight: 900; color: #0B1F4D; }
                      .card-body { padding: 18px; font-size: 14px; line-height: 1.55; }
                      .big-text { font-size: 18px; font-weight: 900; color: #0f172a; }
                      .muted { color: #64748b; }
                      .info-list { display: grid; gap: 10px; }
                      .info-row { display: grid; grid-template-columns: 145px minmax(0, 1fr); gap: 12px; }
                      .info-label { color: #64748b; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: .06em; }
                      .info-value { color: #0f172a; font-weight: 700; word-break: break-word; }
                      .money-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
                      .money-box { border-radius: 16px; border: 1px solid #dbe3ef; background: #f8fafc; padding: 14px; }
                      .money-label { font-size: 11px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; }
                      .money-value { margin-top: 6px; font-size: 20px; color: #0B1F4D; font-weight: 900; }
                      .checklist { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; }
                      .check-item { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #334155; }
                      .box { width: 18px; height: 18px; border: 2px solid #94a3b8; border-radius: 4px; flex: 0 0 auto; }
                      .instructions { white-space: pre-wrap; font-size: 14px; line-height: 1.55; color: #0f172a; }
                      .notes-list { display: grid; gap: 12px; }
                      .note { border-left: 4px solid #5BC0EB; padding-left: 12px; }
                      .note-date { font-size: 12px; font-weight: 900; color: #64748b; }
                      .note-text { margin-top: 3px; white-space: pre-wrap; }
                      .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #dbe3ef; color: #64748b; font-size: 12px; display: flex; justify-content: space-between; gap: 12px; }
                      .print-invoice-optional { margin-top: 22px; }
                      @media (max-width: 800px) { .hero-top { grid-template-columns: 1fr; } .status-card { text-align: left; } .qr-card { width: 180px; } .appointment-bar, .section-grid, .money-grid, .checklist { grid-template-columns: 1fr; display: grid; } .info-row { grid-template-columns: 1fr; gap: 2px; } .page { padding: 16px; } }
                      @media print { body { background: #fff; } .toolbar { display: none; } .page { padding: 18px; } .hero { box-shadow: none; } .card { break-inside: avoid; } .card.full { break-inside: auto; } .section-grid { gap: 12px; } }
                    `}</style>
                    <script
                      dangerouslySetInnerHTML={{
                        __html: `
                          document.addEventListener("click", function (event) {
                            if (event.target && event.target.id === "print-window-print-button") window.print();
                            if (event.target && event.target.id === "print-window-close-button") window.close();
                          });
                        `,
                      }}
                    />

                    <div className="print-shell">
                      <div className="toolbar">
                        <div className="toolbar-title">INS Pro Signing Summary</div>
                        <div className="toolbar-actions">
                          <a href={printAssignmentUrl}>← Back to Assignment</a>
                          <button type="button" id="print-window-print-button">Print / Save PDF</button>
                          <button type="button" id="print-window-close-button">Close</button>
                        </div>
                      </div>

                      <div className="page">
                        <header className="hero">
                          <div className="hero-top">
                            <div className="brand-lockup">
                              <div className="logo-box">
                                {printNotaryLogoUrl ? (
                                  <img src={printNotaryLogoUrl} alt={`${printNotaryName} logo`} />
                                ) : (
                                  <span className="logo-fallback">INS</span>
                                )}
                              </div>
                              <div>
                                <div className="brand-kicker">Indiana Notary Solutions • INS Pro</div>
                                <div className="brand-name">{printNotaryName}</div>
                                <div className="brand-meta">
                                  {notaryBusinessLocation ? <div>{notaryBusinessLocation}</div> : null}
                                  <div>{[printNotaryPhone !== "—" ? printNotaryPhone : null, printNotaryEmail !== "—" ? printNotaryEmail : null].filter(Boolean).join(" • ")}</div>
                                </div>
                              </div>
                            </div>

                            <div className="status-card">
                              <span className="status-pill">{assignment.status ?? "Unknown"}</span>
                              <div className="control">Control # {assignment.control_number ?? "—"}</div>
                              <div className="control">Invoice {formatInvoiceNumber(assignmentInvoice?.invoice_number)}</div>
                            </div>

                            <div className="qr-card">
                              <img src={printQrCodeUrl} alt="Assignment QR code" />
                              <p>Scan to open assignment</p>
                            </div>
                          </div>

                          <div className="appointment-bar">
                            <div>
                              <div className="appointment-title">{signingDate} {signingTime ? `at ${signingTime}` : ""}</div>
                              <div className="appointment-sub">{assignment.borrower_name || "Signer not listed"}</div>
                            </div>
                            <div className="appointment-sub">
                              {signingLocation || "Signing location not listed"}
                            </div>
                          </div>
                        </header>

                        <div className="section-grid">
                          <section className="card">
                            <div className="card-header"><h2 className="card-title">Signer / Borrower</h2></div>
                            <div className="card-body">
                              <p className="big-text">{assignment.borrower_name || "—"}</p>
                              <div className="info-list" style={{ marginTop: "12px" }}>
                                <div className="info-row"><span className="info-label">Phone</span><span className="info-value">{assignment.borrower_phone || "—"}</span></div>
                                <div className="info-row"><span className="info-label">Email</span><span className="info-value">{signerEmail}</span></div>
                              </div>
                            </div>
                          </section>

                          <section className="card">
                            <div className="card-header"><h2 className="card-title">Client / Signing Info</h2></div>
                            <div className="card-body info-list">
                              <div className="info-row"><span className="info-label">Client</span><span className="info-value">{titleCompanyName}</span></div>
                              <div className="info-row"><span className="info-label">Contact</span><span className="info-value">{titleCompanyContact}</span></div>
                              <div className="info-row"><span className="info-label">Phone</span><span className="info-value">{titleCompanyPhone}</span></div>
                              <div className="info-row"><span className="info-label">Email</span><span className="info-value">{titleCompanyEmail}</span></div>
                              <div className="info-row"><span className="info-label">Platform</span><span className="info-value">{signingPlatform}</span></div>
                            </div>
                          </section>

                          <section className="card">
                            <div className="card-header"><h2 className="card-title">Signing Address</h2></div>
                            <div className="card-body">
                              <p className="big-text">{assignment.signing_address ?? "—"}</p>
                              <p>{assignment.signing_city ?? "—"}, {assignment.signing_state ?? "IN"} {assignment.signing_zip ?? ""}</p>
                              {assignment.signing_county || assignment.county ? <p className="muted">County: {assignment.signing_county || assignment.county}</p> : null}
                            </div>
                          </section>

                          <section className="card">
                            <div className="card-header"><h2 className="card-title">Order Details</h2></div>
                            <div className="card-body info-list">
                              <div className="info-row"><span className="info-label">Loan Type</span><span className="info-value">{productName}</span></div>
                              <div className="info-row"><span className="info-label">Loan/Escrow #</span><span className="info-value">{fileNumber}</span></div>
                              <div className="info-row"><span className="info-label">Tracking #</span><span className="info-value">{[assignment.shipping_carrier, assignment.tracking_number].filter(Boolean).join(" ") || "—"}</span></div>
                              <div className="info-row"><span className="info-label">Property</span><span className="info-value">{propertyAddress || signingLocation || "—"}</span></div>
                            </div>
                          </section>

                          <section className="card full">
                            <div className="card-header"><h2 className="card-title">Financial / Tax Summary</h2></div>
                            <div className="card-body">
                              <div className="money-grid">
                                <div className="money-box"><div className="money-label">Signing Fee</div><div className="money-value">{formatMoney(notaryFee)}</div></div>
                                <div className="money-box"><div className="money-label">Mileage Deduction</div><div className="money-value">{formatMoney(invoiceMileageTotal)}</div></div>
                                <div className="money-box"><div className="money-label">Expenses</div><div className="money-value">{formatMoney(invoiceExpensesTotal)}</div></div>
                                <div className="money-box"><div className="money-label">Notarial Fee Value</div><div className="money-value">{formatMoney(notarialActsTotalFees)}</div></div>
                              </div>
                              <p className="muted" style={{ marginTop: "12px", fontWeight: 700 }}>
                                Mileage, expenses, and notarial acts are business/tax records only. They are not added to the invoice total.
                              </p>
                            </div>
                          </section>

                          <section className="card">
                            <div className="card-header"><h2 className="card-title">INS Pro Records</h2></div>
                            <div className="card-body info-list">
                              <div className="info-row"><span className="info-label">Mileage</span><span className="info-value">{invoiceMileageRows.reduce((sum, row) => sum + Number(row.miles ?? 0), 0).toFixed(2)} miles</span></div>
                              <div className="info-row"><span className="info-label">Notarial Acts</span><span className="info-value">{notarialActsTotalCount}</span></div>
                              <div className="info-row"><span className="info-label">Expenses</span><span className="info-value">{invoiceExpenseRows.length} entries</span></div>
                              <div className="info-row"><span className="info-label">Payments</span><span className="info-value">{formatMoney(invoicePaymentsTotal)}</span></div>
                            </div>
                          </section>

                          <section className="card">
                            <div className="card-header"><h2 className="card-title">Documents / Journal</h2></div>
                            <div className="card-body info-list">
                              <div className="info-row"><span className="info-label">Title Docs</span><span className="info-value">{printTitleDocsCount}</span></div>
                              <div className="info-row"><span className="info-label">Returned Docs</span><span className="info-value">{printUploadedDocsCount}</span></div>
                              <div className="info-row"><span className="info-label">Journal</span><span className="info-value">{journalIsComplete ? "Complete" : "Open"}</span></div>
                              <div className="info-row"><span className="info-label">Signatures</span><span className="info-value">{signedJournalPeopleCount}</span></div>
                            </div>
                          </section>

                          <section className="card full">
                            <div className="card-header"><h2 className="card-title">Signing Instructions</h2></div>
                            <div className="card-body instructions">{printInstructions || "No signing instructions were provided."}</div>
                          </section>

                          <section className="card full print-invoice-optional">
                            <div className="card-header"><h2 className="card-title">Invoice</h2></div>
                            <div className="card-body info-list">
                              <div className="info-row"><span className="info-label">Invoice #</span><span className="info-value">{formatInvoiceNumber(assignmentInvoice?.invoice_number)}</span></div>
                              <div className="info-row"><span className="info-label">Invoice Date</span><span className="info-value">{formatInputDate(assignmentInvoice?.invoice_date) || defaultInvoiceDate}</span></div>
                              <div className="info-row"><span className="info-label">Due Date</span><span className="info-value">{formatInputDate(assignmentInvoice?.due_date) || defaultInvoiceDueDate}</span></div>
                              <div className="info-row"><span className="info-label">Bill To</span><span className="info-value">{billToLines.join(", ") || "—"}</span></div>
                              <div className="info-row"><span className="info-label">Invoice Total</span><span className="info-value">{formatMoney(invoiceTotalDue)}</span></div>
                              <div className="info-row"><span className="info-label">Payments</span><span className="info-value">{formatMoney(invoicePaymentsTotal)}</span></div>
                              <div className="info-row"><span className="info-label">Balance</span><span className="info-value">{formatMoney(invoiceBalanceDue)}</span></div>
                            </div>
                          </section>
                        </div>

                        <footer className="footer">
                          <span>Generated by Indiana Notary Solutions INS Pro</span>
                          <span>{printAssignmentUrl}</span>
                        </footer>
                      </div>
                    </div>
                  </div>

                  <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/print:flex sm:items-center">
                    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                        <h4 className="text-lg font-bold">Signing Printout Options</h4>
                        <label
                          htmlFor="print-workspace-modal"
                          className="cursor-pointer text-3xl font-black leading-none"
                          aria-label="Close print options"
                        >
                          ×
                        </label>
                      </div>

                      <div className="space-y-6 p-8">
                        <label className="flex cursor-pointer items-center justify-center gap-3 text-base font-semibold text-slate-700">
                          <input
                            id="print-include-invoice"
                            type="checkbox"
                            className="h-5 w-5 rounded border-slate-300 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                          />
                          Include invoice
                        </label>

                        <div className="flex justify-center gap-3 border-t border-slate-200 pt-6">
                          <label
                            htmlFor="print-workspace-modal"
                            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            Cancel
                          </label>

                          <button
                            id="print-signing-button"
                            type="button"
                            className="rounded-xl bg-[#0B1F4D] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                          >
                            Open Printout
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/expenses:flex sm:items-center">
                    <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-bold">Signing Expenses</h4>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                              {invoiceExpenseRows.length} entries
                            </span>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                              {formatMoney(invoiceExpensesTotal)}
                            </span>
                          </div>
                          <p className="text-sm text-white/90">
                            Track printing, shipping, postage, parking, software, and other signing expenses. Saved expenses are kept for tax/business records only.
                          </p>
                        </div>

                        <label
                          htmlFor="expenses-workspace-modal"
                          className="cursor-pointer rounded-xl border border-white/60 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Cancel
                        </label>
                      </div>

                      <div className="max-h-[82vh] overflow-y-auto p-5">
                        <div className="mb-5 grid gap-4 md:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Total Expenses</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(invoiceExpensesTotal)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Entries</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{invoiceExpenseRows.length}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Invoice Fee Balance</p>
                            <p className="mt-2 text-lg font-black text-[#0B1F4D]">{formatMoney(invoiceBalanceDue)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Tax Record</p>
                            <p className="mt-2 text-lg font-black text-slate-950">Saved</p>
                          </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
                          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <div>
                                <h5 className="font-black text-slate-950">Expense History</h5>
                                <p className="text-xs text-slate-500">
                                  Keep expense details inside the modal so the assignment page stays clean.
                                </p>
                              </div>
                            </div>

                            {invoiceExpenseRows.length === 0 ? (
                              <div className="p-5 text-sm text-slate-500">
                                No expenses have been added yet.
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-200">
                                {invoiceExpenseRows.map((row) => (
                                  <div
                                    key={row.id}
                                    data-expense-container={String(row.id)}
                                    className="grid gap-3 px-4 py-4 text-sm transition-opacity md:grid-cols-[110px_minmax(0,1fr)_110px_120px]"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-950">{formatInputDate(row.expense_date)}</p>
                                      <p className="text-xs text-slate-500">{row.category || "Misc."}</p>
                                    </div>

                                    <div className="min-w-0">
                                      <p className="break-words font-semibold text-slate-700">
                                        {row.vendor || row.category || "Expense"}
                                      </p>
                                      {row.notes && (
                                        <p className="mt-1 break-words text-xs text-slate-500">{row.notes}</p>
                                      )}
                                      {row.receiptSignedUrl ? (
                                        <a
                                          href={row.receiptSignedUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-2 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                        >
                                          View Receipt
                                        </a>
                                      ) : row.receipt_file_name ? (
                                        <p className="mt-2 text-xs font-semibold text-amber-700">
                                          Receipt attached, but preview link is unavailable.
                                        </p>
                                      ) : null}
                                    </div>

                                    <p className="font-black text-slate-950 md:text-right">
                                      {formatMoney(row.amount)}
                                    </p>

                                    <button
                                      type="submit"
                                      form={`delete-expense-${row.id}`}
                                      data-busy-text="Removing..."
                                      data-busy-expense-id={String(row.id)}
                                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>

                          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <h5 className="text-lg font-black text-slate-950">New Expense</h5>
                            <p className="mt-1 text-sm text-slate-500">
                              Compact entry form. Save keeps this workspace open so you can add another expense.
                            </p>

                            {expenseSaved && (
                              <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                                Expense saved. Add another expense or click Cancel when you are done.
                              </div>
                            )}

                            {expenseError && (
                              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                Expense was not saved: {decodeURIComponent(expenseError)}
                              </div>
                            )}

                            <form action={saveExpenseEntry} encType="multipart/form-data" className="mt-4 grid gap-3 sm:grid-cols-2">
                              <input type="hidden" name="assignment_id" value={assignment.id} />
                              <input type="hidden" name="invoice_id" value={assignmentInvoice?.id ?? ""} />

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Date</label>
                                <input
                                  type="date"
                                  name="expense_date"
                                  defaultValue={formatInputDate(assignment.signing_date) || todayForInvoice}
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Category</label>
                                <select
                                  name="expense_category"
                                  defaultValue="Document Printing"
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                >
                                  {EXPENSE_CATEGORIES.map((category) => (
                                    <option key={category} value={category}>
                                      {category}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-slate-700">New / Custom Category</label>
                                <input
                                  name="expense_custom_category"
                                  placeholder="Optional custom category"
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                  Leave blank to use the selected category.
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Amount</label>
                                <input
                                  name="expense_amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  placeholder="0.00"
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Vendor</label>
                                <input
                                  name="expense_vendor"
                                  placeholder="FedEx, UPS, Staples, USPS..."
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-slate-700">Notes</label>
                                <textarea
                                  name="expense_notes"
                                  rows={3}
                                  placeholder="Example: 399 pages @ $0.03 each"
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                                <label className="block text-sm font-bold text-slate-700">Receipt</label>
                                <input
                                  type="file"
                                  name="expense_receipt"
                                  accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-blue-700 hover:file:bg-blue-100 focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                  Attach a PDF or image receipt. Max 10MB. The receipt saves with this expense entry.
                                </p>
                              </div>

                              <div className="sm:col-span-2 flex justify-end gap-3 border-t border-slate-200 pt-4">
                                <label
                                  htmlFor="expenses-workspace-modal"
                                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Cancel
                                </label>

                                <button
                                  type="submit"
                                  name="expense_save_mode"
                                  value="save"
                                  data-busy-text="Saving expense..."
                                  className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-80"
                                >
                                  Save
                                </button>

                                <button
                                  type="submit"
                                  name="expense_save_mode"
                                  value="add_another"
                                  data-busy-text="Saving expense..."
                                  className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 disabled:cursor-wait disabled:opacity-80"
                                >
                                  Save + Add Another
                                </button>
                              </div>
                            </form>
                          </aside>
                        </div>

                        {invoiceExpenseRows.map((row) => (
                          <form
                            key={`delete-expense-form-${row.id}`}
                            id={`delete-expense-${row.id}`}
                            action={deleteExpenseEntry}
                            className="hidden"
                          >
                            <input type="hidden" name="assignment_id" value={assignment.id} />
                            <input type="hidden" name="invoice_id" value={assignmentInvoice?.id ?? ""} />
                            <input type="hidden" name="expense_id" value={String(row.id)} />
                          </form>
                        ))}
                      </div>
                    </div>
                  </div>



                  <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/notarial:flex sm:items-center">
                    <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-bold">Notarial Acts</h4>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                              {notarialActsTotalCount} acts
                            </span>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                              {formatMoney(notarialActsTotalFees)}
                            </span>
                          </div>
                          <p className="text-sm text-white/90">
                            Track Indiana notarial acts at the current Indiana max of {formatMoney(INDIANA_NOTARIAL_ACT_FEE)} per act.
                          </p>
                        </div>

                        <label
                          htmlFor="notarial-acts-workspace-modal"
                          className="cursor-pointer rounded-xl border border-white/60 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Cancel
                        </label>
                      </div>

                      <div className="max-h-[82vh] overflow-y-auto p-5">
                        <form action={saveNotarialActs} className="mx-auto max-w-5xl space-y-5">
                          <input type="hidden" name="assignment_id" value={assignment.id} />

                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                            <p className="font-black text-[#0B1F4D]">Why track notarial acts?</p>
                            <p className="mt-1 leading-6">
                              This is separate from mileage and the signing fee. It gives the notary a clean tax/business record of how many notarizations were performed and the max Indiana fee value.
                            </p>
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,.9fr)_auto] gap-3 border-b border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                              <p>Date</p>
                              <p>Not. Acts</p>
                              <p>Amt Per</p>
                              <p className="text-right">Notarial Fees</p>
                              <p className="text-right">Action</p>
                            </div>

                            <div
                              id="notarial-acts-table"
                              data-default-date={formatInputDate(assignment.signing_date) || todayForInvoice}
                              data-default-fee={INDIANA_NOTARIAL_ACT_FEE.toFixed(2)}
                            >
                              {notarialActFormRows.map((row, index) => {
                                const rowCount = Number(row?.acts_count ?? 0);
                                const rowFee = Number(row?.fee_per_act ?? INDIANA_NOTARIAL_ACT_FEE);
                                const rowAmount = rowCount > 0 ? rowCount * rowFee : 0;

                                return (
                                  <div
                                    key={`notarial-act-row-${row?.id ?? index}`}
                                    data-notarial-row="true"
                                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,.9fr)_auto] gap-3 px-4 py-3 text-sm"
                                  >
                                    <input
                                      type="date"
                                      name="notarial_act_date"
                                      defaultValue={formatInputDate(row?.act_date) || formatInputDate(assignment.signing_date) || todayForInvoice}
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />

                                    <input
                                      type="number"
                                      name="notarial_act_count"
                                      min="0"
                                      step="1"
                                      data-notarial-count="true"
                                      defaultValue={rowCount > 0 ? String(rowCount) : ""}
                                      placeholder="0"
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />

                                    <input
                                      type="number"
                                      name="notarial_act_fee"
                                      min="0"
                                      step="0.01"
                                      data-notarial-fee="true"
                                      defaultValue={rowFee.toFixed(2)}
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />

                                    <p
                                      data-notarial-row-amount="true"
                                      className="flex items-center justify-end font-black text-[#0B1F4D]"
                                    >
                                      {formatMoney(rowAmount)}
                                    </p>

                                    <button
                                      type="button"
                                      data-remove-notarial-row="true"
                                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="border-t border-slate-200 bg-white px-4 py-3">
                              <button
                                id="add-notarial-act-row-button"
                                type="button"
                                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                              >
                                + Add Row
                              </button>
                            </div>
                          </div>

                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
                            <input
                              id="notarial-no-acts-checkbox"
                              type="checkbox"
                              name="no_notarial_acts"
                              className="h-5 w-5 rounded border-slate-300 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                            />
                            I did not have any notarial acts for this signing.
                          </label>

                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                                  Notarial Fee Total
                                </p>
                                <p
                                  id="notarial-acts-helper"
                                  className="mt-1 text-xs font-semibold text-slate-600"
                                >
                                  {notarialActsTotalCount > 0
                                    ? `${notarialActsTotalCount} act${notarialActsTotalCount === 1 ? "" : "s"} × Indiana max fee`
                                    : "Enter notarial acts to calculate the fee."}
                                </p>
                              </div>
                              <p
                                id="notarial-acts-total-output"
                                className="shrink-0 text-2xl font-black text-[#0B1F4D]"
                              >
                                {formatMoney(notarialActsTotalFees)}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                            <label
                              htmlFor="notarial-acts-workspace-modal"
                              className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                              Cancel
                            </label>

                            <button
                              type="submit"
                              data-busy-text="Saving acts..."
                              className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 disabled:cursor-wait disabled:opacity-80"
                            >
                              Save Notarial Acts
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>


                  <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/mileage:flex sm:items-center">
                    <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-bold">Mileage</h4>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                              {formatMoney(invoiceMileageTotal)}
                            </span>
                          </div>
                          <p className="text-sm text-white/90">
                            Track trip mileage without crowding the assignment page. Saved mileage is kept for tax/business records only.
                          </p>
                        </div>

                        <label
                          htmlFor="mileage-workspace-modal"
                          className="cursor-pointer rounded-xl border border-white/60 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Cancel
                        </label>
                      </div>

                      <div className="max-h-[82vh] overflow-y-auto p-5">
                        <div className="mb-5 grid gap-4 md:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Saved Miles</p>
                            <p className="mt-2 text-lg font-black text-slate-950">
                              {invoiceMileageRows.reduce((sum, row) => sum + Number(row.miles ?? 0), 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Mileage Total</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(invoiceMileageTotal)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Invoice Fee Balance</p>
                            <p className="mt-2 text-lg font-black text-[#0B1F4D]">{formatMoney(invoiceBalanceDue)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Entries</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{invoiceMileageRows.length}</p>
                          </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <div>
                                <h5 className="font-black text-slate-950">Mileage History</h5>
                                <p className="text-xs text-slate-500">
                                  Keep this list here inside the modal, not as another card on the page.
                                </p>
                              </div>
                            </div>

                            {invoiceMileageRows.length === 0 ? (
                              <div className="p-5 text-sm text-slate-500">
                                No mileage has been added yet.
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-200">
                                {invoiceMileageRows.map((row) => (
                                  <div
                                    key={row.id}
                                    data-mileage-container={String(row.id)}
                                    className="grid gap-3 px-4 py-4 text-sm transition-opacity md:grid-cols-[130px_minmax(0,1fr)_110px_120px]"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-950">{formatInputDate(row.mileage_date)}</p>
                                      <p className="text-xs text-slate-500">{Number(row.miles ?? 0).toFixed(2)} mi</p>
                                    </div>

                                    <div className="min-w-0">
                                      <p className="break-words font-semibold text-slate-700">
                                        {row.notes || "Mileage entry"}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        Rate {formatMoney(row.rate)} / mile
                                      </p>
                                    </div>

                                    <p className="font-black text-slate-950 md:text-right">
                                      {formatMoney(row.amount)}
                                    </p>

                                    <button
                                      type="submit"
                                      form={`delete-mileage-${row.id}`}
                                      data-busy-text="Removing..."
                                      data-busy-mileage-id={String(row.id)}
                                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>

                          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h5 className="text-lg font-black text-slate-950">Add Mileage</h5>
                            <p className="mt-1 text-sm text-slate-500">
                              Calculate the driving miles with Google Maps, or enter miles manually if needed.
                            </p>

                            <form action={saveMileageEntry} className="mt-5 space-y-4">
                              <input type="hidden" name="assignment_id" value={assignment.id} />
                              <input type="hidden" name="invoice_id" value={assignmentInvoice?.id ?? ""} />

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Date</label>
                                <input
                                  type="date"
                                  name="mileage_date"
                                  defaultValue={formatInputDate(assignment.signing_date) || todayForInvoice}
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Starting Location</label>
                                <input
                                  id="mileage-origin-input"
                                  name="mileage_starting_location"
                                  defaultValue={notaryBusinessLocation}
                                  placeholder="Business location, office, prior signing..."
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                                {!notaryBusinessLocation && (
                                  <p className="mt-2 text-xs text-amber-700">
                                    Business Location is not complete on this profile yet. Add the full street address, city, state, and ZIP on the profile page and this field will auto-fill.
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Destination</label>
                                <input
                                  id="mileage-destination-input"
                                  name="mileage_destination_location"
                                  defaultValue={signingLocation}
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div
                                className={`rounded-2xl border p-4 ${
                                  automaticMileageStatus === "saved" ||
                                  automaticMileageStatus === "already_saved"
                                    ? "border-green-200 bg-green-50"
                                    : automaticMileageStatus === "failed" ||
                                        automaticMileageStatus === "missing_addresses"
                                      ? "border-amber-200 bg-amber-50"
                                      : "border-blue-200 bg-blue-50"
                                }`}
                              >
                                <p
                                  className={`text-sm font-black ${
                                    automaticMileageStatus === "saved" ||
                                    automaticMileageStatus === "already_saved"
                                      ? "text-green-800"
                                      : automaticMileageStatus === "failed" ||
                                          automaticMileageStatus === "missing_addresses"
                                        ? "text-amber-800"
                                        : "text-[#0B1F4D]"
                                  }`}
                                >
                                  Google Maps Mileage
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-700">
                                  {automaticMileageMessage}
                                </p>
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                  INS Pro only auto-calculates when there is no saved mileage entry. Manual fields below are for corrections or extra trips.
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-bold text-slate-700">Miles</label>
                                  <input
                                    id="mileage-miles-input"
                                    name="mileage_miles"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    placeholder="Enter miles"
                                    defaultValue={latestMileageMiles > 0 ? latestMileageMiles.toFixed(2) : ""}
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-bold text-slate-700">Rate</label>
                                  <input
                                    id="mileage-rate-input"
                                    name="mileage_rate"
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    defaultValue={latestMileageRate > 0 ? latestMileageRate.toFixed(3) : String(FEDERAL_MILEAGE_RATE)}
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                              </div>

                              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                                      Mileage Amount
                                    </p>
                                    <p
                                      id="mileage-amount-helper"
                                      className="mt-1 text-xs font-semibold text-slate-600"
                                    >
                                      {latestMileageMiles > 0
                                        ? `${latestMileageMiles.toFixed(2)} miles × $${latestMileageRate.toFixed(3)} per mile`
                                        : "Enter miles manually to calculate a new mileage amount."}
                                    </p>
                                  </div>
                                  <p
                                    id="mileage-amount-output"
                                    className="shrink-0 text-2xl font-black text-[#0B1F4D]"
                                  >
                                    {formatMoney(latestMileageAmount)}
                                  </p>
                                </div>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-slate-700">Notes</label>
                                <textarea
                                  name="mileage_notes"
                                  rows={3}
                                  placeholder="Optional notes..."
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                                <label
                                  htmlFor="mileage-workspace-modal"
                                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Cancel
                                </label>

                                <button
                                  type="submit"
                                  data-busy-text="Saving mileage..."
                                  className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 disabled:cursor-wait disabled:opacity-80"
                                >
                                  Save Mileage
                                </button>
                              </div>
                            </form>
                          </aside>
                        </div>

                        {invoiceMileageRows.map((row) => (
                          <form
                            key={`delete-mileage-form-${row.id}`}
                            id={`delete-mileage-${row.id}`}
                            action={deleteMileageEntry}
                            className="hidden"
                          >
                            <input type="hidden" name="assignment_id" value={assignment.id} />
                            <input type="hidden" name="invoice_id" value={assignmentInvoice?.id ?? ""} />
                            <input type="hidden" name="mileage_id" value={String(row.id)} />
                          </form>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/payments:flex sm:items-center">
                    <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-bold">Payments</h4>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                              {formatMoney(invoicePaymentsTotal)} paid
                            </span>
                            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                              Balance {formatMoney(invoiceBalanceDue)}
                            </span>
                          </div>
                          <p className="text-sm text-white/90">
                            Record invoice payments without opening the full invoice workspace.
                          </p>
                        </div>

                        <label
                          htmlFor="payments-workspace-modal"
                          className="cursor-pointer rounded-xl border border-white/60 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Cancel
                        </label>
                      </div>

                      <div className="max-h-[82vh] overflow-y-auto p-5">
                        <div className="mb-5 grid gap-4 md:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Notary Fee Invoice</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(invoiceTotalDue)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Total Payments</p>
                            <p className="mt-2 text-lg font-black text-green-700">{formatMoney(invoicePaymentsTotal)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Balance Due</p>
                            <p className="mt-2 text-lg font-black text-[#0B1F4D]">{formatMoney(invoiceBalanceDue)}</p>
                          </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <h5 className="font-black text-slate-950">Payment History</h5>
                              <p className="text-xs text-slate-500">Payments entered here reduce the notary-fee invoice balance.</p>
                            </div>

                            {invoicePaymentRows.length === 0 ? (
                              <div className="p-5 text-sm text-slate-500">
                                No payments have been recorded yet.
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-200">
                                {invoicePaymentRows.map((payment) => (
                                  <div
                                    key={`payment-workspace-${payment.id}`}
                                    data-payment-container={String(payment.id)}
                                    className="grid gap-3 px-4 py-4 text-sm transition-opacity md:grid-cols-[130px_minmax(0,1fr)_120px_120px]"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-950">{formatInputDate(payment.payment_date)}</p>
                                      <p className="text-xs text-slate-500">{payment.payment_method || "Payment"}</p>
                                    </div>

                                    <div className="min-w-0">
                                      <p className="break-words font-semibold text-slate-700">
                                        {payment.reference ? `Reference: ${payment.reference}` : "Invoice payment"}
                                      </p>
                                      {payment.notes && (
                                        <p className="mt-1 break-words text-xs text-slate-500">{payment.notes}</p>
                                      )}
                                    </div>

                                    <p className="font-black text-green-700 md:text-right">
                                      {formatMoney(payment.amount)}
                                    </p>

                                    <button
                                      type="submit"
                                      form={`delete-invoice-payment-${payment.id}`}
                                      data-busy-text="Removing..."
                                      data-busy-payment-id={String(payment.id)}
                                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>

                          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h5 className="text-lg font-black text-slate-950">New Payment</h5>
                            <p className="mt-1 text-sm text-slate-500">
                              Use Balance fills the unpaid amount. The dots let you pick a saved payment type.
                            </p>

                            <form id="payments-workspace-payment-form" action={addInvoicePayment} className="mt-5 space-y-4">
                              <input type="hidden" name="assignment_id" value={assignment.id} />
                              <input type="hidden" name="invoice_id" value={assignmentInvoice?.id ?? ""} />

                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="block text-sm font-bold text-slate-700">Date Rec&apos;d</label>
                                  <input
                                    type="date"
                                    name="payment_date"
                                    defaultValue={todayForInvoice}
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-bold text-slate-700">Amount</label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <input
                                      id="payments-workspace-payment-amount"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      name="payment_amount"
                                      defaultValue={invoiceBalanceDue > 0 ? String(invoiceBalanceDue.toFixed(2)) : ""}
                                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                    <button
                                      type="button"
                                      data-use-balance-target="payments-workspace-payment-amount"
                                      data-balance={invoiceBalanceDue > 0 ? invoiceBalanceDue.toFixed(2) : "0.00"}
                                      className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                                    >
                                      Use Bal
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Payment Type</label>
                                <div className="mt-2 flex items-center gap-2">
                                  <input
                                    id="payments-workspace-payment-method-input"
                                    name="payment_method"
                                    defaultValue="ACH"
                                    placeholder="ACH, Check, Cash..."
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                  />

                                  <input
                                    id="payments-workspace-payment-type-modal"
                                    type="checkbox"
                                    className="peer/workspace-paytype sr-only"
                                  />

                                  <label
                                    htmlFor="payments-workspace-payment-type-modal"
                                    className="inline-flex h-11 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-black text-slate-500 transition hover:bg-slate-50"
                                    aria-label="Open payment type list"
                                  >
                                    …
                                  </label>

                                  <div className="fixed inset-0 z-[70] hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/workspace-paytype:flex sm:items-center">
                                    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                      <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                                        <h6 className="text-lg font-bold">Favorite Payment Types</h6>
                                        <label
                                          htmlFor="payments-workspace-payment-type-modal"
                                          className="cursor-pointer text-3xl font-black leading-none"
                                          aria-label="Close payment type list"
                                        >
                                          ×
                                        </label>
                                      </div>

                                      <div className="p-5">
                                        <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                          {["ACH", "Cash", "Check", "Credit Card", "E-Check"].map((method) => (
                                            <label
                                              key={`payments-workspace-method-${method}`}
                                              className="flex cursor-pointer items-center justify-between border-b border-slate-200 px-5 py-4 text-sm font-bold text-slate-800 last:border-b-0 hover:bg-slate-50"
                                            >
                                              <span>{method}</span>
                                              <input
                                                type="radio"
                                                name="payments_workspace_payment_method_picker"
                                                value={method}
                                                data-payment-method-picker="payments-workspace"
                                                className="h-4 w-4 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                                              />
                                            </label>
                                          ))}
                                        </div>

                                        <p className="mt-4 text-center text-xs text-slate-500">
                                          Pick one here, then click Save to update the payment type field.
                                        </p>

                                        <div className="mt-5 flex justify-center gap-3">
                                          <label
                                            htmlFor="payments-workspace-payment-type-modal"
                                            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                          >
                                            Cancel
                                          </label>
                                          <button
                                            type="button"
                                            data-payment-method-save="payments-workspace"
                                            data-payment-method-target="payments-workspace-payment-method-input"
                                            data-payment-method-modal="payments-workspace-payment-type-modal"
                                            className="rounded-xl bg-[#0B1F4D] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Check / Ref #</label>
                                <input
                                  name="payment_reference"
                                  placeholder="Check #, ACH trace, etc."
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Notes</label>
                                <textarea
                                  name="payment_notes"
                                  rows={3}
                                  placeholder="Optional notes..."
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                                <label
                                  htmlFor="payments-workspace-modal"
                                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Cancel
                                </label>

                                <SubmitButton
                                  pendingText="Saving payment..."
                                  className="rounded-xl bg-[#0B1F4D] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                                >
                                  Save Payment
                                </SubmitButton>
                              </div>
                            </form>
                          </aside>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/invoice:flex sm:items-center">
                    <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-bold">Invoice</h4>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${invoiceStatusBadge(
                                assignmentInvoice?.status,
                              )}`}
                            >
                              {displayInvoiceStatus(assignmentInvoice?.status)}
                            </span>
                          </div>
                          <p className="text-sm text-white/90">
                            Auto-filled from this assignment. Invoice total is the notary fee only. Mileage, expenses, and notarial acts stay as tax/business records.
                          </p>
                        </div>

                        <label
                          htmlFor="invoice-workspace-modal"
                          className="cursor-pointer rounded-xl border border-white/60 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Cancel
                        </label>
                      </div>

                      <div className="max-h-[82vh] overflow-y-auto p-5">
                        <div className="mb-5 grid gap-4 md:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Invoice #</p>
                            <p className="mt-2 text-lg font-black text-slate-950">
                              {formatInvoiceNumber(assignmentInvoice?.invoice_number)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Total Due</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{formatMoney(invoiceTotalDue)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Payments</p>
                            <p className="mt-2 text-lg font-black text-green-700">{formatMoney(invoicePaymentsTotal)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Balance</p>
                            <p className="mt-2 text-lg font-black text-[#0B1F4D]">{formatMoney(invoiceBalanceDue)}</p>
                          </div>
                        </div>

                        <form action={saveInvoice} className="space-y-5">
                          <input type="hidden" name="assignment_id" value={assignment.id} />
                          <input type="hidden" name="invoice_id" value={assignmentInvoice?.id ?? ""} />

                          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="space-y-5">
                              <div id="invoice-print-area" className="rounded-2xl border border-slate-200 bg-white p-5">
                                <h5 className="text-3xl font-light uppercase tracking-wide text-[#5BC0EB]">Invoice</h5>

                                <div className="mt-6 grid gap-4 md:grid-cols-3">
                                  <div>
                                    <label className="block text-sm font-bold text-slate-700">Invoice Date</label>
                                    <input
                                      type="date"
                                      name="invoice_date"
                                      defaultValue={formatInputDate(assignmentInvoice?.invoice_date) || defaultInvoiceDate}
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-bold text-slate-700">Due Date</label>
                                    <input
                                      type="date"
                                      name="due_date"
                                      defaultValue={formatInputDate(assignmentInvoice?.due_date) || defaultInvoiceDueDate}
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-bold text-slate-700">Status</label>
                                    <select
                                      name="invoice_status"
                                      defaultValue={assignmentInvoice?.status ?? "draft"}
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    >
                                      <option value="draft">Draft</option>
                                      <option value="unpaid">Unpaid</option>
                                      <option value="sent">Sent</option>
                                      <option value="paid">Paid</option>
                                      <option value="not_required">Not Required</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="mt-6 grid gap-4 md:grid-cols-2">
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                    <p className="font-black text-slate-950">Order / Escrow #</p>
                                    <p className="mt-1 text-slate-700">{assignment.control_number || fileNumber}</p>
                                    <p className="mt-4 font-black text-slate-950">Loan / Signing Type</p>
                                    <p className="mt-1 text-slate-700">{productName}</p>
                                    <p className="mt-4 font-black text-slate-950">Property / Signing Address</p>
                                    <p className="mt-1 text-slate-700">{signingLocation || "—"}</p>
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                    <p className="font-black text-slate-950">Bill To</p>
                                    {billToLines.length ? (
                                      <div className="mt-1 space-y-1 text-slate-700">
                                        {billToLines.map((line, index) => (
                                          <p key={`${line}-${index}`}>{line}</p>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-slate-700">Client billing info missing.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <div className="grid grid-cols-[minmax(0,1fr)_140px] bg-[#5BC0EB] px-4 py-3 text-sm font-black text-white">
                                  <p>Description</p>
                                  <p className="text-right">Amount</p>
                                </div>

                                <div className="grid grid-cols-[minmax(0,1fr)_140px] border-b border-slate-200">
                                  <textarea
                                    name="invoice_description"
                                    rows={4}
                                    defaultValue={invoiceDescription}
                                    className="min-h-28 border-0 px-4 py-4 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-blue-100"
                                  />
                                  <div className="border-l border-slate-200 p-4">
                                    <label className="sr-only">Fee Amount</label>
                                    <input
                                      name="invoice_fee_amount"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      defaultValue={String(invoiceSubtotal || startingInvoiceFee || 0)}
                                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm font-bold text-slate-900 outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                  </div>
                                </div>

                                {invoicePaymentRows.map((payment) => (
                                  <div
                                    key={payment.id}
                                    data-payment-container={String(payment.id)}
                                    className="grid grid-cols-[minmax(0,1fr)_140px] border-b border-slate-200 px-4 py-3 text-sm transition-opacity"
                                  >
                                    <p className="font-semibold text-slate-700">
                                      {formatInputDate(payment.payment_date)} - Payment Received{payment.payment_method ? ` - ${payment.payment_method}` : ""}
                                    </p>
                                    <div className="flex items-center justify-end gap-2 text-right">
                                      <p className="font-bold text-green-700">-{formatMoney(payment.amount)}</p>
                                      <button
                                        type="submit"
                                        form={`delete-invoice-payment-${payment.id}`}
                                        data-busy-text="Removing..."
                                        data-busy-payment-id={String(payment.id)}
                                        className="no-print rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                <div className="grid grid-cols-[minmax(0,1fr)_140px] bg-slate-50 text-sm font-black">
                                  <p className="px-4 py-4 text-right text-slate-950">TOTAL DUE</p>
                                  <p className="bg-[#5BC0EB] px-4 py-4 text-right text-white">{formatMoney(invoiceBalanceDue)}</p>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700">Invoice Notes</label>
                                <textarea
                                  name="invoice_notes"
                                  rows={3}
                                  defaultValue={assignmentInvoice?.notes ?? ""}
                                  placeholder="Optional notes shown on the invoice."
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div className="no-print flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                                <a
                                  href="javascript:window.print()"
                                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Generate PDF / Print
                                </a>
                                <a
                                  href={invoiceMailtoHref}
                                  className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-center text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                                >
                                  Email Invoice
                                </a>
                                <SubmitButton
                                  pendingText="Saving invoice..."
                                  className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                                >
                                  Save Invoice
                                </SubmitButton>
                              </div>
                            </div>

                            <aside className="space-y-5">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <h5 className="text-lg font-black text-slate-950">Business Footer</h5>
                                <div className="mt-3 rounded-xl bg-white p-4 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                                  <p>Thank you for your business!</p>
                                  <p>Indiana Notary Solutions, LLC</p>
                                  <p>502-807-8123</p>
                                  <p>BNelson@IndianaNotarySolutions.com</p>
                                  <p>https://www.IndianaNotarySolutions.com</p>
                                </div>
                              </div>

                              <div className="no-print rounded-2xl border border-slate-200 bg-white p-5">
                                <h5 className="text-lg font-black text-slate-950">Payments</h5>
                                <div className="mt-4 space-y-2 text-sm">
                                  <div className="flex justify-between gap-3">
                                    <span className="font-semibold text-slate-600">Invoice Total</span>
                                    <span className="font-black text-slate-950">{formatMoney(invoiceTotalDue)}</span>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <span className="font-semibold text-slate-600">Payments</span>
                                    <span className="font-black text-green-700">{invoicePaymentsTotal > 0 ? formatMoney(invoicePaymentsTotal) : "---"}</span>
                                  </div>
                                  <div className="flex justify-between gap-3 border-t border-slate-200 pt-2">
                                    <span className="font-black text-slate-950">Balance</span>
                                    <span className="font-black text-[#0B1F4D]">{formatMoney(invoiceBalanceDue)}</span>
                                  </div>
                                </div>

                                <label
                                  htmlFor="invoice-payment-modal"
                                  className="mt-5 inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                                >
                                  Enter Payment
                                </label>

                                {invoicePaymentRows.length > 0 && (
                                  <div className="mt-5 space-y-2">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                      Payment History
                                    </p>
                                    {invoicePaymentRows.map((payment) => (
                                      <div
                                        key={`payment-side-${payment.id}`}
                                        data-payment-container={String(payment.id)}
                                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition-opacity"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="font-bold text-slate-950">{formatMoney(payment.amount)}</p>
                                            <p className="text-xs text-slate-500">
                                              {formatInputDate(payment.payment_date)}
                                              {payment.payment_method ? ` • ${payment.payment_method}` : ""}
                                            </p>
                                          </div>

                                          <button
                                            type="submit"
                                            form={`delete-invoice-payment-${payment.id}`}
                                            data-busy-text="Removing..."
                                            data-busy-payment-id={String(payment.id)}
                                            className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </aside>
                          </div>
                        </form>

                        {invoicePaymentRows.map((payment) => (
                          <form
                            key={`delete-payment-form-${payment.id}`}
                            id={`delete-invoice-payment-${payment.id}`}
                            action={deleteInvoicePayment}
                            className="hidden"
                          >
                            <input type="hidden" name="assignment_id" value={assignment.id} />
                            <input type="hidden" name="invoice_id" value={assignmentInvoice?.id ?? ""} />
                            <input type="hidden" name="payment_id" value={String(payment.id)} />
                          </form>
                        ))}

                        <input
                          id="invoice-payment-modal"
                          type="checkbox"
                          className="peer/payment sr-only"
                        />

                        <div className="fixed inset-0 z-[60] hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/payment:flex sm:items-center">
                          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                              <h5 className="text-lg font-bold">New Payment</h5>
                              <label
                                htmlFor="invoice-payment-modal"
                                className="cursor-pointer text-3xl font-black leading-none"
                                aria-label="Close payment modal"
                              >
                                ×
                              </label>
                            </div>

                            <form id="invoice-payment-form" action={addInvoicePayment} className="space-y-6 p-5">
                              <input type="hidden" name="assignment_id" value={assignment.id} />
                              <input type="hidden" name="invoice_id" value={assignmentInvoice?.id ?? ""} />

                              <div className="space-y-2 text-center text-lg">
                                <p>
                                  <span className="text-slate-700">Invoice Total:</span>{" "}
                                  <span className="font-black text-slate-950">{formatMoney(invoiceTotalDue)}</span>
                                </p>
                                <p>
                                  <span className="text-slate-700">Payments:</span>{" "}
                                  <span className="font-black text-slate-950">{invoicePaymentsTotal > 0 ? formatMoney(invoicePaymentsTotal) : "---"}</span>
                                </p>
                                <p className="font-black text-blue-600">
                                  Balance: {formatMoney(invoiceBalanceDue)}
                                </p>
                              </div>

                              <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <div className="grid gap-4 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
                                  <label className="font-bold text-slate-500 sm:text-right">Date Rec&apos;d</label>
                                  <input
                                    type="date"
                                    name="payment_date"
                                    defaultValue={todayForInvoice}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                  />

                                  <label className="font-bold text-slate-500 sm:text-right">Amount</label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      id="invoice-payment-amount"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      name="payment_amount"
                                      defaultValue={invoiceBalanceDue > 0 ? String(invoiceBalanceDue.toFixed(2)) : ""}
                                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />
                                    <button
                                      id="invoice-use-balance-button"
                                      type="button"
                                      data-balance={invoiceBalanceDue > 0 ? invoiceBalanceDue.toFixed(2) : "0.00"}
                                      className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                                    >
                                      Use Bal
                                    </button>
                                  </div>

                                  <label className="font-bold text-slate-500 sm:text-right">Payment Type</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      id="invoice-payment-method-input"
                                      name="payment_method"
                                      defaultValue="ACH"
                                      placeholder="ACH, Check, Cash..."
                                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                    />

                                    <input
                                      id="invoice-payment-type-modal"
                                      type="checkbox"
                                      className="peer/paytype sr-only"
                                    />

                                    <label
                                      htmlFor="invoice-payment-type-modal"
                                      className="inline-flex h-11 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-black text-slate-500 transition hover:bg-slate-50"
                                      aria-label="Open payment type list"
                                    >
                                      …
                                    </label>

                                    <div className="fixed inset-0 z-[70] hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/paytype:flex sm:items-center">
                                      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                        <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                                          <h6 className="text-lg font-bold">Favorite Payment Types</h6>
                                          <label
                                            htmlFor="invoice-payment-type-modal"
                                            className="cursor-pointer text-3xl font-black leading-none"
                                            aria-label="Close payment type list"
                                          >
                                            ×
                                          </label>
                                        </div>

                                        <div className="p-5">
                                          <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                            {["ACH", "Cash", "Check", "Credit Card", "E-Check"].map((method) => (
                                              <label
                                                key={method}
                                                className="flex cursor-pointer items-center justify-between border-b border-slate-200 px-5 py-4 text-sm font-bold text-slate-800 last:border-b-0 hover:bg-slate-50"
                                              >
                                                <span>{method}</span>
                                                <input
                                                  type="radio"
                                                  name="invoice_payment_method_picker"
                                                  value={method}
                                                  data-payment-method-picker="invoice"
                                                  className="h-4 w-4 text-[#0B1F4D] focus:ring-[#0B1F4D]"
                                                />
                                              </label>
                                            ))}
                                          </div>

                                          <p className="mt-4 text-center text-xs text-slate-500">
                                            Pick one here, then click Save to update the payment type field.
                                          </p>

                                          <div className="mt-5 flex justify-center gap-3">
                                            <label
                                              htmlFor="invoice-payment-type-modal"
                                              className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                            >
                                              Cancel
                                            </label>
                                            <button
                                              type="button"
                                              data-payment-method-save="invoice"
                                              data-payment-method-target="invoice-payment-method-input"
                                              data-payment-method-modal="invoice-payment-type-modal"
                                              className="rounded-xl bg-[#0B1F4D] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                                            >
                                              Save
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <label className="font-bold text-slate-500 sm:text-right">Check / Ref #</label>
                                  <input
                                    name="payment_reference"
                                    placeholder="Check #, ACH trace, etc."
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>

                                <textarea
                                  name="payment_notes"
                                  rows={2}
                                  placeholder="Optional notes..."
                                  className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <div className="flex justify-center gap-3 border-t border-slate-200 pt-5">
                                <label
                                  htmlFor="invoice-payment-modal"
                                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Cancel
                                </label>

                                <SubmitButton
                                  pendingText="Saving payment..."
                                  className="rounded-xl bg-[#0B1F4D] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                                >
                                  Save Payment
                                </SubmitButton>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="fixed inset-0 z-50 hidden items-start justify-center overflow-y-auto bg-black/60 p-4 peer-checked/journal:flex sm:items-center">
                    <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-[#5BC0EB] px-5 py-4 text-white">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-bold">
                              Journal Entry
                            </h4>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                journalIsComplete
                                  ? "bg-green-100 text-green-800"
                                  : "bg-white/20 text-white"
                              }`}
                            >
                              {journalIsComplete ? "Complete" : "Open"}
                            </span>
                          </div>
                          <p className="text-sm text-white/90">
                            Edit people, ID verification, documents, signatures, and notes.
                          </p>
                        </div>

                        <label
                          htmlFor="journal-workspace-modal"
                          className="cursor-pointer rounded-xl border border-white/60 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Cancel
                        </label>
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

                                <div className="flex flex-col items-end gap-2">
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
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                                      String(person.signature_data ?? "").startsWith("data:image/")
                                        ? "bg-green-50 text-green-700 ring-green-200"
                                        : "bg-slate-50 text-slate-500 ring-slate-200"
                                    }`}
                                  >
                                    {String(person.signature_data ?? "").startsWith("data:image/")
                                      ? "Signed"
                                      : "Unsigned"}
                                  </span>
                                </div>
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
                                    defaultValue={person.signature_data ?? ""}
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
                        defaultChecked={journalIsComplete}
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
                </div>
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
