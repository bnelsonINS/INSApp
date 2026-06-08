import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";
import ConfirmAppointmentBox from "./ConfirmAppointmentBox";
import CloseDetailsButton from "./CloseDetailsButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function statusBadge(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "not confirmed") return "bg-yellow-100 text-yellow-800";
  if (normalized === "confirmed") return "bg-blue-100 text-blue-800";
  if (normalized === "in progress") return "bg-purple-100 text-purple-800";
  if (normalized === "late") return "bg-red-100 text-red-800";
  if (normalized === "signing complete") return "bg-orange-100 text-orange-800";
  if (normalized === "did not sign") return "bg-red-100 text-red-800";
  if (normalized === "closed") return "bg-green-100 text-green-800";
  if (normalized === "cancelled") return "bg-red-100 text-red-800";

  return "bg-slate-100 text-slate-800";
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
  signingTime: string
) {
  const normalized = (assignment.status ?? "").toLowerCase();

  if (normalized === "not confirmed") {
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
        <button className="rounded-lg bg-purple-700 px-4 py-2 text-white">
          Start Signing
        </button>
      </form>
    );
  }

  if (normalized === "in progress" || normalized === "late") {
    return (
      <a
        href="#upload-documents"
        className="rounded-lg bg-orange-600 px-4 py-2 text-white"
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

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      action: "Notary comment",
      actor_name: actorName,
      details: comment,
    });

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
          ", "
        )}`,
      });
    }

    revalidatePath(`/notary/assignments/${assignmentId}`);
  }

  async function markScanbacksComplete(formData: FormData) {
  "use server";

  const assignmentId = String(formData.get("assignment_id") ?? "");
  const signingStatus = String(formData.get("signing_status") ?? "");
  const shippingCarrier = String(formData.get("shipping_carrier") ?? "").trim();
  const trackingNumber = String(formData.get("tracking_number") ?? "").trim();
  const completionNotes = String(formData.get("completion_notes") ?? "").trim();
  const notifyClient = formData.get("notify_client") === "on";

  if (!assignmentId) return;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, status, signing_date, client_id, control_number, borrower_name")
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

  if (finalStatus === "Signing Complete" && notifyClient && assignment.client_id) {
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
    })
  );

  const { data: titleDocuments } = await supabaseAdmin
    .from("order_documents")
    .select("id, file_name, file_path, file_type, file_size")
    .eq("order_id", assignment.id)
    .order("file_name", { ascending: true });

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
    })
  );

  const signingDate = formatDate(assignment.signing_date);
  const signingTime = formatTime(assignment.signing_time);
  const notaryFee = assignment.notary_fee ?? null;

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
          (step) => step.toLowerCase() === normalizedStatus
        );

  const showUploadDocuments =
    normalizedStatus !== "signing complete" &&
    normalizedStatus !== "did not sign" &&
    normalizedStatus !== "closed" &&
    normalizedStatus !== "cancelled";

  const canMarkScanbacksComplete =
    showUploadDocuments && documentsWithUrls.length > 0;

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="rounded-xl bg-white p-5 shadow sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm text-slate-500">
              Control # {assignment.control_number ?? "—"}
            </p>

            <h1 className="text-2xl font-bold">
              {assignment.borrower_name ?? "Assignment"}
            </h1>

            <p className="text-slate-600">
              {assignment.signing_type ?? "Signing"} • {signingDate}{" "}
              {signingTime && `at ${signingTime}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${statusBadge(
                assignment.status
              )}`}
            >
              {assignment.status ?? "Unknown"}
            </span>

            {nextAction(assignment, signingDate, signingTime)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">Assignment Summary</h2>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-700">
                  Signer / Borrower
                </p>
                <p>{assignment.borrower_name ?? "—"}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">Appointment</p>
                <p>{signingDate}</p>
                <p>{signingTime || "Time not set"}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">
                  Signing Location
                </p>
                <p>{assignment.signing_address ?? "—"}</p>
                <p>
                  {assignment.signing_city ?? "—"},{" "}
                  {assignment.signing_state ?? "IN"}{" "}
                  {assignment.signing_zip ?? ""}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">Notary Fee</p>
                <p className="text-xl font-bold">{formatMoney(notaryFee)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">Progress</h2>

            <div className="mt-4 space-y-3">
              {progressSteps.map((step, index) => {
                const completed =
                  currentStepIndex >= 0 && index <= currentStepIndex;

                return (
                  <div key={step} className="flex items-center gap-3 text-sm">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        completed
                          ? "bg-green-600 text-white"
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

          <section className="rounded-xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">Payment</h2>

            <div className="mt-4 text-sm">
              <p className="font-semibold text-slate-700">Your Fee</p>
              <p className="text-xl font-bold">{formatMoney(notaryFee)}</p>
            </div>
          </section>
        </aside>

        <section className="space-y-6">
          <section className="rounded-xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">Special Instructions</h2>

            <div className="mt-4 rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
              {assignment.special_instructions ? (
                <p>{assignment.special_instructions}</p>
              ) : (
                <p>No special instructions have been added.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">Title Documents</h2>
            <p className="text-sm text-slate-500">
              Documents provided for this signing.
            </p>

            {!titleDocumentsWithUrls.length ? (
              <div className="mt-4 rounded-lg border p-4 text-sm text-slate-500">
                No title documents have been uploaded yet.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {titleDocumentsWithUrls.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between gap-2 rounded-lg border bg-slate-50 p-3 text-sm md:flex-row md:items-center"
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
                        className="rounded-lg bg-slate-900 px-3 py-2 text-center text-white"
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
            className="rounded-xl bg-white p-5 shadow"
          >
            <h2 className="text-lg font-semibold">Returned Documents</h2>
            <p className="text-sm text-slate-500">
              Signed documents you have uploaded.
            </p>

            {showUploadDocuments && (
              <>
                <form
                  id="returned-documents-upload-form"
                  action={uploadReturnedDocuments}
                  className="mt-4 rounded-lg border bg-slate-50 p-4"
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
                    className="mt-2 w-full rounded-lg border bg-white p-3 text-sm"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Upload the signed package, scanbacks, or completed
                    documents.
                  </p>
                </form>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    form="returned-documents-upload-form"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Upload Completed Documents
                  </button>

                  {canMarkScanbacksComplete && (
                    <details className="group">
                      <summary className="list-none cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                        ✓ Scanbacks Upload Complete
                      </summary>

                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
                          <div className="flex items-center justify-between border-b p-5">
                            <h3 className="text-xl font-bold text-slate-900">
                              Signing Status
                            </h3>

                            <span className="text-sm text-slate-400">
                              Click outside is disabled
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
                                defaultValue="FedEx"
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                              >
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
                                placeholder="Enter tracking number"
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-slate-700">
                                Completion Notes
                              </label>

                              <textarea
                                name="completion_notes"
                                rows={4}
                                placeholder="Example: Funds collected. Documents signed successfully."
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                              />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                name="notify_client"
                                defaultChecked
                              />
                              Notify Client
                            </label>

                            <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
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
                                <span className="font-semibold">
                                  Location:
                                </span>{" "}
                                {assignment.signing_address ?? "—"},{" "}
                                {assignment.signing_city ?? "—"},{" "}
                                {assignment.signing_state ?? "IN"}{" "}
                                {assignment.signing_zip ?? ""}
                              </p>
                            </div>

                            <div className="flex justify-end gap-3 border-t pt-5">
                              <CloseDetailsButton />

                              <button
                                type="submit"
                                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                              >
                                Save
                              </button>
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
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                Scanbacks upload has been marked complete. Returned documents
                are locked for this assignment.
              </div>
            )}

            {!documentsWithUrls.length ? (
              <div className="mt-4 rounded-lg border p-4 text-sm text-slate-500">
                No uploaded documents yet.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {documentsWithUrls.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between gap-2 rounded-lg border bg-slate-50 p-3 text-sm md:flex-row md:items-center"
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
                        className="rounded-lg bg-slate-900 px-3 py-2 text-center text-white"
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

          <section className="rounded-xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">Order Notes</h2>
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
                className="w-full rounded-lg border p-3 text-sm outline-none focus:border-slate-900"
              />

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Add Note
              </button>
            </form>
          </section>

          <section className="rounded-xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">Activity</h2>

            {!activity?.length ? (
              <div className="mt-4 rounded-lg border p-4 text-sm text-slate-500">
                No activity yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{item.action}</p>

                    {item.actor_name && (
                      <p className="text-slate-600">{item.actor_name}</p>
                    )}

                    <p className="whitespace-pre-line text-slate-600">
                      {item.details ?? "—"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatActivityDate(item.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}