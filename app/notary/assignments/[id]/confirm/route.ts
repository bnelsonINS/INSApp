import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const formData = await request.formData();

  const actionType = String(
    formData.get("action_type") ?? "confirmed"
  );

  const unavailableDetails = String(
    formData.get("unavailable_details") ?? ""
  ).trim();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const actorName =
    profile?.full_name ||
    profile?.email ||
    user.email ||
    "Notary";

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, notary_id, assigned_notary_id, status")
    .eq("id", id)
    .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`)
    .single();

  if (!assignment) {
    redirect("/notary/assignments");
  }

  // --------------------------------------------------
  // SIGNER UNAVAILABLE / APPOINTMENT CHANGE REQUEST
  // --------------------------------------------------

  if (actionType === "unavailable") {
    await supabase.from("assignment_activity").insert({
      assignment_id: id,
      actor_id: user.id,
      actor_name: actorName,
      actor_role: "notary",
      action: "Appointment Change Requested",
      details:
        unavailableDetails ||
        "The signer is unavailable for the scheduled appointment.",
    });

    redirect(`/notary/assignments/${id}`);
  }

  // --------------------------------------------------
  // APPOINTMENT CONFIRMED
  // --------------------------------------------------

  const { error } = await supabase
    .from("assignments")
    .update({
      status: "Confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .or(`notary_id.eq.${user.id},assigned_notary_id.eq.${user.id}`);

  if (error) {
    console.error("Confirm assignment error:", error);
    redirect(`/notary/assignments/${id}`);
  }

  await supabase.from("assignment_activity").insert({
    assignment_id: id,
    actor_id: user.id,
    actor_name: actorName,
    actor_role: "notary",
    action: "Appointment Confirmed",
    details:
      "The notary contacted the signer and confirmed the appointment details.",
  });

  redirect(`/notary/assignments/${id}`);
}