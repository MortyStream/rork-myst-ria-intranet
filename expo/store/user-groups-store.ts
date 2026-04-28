import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserGroup } from '@/types/user-group';
import { getSupabase } from '@/utils/supabase';
import { useAuthStore } from './auth-store';

interface UserGroupsState {
  groups: UserGroup[];
  isLoading: boolean;
  error: string | null;
}

interface UserGroupsStore extends UserGroupsState {
  initializeGroups: () => Promise<void>;
  addGroup: (data: Omit<UserGroup, 'id' | 'createdAt' | 'updatedAt' | 'memberIds' | 'createdBy'> & { memberIds?: string[] }) => Promise<string>;
  updateGroup: (id: string, data: Partial<Omit<UserGroup, 'id' | 'memberIds'>>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  setGroupMembers: (groupId: string, userIds: string[]) => Promise<void>;
  getGroupById: (id: string) => UserGroup | undefined;
}

export const useUserGroupsStore = create<UserGroupsStore>()(
  persist(
    (set, get) => ({
      groups: [],
      isLoading: false,
      error: null,

      initializeGroups: async () => {
        set({ isLoading: true, error: null });
        try {
          const supabase = getSupabase();
          const [{ data: groupsData, error: gErr }, { data: membersData, error: mErr }] = await Promise.all([
            supabase.from('user_groups').select('*').order('name', { ascending: true }),
            supabase.from('user_group_members').select('group_id, user_id'),
          ]);
          if (gErr) throw gErr;
          if (mErr) throw mErr;

          const membersByGroup = new Map<string, string[]>();
          (membersData || []).forEach((row: any) => {
            const arr = membersByGroup.get(row.group_id) || [];
            arr.push(row.user_id);
            membersByGroup.set(row.group_id, arr);
          });

          const groups: UserGroup[] = (groupsData || []).map((g: any) => ({
            id: g.id,
            name: g.name,
            description: g.description ?? undefined,
            color: g.color ?? undefined,
            icon: g.icon ?? undefined,
            createdBy: g.createdBy ?? undefined,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
            memberIds: membersByGroup.get(g.id) || [],
          }));

          set({ groups, isLoading: false });
        } catch (error) {
          console.log('Erreur chargement groupes:', error);
          set({ isLoading: false });
        }
      },

      addGroup: async (data) => {
        const supabase = getSupabase();
        const currentUser = useAuthStore.getState().user;
        const now = new Date().toISOString();
        const { data: inserted, error } = await supabase
          .from('user_groups')
          .insert({
            name: data.name,
            description: data.description ?? null,
            color: data.color ?? null,
            icon: data.icon ?? null,
            createdBy: currentUser?.id ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .select()
          .single();
        if (error) throw error;

        const memberIds = data.memberIds ?? [];
        if (memberIds.length > 0) {
          const rows = memberIds.map((uid) => ({ group_id: inserted.id, user_id: uid }));
          const { error: mErr } = await supabase.from('user_group_members').insert(rows);
          if (mErr) throw mErr;
        }

        const newGroup: UserGroup = {
          id: inserted.id,
          name: inserted.name,
          description: inserted.description ?? undefined,
          color: inserted.color ?? undefined,
          icon: inserted.icon ?? undefined,
          createdBy: inserted.createdBy ?? undefined,
          createdAt: inserted.createdAt,
          updatedAt: inserted.updatedAt,
          memberIds,
        };
        set((state) => ({ groups: [...state.groups, newGroup] }));
        return inserted.id;
      },

      updateGroup: async (id, data) => {
        const supabase = getSupabase();
        const now = new Date().toISOString();
        const { data: updated, error } = await supabase
          .from('user_groups')
          .update({ ...data, updatedAt: now })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id
              ? {
                  ...g,
                  name: updated.name,
                  description: updated.description ?? undefined,
                  color: updated.color ?? undefined,
                  icon: updated.icon ?? undefined,
                  updatedAt: updated.updatedAt,
                }
              : g
          ),
        }));
      },

      deleteGroup: async (id) => {
        const supabase = getSupabase();
        const { error } = await supabase.from('user_groups').delete().eq('id', id);
        if (error) throw error;
        set((state) => ({ groups: state.groups.filter((g) => g.id !== id) }));
      },

      setGroupMembers: async (groupId, userIds) => {
        const supabase = getSupabase();
        // Remplace intégralement : on delete puis insert
        const { error: delErr } = await supabase
          .from('user_group_members')
          .delete()
          .eq('group_id', groupId);
        if (delErr) throw delErr;

        if (userIds.length > 0) {
          const rows = userIds.map((uid) => ({ group_id: groupId, user_id: uid }));
          const { error: insErr } = await supabase.from('user_group_members').insert(rows);
          if (insErr) throw insErr;
        }

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, memberIds: userIds } : g
          ),
        }));
      },

      getGroupById: (id) => get().groups.find((g) => g.id === id),
    }),
    {
      name: 'user-groups-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ groups: state.groups }),
    }
  )
);
