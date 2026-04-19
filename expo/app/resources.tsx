import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useResourcesStore } from '@/store/resources-store';
import { ResourceCategory } from '@/types/resource';
import { ResourceItemList } from '@/components/ResourceItemList';
import { EmptyState } from '@/components/EmptyState';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLayout } from '@/components/AppLayout';

export default function ResourcesScreen() {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const { getVisibleCategories, isLoading, initializeDefaultCategories } = useResourcesStore();
  const toggleSidebarRef = useRef<() => void>();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    await initializeDefaultCategories();
    const visibleCategories = getVisibleCategories();
    setCategories(visibleCategories);
  };

  const handleTitlePress = () => {
    if (toggleSidebarRef.current) {
      toggleSidebarRef.current();
    }
  };

  return (
    <AppLayout 
      hideMenuButton={true}
      onSidebarToggle={(toggle) => {
        toggleSidebarRef.current = toggle;
      }}
    >
      <SafeAreaView 
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={['left', 'right']}
      >
        <Stack.Screen
          options={{
            title: 'La Bible 📚',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
          }}
        />
        <TouchableOpacity 
          style={[styles.header, { backgroundColor: theme.card }]}
          onPress={handleTitlePress}
          activeOpacity={0.7}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            La Bible 📚
          </Text>
          <Text style={[styles.subtitle, { color: theme.inactive }]}>
            Accédez à toute la documentation du projet
          </Text>
        </TouchableOpacity>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <EmptyState
              title="Chargement..."
              message="Récupération des catégories en cours."
              icon="database"
            />
          ) : categories.length > 0 ? (
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
  container: { flex: 1 },
  header: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: 6 },
  listContainer: { paddingHorizontal: 16, gap: 6 },
});
