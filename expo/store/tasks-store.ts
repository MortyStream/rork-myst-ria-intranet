import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskComment, TaskStatus, TaskPriority } from '@/types/task';
import { getSupabase } from '@/utils/supabase';
import { useNotificationsStore } from './notifications-store';
import { useAuthStore } from './auth-store';

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
        set(state => ({ tasks: [data, ...state.tasks] }));

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

        // Push vers Supabase en arrière-plan
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
        } catch (err) {
          // Rollback : on remet l'état d'avant
          console.error('updateTaskStatus failed, rolling back:', err);
          set({ tasks: previousTasks });
          // Toast non-bloquant (déjà présent dans Toast lib de l'app)
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
        const newComment: TaskComment = {
          id: `comment-${Date.now()}`,
          taskId,
          userId,
          content,
          createdAt: new Date().toISOString(),
        };
        const updatedComments = [...(task.comments || []), newComment];
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
