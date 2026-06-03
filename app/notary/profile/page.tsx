import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";
import LanguageSelector from "./language-selector";

export default async function NotaryProfilePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  

  if (!user) redirect("/login");
  

  const { data: profile } = await supabase
    .from("notary_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

    const { data: accountProfile } = await supabase
  .from("profiles")
  .select("approval_status")
  .eq("id", user.id)
  .single();

const missingItems: string[] = [];

if (!profile?.first_name) missingItems.push("First Name");
if (!profile?.last_name) missingItems.push("Last Name");

if (!profile?.address) missingItems.push("Address");
if (!profile?.city) missingItems.push("City");
if (!profile?.state) missingItems.push("State");
if (!profile?.zip) missingItems.push("ZIP Code");

if (!profile?.commission_number) {
  missingItems.push("Commission Number");
}

if (!profile?.commission_expiration) {
  missingItems.push("Commission Expiration");
}

if (!profile?.home_phone && !profile?.mobile_phone) {
  missingItems.push("Home Phone or Mobile Phone");
}

if (
  !profile?.accepts_text_messages &&
  !profile?.accepts_email_notifications
) {
  missingItems.push(
    "Accept Text Messages or Accept Email Notifications"
  );
}

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow">
        <p className="text-sm text-slate-300">Notary Profile</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">My Profile</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Manage your public profile, contact information, notary details,
          availability, equipment, and ACH payment setup.
        </p>
      </section>

      {accountProfile?.approval_status !== "approved" && (
  <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
    <h2 className="text-xl font-bold text-amber-900">
      Profile Pending Approval
    </h2>

    <p className="mt-2 text-sm text-amber-800">
      Complete all required profile information and credentials before your
      account can be reviewed and approved for assignments.
    </p>

    {missingItems.length > 0 && (
      <div className="mt-4">
        <p className="font-semibold text-amber-900">
          Missing Profile Requirements
        </p>

        <ul className="mt-2 list-disc pl-6 text-sm text-amber-800">
          {missingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    )}
  </section>
)}

      <form action="/notary/profile/update" method="post" className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-950">
              Public Profile
            </h2>
            <p className="text-sm text-slate-500">
              This is the information clients and admins use to identify you.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="first_name"
              placeholder="First Name"
              defaultValue={profile?.first_name || ""}
              className="rounded-xl border p-3"
            />
            <input
              name="last_name"
              placeholder="Last Name"
              defaultValue={profile?.last_name || ""}
              className="rounded-xl border p-3"
            />
            <input
              name="business_name"
              placeholder="Business Name"
              defaultValue={profile?.business_name || ""}
              className="rounded-xl border p-3"
            />
            <input
              name="website"
              placeholder="Website"
              defaultValue={profile?.website || ""}
              className="rounded-xl border p-3"
            />
          </div>

          <textarea
  name="bio"
  placeholder="Public profile bio / about me"
  defaultValue={profile?.bio || ""}
  rows={6}
  className="mt-4 w-full resize-y rounded-xl border p-3"
/>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">
                Contact Information
              </h2>
              <p className="text-sm text-slate-500">
                Address and phone details for scheduling and communication.
              </p>
            </div>

            <div className="grid gap-4">
              <input
                name="address"
                placeholder="Address Line 1"
                defaultValue={profile?.address || ""}
                className="rounded-xl border p-3"
              />
              <input
                name="address_line_2"
                placeholder="Address Line 2"
                defaultValue={profile?.address_line_2 || ""}
                className="rounded-xl border p-3"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="city"
                  placeholder="City"
                  defaultValue={profile?.city || ""}
                  className="rounded-xl border p-3"
                />
                <input
                  name="state"
                  placeholder="State"
                  defaultValue={profile?.state || "IN"}
                  className="rounded-xl border p-3"
                />
                <input
                  name="zip"
                  placeholder="Zip"
                  defaultValue={profile?.zip || ""}
                  className="rounded-xl border p-3"
                />
                <input
                  name="county"
                  placeholder="County"
                  defaultValue={profile?.county || ""}
                  className="rounded-xl border p-3"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="home_phone"
                  placeholder="Home Phone"
                  defaultValue={profile?.home_phone || ""}
                  className="rounded-xl border p-3"
                />
                <input
                  name="mobile_phone"
                  placeholder="Mobile Phone"
                  defaultValue={profile?.mobile_phone || profile?.phone || ""}
                  className="rounded-xl border p-3"
                />
                <input
                  name="work_phone"
                  placeholder="Work Phone"
                  defaultValue={profile?.work_phone || ""}
                  className="rounded-xl border p-3"
                />
                <input
                  name="fax"
                  placeholder="Fax"
                  defaultValue={profile?.fax || ""}
                  className="rounded-xl border p-3"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">
                Notary Details
              </h2>
              <p className="text-sm text-slate-500">
                Commission, radius, language, and RON information.
              </p>
            </div>

            <div className="grid gap-4">
              <input
                name="commission_number"
                placeholder="Commission Number"
                defaultValue={profile?.commission_number || ""}
                className="rounded-xl border p-3"
              />
              <input
                name="commission_expiration"
                type="date"
                defaultValue={profile?.commission_expiration || ""}
                className="rounded-xl border p-3"
              />
              <input
                name="coverage_radius"
                type="number"
                placeholder="Travel Radius Miles"
                defaultValue={profile?.coverage_radius || ""}
                className="rounded-xl border p-3"
              />

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Languages Spoken
                </label>
                <LanguageSelector
                  defaultValue={profile?.languages_spoken || "English"}
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-900">
                <input
                  type="checkbox"
                  name="ron_enabled"
                  defaultChecked={!!profile?.ron_enabled}
                />
                RON Enabled
              </label>
            </div>
          </section>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">Equipment</h2>
              <p className="text-sm text-slate-500">
                Tools you have available for assignments.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["laser_printer", "Laser Printer"],
                ["dual_tray_printer", "Dual Tray Printer"],
                ["mobile_scanner", "Mobile Scanner"],
                ["high_speed_internet", "High-Speed Internet"],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-semibold"
                >
                  <input
                    type="checkbox"
                    name={name}
                    defaultChecked={!!profile?.[name]}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">
                Notifications & Availability
              </h2>
              <p className="text-sm text-slate-500">
                Control how you receive assignments and when you are available.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["receiving_notifications", "Receiving Signing Notifications"],
                ["public_profile_enabled", "Public Profile Enabled"],
                ["accepts_text_messages", "Accept Text Messages"],
                ["accepts_email_notifications", "Accept Email Notifications"],
                ["accepts_weekend_signings", "Accept Weekend Signings"],
                ["accepts_evening_signings", "Accept Evening Signings"],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-3 rounded-xl bg-purple-50 p-4 text-sm font-semibold text-purple-950"
                >
                  <input
                    type="checkbox"
                    name={name}
                    defaultChecked={!!profile?.[name]}
                  />
                  {label}
                </label>
              ))}
            </div>
            When you give us a telephone number, you agree that we (or any party acting on our behalf) have your express consent to contact you at the telephone number you provide, including with text or SMS messages. You agree that when we may contact you using an automatic telephone dialing system, autodialer, or with artificial or prerecorded voice messages. This consent applies whether the telephone number you provide is cellular, mobile, or another communication service for which the called party is charged.

          </section>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-950">
              Emergency Contact
            </h2>
            <p className="text-sm text-slate-500">
              Used only when Indiana Notary Solutions needs an emergency backup
              contact.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="emergency_contact_name"
              placeholder="Emergency Contact Name"
              defaultValue={profile?.emergency_contact_name || ""}
              className="rounded-xl border p-3"
            />
            <input
              name="emergency_contact_phone"
              placeholder="Emergency Contact Phone"
              defaultValue={profile?.emergency_contact_phone || ""}
              className="rounded-xl border p-3"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-950">
              ACH Payment Information
            </h2>
            <p className="text-sm text-slate-500">
              This is how Indiana Notary Solutions will pay you for completed
              assignments. Your account and routing numbers are masked after
              saving.
            </p>
          </div>

          {profile?.ach_account_last4 ? (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-5 text-sm">
              <p className="font-bold text-green-800">
                ACH payment information on file
              </p>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <p>
                  <strong>Bank:</strong> {profile.ach_bank_name || "-"}
                </p>
                <p>
                  <strong>Account Type:</strong>{" "}
                  {profile.ach_account_type || "-"}
                </p>
                <p>
                  <strong>Routing:</strong> ****{profile.ach_routing_last4}
                </p>
                <p>
                  <strong>Account:</strong> ****{profile.ach_account_last4}
                </p>
              </div>

              <p className="mt-3 text-xs text-slate-600">
                To update your ACH information, enter the new details below and
                save.
              </p>
            </div>
          ) : (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">
              <p className="font-bold text-amber-800">
                No ACH payment information on file.
              </p>
              <p className="text-slate-600">
                Add your bank details so payments can be processed.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="ach_bank_name"
              placeholder="Bank Name"
              defaultValue={profile?.ach_bank_name || ""}
              className="rounded-xl border p-3"
            />

            <select
              name="ach_account_type"
              defaultValue={profile?.ach_account_type || ""}
              className="rounded-xl border p-3"
            >
              <option value="">Account Type</option>
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
            </select>

            <input
              name="ach_routing_number"
              placeholder="Routing Number"
              inputMode="numeric"
              className="rounded-xl border p-3"
            />

            <input
              name="ach_account_number"
              placeholder="Account Number"
              inputMode="numeric"
              className="rounded-xl border p-3"
            />
          </div>
        </section>

        <div className="flex justify-end pb-10">
  <button className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white shadow-lg hover:bg-slate-800">
    Save Profile
  </button>
</div>
      </form>
    </main>
  );
}