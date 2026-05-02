import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
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
  markAsUnread: (id: string) => void;
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
            // IMPORTANT : toujours réécrire le store, même si data est vide.
            // Avant : `if (!data || data.length === 0) return;` qui gardait
            // le cache local intact → les notifs supprimées en DB restaient
            // fantômes en local indéfiniment, divergence DB ↔ UI.
            const rows = data ?? [];
            set(state => {
              const localReadMap = new Map(state.notifications.map(n => [n.id, n.read]));
              const merged = rows.map((n: Notification) => ({
                ...n,
                read: localReadMap.get(n.id) ?? n.read,
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
        // 🚨 BUG CRITIQUE résolu : avant on générait un id type
        // `notification-${Date.now()}-${Math.random()...}` (string non-UUID).
        // La colonne `notifications.id` est UUID NOT NULL → l'INSERT échouait
        // silencieusement (juste un console.log) → toutes les notifs créées
        // côté front (tâche assignée, invitation event, item Bible, etc.)
        // restaient en local sur le device du créateur, jamais en DB →
        // les autres users ne voyaient rien, le toast in-app ne fire pas,
        // l'onglet notifications restait vide. Fix : uuid v4 cohérent
        // avec le type uuid de la colonne.
        const newNotification: Notification = {
          ...notificationData,
          id: uuidv4(),
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
        // Idempotence client : si déjà read, no-op. Évite les UPDATE redondants
        // sur tap-tap-tap rapide (un déclenche, le 2e/3e seraient gaspillés).
        const current = get().notifications.find(n => n.id === id);
        if (!current || current.read) return;

        // UI optimiste : update local d'abord, avec rollback sur erreur.
        const previous = get().notifications;
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
            if (error) {
              console.log('Erreur markAsRead Supabase, rollback:', error);
              set({ notifications: previous });
            }
          });
      },

      markAsUnread: (id) => {
        // Symétrique de markAsRead : optimistic + rollback. Permet à l'user
        // de re-marquer une notif comme non-lue (cas "j'ai cliqué par erreur,
        // je veux pas la traiter maintenant").
        const previous = get().notifications;
        const now = new Date().toISOString();
        set(state => ({
          notifications: state.notifications.map(notification =>
            notification.id === id
              ? { ...notification, read: false, updatedAt: now }
              : notification
          )
        }));
        getSupabase()
          .from('notifications')
          .update({ read: false, updatedAt: now })
          .eq('id', id)
          .then(({ error }) => {
            if (error) {
              console.log('Erreur markAsUnread Supabase, rollback:', error);
              set({ notifications: previous });
            }
          });
      },

      markAllAsRead: () => {
        // Capture uniquement les IDs qu'on touche RÉELLEMENT (les non-lues à T0).
        // Avant : on snapshot tout l'array et au rollback on l'écrasait, ce qui
        // annulait aussi les markAsRead intermédiaires faits par l'user ou un
        // autre device (Realtime) entre l'optimistic et la réponse serveur.
        const now = new Date().toISOString();
        const idsToMark = get().notifications.filter(n => !n.read).map(n => n.id);
        if (idsToMark.length === 0) return;

        set(state => ({
          notifications: state.notifications.map(notification =>
            idsToMark.includes(notification.id)
              ? { ...notification, read: true, updatedAt: now }
              : notification
          )
        }));

        getSupabase()
          .from('notifications')
          .update({ read: true, updatedAt: now })
          .in('id', idsToMark)
          .then(({ error }) => {
            if (error) {
              console.log('Erreur markAllAsRead Supabase, rollback ciblé:', error);
              // Rollback ciblé : on remet read=false UNIQUEMENT sur les IDs
              // qu'on avait touchés. Les autres notifs (lues entre-temps par
              // un autre device, ou ajoutées) ne sont pas affectées.
              set(state => ({
                notifications: state.notifications.map(notification =>
                  idsToMark.includes(notification.id)
                    ? { ...notification, read: false }
                    : notification
                )
              }));
            }
          });
      },

      deleteNotification: (id) => {
        const previous = get().notifications;
        set(state => ({
          notifications: state.notifications.filter(notification => notification.id !== id),
        }));
        getSupabase()
          .from('notifications')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) {
              console.log('Erreur suppression notification Supabase, rollback:', error);
              set({ notifications: previous });
              import('react-native-toast-message').then((module) => {
                module.default.show({
                  type: 'error',
                  text1: 'Erreur',
                  text2: 'La notification n\'a pas pu être supprimée.',
                });
              });
            }
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