import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../../src/lib/supabase-admin";
import ApproveCloseButton from "./ApproveCloseButton";
import UploadSubmitButton from "../../../../components/UploadSubmitButton";
import SubmitButton from "../../../../components/SubmitButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Assignment = {
  id: string;
  client_id: string | null;
  notary_id: string | null;
  assigned_notary_id: string | null;
  status: string | null;
  control_number: string | null;
  signing_type: string | null;
  borrower_name: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_address: string | null;
  signing_city: string | null;
  signing_state: string | null;
  signing_zip: string | null;
  fee: number | string | null;
  documents_url: string | null;
  special_instructions: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  drop_date: string | null;
  borrower_phone: string | null;
  borrower_email: string | null;
  assigned_at: string | null;
  client_fee: number | string | null;
  notary_fee: number | string | null;
  created_at: string;
};

type OrderDocument = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  signedUrl: string | null;
};

type ReturnedDocument = {
  id: string;
  document_type: string | null;
  file_name: string;
  file_path: string;
  created_at: string | null;
  signedUrl: string | null;
};

type ActivityItem = {
  id: string;
  action: string | null;
  actor_name: string | null;
  details: string | null;
  created_at: string | null;
};

function formatDate(date: string | null) {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getEstimatedDropDate(signingDate: string | null) {
  if (!signingDate) return null;

  const date = new Date(`${signingDate}T00:00:00`);
  date.setDate(date.getDate() + 1);

  return date.toISOString().split("T")[0];
}

function formatTime(time: string | null) {
  if (!time) return "Time TBD";

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));

  return date.toLocaleTimeString("en-US", {
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

function formatFileSize(size: number | null) {
  if (!size) return "Unknown size";

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(date: string | null) {
  if (!date) return "Recently";

  return new Date(date).toLocaleString();
}

function getTrackingUrl(carrier: string | null, trackingNumber: string | null) {
  if (!carrier || !trackingNumber) return null;

  const cleanCarrier = carrier.toLowerCase().trim();
  const cleanTrackingNumber = encodeURIComponent(trackingNumber.trim());

  if (cleanCarrier === "fedex") {
    return `https://www.fedex.com/fedextrack/?trknbr=${cleanTrackingNumber}`;
  }

  if (cleanCarrier === "ups") {
    return `https://www.ups.com/track?tracknum=${cleanTrackingNumber}`;
  }

  if (cleanCarrier === "usps") {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanTrackingNumber}`;
  }

  if (cleanCarrier === "dhl") {
    return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${cleanTrackingNumber}`;
  }

  return null;
}

function statusBadge(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "new request") return "bg-amber-100 text-amber-800";
  if (normalized === "needs notary") return "bg-amber-100 text-amber-800";
  if (normalized === "not confirmed") return "bg-yellow-100 text-yellow-800";
  if (normalized === "confirmed") return "bg-blue-100 text-blue-800";
  if (normalized === "in progress") return "bg-purple-100 text-purple-800";
  if (normalized === "late") return "bg-red-100 text-red-800";
  if (normalized === "signing complete") return "bg-orange-100 text-orange-800";
  if (normalized === "closed") return "bg-green-100 text-green-800";
  if (normalized === "cancelled") return "bg-red-100 text-red-800";

  return "bg-slate-100 text-slate-800";
}

function progressSteps(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  const steps = [
    "New Request",
    "Assigned",
    "Confirmed",
    "In Progress",
    "Signing Complete",
    "Closed",
  ];

  let activeIndex = 0;

  if (normalized === "new request" || normalized === "needs notary") {
    activeIndex = 0;
  } else if (normalized === "not confirmed") {
    activeIndex = 1;
  } else if (normalized === "confirmed") {
    activeIndex = 2;
  } else if (normalized === "in progress" || normalized === "late") {
    activeIndex = 3;
  } else if (normalized === "signing complete") {
    activeIndex = 4;
  } else if (normalized === "closed") {
    activeIndex = 5;
  }

  return steps.map((step, index) => ({
    label: step,
    complete: index <= activeIndex,
  }));
}

export default async function ClientOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.is_active) {
    redirect("/login");
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select(
      `
      id,
      client_id,
      notary_id,
      assigned_notary_id,
      status,
      control_number,
      signing_type,
      borrower_name,
      signing_date,
      signing_time,
      signing_address,
      signing_city,
      signing_state,
      signing_zip,
      fee,
      documents_url,
      special_instructions,
      shipping_carrier,
      tracking_number,
      drop_date,
      borrower_phone,
      borrower_email,
      assigned_at,
      client_fee,
      notary_fee,
      created_at
    `,
    )
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (assignmentError) {
    console.error("Client order detail load error:", assignmentError);
    redirect("/client/dashboard/orders");
  }

  if (!assignment) {
    console.error("No assignment found for client order detail:", {
      assignmentId: id,
      clientId: user.id,
    });
    redirect("/client/dashboard/orders");
  }

  const order = assignment as Assignment;
  const steps = progressSteps(order.status);
  const trackingUrl = getTrackingUrl(
    order.shipping_carrier,
    order.tracking_number,
  );

  const assignedNotaryId = order.assigned_notary_id || order.notary_id;

  let notaryName = "Awaiting Notary Assignment";

  if (assignedNotaryId) {
    const { data: notaryProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", assignedNotaryId)
      .maybeSingle();

    if (notaryProfile?.full_name) {
      notaryName = notaryProfile.full_name;
    } else if (notaryProfile?.email) {
      notaryName = notaryProfile.email;
    }
  }

  const { data: documents, error: documentsError } = await supabaseAdmin
    .from("order_documents")
    .select("id, file_name, file_path, file_type, file_size, uploaded_at")
    .eq("order_id", order.id)
    .eq("client_id", user.id)
    .order("uploaded_at", { ascending: false });

  if (documentsError) {
    console.error("Client title documents load error:", documentsError);
  }

  const documentsWithUrls: OrderDocument[] = await Promise.all(
    (documents ?? []).map(async (document) => {
      const { data } = await supabaseAdmin.storage
        .from("client-order-documents")
        .createSignedUrl(document.file_path, 60 * 60);

      return {
        ...document,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  const { data: returnedDocuments, error: returnedDocumentsError } =
    await supabaseAdmin
      .from("assignment_uploaded_documents")
      .select("id, document_type, file_name, file_path, created_at")
      .eq("assignment_id", order.id)
      .order("created_at", { ascending: false });

  if (returnedDocumentsError) {
    console.error(
      "Client returned documents load error:",
      returnedDocumentsError,
    );
  }

  const returnedDocumentsWithUrls: ReturnedDocument[] = await Promise.all(
    (returnedDocuments ?? []).map(async (document) => {
      const { data } = await supabaseAdmin.storage
        .from("assignment-documents")
        .createSignedUrl(document.file_path, 60 * 60);

      return {
        ...document,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  const { data: activity, error: activityError } = await supabaseAdmin
    .from("assignment_activity")
    .select("id, action, actor_name, details, created_at")
    .eq("assignment_id", order.id)
    .order("created_at", { ascending: false });

  if (activityError) {
    console.error("Client order activity load error:", activityError);
  }

  const activityItems = (activity ?? []) as ActivityItem[];
  const visibleActivityItems = activityItems.slice(0, 3);
  const hiddenActivityItems = activityItems.slice(3);
  const hasHiddenActivityItems = hiddenActivityItems.length > 0;

  function buildAdminOrderLink(assignmentId: string) {
  return `${getBaseUrl()}/dashboard/orders/${assignmentId}`;
}

function buildNotaryOrderLink(assignmentId: string) {
  return `${getBaseUrl()}/login?redirectTo=${encodeURIComponent(
    `/notary/assignments/${assignmentId}`,
  )}`;
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://indiananotarysolutions.com"
  ).replace(/\/$/, "");
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
    .select(
      "id, client_id, assigned_notary_id, notary_id, control_number, borrower_name",
    )
    .eq("id", assignmentId)
    .eq("client_id", user.id)
    .single();

  if (!assignment) redirect("/client/dashboard/orders");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const actorName = profile?.full_name || profile?.email || "Client";

  await supabase.from("assignment_activity").insert({
    assignment_id: assignmentId,
    action: "Client comment",
    actor_name: actorName,
    details: comment,
  });

  const orderNumber = assignment.control_number || assignmentId;
  const notaryId = assignment.assigned_notary_id || assignment.notary_id;

  const recipientMap = new Map<
    string,
    { recipientType: "admin" | "notary"; orderLink: string }
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

  if (notaryId && notaryId !== user.id) {
    recipientMap.set(notaryId, {
      recipientType: "notary",
      orderLink: buildNotaryOrderLink(assignmentId),
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

A new client note was added to Order-${orderNumber}.

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
      await supabaseAdmin.from("notification_queue").insert(notifications);

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
    }
  }

  revalidatePath(`/client/dashboard/orders/${assignmentId}`);
}

  async function approveAndCloseOrder() {
    "use server";

    await supabaseAdmin
      .from("assignments")
      .update({
        status: "Closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("client_id", user!.id);

    redirect(`/client/dashboard/orders/${order.id}`);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <Link
              href="/client/dashboard/orders"
              className="text-sm font-bold text-blue-300 hover:text-blue-200"
            >
              ← Back to Orders
            </Link>

            <p className="mt-4 text-sm text-slate-300">
              Control # {order.control_number || order.id.slice(0, 8)}
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {order.borrower_name || "Borrower"}
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              {order.signing_type || "Signing"} •{" "}
              {formatDate(order.signing_date)} at{" "}
              {formatTime(order.signing_time)}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <span
              className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${statusBadge(
                order.status,
              )}`}
            >
              {order.status || "New Request"}
            </span>

            {order.status?.toLowerCase() === "signing complete" && (
              <form action={approveAndCloseOrder}>
                <ApproveCloseButton />
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Assignment Summary
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Signer / Borrower
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {order.borrower_name || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">Appointment</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatDate(order.signing_date)}
                </p>
                <p className="text-sm text-slate-600">
                  {formatTime(order.signing_time)}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">
                  Signing Location
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {order.signing_address || "—"}
                </p>
                <p className="text-sm text-slate-600">
                  {order.signing_city || "—"}, {order.signing_state || "IN"}{" "}
                  {order.signing_zip || ""}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">Phone</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {order.borrower_phone || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">Email</p>
                <p className="mt-1 break-all font-semibold text-slate-950">
                  {order.borrower_email || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-500">Client Fee</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatMoney(order.client_fee || order.fee)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Progress</h2>

            <div className="mt-5 space-y-4">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                      step.complete
                        ? "bg-green-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {step.complete ? "✓" : index + 1}
                  </span>

                  <span
                    className={`text-sm font-semibold ${
                      step.complete ? "text-slate-950" : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Notary Status</h2>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">
                Assigned Notary
              </p>

              <p className="mt-1 font-semibold text-slate-950">{notaryName}</p>

              {order.assigned_at && assignedNotaryId && (
                <p className="mt-2 text-xs text-slate-500">
                  Assigned {new Date(order.assigned_at).toLocaleString()}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Shipping / Tracking
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">Carrier</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {order.shipping_carrier || "—"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">
                  Tracking Number
                </p>

                {trackingUrl && order.tracking_number ? (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all font-semibold text-blue-700 underline hover:text-blue-900"
                  >
                    {order.tracking_number}
                  </a>
                ) : (
                  <p className="mt-1 break-all font-semibold text-slate-950">
                    {order.tracking_number || "—"}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">
                  Est. Drop Date
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatDate(
                    order.drop_date || getEstimatedDropDate(order.signing_date),
                  )}
                </p>
              </div>
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Special Instructions
            </h2>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {order.special_instructions || "No special instructions."}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Title Documents
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Upload title documents or closing packages for this signing.
            </p>

            <form
              action={`/client/dashboard/orders/${order.id}/documents/upload`}
              method="POST"
              encType="multipart/form-data"
              className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <label className="block text-sm font-bold text-slate-700">
                Upload Title Documents
              </label>

              <input
                type="file"
                name="document"
                required
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="
    mt-3 w-full rounded-xl border border-slate-300 bg-white p-3
    text-sm font-medium text-slate-900
    file:mr-4 file:rounded-lg file:border-0
    file:bg-[#0B1F4D] file:px-4 file:py-2
    file:text-sm file:font-bold file:text-white
    hover:file:bg-blue-950
  "
              />

              <p className="mt-2 text-xs text-slate-500">
                Upload closing packages, scanbacks, title docs, or supporting
                documents.
              </p>

              <UploadSubmitButton
                loadingText="Uploading documents..."
                className="mt-4 rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
              >
                Upload Title Documents
              </UploadSubmitButton>
            </form>

            {!documentsWithUrls.length ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="font-bold text-slate-800">
                  No title documents uploaded yet
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Uploaded title documents will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {documentsWithUrls.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-bold text-slate-950">
                      {document.file_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {document.file_type || "File"} ·{" "}
                      {formatFileSize(document.file_size)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Uploaded {formatDateTime(document.uploaded_at)}
                    </p>

                    {document.signedUrl ? (
                      <a
                        href={document.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                      >
                        View Document
                      </a>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">
                        File unavailable
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Returned Documents
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Signed documents returned by the notary will appear here.
            </p>

            {!returnedDocumentsWithUrls.length ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="font-bold text-slate-800">
                  No returned documents yet
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Once the notary uploads completed documents, they will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {returnedDocumentsWithUrls.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-bold text-slate-950">
                      {document.file_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {document.document_type || "Returned Document"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Uploaded {formatDateTime(document.created_at)}
                    </p>

                    {document.signedUrl ? (
                      <a
                        href={document.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                      >
                        View Returned Document
                      </a>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">
                        File unavailable
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>


        </main>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Order Notes</h2>

        <p className="mt-1 text-sm text-slate-500">
          Add a note for this order. Notes from the client, notary, and admin
          will appear below.
        </p>

        <form action={addOrderNote} className="mt-5 space-y-3">
          <input type="hidden" name="assignment_id" value={order.id} />

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

        {!activityItems.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="font-bold text-slate-800">No notes yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Notes added by the client, notary, or admin will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {visibleActivityItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-bold text-slate-950">
                  {item.action || "Order note"}
                </p>

                {item.actor_name && (
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {item.actor_name}
                  </p>
                )}

                <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                  {item.details || "—"}
                </p>

                <p className="mt-3 text-xs font-medium text-slate-400">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
            ))}

            {hasHiddenActivityItems && (
              <details className="group space-y-3">
                <summary className="cursor-pointer list-none text-sm font-bold text-[#0B1F4D] hover:underline">
                  <span className="group-open:hidden">View All</span>
                  <span className="hidden group-open:inline">Show Less</span>
                </summary>

                <div className="space-y-3">
                  {hiddenActivityItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="font-bold text-slate-950">
                        {item.action || "Order note"}
                      </p>

                      {item.actor_name && (
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {item.actor_name}
                        </p>
                      )}

                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                        {item.details || "—"}
                      </p>

                      <p className="mt-3 text-xs font-medium text-slate-400">
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Activity</h2>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Order created</p>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        {assignedNotaryId && (
          <div className="mt-3 rounded-2xl bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-950">
              Notary assigned
            </p>
            <p className="mt-1 text-xs text-blue-700">
              {notaryName}
              {order.assigned_at
                ? ` · ${new Date(order.assigned_at).toLocaleString()}`
                : ""}
            </p>
          </div>
        )}

        {documentsWithUrls.length > 0 && (
          <div className="mt-3 rounded-2xl bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-950">
              {documentsWithUrls.length} title document
              {documentsWithUrls.length === 1 ? "" : "s"} uploaded
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Most recent upload:{" "}
              {formatDateTime(documentsWithUrls[0].uploaded_at)}
            </p>
          </div>
        )}

        {returnedDocumentsWithUrls.length > 0 && (
          <div className="mt-3 rounded-2xl bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-950">
              {returnedDocumentsWithUrls.length} returned document
              {returnedDocumentsWithUrls.length === 1 ? "" : "s"} uploaded
            </p>
            <p className="mt-1 text-xs text-green-700">
              Most recent return:{" "}
              {formatDateTime(returnedDocumentsWithUrls[0].created_at)}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
