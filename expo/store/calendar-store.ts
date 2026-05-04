import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, EventParticipant } from '@/types/calendar';
import { getSupabase, subscribeToEventsList } from '@/utils/supabase';
import { useAuthStore } from './auth-store';
import { useNotificationsStore } from './notifications-store';
import { useUsersStore } from './users-store';
import { usePendingQueueStore } from './pending-queue-store';
import { getIsOnline } from '@/components/OfflineBanner';

const fetchEventsFromSupabase = async (): Promise<Event[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('startTime', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

// Module-scoped : tient le cleanup de la souscription Realtime globale
// (INSERT/UPDATE/DELETE sur la table events). Démarrée au login, arrêtée
// au logout. Pattern miroir de tasks-store.
let _eventsRealtimeUnsubscribe: (() => void) | null = null;

/** Démarre la sync Realtime de la liste des events. Idempotent. */
export const startEventsRealtimeSync = () => {
  if (_eventsRealtimeUnsubscribe) return;
  _eventsRealtimeUnsubscribe = subscribeToEventsList({
    onInsert: (newEvent) => {
      useCalendarStore.setState((state) => {
        if (state.events.some((e) => e.id === newEvent.id)) return state;
        return { events: [...state.events, newEvent] };
      });
    },
    onUpdate: (updatedEvent) => {
      useCalendarStore.setState((state) => ({
        events: state.events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)),
      }));
    },
    onDelete: (oldEvent) => {
      useCalendarStore.setState((state) => ({
        events: state.events.filter((e) => e.id !== oldEvent.id),
      }));
    },
  });
};

/** Arrête la sync Realtime. À appeler au logout. */
export const stopEventsRealtimeSync = () => {
  if (_eventsRealtimeUnsubscribe) {
    try { _eventsRealtimeUnsubscribe(); } catch {}
    _eventsRealtimeUnsubscribe = null;
  }
};

interface CalendarState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
}

interface CalendarStore extends CalendarState {
  initializeEvents: () => Promise<void>;
  addEvent: (event: Omit<Event, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'participants'>, invitedUserIds?: string[]) => Promise<string>;
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addParticipant: (eventId: string, userId: string, status?: 'confirmed' | 'declined' | 'pending') => Promise<void>;
  removeParticipant: (eventId: string, userId: string) => Promise<void>;
  updateParticipantStatus: (eventId: string, userId: string, status: 'confirmed' | 'declined' | 'pending') => Promise<void>;
  getEventById: (id: string) => Event | undefined;
  getEventsByDate: (date: Date) => Event[];
  getPinnedEvents: (limit?: number) => Event[];
  getUpcomingEvents: (limit?: number) => Event[];
  getUserEvents: (userId: string, limit?: number) => Event[];
  getParticipantStatus: (eventId: string, userId: string) => 'confirmed' | 'declined' | 'pending' | null;
  getEventParticipants: (eventId: string) => EventParticipant[];
  sendReminderToParticipants: (eventId: string, onlyPending: boolean) => void;
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      events: [],
      isLoading: false,
      error: null,

