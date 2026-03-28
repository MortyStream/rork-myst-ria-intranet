import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, getSupabaseAdmin } from '@/utils/supabase';

export interface SupabaseUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  roleId?: string;
  createdAt?: string;
  updatedAt?: string;
  lastSignIn?: string;
  supabaseUserId?: string;
}

interface SupabaseUsersState {
  users: SupabaseUser[];
  isLoading: boolean;
  error: string | null;
  useMockData: boolean;
  setUseMockData: (useMockData: boolean) => void;
  fetchUsers: () => Promise<void>;
  getUserById: (id: string) => SupabaseUser | undefined;
  createUser: (email: string, password: string, userData: Partial<SupabaseUser>) => Promise<SupabaseUser>;
  updateUser: (id: string, userData: Partial<SupabaseUser>) => Promise<SupabaseUser>;
  deleteUser: (id: string) => Promise<void>;
  clearCache: () => void;
}

// Generate a random date within the last 30 days
const getRandomRecentDate = (maxDaysAgo = 30) => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

// Mock users for development
const MOCK_USERS: SupabaseUser[] = [
  {
    id: 'mock-user-id-1',
    email: 'kevin.perret@mysteriaevent.ch',
    firstName: 'Kévin',
    lastName: 'Perret',
    role: 'user', // Changed from 'admin' to 'user' to avoid hardcoding special roles
    roleId: 'role-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignIn: getRandomRecentDate(1), // Active user - within last 24 hours
  },
  {
    id: 'mock-user-id-2',
    email: 'moderator@mysteriaevent.ch',
    firstName: 'Modérateur',
    lastName: 'Test',
    role: 'moderator',
    roleId: 'role-2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignIn: getRandomRecentDate(4), // Within last week
  },
  {
    id: 'mock-user-id-3',
    email: 'user@mysteriaevent.ch',
    firstName: 'Utilisateur',
    lastName: 'Standard',
    role: 'user',
    roleId: 'role-3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignIn: getRandomRecentDate(15), // Inactive user
  },
  {
    id: 'mock-user-id-4',
    email: 'committee@mysteriaevent.ch',
    firstName: 'Membre',
    lastName: 'Comité',
    role: 'committee',
    roleId: 'role-4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignIn: null, // Never logged in
  },
  {
    id: 'mock-user-id-5',
    email: 'sectaire@mysteriaevent.ch',
    firstName: 'Jean',
    lastName: 'Sectaire',
    role: 'Sectaire',
    roleId: 'role-5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignIn: getRandomRecentDate(2), // Active user
  },
  {
    id: 'mock-user-id-6',
    email: 'runner@mysteriaevent.ch',
    firstName: 'Marie',
    lastName: 'Runner',
    role: 'Runner',
    roleId: 'role-6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignIn: getRandomRecentDate(10), // Semi-active user
  },
];

