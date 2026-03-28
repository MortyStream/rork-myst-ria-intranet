import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, UserPlus, Trash, Edit, User, Users } from 'lucide-react-native';
import { useResourcesStore } from '@/store/resources-store';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { Colors } from '@/constants/colors';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { UserListItem } from './UserListItem';
import { CategoryMember, CategoryMemberRole } from '@/types/resource';
import { User as UserType } from '@/types/user';
import { Picker } from './Picker';
import { getSupabase } from '@/utils/supabase';

interface CategoryMembersModalProps {
  categoryId: string;
  visible: boolean;
  onClose: () => void;
}

export const CategoryMembersModal: React.FC<CategoryMembersModalProps> = ({
  categoryId,
  visible,
  onClose,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const { user: currentUser } = useAuthStore();
  const { users, getUserById, isLoading: isUsersLoading } = useUsersStore();
  const {
    getCategoryById,
    getCategoryMembers,
    addCategoryMember,
    updateCategoryMember,
    deleteCategoryMember,
    isLoading,
    error,
    setError,
  } = useResourcesStore();

  const [members, setMembers] = useState<CategoryMember[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showEditMemberForm, setShowEditMemberForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CategoryMember | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<CategoryMemberRole>('membre');
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const category = getCategoryById(categoryId);
  const isAdminOrModerator = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // Load members only when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadMembers();
      fetchSupabaseUsers();
    }
  }, [visible, categoryId]);

  const loadMembers = async () => {
    if (!categoryId || !visible) return;

    try {
      setRefreshing(true);
      const fetchedMembers = await getCategoryMembers(categoryId);
      setMembers(fetchedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Erreur', 'Impossible de charger les membres.');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSupabaseUsers = async () => {
    try {
      setLoadingUsers(true);
      setUserError(null);
      
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('id, firstName, lastName, email')
        .order('firstName', { ascending: true });
      
      if (error) {
        console.error('Error fetching users from Supabase:', error);
        setUserError(`Erreur lors du chargement des utilisateurs: ${error.message}`);
        return;
      }
      
      if (data) {
        setSupabaseUsers(data);
      }
    } catch (error) {
      console.error('Error in fetchSupabaseUsers:', error);
      setUserError(`Erreur inattendue: ${error.message}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un utilisateur.');
      return;
    }

    try {
      const memberId = await addCategoryMember({
        userId: selectedUserId,
        categoryId,
        role: selectedRole,
      });

      if (memberId) {
        await loadMembers();
        setShowAddMemberForm(false);
        setSelectedUserId('');
        setSelectedRole('membre');
      } else if (error) {
        Alert.alert('Erreur', error);
      }
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert('Erreur', "Impossible d'ajouter ce membre.");
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    try {
      await updateCategoryMember(selectedMember.id, {
        role: selectedRole,
      });

      await loadMembers();
      setShowEditMemberForm(false);
      setSelectedMember(null);
      setSelectedRole('membre');
    } catch (error) {
      console.error('Error updating member:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour ce membre.');
    }
  };

  const handleDeleteMember = (member: CategoryMember) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir retirer ${member.firstName || member.email} ${member.lastName || ''} de cette catégorie ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategoryMember(member.id);
              await loadMembers();
            } catch (error) {
              console.error('Error deleting member:', error);
              Alert.alert('Erreur', 'Impossible de supprimer ce membre.');
            }
          }
        }
      ]
    );
  };

  const handleEditMember = (member: CategoryMember) => {
    setSelectedMember(member);
    setSelectedRole(member.role);
    setShowEditMemberForm(true);
  };

  const getRoleBadgeColor = (role: CategoryMemberRole) => {
    switch (role) {
      case 'responsable':
        return theme.primary;
      case 'membre':
        return theme.info;
      case 'support':
        return theme.warning;
      default:
        return theme.inactive;
    }
  };

  const getRoleLabel = (role: CategoryMemberRole) => {
    switch (role) {
      case 'responsable':
        return 'Responsable';
      case 'membre':
        return 'Membre';
      case 'support':
        return 'Support';
      default:
        return role;
    }
  };

  // Filter users who are not already members
  const availableSupabaseUsers = supabaseUsers.filter(user => 
    !members.some(member => member.userId === user.id)
  );

  // Group members by role
  const membersByRole = members.reduce((acc, member) => {
    if (!acc[member.role]) {
      acc[member.role] = [];
    }
    acc[member.role].push(member);
    return acc;
  }, {} as Record<CategoryMemberRole, CategoryMember[]>);

  // Sort roles in order: responsable, membre, support
  const sortedRoles: CategoryMemberRole[] = ['responsable', 'membre', 'support'];

  // Create a flat list of members sorted by role
  const sortedMembers = sortedRoles.flatMap(role => 
    membersByRole[role] ? membersByRole[role] : []
  );

  const renderMemberItem = ({ item }: { item: CategoryMember }) => {
    // Try to get user details from the store first
    const storeUser = getUserById(item.userId);
    
    // If not found in store, look in the Supabase users
    const supabaseUser = !storeUser ? 
      supabaseUsers.find(user => user.id === item.userId) : null;
    
    // Combine data sources with fallbacks
    const memberWithUserDetails: CategoryMember = {
      ...item,
      firstName: storeUser?.firstName || supabaseUser?.firstName || '',
      lastName: storeUser?.lastName || supabaseUser?.lastName || '',
      email: storeUser?.email || supabaseUser?.email || item.email || '',
      avatarUrl: storeUser?.avatarUrl || '',
    };

    // Create a user object for the UserListItem component
    const userForDisplay: UserType = {
      id: item.userId,
      firstName: memberWithUserDetails.firstName,
      lastName: memberWithUserDetails.lastName,
      email: memberWithUserDetails.email,
      role: item.role as any, // Override user role with member role for display
      avatarUrl: memberWithUserDetails.avatarUrl,
      createdAt: '',
      updatedAt: '',
      isActive: true,
    };

    return (
      <View style={[styles.memberItem, { backgroundColor: theme.card }]}>
        <UserListItem
          user={userForDisplay}
          showContactInfo={false}
          showChevron={false}
        />
        
        <View style={styles.memberActions}>
          <TouchableOpacity
            style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) + '20' }]}
          >
            <Text style={[styles.roleBadgeText, { color: getRoleBadgeColor(item.role) }]}>
              {getRoleLabel(item.role)}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditMember(memberWithUserDetails)}
            >
              <Edit size={18} color={theme.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteMember(memberWithUserDetails)}
            >
              <Trash size={18} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Membres de la catégorie
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Category Info */}
          {category && (
            <View style={[styles.categoryInfo, { backgroundColor: theme.card }]}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.primary }]}>
                <Text style={styles.categoryEmoji}>{category.icon || '📁'}</Text>
              </View>
              <View style={styles.categoryDetails}>
                <Text style={[styles.categoryName, { color: theme.text }]}>
                  {category.name}
                </Text>
                {category.description && (
                  <Text 
                    style={[styles.categoryDescription, { color: darkMode ? theme.inactive : '#666666' }]}
                    numberOfLines={2}
                  >
                    {category.description}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Add Member Button */}
          {!showAddMemberForm && !showEditMemberForm && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowAddMemberForm(true)}
            >
              <UserPlus size={20} color="#FFFFFF" style={styles.addButtonIcon} />
              <Text style={styles.addButtonText}>Ajouter un membre</Text>
            </TouchableOpacity>
          )}

          {/* Add Member Form */}
          {showAddMemberForm && (
            <View style={styles.formContainer}>
              <Text style={[styles.formTitle, { color: theme.text }]}>
                Ajouter un membre
              </Text>
              
              <Text style={[styles.label, { color: theme.text }]}>Utilisateur</Text>
              
              {loadingUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.text }]}>
                    Chargement des utilisateurs...
                  </Text>
                </View>
              ) : userError ? (
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { color: theme.error }]}>
                    {userError}
                  </Text>
                  <Button 
                    title="Réessayer" 
                    onPress={fetchSupabaseUsers} 
                    variant="outline"
                    style={styles.retryButton}
                  />
                </View>
              ) : (
                <Picker
                  items={availableSupabaseUsers.map(user => ({
                    label: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                    value: user.id,
                  }))}
                  selectedValue={selectedUserId}
                  onValueChange={setSelectedUserId}
                  placeholder="Sélectionner un utilisateur"
                />
              )}
              
              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Rôle</Text>
              <Picker
                items={[
                  { label: 'Responsable', value: 'responsable' },
                  { label: 'Membre', value: 'membre' },
                  { label: 'Support', value: 'support' },
                ]}
                selectedValue={selectedRole}
                onValueChange={(value) => setSelectedRole(value as CategoryMemberRole)}
                placeholder="Sélectionner un rôle"
              />
              
              <View style={styles.formButtons}>
                <Button
                  title="Annuler"
                  onPress={() => {
                    setShowAddMemberForm(false);
                    setSelectedUserId('');
                    setSelectedRole('membre');
                    setError(null);
                  }}
                  variant="outline"
                  style={styles.cancelButton}
                />
                <Button
                  title="Ajouter"
                  onPress={handleAddMember}
                  loading={isLoading}
                  disabled={!selectedUserId || loadingUsers}
                />
              </View>
              
              {error && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {error}
                </Text>
              )}
            </View>
          )}

          {/* Edit Member Form */}
          {showEditMemberForm && selectedMember && (
            <View style={styles.formContainer}>
              <Text style={[styles.formTitle, { color: theme.text }]}>
                Modifier le rôle
              </Text>
              
              <View style={styles.selectedUserInfo}>
                <User size={20} color={theme.primary} style={styles.userIcon} />
                <Text style={[styles.selectedUserName, { color: theme.text }]}>
                  {selectedMember.firstName || ''} {selectedMember.lastName || ''}
                  {!selectedMember.firstName && !selectedMember.lastName && selectedMember.email}
                </Text>
              </View>
              
              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Rôle</Text>
              <Picker
                items={[
                  { label: 'Responsable', value: 'responsable' },
                  { label: 'Membre', value: 'membre' },
                  { label: 'Support', value: 'support' },
                ]}
                selectedValue={selectedRole}
                onValueChange={(value) => setSelectedRole(value as CategoryMemberRole)}
                placeholder="Sélectionner un rôle"
              />
              
              <View style={styles.formButtons}>
                <Button
                  title="Annuler"
                  onPress={() => {
                    setShowEditMemberForm(false);
                    setSelectedMember(null);
                    setSelectedRole('membre');
                    setError(null);
                  }}
                  variant="outline"
                  style={styles.cancelButton}
                />
                <Button
                  title="Mettre à jour"
                  onPress={handleUpdateMember}
                  loading={isLoading}
                />
              </View>
              
              {error && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {error}
                </Text>
              )}
            </View>
          )}

          {/* Members List */}
          {!showAddMemberForm && !showEditMemberForm && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {members.length} {members.length > 1 ? 'membres' : 'membre'}
              </Text>
              
              {isLoading || refreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : (
                <FlatList
                  data={sortedMembers}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMemberItem}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <EmptyState
                      title="Aucun membre"
                      message="Cette catégorie n'a pas encore de membres."
                      icon={<Users size={48} color={theme.inactive} />}
                      style={styles.emptyState}
                    />
                  }
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
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
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  memberItem: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  memberActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
  emptyState: {
    padding: 20,
  },
  formContainer: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    marginRight: 12,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userIcon: {
    marginRight: 8,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: '500',
  },
});