import { getSupabase } from '@/utils/supabase';
import { usePendingQueueStore, PendingAction } from '@/store/pending-queue-store';
import { useTasksStore } from '@/store/tasks-store';
import { useCalendarStore } from '@/store/calendar-store';
import { getIsOnline } from '@/components/OfflineBanner';

const MAX_RETRIES = 5;
let isFlushing = false;

/**
 * Drain la queue d'actions en attente. Appelé :
 * - Au retour online (transition offline → online)
 * - Au démarrage de l'app si la queue n'est pas vide
 *
 * Thread-safe via flag `isFlushing` (réentrance bloquée).
 * Stoppe à la 1ère erreur réseau pour éviter de cramer les retries en série.
 */
export const flushPendingQueue = async (): Promise<void> => {
  if (isFlushing) {
    console.log('[Queue] flush already in progress, skipping');
    return;
  }
  if (!getIsOnline()) {
    console.log('[Queue] offline, skipping flush');
    return;
  }

  isFlushing = true;
  // Compte combien d'actions on a réussi à drainer pendant ce passage,
  // pour le toast de confirmation à la fin (UX positive après reconnexion).
  let drainedCount = 0;
  try {
    while (true) {
      if (!getIsOnline()) {
        console.log('[Queue] went offline mid-flush, pausing');
        break;
      }
      const queue = usePendingQueueStore.getState().actions;
      if (queue.length === 0) break;

      const next = queue[0];
      try {
        await executeAction(next);
        usePendingQueueStore.getState().remove(next.id);
        drainedCount += 1;
        console.log('[Queue] ✓', next.type, next.id);
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        const newCount = usePendingQueueStore.getState().markRetry(next.id, msg);
        console.log(`[Queue] ✗ ${next.type} (${newCount}/${MAX_RETRIES}):`, msg);

        if (newCount >= MAX_RETRIES) {
          // Abandon définitif après MAX_RETRIES — on retire pour pas bloquer la queue
          usePendingQueueStore.getState().remove(next.id);
          try {
            const Toast = (await import('react-native-toast-message')).default;
            Toast.show({
              type: 'error',
              text1: 'Synchronisation impossible',
              text2: `Une action a été abandonnée après ${MAX_RETRIES} essais.`,
            });
          } catch {}
        } else {
          // On stoppe le drain : si erreur récurrente sur 1 action,
          // pas la peine de tenter les suivantes maintenant. Prochain trigger réessaiera.
          break;
        }
      }
    }
  } finally {
    isFlushing = false;
  }

  // Toast de confirmation positive si on a drainé au moins une action.
  // Évite le bruit : pas de toast si flush vide ou si tout a planté.
  if (drainedCount > 0) {
    try {
      const Toast = (await import('react-native-toast-message')).default;
      Toast.show({
        type: 'success',
        text1: 'Synchronisé',
        text2:
          drainedCount === 1
            ? 'Votre action hors ligne a été enregistrée.'
            : `${drainedCount} actions hors ligne ont été enregistrées.`,
        visibilityTime: 3000,
      });
    } catch {}

    // Re-fetch les listes pour reconcile avec l'état serveur — UNIQUEMENT si
    // la queue est entièrement vidée. Sinon on écraserait les optimistic states
    // des actions encore en attente (qui n'ont pas encore été push au serveur).
    const remaining = usePendingQueueStore.getState().actions.length;
    if (remaining === 0) {
      try {
        await useTasksStore.getState().initializeTasks();
      } catch {}
      try {
        await useCalendarStore.getState().initializeEvents();
      } catch {}
    }
  }
};

/**
 * Rejoue une action contre Supabase. Doit être idempotent (peut tourner plusieurs
 * fois pour la même action si retry).
 */
const executeAction = async (action: PendingAction): Promise<void> => {
  const supabase = getSupabase();

  switch (action.type) {
    // ─── TASK : updateStatus ───
    case 'task:updateStatus': {
      const { id, status, completedAt, completedBy } = action.params;
      const updateFields: Record<string, any> = {
        status,
        updatedAt: new Date().toISOString(),
      };
      if (status === 'completed' || status === 'validated') {
        updateFields.completedAt = completedAt ?? new Date().toISOString();
        updateFields.completedBy = completedBy ?? null;
      } else {
        updateFields.completedAt = null;
        updateFields.completedBy = null;
      }
      const { error } = await supabase.from('tasks').update(updateFields).eq('id', id);
      if (error) throw error;
      break;
    }

    // ─── TASK : addComment (idempotent : check si déjà présent) ───
    case 'task:addComment': {
      const { taskId, comment } = action.params;
      // Refetch la row pour la dernière version des comments (évite d'écraser
      // d'autres commentaires ajoutés en parallèle par d'autres users).
      const { data: latest, error: fetchErr } = await supabase
        .from('tasks')
        .select('comments')
        .eq('id', taskId)
        .single();
      if (fetchErr) throw fetchErr;

      const existingComments: any[] = latest?.comments ?? [];
      // Idempotent : si on a déjà push ce comment id, on ne re-add pas
      if (existingComments.some((c) => c.id === comment.id)) {
        return;
      }
      const merged = [...existingComments, comment];
      const { error } = await supabase
        .from('tasks')
        .update({ comments: merged, updatedAt: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      break;
    }

    // ─── TASK : toggleCommentReaction (last-write-wins sur le toggle) ───
    case 'task:toggleCommentReaction': {
      const { taskId, commentId, emoji, userId } = action.params;
      const { data: latest, error: fetchErr } = await supabase
        .from('tasks')
        .select('comments')
        .eq('id', taskId)
        .single();
      if (fetchErr) throw fetchErr;

      const comments: any[] = latest?.comments ?? [];
      const updated = comments.map((c) => {
        if (c.id !== commentId) return c;
        const reactions: Record<string, string[]> = { ...(c.reactions || {}) };
        const userIds: string[] = reactions[emoji] || [];
        if (userIds.includes(userId)) {
          const next = userIds.filter((uid) => uid !== userId);
          if (next.length === 0) delete reactions[emoji];
          else reactions[emoji] = next;
        } else {
          reactions[emoji] = [...userIds, userId];
        }
        return { ...c, reactions };
      });
      const { error } = await supabase
        .from('tasks')
        .update({ comments: updated, updatedAt: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      break;
    }

    // ─── EVENT : updateParticipantStatus (RSVP) ───
    case 'event:updateParticipantStatus': {
      const { eventId, userId, status } = action.params;
      const { data: latest, error: fetchErr } = await supabase
        .from('events')
        .select('participants')
        .eq('id', eventId)
        .single();
      if (fetchErr) throw fetchErr;

      const participants: any[] = latest?.participants ?? [];
      const now = new Date().toISOString();
      const exists = participants.some((p) => p.userId === userId);
      const updatedParticipants = exists
        ? participants.map((p) =>
            p.userId === userId ? { ...p, status, responseDate: now } : p
          )
        : [...participants, { userId, status, responseDate: now }];

      const { error } = await supabase
        .from('events')
        .update({ participants: updatedParticipants, updatedAt: now })
        .eq('id', eventId);
      if (error) throw error;
      break;
    }

    default: {
      // TS exhaustiveness — si un nouveau type est ajouté sans handler, ça crashe ici
      const exhaustive: never = action.type;
      throw new Error(`Unknown pending action type: ${exhaustive as string}`);
    }
  }
};

/** Force le flush — utile à appeler manuellement (ex. au retour foreground). */
export const triggerFlush = (): void => {
  flushPendingQueue().catch((err) => console.log('[Queue] flush error:', err));
};
