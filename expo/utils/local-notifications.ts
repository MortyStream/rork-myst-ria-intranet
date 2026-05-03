import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Notifications locales programmées sur le device de l'utilisateur.
 *
 * Pourquoi en plus du serveur ?
 * - Le scheduled-reminders côté Supabase tourne toutes les 15 min mais nécessite
 *   que le user ait Internet pour recevoir le push. Si Kévin est dans le métro
 *   sans data, il rate son rappel.
 * - Les local notifications sont programmées dans le système iOS/Android et
 *   sonnent même offline, même app fermée.
 * - Les deux systèmes sont déduplifiés via la `data.type` pour qu'on n'ait pas
 *   2 alertes pour la même tâche/event.
 *
 * Important : ce module ne peut s'exécuter que sur native (pas web, pas Expo Go SDK 53+).
 * On no-op gracieusement si non supporté.
 */

const isExpoGo = Constants.appOwnership === 'expo';
const isSupported = Platform.OS !== 'web' && !isExpoGo;

// Lazy require — pareil que push-notifications.ts pour éviter le crash Expo Go.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Notifications: any = isSupported ? require('expo-notifications') : null;

// Sous-typage local : on ne consomme qu'une partie des champs des types
// complets `Task` / `Event`. On accepte `undefined` partout où le type
// canonique met `optional` (?), pour éviter d'avoir à caster les arrays
// venus du store côté caller (cf. _layout.tsx:syncLocalReminders).
interface Task {
  id: string;
  title: string;
  deadline?: string | null;
  status: string;
  assignedTo: string[];
}

interface Event {
  id: string;
  title: string;
  startTime: string;
  participants?: { userId: string; status: string }[] | null;
}

const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
const REMINDER_1H_MS = 60 * 60 * 1000;

/**
 * Programme les rappels locaux pour une tâche assignée à l'user courant.
 * Programme jusqu'à 2 notifs : 24h avant et 1h avant la deadline.
 */
async function scheduleTaskReminders(task: Task, currentUserId: string): Promise<void> {
  if (!isSupported || !Notifications) return;
  if (!task.deadline) return;
  if (!task.assignedTo.includes(currentUserId)) return;
  if (task.status === 'completed' || task.status === 'validated') return;

  const deadlineMs = new Date(task.deadline).getTime();
  const now = Date.now();

  // 24h avant
  const reminder24h = deadlineMs - REMINDER_24H_MS;
  if (reminder24h > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Rappel : deadline dans 24h',
        body: `Il te reste 24h pour terminer « ${task.title} ».`,
        sound: 'default',
        data: { type: 'task_reminder_24h', taskId: task.id },
      },
      trigger: { date: new Date(reminder24h) },
    });
  }

  // 1h avant
  const reminder1h = deadlineMs - REMINDER_1H_MS;
  if (reminder1h > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Deadline dans 1h !',
        body: `Plus qu'1h pour finir « ${task.title} » !`,
        sound: 'default',
        data: { type: 'task_reminder_1h', taskId: task.id },
      },
      trigger: { date: new Date(reminder1h) },
    });
  }
}

/**
 * Programme le rappel local pour un event où l'user est participant non-décliné.
 */
async function scheduleEventReminder(event: Event, currentUserId: string): Promise<void> {
  if (!isSupported || !Notifications) return;

  const participant = (event.participants ?? []).find((p) => p.userId === currentUserId);
  if (!participant || participant.status === 'declined') return;

  const startMs = new Date(event.startTime).getTime();
  const now = Date.now();
  const reminder1h = startMs - REMINDER_1H_MS;

  if (reminder1h > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Rappel : événement dans 1h',
        body: `« ${event.title} » commence dans 1h.`,
        sound: 'default',
        data: { type: 'event_reminder_1h', eventId: event.id },
      },
      trigger: { date: new Date(reminder1h) },
    });
  }
}

/**
 * Annule toutes les notifs locales liées à un type spécifique
 * (utile au logout ou quand on resync tout).
 */
async function cancelAllLocalReminders(): Promise<void> {
  if (!isSupported || !Notifications) return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of all) {
      const type = notif?.content?.data?.type;
      if (
        type === 'task_reminder_24h' ||
        type === 'task_reminder_1h' ||
        type === 'event_reminder_1h'
      ) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (err) {
    console.log('[LocalNotif] cancelAll error:', err);
  }
}

/**
 * Resync complet : annule toutes les anciennes notifs locales puis re-planifie
 * tout selon l'état actuel des tâches/events de l'user courant.
 *
 * À appeler :
 * - Au démarrage de l'app (après le chargement des stores)
 * - Après chaque create/update/delete de tâche ou event où l'user est concerné
 * - Quand l'user change (login)
 */
export async function syncLocalReminders(
  tasks: Task[],
  events: Event[],
  currentUserId: string
): Promise<void> {
  if (!isSupported || !Notifications) {
    return;
  }
  if (!currentUserId || currentUserId === 'preview-user') return;

  try {
    // 1. Vérifier la permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      // On ne demande pas la permission ici (elle est déjà demandée au login
      // via registerPushToken). Si refusée, on no-op silencieusement.
      return;
    }

    // 2. Annuler tous les anciens reminders pour repartir de zéro
    await cancelAllLocalReminders();

    // 3. Programmer les nouveaux pour les tâches assignées à l'user
    for (const task of tasks) {
      await scheduleTaskReminders(task, currentUserId);
    }

    // 4. Programmer les nouveaux pour les events où l'user est invité non-décliné
    for (const event of events) {
      await scheduleEventReminder(event, currentUserId);
    }

    console.log(`[LocalNotif] Synced reminders for ${tasks.length} tasks + ${events.length} events`);
  } catch (err) {
    console.log('[LocalNotif] sync error:', err);
  }
}

/**
 * Au logout : nettoyer toutes les notifs locales pour ne pas qu'un nouvel user
 * sur le même device reçoive les rappels de l'ancien.
 */
export async function clearAllLocalReminders(): Promise<void> {
  await cancelAllLocalReminders();
}

// ─── BADGE SUR L'ICÔNE DE L'APP ─────────────────────────────────────────────

/**
 * Met à jour le badge sur l'icône de l'app (rond rouge avec chiffre).
 * - iOS : 100% supporté avec permission notif
 * - Android : dépend du launcher (Samsung One UI, Pixel, MIUI… la plupart OK)
 *
 * Appel répété no-op si la valeur ne change pas (Apple gère le diff).
 */
export async function setAppBadge(count: number): Promise<void> {
  if (!isSupported || !Notifications) return;
  try {
    const safeCount = Math.max(0, Math.floor(count || 0));
    await Notifications.setBadgeCountAsync(safeCount);
  } catch (err) {
    console.log('[Badge] setAppBadge error:', err);
  }
}

/**
 * Retire le badge (passe à 0). À appeler au logout pour ne pas laisser un chiffre
 * persistant alors que l'app est déconnectée.
 */
export async function clearAppBadge(): Promise<void> {
  await setAppBadge(0);
}
