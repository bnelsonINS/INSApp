import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../src/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const formData = await request.formData();

  const homeZip = String(formData.get("home_zip") ?? "").trim();
  const radiusRaw = String(formData.get("travel_radius_miles") ?? "").trim();

  const radius = radiusRaw ? Number(radiusRaw) : null;

  if (homeZip && !/^\d{5}$/.test(homeZip)) {
    console.error("Invalid home ZIP:", homeZip);
    redirect("/notary/coverage");
  }

  if (radius !== null && (Number.isNaN(radius) || radius < 0 || radius > 250)) {
    console.error("Invalid travel radius:", radiusRaw);
    redirect("/notary/coverage");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      home_zip: homeZip || null,
      travel_radius_miles: radius,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Update travel preferences error:", error);
  }

  redirect("/notary/coverage");
}