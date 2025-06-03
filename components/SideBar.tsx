import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Platform,
  Alert
} from 'react-native';
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
  RefreshCw,
  AlertTriangle
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { getSupabase, reinitializeSupabase, checkAndRestoreSession, testAuth, clearAuthData } from '@/utils/supabase';

interface SideBarProps {
  onClose?: () => void;
}

export const SideBar: React.FC<SideBarProps> = ({ onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, logout, refreshSession, ensureSupabaseReady, hardReset } = useAuthStore();
  const { darkMode, appName, logoType, logoText, logoImageUrl } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();

  const handleLogout = () => {
    logout();
    router.replace('/login');
    if (onClose) onClose();
  };

  const navigateTo = (path: string) => {
    router.push(path);
    if (onClose) onClose();
  };
  
  const handleRefreshSession = async () => {
    try {
      console.log("Manually refreshing Supabase session...");
      
      // Ensure Supabase is ready
      await ensureSupabaseReady();
      
      // Ensure Supabase is initialized
      const supabase = getSupabase();
      console.log("Supabase client ready for refresh:", !!supabase);
      
      // Check for existing session
      await checkAndRestoreSession();
      
      // Test if auth is working
      const authWorks = await testAuth();
      console.log("Auth test result after refresh:", authWorks);
      
      // Refresh auth store session
      const hasSession = await refreshSession();
      
      // If on web, log the Supabase status
      if (Platform.OS === 'web') {
        console.log("Supabase status after refresh: initialized");
      }
      
      if (hasSession) {
        Alert.alert("Succès", "Session Supabase rafraîchie avec succès");
      } else {
        Alert.alert("Information", "Aucune session active trouvée");
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      Alert.alert("Erreur", "Impossible de rafraîchir la session");
    }
  };
  
  const handleReinitializeSupabase = async () => {
    try {
      console.log("Manually reinitializing Supabase...");
      
      // Reinitialize Supabase
      const newInstance = reinitializeSupabase();
      console.log("Supabase reinitialized:", !!newInstance);
      
      // Check for existing session
      await checkAndRestoreSession();
      
      // Test if auth is working
      const authWorks = await testAuth();
      console.log("Auth test result after reinitialization:", authWorks);
      
      // Refresh auth store session
      const hasSession = await refreshSession();
      
      // If on web, log the Supabase status
      if (Platform.OS === 'web') {
        console.log("Supabase status after reinitialization: initialized");
      }
      
      Alert.alert("Succès", "Supabase réinitialisé avec succès");
    } catch (error) {
      console.error("Error reinitializing Supabase:", error);
      Alert.alert("Erreur", "Impossible de réinitialiser Supabase");
    }
  };
  
  const handleHardReset = async () => {
    try {
      Alert.alert(
        "Réinitialisation complète",
        "Êtes-vous sûr de vouloir effectuer une réinitialisation complète ? Cela effacera toutes les données d'authentification et vous devrez vous reconnecter.",
        [
          {
            text: "Annuler",
            style: "cancel"
          },
          {
            text: "Réinitialiser",
            style: "destructive",
            onPress: async () => {
              console.log("Performing hard reset...");
              
              // Perform hard reset
              await hardReset();
              
              // Navigate to login screen
              router.replace('/login');
              
              if (onClose) onClose();
              
              Alert.alert("Succès", "Réinitialisation complète effectuée avec succès");
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error during hard reset:", error);
      Alert.alert("Erreur", "Impossible d'effectuer la réinitialisation complète");
    }
  };

  const menuItems = [
    {
      name: 'Accueil',
      path: '/(tabs)',
      icon: (isActive: boolean) => <Home size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Mes tâches',
      path: '/(tabs)/tasks',
      icon: (isActive: boolean) => <CheckSquare size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Calendrier',
      path: '/(tabs)/calendar',
      icon: (isActive: boolean) => <Calendar size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Annuaire',
      path: '/(tabs)/directory',
      icon: (isActive: boolean) => <Users size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'La Bible',
      path: '/(tabs)/resources',
      icon: (isActive: boolean) => <BookOpen size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Liens',
      path: '/(tabs)/links',
      icon: (isActive: boolean) => <Link size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Notifications',
      path: '/(tabs)/notifications',
      icon: (isActive: boolean) => <Bell size={24} color={isActive ? appColors.primary : theme.text} />
    },
    {
      name: 'Réglages',
      path: '/(tabs)/settings',
      icon: (isActive: boolean) => <Settings size={24} color={isActive ? appColors.primary : theme.text} />
    }
  ];

  // Check if the current path is a subpath of a menu item
  const isSubPathOf = (menuPath: string, currentPath: string) => {
    // Special case for settings subpaths
    if (menuPath === '/(tabs)/settings' && 
        (pathname.startsWith('/settings') || 
         pathname === '/profile/edit' || 
         pathname === '/profile/change-password')) {
      return true;
    }
    
    // Special case for admin panel
    if (menuPath === '/(tabs)/settings' && pathname.startsWith('/admin')) {
      return true;
    }
    
    // General case for tabs
    if (menuPath.startsWith('/(tabs)/')) {
      const tabName = menuPath.replace('/(tabs)/', '');
      return currentPath === `/(tabs)/${tabName}` || currentPath.startsWith(`/(tabs)/${tabName}/`);
    }
    
    // Special case for home tab
    if (menuPath === '/(tabs)' && (currentPath === '/(tabs)' || currentPath === '/(tabs)/index')) {
      return true;
    }
    
    return currentPath === menuPath;
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
        {/* Debug options */}
        {__DEV__ && (
          <>
            <View style={styles.debugSectionHeader}>
              <Text style={[styles.debugSectionTitle, { color: theme.inactive }]}>
                Outils de débogage
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: `${theme.info}15` }]}
              onPress={handleRefreshSession}
            >
              <RefreshCw size={24} color={theme.info} />
              <Text style={[styles.menuItemText, { color: theme.info }]}>
                Rafraîchir Session
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: `${theme.warning}15` }]}
              onPress={handleReinitializeSupabase}
            >
              <RefreshCw size={24} color={theme.warning} />
              <Text style={[styles.menuItemText, { color: theme.warning }]}>
                Réinitialiser Supabase
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: `${theme.error}15` }]}
              onPress={handleHardReset}
            >
              <AlertTriangle size={24} color={theme.error} />
              <Text style={[styles.menuItemText, { color: theme.error }]}>
                Réinitialisation complète
              </Text>
            </TouchableOpacity>
          </>
        )}
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
  debugSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  debugSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
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