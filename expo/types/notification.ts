export interface Notification {
  id: string;
  title: string;
  message: string;
  targetRoles: string[];
  targetUserIds?: string[];
  categoryId?: string;
  resourceItemId?: string;
  eventId?: string;   // ID de l'événement associé (deep link)
  taskId?: string;    // ID de la tâche associée (deep link)
  read: boolean;
  createdAt: string;
  updatedAt: string;
}