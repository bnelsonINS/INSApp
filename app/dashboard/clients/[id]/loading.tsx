export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="mx-auto flex max-w-5xl flex-col items-center justify-center rounded-2xl bg-white p-12 shadow-sm">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#0B1F4D]" />

        <p className="mt-6 text-lg font-semibold text-slate-900">
          Loading Client Profile...
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Please wait while we retrieve the client information.
        </p>
      </section>
    </main>
  );
}