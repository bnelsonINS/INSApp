import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const formData = await request.formData();
  const county = String(formData.get("county") ?? "").trim();

  if (!county) redirect("/notary/coverage");

  const { error } = await supabase.from("notary_coverage_counties").insert({
    user_id: user.id,
    state: "IN",
    county,
  });

  if (error) {
    console.error("Add county error:", error);
  }

  redirect("/notary/coverage");
}