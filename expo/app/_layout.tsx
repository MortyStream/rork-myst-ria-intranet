import React, { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as SystemUI from 'expo-system-ui';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { SplashScreen } from '@/components/SplashScreen';
import { Colors } from '@/constants/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import 'react-native-url-polyfill/auto';
import { registerPushToken } from '@/utils/push-notifications';

export default function RootLayout() {
  const { initializeAuth, user } = useAuthStore();
  const { darkMode } = useSettingsStore();
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
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
