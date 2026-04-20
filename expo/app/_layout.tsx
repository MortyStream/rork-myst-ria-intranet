import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { SplashScreen } from '@/components/SplashScreen';
import { Colors } from '@/constants/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import 'react-native-url-polyfill/auto';

export default function RootLayout() {
  const { initializeAuth } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeAuth();
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsLoading(false);
      }
    };
    initApp();
  }, []);
  
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
        }}
      />
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
