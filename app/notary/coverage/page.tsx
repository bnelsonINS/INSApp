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
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Coverage Areas</h1>
        <p className="text-slate-600">
          Tell us where you are willing to accept signing assignments. Indiana Notary Solutions uses your coverage areas to determine which signing opportunities are offered to you.
          You are only required to provide one of the following.
        </p>
      </div>


      <section className="space-y-4 rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold">Travel Preferences</h2>

        <form
          action="/notary/coverage/update-travel"
          method="post"
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <input
            key={`home-${homeZip}`}
            name="home_zip"
            placeholder="Home ZIP, example: 47130"
            maxLength={5}
            defaultValue={homeZip}
            className="rounded-lg border p-2"
          />

          <input
            key={`radius-${travelRadius}`}
            name="travel_radius_miles"
            type="number"
            min="0"
            max="250"
            placeholder="Travel radius in miles"
            defaultValue={travelRadius}
            className="rounded-lg border p-2"
          />

          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            Save
          </button>
        </form>

        <p className="text-sm text-slate-500">
          Set your home ZIP code and maximum travel distance. This helps us identify assignments that are within your preferred service area and reduces notifications for jobs that are too far away.
        </p>
      </section>

      <div className="text-center">
  <p className="text-1xl font-extrabold text-red-700">OR</p>
</div>

      <section className="space-y-4 rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold">Add County</h2>

        <form
          action="/notary/coverage/add-county"
          method="post"
          className="flex flex-col gap-3 md:flex-row"
        >
          <select
            name="county"
            required
            className="rounded-lg border p-2 md:w-80"
            defaultValue=""
          >
            <option value="">Select Indiana county</option>
            {indianaCounties.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>

          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            Add County
          </button>
        </form>
        Add all counties you are willing to serve. You can update this list at any time.

        <div className="flex flex-wrap gap-2 pt-2">
          {counties?.map((item) => (
            <form
              key={item.id}
              action={`/notary/coverage/counties/${item.id}/delete`}
              method="post"
            >
              <button className="rounded-full bg-slate-100 px-3 py-1 text-sm hover:bg-red-100">
                {item.county} ×
              </button>
            </form>
          ))}

          {!counties?.length && (
            <p className="text-sm text-red-500">No counties added yet.</p>
          )}
        </div>
      </section>

      <div className="text-center">
  <p className="text-1xl font-extrabold text-red-700">OR</p>
</div>

      <section className="space-y-4 rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold">Add ZIP Code</h2>

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
            className="rounded-lg border p-2 md:w-80"
          />

          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            Add ZIP Code
          </button>
        </form>
        Enter the ZIP codes where you actively accept assignments. ZIP codes are our primary method for matching notaries to signing requests.

        <div className="flex flex-wrap gap-2 pt-2">
          {zipCodes?.map((item) => (
            <form
              key={item.id}
              action={`/notary/coverage/zips/${item.id}/delete`}
              method="post"
            >
              <button className="rounded-full bg-slate-100 px-3 py-1 text-sm hover:bg-red-100">
                {item.zip_code} ×
              </button>
            </form>
          ))}

          {!zipCodes?.length && (
            <p className="text-sm text-slate-700">No ZIP codes added yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}