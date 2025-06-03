import React, { useEffect, useState } from 'react';
import { Slot, Stack, Tabs, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { SplashScreen } from '@/components/SplashScreen';
import { Colors } from '@/constants/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import 'react-native-url-polyfill/auto';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, user, initializeAuth, checkSession, refreshSession } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize auth on app start
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
  
  // Handle auth state changes and routing
  useEffect(() => {
    if (isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const isLoginScreen = segments[0] === 'login' || segments[0] === 'forgot-password';
    
    if (!isAuthenticated && !isLoginScreen) {
      checkSession().then(hasSession => {
        if (hasSession) {
          refreshSession().then(refreshed => {
            if (!refreshed) {
              router.replace('/login');
            }
          });
        } else {
          router.replace('/login');
        }
      });
    }
    
    if (isAuthenticated && isLoginScreen) {
      router.replace('/home');
    }
  }, [isAuthenticated, segments, isLoading]);
  
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <View style={[styles.container, { backgroundColor: darkMode ? Colors.dark.background : Colors.light.background }]}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: darkMode ? Colors.dark.background : Colors.light.background,
            },
          }}
        >
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="directory" options={{ headerShown: false }} />
          <Stack.Screen name="resources" options={{ headerShown: false }} />
          <Stack.Screen name="calendar" options={{ headerShown: false }} />
          <Stack.Screen name="tasks" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="resources/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        </Stack>
      </View>
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});