import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, 
  Bell, 
  Moon, 
  Sun, 
  Palette, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { ListItem } from '@/components/ListItem';
import { Divider } from '@/components/Divider';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode, notifications, toggleNotifications } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);

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

  const settingsGroups = [
    {
      title: 'Profil',
      items: [
        {
          icon: <User size={20} color={theme.text} />,
          title: 'Mon profil',
          subtitle: 'Modifier vos informations personnelles',
          onPress: () => router.push('/profile'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'Préférences',
      items: [
        {
          icon: darkMode ? <Moon size={20} color={theme.text} /> : <Sun size={20} color={theme.text} />,
          title: 'Mode sombre',
          subtitle: 'Activer le thème sombre',
          rightComponent: (
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: theme.border, true: appColors.primary }}
              thumbColor={darkMode ? '#ffffff' : '#f4f3f4'}
            />
          ),
        },
        {
          icon: <Bell size={20} color={theme.text} />,
          title: 'Notifications',
          subtitle: 'Recevoir des notifications push',
          rightComponent: (
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: theme.border, true: appColors.primary }}
              thumbColor={notifications ? '#ffffff' : '#f4f3f4'}
            />
          ),
        },
        {
          icon: <Palette size={20} color={theme.text} />,
          title: 'Apparence',
          subtitle: 'Personnaliser l\'interface',
          onPress: () => router.push('/admin/appearance'),
          showChevron: true,
        },
      ],
    },
  ];

  // Add admin settings if user is admin
  if (user?.role === 'admin') {
    settingsGroups.push({
      title: 'Administration',
      items: [
        {
          icon: <Shield size={20} color={theme.text} />,
          title: 'Panneau d\'administration',
          subtitle: 'Gérer l\'application',
          onPress: () => router.push('/admin'),
          showChevron: true,
        },
      ],
    });
  }

  settingsGroups.push({
    title: 'Support',
    items: [
      {
        icon: <HelpCircle size={20} color={theme.text} />,
        title: 'Aide et support',
        subtitle: 'Obtenir de l\'aide',
        onPress: () => Alert.alert('Aide', 'Fonctionnalité à venir'),
        showChevron: true,
      },
    ],
  });

  settingsGroups.push({
    title: 'Compte',
    items: [
      {
        icon: <LogOut size={20} color="#e03131" />,
        title: 'Déconnexion',
        subtitle: 'Se déconnecter de l\'application',
        onPress: handleLogout,
        titleColor: '#e03131',
      },
    ],
  });

  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header
          title="Réglages ⚙️"
          onTitlePress={() => toggleSidebar?.()}
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info Card */}
          {user && (
            <Card style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={[styles.userAvatar, { backgroundColor: appColors.primary }]}>
                  <Text style={styles.userInitials}>
                    {user.firstName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    {user.lastName?.[0]?.toUpperCase() || ''}
                  </Text>
                </View>
                
                <View style={styles.userDetails}>
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email
                    }
                  </Text>
                  <Text style={[styles.userEmail, { color: theme.inactive }]}>
                    {user.email}
                  </Text>
                  <Text style={[styles.userRole, { color: appColors.primary }]}>
                    {user.role === 'admin' ? 'Administrateur' : 
                     user.role === 'moderator' ? 'Modérateur' : 'Utilisateur'}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Settings Groups */}
          {settingsGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.settingsGroup}>
              <Text style={[styles.groupTitle, { color: theme.inactive }]}>
                {group.title}
              </Text>
              
              <Card style={styles.groupCard}>
                {group.items.map((item, itemIndex) => (
                  <React.Fragment key={itemIndex}>
                    <ListItem
                      leftIcon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      rightComponent={item.rightComponent}
                      showChevron={item.showChevron}
                      onPress={item.onPress}
                      titleStyle={item.titleColor ? { color: item.titleColor } : undefined}
                    />
                    {itemIndex < group.items.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </Card>
            </View>
          ))}

          {/* App Version */}
          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, { color: theme.inactive }]}>
              Version 1.0.0
            </Text>
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  userCard: {
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInitials: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  settingsGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  groupCard: {
    padding: 0,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  versionText: {
    fontSize: 12,
  },
});