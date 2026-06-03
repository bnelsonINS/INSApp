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

  const formData = await request.formData();
  const note = String(formData.get("note") ?? "").trim();

  if (!note) redirect(`/notary/assignments/${id}`);

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, notary_id")
    .eq("id", id)
    .eq("notary_id", user.id)
    .single();

  if (!assignment) redirect("/notary/assignments");

  await supabase.from("assignment_activity").insert({
    assignment_id: id,
    actor_id: user.id,
    actor_name: user.email ?? "Notary",
    actor_role: "notary",
    action: "Note Added",
    details: note,
  });

  redirect(`/notary/assignments/${id}`);
}