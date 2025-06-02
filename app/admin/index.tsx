import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Settings, 
  Users, 
  Database, 
  Palette, 
  Link, 
  BarChart3, 
  Bell, 
  FileText,
  BookOpen,
  Calendar,
  MessageSquare,
  UserCog
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';
  const isCommittee = user?.role === 'committee';
  
  // Only admin, moderator, and committee members can access admin features
  const canAccessAdmin = isAdmin || isModerator || isCommittee;
  
  if (!canAccessAdmin) {
    router.replace('/');
    return null;
  }
  
  const isSmallScreen = width < 380;
  const cardSize = isSmallScreen ? 150 : 160;
  
  const adminTools = [
    {
      title: 'Utilisateurs',
      icon: <Users size={24} color={theme.primary} />,
      route: '/admin/users-list',
      description: 'Gérer les profils de l\'annuaire',
      access: isAdmin || isCommittee
    },
    {
      title: 'Comptes',
      icon: <UserCog size={24} color={theme.primary} />,
      route: '/admin/users',
      description: 'Gérer les comptes Supabase',
      access: isAdmin
    },
    {
      title: 'Notifications',
      icon: <Bell size={24} color={theme.primary} />,
      route: '/admin/notifications',
      description: 'Envoyer des notifications',
      access: isAdmin || isCommittee
    },
    {
      title: 'Liens',
      icon: <Link size={24} color={theme.primary} />,
      route: '/admin/links',
      description: 'Gérer les liens utiles',
      access: isAdmin || isCommittee
    },
    {
      title: 'Statistiques',
      icon: <BarChart3 size={24} color={theme.primary} />,
      route: '/admin/stats',
      description: 'Voir les statistiques',
      access: isAdmin
    },
    {
      title: 'Base de données',
      icon: <Database size={24} color={theme.primary} />,
      route: '/admin/database',
      description: 'Explorer la base de données',
      access: isAdmin
    },
    {
      title: 'Apparence',
      icon: <Palette size={24} color={theme.primary} />,
      route: '/admin/appearance',
      description: 'Personnaliser l\'application',
      access: isAdmin
    },
    {
      title: 'Paramètres',
      icon: <Settings size={24} color={theme.primary} />,
      route: '/admin/settings',
      description: 'Configurer l\'application',
      access: isAdmin
    },
    {
      title: 'Logs',
      icon: <FileText size={24} color={theme.primary} />,
      route: '/admin/logs',
      description: 'Consulter les journaux',
      access: isAdmin
    },
    {
      title: 'La Bible',
      icon: <BookOpen size={24} color={theme.primary} />,
      route: '/admin/categories',
      description: 'Gérer les catégories',
      access: isAdmin || isCommittee
    },
    {
      title: 'Ressources',
      icon: <FileText size={24} color={theme.primary} />,
      route: '/resources',
      description: 'Gérer les ressources',
      access: isAdmin || isCommittee
    },
    {
      title: 'Calendrier',
      icon: <Calendar size={24} color={theme.primary} />,
      route: '/calendar',
      description: 'Gérer les événements',
      access: isAdmin || isCommittee
    },
    {
      title: 'Messages',
      icon: <MessageSquare size={24} color={theme.primary} />,
      route: '/messages',
      description: 'Gérer les messages',
      access: isAdmin || isCommittee
    }
  ];
  
  // Filter tools based on user access
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
            <View style={styles.welcomeTextContainer}>
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                Bienvenue, {user?.firstName || 'Admin'}
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: darkMode ? theme.inactive : '#666666' }]}>
                Panneau d'administration
              </Text>
            </View>
            
            <Image
              source={{ uri: 'https://i.imgur.com/JFHjdNr.jpg' }}
              style={styles.welcomeImage}
            />
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
                  height: cardSize
                }
              ]}
              onPress={() => router.push(tool.route)}
            >
              <View style={styles.toolIconContainer}>
                {tool.icon}
              </View>
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
  welcomeCard: {
    marginBottom: 24,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
  },
  welcomeImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginLeft: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
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
  toolIconContainer: {
    marginBottom: 12,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 12,
  },
});