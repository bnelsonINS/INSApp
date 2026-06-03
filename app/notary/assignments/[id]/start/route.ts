import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

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

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, notary_id, status")
    .eq("id", id)
    .eq("notary_id", user.id)
    .single();

  if (!assignment) redirect("/notary/assignments");

  const { error } = await supabase
    .from("assignments")
    .update({
      status: "In Progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("notary_id", user.id);

  if (error) {
    console.error("Start signing error:", error);
    redirect(`/notary/assignments/${id}`);
  }

  await supabase.from("assignment_activity").insert({
    assignment_id: id,
    actor_id: user.id,
    actor_name: user.email ?? "Notary",
    actor_role: "notary",
    action: "Signing Started",
    details: "The notary marked the signing as in progress.",
  });

  redirect(`/notary/assignments/${id}`);
}