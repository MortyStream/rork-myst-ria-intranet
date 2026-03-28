import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, EventParticipant } from '@/types/calendar';
import { useAuthStore } from './auth-store';
import { useNotificationsStore } from './notifications-store';
import { useResourcesStore } from './resources-store';

interface CalendarState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
}

interface CalendarStore extends CalendarState {
  // Event operations
  addEvent: (event: Omit<Event, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'participants'>, invitedUserIds?: string[]) => string;
  updateEvent: (id: string, data: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  
  // Participant operations
  addParticipant: (eventId: string, userId: string, status?: 'confirmed' | 'declined' | 'pending') => void;
  removeParticipant: (eventId: string, userId: string) => void;
  updateParticipantStatus: (eventId: string, userId: string, status: 'confirmed' | 'declined' | 'pending') => void;
  sendReminderToParticipants: (eventId: string, pendingOnly?: boolean) => void;
  
  // Getters
  getEventById: (id: string) => Event | undefined;
  getEventsByDate: (date: Date) => Event[];
  getPinnedEvents: (limit?: number) => Event[];
  getUpcomingEvents: (limit?: number) => Event[];
  getUserEvents: (userId: string, limit?: number) => Event[];
  getParticipantStatus: (eventId: string, userId: string) => 'confirmed' | 'declined' | 'pending' | null;
  getEventParticipants: (eventId: string) => EventParticipant[];
  getVisibleEvents: (userId: string) => Event[];
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      events: [
        // Sample events for testing
        {
          id: 'event-1',
          title: 'Réunion du comité',
          description: 'Réunion mensuelle du comité pour discuter des avancées du projet',
          startTime: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 18, 0).toISOString(),
          endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 20, 0).toISOString(),
          location: 'Salle de conférence',
          color: '#4285F4',
          isPinned: true,
          categoryId: 'category-1',
          participants: [
            { userId: 'admin-id', status: 'confirmed', responseDate: new Date().toISOString() },
            { userId: 'moderator-id', status: 'pending' }
          ],
          createdBy: 'admin-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'event-2',
          title: 'Répétition générale',
          description: 'Répétition générale avant la première',
          startTime: new Date(new Date().getFullYear(), new Date().getMonth(), 20, 14, 0).toISOString(),
          endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 20, 18, 0).toISOString(),
          location: 'Théâtre principal',
          color: '#EA4335',
          isPinned: true,
          categoryId: 'category-2',
          participants: [
            { userId: 'admin-id', status: 'confirmed', responseDate: new Date().toISOString() },
            { userId: 'moderator-id', status: 'declined', responseDate: new Date().toISOString() }
          ],
          createdBy: 'admin-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'event-3',
          title: 'Workshop technique',
          description: 'Formation sur les nouveaux équipements',
          startTime: new Date(new Date().getFullYear(), new Date().getMonth(), 25, 10, 0).toISOString(),
          endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 25, 12, 0).toISOString(),
          location: 'Atelier technique',
          color: '#34A853',
          categoryId: 'category-3',
          participants: [
            { userId: 'admin-id', status: 'pending' },
            { userId: 'moderator-id', status: 'confirmed', responseDate: new Date().toISOString() }
          ],
          createdBy: 'admin-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ],
      isLoading: false,
      error: null,
      
      addEvent: (eventData, invitedUserIds = []) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          set({ error: 'User not authenticated' });
          return '';
        }
        
        // Créer les participants avec statut par défaut "pending"
        const participants: EventParticipant[] = invitedUserIds.map(userId => ({
          userId,
          status: 'pending'
        }));
        
        // Ajouter automatiquement le créateur comme participant confirmé
        participants.push({
          userId: currentUser.id,
          status: 'confirmed',
          responseDate: new Date().toISOString()
        });
        
        const newEvent: Event = {
          ...eventData,
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          participants,
          createdBy: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set(state => ({
          events: [...state.events, newEvent]
        }));
        
        // Envoyer des notifications aux participants invités
        const { addNotification } = useNotificationsStore.getState();
        invitedUserIds.forEach(userId => {
          addNotification({
            title: 'Nouvelle invitation',
            message: `Vous avez été invité à l'événement "${newEvent.title}" par ${currentUser.firstName} ${currentUser.lastName}`,
            targetUserIds: [userId],
            targetRoles: [],
            eventId: newEvent.id
          });
        });
        
        return newEvent.id;
      },
      
      updateEvent: (id, data) => {
        set(state => ({
          events: state.events.map(event => 
            event.id === id 
              ? { 
                  ...event, 
                  ...data, 
                  updatedAt: new Date().toISOString() 
                } 
              : event
          )
        }));
      },
      
      deleteEvent: (id) => {
        set(state => ({
          events: state.events.filter(event => event.id !== id)
        }));
      },
      
      addParticipant: (eventId, userId, status = 'pending') => {
        const event = get().getEventById(eventId);
        if (!event) return;
        
        // Vérifier si l'utilisateur est déjà participant
        const existingParticipant = event.participants?.find(p => p.userId === userId);
        if (existingParticipant) return;
        
        const newParticipant: EventParticipant = {
          userId,
          status,
          responseDate: status !== 'pending' ? new Date().toISOString() : undefined
        };
        
        set(state => ({
          events: state.events.map(event => 
            event.id === eventId 
              ? { 
                  ...event, 
                  participants: [...(event.participants || []), newParticipant],
                  updatedAt: new Date().toISOString() 
                } 
              : event
          )
        }));
        
        // Envoyer une notification à l'utilisateur invité
        if (status === 'pending') {
          const { addNotification } = useNotificationsStore.getState();
          const currentUser = useAuthStore.getState().user;
          
          if (currentUser) {
            addNotification({
              title: 'Nouvelle invitation',
              message: `Vous avez été invité à l'événement "${event.title}" par ${currentUser.firstName} ${currentUser.lastName}`,
              targetUserIds: [userId],
              targetRoles: [],
              eventId
            });
          }
        }
      },
      
      removeParticipant: (eventId, userId) => {
        const event = get().getEventById(eventId);
        if (!event || !event.participants) return;
        
        set(state => ({
          events: state.events.map(event => 
            event.id === eventId 
              ? { 
                  ...event, 
                  participants: event.participants?.filter(p => p.userId !== userId),
                  updatedAt: new Date().toISOString() 
                } 
              : event
          )
        }));
      },
      
      updateParticipantStatus: (eventId, userId, status) => {
        const event = get().getEventById(eventId);
        if (!event || !event.participants) return;
        
        set(state => ({
          events: state.events.map(event => 
            event.id === eventId 
              ? { 
                  ...event, 
                  participants: event.participants?.map(p => 
                    p.userId === userId 
                      ? { ...p, status, responseDate: new Date().toISOString() }
                      : p
                  ),
                  updatedAt: new Date().toISOString() 
                } 
              : event
          )
        }));
        
        // Envoyer une notification à l'organisateur
        const { addNotification } = useNotificationsStore.getState();
        const currentUser = useAuthStore.getState().user;
        
        if (currentUser && event.createdBy !== userId) {
          const statusText = status === 'confirmed' ? 'accepté' : 'décliné';
          
          addNotification({
            title: 'Réponse à l\'invitation',
            message: `${currentUser.firstName} ${currentUser.lastName} a ${statusText} l'invitation à l'événement "${event.title}"`,
            targetUserIds: [event.createdBy],
            targetRoles: [],
            eventId
          });
        }
      },
      
      sendReminderToParticipants: (eventId, pendingOnly = true) => {
        const event = get().getEventById(eventId);
        if (!event || !event.participants) return;
        
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;
        
        const { addNotification } = useNotificationsStore.getState();
        
        // Filtrer les participants selon le paramètre pendingOnly
        const targetParticipants = pendingOnly 
          ? event.participants.filter(p => p.status === 'pending')
          : event.participants;
        
        // Envoyer un rappel à chaque participant
        targetParticipants.forEach(participant => {
          if (participant.userId !== currentUser.id) {
            addNotification({
              title: 'Rappel d\'événement',
              message: `Rappel: Veuillez confirmer votre présence à l'événement "${event.title}"`,
              targetUserIds: [participant.userId],
              targetRoles: [],
              eventId
            });
          }
        });
        
        // Marquer les notifications comme envoyées
        set(state => ({
          events: state.events.map(e => 
            e.id === eventId 
              ? { 
                  ...e, 
                  participants: e.participants?.map(p => 
                    targetParticipants.some(tp => tp.userId === p.userId)
                      ? { ...p, notificationSent: true }
                      : p
                  ),
                  updatedAt: new Date().toISOString() 
                } 
              : e
          )
        }));
      },
      
      getEventById: (id) => {
        return get().events.find(event => event.id === id);
      },
      
      getEventsByDate: (date) => {
        return get().events.filter(event => {
          const eventDate = new Date(event.startTime);
          return (
            eventDate.getFullYear() === date.getFullYear() &&
            eventDate.getMonth() === date.getMonth() &&
            eventDate.getDate() === date.getDate()
          );
        }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      },
      
      getPinnedEvents: (limit) => {
        const pinnedEvents = get().events
          .filter(event => event.isPinned)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        return limit ? pinnedEvents.slice(0, limit) : pinnedEvents;
      },
      
      getUpcomingEvents: (limit) => {
        const now = new Date();
        const upcomingEvents = get().events
          .filter(event => new Date(event.startTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        return limit ? upcomingEvents.slice(0, limit) : upcomingEvents;
      },
      
      getUserEvents: (userId, limit) => {
        // Récupérer les événements où l'utilisateur est participant
        const userEvents = get().events
          .filter(event => event.participants?.some(p => p.userId === userId))
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        return limit ? userEvents.slice(0, limit) : userEvents;
      },
      
      getParticipantStatus: (eventId, userId) => {
        const event = get().getEventById(eventId);
        if (!event || !event.participants) return null;
        
        const participant = event.participants.find(p => p.userId === userId);
        return participant ? participant.status : null;
      },
      
      getEventParticipants: (eventId) => {
        const event = get().getEventById(eventId);
        return event?.participants || [];
      },
      
      getVisibleEvents: (userId) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return [];
        
        // Les administrateurs et modérateurs voient tous les événements
        if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
          return get().events;
        }
        
        // Récupérer les catégories de l'utilisateur
        const { getUserSubscriptions, isUserCategoryResponsible } = useResourcesStore.getState();
        const userCategories = getUserSubscriptions(userId);
        
        // Filtrer les événements
        return get().events.filter(event => {
          // L'utilisateur est participant
          const isParticipant = event.participants?.some(p => p.userId === userId);
          
          // L'événement appartient à une catégorie de l'utilisateur
          const isInUserCategory = event.categoryId && (
            userCategories.includes(event.categoryId) || 
            isUserCategoryResponsible(userId, event.categoryId)
          );
          
          // L'utilisateur est le créateur
          const isCreator = event.createdBy === userId;
          
          return isParticipant || isInUserCategory || isCreator;
        });
      }
    }),
    {
      name: 'mysteria-calendar-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);