export const useSupabaseUsersStore = create<SupabaseUsersState>()(
  persist(
    (set, get) => ({
      users: [],
      isLoading: false,
      error: null,
      useMockData: false, // Set to false to use real Supabase data
      
      setUseMockData: (useMockData: boolean) => {
        set({ useMockData });
      },
      
      fetchUsers: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // For development, just use mock data
          if (get().useMockData) {
            console.log('[MOCK] Fetching users');
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            set({ users: MOCK_USERS, isLoading: false });
            return;
          }
          
          // Real implementation with Supabase
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('createdAt', { ascending: false });
          
          if (error) {
            throw error;
          }
          
          // Transform the data to match our interface
          const transformedUsers: SupabaseUser[] = data.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            roleId: user.roleId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastSignIn: user.lastLogin
          }));
          
          set({ users: transformedUsers, isLoading: false });
        } catch (error: any) {
          console.error('Error fetching users:', error);
          set({ 
            isLoading: false, 
            error: 'Erreur lors de la récupération des utilisateurs: ' + (error.message || 'Erreur inconnue')
          });
        }
      },
      
      getUserById: (id: string) => {
        return get().users.find(user => user.id === id);
      },
      
      createUser: async (email: string, password: string, userData: Partial<SupabaseUser>) => {
        set({ isLoading: true, error: null });
        
        try {
          // For development, just use mock data
          if (get().useMockData) {
            console.log('[MOCK] Creating user:', email);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const newUser: SupabaseUser = {
              id: 'mock-user-id-' + Math.random().toString(36).substring(2, 9),
              email,
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              role: userData.role || 'user',
              roleId: userData.roleId || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastSignIn: null, // New users haven't logged in yet
            };
            
            set(state => ({ 
              users: [...state.users, newUser],
              isLoading: false
            }));
            
            return newUser;
          }
          
          // Real implementation with Supabase
          const supabaseAdmin = getSupabaseAdmin();
          
          const { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
            },
          });
          
          if (authError) {
            console.error("Erreur création Auth", authError);
            throw authError;
          }
          
          const userId = userAuth?.user?.id;
          if (!userId) throw new Error("Utilisateur non créé");
          
          const { error: insertError } = await supabaseAdmin
            .from("users")
            .insert([
              {
                supabaseUserId: userId,
                email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
              },
            ]);
          
          if (insertError) {
            console.error("Erreur insertion table users", insertError);
            throw insertError;
          }
          
          // Log the created user
          console.log("Utilisateur créé :", {
            ...userData,
            supabaseUserId: userId,
          });
          
          // Create a new user object to return immediately
          const newUser: SupabaseUser = {
            id: userId, // Using the Supabase Auth ID as temporary ID
            email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSignIn: null,
            supabaseUserId: userId
          };
          
          // Update the local state with the new user
          set(state => ({ 
            users: [...state.users, newUser],
            isLoading: false
          }));
          
          // Try to fetch the complete user record, but don't block on it
          try {
            const supabase = getSupabase();
            const { data: createdUser, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('supabaseUserId', userId)
              .single();
            
            if (!fetchError && createdUser) {
              console.log('User profile fetched:', createdUser);
              
              // Update the local state with the complete user data
              const completeUser: SupabaseUser = {
                id: createdUser.id,
                email: createdUser.email,
                firstName: createdUser.firstName,
                lastName: createdUser.lastName,
                role: createdUser.role,
                roleId: createdUser.roleId,
                createdAt: createdUser.createdAt,
                updatedAt: createdUser.updatedAt,
                lastSignIn: null,
                supabaseUserId: userId
              };
              
              set(state => ({ 
                users: state.users.map(u => u.id === userId ? completeUser : u)
              }));
            }
          } catch (fetchError) {
            console.warn('Could not fetch complete user data, using basic data instead:', fetchError);
          }
          
          return newUser;
        } catch (error: any) {
          console.error('Error creating user:', error);
          set({ 
            isLoading: false, 
            error: 'Erreur lors de la création de l\'utilisateur: ' + (error.message || 'Erreur inconnue')
          });
          throw error;
        }
      },
      
      updateUser: async (id: string, userData: Partial<SupabaseUser>) => {
        set({ isLoading: true, error: null });
        
        try {
          // For development, just use mock data
          if (get().useMockData) {
            console.log('[MOCK] Updating user:', id);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const userIndex = get().users.findIndex(user => user.id === id);
            
            if (userIndex === -1) {
              throw new Error('Utilisateur non trouvé');
            }
            
            const updatedUser: SupabaseUser = {
              ...get().users[userIndex],
              ...userData,
              updatedAt: new Date().toISOString(),
            };
            
            const updatedUsers = [...get().users];
            updatedUsers[userIndex] = updatedUser;
            
            set({ 
              users: updatedUsers,
              isLoading: false
            });
            
            return updatedUser;
          }
          
          // Real implementation with Supabase - using supabaseAdmin instead of standard client
          const supabaseAdmin = getSupabaseAdmin();
          
          // Transform the data to match the database schema
          const dbData: any = {
            updatedAt: new Date().toISOString()
          };
          
          if (userData.email !== undefined) dbData.email = userData.email;
          if (userData.firstName !== undefined) dbData.firstName = userData.firstName;
          if (userData.lastName !== undefined) dbData.lastName = userData.lastName;
          if (userData.role !== undefined) dbData.role = userData.role;
          
          // Remove roleId if it's included but doesn't exist in the database
          // This prevents the "Could not find the roleId column" error
          if ('roleId' in userData) {
            console.log("Removing roleId from update data as it's not in the database schema");
            delete userData.roleId;
          }
          
          // Log the update data for debugging
          console.log("Updating user with data:", JSON.stringify(dbData, null, 2));
          
          // Update the user profile using supabaseAdmin
          const { data: profileData, error: profileError } = await supabaseAdmin
            .from("users")
            .update(dbData)
            .eq("id", id)
            .select()
            .single();
          
          if (profileError) {
            console.error("Erreur mise à jour utilisateur", profileError);
            console.error("Full error object:", JSON.stringify(profileError, null, 2));
            throw profileError;
          }
          
          // Log the updated user
          console.log("Utilisateur mis à jour :", {
            id,
            ...userData,
          });
          
          console.log("Database update result:", profileData);
          
          // Transform the data to match our interface
          const updatedUser: SupabaseUser = profileData ? {
            id: profileData.id,
            email: profileData.email,
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            role: profileData.role,
            roleId: profileData.roleId,
            createdAt: profileData.createdAt,
            updatedAt: profileData.updatedAt,
            lastSignIn: profileData.lastLogin,
            supabaseUserId: profileData.supabaseUserId
          } : {
            id,
            ...userData,
            updatedAt: new Date().toISOString()
          };
          
          // Update the local state
          set(state => ({
            users: state.users.map(user => 
              user.id === id ? updatedUser : user
            ),
            isLoading: false
          }));
          
          return updatedUser;
        } catch (error: any) {
          console.error('Error updating user:', error);
          set({ 
            isLoading: false, 
            error: 'Erreur lors de la mise à jour de l\'utilisateur: ' + (error.message || 'Erreur inconnue')
          });
          throw error;
        }
      },
      
      deleteUser: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // For development, just use mock data
          if (get().useMockData) {
            console.log('[MOCK] Deleting user:', id);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const userIndex = get().users.findIndex(user => user.id === id);
            
            if (userIndex === -1) {
              throw new Error('Utilisateur non trouvé');
            }
            
            const updatedUsers = get().users.filter(user => user.id !== id);
            
            set({ 
              users: updatedUsers,
              isLoading: false
            });
            
            return;
          }
          
          // Real implementation with Supabase
          const supabase = getSupabase();
          
          // Use RPC to delete the user
          const { error: rpcError } = await supabase.rpc('delete_user', {
            user_id: id
          });
          
          if (rpcError) {
            console.error('RPC error deleting user:', rpcError);
            throw rpcError;
          }
          
          // Update the local state
          set(state => ({
            users: state.users.filter(user => user.id !== id),
            isLoading: false
          }));
        } catch (error: any) {
          console.error('Error deleting user:', error);
          set({ 
            isLoading: false, 
            error: 'Erreur lors de la suppression de l\'utilisateur: ' + (error.message || 'Erreur inconnue')
          });
          throw error;
        }
      },
      
      clearCache: () => {
        set({ users: [] });
      },
    }),
    {
      name: 'mysteria-supabase-users-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        users: state.users,
        useMockData: state.useMockData,
      }),
    }
  )
);