import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Edit, User, Mail, Phone, ChevronRight, Settings, UserCog } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ListItem } from '@/components/ListItem';
import { Divider } from '@/components/Divider';
import { AppLayout } from '@/components/AppLayout';
import { User as UserType } from '@/types/user';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getEditableProfiles, getUserByEditableBy } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [editableProfiles, setEditableProfiles] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the user's own profile from directory if it exists
  const ownProfile = user ? getUserByEditableBy(user.id) : undefined;
  
  useEffect(() => {
    if (user) {
      // Get profiles that this user can edit
      const profiles = getEditableProfiles(user.id);
      setEditableProfiles(profiles.filter((p: UserType) => p.id !== ownProfile?.id)); // Exclude own profile
      setIsLoading(false);
    }
  }, [user]);
  
  const handleEditProfile = () => {
    router.push('/profile/edit');
  };
  
  const handleChangePassword = () => {
    router.push('/profile/change-password');
  };
  
  const handleSettings = () => {
    router.push('/settings');
  };
  
  const handleViewProfile = (profileId: string) => {
    router.push(`/user/${profileId}`);
  };
  
  const handleEditDirectoryProfile = (profileId: string) => {
    router.push({
      pathname: '/admin/user-form',
      params: { id: profileId }
    });
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
        return "Membre de l'association";
    }
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
  
  if (!user) {
    return (
      <AppLayout hideMenuButton={true}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
          <Header title="Profil" />
          <View style={styles.notLoggedInContainer}>
            <Text style={[styles.notLoggedInText, { color: theme.text }]}>
              Vous devez être connecté pour accéder à votre profil.
            </Text>
          </View>
        </SafeAreaView>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout hideMenuButton={true}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header 
          title="Mon profil" 
          rightComponent={
            <TouchableOpacity onPress={handleSettings} style={styles.settingsButton}>
              <Settings size={24} color={theme.text} />
            </TouchableOpacity>
          }
        />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileHeader}>
            <Avatar
              source={user.profileImage ? { uri: user.profileImage } : undefined}
              name={`${user.firstName} ${user.lastName}`}
              size={100}
            />
            <Text style={[styles.userName, { color: theme.text }]}>
              {user.firstName} {user.lastName}
            </Text>
            <Badge
              label={getRoleLabel(user.role)}
              variant={getRoleBadgeVariant(user.role)}
              size="medium"
              style={styles.roleBadge}
            />
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: theme.primary }]}
              onPress={handleEditProfile}
            >
              <Edit size={16} color="#FFFFFF" style={styles.editIcon} />
              <Text style={styles.editButtonText}>Modifier mon profil</Text>
            </TouchableOpacity>
          </View>
          <Card style={styles.infoCard}>
            <View style={styles.infoItem}>
              <User size={20} color={theme.primary} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Nom complet
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {user.firstName} {user.lastName}
                </Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Mail size={20} color={theme.primary} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Email
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {user.email}
                </Text>
              </View>
            </View>
            {user.phone && (
              <View style={styles.infoItem}>
                <Phone size={20} color={theme.primary} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Téléphone
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {user.phone}
                  </Text>
                </View>
              </View>
            )}
          </Card>
          <Card style={styles.actionsCard}>
            <ListItem
              title="Modifier mon profil"
              leftIcon={<Edit size={20} color={theme.primary} />}
              showChevron
              onPress={handleEditProfile}
            />
            <ListItem
              title="Changer mon mot de passe"
              leftIcon={<UserCog size={20} color={theme.primary} />}
              showChevron
              onPress={handleChangePassword}
            />
          </Card>
          {/* Own directory profile section */}
          {ownProfile && (
            <Card style={styles.directoryCard}>
              <Text style={[styles.directoryTitle, { color: theme.text }]}>
                Mon profil dans l'annuaire
              </Text>
              <TouchableOpacity 
                style={styles.directoryProfile}
                onPress={() => handleViewProfile(ownProfile.id)}
              >
                <Avatar
                  source={ownProfile.avatarUrl ? { uri: ownProfile.avatarUrl } : undefined}
                  name={`${ownProfile.firstName} ${ownProfile.lastName}`}
                  size={50}
                />
                <View style={styles.directoryProfileInfo}>
                  <Text style={[styles.directoryProfileName, { color: theme.text }]}>
                    {ownProfile.firstName} {ownProfile.lastName}
                  </Text>
                  <Badge
                    label={getRoleLabel(ownProfile.role)}
                    variant={getRoleBadgeVariant(ownProfile.role)}
                    size="small"
                  />
                </View>
                <TouchableOpacity 
                  style={styles.directoryEditButton}
                  onPress={() => handleEditDirectoryProfile(ownProfile.id)}
                >
                  <Edit size={18} color={theme.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            </Card>
          )}
          {/* Editable profiles section */}
          {editableProfiles.length > 0 && (
            <Card style={styles.directoryCard}>
              <Text style={[styles.directoryTitle, { color: theme.text }]}>
                Profils que je peux modifier
              </Text>
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
              ) : (
                editableProfiles.map(profile => (
                  <TouchableOpacity 
                    key={profile.id}
                    style={[
                      styles.directoryProfile,
                      { borderBottomColor: theme.border },
                      profile === editableProfiles[editableProfiles.length - 1] && styles.lastDirectoryProfile
                    ]}
                    onPress={() => handleViewProfile(profile.id)}
                  >
                    <Avatar
                      source={profile.avatarUrl ? { uri: profile.avatarUrl } : undefined}
                      name={`${profile.firstName} ${profile.lastName}`}
                      size={50}
                    />
                    <View style={styles.directoryProfileInfo}>
                      <Text style={[styles.directoryProfileName, { color: theme.text }]}>
                        {profile.firstName} {profile.lastName}
                      </Text>
                      <Badge
                        label={getRoleLabel(profile.role)}
                        variant={getRoleBadgeVariant(profile.role)}
                        size="small"
                      />
                    </View>
                    <TouchableOpacity 
                      style={styles.directoryEditButton}
                      onPress={() => handleEditDirectoryProfile(profile.id)}
                    >
                      <Edit size={18} color={theme.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notLoggedInText: {
    fontSize: 16,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  roleBadge: {
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editIcon: {
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionsCard: {
    marginBottom: 16,
  },
  directoryCard: {
    marginBottom: 16,
  },
  directoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  directoryProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  lastDirectoryProfile: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  directoryProfileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  directoryProfileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  directoryEditButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  loader: {
    marginVertical: 16,
  },
});