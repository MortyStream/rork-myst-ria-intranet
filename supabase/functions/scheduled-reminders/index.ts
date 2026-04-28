import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  assignedTo: string[];
  reminder24hSentAt: string | null;
  reminder1hSentAt: string | null;
}

interface Event {
  id: string;
  title: string;
  startTime: string;
  participants: { userId: string; status: string }[] | null;
  reminder1hSentAt: string | null;
}

interface PushToken {
  userId: string;
  token: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

// Fenêtres de tolérance — l'Edge Function tourne toutes les 15 min,
// on prend une fenêtre légèrement plus large que l'intervalle de cron
// pour ne pas rater un rappel si l'exécution glisse de quelques secondes.
const WINDOW_MINUTES = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!tokens.length) return;
  const BATCH = 100;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const messages = batch.map((to) => ({
      to,
      title,
      body,
      sound: "default",
      priority: "high",
      data,
    }));
    try {
      const res = await fetch(EXPO_PUSH_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        console.error(`Expo push API ${res.status}:`, await res.text());
      }
    } catch (err) {
      console.error("Expo push API error:", err);
    }
  }
}

async function fetchTokensForUsers(
  supabase: ReturnType<typeof createClient>,
  userIds: string[]
): Promise<string[]> {
  if (!userIds.length) return [];
  const { data, error } = await supabase
    .from("push_tokens")
    .select("token")
    .in("userId", userIds);
  if (error || !data) {
    console.error("fetchTokensForUsers error:", error);
    return [];
  }
  return data.map((r: { token: string }) => r.token).filter(Boolean);
}

async function createInAppNotification(
  supabase: ReturnType<typeof createClient>,
  payload: {
    title: string;
    message: string;
    targetUserIds: string[];
    eventId?: string;
    taskId?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const { error } = await supabase.from("notifications").insert({
    id,
    title: payload.title,
    message: payload.message,
    targetRoles: [],
    targetUserIds: payload.targetUserIds,
    eventId: payload.eventId ?? null,
    taskId: payload.taskId ?? null,
    read: false,
    createdAt: now,
    updatedAt: now,
  });
  if (error) console.error("createInAppNotification error:", error);
}

// ─── Reminders : tâches ───────────────────────────────────────────────────────
async function processTaskReminders(
  supabase: ReturnType<typeof createClient>,
  windowType: "24h" | "1h"
): Promise<{ processed: number; errors: number }> {
  const now = Date.now();
  // 24h reminder : deadline dans [24h, 24h+window], pas encore envoyé
  // 1h reminder : deadline dans [1h, 1h+window], pas encore envoyé
  const baseOffsetMs = windowType === "24h" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const windowMs = WINDOW_MINUTES * 60 * 1000;
  const lowerBound = new Date(now + baseOffsetMs - windowMs).toISOString();
  const upperBound = new Date(now + baseOffsetMs + windowMs).toISOString();
  const sentColumn = windowType === "24h" ? "reminder24hSentAt" : "reminder1hSentAt";

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, deadline, status, assignedTo, reminder24hSentAt, reminder1hSentAt")
    .gte("deadline", lowerBound)
    .lte("deadline", upperBound)
    .is(sentColumn, null)
    .not("status", "in", "(completed,validated)");

  if (error) {
    console.error(`Tasks ${windowType} query error:`, error);
    return { processed: 0, errors: 1 };
  }
  if (!tasks || tasks.length === 0) return { processed: 0, errors: 0 };

  let processed = 0;
  let errors = 0;

  for (const task of tasks as Task[]) {
    if (!task.assignedTo || task.assignedTo.length === 0) {
      // Pas d'assignés → marquer comme envoyé pour ne pas rescanner
      await supabase.from("tasks").update({ [sentColumn]: new Date().toISOString() }).eq("id", task.id);
      continue;
    }

    const title = windowType === "24h"
      ? "📅 Rappel : deadline dans 24h"
      : "🚨 Deadline dans 1h !";
    const body = windowType === "24h"
      ? `Il te reste 24h pour terminer « ${task.title} ».`
      : `Plus qu'1h pour finir « ${task.title} » !`;

    try {
      const tokens = await fetchTokensForUsers(supabase, task.assignedTo);
      await sendExpoPush(tokens, title, body, { taskId: task.id, type: `task_reminder_${windowType}` });
      await createInAppNotification(supabase, {
        title,
        message: body,
        targetUserIds: task.assignedTo,
        taskId: task.id,
      });
      // Marquer comme envoyé pour éviter les doublons à la prochaine exécution
      await supabase
        .from("tasks")
        .update({ [sentColumn]: new Date().toISOString() })
        .eq("id", task.id);
      processed++;
    } catch (err) {
      console.error(`Task ${task.id} reminder ${windowType} failed:`, err);
      errors++;
    }
  }

  return { processed, errors };
}

// ─── Reminders : événements ───────────────────────────────────────────────────
async function processEventReminders(
  supabase: ReturnType<typeof createClient>
): Promise<{ processed: number; errors: number }> {
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const windowMs = WINDOW_MINUTES * 60 * 1000;
  const lowerBound = new Date(now + oneHourMs - windowMs).toISOString();
  const upperBound = new Date(now + oneHourMs + windowMs).toISOString();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, startTime, participants, reminder1hSentAt")
    .gte("startTime", lowerBound)
    .lte("startTime", upperBound)
    .is("reminder1hSentAt", null);

  if (error) {
    console.error("Events query error:", error);
    return { processed: 0, errors: 1 };
  }
  if (!events || events.length === 0) return { processed: 0, errors: 0 };

  let processed = 0;
  let errors = 0;

  for (const event of events as Event[]) {
    // On notifie uniquement les participants confirmés ou en attente (pas les déclinés)
    const targets = (event.participants ?? [])
      .filter((p) => p.status !== "declined")
      .map((p) => p.userId);

    if (targets.length === 0) {
      await supabase.from("events").update({ reminder1hSentAt: new Date().toISOString() }).eq("id", event.id);
      continue;
    }

    const title = "⏰ Rappel : événement dans 1h";
    const body = `« ${event.title} » commence dans 1h.`;

    try {
      const tokens = await fetchTokensForUsers(supabase, targets);
      await sendExpoPush(tokens, title, body, { eventId: event.id, type: "event_reminder_1h" });
      await createInAppNotification(supabase, {
        title,
        message: body,
        targetUserIds: targets,
        eventId: event.id,
      });
      await supabase
        .from("events")
        .update({ reminder1hSentAt: new Date().toISOString() })
        .eq("id", event.id);
      processed++;
    } catch (err) {
      console.error(`Event ${event.id} reminder failed:`, err);
      errors++;
    }
  }

  return { processed, errors };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const [task24h, task1h, event1h] = await Promise.all([
      processTaskReminders(supabase, "24h"),
      processTaskReminders(supabase, "1h"),
      processEventReminders(supabase),
    ]);

    const summary = {
      success: true,
      ranAt: new Date().toISOString(),
      tasks24h: task24h,
      tasks1h: task1h,
      events1h: event1h,
    };
    console.log("scheduled-reminders summary:", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scheduled-reminders fatal error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
