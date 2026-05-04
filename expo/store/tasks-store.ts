import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskComment, TaskStatus, TaskPriority } from '@/types/task';
import { getSupabase, subscribeToTasksList } from '@/utils/supabase';
import { useNotificationsStore } from './notifications-store';
import { useAuthStore } from './auth-store';
import { usePendingQueueStore } from './pending-queue-store';
import { getIsOnline } from '@/components/OfflineBanner';

// Module-scoped : tient le cleanup de la souscription Realtime globale
// (INSERT/UPDATE/DELETE sur la table tasks). Démarrée au login, arrêtée au logout.
let _tasksRealtimeUnsubscribe: (() => void) | null = null;

// Dedup window pour addComment : si même userId + même taskId + même contenu
// en moins de 2s, on drop silencieusement (anti spam-clic Send).
// Cas légitimes préservés : 2 users différents commentent simultanément, ou
// même user commente 2 textes différents rapidement.
const COMMENT_DEDUP_WINDOW_MS = 2000;
const _recentCommentKeys = new Map<string, number>();
const buildCommentDedupKey = (taskId: string, userId: string, content: string) =>
  `${taskId}:${userId}:${content.trim().slice(0, 200)}`;

/** Démarre la sync Realtime de la liste des tâches. Idempotent. */
export const startTasksRealtimeSync = () => {
  if (_tasksRealtimeUnsubscribe) return; // déjà actif
  _tasksRealtimeUnsubscribe = subscribeToTasksList({
    onInsert: (newTask) => {
      useTasksStore.setState((state) => {
        if (state.tasks.some((t) => t.id === newTask.id)) return state; // dédup
        return { tasks: [newTask, ...state.tasks] };
      });
    },
    onUpdate: (updatedTask) => {
      useTasksStore.setState((state) => ({
        tasks: state.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      }));
    },
    onDelete: (oldTask) => {
      useTasksStore.setState((state) => ({
        tasks: state.tasks.filter((t) => t.id !== oldTask.id),
      }));
    },
  });
};

/** Stoppe la sync Realtime (logout). Idempotent. */
export const stopTasksRealtimeSync = () => {
  if (_tasksRealtimeUnsubscribe) {
    _tasksRealtimeUnsubscribe();
    _tasksRealtimeUnsubscribe = null;
  }
};

const fetchTasksFromSupabase = async (): Promise<Task[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  remindersSent: Record<string, string>; // clé: "taskId-3d" | "taskId-1d", valeur: date "YYYY-MM-DD"
}

interface TasksStore extends TasksState {
  initializeTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'comments'>) => Promise<string>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  validateTask: (id: string, validatorId: string) => Promise<void>;
  addComment: (taskId: string, userId: string, content: string) => Promise<void>;
  deleteComment: (taskId: string, commentId: string) => Promise<void>;
  toggleCommentReaction: (taskId: string, commentId: string, emoji: string, userId: string) => Promise<void>;
  getTaskById: (id: string) => Task | undefined;
  getUserTasks: (userId: string) => Task[];
  getCategoryTasks: (categoryId: string) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByPriority: (priority: TaskPriority) => Task[];
  getOverdueTasks: () => Task[];
  getUpcomingDeadlines: (days: number) => Task[];
  sendTaskReminder: (taskId: string) => Promise<void>;
  checkAndSendTaskReminders: (userId: string) => void;
}

