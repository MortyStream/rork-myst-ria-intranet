import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { UserPlus, Search } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { UserGridItem } from '@/components/UserGridItem';
import { EmptyState } from '@/components/EmptyState';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3; // 3 items per row with padding

export default function DirectoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { users, isLoading, error, initializeUsers } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  
  // Check if user is admin or moderator
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  useEffect(() => {
    loadUsers();
  }, []);
  
  const loadUsers = async () => {
    try {
      await initializeUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement des utilisateurs.');
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await initializeUsers();
    } catch (error) {
      console.error('Error refreshing users:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du rafraîchissement des utilisateurs.');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleAddUser = () => {
    if (isAddingUser) return;
    
    try {
      setIsAddingUser(true);
      router.push('/admin/user-form');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la navigation.');
    } finally {
      setTimeout(() => {
        setIsAddingUser(false);
      }, 1000);
    }
  };
  
  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });
  
  // Sort users by last name
  const sortedUsers = [...filteredUsers].sort((a, b) => 
    a.lastName.localeCompare(b.lastName)
  );
  
  const renderUserItem = ({ item, index }: { item: any; index: number }) => (
    <UserGridItem
      user={item}
      onPress={() => handleUserPress(item.id)}
      size={ITEM_SIZE}
      style={{
        marginRight: (index + 1) % 3 === 0 ? 0 : 8,
        marginBottom: 16,
      }}
    />
  );
  
  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Chargement des utilisateurs...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadUsers}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (sortedUsers.length === 0) {
      return (
        <EmptyState
          icon="users"
          title="Aucun utilisateur trouvé"
          message={
            searchQuery
              ? "Aucun utilisateur ne correspond à votre recherche"
              : "L'annuaire est vide"
          }
        />
      );
    }

    return (
      <FlatList
        data={sortedUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };
  
  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header
          title="Annuaire 📇"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            isAdminOrModerator ? (
              <TouchableOpacity 
                style={[styles.addButton, isAddingUser && styles.addButtonDisabled]} 
                onPress={handleAddUser}
                disabled={isAddingUser}
              >
                {isAddingUser ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <UserPlus size={24} color={theme.text} />
                )}
              </TouchableOpacity>
            ) : null
          }
          containerStyle={styles.headerContainer}
        />
        <View style={styles.searchContainer}>
          <Input
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={darkMode ? '#ffffff' : '#333333'} />}
            containerStyle={styles.searchInput}
          />
        </View>
        {renderContent()}
      </View>
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
    opacity: 1,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  gridContent: {
    padding: 16,
  },
});