import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { ResourceList } from '@/components/ResourceList';

export default function ResourceCategoryScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const handleBackPress = () => {
    const segments = pathname.split('/');
    if (segments.includes('resources')) {
      if (segments.length > 3) {
        // If we're in a subfolder, go back one level
        segments.pop();
        router.push(segments.join('/'));
      } else {
        // If we're in the root resources folder, go back to resources
        router.push('/resources');
      }
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Ressources"
        showBackButton={true}
        onBackPress={handleBackPress}
      />
      <ResourceList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});