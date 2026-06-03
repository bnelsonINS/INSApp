import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

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

  if (normalized === "new request") return "bg-blue-100 text-blue-800";
  if (normalized === "not confirmed") return "bg-amber-100 text-amber-800";
  if (normalized === "confirmed") return "bg-purple-100 text-purple-800";
  if (normalized === "in progress") return "bg-indigo-100 text-indigo-800";
  if (normalized === "late") return "bg-red-100 text-red-800";
  if (normalized === "docs uploaded") return "bg-orange-100 text-orange-800";
  if (normalized === "qa") return "bg-teal-100 text-teal-800";
  if (normalized === "signing complete") return "bg-orange-100 text-orange-800";
  if (normalized === "completed") return "bg-green-100 text-green-800";
  if (normalized === "closed") return "bg-green-100 text-green-800";
  if (normalized === "cancelled") return "bg-red-100 text-red-800";

  return "bg-slate-100 text-slate-700";
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

function cleanDisplayName(name: string) {
  return name.replace(/^\d+-/, "");
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  async function addActivityComment(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "");
    const comment = String(formData.get("comment") ?? "").trim();

    if (!assignmentId || !comment) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || !profile.is_active) {
      redirect("/login");
    }

    const name = profile.full_name || profile.email || "Admin";

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      action: "Comment",
      details: `${name}\n${comment}`,
    });

    revalidatePath(`/dashboard/orders/${assignmentId}`);
  }

  async function uploadTitleDocuments(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "");
    const files = formData
      .getAll("title_documents")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (!assignmentId || files.length === 0) return;

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || !profile.is_active) {
      redirect("/login");
    }

    const { data: order } = await supabase
      .from("assignments")
      .select(
        "id, control_number, borrower_name, assigned_notary_id, notary_id, signing_date, signing_time, signing_address, signing_city, signing_state, signing_zip"
      )
      .eq("id", assignmentId)
      .single();

    if (!order) redirect("/dashboard/orders");

    const uploadedNames: string[] = [];
    let latestFilePath: string | null = null;

    for (const file of files) {
      const cleanName = safeFileName(file.name || "title-document.pdf");
      const filePath = `title-documents/${assignmentId}/${Date.now()}-${cleanName}`;

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
          action: "Title Documents Upload Failed",
          details: uploadError.message,
        });

        continue;
      }

      uploadedNames.push(file.name);
      latestFilePath = filePath;
    }

    if (latestFilePath) {
      await supabase
        .from("assignments")
        .update({
          documents_url: latestFilePath,
        })
        .eq("id", assignmentId);
    }

    if (uploadedNames.length > 0) {
      await supabase.from("assignment_activity").insert({
        assignment_id: assignmentId,
        action: "Title Documents Uploaded",
        details: `${profile.full_name || profile.email || "Admin"}\nUploaded ${uploadedNames.length} file(s): ${uploadedNames.join(", ")}`,
      });

      const assignedNotaryId =
        order.assigned_notary_id ?? order.notary_id ?? null;

      if (assignedNotaryId) {
        const { data: assignedNotaryProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", assignedNotaryId)
          .single();

        const assignedNotaryEmail = assignedNotaryProfile?.email ?? null;

        if (assignedNotaryEmail) {
          await supabase.from("notification_queue").insert({
            user_id: assignedNotaryId,
            channel: "email",
            type: "title_documents_uploaded",
            status: "pending",
            subject: `Documents Uploaded - ${order.control_number ?? "Order"}`,
            message: `
Indiana Notary Solutions

Title documents have been uploaded for your assigned order.

Order Number: ${order.control_number ?? "—"}
Borrower: ${order.borrower_name ?? "—"}
Files Uploaded: ${uploadedNames.length}

Signing Date: ${formatDate(order.signing_date)}
Signing Time: ${formatTime(order.signing_time) || "—"}
Signing Address: ${order.signing_address ?? "—"}
${order.signing_city ?? "—"}, ${order.signing_state ?? "IN"} ${
              order.signing_zip ?? ""
            }

Please log in to your notary dashboard to review the documents.
            `.trim(),
            metadata: {
              email: assignedNotaryEmail,
              assignment_id: assignmentId,
              control_number: order.control_number,
              file_names: uploadedNames,
            },
          });
        } else {
          await supabase.from("assignment_activity").insert({
            assignment_id: assignmentId,
            action: "Title Documents Notification Failed",
            details: "The assigned notary does not have an email address on their profile.",
          });
        }
      }
    }

    revalidatePath(`/dashboard/orders/${assignmentId}`);
  }

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

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    redirect("/login");
  }

  const { data: order } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) redirect("/dashboard/orders");

  const { data: notaries } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_active")
    .eq("role", "notary")
    .eq("is_active", true)
    .order("email");

  const { data: activity } = await supabase
    .from("assignment_activity")
    .select("*")
    .eq("assignment_id", id)
    .order("created_at", { ascending: false });

  const { data: uploadedDocuments } = await supabase
    .from("assignment_uploaded_documents")
    .select("*")
    .eq("assignment_id", id)
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
    .list(`title-documents/${id}`, {
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    });

  const titleDocumentsWithUrls = await Promise.all(
    (titleDocumentFiles ?? [])
      .filter((file) => file.name !== ".emptyFolderPlaceholder")
      .map(async (file) => {
        const filePath = `title-documents/${id}/${file.name}`;

        const { data } = await supabase.storage
          .from("assignment-documents")
          .createSignedUrl(filePath, 60 * 60);

        return {
          name: file.name,
          displayName: cleanDisplayName(file.name),
          createdAt: file.created_at,
          updatedAt: file.updated_at,
          size: file.metadata?.size,
          signedUrl: data?.signedUrl ?? null,
        };
      })
  );

  const signingDate = formatDate(order.signing_date);
  const signingTime = formatTime(order.signing_time);

  const assignedNotaryId = order.assigned_notary_id ?? order.notary_id ?? null;

  const assignedNotary = notaries?.find(
    (notary) => notary.id === assignedNotaryId
  );

  const titleCompanyFee = order.client_fee ?? order.fee ?? null;
  const notaryFee = order.notary_fee ?? null;

  const profit =
    titleCompanyFee !== null &&
    titleCompanyFee !== undefined &&
    notaryFee !== null &&
    notaryFee !== undefined
      ? Number(titleCompanyFee) - Number(notaryFee)
      : null;

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <a
              href="/dashboard/orders"
              className="text-sm font-bold text-slate-300 underline hover:text-white"
            >
              ← Back to Orders
            </a>

            <p className="mt-5 text-sm text-slate-300">
              Control # {order.control_number ?? "—"}
            </p>

            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {order.borrower_name ?? "Order"}
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              {order.signing_type ?? "Signing"} • {signingDate}{" "}
              {signingTime && `at ${signingTime}`}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${statusBadge(
                order.status
              )}`}
            >
              {order.status ?? "Unknown"}
            </span>

            <a
              href={`/dashboard/orders/${id}/edit`}
              className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-slate-950 hover:bg-slate-100"
            >
              Edit Order
            </a>

<form action={`/dashboard/orders/${id}/cancel`} method="POST">
  <button
    type="submit"
    className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
  >
    Cancel Order
  </button>
</form>

          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Title Company Fee
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-950">
            {formatMoney(titleCompanyFee)}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-700">Notary Fee</p>
          <p className="mt-2 text-3xl font-bold text-amber-950">
            {formatMoney(notaryFee)}
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-green-700">Profit</p>
          <p className="mt-2 text-3xl font-bold text-green-950">
            {formatMoney(profit)}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Order Summary</h2>

            <div className="mt-5 space-y-5 text-sm">
              <div>
                <p className="font-bold text-slate-500">Borrower</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {order.borrower_name ?? "—"}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-500">Phone</p>
                <p className="mt-1">{order.borrower_phone ?? "—"}</p>
              </div>

              <div>
                <p className="font-bold text-slate-500">Email</p>
                <p className="mt-1 break-all">{order.borrower_email ?? "—"}</p>
              </div>

              <div>
                <p className="font-bold text-slate-500">Appointment</p>
                <p className="mt-1">{signingDate}</p>
                <p>{signingTime || "Time not set"}</p>
              </div>

              <div>
                <p className="font-bold text-slate-500">Signing Location</p>
                <p className="mt-1">{order.signing_address ?? "—"}</p>
                <p>
                  {order.signing_city ?? "—"}, {order.signing_state ?? "IN"}{" "}
                  {order.signing_zip ?? ""}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Assigned Notary
            </h2>

            <div className="mt-4">
              {assignedNotary ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="font-bold text-blue-950">
                    {assignedNotary.full_name || "Unnamed Notary"}
                  </p>
                  <p className="mt-1 break-all text-sm text-blue-700">
                    {assignedNotary.email}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-bold">No notary assigned.</p>
                  <p className="mt-1">
                    Edit the order to assign this signing to a notary.
                  </p>
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Special Instructions
            </h2>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {order.special_instructions ||
                order.instructions ||
                "No special instructions entered."}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Title Documents
                </h2>
                <p className="text-sm text-slate-500">
                  Admin-uploaded documents provided to the notary for this
                  signing.
                </p>
              </div>
            </div>

            <form
              action={uploadTitleDocuments}
              className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <input type="hidden" name="assignment_id" value={id} />

              <label className="block text-sm font-bold text-slate-700">
                Upload title documents
              </label>

              <input
                type="file"
                name="title_documents"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              />

              <p className="mt-2 text-xs text-slate-500">
                You can select and upload multiple documents at once.
              </p>

              <button className="mt-4 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                Upload Title Documents
              </button>
            </form>

            <div className="mt-4 space-y-3">
              {!titleDocumentsWithUrls.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No title documents uploaded yet.
                </div>
              ) : (
                titleDocumentsWithUrls.map((doc) => (
                  <a
                    key={doc.name}
                    href={doc.signedUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-blue-100 bg-blue-50 p-4 hover:bg-blue-100"
                  >
                    <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                      <div>
                        <p className="font-bold text-blue-950">
                          {doc.displayName}
                        </p>
                        <p className="text-sm text-blue-700">
                          Click to open document
                        </p>
                        <p className="text-xs text-slate-500">
                          Uploaded {formatActivityDate(doc.createdAt)}
                        </p>
                      </div>

                      <span className="rounded-xl bg-slate-950 px-4 py-2 text-center text-sm font-bold text-white">
                        Open
                      </span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Uploaded Notary Documents
            </h2>
            <p className="text-sm text-slate-500">
              Signed documents uploaded by the notary.
            </p>

            <div className="mt-4 space-y-3">
              {!documentsWithUrls.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No signed documents uploaded yet.
                </div>
              ) : (
                documentsWithUrls.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-green-100 bg-green-50 p-4 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-bold text-green-950">
                        {doc.label || doc.document_type || "Signed Document"}
                      </p>
                      <p className="text-sm text-green-700">
                        {doc.file_name || "Uploaded file"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Uploaded {formatActivityDate(doc.created_at)}
                      </p>
                    </div>

                    {doc.signedUrl && (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-slate-950 px-4 py-2 text-center text-sm font-bold text-white hover:bg-slate-800"
                      >
                        View File
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Order Chat / Notes
            </h2>
            <p className="text-sm text-slate-500">
              Add a note for this order. It will appear in the activity log
              below.
            </p>

            <form action={addActivityComment} className="mt-4 space-y-3">
              <input type="hidden" name="assignment_id" value={id} />

              <textarea
                name="comment"
                rows={4}
                placeholder="Type your message..."
                className="w-full rounded-xl border p-3"
                required
              />

              <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                Add Comment
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Activity</h2>

            <div className="mt-4 space-y-3">
              {!activity?.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No activity yet.
                </div>
              ) : (
                activity.map((item) => {
                  const details = String(item.details ?? "");
                  const [name, ...messageParts] = details.split("\n");
                  const message = messageParts.join("\n");

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                        <p className="font-bold text-slate-950">
                          {item.action ?? "Activity"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatActivityDate(item.created_at)}
                        </p>
                      </div>

                      {message ? (
                        <>
                          <p className="mt-2 text-sm font-semibold text-slate-600">
                            {name}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                            {message}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {details || "—"}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}