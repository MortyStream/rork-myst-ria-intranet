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
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useCalendarStore } from '@/store/calendar-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { Calendar } from '@/components/Calendar';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { events, isLoading, error, initializeEvents, getEventsByDate, getUpcomingEvents } = useCalendarStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      await initializeEvents();
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement des événements.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await initializeEvents();
    } catch (error) {
      console.error('Error refreshing events:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du rafraîchissement des événements.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/calendar/event-detail/${eventId}`);
  };

  const handleAddEvent = () => {
    router.push('/calendar/event-form');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Get events for selected date
  const selectedDateEvents = getEventsByDate(selectedDate);
  const upcomingEvents = getUpcomingEvents(5);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderContent = () => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appColors.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Chargement du calendrier...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: appColors.primary }]}
            onPress={loadEvents}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
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
        {/* Calendar Component */}
        <Card style={styles.calendarCard}>
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            events={events}
          />
        </Card>

        {/* Selected Date Events */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {formatDate(selectedDate)}
          </Text>
          
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventItem, { backgroundColor: theme.card }]}
                onPress={() => handleEventPress(event.id)}
              >
                <View style={[styles.eventColor, { backgroundColor: event.color || appColors.primary }]} />
                
                <View style={styles.eventContent}>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>
                    {event.title}
                  </Text>
                  
                  <Text style={[styles.eventTime, { color: theme.inactive }]}>
                    {formatTime(new Date(event.startTime))} - {formatTime(new Date(event.endTime))}
                  </Text>
                  
                  {event.description && (
                    <Text style={[styles.eventDescription, { color: theme.inactive }]} numberOfLines={2}>
                      {event.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              icon="calendar"
              title="Aucun événement"
              message="Il n'y a pas d'événements pour cette date."
            />
          )}
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Événements à venir
          </Text>
          
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
                    {new Date(event.startTime).toLocaleDateString('fr-FR', { month: 'short' })}
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
                  
                  {event.description && (
                    <Text style={[styles.eventDescription, { color: theme.inactive }]} numberOfLines={2}>
                      {event.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              icon="calendar"
              title="Aucun événement à venir"
              message="Il n'y a pas d'événements prévus dans les prochains jours."
            />
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header
          title="Calendrier 📅"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddEvent}
            >
              <Plus size={24} color={theme.text} />
            </TouchableOpacity>
          }
        />

        {renderContent()}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButton: {
    padding: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  calendarCard: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  eventColor: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    marginRight: 12,
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
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});