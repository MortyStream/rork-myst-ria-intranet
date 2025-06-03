import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Folder, FileText, Link as LinkIcon } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useResourcesStore } from '@/store/resources-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { ResourceListItem } from '@/components/ResourceListItem';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ResourceCategory } from '@/types/resource';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';

export default function ResourcesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { categories, initializeResources } = useResourcesStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  useEffect(() => {
    initializeResources();
  }, []);
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    initializeResources();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  const handleAddCategory = () => {
    router.push('/admin/category-form');
  };
  
  const handleCategoryPress = (category: ResourceCategory) => {
    router.push(`/resources/${category.id}`);
  };
  
  // Filter categories based on search query
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sort categories by order
  const sortedCategories = [...filteredCategories].sort((a, b) => a.order - b.order);
  
  const renderCategoryItem = ({ item }: { item: ResourceCategory }) => (
    <TouchableOpacity
      style={[styles.categoryItem, { backgroundColor: theme.card }]}
      onPress={() => handleCategoryPress(item)}
    >
      <View style={styles.categoryIcon}>
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
      </View>
      
      <View style={styles.categoryContent}>
        <Text style={[styles.categoryTitle, { color: theme.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.categoryDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
          {item.description}
        </Text>
      </View>
      
      <View style={styles.categoryMeta}>
        <Text style={[styles.categoryItemCount, { color: darkMode ? theme.inactive : '#666666' }]}>
          {item.items?.length || 0} éléments
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <AppLayout 
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="La Bible 📖"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            isAdminOrModerator && (
              <Button
                icon={<Plus size={24} color={theme.text} />}
                onPress={handleAddCategory}
                variant="text"
                style={styles.addButton}
              />
            )
          }
          containerStyle={styles.headerContainer}
        />
        
        <View style={styles.searchContainer}>
          <Input
            placeholder="Rechercher une catégorie..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={darkMode ? '#ffffff' : '#333333'} />}
            containerStyle={styles.searchInput}
          />
        </View>
        
        {sortedCategories.length > 0 ? (
          <FlatList
            data={sortedCategories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState
            icon="book-open"
            title="Aucune catégorie trouvée"
            message={
              searchQuery
                ? "Aucune catégorie ne correspond à votre recherche"
                : "Il n'y a pas encore de catégories de ressources"
            }
            style={styles.emptyState}
          />
        )}
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  categoryMeta: {
    alignItems: 'flex-end',
  },
  categoryItemCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    marginTop: 40,
  },
});