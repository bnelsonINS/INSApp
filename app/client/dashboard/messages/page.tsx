import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  q?: string;
  filter?: string;
};

type Assignment = {
  id: string;
  control_number: string | null;
  borrower_name: string | null;
  signing_type: string | null;
  signing_date: string | null;
  signing_time: string | null;
  signing_city: string | null;
  signing_state: string | null;
  status: string | null;
  client_id: string | null;
  notary_id: string | null;
  assigned_notary_id: string | null;
  created_at: string | null;
};

type ActivityItem = {
  id: string;
  assignment_id: string;
  action: string | null;
  actor_name: string | null;
  details: string | null;
  created_at: string | null;
};

type MessageItem = ActivityItem & {
  order: Assignment;
  actorType: "admin" | "notary" | "client" | "system" | "unknown";
};

function formatDateTime(date: string | null) {
  if (!date) return "Recently";

  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(date: string | null) {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeAgo(date: string | null) {
  if (!date) return "Recently";

  const timestamp = new Date(date).getTime();
  const now = Date.now();
  const diffMs = now - timestamp;

  if (Number.isNaN(timestamp)) return "Recently";
  if (diffMs < 60 * 1000) return "Just now";

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return formatDateTime(date);
}

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function isOpenOrderStatus(status: string | null) {
  const value = normalize(status);

  return ![
    "closed",
    "cancelled",
    "canceled",
    "complete",
    "completed",
  ].includes(value);
}

function getActorType(action: string | null, actorName: string | null) {
  const combined = `${action ?? ""} ${actorName ?? ""}`.toLowerCase();

  if (combined.includes("admin")) return "admin";
  if (combined.includes("notary")) return "notary";
  if (combined.includes("client")) return "client";
  if (combined.includes("system")) return "system";

  return "unknown";
}

function getActorBadgeClasses(actorType: MessageItem["actorType"]) {
  if (actorType === "admin") return "bg-blue-100 text-blue-800";
  if (actorType === "notary") return "bg-emerald-100 text-emerald-800";
  if (actorType === "client") return "bg-purple-100 text-purple-800";
  if (actorType === "system") return "bg-slate-100 text-slate-700";

  return "bg-slate-100 text-slate-700";
}

function getActorLabel(actorType: MessageItem["actorType"], actorName: string | null) {
  if (actorType === "admin") return "Admin";
  if (actorType === "notary") return "Notary";
  if (actorType === "client") return "Client";
  if (actorType === "system") return "System";

  return actorName || "Message";
}

function statusBadge(status: string | null) {
  const normalized = normalize(status);

  if (normalized === "new request") return "bg-amber-100 text-amber-800";
  if (normalized === "needs notary") return "bg-amber-100 text-amber-800";
  if (normalized === "not confirmed") return "bg-yellow-100 text-yellow-800";
  if (normalized === "confirmed") return "bg-blue-100 text-blue-800";
  if (normalized === "in progress") return "bg-purple-100 text-purple-800";
  if (normalized === "late") return "bg-red-100 text-red-800";
  if (normalized === "signing complete") return "bg-orange-100 text-orange-800";
  if (normalized === "closed") return "bg-green-100 text-green-800";
  if (normalized === "cancelled" || normalized === "canceled") {
    return "bg-red-100 text-red-800";
  }

  return "bg-slate-100 text-slate-800";
}

function containsSearchText(message: MessageItem, searchText: string) {
  if (!searchText) return true;

  const haystack = [
    message.order.borrower_name,
    message.order.control_number,
    message.order.signing_type,
    message.order.signing_city,
    message.order.signing_state,
    message.order.status,
    message.action,
    message.actor_name,
    message.details,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchText.toLowerCase());
}

function matchesFilter(message: MessageItem, filter: string) {
  if (filter === "all") return true;
  if (filter === "admin") return message.actorType === "admin";
  if (filter === "notary") return message.actorType === "notary";
  if (filter === "client") return message.actorType === "client";
  if (filter === "system") return message.actorType === "system";

  return true;
}

function getTodayCount(messages: MessageItem[]) {
  const today = new Date().toDateString();

  return messages.filter((message) => {
    if (!message.created_at) return false;
    return new Date(message.created_at).toDateString() === today;
  }).length;
}

function getThisWeekCount(messages: MessageItem[]) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  return messages.filter((message) => {
    if (!message.created_at) return false;
    return new Date(message.created_at) >= sevenDaysAgo;
  }).length;
}

export default async function ClientMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchText = String(resolvedSearchParams?.q ?? "").trim();
  const activeFilter = String(resolvedSearchParams?.filter ?? "all").toLowerCase();

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

  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignments")
    .select(
      `
      id,
      control_number,
      borrower_name,
      signing_type,
      signing_date,
      signing_time,
      signing_city,
      signing_state,
      status,
      client_id,
      notary_id,
      assigned_notary_id,
      created_at
    `,
    )
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  if (assignmentsError) {
    console.error("Client messages assignments load error:", assignmentsError);
  }

  const openOrders = ((assignments ?? []) as Assignment[]).filter((assignment) =>
    isOpenOrderStatus(assignment.status),
  );

  const orderById = new Map<string, Assignment>();

  for (const order of openOrders) {
    orderById.set(order.id, order);
  }

  let rawActivity: ActivityItem[] = [];

  if (openOrders.length > 0) {
    const { data: activity, error: activityError } = await supabaseAdmin
      .from("assignment_activity")
      .select("id, assignment_id, action, actor_name, details, created_at")
      .in(
        "assignment_id",
        openOrders.map((order) => order.id),
      )
      .order("created_at", { ascending: false });

    if (activityError) {
      console.error("Client messages activity load error:", activityError);
    }

    rawActivity = (activity ?? []) as ActivityItem[];
  }

  const allMessages: MessageItem[] = rawActivity
    .map((item) => {
      const order = orderById.get(item.assignment_id);

      if (!order) return null;

      const actorType = getActorType(item.action, item.actor_name);

      return {
        ...item,
        order,
        actorType,
      };
    })
    .filter((item): item is MessageItem => Boolean(item));

  const filteredMessages = allMessages.filter(
    (message) =>
      matchesFilter(message, activeFilter) && containsSearchText(message, searchText),
  );

  const adminCount = allMessages.filter((message) => message.actorType === "admin").length;
  const notaryCount = allMessages.filter((message) => message.actorType === "notary").length;
  const clientCount = allMessages.filter((message) => message.actorType === "client").length;
  const systemCount = allMessages.filter((message) => message.actorType === "system").length;

  const filters = [
    { label: "All", value: "all", count: allMessages.length },
    { label: "Admin", value: "admin", count: adminCount },
    { label: "Notary", value: "notary", count: notaryCount },
    { label: "Client", value: "client", count: clientCount },
    { label: "System", value: "system", count: systemCount },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-100">Client Portal</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Messages</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
                Communications from the admin team, notaries, and system activity
                across all of your current open orders.
              </p>
            </div>

            <Link
              href="/client/dashboard/orders"
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:bg-blue-50"
            >
              View Orders
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Messages
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {allMessages.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Today
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {getTodayCount(allMessages)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              This Week
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {getThisWeekCount(allMessages)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Open Orders
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {openOrders.length}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const isActive = activeFilter === filter.value;

                return (
                  <Link
                    key={filter.value}
                    href={`/client/dashboard/messages?filter=${filter.value}${
                      searchText ? `&q=${encodeURIComponent(searchText)}` : ""
                    }`}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? "bg-[#0B1F4D] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </Link>
                );
              })}
            </div>

            <form className="flex w-full gap-2 lg:w-auto" action="/client/dashboard/messages">
              <input type="hidden" name="filter" value={activeFilter} />
              <input
                name="q"
                defaultValue={searchText}
                placeholder="Search messages..."
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100 lg:w-80"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#102b68]"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        <section className="space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-black text-slate-900">You're all caught up.</p>
              <p className="mt-2 text-sm text-slate-600">
                Messages from your active orders will appear here automatically.
              </p>
              <Link
                href="/client/dashboard/orders"
                className="mt-5 inline-flex rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#102b68]"
              >
                View Orders
              </Link>
            </div>
          ) : (
            filteredMessages.map((message) => {
              const orderNumber = message.order.control_number || message.order.id;
              const borrowerName = message.order.borrower_name || "Unnamed Borrower";
              const actionLabel = message.action || "Order note";
              const actorLabel = getActorLabel(message.actorType, message.actor_name);

              return (
                <article
                  key={message.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getActorBadgeClasses(
                            message.actorType,
                          )}`}
                        >
                          {actorLabel}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${statusBadge(
                            message.order.status,
                          )}`}
                        >
                          {message.order.status || "Open"}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatTimeAgo(message.created_at)}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-black text-slate-900">
                        {borrowerName}
                      </h2>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                        <span className="font-bold text-slate-800">Order {orderNumber}</span>
                        {message.order.signing_type ? (
                          <span>{message.order.signing_type}</span>
                        ) : null}
                        <span>
                          {formatShortDate(message.order.signing_date)}
                          {message.order.signing_time ? ` at ${message.order.signing_time}` : ""}
                        </span>
                        {message.order.signing_city || message.order.signing_state ? (
                          <span>
                            {[message.order.signing_city, message.order.signing_state]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-800">{actionLabel}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {message.details || "No message details provided."}
                        </p>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        Posted by {message.actor_name || actorLabel} · {formatDateTime(message.created_at)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                      <Link
                        href={`/client/dashboard/orders/${message.order.id}`}
                        className="inline-flex items-center justify-center rounded-xl bg-[#0B1F4D] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#102b68]"
                      >
                        Open Order →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
