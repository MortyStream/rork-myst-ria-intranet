import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Folder,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  ChevronLeft,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash,
} from 'lucide-react-native';
import { useResourcesStore } from '@/store/resources-store';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { ResourceItem, ResourceItemType } from '@/types/resource';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';

export default function ResourceCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const { user } = useAuthStore();
  const {
    getCategoryById,
    getResourceItemsByCategory,
    isUserCategoryResponsible,
    deleteResourceItem,
  } = useResourcesStore();

  const [category, setCategory] = useState(getCategoryById(id));
  const [resourceItems, setResourceItems] = useState<ResourceItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  const isCategoryResponsible = user ? isUserCategoryResponsible(user.id, id) : false;
  const canManageItems = isAdminOrModerator || isCategoryResponsible;

  useEffect(() => {
    loadResourceItems();
  }, [currentFolder, id]);

  const loadResourceItems = () => {
    setIsLoading(true);
    try {
      const items = getResourceItemsByCategory(id, currentFolder);
      
      // Filter out hidden items if user is not admin/moderator/responsible
      const visibleItems = canManageItems
        ? items
        : items.filter(item => !item.hidden);
      
      setResourceItems(visibleItems);
    } catch (error) {
      console.error('Error loading resource items:', error);
      Alert.alert('Erreur', 'Impossible de charger les éléments de cette catégorie.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setFolderPath([...folderPath, { id: currentFolder, name: folderName }]);
    setCurrentFolder(folderId);
  };

  const navigateBack = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      const lastFolder = newPath.pop();
      setFolderPath(newPath);
      setCurrentFolder(lastFolder?.id || null);
    } else {
      // Go back to resources tab instead of general resources page
      router.push('/(tabs)/resources');
    }
  };

  const handleAddItem = () => {
    router.push({
      pathname: '/admin/resource-item-form',
      params: { 
        categoryId: id,
        parentId: currentFolder || ''
      }
    });
  };

  const handleEditItem = (item: ResourceItem) => {
    router.push({
      pathname: '/admin/resource-item-form',
      params: { 
        id: item.id,
        categoryId: id
      }
    });
  };

  const handleDeleteItem = (item: ResourceItem) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer "${item.title}" ${item.type === 'folder' ? 'et tout son contenu' : ''} ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteResourceItem(item.id);
            loadResourceItems();
          },
        },
      ]
    );
  };

  const handleItemPress = (item: ResourceItem) => {
    switch (item.type) {
      case 'folder':
        navigateToFolder(item.id, item.title);
        break;
      case 'link':
        if (item.url) {
          // In a real app, you would use Linking.openURL
          Alert.alert('Ouvrir le lien', `Vous allez être redirigé vers: ${item.url}`);
        }
        break;
      case 'file':
        // In a real app, you would open the file
        Alert.alert('Ouvrir le fichier', `Vous allez ouvrir: ${item.title}`);
        break;
      case 'image':
        // In a real app, you would show the image in full screen
        Alert.alert('Voir l\'image', `Vous allez voir: ${item.title}`);
        break;
      case 'text':
        // In a real app, you would show the text in a modal or new screen
        Alert.alert('Voir le texte', item.content || 'Aucun contenu');
        break;
    }
  };

  const getItemIcon = (type: ResourceItemType) => {
    switch (type) {
      case 'folder':
        return <Folder size={24} color={theme.primary} />;
      case 'file':
        return <FileText size={24} color={theme.primary} />;
      case 'link':
        return <LinkIcon size={24} color={theme.primary} />;
      case 'image':
        return <ImageIcon size={24} color={theme.primary} />;
      case 'text':
        return <AlignLeft size={24} color={theme.primary} />;
    }
  };

  const renderItem = ({ item }: { item: ResourceItem }) => (
    <Card style={styles.itemCard}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.itemIconContainer}>
          {getItemIcon(item.type)}
        </View>
        <View style={styles.itemDetails}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          {item.description && (
            <Text 
              style={[styles.itemDescription, { color: darkMode ? theme.inactive : '#666666' }]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          )}
        </View>
        {item.hidden && (
          <View style={styles.hiddenBadge}>
            <EyeOff size={16} color="#ffffff" />
          </View>
        )}
      </TouchableOpacity>
      
      {canManageItems && (
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => handleEditItem(item)}
          >
            <Edit size={16} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error }]}
            onPress={() => handleDeleteItem(item)}
          >
            <Trash size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  const renderBreadcrumbs = () => {
    if (folderPath.length === 0) return null;
    
    return (
      <View style={styles.breadcrumbs}>
        <TouchableOpacity
          onPress={() => {
            setFolderPath([]);
            setCurrentFolder(null);
          }}
        >
          <Text style={[styles.breadcrumbItem, { color: theme.primary }]}>
            {category?.name}
          </Text>
        </TouchableOpacity>
        
        {folderPath.map((folder, index) => (
          <React.Fragment key={index}>
            <Text style={{ color: theme.inactive }}> / </Text>
            {index < folderPath.length - 1 ? (
              <TouchableOpacity
                onPress={() => {
                  const newPath = folderPath.slice(0, index + 1);
                  setFolderPath(newPath);
                  setCurrentFolder(newPath[newPath.length - 1].id);
                }}
              >
                <Text style={[styles.breadcrumbItem, { color: theme.primary }]}>
                  {folder.name}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.breadcrumbItem, { color: theme.text }]}>
                {folder.name}
              </Text>
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  if (!category) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Header 
          title="Catégorie introuvable"
          showBackButton
          onBackPress={() => router.push('/(tabs)/resources')}
        />
        <EmptyState
          title="Catégorie introuvable"
          message="La catégorie que vous recherchez n'existe pas ou a été supprimée."
          icon="alert"
          actionLabel="Retour aux catégories"
          onAction={() => router.push('/(tabs)/resources')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        title={category.name}
        showBackButton
        onBackPress={navigateBack}
        rightComponent={
          canManageItems ? (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={handleAddItem}
            >
              <Plus size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      
      {renderBreadcrumbs()}
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={resourceItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title={currentFolder ? "Dossier vide" : "Aucun élément"}
              message={currentFolder 
                ? "Ce dossier ne contient aucun élément pour le moment."
                : "Cette catégorie ne contient aucun élément pour le moment."
              }
              icon={<Folder size={48} color={theme.inactive} />}
              actionLabel={canManageItems ? "Ajouter un élément" : undefined}
              onAction={canManageItems ? handleAddItem : undefined}
              style={styles.emptyState}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  breadcrumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  breadcrumbItem: {
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  itemIconContainer: {
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  hiddenBadge: {
    backgroundColor: '#888888',
    borderRadius: 12,
    padding: 4,
    marginLeft: 8,
  },
  itemActions: {
    flexDirection: 'row',
    paddingRight: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyState: {
    marginTop: 40,
  },
});