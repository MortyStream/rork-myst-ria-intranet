import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatePickerModal } from '@/components/DatePickerModal';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  PinIcon,
  Palette,
  Repeat,
  Users,
  UserPlus,
  X,
  Check,
} from 'lucide-react-native';
import { useCalendarStore } from '@/store/calendar-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useResourcesStore } from '@/store/resources-store';
import { useUserGroupsStore } from '@/store/user-groups-store';
import { useNotificationsStore } from '@/store/notifications-store';
import Toast from 'react-native-toast-message';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { successHaptic } from '@/utils/haptics';
import { Avatar } from '@/components/Avatar';
import { ParticipantsStack } from '@/components/ParticipantsStack';
import { User } from '@/types/user';
import { useFormDraft } from '@/hooks/useFormDraft';

// Couleurs disponibles pour les événements
const EVENT_COLORS = [
  '#4285F4', // Bleu
  '#EA4335', // Rouge
  '#FBBC05', // Jaune
  '#34A853', // Vert
  '#9C27B0', // Violet
  '#FF9800', // Orange
  '#795548', // Marron
  '#607D8B', // Bleu-gris
];

export default function EventFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addEvent, getEventById, updateEvent } = useCalendarStore();
  const { user } = useAuthStore();
  const { users } = useUsersStore();
  const { categories, initializeDefaultCategories } = useResourcesStore();
  const { groups, initializeGroups } = useUserGroupsStore();

  useEffect(() => {
    initializeDefaultCategories();
    initializeGroups();
  }, []);
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const eventId = params.id as string | undefined;
  const dateParam = params.date as string | undefined;
  const existingEvent = eventId ? getEventById(eventId) : undefined;
  
  // Initialiser la date à partir des paramètres ou utiliser la date actuelle
  const initialDate = dateParam 
    ? new Date(dateParam) 
    : existingEvent 
      ? new Date(existingEvent.startTime) 
      : new Date();

  const [title, setTitle] = useState(existingEvent?.title || '');
  const [description, setDescription] = useState(existingEvent?.description || '');
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(existingEvent?.endTime ? new Date(existingEvent.endTime) : new Date(initialDate.getTime() + 60 * 60 * 1000));
  const [locationType, setLocationType] = useState<'visio' | 'onsite'>(
    existingEvent?.locationType || 'onsite'
  );
  const [location, setLocation] = useState(existingEvent?.location || '');
  const [color, setColor] = useState(existingEvent?.color || EVENT_COLORS[0]);
  const [isPinned, setIsPinned] = useState(existingEvent?.isPinned || false);
  // F4 : récurrence (uniquement en création — pas en édition d'une instance).
  const [recurrence, setRecurrence] = useState<'weekly' | 'biweekly' | 'monthly' | 'yearly' | null>(
    existingEvent?.recurrence ?? null
  );
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const recurrenceLabel = (r: typeof recurrence): string => {
    if (!r) return 'Aucune';
    if (r === 'weekly') return 'Hebdomadaire (12 occurrences)';
    if (r === 'biweekly') return 'Bimensuel (12 occurrences)';
    if (r === 'monthly') return 'Mensuel (12 occurrences)';
    return 'Annuel (5 occurrences)';
  };
  const [categoryId, setCategoryId] = useState(existingEvent?.categoryId || '');
  const [participants, setParticipants] = useState<string[]>(
    existingEvent?.participants?.map(p => p.userId) || []
  );
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  // Valeurs temporaires pour iOS (la roue ne confirme pas avant d'appuyer sur "OK")
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // F3 : autosave brouillon. Activé uniquement en mode CRÉATION (pas édition).
  const draftKey = 'event-form-draft';
  const draftValues = {
    title,
    description,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    locationType,
    location,
    color,
    isPinned,
    categoryId,
    participants,
  };
  const { draft, isLoaded: draftLoaded, clearDraft } = useFormDraft(
    draftKey,
    draftValues,
    { enabled: !existingEvent }
  );

  useEffect(() => {
    if (!draftLoaded || !draft || existingEvent) return;
    if (!draft.title?.trim()) return;
    setTitle(draft.title || '');
    setDescription(draft.description || '');
    if (draft.startDate) setStartDate(new Date(draft.startDate));
    if (draft.endDate) setEndDate(new Date(draft.endDate));
    if (draft.locationType) setLocationType(draft.locationType);
    if (draft.location) setLocation(draft.location);
    if (draft.color) setColor(draft.color);
    if (typeof draft.isPinned === 'boolean') setIsPinned(draft.isPinned);
    if (draft.categoryId) setCategoryId(draft.categoryId);
    if (Array.isArray(draft.participants)) setParticipants(draft.participants);
    Toast.show({
      type: 'info',
      text1: 'Brouillon restauré',
      text2: 'Tu reprends là où tu avais laissé.',
      visibilityTime: 2500,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLoaded]);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  // Vérifier si l'utilisateur a les droits pour créer/modifier un événement
  useEffect(() => {
    if (!isAdminOrModerator) {
      Alert.alert(
        'Accès refusé',
        'Vous n\'avez pas les droits nécessaires pour créer ou modifier un événement.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [isAdminOrModerator]);

  // Android : ferme dès la sélection. iOS : stocke dans tempDate, confirme sur "OK".
  type PickerTarget = 'startDate' | 'startTime' | 'endDate' | 'endTime';
  const [activePickerTarget, setActivePickerTarget] = useState<PickerTarget | null>(null);

  const openPicker = (target: PickerTarget) => {
    const initial =
      target === 'startDate' || target === 'startTime' ? startDate : endDate;
    setTempDate(new Date(initial));
    setActivePickerTarget(target);
    if (target === 'startDate') setShowStartDatePicker(true);
    if (target === 'startTime') setShowStartTimePicker(true);
    if (target === 'endDate') setShowEndDatePicker(true);
    if (target === 'endTime') setShowEndTimePicker(true);
  };

  const applyPickerValue = (picked: Date) => {
    if (activePickerTarget === 'startDate') {
      const newDate = new Date(picked);
      newDate.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
      setStartDate(newDate);
      if (endDate < newDate) {
        const newEnd = new Date(newDate);
        newEnd.setHours(newDate.getHours() + 1);
        setEndDate(newEnd);
      }
    } else if (activePickerTarget === 'startTime') {
      const newDate = new Date(startDate);
      newDate.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      setStartDate(newDate);
      if (endDate < newDate) {
        const newEnd = new Date(newDate);
        newEnd.setHours(newDate.getHours() + 1);
        setEndDate(newEnd);
      }
    } else if (activePickerTarget === 'endDate') {
      const newDate = new Date(picked);
      newDate.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);
      if (newDate < startDate) {
        Toast.show({ type: 'error', text1: 'Dates invalides', text2: 'La fin ne peut pas être avant le début.' });
        return false;
      }
      setEndDate(newDate);
    } else if (activePickerTarget === 'endTime') {
      const newDate = new Date(endDate);
      newDate.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      if (
        newDate.toDateString() === startDate.toDateString() &&
        newDate < startDate
      ) {
        Toast.show({ type: 'error', text1: 'Heures invalides', text2: "L'heure de fin ne peut pas être avant le début." });
        return false;
      }
      setEndDate(newDate);
    }
    return true;
  };

  const closeAllPickers = () => {
    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
    setActivePickerTarget(null);
  };

  // Handlers unifiés
  const handlePickerChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      closeAllPickers();
      if (selectedDate) applyPickerValue(selectedDate);
    } else {
      // iOS : on met à jour tempDate en temps réel mais on n'applique pas encore
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleIOSConfirm = () => {
    applyPickerValue(tempDate);
    closeAllPickers();
  };

  const handleStartDateChange = handlePickerChange;
  const handleStartTimeChange = handlePickerChange;
  const handleEndDateChange = handlePickerChange;
  const handleEndTimeChange = handlePickerChange;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAddParticipant = (userId: string) => {
    if (!participants.includes(userId)) {
      setParticipants([...participants, userId]);
    }
    setShowParticipantPicker(false);
    setSearchQuery('');
  };

  const handleRemoveParticipant = (userId: string) => {
    setParticipants(participants.filter(id => id !== userId));
  };

  const handleAddGroup = (memberIds: string[]) => {
    // Fusionne sans doublon
    const merged = Array.from(new Set([...participants, ...memberIds]));
    setParticipants(merged);
    setShowGroupPicker(false);
  };

  const handleAddAllUsers = () => {
    setParticipants(users.map(u => u.id));
    setShowGroupPicker(false);
  };

  const handleSelectCategory = (id: string) => {
    setCategoryId(id);
    setShowCategoryPicker(false);
  };

  const getCategoryName = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category ? category.name : 'Sélectionner une catégorie';
  };

  const handleSave = async () => {
    if (!title) {
      Alert.alert('Champ obligatoire', 'Veuillez remplir le titre de l\'événement.');
      return;
    }

    setIsSubmitting(true);

    try {
      const eventData = {
        title,
        description,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        location: locationType === 'visio' ? '' : location,
        locationType,
        color,
        isPinned,
        categoryId: categoryId || undefined,
        // F4 : récurrence (uniquement en création — désactivée en édition).
        recurrence: existingEvent ? null : recurrence,
      };

      if (existingEvent) {
        // Mise à jour d'un événement existant — on calcule la liste finale des
        // participants en UN SEUL coup pour éviter la race condition qui faisait
        // perdre les ajouts en masse (ex. "Par groupe" → 7 ajouts → 1 seul gardé).
        const currentParticipantsList = existingEvent.participants ?? [];
        const newParticipantIdsSet = new Set(participants);

        // Conserver les participants existants qui sont encore sélectionnés
        // OU le créateur (jamais retiré, même s'il n'est plus dans la liste)
        const kept = currentParticipantsList.filter(
          (p) => newParticipantIdsSet.has(p.userId) || p.userId === existingEvent.createdBy
        );

        // Détecter les nouveaux ajouts (présents dans `participants` mais pas dans l'event)
        const existingIds = new Set(currentParticipantsList.map((p) => p.userId));
        const additions = participants
          .filter((id) => !existingIds.has(id))
          .map((userId) => ({
            userId,
            status: 'pending' as const,
          }));

        const mergedParticipants = [...kept, ...additions];

        // UN SEUL update DB avec event + participants
        await updateEvent(existingEvent.id, {
          ...eventData,
          participants: mergedParticipants,
        });

        // Notifier les nouveaux participants (best-effort, non bloquant)
        if (additions.length > 0) {
          try {
            const startDateStr = new Date(eventData.startTime).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long',
            });
            const { addNotification } = useNotificationsStore.getState();
            addNotification({
              title: '📅 Invitation à un événement',
              message: `Vous avez été invité à "${eventData.title}" le ${startDateStr}.`,
              targetRoles: [],
              targetUserIds: additions.map((a) => a.userId),
              eventId: existingEvent.id,
            });
          } catch (notifErr) {
            console.warn('Erreur notif ajout participants (non-bloquant):', notifErr);
          }
        }

        Toast.show({
          type: 'success',
          text1: 'Événement mis à jour',
          text2: additions.length > 0
            ? `${additions.length} nouveau${additions.length > 1 ? 'x' : ''} participant${additions.length > 1 ? 's' : ''} invité${additions.length > 1 ? 's' : ''}`
            : undefined,
        });
      } else {
        // Création d'un nouvel événement
        await addEvent(eventData, participants);
        Toast.show({
          type: 'success',
          text1: 'Événement créé',
          text2: eventData.title,
        });
        // F3 : on a sauvegardé avec succès → clear le brouillon
        await clearDraft();
      }

      successHaptic();

      router.back();
    } catch (error) {
      console.error('Error saving event:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: "Impossible d'enregistrer l'événement." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Filtrer les utilisateurs pour la recherche
  const filteredUsers = users.filter(u => {
    if (participants.includes(u.id)) return false;
    
    if (searchQuery === '') return true;
    
    return (
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title={existingEvent ? 'Modifier un événement' : 'Ajouter un événement'}
        showBackButton={true}
        onBackPress={handleCancel}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.formSection}>
            <Input
              label="Titre *"
              placeholder="Entrez le titre de l'événement"
              value={title}
              onChangeText={setTitle}
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Description"
              placeholder="Entrez une description (optionnel)"
              value={description}
              onChangeText={setDescription}
              containerStyle={styles.inputContainer}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.label, { color: theme.text }]}>Date et heure de début *</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => openPicker('startDate')}
              >
                <Calendar size={20} color={theme.primary} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: theme.text }]}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.timeButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => openPicker('startTime')}
              >
                <Clock size={20} color={theme.primary} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: theme.text }]}>
                  {formatTime(startDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Date et heure de fin *</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => openPicker('endDate')}
              >
                <Calendar size={20} color={theme.primary} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: theme.text }]}>
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.timeButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => openPicker('endTime')}
              >
                <Clock size={20} color={theme.primary} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: theme.text }]}>
                  {formatTime(endDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Lieu</Text>
            <View style={styles.locationTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.locationTypeButton,
                  { backgroundColor: theme.card, borderColor: locationType === 'visio' ? theme.primary : theme.border },
                  locationType === 'visio' && { borderWidth: 2 }
                ]}
                onPress={() => setLocationType('visio')}
              >
                <Video size={20} color={locationType === 'visio' ? theme.primary : theme.text} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: locationType === 'visio' ? theme.primary : theme.text, fontWeight: locationType === 'visio' ? '600' : '400' }]}>
                  Visioconférence
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.locationTypeButton,
                  { backgroundColor: theme.card, borderColor: locationType === 'onsite' ? theme.primary : theme.border },
                  locationType === 'onsite' && { borderWidth: 2 }
                ]}
                onPress={() => setLocationType('onsite')}
              >
                <MapPin size={20} color={locationType === 'onsite' ? theme.primary : theme.text} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: locationType === 'onsite' ? theme.primary : theme.text, fontWeight: locationType === 'onsite' ? '600' : '400' }]}>
                  Présentiel
                </Text>
              </TouchableOpacity>
            </View>

            {locationType === 'onsite' && (
              <Input
                label="Adresse"
                placeholder="Ex : 12 rue de la Paix, 75002 Paris"
                value={location}
                onChangeText={setLocation}
                containerStyle={styles.inputContainer}
                leftIcon={<MapPin size={20} color={darkMode ? theme.text : '#333333'} />}
              />
            )}

            <Text style={[styles.label, { color: theme.text }]}>Catégorie</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                {categoryId ? getCategoryName(categoryId) : 'Sélectionner une catégorie'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: theme.text }]}>Participants</Text>
            <View style={styles.participantsContainer}>
              <ParticipantsStack
                selectedIds={participants}
                allUsers={users}
                onRemove={handleRemoveParticipant}
              />

              <View style={styles.participantActionsRow}>
                <TouchableOpacity
                  style={[styles.addParticipantButton, { borderColor: theme.border, flex: 1 }]}
                  onPress={() => setShowParticipantPicker(true)}
                >
                  <UserPlus size={18} color={theme.primary} />
                  <Text style={[styles.addParticipantText, { color: theme.primary }]}>
                    Un par un
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addParticipantButton, { borderColor: theme.border, flex: 1 }]}
                  onPress={() => setShowGroupPicker(true)}
                >
                  <Users size={18} color={theme.primary} />
                  <Text style={[styles.addParticipantText, { color: theme.primary }]}>
                    Par groupe
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Couleur de l'événement</Text>
            <TouchableOpacity
              style={[styles.colorButton, { borderColor: theme.border }]}
              onPress={() => setShowColorPicker(!showColorPicker)}
            >
              <View style={[styles.colorPreview, { backgroundColor: color }]} />
              <Text style={[styles.colorButtonText, { color: theme.text }]}>
                Choisir une couleur
              </Text>
            </TouchableOpacity>

            {showColorPicker && (
              <View style={styles.colorPickerContainer}>
                {EVENT_COLORS.map((colorOption) => (
                  <TouchableOpacity
                    key={colorOption}
                    style={[
                      styles.colorOption,
                      { backgroundColor: colorOption },
                      color === colorOption && styles.selectedColorOption
                    ]}
                    onPress={() => {
                      setColor(colorOption);
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </View>
            )}

            <View style={styles.switchContainer}>
              <View style={styles.switchTextContainer}>
                <PinIcon size={20} color={theme.primary} style={styles.switchIcon} />
                <Text style={[styles.switchLabel, { color: theme.text }]}>
                  Épingler dans les actualités
                </Text>
              </View>
              <Switch
                value={isPinned}
                onValueChange={setIsPinned}
                trackColor={{ false: '#767577', true: `${theme.primary}80` }}
                thumbColor={isPinned ? theme.primary : '#f4f3f4'}
              />
            </View>
            <Text style={[styles.helperText, { color: darkMode ? theme.inactive : '#666666' }]}>
              {isPinned
                ? "Cet événement sera affiché dans les actualités sur la page d'accueil."
                : "Cet événement ne sera pas mis en avant sur la page d'accueil."}
            </Text>

            {/* F4 : récurrence — visible uniquement en création */}
            {!existingEvent && (
              <>
                <TouchableOpacity
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      marginTop: 8,
                    },
                  ]}
                  onPress={() => setShowRecurrencePicker(true)}
                  accessibilityLabel="Choisir la fréquence de répétition"
                >
                  <Repeat size={20} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: darkMode ? theme.inactive : '#666666', marginBottom: 0, fontSize: 12 }]}>
                      Récurrence
                    </Text>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '500' }}>
                      {recurrenceLabel(recurrence)}
                    </Text>
                  </View>
                </TouchableOpacity>
                {recurrence && (
                  <Text style={[styles.helperText, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Les occurrences seront créées automatiquement à partir du {startDate.toLocaleDateString('fr-FR')}.
                  </Text>
                )}
              </>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Annuler"
              onPress={handleCancel}
              variant="outline"
              style={styles.cancelButton}
              textStyle={{ color: theme.error }}
              fullWidth
            />
            <Button
              title={existingEvent ? "Mettre à jour" : "Enregistrer"}
              onPress={handleSave}
              loading={isSubmitting}
              style={styles.saveButton}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* R1 : Date pickers custom thémés (remplacent native Android + iOS spinner) */}
      <DatePickerModal
        visible={showStartDatePicker}
        initialDate={startDate}
        title="Date de début"
        onCancel={closeAllPickers}
        onConfirm={(d) => {
          applyPickerValue(d);
          closeAllPickers();
        }}
      />
      <DatePickerModal
        visible={showEndDatePicker}
        initialDate={endDate}
        title="Date de fin"
        onCancel={closeAllPickers}
        onConfirm={(d) => {
          applyPickerValue(d);
          closeAllPickers();
        }}
      />

      {/* Time pickers — Android : dialog native (acceptable, rapide) */}
      {Platform.OS === 'android' && showStartTimePicker && (
        <DateTimePicker value={startDate} mode="time" display="default" onChange={handleStartTimeChange} />
      )}
      {Platform.OS === 'android' && showEndTimePicker && (
        <DateTimePicker value={endDate} mode="time" display="default" onChange={handleEndTimeChange} />
      )}

      {/* Time pickers — iOS : Modal avec spinner + bouton Confirmer */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showStartTimePicker || showEndTimePicker}
          transparent
          animationType="slide"
          onRequestClose={closeAllPickers}
        >
          <TouchableOpacity style={styles.iosPickerOverlay} activeOpacity={1} onPress={closeAllPickers} />
          <View style={[styles.iosPickerContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.iosPickerHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={closeAllPickers} style={styles.iosPickerBtn}>
                <Text style={[styles.iosPickerBtnText, { color: theme.inactive }]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.iosPickerTitle, { color: theme.text }]}>
                Choisir une heure
              </Text>
              <TouchableOpacity onPress={handleIOSConfirm} style={styles.iosPickerBtn}>
                <Text style={[styles.iosPickerBtnText, { color: theme.primary, fontWeight: '700' }]}>OK</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="spinner"
              onChange={handlePickerChange}
              locale="fr-FR"
              style={styles.iosPickerSpinner}
              textColor={theme.text}
            />
          </View>
        </Modal>
      )}

      {/* Category Picker Modal */}
      {showCategoryPicker && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Sélectionner une catégorie
            </Text>
            
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: theme.border }]}
                onPress={() => handleSelectCategory('')}
              >
                <Text style={[styles.modalItemText, { color: theme.text }]}>
                  Aucune catégorie
                </Text>
                {!categoryId && <Check size={18} color={theme.primary} />}
              </TouchableOpacity>
              
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.modalItem, { borderBottomColor: theme.border }]}
                  onPress={() => handleSelectCategory(category.id)}
                >
                  <Text style={[styles.modalItemText, { color: theme.text }]}>
                    {category.icon} {category.name}
                  </Text>
                  {categoryId === category.id && <Check size={18} color={theme.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderTopColor: theme.border }]}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.primary }]}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Group Picker Modal */}
      {showGroupPicker && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Inviter un groupe
            </Text>

            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: theme.border }]}
                onPress={handleAddAllUsers}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.groupIconCircle, { backgroundColor: theme.primary }]}>
                    <Text style={{ fontSize: 18 }}>🌍</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemText, { color: theme.text }]}>
                      Toute l'association
                    </Text>
                    <Text style={[styles.groupSubtext, { color: darkMode ? theme.inactive : '#666' }]}>
                      {users.length} membre{users.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {groups.length === 0 ? (
                <Text style={[styles.groupSubtext, { color: darkMode ? theme.inactive : '#666', padding: 16, textAlign: 'center' }]}>
                  Aucun groupe défini. Créez-en via le panneau d'administration.
                </Text>
              ) : (
                groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.modalItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleAddGroup(g.memberIds)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.groupIconCircle, { backgroundColor: g.color || theme.primary }]}>
                        <Text style={{ fontSize: 18 }}>{g.icon || '👥'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalItemText, { color: theme.text }]}>
                          {g.name}
                        </Text>
                        <Text style={[styles.groupSubtext, { color: darkMode ? theme.inactive : '#666' }]}>
                          {g.memberIds.length} membre{g.memberIds.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCancelButton, { borderTopColor: theme.border }]}
              onPress={() => setShowGroupPicker(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.primary }]}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Participant Picker Modal */}
      {showParticipantPicker && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Ajouter des participants
            </Text>
            
            <View style={[styles.searchContainer, { backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', borderColor: theme.border }]}>
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Rechercher un utilisateur..."
                placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.userItem, { borderBottomColor: theme.border }]}
                  onPress={() => handleAddParticipant(item.id)}
                >
                  <Avatar
                    source={item.profileImage ? { uri: item.profileImage } : undefined}
                    name={`${item.firstName} ${item.lastName}`}
                    size={36}
                  />
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.text }]}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={[styles.userRole, { color: darkMode ? theme.inactive : '#666666' }]}>
                      {item.role}
                    </Text>
                  </View>
                  <UserPlus size={18} color={theme.primary} />
                </TouchableOpacity>
              )}
              style={styles.userList}
              ListEmptyComponent={
                <Text style={[styles.emptyListText, { color: darkMode ? theme.inactive : '#666666' }]}>
                  {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur disponible'}
                </Text>
              }
            />
            
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderTopColor: theme.border }]}
              onPress={() => setShowParticipantPicker(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.primary }]}>
                Terminer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* F4 : picker récurrence (Modal bottom-sheet style) */}
      <Modal
        visible={showRecurrencePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecurrencePicker(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowRecurrencePicker(false)}
        >
          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 16,
              paddingBottom: 32,
            }}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>Répétition</Text>
              <TouchableOpacity onPress={() => setShowRecurrencePicker(false)}>
                <Text style={{ color: theme.primary, fontSize: 14 }}>Fermer</Text>
              </TouchableOpacity>
            </View>
            {([null, 'weekly', 'biweekly', 'monthly', 'yearly'] as const).map((opt) => (
              <TouchableOpacity
                key={opt ?? 'none'}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                }}
                onPress={() => {
                  setRecurrence(opt);
                  setShowRecurrencePicker(false);
                }}
              >
                <Text style={{ color: theme.text, fontSize: 15 }}>{recurrenceLabel(opt)}</Text>
                {recurrence === opt && (
                  <Repeat size={16} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateButton: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  timeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 14,
  },
  locationTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  locationTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  pickerButtonText: {
    fontSize: 14,
  },
  participantsContainer: {
    marginBottom: 16,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingRight: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 12,
    marginLeft: 6,
    marginRight: 4,
  },
  removeParticipantButton: {
    padding: 2,
  },
  noParticipantsText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  participantActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  groupIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  addParticipantText: {
    fontSize: 14,
    marginLeft: 8,
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  colorButtonText: {
    fontSize: 14,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    marginTop: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 4,
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: '#000',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchIcon: {
    marginRight: 8,
  },
  switchLabel: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 16,
  },
  cancelButton: {
    marginBottom: 12,
  },
  saveButton: {
    marginBottom: 24,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
  modalCancelButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  userList: {
    maxHeight: 300,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userRole: {
    fontSize: 12,
  },
  emptyListText: {
    padding: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosPickerContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34, // safe area bottom
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  iosPickerBtn: {
    padding: 4,
    minWidth: 60,
  },
  iosPickerBtnText: {
    fontSize: 16,
  },
  iosPickerSpinner: {
    height: 200,
  },
});