import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Plus, 
  CheckSquare, 
  Calendar, 
  Users, 
  Bell,
  BookOpen,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useTasksStore } from '@/store/tasks-store';
import { useCalendarStore } from '@/store/calendar-store';
import { useUsersStore } from '@/store/users-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { TaskItem } from '@/components/TaskItem';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { tasks, getTasksByUser, getOverdueTasks, initializeTasks } = useTasksStore();
  const { events, getUpcomingEvents, initializeEvents } = useCalendarStore();
  const { users, initializeUsers } = useUsersStore();
  const { getUnreadCount, initializeNotifications } = useNotificationsStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        initializeTasks(),
        initializeEvents(),
        initializeUsers(),
        initializeNotifications(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement des données.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du rafraîchissement des données.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTaskPress = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/calendar/event-detail/${eventId}`);
  };

  // Get user-specific data
  const userTasks = user ? getTasksByUser(user.id) : [];
  const pendingTasks = userTasks.filter(task => task.status === 'pending');
  const inProgressTasks = userTasks.filter(task => task.status === 'in_progress');
  const overdueTasks = user ? getOverdueTasks().filter(task => task.assignedTo.includes(user.id)) : [];
  const upcomingEvents = getUpcomingEvents(3);
  const unreadNotifications = getUnreadCount();

  const quickActions = [
    {
      title: 'Nouvelle tâche',
      icon: <Plus size={20} color="#ffffff" />,
      color: appColors.primary,
      onPress: () => router.push('/tasks/create'),
    },
    {
      title: 'Nouvel événement',
      icon: <Calendar size={20} color="#ffffff" />,
      color: '#f59f00',
      onPress: () => router.push('/calendar/event-form'),
    },
    {
      title: 'Annuaire',
      icon: <Users size={20} color="#ffffff" />,
      color: '#51cf66',
      onPress: () => router.push('/(tabs)/directory'),
    },
    {
      title: 'La Bible',
      icon: <BookOpen size={20} color="#ffffff" />,
      color: '#845ef7',
      onPress: () => router.push('/(tabs)/resources'),
    },
  ];

  const stats = [
    {
      title: 'Tâches en attente',
      value: pendingTasks.length,
      icon: <Clock size={20} color={appColors.primary} />,
      color: appColors.primary,
    },
    {
      title: 'Tâches en cours',
      value: inProgressTasks.length,
      icon: <CheckSquare size={20} color="#f59f00" />,
      color: '#f59f00',
    },
    {
      title: 'Tâches en retard',
      value: overdueTasks.length,
      icon: <AlertCircle size={20} color="#e03131" />,
      color: '#e03131',
    },
    {
      title: 'Notifications',
      value: unreadNotifications,
      icon: <Bell size={20} color="#845ef7" />,
      color: '#845ef7',
    },
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && !refreshing) {
    return (
      <AppLayout
        hideMenuButton={true}
        onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <Header
            title="Accueil 🏠"
            onTitlePress={() => toggleSidebar?.()}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={appColors.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Chargement...
            </Text>
          </View>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header
          title="Accueil 🏠"
          onTitlePress={() => toggleSidebar?.()}
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[appColors.primary]}
              tintColor={appColors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Message */}
          <Card style={styles.welcomeCard}>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>
              Bonjour {user?.firstName || 'Utilisateur'} ! 👋
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.inactive }]}>
              Voici un aperçu de votre journée
            </Text>
          </Card>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <Card key={index} style={styles.statCard}>
                <View style={styles.statHeader}>
                  {stat.icon}
                  <Text style={[styles.statValue, { color: stat.color }]}>
                    {stat.value}
                  </Text>
                </View>
                <Text style={[styles.statTitle, { color: theme.inactive }]}>
                  {stat.title}
                </Text>
              </Card>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Actions rapides
            </Text>
            <View style={styles.quickActionsContainer}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickActionButton, { backgroundColor: action.color }]}
                  onPress={action.onPress}
                >
                  {action.icon}
                  <Text style={styles.quickActionText}>
                    {action.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Tasks */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Mes tâches récentes
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                <Text style={[styles.seeAllText, { color: appColors.primary }]}>
                  Voir tout
                </Text>
              </TouchableOpacity>
            </View>
            
            {pendingTasks.length > 0 ? (
              pendingTasks.slice(0, 3).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onPress={() => handleTaskPress(task.id)}
                />
              ))
            ) : (
              <EmptyState
                icon="check-square"
                title="Aucune tâche en attente"
                message="Vous n'avez pas de tâches en attente pour le moment."
              />
            )}
          </View>

          {/* Upcoming Events */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Événements à venir
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
                <Text style={[styles.seeAllText, { color: appColors.primary }]}>
                  Voir tout
                </Text>
              </TouchableOpacity>
            </View>
            
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.eventItem, { backgroundColor: theme.card }]}
                  onPress={() => handleEventPress(event.id)}
                >
                  <View style={styles.eventDate}>
                    <Text style={[styles.eventDay, { color: theme.text }]}>
                      {new Date(event.startTime).getDate()}
                    </Text>
                    <Text style={[styles.eventMonth, { color: theme.inactive }]}>
                      {formatDate(new Date(event.startTime)).split(' ')[1]}
                    </Text>
                  </View>
                  
                  <View style={[styles.eventSeparator, { backgroundColor: event.color || appColors.primary }]} />
                  
                  <View style={styles.eventContent}>
                    <Text style={[styles.eventTitle, { color: theme.text }]}>
                      {event.title}
                    </Text>
                    <Text style={[styles.eventTime, { color: theme.inactive }]}>
                      {formatTime(new Date(event.startTime))} - {formatTime(new Date(event.endTime))}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <EmptyState
                icon="calendar"
                title="Aucun événement à venir"
                message="Vous n'avez pas d'événements prévus dans les prochains jours."
              />
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  welcomeCard: {
    marginBottom: 24,
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  eventDate: {
    alignItems: 'center',
    width: 40,
    marginRight: 12,
  },
  eventDay: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventMonth: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  eventSeparator: {
    width: 2,
    height: '80%',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
  },
});