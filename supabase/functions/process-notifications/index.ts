// @ts-nocheck
// supabase/functions/process-notifications/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type NotificationMetadata = {
  email?: string;
  recipient_email?: string;
  recipient_name?: string;
  phone?: string;
  credential_type?: string;
  credential_label?: string;
  admin_notes?: string;
  rejection_reason?: string;
  reason?: string;
  offer_url?: string;
  order_link?: string;
  review_url?: string;
  cta_label?: string;
  [key: string]: unknown;
};

type NotificationRow = {
  id: string;
  user_id: string | null;
  channel: string;
  type: string;
  status: string;
  subject: string | null;
  message: string | null;
  metadata: NotificationMetadata | null;
  attempts: number | null;
};

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        success: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      },
      500
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: notifications, error } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .in("channel", ["email", "sms"])
    .or("attempts.is.null,attempts.lt.3")
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    return jsonResponse(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }

  let sent = 0;
  let failed = 0;

  for (const notification of (notifications ?? []) as NotificationRow[]) {
    const currentAttempts = notification.attempts ?? 0;
    const nextAttempts = currentAttempts + 1;

    await supabase
      .from("notification_queue")
      .update({
        status: "processing",
        processing_at: new Date().toISOString(),
        attempts: nextAttempts,
        last_error: null,
      })
      .eq("id", notification.id);

    try {
      if (notification.channel === "email") {
        if (!resendApiKey) {
          throw new Error("Missing RESEND_API_KEY");
        }

        await sendEmail(notification, resendApiKey);
      } else if (notification.channel === "sms") {
        if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
          throw new Error(
            "Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER"
          );
        }

        await sendSms(
          notification,
          twilioAccountSid,
          twilioAuthToken,
          twilioFromNumber
        );
      } else {
        throw new Error(
          `Unsupported notification channel: ${notification.channel}`
        );
      }

      await supabase
        .from("notification_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          processing_at: null,
          last_error: null,
        })
        .eq("id", notification.id);

      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      await supabase
        .from("notification_queue")
        .update({
          status: nextAttempts >= 3 ? "failed" : "pending",
          processing_at: null,
          last_error: message,
        })
        .eq("id", notification.id);

      failed++;
    }
  }

  return jsonResponse({
    success: true,
    processed: notifications?.length ?? 0,
    sent,
    failed,
  });
});

async function sendEmail(notification: NotificationRow, resendApiKey: string) {
  const to =
    notification.metadata?.email || notification.metadata?.recipient_email;

  if (!to) {
    throw new Error("Missing recipient email in notification metadata.");
  }

  const message = buildNotificationMessage(notification);

  if (!message) {
    throw new Error("Missing email message body.");
  }

  const htmlMessage = buildEmailHtml(message, notification.metadata);

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Indiana Notary Solutions <notifications@indiananotarysolutions.com>",
      to,
      subject: notification.subject ?? "Indiana Notary Solutions Notification",
      html: htmlMessage,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(errorText);
  }
}

function buildNotificationMessage(notification: NotificationRow) {
  if (notification.type !== "credential_rejected") {
    return notification.message ?? "";
  }

  const credentialLabel =
    notification.metadata?.credential_type ||
    notification.metadata?.credential_label ||
    "credential";

  const rejectionReason =
    notification.metadata?.admin_notes ||
    notification.metadata?.rejection_reason ||
    notification.metadata?.reason ||
    "";

  if (String(rejectionReason).trim()) {
    return `Your ${credentialLabel} was rejected by Indiana Notary Solutions.

Reason:
${rejectionReason}

Please upload a corrected document in your notary dashboard.`;
  }

  return (
    notification.message ||
    `Your ${credentialLabel} was rejected by Indiana Notary Solutions.

Please upload a corrected document in your notary dashboard.`
  );
}

async function sendSms(
  notification: NotificationRow,
  accountSid: string,
  authToken: string,
  fromNumber: string
) {
  const to = notification.metadata?.phone;
  const body = buildNotificationMessage(notification);

  if (!to) {
    throw new Error("Missing recipient phone in notification metadata.");
  }

  if (!body) {
    throw new Error("Missing SMS message body.");
  }

  const credentials = btoa(`${accountSid}:${authToken}`);

  const smsResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: to,
        Body: body,
      }),
    }
  );

  if (!smsResponse.ok) {
    const errorText = await smsResponse.text();
    throw new Error(errorText);
  }
}

function getCtaUrl(metadata: NotificationMetadata | null) {
  if (!metadata) return null;

  return (
    metadata.offer_url ||
    metadata.order_link ||
    metadata.review_url ||
    null
  );
}

function getCtaLabel(metadata: NotificationMetadata | null) {
  if (!metadata) return "Open Details";

  return metadata.cta_label || "Open Details";
}

function buildEmailHtml(
  message: string,
  metadata: NotificationMetadata | null
) {
  const escaped = escapeHtml(message);
  const htmlBody = escaped.replaceAll("\n", "<br />");

  const ctaUrl = getCtaUrl(metadata);
  const ctaLabel = getCtaLabel(metadata);

  const buttonHtml = ctaUrl
    ? `
      <div style="margin:28px 0 8px;">
        <a href="${escapeHtml(String(ctaUrl))}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:bold;display:inline-block;">
          ${escapeHtml(String(ctaLabel))}
        </a>
      </div>
    `
    : "";

  return `
    <div style="margin:0;padding:0;background:#f8fafc;">
      <div style="max-width:720px;margin:0 auto;padding:24px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
          <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">
            Indiana Notary Solutions
          </h1>
          <div style="font-size:15px;">
            ${htmlBody}
            ${buttonHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}