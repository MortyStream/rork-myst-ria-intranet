import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  Lock, 
  Bell, 
  Palette, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { Avatar } from '@/components/Avatar';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode, appName, appVersion } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Se déconnecter', 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          }
        }
      ]
    );
  };
  
  const settingsItems = [
    {
      id: 'profile',
      title: 'Mon profil',
      subtitle: 'Modifier mes informations personnelles',
      icon: <User size={24} color={theme.primary} />,
      onPress: () => router.push('/profile/edit'),
      showChevron: true,
    },
    {
      id: 'password',
      title: 'Mot de passe',
      subtitle: 'Changer mon mot de passe',
      icon: <Lock size={24} color={theme.primary} />,
      onPress: () => router.push('/profile/change-password'),
      showChevron: true,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Gérer mes préférences de notification',
      icon: <Bell size={24} color={theme.primary} />,
      onPress: () => router.push('/notifications'),
      showChevron: true,
    },
    {
      id: 'appearance',
      title: 'Apparence',
      subtitle: 'Thème sombre',
      icon: darkMode ? <Moon size={24} color={theme.primary} /> : <Sun size={24} color={theme.primary} />,
      onPress: toggleDarkMode,
      showChevron: false,
      rightComponent: (
        <Switch
          value={darkMode}
          onValueChange={toggleDarkMode}
          trackColor={{ false: '#767577', true: `${theme.primary}80` }}
          thumbColor={darkMode ? theme.primary : '#f4f3f4'}
        />
      ),
    },
  ];
  
  const adminItems = [
    {
      id: 'admin-panel',
      title: 'Panneau d\'administration',
      subtitle: 'Gérer l\'application',
      icon: <Shield size={24} color={theme.secondary} />,
      onPress: () => router.push('/admin'),
      showChevron: true,
    },
  ];
  
  const supportItems = [
    {
      id: 'help',
      title: 'Aide et support',
      subtitle: 'Obtenir de l\'aide',
      icon: <HelpCircle size={24} color={theme.info} />,
      onPress: () => {
        Alert.alert('Aide', 'Contactez l\'administrateur pour obtenir de l\'aide.');
      },
      showChevron: true,
    },
    {
      id: 'logout',
      title: 'Se déconnecter',
      subtitle: 'Quitter l\'application',
      icon: <LogOut size={24} color={theme.error} />,
      onPress: handleLogout,
      showChevron: false,
      isDestructive: true,
    },
  ];
  
  const renderSettingsItem = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.settingsItem,
        item.isDestructive && { backgroundColor: `${theme.error}10` }
      ]}
      onPress={item.onPress}
    >
      <View style={styles.settingsItemLeft}>
        {item.icon}
        <View style={styles.settingsItemText}>
          <Text 
            style={[
              styles.settingsItemTitle, 
              { color: item.isDestructive ? theme.error : theme.text }
            ]}
          >
            {item.title}
          </Text>
          <Text 
            style={[
              styles.settingsItemSubtitle, 
              { color: item.isDestructive ? theme.error : (darkMode ? theme.inactive : '#666666') }
            ]}
          >
            {item.subtitle}
          </Text>
        </View>
      </View>
      
      <View style={styles.settingsItemRight}>
        {item.rightComponent}
        {item.showChevron && (
          <ChevronRight 
            size={20} 
            color={item.isDestructive ? theme.error : (darkMode ? theme.inactive : '#999999')} 
          />
        )}
      </View>
    </TouchableOpacity>
  );
  
  return (
    <AppLayout 
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Réglages ⚙️"
          onTitlePress={() => toggleSidebar?.()}
          containerStyle={styles.headerContainer}
        />
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Card */}
          {user && (
            <Card style={styles.profileCard}>
              <TouchableOpacity 
                style={styles.profileContent}
                onPress={() => router.push('/profile/edit')}
              >
                <Avatar
                  source={user.profileImage ? { uri: user.profileImage } : undefined}
                  name={`${user.firstName} ${user.lastName}`}
                  size={60}
                />
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: theme.text }]}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text style={[styles.profileEmail, { color: darkMode ? theme.inactive : '#666666' }]}>
                    {user.email}
                  </Text>
                  <Text style={[styles.profileRole, { color: theme.primary }]}>
                    {user.role === 'admin' ? 'Administrateur' : 
                     user.role === 'moderator' ? 'Modérateur' : 
                     user.role === 'committee' ? 'Membre du comité' : 'Membre'}
                  </Text>
                </View>
                <ChevronRight size={20} color={darkMode ? theme.inactive : '#999999'} />
              </TouchableOpacity>
            </Card>
          )}
          
          {/* General Settings */}
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Général
            </Text>
            {settingsItems.map((item, index) => (
              <View key={item.id}>
                {renderSettingsItem(item)}
                {index < settingsItems.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Card>
          
          {/* Admin Settings */}
          {isAdminOrModerator && (
            <Card style={styles.settingsCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Administration
              </Text>
              {adminItems.map((item, index) => (
                <View key={item.id}>
                  {renderSettingsItem(item)}
                  {index < adminItems.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))}
            </Card>
          )}
          
          {/* Support Settings */}
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Support
            </Text>
            {supportItems.map((item, index) => (
              <View key={item.id}>
                {renderSettingsItem(item)}
                {index < supportItems.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Card>
          
          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={[styles.appInfoText, { color: darkMode ? theme.inactive : '#666666' }]}>
              {appName} v{appVersion}
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
  headerContainer: {
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  settingsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemText: {
    marginLeft: 16,
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 14,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    marginHorizontal: 16,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appInfoText: {
    fontSize: 12,
  },
});