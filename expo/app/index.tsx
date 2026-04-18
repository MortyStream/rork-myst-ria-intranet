import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useUsersStore } from '@/store/users-store';

export default function Index() {
  const { initializeUsers } = useUsersStore();
  
  useEffect(() => {
    // Initialize users data when app starts
    initializeUsers();
  }, [initializeUsers]);

  return <Redirect href="/directory" />;
}