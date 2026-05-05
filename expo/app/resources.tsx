import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Folder, FileText, Link as LinkIcon, Image as ImageIcon, AlignLeft } from 'lucide-react-native';
import { useResourcesStore } from '@/store/resources-store';
import { ResourceCategory, ResourceItem, ResourceItemType } from '@/types/resource';
import { ResourceItemList } from '@/components/ResourceItemList';
import { CategoryRowSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';

// Retire accents + passe en minuscules pour la recherche insensible
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const getItemIcon = (type: ResourceItemType, color: string) => {
  const props = { size: 18, color };
  switch (type) {
    case 'folder': return <Folder {...props} />;
    case 'file': return <FileText {...props} />;
    case 'link': return <LinkIcon {...props} />;
    case 'image': return <ImageIcon {...props} />;
    case 'text': return <AlignLeft {...props} />;
    default: return <FileText {...props} />;
  }
};

export default function ResourcesScreen() {
  const router = useRouter();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const {
    getVisibleCategories,
    isLoading,
    initializeDefaultCategories,
    resourceItems,
    getCategoryById,
  } = useResourcesStore();
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | undefined>(undefined);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    await initializeDefaultCategories();
    const visibleCategories = getVisibleCategories();
    setCategories(visibleCategories);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCategories();
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recherche dans items + catégories (nom, description, contenu texte)
  const searchResults = useMemo(() => {
    const q = normalize(searchQuery.trim());
    if (q.length < 2) return null; // pas de recherche active

    const visibleCategoryIds = new Set(categories.map(c => c.id));
    const matchingItems: ResourceItem[] = resourceItems.filter(item => {
      if (!visibleCategoryIds.has(item.categoryId)) return false;
      if (item.hidden) return false;
      const hay = normalize(
        `${item.title} ${item.description ?? ''} ${item.content ?? ''}`
      );
      return hay.includes(q);
    });

    const matchingCategories: ResourceCategory[] = categories.filter(cat => {
      const hay = normalize(`${cat.name} ${cat.description ?? ''}`);
      return hay.includes(q);
    });

    return { matchingItems, matchingCategories };
  }, [searchQuery, resourceItems, categories]);

  const handleResultPress = (categoryId: string) => {
    router.push({ pathname: '/resources/[id]', params: { id: categoryId } });
  };

  const renderSearchResults = () => {
    if (!searchResults) return null;
    const { matchingItems, matchingCategories } = searchResults;
    const totalHits = matchingItems.length + matchingCategories.length;

    if (totalHits === 0) {
      return (
        <EmptyState
          title="Aucun résultat"
          message={`Rien ne correspond à « ${searchQuery} »`}
          icon="search"
        />
      );
    }

    return (
      <View style={styles.searchResults}>
        <Text style={[styles.searchResultsLabel, { color: darkMode ? theme.inactive : '#666' }]}>
          {totalHits} résultat{totalHits > 1 ? 's' : ''}
        </Text>

        {matchingCategories.map(cat => (
          <TouchableOpacity
            key={`cat-${cat.id}`}
            style={[styles.resultRow, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleResultPress(cat.id)}
          >
            <Folder size={18} color={theme.primary} />
            <View style={styles.resultContent}>
              <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
                {cat.name}
              </Text>
              <Text style={[styles.resultSub, { color: darkMode ? theme.inactive : '#888' }]} numberOfLines={1}>
                Catégorie
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {matchingItems.map(item => {
          const parentCat = getCategoryById(item.categoryId);
          return (
            <TouchableOpacity
              key={`item-${item.id}`}
              style={[styles.resultRow, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => handleResultPress(item.categoryId)}
            >
              {getItemIcon(item.type, theme.primary)}
              <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.resultSub, { color: darkMode ? theme.inactive : '#888' }]} numberOfLines={1}>
                  {parentCat?.name ?? 'Catégorie inconnue'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={['top']}
      >
        <Header
          title="La Bible 📚"
          onTitlePress={() => toggleSidebar?.()}
          containerStyle={styles.headerContainer}
        />
        <View style={styles.searchContainer}>
          <Input
            placeholder="Rechercher un dossier, fichier, lien…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={darkMode ? '#ffffff' : '#333'} />}
            containerStyle={styles.searchInput}
          />
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {/* Skeleton uniquement au tout 1er chargement (cache vide). Si on a déjà
              des catégories en cache (Zustand persist), on saute direct au vrai contenu. */}
          {isLoading && categories.length === 0 ? (
            <View style={styles.skeletonContainer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <CategoryRowSkeleton key={i} />
              ))}
            </View>
          ) : searchResults ? (
            renderSearchResults()
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
  headerContainer: { marginTop: -8 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInput: { marginBottom: 0 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: 6 },
  skeletonContainer: { paddingTop: 6 },
  listContainer: { paddingHorizontal: 16, gap: 6 },
  searchResults: { paddingHorizontal: 16, gap: 8 },
  searchResultsLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  resultContent: { flex: 1 },
  resultTitle: { fontSize: 15, fontWeight: '600' },
  resultSub: { fontSize: 12, marginTop: 2 },
});
