import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/utils/supabase';

export interface SupabaseRole {
  id: string;
  label: string;
  description: string;
}

interface SupabaseRolesState {
  roles: SupabaseRole[];
  isLoading: boolean;
  error: string | null;
  useMockData: boolean;
  setUseMockData: (useMockData: boolean) => void;
  fetchRoles: () => Promise<void>;
  getRoleById: (id: string) => SupabaseRole | undefined;
  createRole: (roleData: Omit<SupabaseRole, 'id'>) => Promise<SupabaseRole>;
  updateRole: (id: string, roleData: Partial<SupabaseRole>) => Promise<SupabaseRole>;
  deleteRole: (id: string) => Promise<void>;
  clearCache: () => void;
}

// Default roles that should always be available
const DEFAULT_ROLES: SupabaseRole[] = [
  {
    id: 'role-1',
    label: 'Admin',
    description: 'Administrateur avec tous les droits',
  },
  {
    id: 'role-2',
    label: 'Modérateur',
    description: 'Modérateur avec droits limités',
  },
  {
    id: 'role-3',
    label: 'Utilisateur',
    description: 'Utilisateur standard',
  },
  {
    id: 'role-4',
    label: 'Externe',
    description: 'Utilisateur externe avec accès limité',
  },
];

export const useSupabaseRolesStore = create<SupabaseRolesState>()(
  persist(
    (set, get) => ({
      roles: DEFAULT_ROLES, // Initialize with default roles
      isLoading: false,
      error: null,
      useMockData: false, // Set to false to use real Supabase data
      
      setUseMockData: (useMockData: boolean) => {
        set({ useMockData });
      },
      
      fetchRoles: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // For development, just use mock data
          if (get().useMockData) {
            console.log('[MOCK] Fetching roles');
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            set({ roles: DEFAULT_ROLES, isLoading: false });
            return;
          }
          
          // Real implementation with Supabase
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('roles')
            .select('*')
            .order('label', { ascending: true });
          
          if (error) {
            console.error('Error fetching roles:', error);
            
            // If the table doesn't exist or there's another error, fall back to default roles
            set({ roles: DEFAULT_ROLES, isLoading: false });
            return;
          }
          
          if (data && data.length > 0) {
            // Transform the data to match our interface
            const transformedRoles: SupabaseRole[] = data.map(role => ({
              id: role.id || `role-${Math.random().toString(36).substring(2, 9)}`,
              label: role.label,
              description: role.description || "",
            }));
            
            set({ roles: transformedRoles, isLoading: false });
          } else {
            // If no roles in database, use default roles
            set({ roles: DEFAULT_ROLES, isLoading: false });
            
            // Insert default roles into Supabase
            try {
              for (const role of DEFAULT_ROLES) {
                await supabase
                  .from('roles')
                  .insert({
                    id: role.id,
                    label: role.label,
                    description: role.description
                  });
              }
            } catch (insertError) {
              console.error('Error inserting default roles:', insertError);
              // Continue even if insert fails - we'll use the default roles in memory
            }
          }
        } catch (error: any) {
          console.error('Error fetching roles:', error);
          set({ 
            isLoading: false, 
            error: 'Erreur lors de la récupération des rôles: ' + (error.message || 'Erreur inconnue'),
            roles: DEFAULT_ROLES // Fallback to default roles on error
          });
        }
      },
      
      getRoleById: (id: string) => {
        return get().roles.find(role => role.id === id);
      },
      
      createRole: async (roleData: Omit<SupabaseRole, 'id'>) => {
        set({ isLoading: true, error: null });
        
        try {
          // For development, just use mock data
          if (get().useMockData) {
            console.log('[MOCK] Creating role:', roleData.label);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if we already have 4 roles - don't allow more
            if (get().roles.length >= 4) {
              throw new Error('Le nombre maximum de rôles (4) a été atteint');
            }
            
            const newRole: SupabaseRole = {
              id: 'role-' + Math.random().toString(36).substring(2, 9),
              ...roleData,
            };
            
            set(state => ({ 
              roles: [...state.roles, newRole],
              isLoading: false
            }));
            
            return newRole;
          }
          
          // Real implementation with Supabase
          const supabase = getSupabase();
          
          // Check if we already have 4 roles - don't allow more
          const { count, error: countError } = await supabase
            .from('roles')
            .select('*', { count: 'exact', head: true });
          
          if (countError) {
            console.error('Error counting roles:', countError);
            // If we can't count, assume we're under the limit and continue
          } else if (count && count >= 4) {
            throw new Error('Le nombre maximum de rôles (4) a été atteint');
          }
          
          // Create the role
          const { data, error } = await supabase
            .from('roles')
            .insert({
              label: roleData.label,
              description: roleData.description,
            })
            .select()
            .single();
          
          if (error) {
            throw error;
          }
          
          // Transform the data to match our interface
          const newRole: SupabaseRole = {
            id: data.id || `role-${Math.random().toString(36).substring(2, 9)}`,
            label: data.label,
            description: data.description || "",
          };
          
          set(state => ({ 
            roles: [...state.roles, newRole],
            isLoading: false
          }));
          
          return newRole;
        } catch (error: any) {
          console.error('Error creating role:', error);
          set({ 
            isLoading: false, 
            error: 'Erreur lors de la création du rôle: ' + (error.message || 'Erreur inconnue')
          });
          throw error;
        }
      },
      
      updateRole: async (id: string, roleData: Partial<SupabaseRole>) => {
        set({ isLoading: true, error: null });
        
        try {
          // For development, just use mock data
          if (get().useMockData) {
            console.log('[MOCK] Updating role:', id);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const roleIndex = get().roles.findIndex(role => role.id === id);
            
            if (roleIndex === -1) {
              throw new Error('Rôle non trouvé');
            }
            
            const updatedRole: SupabaseRole = {
              ...get().roles[roleIndex],
              ...roleData,
            };
            
            const updatedRoles = [...get().roles];
            updatedRoles[roleIndex] = updatedRole;
            
            set({ 
              roles: updatedRoles,
              isLoading: false
            });
            
            return updatedRole;
          }
          
          // Real implementation with Supabase
          const supabase = getSupabase();
          
          // Transform the data to match the database schema
          const dbData: any = {};
          
          if (roleData.label !== undefined) dbData.label = roleData.label;
          if (roleData.description !== undefined) dbData.description = roleData.description;
          
          // Update the role
          const { data, error } = await supabase
            .from('roles')
            .update(dbData)
            .eq('id', id)
            .select()
            .single();
          
          if (error) {
            throw error;
          }
          
          // Transform the data to match our interface
          const updatedRole: SupabaseRole = {
            id: data.id || id,
            label: data.label,
            description: data.description || "",
          };
          
          // Update the local state
          set(state => ({
            roles: state.roles.map(role => 
              role.id === id ? updatedRole : role
            ),
            isLoading: false
          }));
          
          return updatedRole;
        } catch (error: any) {
          console.error('Error updating role:', error);
          set({ 
            isLoading: false, 
            error: 'Erreur lors de la mise à jour du rôle: ' + (error.message || 'Erreur inconnue')
          });
          throw error;
        }
      },
      
      deleteRole: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // For development, just use mock data
          if (get().useMockData) {
            console.log('[MOCK] Deleting role:', id);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const roleIndex = get().roles.findIndex(role => role.id === id);
            
            if (roleIndex === -1) {
              throw new Error('Rôle non trouvé');
            }
            
            // Don't allow deleting if we have 4 or fewer roles
            if (get().roles.length <= 4) {
              throw new Error('Impossible de supprimer un rôle. Le minimum de 4 rôles est requis.');
            }
            
            const updatedRoles = get().roles.filter(role => role.id !== id);
            
            set({ 
              roles: updatedRoles,
              isLoading: false
            });
            
            return;
          }
          
          // Real implementation with Supabase
          const supabase = getSupabase();
          
          // Check if we have 4 or fewer roles - don't allow deletion
          const { count, error: countError } = await supabase
            .from('roles')
            .select('*', { count: 'exact', head: true });
          
          if (countError) {
            console.error('Error counting roles:', countError);
            // If we can't count, assume we're at the limit and don't allow deletion
            throw new Error('Impossible de supprimer un rôle. Le minimum de 4 rôles est requis.');
          }
          
          if (count && count <= 4) {
            throw new Error('Impossible de supprimer un rôle. Le minimum de 4 rôles est requis.');
          }
          
          // Delete the role
          const { error } = await supabase
            .from('roles')
            .delete()
            .eq('id', id);
          
          if (error) {
            throw error;
          }
          
          // Update the local state
          set(state => ({
            roles: state.roles.filter(role => role.id !== id),
            isLoading: false
          }));
        } catch (error: any) {
          console.error('Error deleting role:', error);
          set({ 
            isLoading: false, 
            error: 'Erreur lors de la suppression du rôle: ' + (error.message || 'Erreur inconnue')
          });
          throw error;
        }
      },
      
      clearCache: () => {
        set({ roles: [] });
      },
    }),
    {
      name: 'mysteria-supabase-roles-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        roles: state.roles,
        useMockData: state.useMockData,
      }),
    }
  )
);