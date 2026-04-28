import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();
  const { initializeUsers } = useUsersStore();
  const { hasSeenOnboarding } = useSettingsStore();

  useEffect(() => {
    if (isAuthenticated && user?.supabaseUserId) {
      initializeUsers();
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user?.supabaseUserId) {
    return <Redirect href="/login" />;
  }

  // Premier launch après login : onboarding 3 écrans
  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/home" />;
}
