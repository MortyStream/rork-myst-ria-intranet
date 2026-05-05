// Types liés aux tâches. Ce fichier était corrompu (contenait une vieille
// copie de app/tasks.tsx) — TypeScript résolvait silencieusement les imports
// `import { Task } from '@/types/task'` en `any`. Reconstruit à partir du
// schéma DB `public.tasks` et des usages dans tasks-store.ts.

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'validated';
export type TaskPriority = 'low' | 'medium' | 'high';

/**
 * Statut d'approval (Vague C, 2026-05-05) — workflow validation cross-secteur.
 *
 *  - 'approved' (default) : tâche visible normalement par les assignés. Couvre
 *    les cas same-secteur, autorité (admin/RP/RS), tâches existantes pré-Vague C.
 *  - 'pending_approval' : un membre cross-secteur a créé une tâche, le RS du
 *    secteur de l'assignée doit valider avant que celui-ci la voie.
 *  - 'rejected' : le RS a refusé, la tâche est annulée (rejectionReason peut
 *    être consulté par le créateur).
 */
export type TaskApprovalStatus = 'pending_approval' | 'approved' | 'rejected';

export interface TaskCommentReactions {
  // Map emoji ('👍', '❤️', '🙏', '😂') → liste des userIds qui ont réagi.
  // Stocké en jsonb dans la row tasks.comments[i].reactions.
  [emoji: string]: string[];
}

export interface TaskComment {
  id: string;
  taskId?: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  reactions?: TaskCommentReactions;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  /** UUID d'une catégorie (resources.categories) ou null si tâche sans catégorie. */
  categoryId?: string | null;
  /** UUIDs internal users.id (pas auth.uid). Stocké en jsonb. */
  assignedTo: string[];
  /** UUID internal users.id du créateur. */
  assignedBy?: string | null;
  /** ISO timestamp ou null si pas de deadline. */
  deadline?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  /** Si true, le complete par l'assigné met la tâche en attente de validation par le créateur/admin. */
  needsValidation?: boolean | null;
  validatedBy?: string | null;
  /** Commentaires en jsonb dans la row (pas de table dédiée). */
  comments?: TaskComment[] | null;
  completedAt?: string | null;
  completedBy?: string | null;
  /** Géré par l'Edge Function scheduled-reminders. Null si rappel pas encore envoyé. */
  reminder24hSentAt?: string | null;
  reminder1hSentAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Vague C : workflow validation cross-secteur. Default 'approved'. */
  approvalStatus?: TaskApprovalStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}
