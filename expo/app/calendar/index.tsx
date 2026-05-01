import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
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
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Event } from '@/types/calendar';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const { getEventsByDate, initializeEvents, deleteEvent } = useCalendarStore();
  // Souscription réactive : re-rend la liste quand des events changent dans le store
  const storeEvents = useCalendarStore(state => state.events);
  const { getUserById } = useUsersStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | undefined>(undefined);

  const [selectedDate, setSelectedDate] = useState(new Date());
  // État du dialog de suppression custom
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => {
    initializeEvents();
  }, []);

  // Recalcul réactif des events du jour à chaque changement de date ou de store
  const events = getEventsByDate(selectedDate);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddEvent = () => {
    if (isAdminOrModerator) {
      router.push(`/calendar/event-form?date=${selectedDate.toISOString()}`);
    }
  };

  const handleEventPress = (eventId: string) => {
    router.push({ pathname: '/calendar/event-detail', params: { id: eventId } });
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

  /**
   * Long-press menu : permet de supprimer un event si l'utilisateur est :
   * - admin / responsable_pole / responsable_secteur
   * - OU créateur de l'event (item.createdBy === user.id)
   */
  const canDeleteEvent = (event: Event): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'responsable_pole' || user.role === 'responsable_secteur') {
      return true;
    }
    return event.createdBy === user.id;
  };

  const handleLongPressEvent = async (event: Event) => {
    if (!canDeleteEvent(event)) {
      // Feedback explicite : sinon l'user croit que le long-press marche pas alors
      // qu'en fait il n'a juste pas les droits sur cet événement.
      try {
        const Toast = (await import('react-native-toast-message')).default;
        Toast.show({
          type: 'info',
          text1: 'Action non autorisée',
          text2: 'Seul un admin ou le créateur de l\'événement peut le supprimer.',
        });
      } catch {}
      return;
    }
    const { mediumHaptic } = await import('@/utils/haptics');
    mediumHaptic();
    setEventToDelete(event);
  };

  const performDeleteEvent = async () => {
    // Snapshot de l'id AVANT que ConfirmModal vide le state (onDismiss appelé
    // synchroniquement avant action.onPress → eventToDelete = null sinon).
    const idToDelete = eventToDelete?.id;
    if (!idToDelete) return;
    try {
      const { warningHaptic } = await import('@/utils/haptics');
      warningHaptic();
      await deleteEvent(idToDelete);
    } catch (e: any) {
      console.error('Delete event error:', e);
      Alert.alert('Erreur', `Impossible de supprimer l'événement.\n${e?.message ?? ''}`);
    } finally {
      setEventToDelete(null);
    }
  };

  const renderEventItem = ({ item }: { item: Event }) => {
    const creator = getUserById(item.createdBy);
    const participantsCount = item.participants?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.eventItem, { backgroundColor: theme.card }]}
        onPress={() => handleEventPress(item.id)}
        onLongPress={() => handleLongPressEvent(item)}
        delayLongPress={400}
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

        {/* Dialog custom pour suppression d'événement (remplace Alert.alert).
            UN SEUL modal : on évitait avant le bug de chaîne où ConfirmModal appelle
            onDismiss() AVANT action.onPress, ce qui vidait eventToDelete. */}
        <ConfirmModal
          visible={eventToDelete !== null}
          title="Supprimer l'événement ?"
          message={(() => {
            if (!eventToDelete) return '';
            const count = eventToDelete.participants?.length ?? 0;
            const detail = count > 0
              ? `« ${eventToDelete.title} » sera retiré du calendrier de ${count} participant${count > 1 ? 's' : ''}.`
              : `« ${eventToDelete.title} » sera supprimé.`;
            return `${detail}\n\nCette action est définitive et ne peut pas être annulée.`;
          })()}
          actions={[
            { label: 'Annuler', style: 'cancel' },
            { label: 'Supprimer', style: 'destructive', onPress: performDeleteEvent },
          ]}
          onDismiss={() => setEventToDelete(null)}
        />
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginTop: -8,
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12,
  },
  selectedDateIcon: {
    marginRight: 8,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: -0.3,
  },
  eventsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  eventsList: {
    gap: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
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
