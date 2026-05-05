export interface EventParticipant {
  userId: string;
  status: 'confirmed' | 'declined' | 'pending';
  responseDate?: string;
  notificationSent?: boolean;
}

export type EventRecurrence = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  locationType?: 'visio' | 'onsite';
  color?: string;
  url?: string;
  fileUrl?: string;
  isPinned?: boolean;
  participants?: EventParticipant[];
  categoryId?: string; // Catégorie associée à l'événement
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** F4 : récurrence simple. Si défini, l'event a généré N instances suivantes. */
  recurrence?: EventRecurrence | null;
  /** F4 : ref vers l'event "mère" si cette row est une instance générée. */
  recurrenceParentId?: string | null;
}