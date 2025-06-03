import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }
  
  // If authenticated, redirect to home
  return <Redirect href="/home" />;
}