import React, { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as SystemUI from 'expo-system-ui';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore, startTasksRealtimeSync, stopTasksRealtimeSync } from '@/store/tasks-store';
import { useCalendarStore } from '@/store/calendar-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useUsersStore } from '@/store/users-store';
import { SplashScreen } from '@/components/SplashScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { InAppNotificationToast } from '@/components/InAppNotificationToast';
import { Colors } from '@/constants/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import 'react-native-url-polyfill/auto';
import { registerPushToken } from '@/utils/push-notifications';
import { syncLocalReminders, setAppBadge } from '@/utils/local-notifications';
import { triggerFlush } from '@/utils/queue-worker';
import { onNetworkTransition, getIsOnline } from '@/components/OfflineBanner';
import { usePendingQueueStore } from '@/store/pending-queue-store';
import { subscribeToNotifications } from '@/utils/supabase';
import { useInAppToastStore } from '@/store/in-app-toast-store';
import { useResourcesStore } from '@/store/resources-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const { initializeAuth, user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  // Souscription réactive aux tâches + events pour resync les notifs locales
  // chaque fois que l'un des deux change (création, update, deadline modifiée…)
  const tasks = useTasksStore((state) => state.tasks);
  const events = useCalendarStore((state) => state.events);
  // Souscription réactive aux notifications pour mettre à jour le badge app
  const notifications = useNotificationsStore((state) => state.notifications);
  const getUnreadCount = useNotificationsStore((state) => state.getUnreadCount);
  const [isLoading, setIsLoading] = useState(true);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Sync du background natif avec le mode sombre pour éviter le flash blanc
  useEffect(() => {
    const bg = darkMode ? Colors.dark.background : Colors.light.background;
    SystemUI.setBackgroundColorAsync(bg).catch(() => {});
  }, [darkMode]);

  useEffect(() => {
    const initApp = async () => {
      try {
        // One-shot cleanup : la feature "Mémoriser identifiants" stockait
        // email + password en clair dans AsyncStorage (clé legacy). Elle a
        // été retirée au profit de l'auto-login via session Supabase. On
        // purge les anciens credentials résiduels chez les users existants.
        AsyncStorage.removeItem('mysteria-saved-credentials').catch(() => {});

        await initializeAuth();
        setTimeout(() => setIsLoading(false), 1000);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  // Register push token when a real user logs in (native only)
  useEffect(() => {
    if (user && user.id !== 'preview-user' && Platform.OS !== 'web') {
      registerPushToken(user.id);

      // Lazy-load expo-notifications listeners — native dev/prod builds only
      // Must NOT run in Expo Go (SDK 53+ removed remote notification support)
      const isExpoGo = (Constants as any).appOwnership === 'expo';
      if (!isExpoGo) {
        import('expo-notifications').then((Notifications) => {
          notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('[Push] Notification reçue:', notification.request.content.title);
          });
          responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('[Push] Notification tapée:', response.notification.request.content.data);
          });
        }).catch(() => {});
      }
    }

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?.id]);

  // Resync les notifs locales (rappels deadline tâches + 1h avant events)
  // chaque fois que les tâches ou events changent. Backup offline du serveur.
  useEffect(() => {
    if (!user?.id || user.id === 'preview-user') return;
    // Debounce 500ms : si plusieurs updates arrivent d'un coup (initial load
    // ou batch sync), on attend que ça se stabilise avant de tout reprogrammer.
    const timeoutId = setTimeout(() => {
      syncLocalReminders(tasks as any, events as any, user.id).catch((err) => {
        console.log('[LocalNotif] sync from layout error:', err);
      });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [user?.id, tasks, events]);

  // Update du badge sur l'icône de l'app à chaque changement des notifications.
  // Le badge reflète le nombre de notifs non lues pour l'user courant.
  useEffect(() => {
    if (!user?.id || user.id === 'preview-user') {
      setAppBadge(0).catch(() => {});
      return;
    }
    const unread = getUnreadCount();
    setAppBadge(unread).catch((err) => {
      console.log('[Badge] update from layout error:', err);
    });
  }, [user?.id, notifications, getUnreadCount]);

  // Souscription Realtime globale aux tâches : INSERT/UPDATE/DELETE sur la
  // table tasks → la liste se met à jour sans refresh quand un autre user
  // crée/modifie/supprime une tâche. Démarre au login, arrête au logout.
  useEffect(() => {
    if (!user?.id || user.id === 'preview-user') {
      stopTasksRealtimeSync();
      return;
    }
    startTasksRealtimeSync();
    return () => stopTasksRealtimeSync();
  }, [user?.id]);

  // Init du store users au login. Sans ça, TaskForm ouvert avant tout passage
  // sur /directory voit une liste vide → assignee picker vide (BUG-002 audit).
  useEffect(() => {
    if (!user?.id || user.id === 'preview-user') return;
    useUsersStore.getState().initializeUsers().catch((err) => {
      console.log('[Users] init from layout error:', err);
    });
  }, [user?.id]);

  // Toast in-app : subscribe aux INSERT realtime sur la table notifications.
  // Quand une nouvelle notif arrive et qu'elle est destinée à l'user courant,
  // on affiche un toast slide-down style WhatsApp en haut de l'écran.
  // Filtre identique à getUserNotifications() pour ne pas leak des notifs
  // destinées à d'autres users (sécurité de défense en profondeur, la RLS
  // côté Realtime devrait déjà les filtrer mais on double-check).
  useEffect(() => {
    if (!user?.id || user.id === 'preview-user') return;

    const unsub = subscribeToNotifications((notif) => {
      try {
        const currentUser = user;
        if (!currentUser) return;

        const targetUserIds = Array.isArray(notif.targetUserIds) ? notif.targetUserIds : [];
        const targetRoles = Array.isArray(notif.targetRoles) ? notif.targetRoles : [];
        const isAdmin = currentUser.role === 'admin';

        const hasExplicitTargets = targetUserIds.length > 0;
        // Si la notif cible des users précis : ne montrer que si l'user en fait partie.
        if (hasExplicitTargets && !targetUserIds.includes(currentUser.id)) return;

        if (!hasExplicitTargets) {
          const targetsByRole = targetRoles.includes(currentUser.role);
          const subscriptions = useResourcesStore.getState().getUserSubscriptions(currentUser.id);
          const isSubscribed = !!(notif.categoryId && subscriptions.includes(notif.categoryId));
          if (!isAdmin && !targetsByRole && !isSubscribed) return;
        }

        useInAppToastStore.getState().show(notif);
      } catch (err) {
        console.log('[Realtime] notifications filter error:', err);
      }
    });

    return () => unsub();
  }, [user?.id]);

  // Sync différée : drain la file d'actions offline.
  //  - Au retour online (transition)
  //  - Au démarrage de l'app (après que NetInfo ait settle), si la queue contient
  //    des actions de la session précédente
  useEffect(() => {
    if (!user?.id || user.id === 'preview-user') return;

    const unsub = onNetworkTransition((t) => {
      if (t === 'online') {
        console.log('[Queue] back online → triggering flush');
        triggerFlush();
      }
    });

    // Délai de 1.5s pour laisser le listener NetInfo de OfflineBanner
    // settle l'état réel (sinon on tente le flush avant de connaître l'état).
    const timeoutId = setTimeout(() => {
      const queueLen = usePendingQueueStore.getState().actions.length;
      if (queueLen > 0 && getIsOnline()) {
        console.log(`[Queue] startup: ${queueLen} pending action(s), flushing`);
        triggerFlush();
      }
    }, 1500);

    return () => {
      unsub();
      clearTimeout(timeoutId);
    };
  }, [user?.id]);
  
  if (isLoading) {
    return <SplashScreen />;
  }
  
  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: darkMode ? Colors.dark.background : Colors.light.background,
          },
          // Supprime le flash blanc lors des transitions entre écrans
          animation: Platform.OS === 'android' ? 'fade' : 'default',
        }}
      />
      {/* Banner "Hors ligne" — overlay au-dessus de tout, animation slide */}
      <OfflineBanner />
      {/* Toast in-app pop-up notifications (style WhatsApp) — au-dessus de tout */}
      <InAppNotificationToast />
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
