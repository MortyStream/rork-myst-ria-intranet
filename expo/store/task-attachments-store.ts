import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskAttachment } from '@/types/task';
import { getSupabase } from '@/utils/supabase';

/**
 * Store des pièces jointes aux tâches (Feature F1, 2026-05-05).
 *
 * Gère le CRUD côté DB (table `task_attachments`) + upload storage
 * (bucket `task-attachments`). Les attachments sont chargés à la demande
 * (par taskId) plutôt que tous d'un coup, pour éviter de gonfler le store
 * quand la liste de tâches grandit.
 */

interface TaskAttachmentsState {
  /** Map taskId → liste de ses attachments (chargés à la demande). */
  byTaskId: Record<string, TaskAttachment[]>;
}

interface TaskAttachmentsStore extends TaskAttachmentsState {
  fetchForTask: (taskId: string) => Promise<TaskAttachment[]>;
  addLink: (taskId: string, name: string, url: string, uploadedBy: string) => Promise<TaskAttachment>;
  addUploaded: (
    taskId: string,
    type: 'file' | 'image',
    name: string,
    storagePath: string,
    mimeType: string,
    sizeBytes: number,
    uploadedBy: string
  ) => Promise<TaskAttachment>;
  deleteAttachment: (id: string) => Promise<void>;
  getForTask: (taskId: string) => TaskAttachment[];
}

export const useTaskAttachmentsStore = create<TaskAttachmentsStore>()(
  persist(
    (set, get) => ({
      byTaskId: {},

      fetchForTask: async (taskId) => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('task_attachments')
          .select('*')
          .eq('taskId', taskId)
          .order('createdAt', { ascending: false });
        if (error) {
          console.log('[task-attachments] fetch error:', error);
          return [];
        }
        const list = (data ?? []) as TaskAttachment[];
        set((state) => ({ byTaskId: { ...state.byTaskId, [taskId]: list } }));
        return list;
      },

      addLink: async (taskId, name, url, uploadedBy) => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('task_attachments')
          .insert({
            taskId,
            type: 'link',
            name: name.trim() || url,
            url,
            uploadedBy,
          })
          .select()
          .single();
        if (error) throw error;
        const inserted = data as TaskAttachment;
        set((state) => ({
          byTaskId: {
            ...state.byTaskId,
            [taskId]: [inserted, ...(state.byTaskId[taskId] ?? [])],
          },
        }));
        return inserted;
      },

      addUploaded: async (taskId, type, name, storagePath, mimeType, sizeBytes, uploadedBy) => {
        const supabase = getSupabase();
        const { data: urlData } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(storagePath);
        const url = urlData?.publicUrl ?? storagePath;

        const { data, error } = await supabase
          .from('task_attachments')
          .insert({
            taskId,
            type,
            name,
            url,
            mimeType,
            sizeBytes,
            uploadedBy,
          })
          .select()
          .single();
        if (error) throw error;
        const inserted = data as TaskAttachment;
        set((state) => ({
          byTaskId: {
            ...state.byTaskId,
            [taskId]: [inserted, ...(state.byTaskId[taskId] ?? [])],
          },
        }));
        return inserted;
      },

      deleteAttachment: async (id) => {
        const supabase = getSupabase();
        // Récupérer la row pour connaître le url + taskId avant delete
        const allLists = Object.entries(get().byTaskId);
        let foundTaskId: string | null = null;
        let foundAttachment: TaskAttachment | null = null;
        for (const [tid, list] of allLists) {
          const a = list.find((x) => x.id === id);
          if (a) {
            foundTaskId = tid;
            foundAttachment = a;
            break;
          }
        }

        const { error } = await supabase.from('task_attachments').delete().eq('id', id);
        if (error) throw error;

        // Best-effort cleanup du file dans le bucket si c'est un upload local.
        // Les liens externes n'ont rien à supprimer côté storage.
        if (foundAttachment && foundAttachment.type !== 'link') {
          try {
            // Le url contient le path : extraire après /storage/v1/object/public/task-attachments/
            const match = foundAttachment.url.match(/task-attachments\/(.+)$/);
            if (match?.[1]) {
              await supabase.storage.from('task-attachments').remove([match[1]]);
            }
          } catch (e) {
            console.log('[task-attachments] storage cleanup error (non-blocking):', e);
          }
        }

        if (foundTaskId) {
          set((state) => ({
            byTaskId: {
              ...state.byTaskId,
              [foundTaskId!]: (state.byTaskId[foundTaskId!] ?? []).filter((a) => a.id !== id),
            },
          }));
        }
      },

      getForTask: (taskId) => get().byTaskId[taskId] ?? [],
    }),
    {
      name: 'task-attachments-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ byTaskId: state.byTaskId }),
    }
  )
);
