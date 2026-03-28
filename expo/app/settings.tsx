import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Switch, 
  Alert,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  Moon, 
  Sun, 
  LogOut, 
  Lock, 
  Bug,
  AlertTriangle,
  Shield,
  Users,
  Settings as SettingsIcon,
  Link,
  Bell,
  Palette,
  BarChart3,
  Database,
  UserCircle,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { ListItem } from '@/components/ListItem';
import { Divider } from '@/components/Divider';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Badge } from '@/components/Badge';
import { AppLayout } from '@/components/AppLayout';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | undefined>(undefined);
  
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ]
    );
  };
  
  const handleProfile = () => {
    router.push('/profile');
  };
  
  const handleEditProfile = () => {
    router.push('/profile/edit');
  };
  
  const handleChangePassword = () => {
    router.push('/profile/change-password');
  };
  
  const handleReportBug = () => {
    setShowBugReport(true);
    setReportSent(false);
  };
  
  const sendBugReport = async () => {
    if (!bugDescription.trim()) {
      Alert.alert('Erreur', 'Veuillez décrire le problème rencontré.');
      return;
    }
    
    setIsSendingReport(true);
    
    try {
      // Dans une vraie application, vous enverriez ceci à un serveur
      // Ici, nous simulons l'envoi d'un email
      const emailSubject = encodeURIComponent('Bug Report - Mystéria Event App');
      const emailBody = encodeURIComponent(`
Description du bug:
${bugDescription}

Informations utilisateur:
Nom: ${user?.firstName} ${user?.lastName}
ID: ${user?.id}
Rôle: ${user?.role}
      `);
      
      // Sur un appareil réel, cela ouvrirait l'application email
      if (Platform.OS !== 'web') {
        const url = `mailto:kevin.perret@mysteriaevent.ch?subject=${emailSubject}&body=${emailBody}`;
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
        }
      }
      
      // Simuler un délai pour l'envoi
      setTimeout(() => {
        setIsSendingReport(false);
        setReportSent(true);
        setBugDescription('');
      }, 1000);
    } catch (error) {
      console.error('Error sending bug report:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi du rapport.');
      setIsSendingReport(false);
    }
  };
  
  const closeBugReport = () => {
    setShowBugReport(false);
    setBugDescription('');
  };

  const toggleAdminPanel = () => {
    setShowAdminPanel(!showAdminPanel);
  };

  const navigateToAdminSection = (path: string) => {
    router.push(path);
  };

  const getRoleBadgeVariant = (role: string): 'primary' | 'secondary' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'admin':
        return 'primary';
      case 'moderator':
        return 'secondary';
      case 'committee':
        return 'info';
      default:
        return 'info';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'moderator':
        return 'Modérateur';
      case 'committee':
        return 'Comité';
      case 'actor':
        return 'Comédien';
      case 'technician':
        return 'Régie';
      case 'runner':
        return 'Runner';
      default:
        return 'Membre';
    }
  };

  // Récupérer les groupes de l'utilisateur
  const userGroups = user?.userGroups || [];

  const getGroupName = (groupId: string): string => {
    // Ici, vous pourriez récupérer le nom du groupe depuis votre store de ressources
    // Pour l'exemple, nous utilisons simplement l'ID
    return groupId || 'Groupe inconnu';
  };

  const getRoleInGroupName = (roleId: string): string => {
    switch (roleId) {
      case 'responsible':
        return 'Responsable';
      case 'member':
        return 'Membre';
      case 'support':
        return 'Membre support';
      default:
        return roleId;
    }
  };

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  // Callback to receive the toggleSidebar function from AppLayout
  const handleSidebarToggle = useCallback((toggle: () => void) => {
    setToggleSidebar(() => toggle);
  }, []);
  
  if (showBugReport) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Signaler un bug"
          showBackButton={true}
          onBackPress={closeBugReport}
          noLeftMargin={true}
        />
        
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {reportSent ? (
              <View style={styles.reportSentContainer}>
                <AlertTriangle size={64} color={theme.success} style={styles.reportSentIcon} />
                <Text style={[styles.reportSentTitle, { color: theme.text }]}>
                  Merci pour votre signalement !
                </Text>
                <Text style={[styles.reportSentMessage, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Il sera traité dans les plus brefs délais.
                </Text>
                <Button
                  title="Retour aux réglages"
                  onPress={closeBugReport}
                  style={styles.reportSentButton}
                />
              </View>
            ) : (
              <>
                <View style={styles.bugReportHeader}>
                  <Bug size={24} color={theme.primary} />
                  <Text style={[styles.bugReportTitle, { color: theme.text }]}>
                    Décrivez le problème rencontré
                  </Text>
                </View>
                
                <Text style={[styles.bugReportDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Veuillez fournir autant de détails que possible pour nous aider à résoudre le problème.
                </Text>
                
                <View style={[
                  styles.textAreaContainer, 
                  { 
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.border 
                  }
                ]}>
                  <TextInput
                    style={[styles.textArea, { color: theme.text }]}
                    placeholder="Décrivez le bug ici..."
                    placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    value={bugDescription}
                    onChangeText={setBugDescription}
                  />
                </View>
                
                <Button
                  title="Envoyer le rapport"
                  onPress={sendBugReport}
                  loading={isSendingReport}
                  style={styles.sendReportButton}
                  fullWidth
                />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (showAdminPanel) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Panneau d'administration"
          showBackButton={true}
          onBackPress={toggleAdminPanel}
          noLeftMargin={true}
        />
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.adminPanelSection}>
            <Text style={[styles.adminPanelTitle, { color: theme.text }]}>
              Statut du compte
            </Text>
            
            <View style={styles.roleInfoContainer}>
              <Badge
                label={getRoleLabel(user?.role || 'other')}
                variant={getRoleBadgeVariant(user?.role || 'other')}
                size="medium"
                style={styles.roleBadge}
              />
              
              <Text style={[styles.roleDescription, { color: theme.text }]}>
                {user?.role === 'admin' && "Vous avez un accès complet à toutes les fonctionnalités de l'application."}
                {user?.role === 'moderator' && "Vous pouvez gérer les utilisateurs et le contenu, mais certaines fonctions administratives sont limitées."}
                {user?.role !== 'admin' && user?.role !== 'moderator' && "Vous avez un accès limité aux fonctionnalités de l'application."}
              </Text>
            </View>
          </View>
          
          <Divider />
          
          {isAdminOrModerator && (
            <>
              <View style={styles.adminPanelSection}>
                <Text style={[styles.adminPanelTitle, { color: theme.text }]}>
                  Outils d'administration
                </Text>
                
                <View style={styles.adminToolsGrid}>
                  <Pressable
                    style={[styles.adminToolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => navigateToAdminSection('/admin/database')}
                  >
                    <Database size={24} color={appColors.primary} style={styles.adminToolIcon} />
                    <Text style={[styles.adminToolTitle, { color: theme.text }]}>
                      Base de données
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.adminToolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => navigateToAdminSection('/admin/user-form')}
                  >
                    <Users size={24} color={appColors.primary} style={styles.adminToolIcon} />
                    <Text style={[styles.adminToolTitle, { color: theme.text }]}>
                      Utilisateurs
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.adminToolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => navigateToAdminSection('/admin/categories')}
                  >
                    <SettingsIcon size={24} color={appColors.primary} style={styles.adminToolIcon} />
                    <Text style={[styles.adminToolTitle, { color: theme.text }]}>
                      Catégories
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.adminToolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => navigateToAdminSection('/admin/links')}
                  >
                    <Link size={24} color={appColors.primary} style={styles.adminToolIcon} />
                    <Text style={[styles.adminToolTitle, { color: theme.text }]}>
                      Liens
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.adminToolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => navigateToAdminSection('/admin/notifications')}
                  >
                    <Bell size={24} color={appColors.primary} style={styles.adminToolIcon} />
                    <Text style={[styles.adminToolTitle, { color: theme.text }]}>
                      Notifications
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[styles.adminToolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => navigateToAdminSection('/admin/appearance')}
                  >
                    <Palette size={24} color={appColors.primary} style={styles.adminToolIcon} />
                    <Text style={[styles.adminToolTitle, { color: theme.text }]}>
                      Apparence
                    </Text>
                  </Pressable>
                  
                  {user?.role === 'admin' && (
                    <>
                      <Pressable
                        style={[styles.adminToolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => navigateToAdminSection('/admin/stats')}
                      >
                        <BarChart3 size={24} color={appColors.primary} style={styles.adminToolIcon} />
                        <Text style={[styles.adminToolTitle, { color: theme.text }]}>
                          Statistiques
                        </Text>
                      </Pressable>
                      
                      <Pressable
                        style={[styles.adminToolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => navigateToAdminSection('/admin/settings')}
                      >
                        <SettingsIcon size={24} color={appColors.primary} style={styles.adminToolIcon} />
                        <Text style={[styles.adminToolTitle, { color: theme.text }]}>
                          Paramètres
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
              
              <Divider />
            </>
          )}
          
          <View style={styles.adminPanelSection}>
            <Text style={[styles.adminPanelTitle, { color: theme.text }]}>
              Permissions
            </Text>
            
            <View style={styles.permissionsContainer}>
              <View style={styles.permissionItem}>
                <Text style={[styles.permissionTitle, { color: theme.text }]}>
                  Gestion des utilisateurs
                </Text>
                <Text style={[styles.permissionStatus, { color: isAdminOrModerator ? theme.success : theme.error }]}>
                  {isAdminOrModerator ? "Autorisé" : "Non autorisé"}
                </Text>
              </View>
              
              <View style={styles.permissionItem}>
                <Text style={[styles.permissionTitle, { color: theme.text }]}>
                  Gestion des catégories
                </Text>
                <Text style={[styles.permissionStatus, { color: isAdminOrModerator ? theme.success : theme.error }]}>
                  {isAdminOrModerator ? "Autorisé" : "Non autorisé"}
                </Text>
              </View>
              
              <View style={styles.permissionItem}>
                <Text style={[styles.permissionTitle, { color: theme.text }]}>
                  Gestion des liens
                </Text>
                <Text style={[styles.permissionStatus, { color: isAdminOrModerator ? theme.success : theme.error }]}>
                  {isAdminOrModerator ? "Autorisé" : "Non autorisé"}
                </Text>
              </View>
              
              <View style={styles.permissionItem}>
                <Text style={[styles.permissionTitle, { color: theme.text }]}>
                  Envoi de notifications
                </Text>
                <Text style={[styles.permissionStatus, { color: isAdminOrModerator ? theme.success : theme.error }]}>
                  {isAdminOrModerator ? "Autorisé" : "Non autorisé"}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  return (
    <AppLayout hideMenuButton={true} onSidebarToggle={handleSidebarToggle}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text 
            style={[styles.title, { color: theme.text }]}
            onPress={toggleSidebar ? toggleSidebar : undefined}
          >
            Réglages ⚙️
          </Text>
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {user && (
            <View style={styles.profileSection}>
              <Avatar
                source={user.profileImage ? { uri: user.profileImage } : undefined}
                name={`${user.firstName} ${user.lastName}`}
                size={80}
              />
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>
                  {user.firstName} {user.lastName}
                </Text>
                <Badge
                  label={getRoleLabel(user.role)}
                  variant={getRoleBadgeVariant(user.role)}
                  size="small"
                  style={styles.roleBadge}
                />
                
                {/* Affichage des groupes et rôles de l'utilisateur */}
                {userGroups.length > 0 && (
                  <View style={styles.groupsContainer}>
                    {userGroups.map((group, index) => (
                      <View key={index} style={styles.groupItem}>
                        <Text style={[styles.groupName, { color: theme.text }]}>
                          {getGroupName(group.groupId)}
                        </Text>
                        <Text style={[styles.groupRole, { color: darkMode ? theme.inactive : '#666666' }]}>
                          {getRoleInGroupName(group.roleId)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Compte</Text>
            
            <ListItem
              title="Mon profil"
              leftIcon={<UserCircle size={20} color={theme.primary} />}
              showChevron
              onPress={handleProfile}
            />
            
            <ListItem
              title="Modifier mon profil"
              leftIcon={<User size={20} color={theme.primary} />}
              showChevron
              onPress={handleEditProfile}
            />
            
            <ListItem
              title="Changer le mot de passe"
              leftIcon={<Lock size={20} color={theme.primary} />}
              showChevron
              onPress={handleChangePassword}
            />

            {(user?.role === 'admin' || user?.role === 'moderator') && (
              <ListItem
                title="Panneau d'administration"
                leftIcon={<Shield size={20} color={theme.primary} />}
                showChevron
                onPress={toggleAdminPanel}
              />
            )}
          </View>
          
          <Divider />
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Apparence</Text>
            
            <ListItem
              title="Mode sombre"
              leftIcon={darkMode ? <Moon size={20} color={theme.primary} /> : <Sun size={20} color={theme.primary} />}
              rightIcon={
                <Switch
                  value={darkMode}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: '#767577', true: `${theme.primary}80` }}
                  thumbColor={darkMode ? theme.primary : '#f4f3f4'}
                />
              }
            />
          </View>
          
          <Divider />
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Support</Text>
            
            <ListItem
              title="Signaler un bug"
              leftIcon={<Bug size={20} color={theme.primary} />}
              showChevron
              onPress={handleReportBug}
            />
            
            <ListItem
              title="Contacter l'administrateur"
              leftIcon={<AlertTriangle size={20} color={theme.primary} />}
              showChevron
              onPress={() => Linking.openURL('mailto:kevin.perret@mysteriaevent.ch')}
            />
          </View>
          
          <Divider />
          
          <View style={styles.section}>
            <ListItem
              title="Se déconnecter"
              leftIcon={<LogOut size={20} color={theme.error} />}
              titleStyle={{ color: theme.error }}
              onPress={handleLogout}
            />
          </View>
          
          <View style={styles.footer}>
            <Text style={[styles.version, { color: darkMode ? theme.inactive : '#999999' }]}>
              Version 1.0.0
            </Text>
            <Text style={[styles.copyright, { color: darkMode ? theme.inactive : '#999999' }]}>
              © {new Date().getFullYear()} Mystéria Event
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleBadge: {
    marginBottom: 8,
  },
  groupsContainer: {
    marginTop: 8,
  },
  groupItem: {
    marginBottom: 4,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '500',
  },
  groupRole: {
    fontSize: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  version: {
    fontSize: 14,
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  bugReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bugReportTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  bugReportDescription: {
    fontSize: 14,
    marginBottom: 24,
  },
  textAreaContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 24,
  },
  textArea: {
    padding: 12,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  sendReportButton: {
    marginBottom: 24,
  },
  reportSentContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  reportSentIcon: {
    marginBottom: 24,
  },
  reportSentTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  reportSentMessage: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  reportSentButton: {
    minWidth: 200,
  },
  // Admin panel styles
  adminPanelSection: {
    padding: 20,
  },
  adminPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  roleInfoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  roleDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
  permissionsContainer: {
    marginTop: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  permissionTitle: {
    fontSize: 16,
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  adminButton: {
    marginTop: 16,
  },
  backButton: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  // Admin tools grid
  adminToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  adminToolCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  adminToolIcon: {
    marginBottom: 12,
  },
  adminToolTitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});