export interface Notification {
  id: string;
  title: string;
  message: string;
  targetRoles: string[];
  targetUserIds?: string[];
  categoryId?: string;
  resourceItemId?: string;
  eventId?: string; // ID de l'événement associé
  read: boolean;
  createdAt: string;
  updatedAt: string;
}