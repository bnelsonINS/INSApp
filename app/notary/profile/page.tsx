import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";
import LanguageSelector from "./language-selector";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100";

const sectionClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

const checkboxClass =
  "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700";

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
    .select("approval_status, logo_url")
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
    missingItems.push("Accept Text Messages or Accept Email Notifications");
  }

  return (
    <main className="space-y-6 bg-slate-50 p-4 sm:p-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-medium text-blue-100">Notary Profile</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            My Profile
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/90">
            Manage your public profile, contact information, notary details,
            availability, equipment, and ACH payment setup.
          </p>
        </div>
      </section>

      {accountProfile?.approval_status !== "approved" && (
        <section className="rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">
            Profile Pending Approval
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Complete all required profile information and credentials before
            your account can be reviewed and approved for assignments.
          </p>

          {missingItems.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
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

      <form
        action="/notary/profile/update"
        method="post"
        encType="multipart/form-data"
        className="space-y-6"
      >
        <section className={sectionClass}>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-950">Company Logo</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload a logo to personalize your notary dashboard header.
            </p>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {accountProfile?.logo_url ? (
              <Image
                src={accountProfile.logo_url}
                alt="Current company logo"
                width={96}
                height={96}
                className="rounded-2xl border border-slate-200 object-contain p-2"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
                No Logo
              </div>
            )}

            <div className="w-full">
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#0B1F4D] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:bg-slate-100"
              />
              <p className="mt-2 text-xs text-slate-500">
                Recommended: PNG, JPG, or WEBP. Square logos work best.
              </p>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-950">
              Public Profile
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This is the information clients and admins use to identify you.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="first_name"
              placeholder="First Name"
              defaultValue={profile?.first_name || ""}
              className={inputClass}
            />
            <input
              name="last_name"
              placeholder="Last Name"
              defaultValue={profile?.last_name || ""}
              className={inputClass}
            />
            <input
              name="business_name"
              placeholder="Business Name"
              defaultValue={profile?.business_name || ""}
              className={inputClass}
            />
            <input
              name="website"
              placeholder="Website"
              defaultValue={profile?.website || ""}
              className={inputClass}
            />
          </div>

          <textarea
            name="bio"
            placeholder="Public profile bio / about me"
            defaultValue={profile?.bio || ""}
            rows={6}
            className={`${inputClass} mt-4 resize-y`}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className={sectionClass}>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">
                Contact Information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Address and phone details for scheduling and communication.
              </p>
            </div>

            <div className="grid gap-4">
              <input
                name="address"
                placeholder="Address Line 1"
                defaultValue={profile?.address || ""}
                className={inputClass}
              />
              <input
                name="address_line_2"
                placeholder="Address Line 2"
                defaultValue={profile?.address_line_2 || ""}
                className={inputClass}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="city"
                  placeholder="City"
                  defaultValue={profile?.city || ""}
                  className={inputClass}
                />
                <input
                  name="state"
                  placeholder="State"
                  defaultValue={profile?.state || "IN"}
                  className={inputClass}
                />
                <input
                  name="zip"
                  placeholder="Zip"
                  defaultValue={profile?.zip || ""}
                  className={inputClass}
                />
                <input
                  name="county"
                  placeholder="County"
                  defaultValue={profile?.county || ""}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="home_phone"
                  placeholder="Home Phone"
                  defaultValue={profile?.home_phone || ""}
                  className={inputClass}
                />
                <input
                  name="mobile_phone"
                  placeholder="Mobile Phone"
                  defaultValue={profile?.mobile_phone || profile?.phone || ""}
                  className={inputClass}
                />
                <input
                  name="work_phone"
                  placeholder="Work Phone"
                  defaultValue={profile?.work_phone || ""}
                  className={inputClass}
                />
                <input
                  name="fax"
                  placeholder="Fax"
                  defaultValue={profile?.fax || ""}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">
                Notary Details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Commission, radius, language, and RON information.
              </p>
            </div>

            <div className="grid gap-4">
              <input
                name="commission_number"
                placeholder="Commission Number"
                defaultValue={profile?.commission_number || ""}
                className={inputClass}
              />
              <input
                name="commission_expiration"
                type="date"
                defaultValue={profile?.commission_expiration || ""}
                className={inputClass}
              />
              <input
                name="coverage_radius"
                type="number"
                placeholder="Travel Radius Miles"
                defaultValue={profile?.coverage_radius || ""}
                className={inputClass}
              />

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Languages Spoken
                </label>
                <LanguageSelector
                  defaultValue={profile?.languages_spoken || "English"}
                />
              </div>

              <label className={checkboxClass}>
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
          <section className={sectionClass}>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">Equipment</h2>
              <p className="mt-1 text-sm text-slate-500">
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
                <label key={name} className={checkboxClass}>
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

          <section className={sectionClass}>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">
                Notifications & Availability
              </h2>
              <p className="mt-1 text-sm text-slate-500">
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
                <label key={name} className={checkboxClass}>
                  <input
                    type="checkbox"
                    name={name}
                    defaultChecked={!!profile?.[name]}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
              When you give us a telephone number, you agree that we (or any
              party acting on our behalf) have your express consent to contact
              you at the telephone number you provide, including with text or
              SMS messages. You agree that when we may contact you using an
              automatic telephone dialing system, autodialer, or with artificial
              or prerecorded voice messages. This consent applies whether the
              telephone number you provide is cellular, mobile, or another
              communication service for which the called party is charged.
            </div>
          </section>
        </section>

        <section className={sectionClass}>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-950">
              Emergency Contact
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Used only when Indiana Notary Solutions needs an emergency backup
              contact.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="emergency_contact_name"
              placeholder="Emergency Contact Name"
              defaultValue={profile?.emergency_contact_name || ""}
              className={inputClass}
            />
            <input
              name="emergency_contact_phone"
              placeholder="Emergency Contact Phone"
              defaultValue={profile?.emergency_contact_phone || ""}
              className={inputClass}
            />
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-950">
              ACH Payment Information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
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

              <div className="mt-3 grid gap-2 text-slate-700 md:grid-cols-2">
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
              <p className="mt-1 text-slate-600">
                Add your bank details so payments can be processed.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="ach_bank_name"
              placeholder="Bank Name"
              defaultValue={profile?.ach_bank_name || ""}
              className={inputClass}
            />

            <select
              name="ach_account_type"
              defaultValue={profile?.ach_account_type || ""}
              className={inputClass}
            >
              <option value="">Account Type</option>
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
            </select>

            <input
              name="ach_routing_number"
              placeholder="Routing Number"
              inputMode="numeric"
              className={inputClass}
            />

            <input
              name="ach_account_number"
              placeholder="Account Number"
              inputMode="numeric"
              className={inputClass}
            />
          </div>
        </section>

        <div className="flex justify-end pb-10">
          <button className="w-full rounded-xl bg-[#0B1F4D] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-950 sm:w-auto">
            Save Profile
          </button>
        </div>
      </form>
    </main>
  );
}