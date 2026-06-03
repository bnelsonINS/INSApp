import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import ConfirmAppointmentBox from "./ConfirmAppointmentBox";

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
  if (normalized === "closed") return "bg-green-100 text-green-800";
  if (normalized === "cancelled") return "bg-red-100 text-red-800";

  return "bg-slate-100 text-slate-800";
}

function cleanDisplayName(name: string) {
  return name.replace(/^\d+-/, "");
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
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
      await supabase
        .from("assignments")
        .update({
          status: "Signing Complete",
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)
        .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`);

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

  const { data: titleDocumentFiles } = await supabase.storage
    .from("assignment-documents")
    .list(`title-documents/${assignment.id}`, {
      limit: 100,
      offset: 0,
      sortBy: {
        column: "created_at",
        order: "desc",
      },
    });

  const titleDocumentsWithUrls = await Promise.all(
    (titleDocumentFiles ?? [])
      .filter((file) => file.name !== ".emptyFolderPlaceholder")
      .map(async (file) => {
        const filePath = `title-documents/${assignment.id}/${file.name}`;

        const { data } = await supabase.storage
          .from("assignment-documents")
          .createSignedUrl(filePath, 60 * 60);

        return {
          name: file.name,
          displayName: cleanDisplayName(file.name),
          createdAt: file.created_at,
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
                    key={doc.name}
                    className="flex flex-col justify-between gap-2 rounded-lg border bg-slate-50 p-3 text-sm md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {doc.displayName}
                      </p>
                      <p className="text-xs text-slate-400">
                        Uploaded{" "}
                        {doc.createdAt
                          ? formatActivityDate(doc.createdAt)
                          : "recently"}
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

            <form
              action={uploadReturnedDocuments}
              className="mt-4 rounded-lg border bg-slate-50 p-4"
            >
              <input type="hidden" name="assignment_id" value={assignment.id} />

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
                Upload the signed package, scanbacks, or completed documents.
              </p>

              <button
                type="submit"
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Upload Completed Documents
              </button>
            </form>

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