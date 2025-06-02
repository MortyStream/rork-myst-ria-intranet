import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Switch,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Filter, Eye, EyeOff, Edit, Trash } from 'lucide-react-native';
import { useUsersStore } from '@/store/users-store';
import { User } from '@/types/user';
import { useAuthStore } from '@/store/auth-store';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { UserListItem } from '@/components/UserListItem';
import { Modal } from '@/components/Modal';

export default function UsersListScreen() {
  const router = useRouter();
  const { 
    users, 
    isLoading, 
    error, 
    initializeUsers, 
    searchUsers, 
    deleteUser,
    toggleUserEditable
  } = useUsersStore();
  const { user: currentUser } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNonEditableUsers, setShowNonEditableUsers] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Roles for filtering
  const roles = [
    { id: 'committee', label: 'Comité' },
    { id: 'actor', label: 'Comédien' },
    { id: 'partner', label: 'Partenaire' },
    { id: 'other', label: 'Membre' },
    { id: 'admin', label: 'Administrateur' },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users, showNonEditableUsers, selectedRole]);

  const loadUsers = async () => {
    try {
      await initializeUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    }
  };

  const filterUsers = () => {
    let filtered = users;
    
    // Filter by editable status
    if (!showNonEditableUsers) {
      filtered = filtered.filter(user => user.editable);
    }
    
    // Filter by role
    if (selectedRole) {
      filtered = filtered.filter(user => user.role === selectedRole);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      filtered = searchUsers(searchQuery);
      
      // Apply additional filters to search results
      if (!showNonEditableUsers) {
        filtered = filtered.filter(user => user.editable);
      }
      
      if (selectedRole) {
        filtered = filtered.filter(user => user.role === selectedRole);
      }
    }
    
    setFilteredUsers(filtered);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUsers();
    setIsRefreshing(false);
  };

  const handleUserPress = (user: User) => {
    router.push(`/user/${user.id}`);
  };

  const handleAddUser = () => {
    router.push('/admin/user-form');
  };

  const handleEditUser = (user: User) => {
    router.push({
      pathname: '/admin/user-form',
      params: { id: user.id }
    });
  };

  const confirmDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const success = await deleteUser(userToDelete.id);
      if (success) {
        Alert.alert('Succès', 'Utilisateur supprimé avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer cet utilisateur');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression');
    } finally {
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
    }
  };

  const handleToggleUserEditable = async (user: User) => {
    try {
      const newStatus = !user.editable;
      const success = await toggleUserEditable(user.id, newStatus);
      
      if (success) {
        Alert.alert(
          'Succès', 
          newStatus 
            ? 'Profil rendu modifiable avec succès' 
            : 'Profil rendu non modifiable avec succès'
        );
      } else {
        Alert.alert('Erreur', 'Impossible de modifier le statut de ce profil');
      }
    } catch (error) {
      console.error('Error toggling user editable status:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la modification du statut');
    }
  };

  const toggleShowNonEditableUsers = () => {
    setShowNonEditableUsers(!showNonEditableUsers);
  };

  const openFilterModal = () => {
    setShowFilterModal(true);
  };

  const applyRoleFilter = (roleId: string | null) => {
    setSelectedRole(roleId);
    setShowFilterModal(false);
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isNonEditable = !item.editable;
    
    return (
      <View style={[
        styles.userItemContainer,
        isNonEditable && styles.nonEditableUserItem
      ]}>
        <UserListItem
          user={item}
          onPress={() => handleUserPress(item)}
          showContactInfo={true}
        />
        
        <View style={styles.userActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => handleEditUser(item)}
          >
            <Edit size={16} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isNonEditable ? theme.success : theme.warning }]}
            onPress={() => handleToggleUserEditable(item)}
          >
            {isNonEditable ? (
              <Eye size={16} color="#FFFFFF" />
            ) : (
              <EyeOff size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error }]}
            onPress={() => confirmDeleteUser(item)}
          >
            <Trash size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {isNonEditable && (
          <View style={[styles.nonEditableLabel, { backgroundColor: theme.error + '20' }]}>
            <Text style={[styles.nonEditableLabelText, { color: theme.error }]}>
              Non modifiable
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyList = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>
            Chargement des utilisateurs...
          </Text>
        </View>
      );
    }
    
    if (searchQuery || selectedRole) {
      return (
        <EmptyState
          title="Aucun utilisateur trouvé"
          message="Essayez de modifier vos critères de recherche"
          icon="search"
          actionLabel="Réinitialiser les filtres"
          onAction={() => {
            setSearchQuery('');
            setSelectedRole(null);
          }}
        />
      );
    }
    
    return (
      <EmptyState
        title="Aucun utilisateur"
        message="L'annuaire est vide"
        icon="users"
        actionLabel="Ajouter un utilisateur"
        onAction={handleAddUser}
      />
    );
  };

  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'committee';

  if (!canManageUsers) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Header
          title="Gestion des utilisateurs"
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <View style={styles.unauthorizedContainer}>
          <Text style={[styles.unauthorizedText, { color: theme.text }]}>
            Vous n'avez pas les droits nécessaires pour accéder à cette page.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Gestion des utilisateurs"
        showBackButton={true}
        onBackPress={() => router.back()}
        rightComponent={
          <TouchableOpacity onPress={handleAddUser} style={styles.addButton}>
            <Plus size={24} color={theme.primary} />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: darkMode ? '#333' : '#f0f0f0' }]}>
          <Search size={20} color={theme.inactive} style={styles.searchIcon} />
          <Input
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
          />
        </View>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            { backgroundColor: darkMode ? '#333' : '#f0f0f0' },
            selectedRole && { borderWidth: 2, borderColor: theme.primary }
          ]}
          onPress={openFilterModal}
        >
          <Filter size={20} color={selectedRole ? theme.primary : theme.inactive} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.optionsContainer}>
        <View style={styles.showNonEditableContainer}>
          <Text style={[styles.showNonEditableLabel, { color: theme.text }]}>
            Afficher les profils non modifiables
          </Text>
          <Switch
            value={showNonEditableUsers}
            onValueChange={toggleShowNonEditableUsers}
            trackColor={{ false: Platform.OS === 'ios' ? '#e9e9ea' : '#767577', true: theme.primary }}
            thumbColor={Platform.OS === 'ios' ? '#ffffff' : showNonEditableUsers ? '#ffffff' : '#f4f3f4'}
            ios_backgroundColor="#e9e9ea"
          />
        </View>
        
        {selectedRole && (
          <TouchableOpacity 
            style={[styles.clearFilterButton, { backgroundColor: theme.primary + '20' }]}
            onPress={() => setSelectedRole(null)}
          >
            <Text style={[styles.clearFilterText, { color: theme.primary }]}>
              {roles.find(r => r.id === selectedRole)?.label} ×
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: darkMode ? 'rgba(224, 49, 49, 0.1)' : '#ffebee' }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity 
            onPress={loadUsers}
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filtrer par rôle"
      >
        <TouchableOpacity
          style={[
            styles.roleFilterItem,
            selectedRole === null && { backgroundColor: theme.primary + '20' }
          ]}
          onPress={() => applyRoleFilter(null)}
        >
          <Text style={[
            styles.roleFilterText,
            { color: theme.text },
            selectedRole === null && { color: theme.primary, fontWeight: '600' }
          ]}>
            Tous les rôles
          </Text>
        </TouchableOpacity>
        
        {roles.map(role => (
          <TouchableOpacity
            key={role.id}
            style={[
              styles.roleFilterItem,
              selectedRole === role.id && { backgroundColor: theme.primary + '20' }
            ]}
            onPress={() => applyRoleFilter(role.id)}
          >
            <Text style={[
              styles.roleFilterText,
              { color: theme.text },
              selectedRole === role.id && { color: theme.primary, fontWeight: '600' }
            ]}>
              {role.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        title="Confirmer la suppression"
      >
        <View style={styles.deleteConfirmationContent}>
          <Text style={[styles.deleteConfirmationText, { color: theme.text }]}>
            Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?
          </Text>
          
          {userToDelete && (
            <Text style={[styles.deleteUserName, { color: theme.text }]}>
              {userToDelete.firstName} {userToDelete.lastName}
            </Text>
          )}
          
          <Text style={[styles.deleteWarningText, { color: theme.error }]}>
            Cette action est irréversible.
          </Text>
          
          <View style={styles.deleteConfirmationButtons}>
            <TouchableOpacity
              style={[styles.deleteConfirmationButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setShowDeleteConfirmation(false)}
            >
              <Text style={[styles.deleteConfirmationButtonText, { color: theme.text }]}>
                Annuler
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.deleteConfirmationButton, { backgroundColor: theme.error }]}
              onPress={handleDeleteUser}
            >
              <Text style={[styles.deleteConfirmationButtonText, { color: '#FFFFFF' }]}>
                Supprimer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  input: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    padding: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexWrap: 'wrap',
  },
  showNonEditableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  showNonEditableLabel: {
    marginRight: 8,
    fontSize: 14,
  },
  clearFilterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 4,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  userItemContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  nonEditableUserItem: {
    opacity: 0.7,
  },
  nonEditableLabel: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  nonEditableLabelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  errorContainer: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unauthorizedText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // Filter modal styles
  roleFilterItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  roleFilterText: {
    fontSize: 16,
  },
  // Delete confirmation modal styles
  deleteConfirmationContent: {
    padding: 16,
  },
  deleteConfirmationText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteUserName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteWarningText: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  deleteConfirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deleteConfirmationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
  },
  deleteConfirmationButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});