import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Database,
  Palette,
  Link,
  BarChart3,
  Bell,
  BookOpen,
  UsersRound,
  CheckSquare,
  Shield,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  const { width } = useWindowDimensions();

  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';
  const isCommittee = user?.role === 'committee';

  const hasPerm = (perm: string) =>
    isAdmin || (isModerator && (user?.permissions?.includes(perm) ?? false));

  const canAccessAdmin = isAdmin || isModerator || isCommittee;

  useEffect(() => {
    // Attendre que l'user soit hydraté avant de juger des droits. Sans cette
    // garde, un cold mount sur /admin (web refresh, deep link) éjecterait
    // l'user vers /login pendant la fenêtre de rehydratation Zustand —
    // l'user a les droits, mais user?.role est encore undefined à T0.
    if (!user) return;
    if (!canAccessAdmin) router.replace('/');
  }, [user, canAccessAdmin]);
  if (!user) return null;
  if (!canAccessAdmin) return null;

  const isSmallScreen = width < 380;
  const cardSize = isSmallScreen ? 150 : 160;

  const adminTools = [
    {
      title: 'Tâches',
      icon: <CheckSquare size={24} color={appColors.primary} />,
      route: '/admin/tasks',
      description: 'Gérer toutes les tâches',
      access: hasPerm('tasks'),
    },
    {
      title: 'Utilisateurs',
      icon: <Users size={24} color={appColors.primary} />,
      route: '/admin/users',
      description: 'Gérer les comptes et rôles',
      access: isAdmin,
    },
    {
      title: 'Groupes',
      icon: <UsersRound size={24} color={appColors.primary} />,
      route: '/admin/groups',
      description: "Gérer les groupes d'utilisateurs",
      access: isAdmin || isCommittee || hasPerm('groups'),
    },
    {
      title: 'Notifications',
      icon: <Bell size={24} color={appColors.primary} />,
      route: '/admin/notifications',
      description: 'Envoyer des notifications',
      access: isAdmin || isCommittee || hasPerm('notifications'),
    },
    {
      title: 'Liens',
      icon: <Link size={24} color={appColors.primary} />,
      route: '/admin/links',
      description: 'Gérer les liens utiles',
      access: isAdmin || isCommittee || hasPerm('links'),
    },
    {
      title: 'La Bible',
      icon: <BookOpen size={24} color={appColors.primary} />,
      route: '/admin/categories',
      description: 'Gérer les catégories',
      access: isAdmin || isCommittee || hasPerm('resources'),
    },
    {
      title: 'Statistiques',
      icon: <BarChart3 size={24} color={appColors.primary} />,
      route: '/admin/stats',
      description: 'Voir les statistiques',
      access: isAdmin || hasPerm('stats'),
    },
    {
      title: 'Permissions',
      icon: <Shield size={24} color={appColors.primary} />,
      route: '/admin/permissions',
      description: 'Droits des modérateurs',
      access: isAdmin,
    },
    {
      title: 'Apparence',
      icon: <Palette size={24} color={appColors.primary} />,
      route: '/admin/appearance',
      description: "Personnaliser l'application",
      access: isAdmin,
    },
    {
      title: 'Base de données',
      icon: <Database size={24} color={appColors.primary} />,
      route: '/admin/database',
      description: 'Explorer la base de données',
      access: isAdmin,
    },
  ];

  const filteredTools = adminTools.filter(tool => tool.access);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Panneau d'administration"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <View style={[styles.welcomeIcon, { backgroundColor: `${appColors.primary}20` }]}>
              <Shield size={32} color={appColors.primary} />
            </View>
            <View style={styles.welcomeTextContainer}>
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                Bienvenue, {user?.firstName || 'Admin'}
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: darkMode ? theme.inactive : '#666666' }]}>
                {isAdmin ? 'Administrateur' : isModerator ? 'Modérateur' : 'Comité'}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Outils d'administration
        </Text>

        <View style={styles.toolsGrid}>
          {filteredTools.map((tool, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.toolCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  width: cardSize,
                  height: cardSize,
                },
              ]}
              onPress={() => router.push(tool.route)}
            >
              <View style={styles.toolIconContainer}>{tool.icon}</View>
              <Text style={[styles.toolTitle, { color: theme.text }]}>
                {tool.title}
              </Text>
              <Text style={[styles.toolDescription, { color: darkMode ? theme.inactive : '#666666' }]} numberOfLines={2}>
                {tool.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  welcomeCard: { marginBottom: 24 },
  welcomeContent: { flexDirection: 'row', alignItems: 'center' },
  welcomeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  welcomeTextContainer: { flex: 1 },
  welcomeTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  welcomeSubtitle: { fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  toolCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    justifyContent: 'center',
  },
  toolIconContainer: { marginBottom: 12 },
  toolTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  toolDescription: { fontSize: 12 },
});
