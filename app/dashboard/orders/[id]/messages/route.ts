import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get("assignment_id");

  if (!assignmentId) {
    return NextResponse.json(
      { error: "Missing assignment_id" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("order_messages")
    .select("id, assignment_id, sender_id, message, created_at")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const assignmentId = body.assignment_id;
  const message = body.message;

  if (!assignmentId || !message?.trim()) {
    return NextResponse.json(
      { error: "Missing assignment_id or message" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("order_messages")
    .insert({
      assignment_id: assignmentId,
      sender_id: user.id,
      message: message.trim(),
    })
    .select("id, assignment_id, sender_id, message, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}