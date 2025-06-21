import React, { useEffect, useState } from 'react';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { SplashScreen } from '@/components/SplashScreen';
import { Colors } from '@/constants/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
// Import the URL polyfill at the app root level
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
        // Initialize auth
        await initializeAuth();
        
        // Wait a bit to show splash screen
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
    
    // If user is not authenticated and not on login screen, redirect to login
    if (!isAuthenticated && !isLoginScreen) {
      // Check if there's a valid session first
      checkSession().then(hasSession => {
        if (hasSession) {
          // If there's a session but user is not authenticated, try to refresh
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
    
    // If user is authenticated and on login screen, redirect to home
    if (isAuthenticated && isLoginScreen) {
      router.replace('/');
    }
  }, [isAuthenticated, segments, isLoading]);
  
  // Show splash screen while loading
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
        />
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