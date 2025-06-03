import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Trash,
  ExternalLink,
} from 'lucide-react-native';
import { useUsersStore } from '@/store/users-store';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/utils/date-utils';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const { user: currentUser } = useAuthStore();
  const { getUserById, deleteUser } = useUsersStore();
  
  const [user, setUser] = useState(getUserById(id));
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const foundUser = getUserById(id);
    setUser(foundUser);
  }, [id]);
  
  const isCurrentUser = currentUser?.id === user?.id;
  const isAdminOrModerator = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const canEdit = isCurrentUser || isAdminOrModerator || (user && user.editable_by === currentUser?.id);
  const canDelete = isAdminOrModerator && !isCurrentUser;
  
  const handleEdit = () => {
    if (isCurrentUser) {
      router.push('/profile/edit');
    } else {
      router.push({
        pathname: '/admin/user-form',
        params: { id: user?.id }
      });
    }
  };
  
  const handleDelete = () => {
    if (!user) return;
    
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer le profil de ${user.firstName} ${user.lastName} ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await deleteUser(user.id);
              Alert.alert('Succès', 'Utilisateur supprimé avec succès.');
              router.push('/(tabs)/directory');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };
  
  const handleContact = (type: 'email' | 'phone', value: string) => {
    const url = type === 'email' ? `mailto:${value}` : `tel:${value}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', `Impossible d'ouvrir ${type === 'email' ? 'l\'email' : 'le téléphone'}.`);
    });
  };
  
  const getRoleBadgeVariant = (role: string): 'primary' | 'secondary' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'admin':
        return 'primary';
      case 'committee':
        return 'secondary';
      case 'actor':
        return 'info';
      case 'partner':
        return 'warning';
      default:
        return 'info';
    }
  };
  
  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'committee':
        return 'Membre du comité';
      case 'actor':
        return 'Comédien';
      case 'partner':
        return 'Partenaire';
      default:
        return 'Membre';
    }
  };

  const navigateBack = () => {
    // Always go back to directory tab to maintain tab context
    router.push('/(tabs)/directory');
  };
  
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Header 
          title="Profil introuvable"
          showBackButton
          onBackPress={navigateBack}
        />
        <EmptyState
          title="Utilisateur introuvable"
          message="L'utilisateur que vous recherchez n'existe pas ou a été supprimé."
          icon="user"
          actionLabel="Retour à l'annuaire"
          onAction={navigateBack}
        />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        title="Profil"
        showBackButton
        onBackPress={navigateBack}
        rightComponent={
          canEdit ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              disabled={isLoading}
            >
              <Edit size={20} color={theme.text} />
            </TouchableOpacity>
          ) : null
        }
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
              name={`${user.firstName} ${user.lastName}`}
              size={80}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: theme.text }]}>
                {user.firstName} {user.lastName}
              </Text>
              <Badge
                label={getRoleLabel(user.role)}
                variant={getRoleBadgeVariant(user.role)}
                style={styles.roleBadge}
              />
              {user.bio && (
                <Text style={[styles.bio, { color: theme.inactive }]}>
                  {user.bio}
                </Text>
              )}
            </View>
          </View>
        </Card>
        
        {/* Contact Information */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Contact
          </Text>
          
          {user.email && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleContact('email', user.email)}
            >
              <Mail size={20} color={theme.primary} />
              <Text style={[styles.contactText, { color: theme.text }]}>
                {user.email}
              </Text>
              <ExternalLink size={16} color={theme.inactive} />
            </TouchableOpacity>
          )}
          
          {user.phone && (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleContact('phone', user.phone)}
            >
              <Phone size={20} color={theme.primary} />
              <Text style={[styles.contactText, { color: theme.text }]}>
                {user.phone}
              </Text>
              <ExternalLink size={16} color={theme.inactive} />
            </TouchableOpacity>
          )}
          
          {user.address && (
            <View style={styles.contactItem}>
              <MapPin size={20} color={theme.primary} />
              <Text style={[styles.contactText, { color: theme.text }]}>
                {user.address}
              </Text>
            </View>
          )}
        </Card>
        
        {/* Additional Information */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Informations
          </Text>
          
          <View style={styles.infoItem}>
            <Calendar size={20} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              Membre depuis le {formatDate(user.createdAt)}
            </Text>
          </View>
          
          {user.birthDate && (
            <View style={styles.infoItem}>
              <Calendar size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                Né(e) le {formatDate(user.birthDate)}
              </Text>
            </View>
          )}
        </Card>
        
        {/* Admin Actions */}
        {canDelete && (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Actions administrateur
            </Text>
            
            <Button
              title="Supprimer l'utilisateur"
              onPress={handleDelete}
              variant="outline"
              style={[styles.deleteButton, { borderColor: theme.error }]}
              textStyle={{ color: theme.error }}
              leftIcon={<Trash size={16} color={theme.error} />}
              loading={isLoading}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    margin: 16,
    marginBottom: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
  },
  deleteButton: {
    margin: 16,
    marginTop: 0,
  },
});