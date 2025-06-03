import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification } from '@/types/notification';

interface NotificationsState {
  notifications: Notification[];
  isMessagingEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

interface NotificationsStore extends NotificationsState {
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt' | 'updatedAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  getUnreadCount: () => number;
  getUserNotifications: (userId: string) => Notification[];
  toggleMessaging: (enabled: boolean) => void;
  initializeNotifications: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      isMessagingEnabled: false,
      isLoading: false,
      error: null,
      
      addNotification: (notificationData) => {
        const newNotification: Notification = {
          ...notificationData,
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set(state => ({
          notifications: [newNotification, ...state.notifications]
        }));
      },
      
      markAsRead: (id) => {
        set(state => ({
          notifications: state.notifications.map(notification => 
            notification.id === id 
              ? { 
                  ...notification, 
                  read: true,
                  updatedAt: new Date().toISOString() 
                } 
              : notification
          )
        }));
      },
      
      markAllAsRead: () => {
        set(state => ({
          notifications: state.notifications.map(notification => ({
            ...notification,
            read: true,
            updatedAt: new Date().toISOString()
          }))
        }));
      },
      
      deleteNotification: (id) => {
        set(state => ({
          notifications: state.notifications.filter(notification => notification.id !== id)
        }));
      },
      
      getUnreadCount: () => {
        return get().notifications.filter(notification => !notification.read).length;
      },
      
      getUserNotifications: (userId) => {
        const { notifications } = get();
        
        // Import the resources store dynamically to avoid circular dependency
        const { useResourcesStore } = require('./resources-store');
        
        try {
          const userSubscriptions = useResourcesStore.getState().getUserSubscriptions(userId);
          
          return notifications.filter(notification => {
            // Check if notification targets user directly
            const targetsUserDirectly = notification.targetUserIds?.includes(userId) || false;
            
            // Check if user is subscribed to a category mentioned in the notification
            const isSubscribedToCategory = notification.categoryId && userSubscriptions.includes(notification.categoryId);
            
            // For now, show all notifications to all users (can be refined later)
            return true;
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (error) {
          console.error('Error getting user subscriptions:', error);
          // Fallback: return all notifications for the user
          return notifications.filter(notification => {
            return notification.targetUserIds?.includes(userId) || true;
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      },
      
      toggleMessaging: (enabled) => {
        set({ isMessagingEnabled: enabled });
      },

      initializeNotifications: async () => {
        set({ isLoading: true, error: null });
        try {
          // Mock notifications for demo
          const mockNotifications: Notification[] = [
            {
              id: '1',
              title: 'Nouvelle tâche assignée',
              message: 'Une nouvelle tâche vous a été assignée: "Préparer la présentation"',
              type: 'task',
              read: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              targetUserIds: [],
            },
            {
              id: '2',
              title: 'Réunion prévue',
              message: 'Réunion d\'équipe prévue demain à 14h00',
              type: 'calendar',
              read: false,
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              updatedAt: new Date(Date.now() - 3600000).toISOString(),
              targetUserIds: [],
            },
          ];
          
          // Only add mock notifications if store is empty
          const { notifications } = get();
          if (notifications.length === 0) {
            set({ notifications: mockNotifications });
          }
        } catch (error) {
          console.error('Error initializing notifications:', error);
          set({ error: 'Erreur lors du chargement des notifications' });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'mysteria-notifications-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);