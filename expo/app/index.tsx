import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();
  const { initializeUsers } = useUsersStore();

  useEffect(() => {
    if (isAuthenticated && user?.supabaseUserId) {
      initializeUsers();
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user?.supabaseUserId) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/home" />;
}
