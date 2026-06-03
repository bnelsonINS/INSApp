import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../../src/lib/supabase-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!id) {
    console.error("Missing ZIP id");
    redirect("/notary/coverage");
  }

  const { error } = await supabase
    .from("notary_coverage_zip_codes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete ZIP error:", error);
  }

  redirect("/notary/coverage");
}