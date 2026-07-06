import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FEDERAL_MILEAGE_RATE = 0.725;

type MileageEntry = {
  id: string;
  trip_date: string;
  purpose: string | null;
  start_location: string | null;
  end_location: string | null;
  miles: number | string | null;
  mileage_rate: number | string | null;
  notes: string | null;
  created_at: string;
};

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatMiles(value: number | string | null | undefined) {
  const miles = Number(value ?? 0);
  if (Number.isNaN(miles)) return "0.00";
  return miles.toFixed(2);
}

async function getCurrentNotary() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "notary" || !profile.is_active) {
    redirect("/login");
  }

  return { supabase, user };
}

async function addMileageEntry(formData: FormData) {
  "use server";

  const { supabase, user } = await getCurrentNotary();

  const tripDate = String(formData.get("trip_date") || "");
  const purpose = String(formData.get("purpose") || "").trim();
  const startLocation = String(formData.get("start_location") || "").trim();
  const endLocation = String(formData.get("end_location") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const miles = Number(formData.get("miles") || 0);

  if (!tripDate || !purpose || !Number.isFinite(miles) || miles <= 0) {
    redirect("/notary/dashboard/mileage?error=missing");
  }

  const { error } = await supabase.from("assignment_mileage").insert({
    notary_id: user.id,
    trip_date: tripDate,
    purpose,
    start_location: startLocation || null,
    end_location: endLocation || null,
    miles,
    mileage_rate: FEDERAL_MILEAGE_RATE,
    notes: notes || null,
  });

  if (error) {
    console.error("Add mileage entry error:", error);
    redirect("/notary/dashboard/mileage?error=insert");
  }

  revalidatePath("/notary/dashboard/mileage");
  redirect("/notary/dashboard/mileage?success=added");
}

async function deleteMileageEntry(formData: FormData) {
  "use server";

  const { supabase, user } = await getCurrentNotary();

  const id = String(formData.get("id") || "");

  if (!id) {
    redirect("/notary/dashboard/mileage?error=missing");
  }

  const { error } = await supabase
    .from("assignment_mileage")
    .delete()
    .eq("id", id)
    .eq("notary_id", user.id);

  if (error) {
    console.error("Delete mileage entry error:", error);
    redirect("/notary/dashboard/mileage?error=delete");
  }

  revalidatePath("/notary/dashboard/mileage");
  redirect("/notary/dashboard/mileage?success=deleted");
}

export default async function MileagePage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await getCurrentNotary();

  const currentYear = new Date().getFullYear();

  const { data: entries, error } = await supabase
    .from("assignment_mileage")
    .select(
      "id, trip_date, purpose, start_location, end_location, miles, mileage_rate, notes, created_at"
    )
    .eq("notary_id", user.id)
    .gte("trip_date", `${currentYear}-01-01`)
    .lte("trip_date", `${currentYear}-12-31`)
    .order("trip_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Mileage entries lookup error:", error);
  }

  const safeEntries = (entries ?? []) as MileageEntry[];

  const totalMiles = safeEntries.reduce(
    (sum, entry) => sum + Number(entry.miles ?? 0),
    0
  );

  const totalDeduction = safeEntries.reduce((sum, entry) => {
    const miles = Number(entry.miles ?? 0);
    const rate = Number(entry.mileage_rate ?? FEDERAL_MILEAGE_RATE);
    return sum + miles * rate;
  }, 0);

  const thisMonth = new Date().toISOString().slice(0, 7);

  const monthMiles = safeEntries
    .filter((entry) => entry.trip_date?.startsWith(thisMonth))
    .reduce((sum, entry) => sum + Number(entry.miles ?? 0), 0);

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-100">
              INS Pro
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Mileage Tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
              Track business miles and estimate your deduction using the current
              federal mileage rate of $0.725 per mile.
            </p>
          </div>

          <a
            href="/notary/dashboard"
            className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-[#0B1F4D] shadow-sm transition hover:bg-slate-100"
          >
            Back to Dashboard
          </a>
        </div>
      </section>

      {params?.success === "added" && (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          Mileage entry added.
        </section>
      )}

      {params?.success === "deleted" && (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          Mileage entry deleted.
        </section>
      )}

      {params?.error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Something went wrong. Check the required fields and try again.
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Business Miles YTD
          </p>
          <p className="mt-2 text-4xl font-bold text-[#0B1F4D]">
            {totalMiles.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Estimated Deduction
          </p>
          <p className="mt-2 text-4xl font-bold text-green-700">
            {formatMoney(totalDeduction)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            Trips Logged
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {safeEntries.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-500">
            This Month
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">
            {monthMiles.toFixed(2)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Add Trip</h2>
          <p className="mt-1 text-sm text-slate-500">
            Log business mileage for signings, print runs, scanbacks, supplies,
            or client meetings.
          </p>

          <form action={addMileageEntry} className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Trip Date
              </label>
              <input
                required
                type="date"
                name="trip_date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Purpose
              </label>
              <input
                required
                name="purpose"
                placeholder="Example: Smith signing"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Start Location
                </label>
                <input
                  name="start_location"
                  placeholder="Home office"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  End Location
                </label>
                <input
                  name="end_location"
                  placeholder="Signing location"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Miles
              </label>
              <input
                required
                type="number"
                name="miles"
                min="0.01"
                step="0.01"
                placeholder="42.50"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-slate-500">
                Deduction uses $0.725 per mile.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Notes</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Optional notes"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#0B1F4D] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
            >
              Save Mileage Entry
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Mileage Entries
              </h2>
              <p className="text-sm text-slate-500">
                Showing trips for {currentYear}.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              Rate: $0.725 / mile
            </div>
          </div>

          {!safeEntries.length ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-800">
                No mileage logged yet.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add your first trip on the left.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Date</th>
                    <th className="px-5 py-3 font-bold">Purpose</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 text-right font-bold">Miles</th>
                    <th className="px-5 py-3 text-right font-bold">
                      Deduction
                    </th>
                    <th className="px-5 py-3 text-right font-bold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {safeEntries.map((entry) => {
                    const miles = Number(entry.miles ?? 0);
                    const rate = Number(
                      entry.mileage_rate ?? FEDERAL_MILEAGE_RATE
                    );
                    const deduction = miles * rate;

                    return (
                      <tr key={entry.id} className="align-top">
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {formatDate(entry.trip_date)}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">
                            {entry.purpose || "Business trip"}
                          </p>
                          {entry.notes && (
                            <p className="mt-1 max-w-xs text-xs text-slate-500">
                              {entry.notes}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          <p>{entry.start_location || "—"}</p>
                          <p className="text-xs text-slate-400">to</p>
                          <p>{entry.end_location || "—"}</p>
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-slate-950">
                          {formatMiles(entry.miles)}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-green-700">
                          {formatMoney(deduction)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <form action={deleteMileageEntry}>
                            <input type="hidden" name="id" value={entry.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}