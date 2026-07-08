import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getFirstEmail(value: string) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? value;
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");

    if (
      process.env.IMPORT_EMAIL_WEBHOOK_SECRET &&
      secret !== process.env.IMPORT_EMAIL_WEBHOOK_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const fromRaw = cleanText(formData.get("from"));
    const toRaw = cleanText(formData.get("recipient")) || cleanText(formData.get("to"));
    const subject = cleanText(formData.get("subject"));
    const rawBody =
      cleanText(formData.get("stripped-text")) ||
      cleanText(formData.get("body-plain")) ||
      cleanText(formData.get("text")) ||
      "";
    const htmlBody =
      cleanText(formData.get("body-html")) ||
      cleanText(formData.get("html")) ||
      "";

    const providerMessageId =
      cleanText(formData.get("Message-Id")) ||
      cleanText(formData.get("message-id")) ||
      crypto.randomUUID();

    const sourceEmail = getFirstEmail(fromRaw);

    const { data: emailRow, error: emailError } = await supabaseAdmin
      .from("pro_import_emails")
      .insert({
        source_email: sourceEmail,
        source_name: fromRaw,
        subject,
        raw_body: rawBody,
        html_body: htmlBody,
        provider: "mailgun",
        provider_message_id: providerMessageId,
        attachments: [],
        status: "received",
      })
      .select("id, source_email, source_name, subject")
      .single();

    if (emailError || !emailRow) {
      console.error("pro_import_emails insert error:", emailError);
      return NextResponse.json(
        { error: "Failed to save import email" },
        { status: 500 }
      );
    }

    const { error: draftError } = await supabaseAdmin
      .from("pro_import_drafts")
      .insert({
        import_email_id: emailRow.id,
        status: "pending_review",
        source_company: emailRow.source_name || null,
        source_email: emailRow.source_email || null,
        extracted_data: {
          subject,
          to: toRaw,
          from: fromRaw,
          raw_body: rawBody,
        },
        parser_type: "basic",
        confidence: 0,
      });

    if (draftError) {
      console.error("pro_import_drafts insert error:", draftError);

      await supabaseAdmin
        .from("pro_import_emails")
        .update({
          status: "failed_parse",
          error_message: draftError.message,
        })
        .eq("id", emailRow.id);

      return NextResponse.json(
        { error: "Email saved, but draft creation failed" },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("pro_import_emails")
      .update({ status: "draft_created" })
      .eq("id", emailRow.id);

    return NextResponse.json({
      ok: true,
      email_id: emailRow.id,
    });
  } catch (error) {
    console.error("Inbound import email error:", error);

    return NextResponse.json(
      { error: "Inbound email import failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "INS Pro email import receiver",
  });
}