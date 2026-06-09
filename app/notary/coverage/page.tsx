import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const indianaCounties = [
  "Adams",
  "Allen",
  "Bartholomew",
  "Benton",
  "Blackford",
  "Boone",
  "Brown",
  "Carroll",
  "Cass",
  "Clark",
  "Clay",
  "Clinton",
  "Crawford",
  "Daviess",
  "Dearborn",
  "Decatur",
  "DeKalb",
  "Delaware",
  "Dubois",
  "Elkhart",
  "Fayette",
  "Floyd",
  "Fountain",
  "Franklin",
  "Fulton",
  "Gibson",
  "Grant",
  "Greene",
  "Hamilton",
  "Hancock",
  "Harrison",
  "Hendricks",
  "Henry",
  "Howard",
  "Huntington",
  "Jackson",
  "Jasper",
  "Jay",
  "Jefferson",
  "Jennings",
  "Johnson",
  "Knox",
  "Kosciusko",
  "LaGrange",
  "Lake",
  "LaPorte",
  "Lawrence",
  "Madison",
  "Marion",
  "Marshall",
  "Martin",
  "Miami",
  "Monroe",
  "Montgomery",
  "Morgan",
  "Newton",
  "Noble",
  "Ohio",
  "Orange",
  "Owen",
  "Parke",
  "Perry",
  "Pike",
  "Porter",
  "Posey",
  "Pulaski",
  "Putnam",
  "Randolph",
  "Ripley",
  "Rush",
  "Scott",
  "Shelby",
  "Spencer",
  "St. Joseph",
  "Starke",
  "Steuben",
  "Sullivan",
  "Switzerland",
  "Tippecanoe",
  "Tipton",
  "Union",
  "Vanderburgh",
  "Vermillion",
  "Vigo",
  "Wabash",
  "Warren",
  "Warrick",
  "Washington",
  "Wayne",
  "Wells",
  "White",
  "Whitley",
];

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100";

const buttonClass =
  "rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950";

const sectionClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

export default async function CoveragePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: counties } = await supabase
    .from("notary_coverage_counties")
    .select("*")
    .eq("user_id", user.id)
    .order("county");

  const { data: zipCodes } = await supabase
    .from("notary_coverage_zip_codes")
    .select("*")
    .eq("user_id", user.id)
    .order("zip_code");

  const { data: profile } = await supabase
    .from("profiles")
    .select("home_zip, travel_radius_miles")
    .eq("id", user.id)
    .single();

  const homeZip = profile?.home_zip ?? "";
  const travelRadius =
    profile?.travel_radius_miles === null ||
    profile?.travel_radius_miles === undefined
      ? ""
      : String(profile.travel_radius_miles);

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-medium text-blue-100">Coverage Areas</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Service Area Preferences
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/90">
            Tell us where you are willing to accept signing assignments. Indiana
            Notary Solutions uses your travel preferences, counties, and ZIP
            codes to match you with signing opportunities.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 border-l-4 border-l-blue-500 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-950">
          Choose at least one coverage method
        </h2>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          You can use a travel radius, selected Indiana counties, individual ZIP
          codes, or a combination of all three. ZIP codes are the most precise
          matching method, while counties and travel radius help broaden your
          assignment availability.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">Travel Radius</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Best for general distance-based matching.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">Counties</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Best for broad Indiana service areas.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">ZIP Codes</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Best for exact signing assignment matching.
            </p>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-950">
            Travel Preferences
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Set your home ZIP code and maximum travel distance. This helps
            reduce notifications for assignments that are too far away.
          </p>
        </div>

        <form
          action="/notary/coverage/update-travel"
          method="post"
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <input
            key={`home-${homeZip}`}
            name="home_zip"
            placeholder="Home ZIP, example: 47130"
            maxLength={5}
            defaultValue={homeZip}
            className={inputClass}
          />

          <input
            key={`radius-${travelRadius}`}
            name="travel_radius_miles"
            type="number"
            min="0"
            max="250"
            placeholder="Travel radius in miles"
            defaultValue={travelRadius}
            className={inputClass}
          />

          <button className={buttonClass}>Save</button>
        </form>
      </section>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <p className="rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Optional
        </p>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <section className={sectionClass}>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-950">County Coverage</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Add all Indiana counties you are willing to serve. You can update
            this list at any time.
          </p>
        </div>

        <form
          action="/notary/coverage/add-county"
          method="post"
          className="flex flex-col gap-3 md:flex-row"
        >
          <select
            name="county"
            required
            className={`${inputClass} md:w-80`}
            defaultValue=""
          >
            <option value="">Select Indiana county</option>
            {indianaCounties.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>

          <button className={buttonClass}>Add County</button>
        </form>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-950">
              Selected Counties
            </p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              {counties?.length ?? 0}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {counties?.map((item) => (
              <form
                key={item.id}
                action={`/notary/coverage/counties/${item.id}/delete`}
                method="post"
              >
                <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
                  {item.county} ×
                </button>
              </form>
            ))}

            {!counties?.length && (
              <p className="text-sm text-slate-500">No counties added yet.</p>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <p className="rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Optional
        </p>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <section className={sectionClass}>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-950">
            ZIP Code Coverage
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Enter ZIP codes where you actively accept assignments. ZIP codes are
            the most precise way to match you to signing requests.
          </p>
        </div>

        <form
          action="/notary/coverage/add-zip"
          method="post"
          className="flex flex-col gap-3 md:flex-row"
        >
          <input
            name="zip_code"
            placeholder="Example: 47130"
            maxLength={5}
            required
            className={`${inputClass} md:w-80`}
          />

          <button className={buttonClass}>Add ZIP Code</button>
        </form>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-950">
              Selected ZIP Codes
            </p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              {zipCodes?.length ?? 0}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {zipCodes?.map((item) => (
              <form
                key={item.id}
                action={`/notary/coverage/zips/${item.id}/delete`}
                method="post"
              >
                <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
                  {item.zip_code} ×
                </button>
              </form>
            ))}

            {!zipCodes?.length && (
              <p className="text-sm text-slate-500">No ZIP codes added yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}