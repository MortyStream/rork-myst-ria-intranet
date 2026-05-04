import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { ConfirmModal } from './ConfirmModal';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Users,
  BookOpen,
  Link,
  Bell,
  Settings,
  LogOut,
  CheckSquare,
  Calendar,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';

interface SideBarProps {
  onClose?: () => void;
}

export const SideBar: React.FC<SideBarProps> = ({ onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { darkMode, appName, logoType, logoText, logoImageUrl } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();

  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const handleLogout = () => {
    setConfirmingLogout(true);
  };

  const performLogout = async () => {
    setConfirmingLogout(false);
    if (onClose) onClose();
    await logout();
    router.replace('/login');
  };

  const navigateTo = (path: string) => {
    router.push(path);
    if (onClose) onClose();
  };
  
  const menuItems = [
    {
      name: 'Accueil',
      path: '/home',
      icon: (isActive: boolean) => <Home size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Mes tâches',
      path: '/tasks',
      icon: (isActive: boolean) => <CheckSquare size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Calendrier',
      path: '/calendar',
      icon: (isActive: boolean) => <Calendar size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Annuaire',
      path: '/directory',
      icon: (isActive: boolean) => <Users size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'La Bible',
      path: '/resources',
      icon: (isActive: boolean) => <BookOpen size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Liens',
      path: '/links',
      icon: (isActive: boolean) => <Link size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Notifications',
      path: '/notifications',
      icon: (isActive: boolean) => <Bell size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Réglages',
      path: '/settings',
      icon: (isActive: boolean) => <Settings size={24} color={isActive ? appColors.primary : theme.text} />
    }
  ];

  // Check if the current path is a subpath of a menu item
  const isSubPathOf = (menuPath: string, currentPath: string) => {
    // Special case for settings subpaths
    if (menuPath === '/settings' && 
        (pathname.startsWith('/settings') || 
         pathname === '/profile/edit' || 
         pathname === '/profile/change-password')) {
      return true;
    }
    
    // Special case for admin panel
    if (menuPath === '/settings' && pathname.startsWith('/admin')) {
      return true;
    }
    
    // General case
    return currentPath.startsWith(menuPath) && currentPath !== menuPath;
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.card,
        paddingTop: insets.top,
        paddingBottom: insets.bottom
      }
    ]}>
      <View style={styles.header}>
        {logoType === 'text' ? (
          <View style={[styles.logoContainer, { backgroundColor: `${appColors.primary}15` }]}>
            <Text style={[styles.logoText, { color: appColors.primary }]}>{logoText}</Text>
          </View>
        ) : (
          <View style={[styles.logoContainer, { backgroundColor: `${appColors.primary}15` }]}>
            {logoImageUrl ? (
              <Image source={{ uri: logoImageUrl }} style={styles.logoImage} />
            ) : (
              <Text style={[styles.logoText, { color: appColors.primary }]}>{logoText}</Text>
            )}
          </View>
        )}
        <Text style={[styles.appName, { color: theme.text }]}>{appName}</Text>
      </View>
      {user && (
        <TouchableOpacity 
          style={[styles.profileSection, { borderBottomColor: theme.border }]}
          onPress={() => navigateTo('/profile/edit')}
        >
          <Avatar
            source={user.profileImage ? { uri: user.profileImage } : undefined}
            name={`${user.firstName} ${user.lastName}`}
            size={50}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={[styles.profileRole, { color: darkMode ? theme.inactive : '#666666' }]}>
              {user.role === 'admin' ? 'Administrateur' : 
               user.role === 'moderator' ? 'Modérateur' : 
               user.role === 'committee' ? 'Comité' : 'Membre'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      <ScrollView style={styles.menuContainer}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || isSubPathOf(item.path, pathname);
          return (
            <TouchableOpacity
              key={item.path}
              style={[
                styles.menuItem,
                isActive && [styles.activeMenuItem, { backgroundColor: `${appColors.primary}15` }]
              ]}
              onPress={() => navigateTo(item.path)}
            >
              {item.icon(isActive)}
              <Text 
                style={[
                  styles.menuItemText, 
                  { color: isActive ? appColors.primary : theme.text }
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity 
        style={[styles.logoutButton, { borderTopColor: theme.border }]}
        onPress={handleLogout}
      >
        <LogOut size={24} color={theme.error} />
        <Text style={[styles.logoutText, { color: theme.error }]}>
          Se déconnecter
        </Text>
      </TouchableOpacity>

      {/* ConfirmModal cohérent thème (au lieu de l'Alert.alert blanc moche). */}
      <ConfirmModal
        visible={confirmingLogout}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        actions={[
          { label: 'Annuler', style: 'cancel' },
          { label: 'Se déconnecter', style: 'destructive', onPress: performLogout },
        ]}
        onDismiss={() => setConfirmingLogout(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: 280,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileRole: {
    fontSize: 14,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  activeMenuItem: {
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
});