import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification } from '@/types/notification';
import { useAuthStore } from './auth-store';
import { useResourcesStore } from './resources-store';

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
  getUserNotifications: () => Notification[];
  toggleMessaging: (enabled: boolean) => void;
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
        return get().getUserNotifications().filter(notification => !notification.read).length;
      },
      
      getUserNotifications: () => {
        const currentUser = useAuthStore.getState().user;
        
        if (!currentUser) return [];
        
        // Get user subscriptions safely
        const userSubscriptions = useResourcesStore.getState().getUserSubscriptions(currentUser.id);
        
        return get().notifications.filter(notification => {
          // Check if notification targets user's role
          const targetsByRole = notification.targetRoles?.includes(currentUser.role) || false;
          
          // Check if notification targets user directly
          const targetsUserDirectly = notification.targetUserIds?.includes(currentUser.id) || false;
          
          // Check if user is subscribed to a category mentioned in the notification
          const isSubscribedToCategory = notification.categoryId && userSubscriptions.includes(notification.categoryId);
          
          // Admin sees all notifications
          const isAdmin = currentUser.role === 'admin';
          
          return isAdmin || targetsByRole || targetsUserDirectly || isSubscribedToCategory;
        });
      },
      
      toggleMessaging: (enabled) => {
        set({ isMessagingEnabled: enabled });
      }
    }),
    {
      name: 'mysteria-notifications-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);