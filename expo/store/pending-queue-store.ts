import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Types d'actions que la file d'attente peut différer.
 * Ajouter ici les nouveaux types au fur et à mesure qu'on les supporte.
 */
export type PendingActionType =
  | 'task:updateStatus'
  | 'task:addComment'
  | 'task:toggleCommentReaction'
  | 'event:updateParticipantStatus';

export interface PendingAction {
  id: string;
  type: PendingActionType;
  /** Paramètres opaques nécessaires pour rejouer l'action (taskId, status, etc.). */
  params: Record<string, any>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

interface QueueState {
  actions: PendingAction[];
}

interface QueueStore extends QueueState {
  /** Ajoute une action à la queue (FIFO). */
  enqueue: (action: Omit<PendingAction, 'id' | 'createdAt' | 'retryCount'>) => void;
  /** Retire une action (succès ou abandon définitif). */
  remove: (id: string) => void;
  /** Incrémente le retryCount + stocke l'erreur. Retourne le nouveau count. */
  markRetry: (id: string, error: string) => number;
  /** Reset complet (logout, etc.). */
  clearAll: () => void;
}

const generateId = () =>
  `pq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const usePendingQueueStore = create<QueueStore>()(
  persist(
    (set, get) => ({
      actions: [],

      enqueue: (action) => {
        const newAction: PendingAction = {
          ...action,
          id: generateId(),
          createdAt: new Date().toISOString(),
          retryCount: 0,
        };
        set((state) => ({ actions: [...state.actions, newAction] }));
        console.log('[Queue] enqueued', newAction.type, newAction.id);
      },

      remove: (id) => {
        set((state) => ({ actions: state.actions.filter((a) => a.id !== id) }));
      },

      markRetry: (id, error) => {
        let newCount = 0;
        set((state) => ({
          actions: state.actions.map((a) => {
            if (a.id !== id) return a;
            newCount = a.retryCount + 1;
            return { ...a, retryCount: newCount, lastError: error };
          }),
        }));
        return newCount;
      },

      clearAll: () => set({ actions: [] }),
    }),
    {
      name: 'mysteria-pending-queue-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ actions: state.actions }),
    }
  )
);
