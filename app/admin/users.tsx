import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Filter, Link, Edit } from 'lucide-react-native';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { UserListItem } from '@/components/UserListItem';
import { EmptyState } from '@/components/EmptyState';
import { User } from '@/types/user';
import { AppLayout } from '@/components/AppLayout';

export default function UsersScreen() {
  const router = useRouter();
  const { users, isLoading, error, initializeUsers, toggleUserEditable } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNonEditable, setShowNonEditable] = useState(false);
  
  useEffect(() => {
    loadUsers();
  }, []);
  
  useEffect(() => {
    filterUsers();
  }, [searchQuery, users, showNonEditable]);
  
  const loadUsers = async () => {
    try {
      await initializeUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    }
  };
  
  const filterUsers = () => {
    let filtered = [...users];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone && user.phone.includes(query))
      );
    }
    
    // Filter by editable status
    if (!showNonEditable) {
      filtered = filtered.filter(user => user.editable);
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
  
  const handleToggleEditable = async (user: User) => {
    try {
      const newStatus = !user.editable;
      const action = newStatus ? 'rendre modifiable' : 'rendre non modifiable';
      
      Alert.alert(
        `${action.charAt(0).toUpperCase() + action.slice(1)} le profil`,
        `Êtes-vous sûr de vouloir ${action} le profil de ${user.firstName} ${user.lastName} ?`,
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Confirmer',
            onPress: async () => {
              const success = await toggleUserEditable(user.id, newStatus);
              if (success) {
                Alert.alert(
                  'Succès',
                  `Le profil a été ${newStatus ? 'rendu modifiable' : 'rendu non modifiable'} avec succès.`
                );
              } else {
                Alert.alert(
                  'Erreur',
                  `Une erreur est survenue lors de la modification du statut du profil.`
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error toggling user editable status:', error);
      Alert.alert('Erreur', "Une erreur est survenue lors de la modification du statut de l'utilisateur.");
    }
  };
  
  const renderUserItem = ({ item }: { item: User }) => {
    return (
      <View style={styles.userItemContainer}>
        <UserListItem
          user={item}
          onPress={() => handleUserPress(item)}
          showContactInfo={true}
          showChevron={false}
        />
        
        <View style={styles.userItemActions}>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: theme.primary }]}
            onPress={() => handleEditUser(item)}
          >
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleEditableButton,
              { backgroundColor: item.editable ? `${theme.error}20` : `${theme.success}20` }
            ]}
            onPress={() => handleToggleEditable(item)}
          >
            {item.editable ? (
              <Link size={16} color={theme.error} style={styles.toggleEditableIcon} />
            ) : (
              <Edit size={16} color={theme.success} style={styles.toggleEditableIcon} />
            )}
            <Text 
              style={[
                styles.toggleEditableText, 
                { color: item.editable ? theme.error : theme.success }
              ]}
            >
              {item.editable ? 'Non modifiable' : 'Modifiable'}
            </Text>
          </TouchableOpacity>
        </View>
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
    
    if (searchQuery) {
      return (
        <EmptyState
          title="Aucun utilisateur trouvé"
          message={`Aucun résultat pour "${searchQuery}"`}
          icon="alert"
          actionLabel="Réinitialiser la recherche"
          onAction={() => setSearchQuery('')}
        />
      );
    }
    
    return (
      <EmptyState
        title="Aucun utilisateur"
        message="Aucun utilisateur dans l'annuaire"
        icon="users"
        actionLabel="Ajouter un utilisateur"
        onAction={handleAddUser}
      />
    );
  };
  
  return (
    <AppLayout>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Gestion des utilisateurs"
          showBackButton={true}
          onBackPress={() => router.back()}
          rightComponent={
            <TouchableOpacity onPress={handleAddUser} style={styles.addButton}>
              <Plus size={24} color={theme.text} />
            </TouchableOpacity>
          }
        />
        
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: darkMode ? '#333' : '#f0f0f0' }]}>
            <Search size={20} color={theme.inactive} style={styles.searchIcon} />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: darkMode ? '#333' : '#f0f0f0' }]}
            onPress={() => {}}
          >
            <Filter size={20} color={theme.inactive} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.showNonEditableContainer}>
          <Text style={[styles.showNonEditableLabel, { color: theme.text }]}>
            Afficher les profils non modifiables
          </Text>
          <Switch
            value={showNonEditable}
            onValueChange={setShowNonEditable}
            trackColor={{ false: '#767577', true: `${theme.primary}80` }}
            thumbColor={showNonEditable ? theme.primary : '#f4f3f4'}
          />
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
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  showNonEditableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  showNonEditableLabel: {
    fontSize: 16,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  userItemContainer: {
    marginBottom: 8,
  },
  userItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  toggleEditableButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  toggleEditableIcon: {
    marginRight: 4,
  },
  toggleEditableText: {
    fontWeight: '500',
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
});