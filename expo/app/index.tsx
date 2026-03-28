import React, { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';

export default function Index() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { initializeUsers } = useUsersStore();
  
  useEffect(() => {
    // Initialize users data when app starts
    initializeUsers();
  }, []);
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }
  
  // If authenticated, redirect to directory
  return <Redirect href="/directory" />;
}