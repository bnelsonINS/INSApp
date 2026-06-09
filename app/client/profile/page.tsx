import Image from "next/image";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientProfilePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      role,
      is_active,
      company_name,
      company_phone,
      company_address,
      company_city,
      company_state,
      company_zip,
      billing_email,
      phone,
      client_role,
      default_signing_instructions,
      email_notifications,
      logo_url
    `
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.is_active) {
    redirect("/login");
  }

  async function updateClientProfile(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const logoFile = formData.get("logo");

    let logoUrl: string | null = null;

    if (logoFile instanceof File && logoFile.size > 0) {
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

      if (!allowedTypes.includes(logoFile.type)) {
        redirect("/client/profile?logo=invalid-file");
      }

      const fileExt = logoFile.name.split(".").pop() || "png";
      const filePath = `${user.id}/client-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-logos")
        .upload(filePath, logoFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: logoFile.type,
        });

      if (uploadError) {
        console.error("Client logo upload error:", uploadError);
        redirect("/client/profile?logo=upload-error");
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-logos").getPublicUrl(filePath);

      logoUrl = publicUrl;
    }

    const updateData: Record<string, string | boolean | null> = {
      full_name: String(formData.get("full_name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      company_name: String(formData.get("company_name") || "").trim(),
      company_phone: String(formData.get("company_phone") || "").trim(),
      company_address: String(formData.get("company_address") || "").trim(),
      company_city: String(formData.get("company_city") || "").trim(),
      company_state: String(formData.get("company_state") || "").trim(),
      company_zip: String(formData.get("company_zip") || "").trim(),
      billing_email: String(formData.get("billing_email") || "").trim(),
      client_role: String(formData.get("client_role") || "User").trim(),
      default_signing_instructions: String(
        formData.get("default_signing_instructions") || ""
      ).trim(),
      email_notifications: formData.get("email_notifications") === "on",
    };

    if (logoUrl) {
      updateData.logo_url = logoUrl;
    }

    await supabase.from("profiles").update(updateData).eq("id", user.id);

    revalidatePath("/client/profile");
    revalidatePath("/client/dashboard");
    redirect("/client/profile?saved=1");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-sm font-semibold text-emerald-300">
          Client Profile
        </p>
        <h1 className="mt-2 text-2xl font-bold">Company & Contact Settings</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Manage your company details, client contact information, billing email,
          and default signing instructions.
        </p>
      </section>

      <form
        action={updateClientProfile}
        encType="multipart/form-data"
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Company Logo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a logo to personalize your client portal.
          </p>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            {profile.logo_url ? (
              <Image
                src={profile.logo_url}
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">
                Recommended: PNG, JPG, or WEBP. Square logos work best.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Company Info</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Company Name
              </label>
              <input
                name="company_name"
                defaultValue={profile.company_name || ""}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Company Phone
              </label>
              <input
                name="company_phone"
                defaultValue={profile.company_phone || ""}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Company Address
              </label>
              <input
                name="company_address"
                defaultValue={profile.company_address || ""}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                City
              </label>
              <input
                name="company_city"
                defaultValue={profile.company_city || ""}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                State
              </label>
              <input
                name="company_state"
                defaultValue={profile.company_state || "IN"}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                ZIP
              </label>
              <input
                name="company_zip"
                defaultValue={profile.company_zip || ""}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Billing Email
              </label>
              <input
                name="billing_email"
                type="email"
                defaultValue={profile.billing_email || ""}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Default Signing Instructions
          </h2>

          <textarea
            name="default_signing_instructions"
            rows={6}
            defaultValue={profile.default_signing_instructions || ""}
            placeholder="Example: Please call borrower before appointment. Scanbacks required after signing."
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />

          <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              name="email_notifications"
              defaultChecked={profile.email_notifications ?? true}
            />
            Receive email notifications
          </label>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
          >
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}