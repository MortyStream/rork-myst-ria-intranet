import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Folder,
  FolderPlus,
  Edit,
  Trash,
  Lock,
  Users,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useResourcesStore } from '@/store/resources-store';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ResourceCategory } from '@/types/resource';

export default function AdminCategoriesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { categories, deleteCategory, updateCategory } = useResourcesStore();
  const { getUserById } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  // Check if user is admin or moderator
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  if (!isAdminOrModerator) {
    router.replace('/admin');
    return null;
  }
  
  const handleAddCategory = () => {
    router.push('/admin/category-form');
  };
  
  const handleEditCategory = (category: ResourceCategory) => {
    router.push({
      pathname: '/admin/category-form',
      params: { id: category.id }
    });
  };
  
  const handleDeleteCategory = (category: ResourceCategory) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" et tout son contenu ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteCategory(category.id);
            Alert.alert('Succès', 'Catégorie supprimée avec succès.');
          },
        },
      ]
    );
  };
  
  const toggleCategoryAccess = (category: ResourceCategory) => {
    updateCategory(category.id, {
      restrictedAccess: !category.restrictedAccess
    });
  };
  
  const getResponsibleName = (responsibleId?: string) => {
    if (!responsibleId) return "Aucun responsable";
    const responsible = getUserById(responsibleId);
    return responsible ? `${responsible.firstName} ${responsible.lastName}` : "Utilisateur inconnu";
  };
  
  const renderCategoryItem = ({ item }: { item: ResourceCategory }) => (
    <Card style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitleContainer}>
          <View style={[styles.categoryIcon, { backgroundColor: theme.primary }]}>
            <Text style={styles.categoryEmoji}>{item.icon || '📁'}</Text>
          </View>
          <Text style={[styles.categoryTitle, { color: theme.text }]}>
            {item.name}
          </Text>
        </View>
        
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => handleEditCategory(item)}
          >
            <Edit size={16} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error }]}
            onPress={() => handleDeleteCategory(item)}
          >
            <Trash size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.description && (
        <Text 
          style={[styles.categoryDescription, { color: darkMode ? theme.inactive : '#666666' }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
      )}
      
      <View style={styles.categoryDetails}>
        <View style={styles.detailItem}>
          <Lock size={16} color={theme.primary} style={styles.detailIcon} />
          <Text style={[styles.detailLabel, { color: theme.text }]}>
            Accès restreint:
          </Text>
          <Switch
            value={item.restrictedAccess || false}
            onValueChange={() => toggleCategoryAccess(item)}
            trackColor={{ false: '#767577', true: `${theme.primary}80` }}
            thumbColor={item.restrictedAccess ? theme.primary : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.detailItem}>
          <Users size={16} color={theme.primary} style={styles.detailIcon} />
          <Text style={[styles.detailLabel, { color: theme.text }]}>
            Responsable:
          </Text>
          <Text style={[styles.detailValue, { color: darkMode ? theme.inactive : '#666666' }]}>
            {getResponsibleName(item.responsibleId)}
          </Text>
        </View>
      </View>
    </Card>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Gestion des catégories"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={handleAddCategory}
        >
          <FolderPlus size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Ajouter une catégorie</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={categories.sort((a, b) => a.order - b.order)}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <EmptyState
              title="Aucune catégorie"
              message="Aucune catégorie n'a été créée pour le moment."
              icon={<Folder size={48} color={theme.inactive} />}
              actionLabel="Ajouter une catégorie"
              onAction={handleAddCategory}
              style={styles.emptyState}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryCard: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  categoryActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  categoryDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  categoryDetails: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  emptyStateContainer: {
    width: '100%',
  },
  emptyState: {
    marginTop: 40,
  },
});