      initializeEvents: async () => {
        set({ isLoading: true, error: null });
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const events = await fetchEventsFromSupabase();
            set({ events, isLoading: false });
            return;
          } catch (error) {
            console.log(`Erreur chargement événements (tentative ${attempt}):`, error);
            if (attempt < 3) {
              await new Promise<void>((r) => setTimeout(r, 200 * attempt));
            } else {
              set({ isLoading: false });
            }
          }
        }
      },

      addEvent: async (eventData, invitedUserIds = []) => {
        const supabase = getSupabase();
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) throw new Error('Non authentifié');

        // Dédoublonnage : le créateur ne doit apparaître qu'une fois, et pas de doublons
        // même si invitedUserIds contient des répétitions.
        const uniqueInvitedIds = Array.from(new Set(invitedUserIds)).filter(
          (uid) => uid !== currentUser.id
        );
        const participants: EventParticipant[] = [
          { userId: currentUser.id, status: 'confirmed', responseDate: new Date().toISOString() },
          ...uniqueInvitedIds.map((userId) => ({ userId, status: 'pending' as const })),
        ];

        const now = new Date().toISOString();
        const newEvent = {
          ...eventData,
          participants,
          createdBy: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        const { data, error } = await supabase
          .from('events')
          .insert(newEvent)
          .select()
          .single();
        if (error) throw error;
        // Dédup défensif (pas de Realtime sur events aujourd'hui mais le pattern
        // tasks-store nous a mordu avec la race insert vs onInsert — autant
        // se prémunir au cas où on ajoute la sub Realtime plus tard).
        set(state => ({
          events: state.events.some(e => e.id === data.id)
            ? state.events
            : [...state.events, data],
        }));

        // Notifier les participants invités (pas le créateur)
        if (uniqueInvitedIds.length > 0) {
          const startDate = new Date(eventData.startTime).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
          });
          useNotificationsStore.getState().addNotification({
            title: '📅 Invitation à un événement',
            message: `Vous avez été invité à "${eventData.title}" le ${startDate}.`,
            targetRoles: [],
            targetUserIds: uniqueInvitedIds,
            eventId: data.id,
          });
        }

        return data.id;
      },

      updateEvent: async (id, eventData) => {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('events')
          .update({ ...eventData, updatedAt: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        set(state => ({
          events: state.events.map(e => e.id === id ? data : e)
        }));
      },

      deleteEvent: async (id) => {
        const supabase = getSupabase();
        // UI optimiste : retire l'event de la liste IMMÉDIATEMENT
        const previousEvents = get().events;
        set((state) => ({ events: state.events.filter((e) => e.id !== id) }));

        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) {
          console.error('deleteEvent failed, rolling back:', error);
          set({ events: previousEvents });
          try {
            const Toast = (await import('react-native-toast-message')).default;
            Toast.show({
              type: 'error',
              text1: 'Erreur',
              text2: 'L\'événement n\'a pas pu être supprimé.',
            });
          } catch {}
          throw error;
        }
      },

      addParticipant: async (eventId, userId, status = 'pending') => {
        const event = get().getEventById(eventId);
        if (!event) return;
        const existing = event.participants?.find(p => p.userId === userId);
        if (existing) return;
        const updatedParticipants = [
          ...(event.participants || []),
          { userId, status, responseDate: status !== 'pending' ? new Date().toISOString() : undefined }
        ];
        await get().updateEvent(eventId, { participants: updatedParticipants });
      },

      removeParticipant: async (eventId, userId) => {
        const event = get().getEventById(eventId);
        if (!event) return;
        const updatedParticipants = (event.participants || []).filter(p => p.userId !== userId);
        await get().updateEvent(eventId, { participants: updatedParticipants });
      },

      updateParticipantStatus: async (eventId, userId, status) => {
        const event = get().getEventById(eventId);
        if (!event) return;

        const updatedParticipants = (event.participants || []).map(p =>
          p.userId === userId ? { ...p, status, responseDate: new Date().toISOString() } : p
        );

        // ── UI OPTIMISTE ──
        const previousEvents = get().events;

        // Update local IMMÉDIAT — l'utilisateur voit son RSVP changer instantanément
        // (le bandeau "Vous participez" / "Vous avez décliné" apparaît tout de suite)
        const now = new Date().toISOString();
        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId
              ? { ...e, participants: updatedParticipants, updatedAt: now }
              : e
          ),
        }));

        // Hors ligne → enqueue. Le worker recompute le RSVP contre l'état
        // serveur au moment du replay (last-write-wins).
        if (!getIsOnline()) {
          usePendingQueueStore.getState().enqueue({
            type: 'event:updateParticipantStatus',
            params: { eventId, userId, status },
          });
          return;
        }

        // Push vers Supabase en arrière-plan
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('events')
            .update({ participants: updatedParticipants, updatedAt: now })
            .eq('id', eventId)
            .select()
            .single();
          if (error) throw error;
          // Reconcile avec la row serveur
          set((state) => ({
            events: state.events.map((e) => (e.id === eventId ? data : e)),
          }));

          // Notifier le créateur de l'event qu'un participant a (re)changé son
          // RSVP. Pas de notif :
          //  - si le créateur est lui-même celui qui change (pas de spam à soi-même)
          //  - si le status est `pending` (retour arrière, pas une vraie décision)
          //  - si le user qui change n'est pas trouvé en local (edge case)
          const creatorId = event.createdBy;
          const isDecision = status === 'confirmed' || status === 'declined';
          if (isDecision && creatorId && creatorId !== userId) {
            const participant = useUsersStore.getState().getUserById(userId);
            const participantName = participant?.firstName ?? 'Quelqu\'un';
            const verb = status === 'confirmed' ? 'a confirmé' : 'a décliné';
            const emoji = status === 'confirmed' ? '✅' : '❌';
            useNotificationsStore.getState().addNotification({
              title: `${emoji} RSVP mis à jour`,
              message: `${participantName} ${verb} : "${event.title}".`,
              targetRoles: [],
              targetUserIds: [creatorId],
              eventId,
            });
          }
        } catch (err) {
          if (!getIsOnline()) {
            usePendingQueueStore.getState().enqueue({
              type: 'event:updateParticipantStatus',
              params: { eventId, userId, status },
            });
            return;
          }
          console.error('updateParticipantStatus failed, rolling back:', err);
          set({ events: previousEvents });
          try {
            const Toast = (await import('react-native-toast-message')).default;
            Toast.show({
              type: 'error',
              text1: 'Erreur',
              text2: 'Votre réponse n\'a pas été enregistrée. Réessayez.',
            });
          } catch {}
          throw err;
        }
      },

      getEventById: (id) => get().events.find(e => e.id === id),

      getEventsByDate: (date) => get().events.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate.getFullYear() === date.getFullYear() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getDate() === date.getDate();
      }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),

      getPinnedEvents: (limit) => {
        const pinned = get().events
          .filter(e => e.isPinned)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        return limit ? pinned.slice(0, limit) : pinned;
      },

      getUpcomingEvents: (limit) => {
        const now = new Date();
        const upcoming = get().events
          .filter(e => new Date(e.startTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        return limit ? upcoming.slice(0, limit) : upcoming;
      },

      getUserEvents: (userId, limit) => {
        const userEvents = get().events
          .filter(e => e.participants?.some(p => p.userId === userId))
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        return limit ? userEvents.slice(0, limit) : userEvents;
      },

      getParticipantStatus: (eventId, userId) => {
        const event = get().getEventById(eventId);
        if (!event?.participants) return null;
        return event.participants.find(p => p.userId === userId)?.status ?? null;
      },

      getEventParticipants: (eventId) => {
        return get().getEventById(eventId)?.participants || [];
      },

      sendReminderToParticipants: (eventId, onlyPending) => {
        const event = get().getEventById(eventId);
        if (!event) return;
        const targets = onlyPending
          ? (event.participants || []).filter(p => p.status === 'pending')
          : (event.participants || []);
        console.log(`Rappel envoyé pour "${event.title}" à ${targets.length} participant(s)`);
      },
    }),
    {
      name: 'calendar-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ events: state.events }),
    }
  )
);
