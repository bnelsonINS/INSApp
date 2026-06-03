import Link from "next/link";

const stats = [
  {
    label: "Active Orders",
    value: "0",
    note: "Currently in progress",
    className: "border-blue-200 bg-blue-50 text-blue-800",
  },
  {
    label: "Awaiting Assignment",
    value: "0",
    note: "Waiting for a notary",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    label: "Scheduled",
    value: "0",
    note: "Assigned and scheduled",
    className: "border-purple-200 bg-purple-50 text-purple-800",
  },
  {
    label: "Completed",
    value: "0",
    note: "Finished orders",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
];

export default function ClientDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-300">Welcome back</p>
            <h1 className="mt-2 text-3xl font-bold">Client Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Submit signing requests, track order progress, upload documents,
              and communicate with Indiana Notary Solutions.
            </p>
          </div>

          <Link
            href="/client/dashboard/orders/new"
            className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-slate-950 hover:bg-slate-100"
          >
            Create New Order
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-5 shadow-sm ${stat.className}`}
          >
            <p className="text-sm font-bold">{stat.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {stat.value}
            </p>
            <p className="mt-2 text-sm">{stat.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Recent Orders
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your newest signing requests will appear here.
              </p>
            </div>

            <Link
              href="/client/dashboard/orders"
              className="text-sm font-bold text-teal-700 hover:text-teal-800"
            >
              View all
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="font-bold text-slate-700">No orders yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Create your first order to start tracking signings from the client
              portal.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Quick Actions</h2>

          <div className="mt-5 space-y-3">
            <Link
              href="/client/dashboard/orders/new"
              className="block rounded-2xl bg-teal-700 px-4 py-3 text-center text-sm font-bold text-white hover:bg-teal-800"
            >
              Create Order
            </Link>

            <Link
              href="/client/dashboard/orders"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              View Orders
            </Link>

            <Link
              href="/client/dashboard/messages"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Messages
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}