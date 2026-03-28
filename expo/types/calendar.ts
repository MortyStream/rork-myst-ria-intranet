export interface EventParticipant {
  userId: string;
  status: 'confirmed' | 'declined' | 'pending';
  responseDate?: string;
  notificationSent?: boolean;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  color?: string;
  url?: string;
  fileUrl?: string;
  isPinned?: boolean;
  participants?: EventParticipant[];
  categoryId?: string; // Catégorie associée à l'événement
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}