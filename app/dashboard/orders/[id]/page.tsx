import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import SubmitButton from "../../../components/SubmitButton";
import CancelOrderButton from "./CancelOrderButton";

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

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function formatScore(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "100";

  const score = Number(value);
  if (Number.isNaN(score)) return "100";

  return score.toFixed(0);
}

function scoreBadge(score: number | string | null | undefined) {
  const value = Number(score ?? 100);

  if (value >= 90) return "bg-green-100 text-green-800 border-green-200";
  if (value >= 75) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
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

  console.log("[AdminOrderDetailPage] Page loaded", { orderId: id });

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

    console.log("[uploadTitleDocuments] Started", {
      assignmentId,
      fileCount: files.length,
      fileNames: files.map((file) => file.name),
    });

    if (!assignmentId || files.length === 0) {
      console.log(
        "[uploadTitleDocuments] Stopped - missing assignmentId or files",
        {
          assignmentId,
          fileCount: files.length,
        },
      );
      return;
    }

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
        "id, client_id, control_number, borrower_name, assigned_notary_id, notary_id, signing_date, signing_time, signing_address, signing_city, signing_state, signing_zip",
      )
      .eq("id", assignmentId)
      .single();

    if (!order) {
      console.log("[uploadTitleDocuments] Order not found", { assignmentId });
      redirect("/dashboard/orders");
    }

    console.log("[uploadTitleDocuments] Order found", {
      assignmentId,
      clientId: order.client_id,
      controlNumber: order.control_number,
    });

    const uploadedNames: string[] = [];
    let latestFilePath: string | null = null;

    for (const file of files) {
      const cleanName = safeFileName(file.name || "title-document.pdf");
      const filePath = `${order.client_id}/${assignmentId}/${Date.now()}-${cleanName}`;

      console.log("[uploadTitleDocuments] Uploading file", {
        bucket: "client-order-documents",
        assignmentId,
        fileName: file.name,
        filePath,
        fileType: file.type,
        fileSize: file.size,
      });

      const { error: uploadError } = await supabase.storage
        .from("client-order-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      uploadedNames.push(file.name);
      latestFilePath = filePath;

      const { data: insertedOrderDocument, error: insertOrderDocumentError } =
        await supabase
          .from("order_documents")
          .insert({
            order_id: assignmentId,
            client_id: order.client_id,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
          })
          .select("id, order_id, client_id, file_name, file_path")
          .single();
    }

    if (latestFilePath) {
      const { error: assignmentUpdateError } = await supabase
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
            details:
              "The assigned notary does not have an email address on their profile.",
          });
        }
      }
    }

    revalidatePath(`/dashboard/orders/${assignmentId}`);
  }

  async function applyScoreDeduction(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "");
    const notaryId = String(formData.get("notary_id") ?? "");
    const ruleId = String(formData.get("rule_id") ?? "");
    const adminNotes = String(formData.get("admin_notes") ?? "").trim();
   const now = new Date();
const scoreYear = now.getFullYear();
const scoreMonth = now.getMonth() + 1;

