import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/types/user';
import { getSupabase } from '@/utils/supabase';

interface UsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'editable'>) => Promise<string>;
  updateUser: (id: string, userData: Partial<User>) => void;
  deleteUser: (id: string) => void;
  getUserById: (id: string) => User | undefined;
  getUsersByRole: (role: string) => User[];
  getActiveUsers: () => User[];
  clearError: () => void;
  initializeUsers: () => Promise<void>;
  getEditableProfiles: (userId: string) => User[];
  getUserByEditableBy: (userId: string) => User | undefined;
}

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      users: [],
      isLoading: false,
      error: null,

      initializeUsers: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const supabase = getSupabase();
          
          // Fetch all users from the users table
          const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('lastName', { ascending: true });
          
          if (error) {
            console.error('Error fetching users:', error);
            throw new Error(`Error fetching users: ${error.message}`);
          }
          
          // Transform the data to match our User type
          const transformedUsers: User[] = users.map((user: any) => ({
            id: user.id,
            supabaseUserId: user.supabaseUserId,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'user',
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            sectors: user.sectors || [],
            editable: user.editable !== false, // default to true if not set
            editable_by: user.editable_by,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }));
          
          set({ users: transformedUsers, isLoading: false });
        } catch (error: unknown) {
          console.error('Error initializing users:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ 
            error: `Error initializing users: ${errorMessage}`,
            isLoading: false 
          });
        }
      },

      addUser: async (userData) => {
        set({ isLoading: true, error: null });
        
        try {
          const id = uuidv4();
          const now = new Date().toISOString();
          
          const newUser: User = {
            id,
            ...userData,
            role: userData.role,
            createdAt: now,
            updatedAt: now,
            editable: true,
          };
          
          const supabase = getSupabase();
          
          const insertData = {
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.role,
            avatarUrl: newUser.avatarUrl,
            bio: newUser.bio,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
            editable: newUser.editable,
            sectors: newUser.sectors,
            supabaseUserId: newUser.supabaseUserId,
            editable_by: newUser.editable_by
          };
          
          const { error } = await supabase
            .from('users')
            .insert(insertData);
          
          if (error) {
            throw new Error(`Error adding user: ${error.message}${error.hint ? ` (Hint: ${error.hint})` : ''}`);
          }
          
          set(state => ({
            users: [...state.users, newUser],
            isLoading: false,
            error: null
          }));
          
          return id;
        } catch (error: unknown) {
          console.error('Error adding user:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ 
            error: `Error adding user: ${errorMessage}`,
            isLoading: false
          });
          throw error;
        }
      },

      updateUser: (id, userData) => {
        set(state => ({
          users: state.users.map(user =>
            user.id === id
              ? { ...user, ...userData, updatedAt: new Date().toISOString() }
              : user
          )
        }));
      },

      deleteUser: (id) => {
        set(state => ({
          users: state.users.filter(user => user.id !== id)
        }));
      },

      getUserById: (id) => {
        return get().users.find(user => user.id === id);
      },

      getUsersByRole: (role) => {
        return get().users.filter(user => user.role === role);
      },

      getActiveUsers: () => {
        // Since isActive doesn't exist in User type, return all users as a fallback
        return get().users;
      },

      clearError: () => {
        set({ error: null });
      },

      getEditableProfiles: (userId) => {
        return get().users.filter(user => user.editable_by === userId || user.supabaseUserId === userId);
      },

      getUserByEditableBy: (userId) => {
        return get().users.find(user => user.supabaseUserId === userId);
      },
    }),
    {
      name: 'users-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);