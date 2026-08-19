// @ts-nocheck
// supabase/functions/process-scanback-reminders/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const REMINDER_TYPE = "scanback_reminder";
const REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000;
const SCANBACK_OVERDUE_MS = 2 * 60 * 60 * 1000;

type AssignmentRow = {
  id: string;
  control_number: string | null;
  borrower_name: string | null;
  status: string | null;
  assigned_notary_id: string | null;
  notary_id: string | null;
  signing_date: string | null;
  signing_time: string | null;
};

type ReminderStateRow = {
  id: string;
  assignment_id: string;
  reminder_type: string;
  first_sent_at: string | null;
  last_sent_at: string | null;
  send_count: number | null;
  active: boolean;
  stopped_at: string | null;
};

type NotaryProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        success: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();

  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignments")
    .select(
      "id, control_number, borrower_name, status, assigned_notary_id, notary_id, signing_date, signing_time",
    )
    .not("assigned_notary_id", "is", null)
    .eq("status", "In Progress");

  if (assignmentsError) {
    return jsonResponse(
      {
        success: false,
        error: assignmentsError.message,
      },
      500,
    );
  }

  let checked = 0;
  let overdue = 0;
  let sent = 0;
  let stopped = 0;
  let skipped = 0;
  const errors: Array<{ assignment_id: string; error: string }> = [];

  for (const assignment of (assignments ?? []) as AssignmentRow[]) {
    checked++;

    try {
      if (!isScanbacksOverdue(assignment, now)) {
        skipped++;
        continue;
      }

      overdue++;

      const notaryId =
        assignment.assigned_notary_id || assignment.notary_id;

      if (!notaryId) {
        skipped++;
        continue;
      }

      // The actual uploaded scanback file is the source of truth for stopping
      // reminders. Status alone does not stop the automation.
      const { data: scanbackDocument, error: scanbackError } = await supabase
        .from("assignment_uploaded_documents")
        .select("id")
        .eq("assignment_id", assignment.id)
        .eq("document_type", "Signed Document Package")
        .limit(1)
        .maybeSingle();

      if (scanbackError) {
        throw new Error(
          `Unable to check scanbacks: ${scanbackError.message}`,
        );
      }

      if (scanbackDocument) {
        const { error: stopError } = await supabase
          .from("assignment_reminder_state")
          .update({
            active: false,
            stopped_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("assignment_id", assignment.id)
          .eq("reminder_type", REMINDER_TYPE)
          .eq("active", true);

        if (stopError) {
          throw new Error(
            `Unable to stop reminder state: ${stopError.message}`,
          );
        }

        stopped++;
        continue;
      }

      const { data: reminderState, error: reminderStateError } = await supabase
        .from("assignment_reminder_state")
        .select(
          "id, assignment_id, reminder_type, first_sent_at, last_sent_at, send_count, active, stopped_at",
        )
        .eq("assignment_id", assignment.id)
        .eq("reminder_type", REMINDER_TYPE)
        .maybeSingle();

      if (reminderStateError) {
        throw new Error(
          `Unable to load reminder state: ${reminderStateError.message}`,
        );
      }

      const state = reminderState as ReminderStateRow | null;

      if (state?.last_sent_at) {
        const lastSentAt = new Date(state.last_sent_at).getTime();

        if (
          !Number.isNaN(lastSentAt) &&
          now.getTime() - lastSentAt < REMINDER_INTERVAL_MS
        ) {
          skipped++;
          continue;
        }
      }

      const { data: notaryProfile, error: notaryProfileError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", notaryId)
        .maybeSingle();

      if (notaryProfileError) {
        throw new Error(
          `Unable to load notary profile: ${notaryProfileError.message}`,
        );
      }

      const notary = notaryProfile as NotaryProfile | null;

      if (!notary) {
        throw new Error("Assigned notary profile was not found.");
      }

      const notaryName =
        notary.full_name?.trim() || notary.email?.trim() || "Notary";

      const reminderMessage =
        `@${notaryName} Please upload scanbacks ASAP`;

      // Claim the reminder window before creating the message/email.
      // The unique constraint on (assignment_id, reminder_type) prevents
      // multiple state rows for the same assignment.
      const nextSendCount = (state?.send_count ?? 0) + 1;
      const firstSentAt = state?.first_sent_at || now.toISOString();

      const { error: stateUpsertError } = await supabase
        .from("assignment_reminder_state")
        .upsert(
          {
            assignment_id: assignment.id,
            reminder_type: REMINDER_TYPE,
            first_sent_at: firstSentAt,
            last_sent_at: now.toISOString(),
            send_count: nextSendCount,
            active: true,
            stopped_at: null,
            updated_at: now.toISOString(),
          },
          {
            onConflict: "assignment_id,reminder_type",
          },
        );

      if (stateUpsertError) {
        throw new Error(
          `Unable to update reminder state: ${stateUpsertError.message}`,
        );
      }

      const { error: messageError } = await supabase
        .from("order_messages")
        .insert({
          assignment_id: assignment.id,
          sender_id: null,
          message: reminderMessage,
          visibility: "admin_notary",
          is_system: true,
          system_type: REMINDER_TYPE,
        });

      if (messageError) {
        // Roll the state timestamp back so a failed message insert can be
        // retried on the next worker run instead of waiting three hours.
        await rollbackReminderState(
          supabase,
          assignment.id,
          state,
        );

        throw new Error(
          `Unable to create order message: ${messageError.message}`,
        );
      }

      if (notary.email) {
        const orderNumber =
          assignment.control_number || assignment.id;

        const orderLink = buildNotaryOrderLink(assignment.id);

        const { error: notificationError } = await supabase
          .from("notification_queue")
          .insert({
            user_id: notary.id,
            channel: "email",
            type: "order_message_added",
            status: "pending",
            subject: `Scanbacks Overdue - Order-${orderNumber}`,
            message: `
Hello ${notaryName},

Scanbacks are overdue for Order-${orderNumber}.

Borrower Name: ${assignment.borrower_name || "Not listed"}

${reminderMessage}

Please upload the signed document package as soon as possible.

Indiana Notary Solutions
`.trim(),
            metadata: {
              email: notary.email,
              assignment_id: assignment.id,
              control_number: orderNumber,
              order_link: orderLink,
              cta_label: "Upload Scanbacks",
              recipient_type: "notary",
              system_type: REMINDER_TYPE,
            },
            attempts: 0,
          });

        if (notificationError) {
          throw new Error(
            `Unable to queue notary email: ${notificationError.message}`,
          );
        }
      }

      sent++;
    } catch (error) {
      errors.push({
        assignment_id: assignment.id,
        error:
          error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Use the existing notification processor after all reminders are queued.
  if (sent > 0) {
    try {
      await fetch(
        `${supabaseUrl}/functions/v1/process-notifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      );
    } catch (error) {
      console.error(
        "[process-scanback-reminders] Unable to invoke process-notifications:",
        error,
      );
    }
  }

  return jsonResponse({
    success: errors.length === 0,
    checked,
    overdue,
    sent,
    stopped,
    skipped,
    errors,
  });
});

function getSigningDateTime(order: AssignmentRow) {
  if (!order.signing_date || !order.signing_time) return null;

  const datePart = order.signing_date.includes("T")
    ? order.signing_date.split("T")[0]
    : order.signing_date;

  const timePart = order.signing_time.slice(0, 5);
  const signingDateTime = new Date(`${datePart}T${timePart}:00`);

  if (Number.isNaN(signingDateTime.getTime())) return null;

  return signingDateTime;
}

function isScanbacksOverdue(order: AssignmentRow, now: Date) {
  const signingDateTime = getSigningDateTime(order);
  if (!signingDateTime) return false;

  const twoHoursAfterSigning =
    signingDateTime.getTime() + SCANBACK_OVERDUE_MS;

  const normalizedStatus = (order.status ?? "").toLowerCase();

  return (
    Boolean(order.assigned_notary_id) &&
    now.getTime() >= twoHoursAfterSigning &&
    normalizedStatus === "in progress"
  );
}

function getBaseUrl() {
  return (
    Deno.env.get("SITE_URL") ||
    Deno.env.get("NEXT_PUBLIC_SITE_URL") ||
    Deno.env.get("NEXT_PUBLIC_APP_URL") ||
    "https://indiananotarysolutions.com"
  ).replace(/\/$/, "");
}

function buildNotaryOrderLink(assignmentId: string) {
  return `${getBaseUrl()}/login?redirectTo=${encodeURIComponent(
    `/notary/assignments/${assignmentId}`,
  )}`;
}

async function rollbackReminderState(
  supabase: ReturnType<typeof createClient>,
  assignmentId: string,
  previousState: ReminderStateRow | null,
) {
  if (!previousState) {
    await supabase
      .from("assignment_reminder_state")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("reminder_type", REMINDER_TYPE);

    return;
  }

  await supabase
    .from("assignment_reminder_state")
    .update({
      first_sent_at: previousState.first_sent_at,
      last_sent_at: previousState.last_sent_at,
      send_count: previousState.send_count ?? 0,
      active: previousState.active,
      stopped_at: previousState.stopped_at,
      updated_at: new Date().toISOString(),
    })
    .eq("assignment_id", assignmentId)
    .eq("reminder_type", REMINDER_TYPE);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
