import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message, Conversation } from '@/types/message';
import { useAuthStore } from './auth-store';
import { useNotificationsStore } from './notifications-store';

interface MessagesState {
  conversations: Conversation[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

interface MessagesStore extends MessagesState {
  // Conversation operations
  createConversation: (participants: string[], name?: string) => string;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  
  // Message operations
  sendMessage: (conversationId: string, content: string) => void;
  markConversationAsRead: (conversationId: string) => void;
  
  // Getters
  getUserConversations: () => Conversation[];
  getConversationMessages: (conversationId: string) => Message[];
  getUnreadMessagesCount: () => number;
}

export const useMessagesStore = create<MessagesStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: [],
      isLoading: false,
      error: null,
      
      createConversation: (participants, name) => {
        const currentUser = useAuthStore.getState().user;
        
        if (!currentUser) {
          set({ error: 'User not authenticated' });
          return '';
        }
        
        // Make sure current user is included in participants
        if (!participants.includes(currentUser.id)) {
          participants = [...participants, currentUser.id];
        }
        
        const isGroup = participants.length > 2;
        const conversationId = `conversation-${Date.now()}`;
        
        const newConversation: Conversation = {
          id: conversationId,
          name: name || (isGroup ? 'New Group' : undefined),
          participants,
          isGroup,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set(state => ({
          conversations: [...state.conversations, newConversation]
        }));
        
        return conversationId;
      },
      
      updateConversation: (id, data) => {
        set(state => ({
          conversations: state.conversations.map(conversation => 
            conversation.id === id 
              ? { 
                  ...conversation, 
                  ...data, 
                  updatedAt: new Date().toISOString() 
                } 
              : conversation
          )
        }));
      },
      
      deleteConversation: (id) => {
        set(state => ({
          conversations: state.conversations.filter(conversation => conversation.id !== id),
          messages: state.messages.filter(message => message.conversationId !== id)
        }));
      },
      
      sendMessage: (conversationId, content) => {
        const currentUser = useAuthStore.getState().user;
        
        if (!currentUser) {
          set({ error: 'User not authenticated' });
          return;
        }
        
        const newMessage: Message = {
          id: `message-${Date.now()}`,
          senderId: currentUser.id,
          content,
          conversationId,
          read: false,
          createdAt: new Date().toISOString(),
        };
        
        set(state => ({
          messages: [...state.messages, newMessage],
          conversations: state.conversations.map(conversation => 
            conversation.id === conversationId 
              ? { 
                  ...conversation, 
                  lastMessage: newMessage,
                  updatedAt: new Date().toISOString() 
                } 
              : conversation
          )
        }));
      },
      
      markConversationAsRead: (conversationId) => {
        const currentUser = useAuthStore.getState().user;
        
        if (!currentUser) return;
        
        set(state => ({
          messages: state.messages.map(message => 
            message.conversationId === conversationId && message.senderId !== currentUser.id
              ? { ...message, read: true }
              : message
          )
        }));
      },
      
      getUserConversations: () => {
        const currentUser = useAuthStore.getState().user;
        
        if (!currentUser) return [];
        
        return get().conversations
          .filter(conversation => conversation.participants.includes(currentUser.id))
          .sort((a, b) => {
            const aDate = a.lastMessage?.createdAt || a.updatedAt;
            const bDate = b.lastMessage?.createdAt || b.updatedAt;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
          });
      },
      
      getConversationMessages: (conversationId) => {
        return get().messages
          .filter(message => message.conversationId === conversationId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      },
      
      getUnreadMessagesCount: () => {
        const currentUser = useAuthStore.getState().user;
        
        if (!currentUser) return 0;
        
        // Check if messaging is enabled
        if (!useNotificationsStore.getState().isMessagingEnabled) return 0;
        
        return get().messages.filter(
          message => !message.read && message.senderId !== currentUser.id
        ).length;
      }
    }),
    {
      name: 'mysteria-messages-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);