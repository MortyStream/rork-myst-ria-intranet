import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { getSupabase } from '@/utils/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Edit,
  Trash,
  Share2,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Send,
  Users as UsersIcon,
  Repeat,
} from 'lucide-react-native';
import { useCalendarStore } from '@/store/calendar-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useResourcesStore } from '@/store/resources-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EventParticipant } from '@/types/calendar';
import { tapHaptic, warningHaptic, successHaptic } from '@/utils/haptics';

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getEventById, deleteEvent, updateParticipantStatus, sendReminderToParticipants } = useCalendarStore();
  const { getUserById } = useUsersStore();
  const { isUserCategoryResponsible } = useResourcesStore();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const eventId = params.id as string;
  const eventFromStore = getEventById(eventId);
  const [showParticipants, setShowParticipants] = useState(true);
  // Confirm modal pour delete event (remplace les 2 Alert.alert natifs blancs).
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Fallback fetch : si l'event n'est pas en cache local (cas typique : tap
  // notif "Vous êtes invité à X" sur un event qu'on n'a pas encore initialisé
  // côté Mélissa parce qu'elle n'a pas ouvert le calendrier depuis), on le
  // fetch direct via Supabase plutôt que d'afficher "Événement non trouvé".
  const [fetchedEvent, setFetchedEvent] = useState<typeof eventFromStore | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (eventFromStore || !eventId) return;
    let cancelled = false;
    setIsFetching(true);
    (async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();
        if (!cancelled && !error && data) {
          setFetchedEvent(data as any);
          // On pousse aussi l'event dans le store calendar global. Comme ça, la
          // souscription Realtime onDelete (cf. startEventsRealtimeSync) peut le
          // retirer du store si Kévin supprime → notre détection ci-dessous se
          // déclenche → Toast + back. Sans ça, Mélissa garde un fetchedEvent
          // local que rien ne retire en cas de suppression à distance.
          useCalendarStore.setState((state) => {
            if (state.events.some((e) => e.id === (data as any).id)) return state;
            return { events: [...state.events, data as any] };
          });
        }
      } catch (e) {
        console.log('event-detail fallback fetch failed:', e);
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, eventFromStore]);

  const event = eventFromStore ?? fetchedEvent;

  // Détection de suppression à distance : si la row était dans le store et
  // disparaît (Kévin l'a supprimée pendant que Mélissa était sur l'écran),
  // on prévient via Toast et on ferme la page automatiquement. Pattern miroir
  // de TaskDetail (cf. _layout.tsx + startEventsRealtimeSync).
  const wasInStoreRef = useRef(false);
  const hasNotifiedRef = useRef(false);
  useEffect(() => {
    if (eventFromStore) {
      wasInStoreRef.current = true;
      return;
    }
    if (wasInStoreRef.current && eventId && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      (async () => {
        try {
          const Toast = (await import('react-native-toast-message')).default;
          Toast.show({
            type: 'info',
            text1: 'Événement supprimé',
            text2: 'Cet événement a été supprimé par l\'organisateur.',
            visibilityTime: 4000,
          });
        } catch {}
        router.back();
      })();
    }
  }, [eventFromStore, eventId, router]);

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Détails de l'événement"
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <View style={styles.notFoundContainer}>
          {isFetching ? (
            <>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.notFoundText, { color: theme.text, marginTop: 12 }]}>
                Chargement…
              </Text>
            </>
          ) : (
            <Text style={[styles.notFoundText, { color: theme.text }]}>
              Événement non trouvé
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  const isEventCreator = user?.id === event.createdBy;
  const isCategoryResponsible = event.categoryId && user ? isUserCategoryResponsible(user.id, event.categoryId) : false;
  const canEdit = isAdminOrModerator || isEventCreator || isCategoryResponsible;
  const canManageParticipants = isAdminOrModerator || isEventCreator || isCategoryResponsible;

  // Récupérer le statut du participant actuel
  const currentUserStatus = user && event.participants 
    ? event.participants.find(p => p.userId === user.id)?.status 
    : null;

  // Dédoublonnage défensif : si la base contient accidentellement des participants
  // en double (événements créés avant le fix), on garde le premier (priorité confirmed).
  const participantMap = new Map<string, EventParticipant>();
  (event.participants || []).forEach((p) => {
    const existing = participantMap.get(p.userId);
    if (!existing) {
      participantMap.set(p.userId, p);
    } else {
      // On préfère 'confirmed' > 'declined' > 'pending'
      const rank = { confirmed: 0, declined: 1, pending: 2 } as const;
      if (rank[p.status] < rank[existing.status]) {
        participantMap.set(p.userId, p);
      }
    }
  });
  const sortedParticipants = Array.from(participantMap.values()).sort((a, b) => {
    const statusOrder = { confirmed: 0, pending: 1, declined: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const confirmedCount = event.participants?.filter(p => p.status === 'confirmed').length || 0;
  const pendingCount = event.participants?.filter(p => p.status === 'pending').length || 0;
  const declinedCount = event.participants?.filter(p => p.status === 'declined').length || 0;

  const handleEditEvent = () => {
    router.push({
      pathname: '/calendar/event-form',
      params: { id: event.id }
    });
  };

  const handleDeleteEvent = () => {
    setConfirmingDelete(true);
  };

  const performDeleteEvent = async () => {
    setConfirmingDelete(false);
    try {
      warningHaptic();
      await deleteEvent(event.id);
      router.back();
    } catch (e) {
      console.error('Delete event error:', e);
      Alert.alert('Erreur', 'Impossible de supprimer l\'événement.');
    }
  };

  const handleOpenMaps = async () => {
    if (!event.location) return;
    const query = encodeURIComponent(event.location);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    try {
      await Linking.openURL(url!);
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir Maps.');
    }
  };

  const handleShareEvent = async () => {
    try {
      const message = `${event.title}
${new Date(event.startTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
${new Date(event.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
${event.location || ''}`;
      
      if (Platform.OS === 'web') {
        // Web fallback
        Alert.alert('Partage', 'Le partage n\'est pas disponible sur le web.');
      } else {
        // Native sharing
        await Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
      }
    } catch (error) {
      console.error('Error sharing event:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du partage de l\'événement.');
    }
  };

  const handleUpdateStatus = async (status: 'confirmed' | 'declined') => {
    if (!user) return;

    // Haptic immédiat : success pour accepter, light pour décliner
    if (status === 'confirmed') successHaptic();
    else tapHaptic();

    // Le bandeau vert/rouge change instantanément grâce à l'UI optimiste
    // → pas besoin de popup de confirmation, le feedback visuel suffit.
    updateParticipantStatus(event.id, user.id, status);
  };

  const handleSendReminders = () => {
    if (!canManageParticipants) return;
    
    Alert.alert(
      'Envoyer des rappels',
      'Souhaitez-vous envoyer un rappel à tous les participants ou seulement à ceux qui n\'ont pas encore répondu ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tous',
          onPress: () => {
            sendReminderToParticipants(event.id, false);
            Alert.alert('Rappels envoyés', 'Des rappels ont été envoyés à tous les participants.');
          }
        },
        {
          text: 'En attente',
          onPress: () => {
            sendReminderToParticipants(event.id, true);
            Alert.alert('Rappels envoyés', 'Des rappels ont été envoyés aux participants en attente de réponse.');
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Nom affiché uniquement ici : "Prénom L." pour éviter que le statut soit croppé
  const formatShortName = (firstName: string, lastName: string) => {
    const initial = lastName && lastName.length > 0 ? `${lastName.charAt(0).toUpperCase()}.` : '';
    return `${firstName} ${initial}`.trim();
  };

  const renderParticipantItem = ({ item }: { item: EventParticipant }) => {
    const participant = getUserById(item.userId);
    if (!participant) return null;

    return (
      <View style={[styles.participantItem, { borderBottomColor: theme.border }]}>
        <View style={styles.participantInfo}>
          <Avatar
            source={participant.profileImage ? { uri: participant.profileImage } : undefined}
            name={`${participant.firstName} ${participant.lastName}`}
            size={36}
          />
          <View style={styles.participantDetails}>
            <Text
              style={[styles.participantName, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {formatShortName(participant.firstName, participant.lastName)}
            </Text>
            <Text style={[styles.participantRole, { color: darkMode ? theme.inactive : '#666666' }]}>
              {participant.role}
            </Text>
          </View>
        </View>
        
        <View style={[
          styles.participantStatus,
          { 
            backgroundColor: 
              item.status === 'confirmed' ? `${theme.success}20` :
              item.status === 'declined' ? `${theme.error}20` :
              `${theme.warning}20`
          }
        ]}>
          {item.status === 'confirmed' && (
            <>
              <CheckCircle size={14} color={theme.success} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: theme.success }]}>Présent</Text>
            </>
          )}
          {item.status === 'declined' && (
            <>
              <XCircle size={14} color={theme.error} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: theme.error }]}>Absent</Text>
            </>
          )}
          {item.status === 'pending' && (
            <>
              <ClockIcon size={14} color={theme.warning} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: theme.warning }]}>En attente</Text>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Détails de l'événement"
        showBackButton={true}
        onBackPress={() => router.back()}
        rightComponent={
          canEdit && (
            <TouchableOpacity onPress={handleEditEvent} style={styles.editButton}>
              <Edit size={20} color={theme.primary} />
            </TouchableOpacity>
          )
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.eventHeader, { borderLeftColor: event.color || theme.primary }]}>
          <Text style={[styles.eventTitle, { color: theme.text }]}>
            {event.title}
          </Text>
          {/* F4 : badge récurrent — visible si l'event est une série mère
              (recurrence !== null) OU une instance générée (recurrenceParentId). */}
          {(event.recurrence || event.recurrenceParentId) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Repeat size={13} color={darkMode ? theme.inactive : '#888'} />
              <Text style={{ fontSize: 12, color: darkMode ? theme.inactive : '#888', fontStyle: 'italic' }}>
                {event.recurrence
                  ? 'Événement récurrent — série mère'
                  : 'Occurrence d\'un événement récurrent'}
              </Text>
            </View>
          )}
        </View>

        {/* RSVP tout en haut : si invité en attente → gros boutons visibles immédiatement */}
        {currentUserStatus === 'pending' && (
          <View style={[styles.rsvpBanner, { backgroundColor: `${theme.warning}15`, borderColor: theme.warning }]}>
            <Text style={[styles.rsvpBannerTitle, { color: theme.text }]}>
              Vous êtes invité·e à cet événement
            </Text>
            <Text style={[styles.rsvpBannerSubtitle, { color: darkMode ? theme.inactive : '#666' }]}>
              Merci de répondre pour confirmer votre présence.
            </Text>
            <View style={styles.rsvpButtons}>
              <Button
                title="✓ Accepter"
                onPress={() => handleUpdateStatus('confirmed')}
                style={[styles.rsvpButton, { backgroundColor: theme.success }]}
                haptic="success"
              />
              <Button
                title="✕ Décliner"
                onPress={() => handleUpdateStatus('declined')}
                style={[styles.rsvpButton, { backgroundColor: theme.error }]}
                haptic="warning"
              />
            </View>
          </View>
        )}

        {/* Statut actuel remonté aussi en haut avec bouton pour changer */}
        {(currentUserStatus === 'confirmed' || currentUserStatus === 'declined') && (
          <View style={[
            styles.currentStatusContainer,
            {
              backgroundColor:
                currentUserStatus === 'confirmed' ? `${theme.success}20` : `${theme.error}20`
            }
          ]}>
            {currentUserStatus === 'confirmed' ? (
              <>
                <CheckCircle size={20} color={theme.success} style={styles.currentStatusIcon} />
                <Text style={[styles.currentStatusText, { color: theme.success }]}>
                  Vous participez
                </Text>
              </>
            ) : (
              <>
                <XCircle size={20} color={theme.error} style={styles.currentStatusIcon} />
                <Text style={[styles.currentStatusText, { color: theme.error }]}>
                  Vous avez décliné
                </Text>
              </>
            )}

            <View style={styles.changeStatusButtons}>
              {currentUserStatus === 'confirmed' ? (
                <Button
                  title="Décliner"
                  onPress={() => handleUpdateStatus('declined')}
                  variant="outline"
                  size="small"
                  style={styles.changeStatusButton}
                  textStyle={{ color: theme.error }}
                />
              ) : (
                <Button
                  title="Accepter"
                  onPress={() => handleUpdateStatus('confirmed')}
                  variant="outline"
                  size="small"
                  style={styles.changeStatusButton}
                  textStyle={{ color: theme.success }}
                />
              )}
            </View>
          </View>
        )}

        <View style={styles.eventDetails}>
          <View style={styles.detailItem}>
            <Calendar size={20} color={theme.primary} style={styles.detailIcon} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              {formatDate(event.startTime)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Clock size={20} color={theme.primary} style={styles.detailIcon} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              {formatTime(event.startTime)} - {event.endTime ? formatTime(event.endTime) : 'Non spécifié'}
            </Text>
          </View>

          {event.locationType === 'visio' && (
            <View style={styles.detailItem}>
              <Video size={20} color={theme.primary} style={styles.detailIcon} />
              <Text style={[styles.detailText, { color: theme.text }]}>
                Visioconférence
              </Text>
            </View>
          )}

          {event.locationType === 'onsite' && event.location && (
            <TouchableOpacity style={styles.detailItem} onPress={handleOpenMaps}>
              <MapPin size={20} color={theme.primary} style={styles.detailIcon} />
              <Text style={[styles.detailText, { color: theme.primary, textDecorationLine: 'underline' }]}>
                {event.location}
              </Text>
            </TouchableOpacity>
          )}

          {/* Rétro-compat : événements anciens sans locationType */}
          {!event.locationType && event.location && (
            <View style={styles.detailItem}>
              <MapPin size={20} color={theme.primary} style={styles.detailIcon} />
              <Text style={[styles.detailText, { color: theme.text }]}>
                {event.location}
              </Text>
            </View>
          )}
        </View>

        {event.description && (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.descriptionTitle, { color: theme.text }]}>
              Description
            </Text>
            <Text style={[styles.descriptionText, { color: theme.text }]}>
              {event.description}
            </Text>
          </View>
        )}

        {/* Section des participants */}
        <Card style={styles.participantsCard}>
          <TouchableOpacity 
            style={styles.participantsHeader}
            onPress={() => setShowParticipants(!showParticipants)}
          >
            <View style={styles.participantsHeaderLeft}>
              <UsersIcon size={20} color={theme.primary} style={styles.participantsIcon} />
              <Text style={[styles.participantsTitle, { color: theme.text }]}>
                Participants ({event.participants?.length || 0})
              </Text>
            </View>
            
            <View style={styles.participantCounts}>
              <View style={styles.countItem}>
                <CheckCircle size={14} color={theme.success} />
                <Text style={[styles.countText, { color: theme.text }]}>{confirmedCount}</Text>
              </View>
              <View style={styles.countItem}>
                <ClockIcon size={14} color={theme.warning} />
                <Text style={[styles.countText, { color: theme.text }]}>{pendingCount}</Text>
              </View>
              <View style={styles.countItem}>
                <XCircle size={14} color={theme.error} />
                <Text style={[styles.countText, { color: theme.text }]}>{declinedCount}</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {showParticipants && (
            <>
              {canManageParticipants && pendingCount > 0 && (
                <TouchableOpacity 
                  style={[styles.reminderButton, { backgroundColor: `${theme.warning}20` }]}
                  onPress={handleSendReminders}
                >
                  <Send size={16} color={theme.warning} style={styles.reminderIcon} />
                  <Text style={[styles.reminderText, { color: theme.warning }]}>
                    Envoyer un rappel aux participants en attente
                  </Text>
                </TouchableOpacity>
              )}
              
              {sortedParticipants.length > 0 ? (
                <FlatList
                  data={sortedParticipants}
                  renderItem={renderParticipantItem}
                  keyExtractor={(item) => item.userId}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={[styles.noParticipantsText, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Aucun participant pour cet événement
                </Text>
              )}
            </>
          )}
        </Card>

        <View style={styles.actionsContainer}>
          <Button
            title="Partager"
            onPress={handleShareEvent}
            variant="outline"
            style={styles.shareButton}
            leftIcon={<Share2 size={18} color={theme.primary} />}
          />

          {canEdit && (
            <Button
              title="Supprimer"
              onPress={handleDeleteEvent}
              variant="outline"
              style={styles.deleteButton}
              textStyle={{ color: theme.error }}
              leftIcon={<Trash size={18} color={theme.error} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Confirm delete event — remplace l'ancien Alert.alert natif blanc.
          Cohérent avec le pattern de calendar/index.tsx (long-press event).
          1 seul step (avant : 2 Alert.alert chaînés, lourd). */}
      <ConfirmModal
        visible={confirmingDelete}
        title="Supprimer l'événement ?"
        message={(() => {
          const count = event.participants?.length ?? 0;
          const detail = count > 0
            ? `« ${event.title} » sera retiré du calendrier de ${count} participant${count > 1 ? 's' : ''}.`
            : `« ${event.title} » sera supprimé.`;
          return `${detail}\n\nCette action est définitive et ne peut pas être annulée.`;
        })()}
        actions={[
          { label: 'Annuler', style: 'cancel' },
          { label: 'Supprimer', style: 'destructive', onPress: performDeleteEvent },
        ]}
        onDismiss={() => setConfirmingDelete(false)}
      />
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
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
  },
  eventHeader: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    marginBottom: 24,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  eventDetails: {
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailText: {
    fontSize: 16,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  participantsCard: {
    marginBottom: 24,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsIcon: {
    marginRight: 8,
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  participantCounts: {
    flexDirection: 'row',
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  countText: {
    fontSize: 14,
    marginLeft: 4,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  reminderIcon: {
    marginRight: 8,
  },
  reminderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  participantDetails: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
  },
  participantRole: {
    fontSize: 12,
  },
  participantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noParticipantsText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  rsvpBanner: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  rsvpBannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  rsvpBannerSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  rsvpButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  rsvpButton: {
    flex: 1,
    minHeight: 48,
  },
  currentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  currentStatusIcon: {
    marginRight: 8,
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  changeStatusButtons: {
    marginLeft: 8,
  },
  changeStatusButton: {
    minWidth: 100,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  shareButton: {
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
});