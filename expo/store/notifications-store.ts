import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification } from '@/types/notification';
import { useAuthStore } from './auth-store';
import { useResourcesStore } from './resources-store';
import { getSupabase } from '@/utils/supabase';
import { sendPushNotifications } from '@/utils/push-notifications';

interface NotificationsState {
  notifications: Notification[];
  isMessagingEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

interface NotificationsStore extends NotificationsState {
  initializeNotifications: () => Promise<void>;
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
      isMessagingEnabled: true,
      isLoading: false,
      error: null,

      initializeNotifications: async () => {
        const supabase = getSupabase();
        // Retry x3 avec backoff pour absorber le timing JWT post-login
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const { data, error } = await supabase
              .from('notifications')
              .select('*')
              .order('createdAt', { ascending: false });
            if (error) throw error;
            if (!data || data.length === 0) return;
            set(state => {
              const localReadMap = new Map(state.notifications.map(n => [n.id, n.read]));
              const merged = data.map((n: Notification) => ({
                ...n,
                read: localReadMap.get(n.id) ?? false,
              }));
              return { notifications: merged };
            });
            return;
          } catch (error) {
            console.log(`Erreur chargement notifications (tentative ${attempt}):`, error);
            if (attempt < 3) {
              await new Promise<void>((r) => setTimeout(r, 200 * attempt));
            }
          }
        }
      },

      addNotification: (notificationData) => {
        const newNotification: Notification = {
          ...notificationData,
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({
          notifications: [newNotification, ...state.notifications],
        }));

        // Persist to Supabase
        getSupabase()
          .from('notifications')
          .insert(newNotification)
          .then(({ error }) => {
            if (error) console.log('Erreur sync notification Supabase:', error);
          });

        // Send device push notification to targeted users
        const targetIds = notificationData.targetUserIds ?? [];
        if (targetIds.length > 0) {
          sendPushNotifications(
            targetIds,
            notificationData.title,
            notificationData.message
          );
        }
      },
      
      markAsRead: (id) => {
        const now = new Date().toISOString();
        set(state => ({
          notifications: state.notifications.map(notification =>
            notification.id === id
              ? { ...notification, read: true, updatedAt: now }
              : notification
          )
        }));
        getSupabase()
          .from('notifications')
          .update({ read: true, updatedAt: now })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.log('Erreur markAsRead Supabase:', error);
          });
      },

      markAllAsRead: () => {
        const now = new Date().toISOString();
        const ids = get().notifications.filter(n => !n.read).map(n => n.id);
        set(state => ({
          notifications: state.notifications.map(notification => ({
            ...notification,
            read: true,
            updatedAt: now,
          }))
        }));
        if (ids.length > 0) {
          getSupabase()
            .from('notifications')
            .update({ read: true, updatedAt: now })
            .in('id', ids)
            .then(({ error }) => {
              if (error) console.log('Erreur markAllAsRead Supabase:', error);
            });
        }
      },
      
      deleteNotification: (id) => {
        set(state => ({
          notifications: state.notifications.filter(notification => notification.id !== id),
        }));
        getSupabase()
          .from('notifications')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.log('Erreur suppression notification Supabase:', error);
          });
      },
      
      getUnreadCount: () => {
        return get().getUserNotifications().filter(notification => !notification.read).length;
      },
      
      getUserNotifications: () => {
        const currentUser = useAuthStore.getState().user;

        if (!currentUser) return [];

        const userSubscriptions = useResourcesStore.getState().getUserSubscriptions(currentUser.id);
        const isAdmin = currentUser.role === 'admin';

        return get().notifications.filter(notification => {
          const hasExplicitTargets =
            notification.targetUserIds && notification.targetUserIds.length > 0;

          // Si la notif cible des utilisateurs précis, seuls eux la voient —
          // même un admin ne doit pas voir une notif destinée à quelqu'un d'autre.
          if (hasExplicitTargets) {
            return notification.targetUserIds!.includes(currentUser.id);
          }

          // Notif sans ciblage individuel : vérifier rôle, abonnement, ou admin.
          const targetsByRole =
            notification.targetRoles?.includes(currentUser.role) || false;
          const isSubscribedToCategory =
            !!(notification.categoryId &&
              userSubscriptions.includes(notification.categoryId));

          return isAdmin || targetsByRole || isSubscribedToCategory;
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