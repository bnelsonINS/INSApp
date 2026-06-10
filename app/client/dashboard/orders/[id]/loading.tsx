export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="overflow-hidden rounded-2xl bg-[#0B1F4D] p-6 text-white shadow-sm">
        <p className="text-sm font-semibold text-blue-100">
          Loading Order
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Retrieving order details...
        </h1>

        <p className="mt-2 text-sm text-blue-100">
          Please wait while we load your order.
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
        <span className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#0B1F4D]" />

        <p className="mt-4 text-sm font-semibold text-slate-600">
          Loading order details...
        </p>
      </div>
    </main>
  );
}