import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";
import { supabaseAdmin } from "../../../src/lib/supabase-admin";

export async function POST() {
  console.log("ONBOARDING COMPLETE ROUTE HIT");

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("ONBOARDING USER:", user?.id, userError);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      has_seen_onboarding: true,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id, email, has_seen_onboarding")
    .single();

  console.log("ONBOARDING UPDATE RESULT:", data, error);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, profile: data });
}