console.log("[applyScoreDeduction] START");
console.log("[applyScoreDeduction] ruleId:", ruleId);
console.log("[applyScoreDeduction] notaryId:", notaryId);
console.log("[applyScoreDeduction] assignmentId:", assignmentId);
console.log("[applyScoreDeduction] adminNotes:", adminNotes);

    if (!assignmentId || !notaryId || !ruleId) return;

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

    const { data: rule } = await supabase
      .from("notary_score_rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    if (!rule) return;

    console.log("[applyScoreDeduction] Rule loaded:", rule);

    const rawPoints = Number(rule.default_points ?? 0);
const pointsChange = rawPoints > 0 ? -rawPoints : rawPoints;

    const {
  data: insertScoreEventData,
  error: insertScoreEventError,
} = await supabase
  .from("notary_score_events")
  .insert({
    notary_id: notaryId,
    assignment_id: assignmentId,
    rule_id: ruleId,
    event_type: rule.code ?? "admin_score_issue",
    points_change: pointsChange,
    points: pointsChange,
    notes: adminNotes || null,
    message: adminNotes || null,
    created_by: user.id,
  })
  .select();

console.log("[applyScoreDeduction] Insert payload:", {
  notary_id: notaryId,
  assignment_id: assignmentId,
  rule_id: ruleId,
  event_type: rule.code ?? "admin_score_issue",
  points_change: pointsChange,
  points: pointsChange,
  notes: adminNotes || null,
  message: adminNotes || null,
  created_by: user.id,
});

if (insertScoreEventError) {
  console.error(
    "[applyScoreDeduction] Insert failed:",
    insertScoreEventError
  );

  return;
}

console.log(
  "[applyScoreDeduction] Insert succeeded:",
  insertScoreEventData
);

    await supabase.rpc("recalculate_notary_monthly_score", {
  p_notary_id: notaryId,
  p_year: scoreYear,
  p_month: scoreMonth,
});

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      action: "Notary Score Issue Applied",
      details: `${profile.full_name || profile.email || "Admin"}\n${rule.label ?? rule.code ?? "Score issue"} (${pointsChange} pts)${adminNotes ? `\n${adminNotes}` : ""}`,
    });

    revalidatePath(`/dashboard/orders/${assignmentId}`);
  }

  async function reverseScoreEvent(formData: FormData) {
    "use server";

    const assignmentId = String(formData.get("assignment_id") ?? "");
    const eventId = String(formData.get("event_id") ?? "");
    const notaryId = String(formData.get("notary_id") ?? "");
   const now = new Date();
const scoreYear = now.getFullYear();
const scoreMonth = now.getMonth() + 1;

    if (!assignmentId || !eventId || !notaryId) return;

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

    await supabase
      .from("notary_score_events")
      .update({
        reversed_at: new Date().toISOString(),
        reversed_by: user.id,
      })
      .eq("id", eventId)
      .is("reversed_at", null);

    await supabase.rpc("recalculate_notary_monthly_score", {
  p_notary_id: notaryId,
  p_year: scoreYear,
  p_month: scoreMonth,
});

    await supabase.from("assignment_activity").insert({
      assignment_id: assignmentId,
      action: "Notary Score Issue Reversed",
      details: `${profile.full_name || profile.email || "Admin"}\nReversed a notary score issue entered on this order.`,
    });

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

  const { data: order, error: orderError } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .single();

  console.log("[AdminOrderDetailPage] Assignment query result", {
    orderId: id,
    hasOrder: Boolean(order),
    orderError: orderError
      ? {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code,
        }
      : null,
  });

  if (!order) redirect("/dashboard/orders");

  const { data: notaries } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_active")
    .eq("role", "notary")
    .eq("is_active", true)
    .order("email");

  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("id, company_name, full_name")
    .eq("id", order.client_id)
    .single();

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
    }),
  );

  console.log("[AdminOrderDetailPage] Fetching title documents", {
    table: "order_documents",
    orderId: id,
    bucket: "client-order-documents",
  });

  const { data: orderDocuments, error: orderDocumentsError } = await supabase
    .from("order_documents")
    .select(
      "id, order_id, client_id, file_name, file_path, file_type, file_size, uploaded_at, created_at",
    )
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  console.log("[AdminOrderDetailPage] order_documents query result", {
    orderId: id,
    count: orderDocuments?.length ?? 0,
    rows: orderDocuments ?? [],
    error: orderDocumentsError
      ? {
          message: orderDocumentsError.message,
          details: orderDocumentsError.details,
          hint: orderDocumentsError.hint,
          code: orderDocumentsError.code,
        }
      : null,
  });

  let titleDocumentsWithUrls = await Promise.all(
    (orderDocuments ?? []).map(async (doc) => {
      const { data, error } = await supabase.storage
        .from("client-order-documents")
        .createSignedUrl(doc.file_path, 60 * 60);

      return {
        name:
          doc.file_name || doc.file_path?.split("/").pop() || "title-document",
        displayName:
          doc.file_name ||
          cleanDisplayName(doc.file_path?.split("/").pop() || "title-document"),
        createdAt:
          doc.uploaded_at ?? doc.created_at ?? order.created_at ?? null,
        updatedAt: null,
        size: doc.file_size,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  console.log("[AdminOrderDetailPage] Title documents ready for render", {
    orderId: id,
    count: titleDocumentsWithUrls.length,
    docs: titleDocumentsWithUrls.map((doc) => ({
      name: doc.name,
      displayName: doc.displayName,
      hasSignedUrl: Boolean(doc.signedUrl),
      createdAt: doc.createdAt,
      size: doc.size,
    })),
  });

  if (order.documents_url) {
    console.log(
      "[AdminOrderDetailPage] Checking fallback order.documents_url",
      {
        orderId: id,
        documentsUrl: order.documents_url,
      },
    );

    let fallbackTitleDocumentPath = String(order.documents_url);

    if (fallbackTitleDocumentPath.includes("/assignment-documents/")) {
      fallbackTitleDocumentPath = fallbackTitleDocumentPath.split(
        "/assignment-documents/",
      )[1];
    }

    const fallbackTitleDocumentName =
      fallbackTitleDocumentPath.split("/").pop() || "title-document";

    const alreadyListed = titleDocumentsWithUrls.some(
      (doc) => doc.name === fallbackTitleDocumentName,
    );

    if (!alreadyListed) {
      const { data, error } = await supabase.storage
        .from("client-order-documents")
        .createSignedUrl(fallbackTitleDocumentPath, 60 * 60);

      titleDocumentsWithUrls = [
        {
          name: fallbackTitleDocumentName,
          displayName: cleanDisplayName(fallbackTitleDocumentName),
          createdAt: order.created_at ?? null,
          updatedAt: null,
          size: undefined,
          signedUrl: data?.signedUrl ?? null,
        },
        ...titleDocumentsWithUrls,
      ];
    }
  }

  console.log("[AdminOrderDetailPage] Final title documents after fallback", {
    orderId: id,
    count: titleDocumentsWithUrls.length,
    docs: titleDocumentsWithUrls.map((doc) => ({
      name: doc.name,
      displayName: doc.displayName,
      hasSignedUrl: Boolean(doc.signedUrl),
      createdAt: doc.createdAt,
      size: doc.size,
    })),
  });

  const signingDate = formatDate(order.signing_date);
  const signingTime = formatTime(order.signing_time);

  const assignedNotaryId = order.assigned_notary_id ?? order.notary_id ?? null;

  const assignedNotary = notaries?.find(
    (notary: { id: string }) => notary.id === assignedNotaryId,
  );

  const nowForScore = new Date();
const currentScoreYear = nowForScore.getFullYear();
const currentScoreMonth = nowForScore.getMonth() + 1;

  const { data: scoreRules, error: scoreRulesError } = await supabase
    .from("notary_score_rules")
    .select("*")
    .order("label", { ascending: true });

  console.log("[AdminOrderDetailPage] Score rules query result", {
    count: scoreRules?.length ?? 0,
    error: scoreRulesError
      ? {
          message: scoreRulesError.message,
          details: scoreRulesError.details,
          hint: scoreRulesError.hint,
          code: scoreRulesError.code,
        }
      : null,
  });

  const { data: monthlyScore } = assignedNotaryId
  ? await supabase
      .from("notary_monthly_scores")
      .select("*")
      .eq("notary_id", assignedNotaryId)
      .eq("year", currentScoreYear)
      .eq("month", currentScoreMonth)
      .maybeSingle()
  : { data: null };

  const { data: notaryScoreEvents } = assignedNotaryId
    ? await supabase
        .from("notary_score_events")
        .select("*")
        .eq("notary_id", assignedNotaryId)
        .eq("assignment_id", id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: lifetimeScoreEvents } = assignedNotaryId
    ? await supabase
        .from("notary_score_events")
        .select("id, points_change, reversed_at")
        .eq("notary_id", assignedNotaryId)
    : { data: [] };

  const { count: completedAssignmentCount } = assignedNotaryId
    ? await supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .or(
          `assigned_notary_id.eq.${assignedNotaryId},notary_id.eq.${assignedNotaryId}`,
        )
        .in("status", ["Completed", "Closed", "Signing Complete"])
    : { count: 0 };

  const activeLifetimeEvents = (lifetimeScoreEvents ?? []).filter(
    (event) => !event.reversed_at,
  );

  const lifetimeIssueCount = activeLifetimeEvents.length;
  const lifetimeDeductions = activeLifetimeEvents.reduce((total, event) => {
    const points = Number(event.points_change ?? 0);
    return points < 0 ? total + Math.abs(points) : total;
  }, 0);

  const scoreRulesById = new Map(
    (scoreRules ?? []).map((rule) => [String(rule.id), rule]),
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

  const activityItems = activity ?? [];
  const visibleActivity = activityItems.slice(0, 3);
  const hiddenActivity = activityItems.slice(3);
  const hasHiddenActivity = hiddenActivity.length > 0;

  function renderActivityItem(item: any) {
    const details = String(item.details ?? "");
    const [name, ...messageParts] = details.split("\n");
    const message = messageParts.join("\n");

    return (
      <div
        key={item.id}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <p className="font-bold text-slate-900">
            {item.action ?? "Activity"}
          </p>
          <p className="text-xs text-slate-500">
            {formatActivityDate(item.created_at)}
          </p>
        </div>

        {message ? (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-600">{name}</p>
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
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <a
              href="/dashboard/orders"
              className="text-sm font-bold text-blue-100 underline underline-offset-4 transition hover:text-white"
            >
              ← Back to Orders
            </a>

            <p className="mt-5 text-sm font-semibold text-blue-100">
              Control # {order.control_number ?? "—"}
            </p>

            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {order.borrower_name ?? "Order"}
            </h1>

            <p className="mt-2 text-sm text-blue-100/90">
              <a
                href={`/dashboard/clients/${order.client_id}`}
                className="font-semibold text-red-300 underline underline-offset-4 transition hover:text-red-200"
              >
                {clientProfile?.company_name ||
                  clientProfile?.full_name ||
                  "Title Company"}
              </a>
              {" • "}
              {signingDate} {signingTime && `at ${signingTime}`}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <span
  className={`w-fit rounded-full px-4 py-2 text-sm font-bold ring-1 ring-inset ${statusBadge(
    order.status,
  )}`}
>
  {order.status ?? "Unknown"}
</span>

{order.status !== "Cancelled" && (
  <>
    <a
      href={`/dashboard/orders/${id}/edit`}
      className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
    >
      Edit Order
    </a>

    <CancelOrderButton orderId={id} />

    {!assignedNotaryId && (
      <a
        href={`/dashboard/orders/${id}/find-notary`}
        className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-[#0B1F4D] transition hover:bg-blue-50"
      >
        Find a Notary
      </a>
    )}
  </>
)}
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
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Order Summary</h2>

            <div className="mt-5 space-y-5 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Borrower
                </p>
                <p className="mt-1 text-base font-semibold text-slate-800">
                  {order.borrower_name ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Phone
                </p>
                <p className="mt-1 text-base font-medium text-slate-700">
                  {order.borrower_phone ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-1 break-all text-base font-medium text-slate-700">
                  {order.borrower_email ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Appointment
                </p>
                <p className="mt-1 text-base font-medium text-slate-700">
                  {signingDate}
                </p>
                <p className="text-base font-medium text-slate-700">
                  {signingTime || "Time not set"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Signing Location
                </p>
                <p className="mt-1 text-base font-medium text-slate-700">
                  {order.signing_address ?? "—"}
                </p>
                <p className="text-base font-medium text-slate-700">
                  {order.signing_city ?? "—"}, {order.signing_state ?? "IN"}{" "}
                  {order.signing_zip ?? ""}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
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

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Notary Performance
                </h2>
                <p className="text-sm text-slate-500">
                  Monthly score resets each month. Lifetime stats stay
                  permanent.
                </p>
              </div>

              {assignedNotaryId && (
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-bold ${scoreBadge(
                    monthlyScore?.score,
                  )}`}
                >
                  {formatScore(monthlyScore?.score)}%
                </span>
              )}
            </div>

            {!assignedNotaryId ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Assign a notary before applying score issues.
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Current Score
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {formatScore(monthlyScore?.score)}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Monthly Deductions
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {monthlyScore?.total_deductions ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Lifetime Issues
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {lifetimeIssueCount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Completed Orders
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {completedAssignmentCount ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Lifetime Deductions
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {lifetimeDeductions} total points deducted
                  </p>
                </div>
              </>
            )}
          </section>
        </aside>

        <section className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Special Instructions
            </h2>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {order.special_instructions ||
                order.instructions ||
                "No special instructions entered."}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Notary Score Issues
            </h2>
            <p className="text-sm text-slate-500">
              Apply an error deduction to the assigned notary without touching
              SQL.
            </p>

            {!assignedNotaryId ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No notary is assigned, so there is nobody to score yet.
              </div>
            ) : (
              <>
                <form
                  action={applyScoreDeduction}
                  className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <input type="hidden" name="assignment_id" value={id} />
                  <input
                    type="hidden"
                    name="notary_id"
                    value={assignedNotaryId}
                  />

                  <label className="block text-sm font-bold text-slate-700">
                    Select issue
                  </label>

                  {scoreRulesError ? (
                    <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      Score rules did not load: {scoreRulesError.message}
                    </div>
                  ) : !(scoreRules ?? []).length ? (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      No score rules loaded. If rows exist in Supabase, RLS is
                      blocking select access for this admin user.
                    </div>
                  ) : null}

                  <select
                    name="rule_id"
                    required
                    disabled={
                      Boolean(scoreRulesError) || !(scoreRules ?? []).length
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Choose an issue...</option>
                    {(scoreRules ?? []).map((rule) => {
                      const rawPoints = Number(rule.default_points ?? 0);
const points = rawPoints > 0 ? -rawPoints : rawPoints;

                      return (
                        <option key={rule.id} value={rule.id}>
                          {rule.label ?? rule.code ?? "Score Rule"} ({points}{" "}
                          pts)
                        </option>
                      );
                    })}
                  </select>

                  <label className="mt-4 block text-sm font-bold text-slate-700">
                    Admin notes
                  </label>
                  <textarea
                    name="admin_notes"
                    rows={4}
                    placeholder="Example: Title reported missed signature page on borrower package."
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                  />

                  <SubmitButton
                    pendingText="Applying issue..."
                    className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
                  >
                    Apply Score Deduction
                  </SubmitButton>
                </form>

                <div className="mt-5 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Recent score events on this order
                  </h3>

                  {!(notaryScoreEvents ?? []).length ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No score issues have been entered for this order.
                    </div>
                  ) : (
                    (notaryScoreEvents ?? []).map((event) => {
                      const rule = scoreRulesById.get(String(event.rule_id));
                      const isReversed = Boolean(event.reversed_at);

                      return (
                        <div
                          key={event.id}
                          className={`rounded-xl border p-4 ${
                            isReversed
                              ? "border-slate-200 bg-slate-50 opacity-75"
                              : "border-red-100 bg-red-50"
                          }`}
                        >
                          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                            <div>
                              <p className="font-bold text-slate-900">
                                {rule?.label ?? rule?.code ?? "Score Issue"}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {formatActivityDate(event.created_at)} •{" "}
                                {event.points_change ?? 0} pts
                              </p>
                              {event.notes && (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                  {event.notes}
                                </p>
                              )}
                              {isReversed && (
                                <p className="mt-2 text-sm font-bold text-slate-500">
                                  Reversed{" "}
                                  {formatActivityDate(event.reversed_at)}
                                </p>
                              )}
                            </div>

                            {!isReversed && (
                              <form action={reverseScoreEvent}>
                                <input
                                  type="hidden"
                                  name="assignment_id"
                                  value={id}
                                />
                                <input
                                  type="hidden"
                                  name="event_id"
                                  value={event.id}
                                />
                                <input
                                  type="hidden"
                                  name="notary_id"
                                  value={assignedNotaryId}
                                />
                                <SubmitButton
                                  pendingText="Reversing..."
                                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Reverse
                                </SubmitButton>
                              </form>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
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
              className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <input type="hidden" name="assignment_id" value={order.id} />

              <label className="block text-sm font-bold text-slate-700">
                Upload title documents
              </label>

              <input
                type="file"
                name="title_documents"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                You can select and upload multiple documents at once.
              </p>

              <button className="mt-4 rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950">
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

                      <span className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950">
                        Open
                      </span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
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
                        className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
                      >
                        View File
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100"
                required
              />

              <SubmitButton
                pendingText="Adding note..."
                className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
              >
                Add Comment
              </SubmitButton>
            </form>
          </section>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Activity</h2>

        <div className="mt-4 space-y-3">
          {!activityItems.length ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No activity yet.
            </div>
          ) : (
            <>
              {visibleActivity.map((item) => renderActivityItem(item))}

              {hasHiddenActivity && (
                <details className="group space-y-3">
                  <summary className="cursor-pointer list-none text-sm font-bold text-[#0B1F4D] hover:underline">
                    <span className="group-open:hidden">View All</span>
                    <span className="hidden group-open:inline">Show Less</span>
                  </summary>

                  <div className="space-y-3">
                    {hiddenActivity.map((item) => renderActivityItem(item))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