export const useTasksStore = create<TasksStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      isLoading: false,
      error: null,
      remindersSent: {},

      initializeTasks: async () => {
        set({ isLoading: true, error: null });
        // Retry x3 avec backoff pour absorber un éventuel délai de propagation
        // du JWT après login (sinon RLS rejette → liste vide).
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const tasks = await fetchTasksFromSupabase();
            set({ tasks, isLoading: false });
            return;
          } catch (error) {
            console.log(`Erreur chargement tâches (tentative ${attempt}):`, error);
            if (attempt < 3) {
              await new Promise<void>((r) => setTimeout(r, 200 * attempt));
            } else {
              set({ isLoading: false });
            }
          }
        }
      },

      addTask: async (taskData) => {
        const supabase = getSupabase();
        const now = new Date().toISOString();
        const newTask = {
          ...taskData,
          status: 'pending' as TaskStatus,
          comments: [],
          createdAt: now,
          updatedAt: now,
        };
        const { data, error } = await supabase
          .from('tasks')
          .insert(newTask)
          .select()
          .single();
        if (error) throw error;
        // Dédup vs Realtime onInsert : la souscription Realtime peut firer
        // AVANT que ce set() s'applique (la latence Realtime est parfois
        // inférieure au temps de retour de la promise insert+select). Sans
        // ce check, on se retrouve avec la tâche en double dans la liste
        // du créateur uniquement → React lève "Encountered two children
        // with the same key". Le subscriber a déjà sa propre dédup, on
        // ajoute la nôtre côté insert pour fermer les deux côtés de la race.
        set(state => ({
          tasks: state.tasks.some(t => t.id === data.id)
            ? state.tasks
            : [data, ...state.tasks],
        }));

        // Notifier chaque assigné (sauf le créateur)
        const assignedTo: string[] = taskData.assignedTo ?? [];
        const toNotify = assignedTo.filter(uid => uid !== taskData.assignedBy);
        if (toNotify.length > 0) {
          useNotificationsStore.getState().addNotification({
            title: '📋 Nouvelle tâche assignée',
            message: `"${taskData.title}" vous a été assignée.`,
            targetRoles: [],
            targetUserIds: toNotify,
            taskId: data.id,
          });
        }

        return data.id;
      },

      updateTask: async (id, taskData) => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('tasks')
          .update({ ...taskData, updatedAt: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        set(state => ({
          tasks: state.tasks.map(t => t.id === id ? data : t)
        }));
      },

      deleteTask: async (id) => {
        const supabase = getSupabase();
        // UI optimiste : on retire la tâche IMMÉDIATEMENT de la liste,
        // l'utilisateur voit l'animation de disparition direct
        const previousTasks = get().tasks;
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));

        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) {
          // Rollback : on remet la tâche dans la liste
          console.error('deleteTask failed, rolling back:', error);
          set({ tasks: previousTasks });
          try {
            const Toast = (await import('react-native-toast-message')).default;
            Toast.show({
              type: 'error',
              text1: 'Erreur',
              text2: 'La tâche n\'a pas pu être supprimée.',
            });
          } catch {}
          throw error;
        }
      },

      updateTaskStatus: async (id, status) => {
        const supabase = getSupabase();
        const now = new Date().toISOString();
        const currentUser = useAuthStore.getState().user;

        const isFinishing = status === 'completed' || status === 'validated';
        const updateFields: Record<string, any> = { status, updatedAt: now };
        if (isFinishing) {
          updateFields.completedAt = now;
          if (currentUser?.id) updateFields.completedBy = currentUser.id;
        } else {
          updateFields.completedAt = null;
          updateFields.completedBy = null;
        }

        // ── UI OPTIMISTE ──
        // Snapshot pour rollback si l'API échoue
        const previousTasks = get().tasks;

        // Update local IMMÉDIAT — l'utilisateur voit le check changer instantanément
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updateFields } : t
          ),
        }));

        // Hors ligne → on enqueue l'action et on garde l'optimistic state.
        // Le worker rejouera quand le réseau revient (cf. queue-worker.ts).
        if (!getIsOnline()) {
          usePendingQueueStore.getState().enqueue({
            type: 'task:updateStatus',
            params: {
              id,
              status,
              completedAt: updateFields.completedAt,
              completedBy: updateFields.completedBy,
            },
          });
          return;
        }

        // Online : push vers Supabase en arrière-plan
        try {
          const { data, error } = await supabase
            .from('tasks')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          // Reconcile avec la vraie row du serveur (peut avoir updatedAt légèrement différent)
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? data : t)),
          }));

          // Notifier le créateur de la tâche (assignedBy) quand un assigné
          // démarre ou termine. Pas de notif si :
          //  - l'actor est lui-même le créateur (pas de spam à soi-même)
          //  - le status n'est pas un événement "remarquable" (pending = retour
          //    arrière, validated = passe par validateTask qui a sa propre logique)
          //  - assignedBy est null/absent
          const taskData = data as Task;
          const assignedBy = taskData.assignedBy;
          const isNoteworthy = status === 'in_progress' || status === 'completed';
          if (
            isNoteworthy &&
            assignedBy &&
            currentUser?.id &&
            assignedBy !== currentUser.id
          ) {
            const actorName = currentUser.firstName ?? 'Quelqu\'un';
            const verb = status === 'in_progress' ? 'a démarré' : 'a terminé';
            const emoji = status === 'in_progress' ? '🚧' : '✅';
            useNotificationsStore.getState().addNotification({
              title: `${emoji} Tâche ${status === 'in_progress' ? 'démarrée' : 'terminée'}`,
              message: `${actorName} ${verb} : "${taskData.title}".`,
              targetRoles: [],
              targetUserIds: [assignedBy],
              taskId: id,
            });
          }
        } catch (err) {
          // Si on est passé offline pendant la requête → on enqueue, on garde optimistic
          if (!getIsOnline()) {
            usePendingQueueStore.getState().enqueue({
              type: 'task:updateStatus',
              params: {
                id,
                status,
                completedAt: updateFields.completedAt,
                completedBy: updateFields.completedBy,
              },
            });
            return;
          }
          // Rollback : on remet l'état d'avant (vraie erreur API/RLS)
          console.error('updateTaskStatus failed, rolling back:', err);
          set({ tasks: previousTasks });
          try {
            const Toast = (await import('react-native-toast-message')).default;
            Toast.show({
              type: 'error',
              text1: 'Erreur',
              text2: 'La modification n\'a pas été enregistrée. Réessayez.',
            });
          } catch {}
          throw err;
        }
      },

      validateTask: async (id, validatorId) => {
        const supabase = getSupabase();
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('tasks')
          .update({
            status: 'validated',
            validatedBy: validatorId,
            completedAt: now,
            completedBy: validatorId,
            updatedAt: now,
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        set(state => ({
          tasks: state.tasks.map(t => t.id === id ? data : t)
        }));
      },

      addComment: async (taskId, userId, content) => {
        const supabase = getSupabase();
        const task = get().getTaskById(taskId);
        if (!task) return;
        // Anti spam-clic : si on a vu exactement le même comment de ce user
        // sur cette task il y a moins de 2s, on drop. Évite d'avoir 5x le même
        // commentaire si le user tape sur Send compulsivement.
        const dedupKey = buildCommentDedupKey(taskId, userId, content);
        const lastTs = _recentCommentKeys.get(dedupKey);
        const dedupNow = Date.now();
        if (lastTs && dedupNow - lastTs < COMMENT_DEDUP_WINDOW_MS) {
          return;
        }
        _recentCommentKeys.set(dedupKey, dedupNow);
        // Cleanup léger du Map pour pas leak ad infinitum (garde max ~50 entrées récentes).
        if (_recentCommentKeys.size > 50) {
          const cutoff = dedupNow - COMMENT_DEDUP_WINDOW_MS * 5;
          for (const [k, t] of _recentCommentKeys) {
            if (t < cutoff) _recentCommentKeys.delete(k);
          }
        }
        // UUID v4 : zero collision même avec 2 users qui commentent à la même
        // milliseconde. Avant : Date.now()+Math.random(36) → probabilité non
        // nulle de collision sur le jsonb (le worker idempotency vérifie déjà
        // par id, donc une collision aurait causé un drop silencieux).
        const newComment: TaskComment = {
          id: uuidv4(),
          taskId,
          userId,
          content,
          createdAt: new Date().toISOString(),
        };
        const updatedComments = [...(task.comments || []), newComment];
        const now = new Date().toISOString();

        // ── UI OPTIMISTE ── (pas avant car le caller `handleSubmitComment`
        // attendait la résolution avant de clear le champ — maintenant tout est instant)
        const previousTasks = get().tasks;
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, comments: updatedComments, updatedAt: now } : t
          ),
        }));

        // Hors ligne → enqueue (worker rejoue avec idempotence sur comment.id)
        if (!getIsOnline()) {
          usePendingQueueStore.getState().enqueue({
            type: 'task:addComment',
            params: { taskId, comment: newComment },
          });
          return;
        }

        try {
          const { data, error } = await supabase
            .from('tasks')
            .update({ comments: updatedComments, updatedAt: now })
            .eq('id', taskId)
            .select()
            .single();
          if (error) throw error;
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === taskId ? data : t)),
          }));
        } catch (err) {
          if (!getIsOnline()) {
            usePendingQueueStore.getState().enqueue({
              type: 'task:addComment',
              params: { taskId, comment: newComment },
            });
            return;
          }
          console.error('addComment failed, rolling back:', err);
          set({ tasks: previousTasks });
          try {
            const Toast = (await import('react-native-toast-message')).default;
            Toast.show({
              type: 'error',
              text1: 'Erreur',
              text2: 'Le commentaire n\'a pas été enregistré.',
            });
          } catch {}
          throw err;
        }
      },

      deleteComment: async (taskId, commentId) => {
        const supabase = getSupabase();
        const task = get().getTaskById(taskId);
        if (!task) return;
        const updatedComments = (task.comments || []).filter(c => c.id !== commentId);
        const { data, error } = await supabase
          .from('tasks')
          .update({ comments: updatedComments, updatedAt: new Date().toISOString() })
          .eq('id', taskId)
          .select()
          .single();
        if (error) throw error;
        set(state => ({
          tasks: state.tasks.map(t => t.id === taskId ? data : t)
        }));
      },

      toggleCommentReaction: async (taskId, commentId, emoji, userId) => {
        const supabase = getSupabase();
        const task = get().getTaskById(taskId);
        if (!task) return;

        // ── UI OPTIMISTE (préservée pour la fluidité) ──
        // Calcule localement la nouvelle structure pour update immédiat.
        const optimisticComments = (task.comments || []).map((c: any) => {
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

        const previousTasks = get().tasks;
        const optimisticNow = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, comments: optimisticComments, updatedAt: optimisticNow } : t
          ),
        }));

        // Hors ligne → enqueue. Le worker rejouera le toggle contre l'état serveur.
        if (!getIsOnline()) {
          usePendingQueueStore.getState().enqueue({
            type: 'task:toggleCommentReaction',
            params: { taskId, commentId, emoji, userId },
          });
          return;
        }

        // ── PERSISTANCE ATOMIQUE via RPC ──
        // Avant : UPDATE direct du jsonb full-replace → 2 users simultanés
        // → last-write-wins → une réaction perdue (cf. audit V2).
        // Maintenant : RPC toggle_comment_reaction qui SELECT FOR UPDATE
        // → toggles sérialisés côté DB → aucune perte.
        try {
          const { data, error } = await supabase.rpc('toggle_comment_reaction', {
            p_task_id: taskId,
            p_comment_id: commentId,
            p_emoji: emoji,
            p_user_id: userId,
          });
          if (error) throw error;
          // La RPC retourne la row complète (RETURNS public.tasks).
          // Reconcilie le state local avec la version serveur autoritaire.
          if (data) {
            set((state) => ({
              tasks: state.tasks.map((t) => (t.id === taskId ? data : t)),
            }));
          }
        } catch (err) {
          if (!getIsOnline()) {
            usePendingQueueStore.getState().enqueue({
              type: 'task:toggleCommentReaction',
              params: { taskId, commentId, emoji, userId },
            });
            return;
          }
          console.error('toggleCommentReaction failed, rolling back:', err);
          set({ tasks: previousTasks });
          try {
            const Toast = (await import('react-native-toast-message')).default;
            Toast.show({
              type: 'error',
              text1: 'Erreur',
              text2: 'Réaction non enregistrée. Réessayez.',
            });
          } catch {}
        }
      },

      getTaskById: (id) => get().tasks.find(t => t.id === id),

      getUserTasks: (userId) => get().tasks.filter(t =>
        t.assignedTo.includes(userId) || t.assignedBy === userId
      ),

      getCategoryTasks: (categoryId) => get().tasks.filter(t => t.categoryId === categoryId),

      getTasksByStatus: (status) => get().tasks.filter(t => t.status === status),

      getTasksByPriority: (priority) => get().tasks.filter(t => t.priority === priority),

      getOverdueTasks: () => {
        const now = new Date();
        return get().tasks.filter(t =>
          t.deadline &&
          new Date(t.deadline) < now &&
          t.status !== 'completed' &&
          t.status !== 'validated'
        );
      },

      getUpcomingDeadlines: (days) => {
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        return get().tasks.filter(t =>
          t.deadline &&
          new Date(t.deadline) > now &&
          new Date(t.deadline) < future &&
          t.status !== 'completed' &&
          t.status !== 'validated'
        );
      },

      sendTaskReminder: async (taskId) => {
        const task = get().getTaskById(taskId);
        if (!task || !task.assignedTo.length) return;

        let tempsRestant = 'bientôt';
        if (task.deadline) {
          const diffMs = new Date(task.deadline).getTime() - Date.now();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays > 1) tempsRestant = `${diffDays} jours`;
          else if (diffDays === 1) tempsRestant = '24 heures';
          else tempsRestant = 'moins de 24 heures';
        }

        useNotificationsStore.getState().addNotification({
          title: '⏰ Rappel de tâche',
          message: `Attention, il reste ${tempsRestant} pour terminer "${task.title}" !`,
          targetRoles: [],
          targetUserIds: task.assignedTo,
          taskId: task.id,
        });
      },

      // No-op : les rappels de tâches sont désormais gérés côté serveur par
      // l'Edge Function `scheduled-reminders` qui tourne toutes les 15 min via
      // pg_cron (Supabase). Garder une logique locale en parallèle créerait
      // des doublons et un comportement incohérent entre devices.
      // On garde la signature pour compat avec les appelants existants.
      checkAndSendTaskReminders: (_userId) => {
        return;
      },
    }),
    {
      name: 'tasks-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ tasks: state.tasks, remindersSent: state.remindersSent }),
    }
  )
);
