import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { UserProfile } from '@/components/UserProfile';

export default function UserProfileScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const handleBackPress = () => {
    // Get the previous route from navigation state
    const segments = pathname.split('/');
    if (segments.includes('directory')) {
      router.push('/directory');
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Profil"
        showBackButton={true}
        onBackPress={handleBackPress}
      />
      <UserProfile />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});