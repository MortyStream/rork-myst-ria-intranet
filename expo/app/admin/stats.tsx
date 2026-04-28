import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Folder,
  FileText,
  Bell,
  LogIn,
  BarChart,
  Calendar,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useResourcesStore } from '@/store/resources-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useCalendarStore } from '@/store/calendar-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';

export default function StatsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { users } = useUsersStore();
  const { categories, resourceItems } = useResourcesStore();
  const { notifications } = useNotificationsStore();
  const { events } = useCalendarStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [refreshing, setRefreshing] = useState(false);
  
  // Vérifier si l'utilisateur est admin ou modérateur
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  useEffect(() => {
    if (!isAdminOrModerator) router.replace('/admin');
  }, [isAdminOrModerator]);
  if (!isAdminOrModerator) return null;
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Dans une vraie application, vous récupéreriez des données fraîches ici
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  // Calculer les statistiques
  const totalUsers = users.length;
  const totalCategories = categories.length;
  const totalItems = resourceItems.length;
  const totalNotifications = notifications.length;
  const totalEvents = events.length;
  
  // Calculer les statistiques par rôle
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const committeeUsers = users.filter(u => u.role === 'committee').length;
  const otherUsers = users.filter(u => u.role !== 'admin' && u.role !== 'committee').length;
  
  // Calculer les statistiques par type d'élément
  const folderItems = resourceItems.filter(item => item.type === 'folder').length;
  const fileItems = resourceItems.filter(item => item.type === 'file').length;
  const linkItems = resourceItems.filter(item => item.type === 'link').length;
  const textItems = resourceItems.filter(item => item.type === 'text').length;
  const imageItems = resourceItems.filter(item => item.type === 'image').length;
  
  // Calculer les statistiques d'événements
  const upcomingEvents = events.filter(event => new Date(event.startTime) > new Date()).length;
  const pastEvents = events.filter(event => new Date(event.startTime) <= new Date()).length;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Statistiques d'utilisation"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Aperçu général
        </Text>
        
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.primary }]}>
              <Users size={24} color="#ffffff" />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalUsers}</Text>
            <Text style={[styles.statLabel, { color: darkMode ? theme.inactive : '#666666' }]}>Utilisateurs</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.secondary }]}>
              <Folder size={24} color="#ffffff" />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalCategories}</Text>
            <Text style={[styles.statLabel, { color: darkMode ? theme.inactive : '#666666' }]}>Catégories</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.info }]}>
              <FileText size={24} color="#ffffff" />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalItems}</Text>
            <Text style={[styles.statLabel, { color: darkMode ? theme.inactive : '#666666' }]}>Éléments</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.warning }]}>
              <Bell size={24} color="#ffffff" />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalNotifications}</Text>
            <Text style={[styles.statLabel, { color: darkMode ? theme.inactive : '#666666' }]}>Notifications</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.success }]}>
              <Calendar size={24} color="#ffffff" />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalEvents}</Text>
            <Text style={[styles.statLabel, { color: darkMode ? theme.inactive : '#666666' }]}>Événements</Text>
          </Card>
        </View>
        
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Répartition des utilisateurs
        </Text>
        
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <BarChart size={20} color={theme.primary} />
            <Text style={[styles.chartTitle, { color: theme.text }]}>Par rôle</Text>
          </View>
          
          <View style={styles.barChartContainer}>
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>Admin</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.primary,
                      width: totalUsers > 0 ? `${(adminUsers / totalUsers) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{adminUsers}</Text>
            </View>
            
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>Comité</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.secondary,
                      width: totalUsers > 0 ? `${(committeeUsers / totalUsers) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{committeeUsers}</Text>
            </View>
            
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>Autres</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.info,
                      width: totalUsers > 0 ? `${(otherUsers / totalUsers) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{otherUsers}</Text>
            </View>
          </View>
        </Card>
        
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Répartition des éléments
        </Text>
        
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <BarChart size={20} color={theme.primary} />
            <Text style={[styles.chartTitle, { color: theme.text }]}>Par type</Text>
          </View>
          
          <View style={styles.barChartContainer}>
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>Dossiers</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.primary,
                      width: totalItems > 0 ? `${(folderItems / totalItems) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{folderItems}</Text>
            </View>
            
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>Fichiers</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.error,
                      width: totalItems > 0 ? `${(fileItems / totalItems) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{fileItems}</Text>
            </View>
            
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>Liens</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.info,
                      width: totalItems > 0 ? `${(linkItems / totalItems) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{linkItems}</Text>
            </View>
            
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>Textes</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.warning,
                      width: totalItems > 0 ? `${(textItems / totalItems) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{textItems}</Text>
            </View>
            
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>Images</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.success,
                      width: totalItems > 0 ? `${(imageItems / totalItems) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{imageItems}</Text>
            </View>
          </View>
        </Card>
        
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Événements
        </Text>
        
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Calendar size={20} color={theme.primary} />
            <Text style={[styles.chartTitle, { color: theme.text }]}>Répartition des événements</Text>
          </View>
          
          <View style={styles.barChartContainer}>
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>À venir</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.success,
                      width: totalEvents > 0 ? `${(upcomingEvents / totalEvents) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{upcomingEvents}</Text>
            </View>
            
            <View style={styles.barChartItem}>
              <Text style={[styles.barChartLabel, { color: theme.text }]}>Passés</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: theme.secondary,
                      width: totalEvents > 0 ? `${(pastEvents / totalEvents) * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.barChartValue, { color: theme.text }]}>{pastEvents}</Text>
            </View>
          </View>
        </Card>
        
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Activité récente
        </Text>
        
        <Card style={styles.activityCard}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: theme.primary }]}>
              <LogIn size={16} color="#ffffff" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>
                Dernières connexions
              </Text>
              <Text style={[styles.activityValue, { color: darkMode ? theme.inactive : '#666666' }]}>
                Données non disponibles
              </Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: theme.info }]}>
              <FileText size={16} color="#ffffff" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>
                Derniers éléments ajoutés
              </Text>
              <Text style={[styles.activityValue, { color: darkMode ? theme.inactive : '#666666' }]}>
                {resourceItems.length > 0 ? resourceItems[resourceItems.length - 1].title : 'Aucun élément'}
              </Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: theme.warning }]}>
              <Bell size={16} color="#ffffff" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>
                Dernières notifications
              </Text>
              <Text style={[styles.activityValue, { color: darkMode ? theme.inactive : '#666666' }]}>
                {notifications.length > 0 ? notifications[0].title : 'Aucune notification'}
              </Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: theme.success }]}>
              <Calendar size={16} color="#ffffff" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityTitle, { color: theme.text }]}>
                Prochain événement
              </Text>
              <Text style={[styles.activityValue, { color: darkMode ? theme.inactive : '#666666' }]}>
                {upcomingEvents > 0 
                  ? events
                      .filter(e => new Date(e.startTime) > new Date())
                      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]?.title
                  : 'Aucun événement à venir'}
              </Text>
            </View>
          </View>
        </Card>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  chartCard: {
    marginBottom: 24,
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  barChartContainer: {
    marginBottom: 8,
  },
  barChartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  barChartLabel: {
    width: 80,
    fontSize: 14,
  },
  barContainer: {
    flex: 1,
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  bar: {
    height: '100%',
    borderRadius: 8,
  },
  barChartValue: {
    width: 30,
    fontSize: 14,
    textAlign: 'right',
  },
  activityCard: {
    marginBottom: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityValue: {
    fontSize: 12,
  },
});