import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Search,
  Plus,
  Trash,
  Edit,
  RefreshCw,
  AlertTriangle,
  X,
  Save,
  Info,
  UserCheck,
  AlignLeft,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSupabaseRolesStore, SupabaseRole } from '@/store/supabase-roles-store';
import { useSupabaseUsersStore } from '@/store/supabase-users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function RolesScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { 
    roles, 
    fetchRoles, 
    createRole,
    updateRole,
    deleteRole,
    isLoading, 
    error, 
    useMockData,
    clearCache
  } = useSupabaseRolesStore();
  const { users, fetchUsers } = useSupabaseUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<SupabaseRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [formError, setFormError] = useState('');
  
  // Vérifier si l'utilisateur est admin ou modérateur
  const isAdminOrModerator = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  
  useEffect(() => {
    const initializeScreen = async () => {
      if (isAdminOrModerator) {
        try {
          // Fetch roles and users
          await Promise.all([fetchRoles(), fetchUsers()]);
        } catch (error) {
          console.error("Error initializing roles screen:", error);
          Alert.alert("Erreur", "Impossible de charger les données");
        }
      } else {
        router.replace('/admin');
      }
    };
    
    initializeScreen();
  }, [isAdminOrModerator]);
  
  if (!isAdminOrModerator) {
    router.replace('/admin');
    return null;
  }
  
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      
      // Clear cache to force a fresh fetch
      clearCache();
      
      // Fetch roles
      await Promise.all([fetchRoles(), fetchUsers()]);
      
      setRefreshing(false);
      Alert.alert("Succès", "Rôles rafraîchis avec succès");
    } catch (error) {
      console.error("Error refreshing roles:", error);
      setRefreshing(false);
      Alert.alert("Erreur", "Impossible de rafraîchir les rôles");
    }
  };
  
  const filteredRoles = roles.filter(role => {
    return searchQuery === '' || 
      role.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  const handleAddRole = () => {
    // Check if we already have 4 roles
    if (roles.length >= 4) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de 4 rôles. Vous ne pouvez pas en ajouter davantage.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setFormError('');
    setIsModalVisible(true);
  };
  
  const handleEditRole = (role: SupabaseRole) => {
    setEditingRole(role);
    setRoleName(role.label);
    setRoleDescription(role.description);
    setFormError('');
    setIsModalVisible(true);
  };
  
  const handleDeleteRole = (role: SupabaseRole) => {
    // Check if we have 4 or fewer roles
    if (roles.length <= 4) {
      Alert.alert(
        "Action impossible",
        "Vous ne pouvez pas supprimer de rôle car le minimum de 4 rôles est requis.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Check if any users are using this role
    const usersWithRole = getUserCountForRole(role);
    
    if (usersWithRole > 0) {
      Alert.alert(
        'Impossible de supprimer',
        `Ce rôle est utilisé par ${usersWithRole} utilisateur(s). Veuillez d'abord changer leur rôle.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer le rôle "${role.label}" ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRole(role.id);
              Alert.alert('Succès', 'Rôle supprimé avec succès.');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer ce rôle.');
            }
          },
        },
      ]
    );
  };
  
  const validateForm = () => {
    if (!roleName.trim()) {
      setFormError('Le nom du rôle est obligatoire');
      return false;
    }
    
    // Check if role name already exists (except when editing the same role)
    const roleExists = roles.some(r => 
      r.label.toLowerCase() === roleName.toLowerCase() && 
      (!editingRole || r.id !== editingRole.id)
    );
    
    if (roleExists) {
      setFormError('Un rôle avec ce nom existe déjà');
      return false;
    }
    
    setFormError('');
    return true;
  };
  
  const handleSaveRole = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      if (editingRole) {
        // Update existing role
        await updateRole(editingRole.id, {
          label: roleName,
          description: roleDescription,
        });
        Alert.alert('Succès', 'Rôle mis à jour avec succès');
      } else {
        // Create new role
        await createRole({
          label: roleName,
          description: roleDescription,
        });
        Alert.alert('Succès', 'Rôle créé avec succès');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving role:', error);
      setFormError("Une erreur est survenue lors de l'enregistrement");
    }
  };
  
  // Updated function to count users by role (case-insensitive)
  const getUserCountForRole = (role: SupabaseRole): number => {
    // First check if any users have roleId matching this role's id
    const usersWithRoleId = users.filter(user => user.roleId === role.id).length;
    
    if (usersWithRoleId > 0) {
      return usersWithRoleId;
    }
    
    // If no users found by roleId, check by role name (case-insensitive)
    return users.filter(user => 
      user.role && 
      user.role.toLowerCase() === role.label.toLowerCase()
    ).length;
  };
  
  const renderRoleItem = ({ item }: { item: SupabaseRole }) => (
    <View style={[styles.roleItemContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.roleInfo}>
        <Text style={[styles.roleName, { color: theme.text }]}>
          {item.label}
        </Text>
        
        {item.description && (
          <Text style={[styles.roleDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.roleStats}>
          <View style={[styles.userCountBadge, { backgroundColor: theme.primary + '20' }]}>
            <UserCheck size={14} color={theme.primary} style={styles.userCountIcon} />
            <Text style={[styles.userCountText, { color: theme.primary }]}>
              {getUserCountForRole(item)} utilisateur{getUserCountForRole(item) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.roleActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => handleEditRole(item)}
        >
          <Edit size={16} color="#ffffff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.error }]}
          onPress={() => handleDeleteRole(item)}
        >
          <Trash size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderRoleModal = () => (
    <Modal
      visible={isModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setIsModalVisible(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingRole ? 'Modifier le rôle' : 'Ajouter un rôle'}
            </Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalForm}>
            <Input
              label="Nom du rôle"
              placeholder="Entrez le nom du rôle"
              value={roleName}
              onChangeText={setRoleName}
              leftIcon={<Users size={20} color={theme.text} />}
              containerStyle={styles.inputContainer}
              autoCapitalize="words"
            />
            
            <Input
              label="Description"
              placeholder="Entrez une description (optionnel)"
              value={roleDescription}
              onChangeText={setRoleDescription}
              leftIcon={<AlignLeft size={20} color={theme.text} />}
              containerStyle={styles.inputContainer}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            {formError && (
              <View style={[styles.errorContainer, { backgroundColor: theme.error + '20' }]}>
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {formError}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.modalActions}>
            <Button
              title="Annuler"
              onPress={() => setIsModalVisible(false)}
              variant="outline"
              style={[styles.modalButton, { borderColor: theme.border }]}
              textStyle={{ color: theme.text }}
            />
            
            <Button
              title="Enregistrer"
              onPress={handleSaveRole}
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Gestion des rôles"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      {useMockData && (
        <View style={[styles.mockDataBanner, { backgroundColor: theme.warning + '20' }]}>
          <AlertTriangle size={20} color={theme.warning} style={styles.mockDataIcon} />
          <Text style={[styles.mockDataText, { color: theme.text }]}>
            Mode démo : Les données affichées sont simulées car l'API Supabase Admin n'est pas disponible.
          </Text>
        </View>
      )}
      
      <View style={[styles.infoBanner, { backgroundColor: theme.info + '20' }]}>
        <Info size={20} color={theme.info} style={styles.infoIcon} />
        <Text style={[styles.infoText, { color: theme.text }]}>
          Les rôles sont limités à 4 valeurs : Admin, Modérateur, Utilisateur et Externe.
        </Text>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={handleRefresh}
          disabled={isLoading || refreshing}
        >
          <RefreshCw size={20} color={theme.text} />
        </TouchableOpacity>
        
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={20} color={darkMode ? theme.inactive : '#999999'} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher un rôle..."
            placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: roles.length >= 4 ? theme.inactive : theme.primary }]}
          onPress={handleAddRole}
          disabled={roles.length >= 4}
        >
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: theme.error + '20' }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        </View>
      )}
      
      {isLoading || refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Chargement des rôles...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRoles}
          keyExtractor={(item) => item.id}
          renderItem={renderRoleItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Aucun rôle trouvé"
              message={searchQuery ? "Essayez de modifier votre recherche." : "Aucun rôle n'a été créé pour le moment."}
              icon={<Users size={48} color={theme.inactive} />}
              actionLabel={roles.length < 4 ? "Ajouter un rôle" : undefined}
              onAction={roles.length < 4 ? handleAddRole : undefined}
              style={styles.emptyState}
            />
          }
        />
      )}
      
      {renderRoleModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mockDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  mockDataIcon: {
    marginRight: 8,
  },
  mockDataText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  errorContainer: {
    margin: 20,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  roleItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  userCountIcon: {
    marginRight: 4,
  },
  userCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  roleActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyState: {
    marginTop: 40,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalForm: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});