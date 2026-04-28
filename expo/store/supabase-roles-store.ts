import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      useMockData: true, // Pas de table 'roles' en base — on utilise les rôles par défaut en mémoire
      
      setUseMockData: (useMockData: boolean) => {
        set({ useMockData });
      },
      
      fetchRoles: async () => {
        // La table public.roles n'existe pas en base — on utilise toujours les rôles par défaut.
        set({ roles: DEFAULT_ROLES, isLoading: false, error: null });
      },
      
      getRoleById: (id: string) => {
        return get().roles.find(role => role.id === id);
      },
      
      createRole: async (roleData: Omit<SupabaseRole, 'id'>) => {
        if (get().roles.length >= 4) throw new Error('Le nombre maximum de rôles (4) a été atteint');
        const newRole: SupabaseRole = {
          id: 'role-' + Math.random().toString(36).substring(2, 9),
          ...roleData,
        };
        set(state => ({ roles: [...state.roles, newRole], isLoading: false }));
        return newRole;
      },
      
      updateRole: async (id: string, roleData: Partial<SupabaseRole>) => {
        const roleIndex = get().roles.findIndex(r => r.id === id);
        if (roleIndex === -1) throw new Error('Rôle non trouvé');
        const updatedRole: SupabaseRole = { ...get().roles[roleIndex], ...roleData };
        set(state => ({ roles: state.roles.map(r => r.id === id ? updatedRole : r), isLoading: false }));
        return updatedRole;
      },
      
      deleteRole: async (id: string) => {
        if (get().roles.length <= 4) throw new Error('Impossible de supprimer un rôle. Le minimum de 4 rôles est requis.');
        set(state => ({ roles: state.roles.filter(r => r.id !== id), isLoading: false }));
      },
      
      clearCache: () => {
        set({ roles: [] });
      },
    }),
    {
      name: 'mysteria-supabase-roles-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // useMockData intentionnellement exclu de la persistance
        // pour que le défaut (true) s'applique toujours au démarrage
        roles: state.roles,
      }),
    }
  )
);