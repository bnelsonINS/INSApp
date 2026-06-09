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

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-semibold text-blue-100">
            Client Profile
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Company & Contact Settings
          </h1>

          <p className="mt-3 max-w-3xl text-sm text-blue-100/90">
            Manage your company details, client contact information, billing
            email, and default signing instructions.
          </p>
        </div>
      </section>

      <form
        action={updateClientProfile}
        //encType="multipart/form-data"
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Company Logo</h2>

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
                className="h-24 w-24 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-[#0B1F4D] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-950"
              />

              <p className="mt-2 text-xs text-slate-500">
                Recommended: PNG, JPG, or WEBP. Square logos work best.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Company Info</h2>

          <p className="mt-1 text-sm text-slate-500">
            This information appears throughout your client portal.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Company Name
              </label>

              <input
                name="company_name"
                defaultValue={profile.company_name || ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Company Phone
              </label>

              <input
                name="company_phone"
                defaultValue={profile.company_phone || ""}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Company Address
              </label>

              <input
                name="company_address"
                defaultValue={profile.company_address || ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                City
              </label>

              <input
                name="company_city"
                defaultValue={profile.company_city || ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                State
              </label>

              <input
                name="company_state"
                defaultValue={profile.company_state || "IN"}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                ZIP
              </label>

              <input
                name="company_zip"
                defaultValue={profile.company_zip || ""}
                className={inputClass}
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
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Default Signing Instructions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            These instructions can be reused when placing new orders.
          </p>

          <textarea
            name="default_signing_instructions"
            rows={6}
            defaultValue={profile.default_signing_instructions || ""}
            placeholder="Example: Please call borrower before appointment. Scanbacks required after signing."
            className={`${inputClass} resize-y`}
          />

          <label className="mt-5 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              name="email_notifications"
              defaultChecked={profile.email_notifications ?? true}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0B1F4D] focus:ring-[#0B1F4D]"
            />

            <span>Receive email notifications</span>
          </label>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 sm:w-auto"
          >
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}