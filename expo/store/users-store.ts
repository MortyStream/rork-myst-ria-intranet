import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/types/user';
import { getSupabase } from '@/utils/supabase';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const errorObject = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    const parts = [errorObject.message, errorObject.details, errorObject.hint, errorObject.code].filter(
      (value): value is string => Boolean(value)
    );

    if (parts.length > 0) {
      return parts.join(' · ');
    }
  }

  return 'Une erreur inconnue est survenue.';
};

const getFriendlyUsersErrorMessage = (error: unknown): string => {
  const message = getErrorMessage(error);

  if (message.toLowerCase().includes('failed to fetch')) {
    return "Impossible de joindre le serveur utilisateurs pour le moment. Les données locales ont été conservées.";
  }

  return `Impossible de charger les utilisateurs. ${message}`;
};

const mapSupabaseUserToUser = (user: Record<string, unknown>): User => {
  const avatarUrl = typeof user.avatarUrl === 'string' ? user.avatarUrl : undefined;
  return {
    id: String(user.id ?? ''),
    supabaseUserId: typeof user.supabaseUserId === 'string' ? user.supabaseUserId : undefined,
    firstName: typeof user.firstName === 'string' ? user.firstName : '',
    lastName: typeof user.lastName === 'string' ? user.lastName : '',
    email: typeof user.email === 'string' ? user.email : '',
    phone: typeof user.phone === 'string' ? user.phone : '',
    role: typeof user.role === 'string' ? (user.role as User['role']) : 'user',
    avatarUrl,
    profileImage: avatarUrl, // alias pour la cohérence avec auth-store
    bio: typeof user.bio === 'string' ? user.bio : undefined,
    sectors: Array.isArray(user.sectors) ? (user.sectors as User['sectors']) : [],
    editable: user.editable !== false,
    editable_by: typeof user.editable_by === 'string' ? user.editable_by : undefined,
    permissions: Array.isArray(user.permissions) ? (user.permissions as string[]) : [],
    createdAt: typeof user.createdAt === 'string' ? user.createdAt : new Date().toISOString(),
    updatedAt: typeof user.updatedAt === 'string' ? user.updatedAt : new Date().toISOString(),
  };
};

const fetchUsersFromSupabase = async (): Promise<User[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('users').select('*').order('lastName', { ascending: true });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map((user) => mapSupabaseUserToUser(user as Record<string, unknown>)) : [];
};

interface UsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'editable'>) => Promise<string>;
  updateUser: (id: string, userData: Partial<User>) => void;
  updateUserRole: (id: string, role: User['role']) => Promise<void>;
  toggleUserEditable: (id: string, editable: boolean) => Promise<boolean>;
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

        // Retry simple sans réinitialiser le client Supabase global.
        // L'ancien code appelait reinitializeSupabase() qui créait un NOUVEAU
        // client singleton sans session → cassait toutes les autres requêtes
        // en cours (calendar, tasks, etc.) → toutes les pages vides.
        const MAX_ATTEMPTS = 3;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            console.log(`Initializing users store (attempt ${attempt}/${MAX_ATTEMPTS})...`);
            const transformedUsers = await fetchUsersFromSupabase();
            console.log('Users fetched successfully:', transformedUsers.length);
            set({ users: transformedUsers, isLoading: false, error: null });
            return;
          } catch (err: unknown) {
            console.log(`Users fetch attempt ${attempt} failed:`, getErrorMessage(err));
            if (attempt < MAX_ATTEMPTS) {
              // Backoff progressif : 200ms, 400ms — laisse le temps au JWT
              // de se propager après un signInWithPassword.
              await new Promise<void>((resolve) => setTimeout(resolve, 200 * attempt));
            } else {
              const existingUsers = get().users;
              const friendlyMessage = getFriendlyUsersErrorMessage(err);
              console.error('Error initializing users after all retries:', getErrorMessage(err));
              set({
                users: existingUsers,
                error: friendlyMessage,
                isLoading: false,
              });
            }
          }
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

      updateUserRole: async (id, role) => {
        const supabase = getSupabase();
        const { error } = await supabase
          .from('users')
          .update({ role, updatedAt: new Date().toISOString() })
          .eq('id', id);
        if (error) throw new Error(error.message);
        set(state => ({
          users: state.users.map(user =>
            user.id === id
              ? { ...user, role, updatedAt: new Date().toISOString() }
              : user
          )
        }));
      },

      toggleUserEditable: async (id, editable) => {
        try {
          const supabase = getSupabase();
          const { error } = await supabase
            .from('users')
            .update({ editable, updatedAt: new Date().toISOString() })
            .eq('id', id);
          if (error) throw new Error(error.message);
          set(state => ({
            users: state.users.map(user =>
              user.id === id ? { ...user, editable } : user
            )
          }));
          return true;
        } catch {
          return false;
        }
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