import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const formData = await request.formData();
  const zipCode = String(formData.get("zip_code") ?? "").trim();

  if (!/^\d{5}$/.test(zipCode)) {
    console.error("Invalid ZIP code:", zipCode);
    redirect("/notary/coverage");
  }

  const { error } = await supabase.from("notary_coverage_zip_codes").insert({
    user_id: user.id,
    zip_code: zipCode,
  });

  if (error) {
    console.error("Add ZIP error:", error);
  }

  redirect("/notary/coverage");
}