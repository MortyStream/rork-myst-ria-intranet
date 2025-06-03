import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useResourcesStore } from '@/store/resources-store';
import { ResourceCategory } from '@/types/resource';
import { ResourceItemList } from '@/components/ResourceItemList';
import { EmptyState } from '@/components/EmptyState';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { AppLayout } from '@/components/AppLayout';

export default function ResourcesScreen() {
  const router = useRouter();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  const { getVisibleCategories, isLoading } = useResourcesStore();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const visibleCategories = await getVisibleCategories();
    setCategories(visibleCategories);
  };

  const handleSidebarToggle = (toggle: () => void) => {
    setToggleSidebar(() => toggle);
  };

  return (
    <AppLayout 
      hideMenuButton={true}
      onSidebarToggle={handleSidebarToggle}
    >
      <SafeAreaView 
        style={[
          styles.container,
          { backgroundColor: theme.background }
        ]}
        edges={['left', 'right']}
      >
        <Header
          title="La Bible 📚"
          noLeftMargin
          onTitlePress={toggleSidebar || undefined}
        />

        <View style={[styles.header, { backgroundColor: theme.card }]}>
          <Text style={[styles.subtitle, { color: theme.inactive }]}>
            Accédez à toute la documentation du projet
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {categories.length > 0 ? (
            <View style={styles.listContainer}>
              {categories.map((category) => (
                <ResourceItemList
                  key={category.id}
                  category={category}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="Aucune catégorie disponible"
              message="Il n'y a pas encore de catégories disponibles."
              icon="database"
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  subtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 6,
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 6,
  },
});