import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  CheckSquare,
  Calendar,
  Users,
  BookOpen,
  Link,
  Bell,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore, LEGACY_WELCOME_MESSAGE } from '@/store/settings-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useTasksStore } from '@/store/tasks-store';
import { useCalendarStore } from '@/store/calendar-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Card } from '@/components/Card';
import { AppLayout } from '@/components/AppLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { UserRole } from '@/types/user';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode, welcomeMessage } = useSettingsStore();
  const { getUnreadCount } = useNotificationsStore();
  const { getOverdueTasks, getUpcomingDeadlines, getUserTasks } = useTasksStore();
  const { getUpcomingEvents } = useCalendarStore();
  
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  const [refreshing, setRefreshing] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  
  // Get user tasks and events
  const overdueTasks = user ? getOverdueTasks().filter(task => task.assignedTo.includes(user.id)) : [];
  const upcomingTasks = user ? getUpcomingDeadlines(7).filter(task => task.assignedTo.includes(user.id)) : [];

  // Compteur du badge "Mes tâches" : toutes les tâches assignées à l'user encore à faire
  // (pending ou in_progress), peu importe la deadline. Le badge correspond donc au
  // "il te manque à valider" — pas juste les tâches dans les 7 prochains jours.
  const pendingTasksCount = user
    ? getUserTasks(user.id).filter(
        (t) =>
          t.assignedTo.includes(user.id) &&
          (t.status === 'pending' || t.status === 'in_progress')
      ).length
    : 0;

  // Règles d'affichage des événements à venir sur le home :
  // ✅ L'utilisateur est participant confirmé ou en attente (invited)
  // ✅ L'événement n'a aucun participant (event ouvert/public)
  // ❌ L'utilisateur a décliné
  // ❌ L'événement a des participants mais l'utilisateur n'en fait pas partie (non invité)
  const upcomingEvents = user
    ? getUpcomingEvents().filter(event => {
        const hasParticipants = event.participants && event.participants.length > 0;
        if (!hasParticipants) return true; // event ouvert, pas d'invitations
        const participant = event.participants!.find(p => p.userId === user.id);
        if (!participant) return false; // event avec invitations mais user pas invité
        return participant.status !== 'declined'; // invité : ok sauf si décliné
      }).slice(0, 3)
    : [];
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // In a real app, you would fetch fresh data here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  const navigateTo = (path: string) => {
    router.push(path);
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  // Check if user has a name to display
  const hasName = user?.firstName || user?.lastName;
  const userName = hasName ? 
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : 
    '';
  
  // Quick access items
  const quickAccessItems = [
    {
      id: '1',
      title: 'Mes tâches',
      icon: <CheckSquare size={24} color="#ffffff" />,
      path: '/tasks',
      color: ['#4c6ef5', '#3b5bdb'] as [string, string],
      count: pendingTasksCount,
    },
    {
      id: '2',
      title: 'Calendrier',
      icon: <Calendar size={24} color="#ffffff" />,
      path: '/calendar',
      color: ['#f76707', '#e8590c'] as [string, string],
      count: upcomingEvents.length,
    },
    {
      id: '3',
      title: 'Annuaire',
      icon: <Users size={24} color="#ffffff" />,
      path: '/directory',
      color: ['#1098ad', '#0c8599'] as [string, string],
      count: null,
    },
    {
      id: '4',
      title: 'La Bible',
      icon: <BookOpen size={24} color="#ffffff" />,
      path: '/resources',
      color: ['#ae3ec9', '#9c36b5'] as [string, string],
      count: null,
    },
    {
      id: '5',
      title: 'Liens',
      icon: <Link size={24} color="#ffffff" />,
      path: '/links',
      color: ['#37b24d', '#2f9e44'] as [string, string],
      count: null,
    },
    {
      id: '6',
      title: 'Notifications',
      icon: <Bell size={24} color="#ffffff" />,
      path: '/notifications',
      color: ['#f03e3e', '#e03131'] as [string, string],
      count: getUnreadCount(),
    },
  ];
  
  return (
    <AppLayout 
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView 
        style={[styles.container, { backgroundColor: theme.background }]} 
        edges={['top']}
      >
        <Header
          title={getGreeting() + " 👋"}
          titleStyle={styles.greeting}
          onTitlePress={() => toggleSidebar && toggleSidebar()}
          rightComponent={
            getUnreadCount() > 0 ? (
              <View style={styles.notificationBadge}>
                <View style={[styles.badge, { backgroundColor: theme.notification }]}>
                  <Text style={styles.badgeText}>{getUnreadCount()}</Text>
                </View>
              </View>
            ) : undefined
          }
          containerStyle={styles.headerContainer}
        />
        
        {userName ? (
          <Text style={[styles.userName, { color: theme.text, marginLeft: 24 }]}>
            {userName}
          </Text>
        ) : null}
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Bandeau d'annonce : visible uniquement si un admin a posté un vrai message */}
          {welcomeMessage && welcomeMessage.trim() !== '' && welcomeMessage.trim() !== LEGACY_WELCOME_MESSAGE && (
            <Card style={styles.welcomeCard}>
              <View style={styles.welcomeContent}>
                <Sparkles size={20} color={appColors.primary} style={styles.welcomeIcon} />
                <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                  {welcomeMessage}
                </Text>
              </View>
            </Card>
          )}

          {/* Quick Access Grid */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center' }]}>
              Accès rapides
            </Text>
          </View>
          
          <View style={styles.gridContainer}>
            {quickAccessItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickAccessItem}
                onPress={() => navigateTo(item.path)}
              >
                <LinearGradient
                  colors={item.color}
                  style={styles.quickAccessCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.quickAccessContent}>
                    {item.icon}
                    <Text style={styles.quickAccessTitle}>{item.title}</Text>
                    
                    {item.count !== null && item.count > 0 && (
                      <View style={styles.quickAccessBadge}>
                        <Text style={styles.quickAccessBadgeText}>{item.count}</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Upcoming Tasks */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Tâches à venir
              </Text>
              <TouchableOpacity onPress={() => navigateTo('/tasks')}>
                <Text style={[styles.seeAllText, { color: appColors.primary }]}>
                  Voir tout
                </Text>
              </TouchableOpacity>
            </View>
            
            {upcomingTasks.length > 0 ? (
              upcomingTasks.slice(0, 3).map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskItem, { backgroundColor: theme.card }]}
                  onPress={() => navigateTo('/tasks')}
                >
                  <View style={[styles.taskStatus, { 
                    backgroundColor: task.status === 'pending' ? '#f59f00' : 
                                    task.status === 'in_progress' ? '#4c6ef5' : 
                                    task.status === 'completed' ? '#37b24d' : 
                                    '#e03131'
                  }]} />
                  
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, { color: theme.text }]}>
                      {task.title}
                    </Text>
                    
                    <View style={styles.taskMeta}>
                      <View style={styles.taskMetaItem}>
                        <Clock size={14} color={darkMode ? theme.inactive : '#666666'} style={styles.taskMetaIcon} />
                        <Text style={[styles.taskMetaText, { color: darkMode ? theme.inactive : '#666666' }]}>
                          Échéance: {formatDate(new Date(task.deadline || ''))}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <ChevronRight size={20} color={darkMode ? theme.inactive : '#666666'} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: darkMode ? theme.inactive : '#666666' }]}>
                Vous n'avez pas de tâches à venir.
              </Text>
            )}
          </View>
          
          {/* Upcoming Events */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Événements à venir
              </Text>
              <TouchableOpacity onPress={() => navigateTo('/calendar')}>
                <Text style={[styles.seeAllText, { color: appColors.primary }]}>
                  Voir tout
                </Text>
              </TouchableOpacity>
            </View>
            
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => {
                const userParticipant = user ? event.participants?.find(p => p.userId === user.id) : null;
                const needsResponse = userParticipant?.status === 'pending';
                return (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.eventItem, { backgroundColor: theme.card }]}
                  onPress={() => router.push({ pathname: '/calendar/event-detail', params: { id: event.id } })}
                >
                  <View style={styles.eventDate}>
                    <Text style={[styles.eventDay, { color: theme.text }]}>
                      {new Date(event.startTime).getDate()}
                    </Text>
                    <Text style={[styles.eventMonth, { color: darkMode ? theme.inactive : '#666666' }]}>
                      {new Date(event.startTime).toLocaleDateString('fr-FR', { month: 'short' })}
                    </Text>
                  </View>

                  <View style={[styles.eventSeparator, { backgroundColor: event.color || appColors.primary }]} />

                  <View style={styles.eventContent}>
                    <View style={styles.eventTitleRow}>
                      <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                        {event.title}
                      </Text>
                      {needsResponse && (
                        <View style={[styles.rsvpBadge, { backgroundColor: theme.warning }]}>
                          <Text style={styles.rsvpBadgeText}>À répondre</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.eventMeta}>
                      <View style={styles.eventMetaItem}>
                        <Clock size={14} color={darkMode ? theme.inactive : '#666666'} style={styles.eventMetaIcon} />
                        <Text style={[styles.eventMetaText, { color: darkMode ? theme.inactive : '#666666' }]}>
                          {new Date(event.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <ChevronRight size={20} color={darkMode ? theme.inactive : '#666666'} />
                </TouchableOpacity>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: darkMode ? theme.inactive : '#666666' }]}>
                Il n'y a pas d'événements à venir.
              </Text>
            )}
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
    marginTop: -8, // Reduce top space
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: -4, // Reduce space between greeting and username
  },
  notificationBadge: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 0, // Reduce top padding
  },
  welcomeCard: {
    marginBottom: 24,
    marginTop: 0, // Reduce top margin
  },
  welcomeContent: {
    alignItems: 'center',
    padding: 16,
  },
  welcomeIcon: {
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAccessItem: {
    width: (width - 60) / 2, // Account for padding and gap
    height: 100,
    marginBottom: 20, // Increased from 10 to 20 for more spacing between rows
  },
  quickAccessCard: {
    borderRadius: 12,
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  quickAccessContent: {
    position: 'relative',
  },
  quickAccessTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  quickAccessBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  quickAccessBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  taskStatus: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  taskMetaIcon: {
    marginRight: 4,
  },
  taskMetaText: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  eventDate: {
    alignItems: 'center',
    width: 40,
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
    marginHorizontal: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rsvpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  rsvpBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  eventMetaIcon: {
    marginRight: 4,
  },
  eventMetaText: {
    fontSize: 12,
  },
});