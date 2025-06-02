import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock,
  MapPin,
  Plus,
  Calendar as CalendarIcon,
  Users,
  ChevronRight,
} from 'lucide-react-native';
import { useCalendarStore } from '@/store/calendar-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { Colors } from '@/constants/colors';
import { Calendar } from '@/components/Calendar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Event } from '@/types/calendar';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { UserRole } from '@/types/user';

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const { getEventsByDate, getUpcomingEvents, getVisibleEvents } = useCalendarStore();
  const { getUserById } = useUsersStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | undefined>(undefined);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => {
    if (user) {
      const dateEvents = getEventsByDate(selectedDate);
      setEvents(dateEvents);

      const upcoming = getUpcomingEvents(5).filter(event => {
        return getVisibleEvents(user.id).some(e => e.id === event.id);
      });
      setUpcomingEvents(upcoming);
    }
  }, [selectedDate, user]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddEvent = () => {
    if (isAdminOrModerator) {
      router.push(`/calendar/event-form?date=${selectedDate.toISOString()}`);
    }
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/calendar/event-detail/${eventId}`);
  };

  const formatEventTime = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const formattedStart = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    if (endTime) {
      const end = new Date(endTime);
      const formattedEnd = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `${formattedStart} - ${formattedEnd}`;
    }
    
    return formattedStart;
  };

  const formatEventDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const renderEventItem = ({ item }: { item: Event }) => {
    const creator = getUserById(item.createdBy);
    const participantsCount = item.participants?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.eventItem, { backgroundColor: theme.card }]}
        onPress={() => handleEventPress(item.id)}
      >
        <View style={[styles.eventColorIndicator, { backgroundColor: item.color || theme.primary }]} />
        
        <View style={styles.eventContent}>
          <Text style={[styles.eventTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          
          <View style={styles.eventDetails}>
            <View style={styles.eventDetail}>
              <Clock size={14} color={darkMode ? theme.inactive : '#666666'} style={styles.eventDetailIcon} />
              <Text style={[styles.eventDetailText, { color: darkMode ? theme.inactive : '#666666' }]}>
                {formatEventTime(item.startTime, item.endTime)}
              </Text>
            </View>
            
            {item.location && (
              <View style={styles.eventDetail}>
                <MapPin size={14} color={darkMode ? theme.inactive : '#666666'} style={styles.eventDetailIcon} />
                <Text style={[styles.eventDetailText, { color: darkMode ? theme.inactive : '#666666' }]}>
                  {item.location}
                </Text>
              </View>
            )}
            
            <View style={styles.eventDetail}>
              <Users size={14} color={darkMode ? theme.inactive : '#666666'} style={styles.eventDetailIcon} />
              <Text style={[styles.eventDetailText, { color: darkMode ? theme.inactive : '#666666' }]}>
                {participantsCount} {participantsCount > 1 ? 'participants' : 'participant'}
              </Text>
            </View>
          </View>
        </View>
        
        <ChevronRight size={20} color={darkMode ? theme.inactive : '#666666'} />
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout 
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Calendrier 📅"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            isAdminOrModerator && (
              <Button
                icon={<Plus size={24} color={theme.text} />}
                onPress={handleAddEvent}
                variant="text"
                style={styles.addButton}
              />
            )
          }
          containerStyle={styles.headerContainer}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Calendar 
            onSelectDate={handleSelectDate} 
            selectedDate={selectedDate}
          />
          
          <View style={styles.selectedDateContainer}>
            <CalendarIcon size={20} color={theme.primary} style={styles.selectedDateIcon} />
            <Text style={[styles.selectedDateText, { color: theme.text }]}>
              {formatEventDate(selectedDate)}
            </Text>
          </View>
          
          <View style={styles.eventsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Événements du jour
            </Text>
            
            {events.length > 0 ? (
              <FlatList
                data={events}
                renderItem={renderEventItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.eventsList}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <EmptyState
                  icon="calendar"
                  title="Aucun événement"
                  message="Il n'y a pas d'événements prévus pour cette date."
                  style={styles.emptyState}
                />
              </View>
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
    marginTop: -8, // Added to match home page header margin
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0, // Adjusted to match the "Accueil" page margin
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12, // Adjusted for better spacing
  },
  selectedDateIcon: {
    marginRight: 8,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  eventsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  eventsList: {
    gap: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 12,
    elevation: 2, // Added subtle shadow for Android
    shadowColor: '#000', // Added subtle shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventColorIndicator: {
    width: 4,
    height: '100%',
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
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDetailIcon: {
    marginRight: 4,
  },
  eventDetailText: {
    fontSize: 12,
  },
  emptyStateContainer: {
    width: '100%',
  },
  emptyState: {
    marginTop: 20,
    marginBottom: 20,
  },
});