import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Link as LinkIcon,
  Edit,
  Trash,
  Share2,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Send,
  Users as UsersIcon,
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
import { EventParticipant } from '@/types/calendar';

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
  const event = getEventById(eventId);
  const [showParticipants, setShowParticipants] = useState(true);

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Détails de l'événement"
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: theme.text }]}>
            Événement non trouvé
          </Text>
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

  // Trier les participants par statut
  const sortedParticipants = [...(event.participants || [])].sort((a, b) => {
    // Ordre: confirmed, pending, declined
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
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteEvent(event.id);
            Alert.alert('Succès', 'Événement supprimé avec succès.');
            router.back();
          }
        }
      ]
    );
  };

  const handleOpenLink = async () => {
    if (!event.url) return;

    try {
      const canOpen = await Linking.canOpenURL(event.url);
      if (canOpen) {
        await Linking.openURL(event.url);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien.');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ouverture du lien.');
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

  const handleUpdateStatus = (status: 'confirmed' | 'declined') => {
    if (!user) return;
    
    updateParticipantStatus(event.id, user.id, status);
    
    const statusText = status === 'confirmed' ? 'accepté' : 'décliné';
    Alert.alert('Réponse enregistrée', `Vous avez ${statusText} l'invitation à l'événement "${event.title}".`);
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
            <Text style={[styles.participantName, { color: theme.text }]}>
              {participant.firstName} {participant.lastName}
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
        </View>

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

          {event.location && (
            <View style={styles.detailItem}>
              <MapPin size={20} color={theme.primary} style={styles.detailIcon} />
              <Text style={[styles.detailText, { color: theme.text }]}>
                {event.location}
              </Text>
            </View>
          )}

          {event.url && (
            <TouchableOpacity style={styles.detailItem} onPress={handleOpenLink}>
              <LinkIcon size={20} color={theme.primary} style={styles.detailIcon} />
              <Text style={[styles.detailText, { color: theme.primary, textDecorationLine: 'underline' }]}>
                Lien externe
              </Text>
            </TouchableOpacity>
          )}

          {event.fileUrl && (
            <View style={styles.detailItem}>
              <FileText size={20} color={theme.primary} style={styles.detailIcon} />
              <Text style={[styles.detailText, { color: theme.text }]}>
                Document joint
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

        {/* Boutons de réponse pour l'utilisateur actuel si en attente */}
        {currentUserStatus === 'pending' && (
          <View style={styles.responseContainer}>
            <Text style={[styles.responseTitle, { color: theme.text }]}>
              Répondre à l'invitation
            </Text>
            <View style={styles.responseButtons}>
              <Button
                title="Accepter"
                onPress={() => handleUpdateStatus('confirmed')}
                style={[styles.responseButton, { backgroundColor: theme.success }]}
              />
              <Button
                title="Décliner"
                onPress={() => handleUpdateStatus('declined')}
                style={[styles.responseButton, { backgroundColor: theme.error }]}
              />
            </View>
          </View>
        )}

        {/* Affichage du statut actuel de l'utilisateur */}
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
                  Vous participez à cet événement
                </Text>
              </>
            ) : (
              <>
                <XCircle size={20} color={theme.error} style={styles.currentStatusIcon} />
                <Text style={[styles.currentStatusText, { color: theme.error }]}>
                  Vous avez décliné cet événement
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantDetails: {
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
  responseContainer: {
    marginBottom: 24,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  responseButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  responseButton: {
    flex: 1,
    marginHorizontal: 4,
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