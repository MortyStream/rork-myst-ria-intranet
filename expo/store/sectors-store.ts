import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sector } from '@/types/sector';
import { getSupabase } from '@/utils/supabase';

/**
 * Store des secteurs (sous-structures modulaires d'un pôle).
 *
 * Chaque secteur est lié à un pôle (`poleId` → `user_groups.id`), peut avoir
 * un Responsable de Secteur (`responsibleId` → `users.id`), et expose ses
 * membres via `memberIds` (cache local de `sector_members`).
 *
 * Cf. types/sector.ts + migration `vague_b_phase1_sectors_modeling`.
 */

// Type local enrichi : on stocke memberIds en plus pour la UI (jointure pré-calculée).
type SectorWithMembers = Sector & { memberIds: string[] };

interface SectorsState {
  sectors: SectorWithMembers[];
  isLoading: boolean;
  error: string | null;
}

interface SectorsStore extends SectorsState {
  initializeSectors: () => Promise<void>;
  addSector: (data: { name: string; poleId: string; responsibleId?: string | null; memberIds?: string[] }) => Promise<string>;
  updateSector: (id: string, data: Partial<Pick<Sector, 'name' | 'responsibleId'>>) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;
  setSectorMembers: (sectorId: string, userIds: string[]) => Promise<void>;
  setSectorResponsible: (sectorId: string, userId: string | null) => Promise<void>;
  getSectorById: (id: string) => SectorWithMembers | undefined;
  getSectorsByPole: (poleId: string) => SectorWithMembers[];
}

export const useSectorsStore = create<SectorsStore>()(
  persist(
    (set, get) => ({
      sectors: [],
      isLoading: false,
      error: null,

      initializeSectors: async () => {
        set({ isLoading: true, error: null });
        try {
          const supabase = getSupabase();
          const [{ data: sectorsData, error: sErr }, { data: membersData, error: mErr }] = await Promise.all([
            supabase.from('sectors').select('*').order('name', { ascending: true }),
            supabase.from('sector_members').select('sectorId, userId'),
          ]);
          if (sErr) throw sErr;
          if (mErr) throw mErr;

          const membersBySector = new Map<string, string[]>();
          (membersData || []).forEach((row: any) => {
            const arr = membersBySector.get(row.sectorId) || [];
            arr.push(row.userId);
            membersBySector.set(row.sectorId, arr);
          });

          const sectors: SectorWithMembers[] = (sectorsData || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            poleId: s.poleId,
            responsibleId: s.responsibleId ?? null,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            memberIds: membersBySector.get(s.id) || [],
          }));

          set({ sectors, isLoading: false });
        } catch (error) {
          console.log('Erreur chargement secteurs:', error);
          set({ isLoading: false });
        }
      },

      addSector: async ({ name, poleId, responsibleId, memberIds }) => {
        const supabase = getSupabase();
        const now = new Date().toISOString();
        const { data: inserted, error } = await supabase
          .from('sectors')
          .insert({
            name,
            poleId,
            responsibleId: responsibleId ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .select()
          .single();
        if (error) throw error;

        const ids = memberIds ?? [];
        if (ids.length > 0) {
          const rows = ids.map((uid) => ({ sectorId: inserted.id, userId: uid }));
          const { error: mErr } = await supabase.from('sector_members').insert(rows);
          if (mErr) throw mErr;
        }

        const newSector: SectorWithMembers = {
          id: inserted.id,
          name: inserted.name,
          poleId: inserted.poleId,
          responsibleId: inserted.responsibleId ?? null,
          createdAt: inserted.createdAt,
          updatedAt: inserted.updatedAt,
          memberIds: ids,
        };
        set((state) => ({ sectors: [...state.sectors, newSector] }));
        return inserted.id;
      },

      updateSector: async (id, data) => {
        const supabase = getSupabase();
        const now = new Date().toISOString();
        const { data: updated, error } = await supabase
          .from('sectors')
          .update({ ...data, updatedAt: now })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        set((state) => ({
          sectors: state.sectors.map((s) =>
            s.id === id
              ? {
                  ...s,
                  name: updated.name,
                  responsibleId: updated.responsibleId ?? null,
                  updatedAt: updated.updatedAt,
                }
              : s
          ),
        }));
      },

      deleteSector: async (id) => {
        const supabase = getSupabase();
        const { error } = await supabase.from('sectors').delete().eq('id', id);
        if (error) throw error;
        set((state) => ({ sectors: state.sectors.filter((s) => s.id !== id) }));
      },

      setSectorMembers: async (sectorId, userIds) => {
        const supabase = getSupabase();
        // Replace pattern : delete tout puis re-insert (cohérent avec
        // setGroupMembers de user-groups-store).
        const { error: delErr } = await supabase
          .from('sector_members')
          .delete()
          .eq('sectorId', sectorId);
        if (delErr) throw delErr;

        if (userIds.length > 0) {
          const rows = userIds.map((uid) => ({ sectorId, userId: uid }));
          const { error: insErr } = await supabase.from('sector_members').insert(rows);
          if (insErr) throw insErr;
        }

        set((state) => ({
          sectors: state.sectors.map((s) =>
            s.id === sectorId ? { ...s, memberIds: userIds } : s
          ),
        }));
      },

      setSectorResponsible: async (sectorId, userId) => {
        await get().updateSector(sectorId, { responsibleId: userId });
      },

      getSectorById: (id) => get().sectors.find((s) => s.id === id),

      getSectorsByPole: (poleId) => get().sectors.filter((s) => s.poleId === poleId),
    }),
    {
      name: 'sectors-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ sectors: state.sectors }),
    }
  )
);
