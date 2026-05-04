import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock,
  CheckCircle2,
  Flag,
  AlertCircle,
  SlidersHorizontal,
  X,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore } from '@/store/tasks-store';
import { useUsersStore } from '@/store/users-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Avatar } from '@/components/Avatar';
import { TaskItem } from '@/components/TaskItem';
import { TaskDetail } from '@/components/TaskDetail';
import { EmptyState } from '@/components/EmptyState';
import { getSupabase } from '@/utils/supabase';
import { Task } from '@/types/task';
import { tapHaptic } from '@/utils/haptics';

/**
 * Vue d'équipe — Vague B Phase 3 (2026-05-05).
 *
 * Affiche les tâches données aux membres dans le scope du caller :
 *  - admin : tous les users
 *  - responsable_pole : membres des secteurs de son pôle
 *  - responsable_secteur : membres de son secteur
 *
 * Le scope est résolu côté DB via la RPC `public.get_my_team_user_ids()`
 * qui s'appuie sur `private.user_team_user_ids(internal_id)`. Les tasks
 * elles-mêmes sont filtrées côté client depuis `tasks-store.tasks`
 * (déjà initialisé via le _layout).
 *
 * Layout : tâches groupées par membre avec compteur "tâches en retard"
 * en badge rouge. Tap sur une tâche → TaskDetail modal.
 */

type StatusFilter = 'all' | 'pending' | 'completed';

export default function TeamTasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();

  const allTasks = useTasksStore((state) => state.tasks);
  const initializeTasks = useTasksStore((state) => state.initializeTasks);
  const updateTaskStatus = useTasksStore((state) => state.updateTaskStatus);
  const { getUserById, initializeUsers } = useUsersStore();

  // Garde d'accès UI : l'écran n'est destiné qu'aux admin/RP/RS.
  const canAccess =
    user?.role === 'admin' ||
    user?.role === 'responsable_pole' ||
    user?.role === 'responsable_secteur';

  const [teamUserIds, setTeamUserIds] = useState<string[]>([]);
  const [isLoadingScope, setIsLoadingScope] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtres (calqués sur la refonte Vague A)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [chipHighPriority, setChipHighPriority] = useState(false);
  const [chipOverdue, setChipOverdue] = useState(false);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);

  // Détail tâche (sélection)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Cards par membre : déroulé par défaut. Tap sur le header collapse/expand.
  const [collapsedMembers, setCollapsedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    if (!canAccess) {
      router.replace('/tasks');
    }
  }, [user, canAccess]);

  const fetchTeamScope = async () => {
    setIsLoadingScope(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('get_my_team_user_ids');
      if (error) throw error;
      setTeamUserIds(Array.isArray(data) ? (data as string[]) : []);
    } catch (e) {
      console.log('get_my_team_user_ids error:', e);
      setTeamUserIds([]);
    } finally {
      setIsLoadingScope(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    initializeUsers();
    fetchTeamScope();
  }, [canAccess]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([initializeTasks(), fetchTeamScope()]);
    setRefreshing(false);
  };

  // Filtre les tâches du scope d'équipe + applique les filtres UI.
  const tasksByMember = useMemo(() => {
    if (teamUserIds.length === 0) return new Map<string, Task[]>();
    const teamSet = new Set(teamUserIds);
    // Optionnel : exclure le caller de sa propre vue (sinon il se voit lui-même
    // dans la liste). Mais pour un admin c'est utile d'avoir aussi sa vue.
    // On garde tout — l'user verra ses propres tâches en bas s'il fait partie
    // du teamSet (logique car admin = lui inclus).

    const matches = (t: Task): boolean => {
      // Au moins un assignedTo dans le team scope
      if (!t.assignedTo?.some((uid) => teamSet.has(uid))) return false;

      // Status filter
      if (statusFilter === 'pending') {
        if (t.status !== 'pending' && t.status !== 'in_progress') return false;
      } else if (statusFilter === 'completed') {
        if (t.status !== 'completed' && t.status !== 'validated') return false;
      }

      // Priority haute
      if (chipHighPriority && t.priority !== 'high') return false;

      // En retard
      if (chipOverdue) {
        if (!t.deadline) return false;
        if (t.status === 'completed' || t.status === 'validated') return false;
        if (new Date(t.deadline).getTime() >= Date.now()) return false;
      }

      return true;
    };

    // Group by membre — une tâche apparaît une seule fois par membre assigné
    // (si une tâche est assignée à 3 membres du team, elle est listée 3x sous
    // chacun, ce qui est intentionnel : chaque membre la voit dans sa colonne).
    const map = new Map<string, Task[]>();
    for (const t of allTasks) {
      if (!matches(t)) continue;
      for (const uid of t.assignedTo ?? []) {
        if (!teamSet.has(uid)) continue;
        const arr = map.get(uid) || [];
        arr.push(t);
        map.set(uid, arr);
      }
    }
    return map;
  }, [allTasks, teamUserIds, statusFilter, chipHighPriority, chipOverdue]);

  // Compteur en retard par membre (pour le badge dans le header de la card)
  const overdueCountByMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const [uid, tasks] of tasksByMember) {
      const count = tasks.filter(
        (t) =>
          t.deadline &&
          t.status !== 'completed' &&
          t.status !== 'validated' &&
          new Date(t.deadline).getTime() < Date.now()
      ).length;
      map.set(uid, count);
    }
    return map;
  }, [tasksByMember]);

  // Trier les membres par : (1) en retard décroissant (priorité visuelle),
  // (2) nb total décroissant, (3) prénom alphabétique.
  const sortedMembers = useMemo(() => {
    const entries = Array.from(tasksByMember.entries());
    return entries.sort((a, b) => {
      const aOverdue = overdueCountByMember.get(a[0]) ?? 0;
      const bOverdue = overdueCountByMember.get(b[0]) ?? 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      if (a[1].length !== b[1].length) return b[1].length - a[1].length;
      const aUser = getUserById(a[0]);
      const bUser = getUserById(b[0]);
      const aName = aUser?.firstName || '';
      const bName = bUser?.firstName || '';
      return aName.localeCompare(bName);
    });
  }, [tasksByMember, overdueCountByMember, getUserById]);

  const totalTasks = useMemo(
    () => Array.from(tasksByMember.values()).reduce((sum, arr) => sum + arr.length, 0),
    [tasksByMember]
  );

  const advancedFiltersCount =
    (chipHighPriority ? 1 : 0) + (chipOverdue ? 1 : 0);

  const toggleCollapse = (memberId: string) => {
    tapHaptic();
    setCollapsedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskDetailClose = () => {
    setSelectedTask(null);
  };

  const handleToggleDone = async (task: Task) => {
    const isDone = task.status === 'completed' || task.status === 'validated';
    const nextStatus = isDone ? 'pending' : 'completed';
    tapHaptic();
    try {
      await updateTaskStatus(task.id, nextStatus);
    } catch (e) {
      console.error('Erreur toggle statut tâche (team view):', e);
    }
  };

  if (!user || !canAccess) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Vue d'équipe"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      {/* Stats récap en haut */}
      <View style={[styles.statsRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.statsText, { color: darkMode ? theme.inactive : '#666' }]}>
          {teamUserIds.length} membre{teamUserIds.length > 1 ? 's' : ''} dans ton scope ·{' '}
          {totalTasks} tâche{totalTasks > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Status chips + funnel filtres avancés (cohérent avec la refonte de
          l'onglet tâches Vague A). */}
      <View style={styles.primaryChipsRow}>
        <FilterChip
          label="Toutes"
          icon={null}
          active={statusFilter === 'all'}
          onPress={() => setStatusFilter('all')}
          theme={theme}
          primary={appColors.primary}
        />
        <FilterChip
          label="À faire"
          icon={<Clock size={14} color={statusFilter === 'pending' ? '#fff' : theme.text} />}
          active={statusFilter === 'pending'}
          onPress={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          theme={theme}
          primary={appColors.primary}
        />
        <FilterChip
          label="Terminées"
          icon={<CheckCircle2 size={14} color={statusFilter === 'completed' ? '#fff' : theme.text} />}
          active={statusFilter === 'completed'}
          onPress={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          theme={theme}
          primary={appColors.primary}
        />
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => {
            tapHaptic();
            setShowFiltersSheet(true);
          }}
          style={[
            styles.funnelButton,
            {
              backgroundColor: advancedFiltersCount > 0 ? appColors.primary : 'transparent',
              borderColor: advancedFiltersCount > 0 ? appColors.primary : theme.border,
            },
          ]}
        >
          <SlidersHorizontal
            size={16}
            color={advancedFiltersCount > 0 ? '#fff' : theme.text}
          />
          {advancedFiltersCount > 0 && (
            <Text style={styles.funnelBadge}>{advancedFiltersCount}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Liste */}
      {isLoadingScope && allTasks.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={appColors.primary} />
        </View>
      ) : sortedMembers.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="users"
            title={
              teamUserIds.length === 0
                ? 'Pas de scope d\'équipe'
                : 'Aucune tâche dans ton équipe'
            }
            message={
              teamUserIds.length === 0
                ? 'Aucun membre n\'est encore rattaché à un secteur de ton scope. Va dans /admin/sectors pour les affecter.'
                : 'Personne dans ton équipe n\'a de tâche assignée pour le moment.'
            }
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {sortedMembers.map(([memberId, tasks]) => {
            const member = getUserById(memberId);
            const overdue = overdueCountByMember.get(memberId) ?? 0;
            const collapsed = collapsedMembers.has(memberId);

            return (
              <View key={memberId} style={styles.memberSection}>
                <TouchableOpacity
                  style={[styles.memberHeader, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => toggleCollapse(memberId)}
                  activeOpacity={0.7}
                >
                  <Avatar
                    source={member?.avatarUrl ? { uri: member.avatarUrl } : undefined}
                    name={member ? `${member.firstName} ${member.lastName}` : '?'}
                    size={36}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.memberName, { color: theme.text }]}>
                      {member ? `${member.firstName} ${member.lastName}` : 'Utilisateur inconnu'}
                    </Text>
                    <View style={styles.memberMeta}>
                      <Text style={[styles.memberMetaText, { color: darkMode ? theme.inactive : '#666' }]}>
                        {tasks.length} tâche{tasks.length > 1 ? 's' : ''}
                      </Text>
                      {overdue > 0 && (
                        <View style={[styles.overdueBadge, { backgroundColor: theme.error }]}>
                          <AlertCircle size={11} color="#fff" />
                          <Text style={styles.overdueBadgeText}>{overdue} en retard</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {collapsed ? (
                    <ChevronDown size={20} color={darkMode ? theme.inactive : '#888'} />
                  ) : (
                    <ChevronUp size={20} color={darkMode ? theme.inactive : '#888'} />
                  )}
                </TouchableOpacity>

                {!collapsed &&
                  tasks.map((task) => {
                    const canToggle =
                      task.assignedTo.includes(user.id) ||
                      task.assignedBy === user.id ||
                      user.role === 'admin';
                    return (
                      <TaskItem
                        key={`${memberId}-${task.id}`}
                        task={task}
                        onPress={() => handleTaskPress(task)}
                        onToggleDone={() => handleToggleDone(task)}
                        canToggleDone={canToggle}
                      />
                    );
                  })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* TaskDetail modal */}
      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={handleTaskDetailClose} />
      )}

      {/* Bottom-sheet filtres avancés */}
      <Modal
        visible={showFiltersSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltersSheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowFiltersSheet(false)}
        >
          <TouchableOpacity
            style={[styles.sheet, { backgroundColor: theme.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Filtres avancés</Text>
              <TouchableOpacity
                onPress={() => setShowFiltersSheet(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.filterRow, { borderBottomColor: theme.border }]}
              onPress={() => setChipHighPriority((v) => !v)}
            >
              <View style={styles.filterRowLeft}>
                <Flag size={18} color={chipHighPriority ? theme.error : theme.text} />
                <Text style={[styles.filterRowLabel, { color: theme.text }]}>Priorité haute</Text>
              </View>
              {chipHighPriority && <Check size={18} color={appColors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterRow, { borderBottomColor: theme.border }]}
              onPress={() => setChipOverdue((v) => !v)}
            >
              <View style={styles.filterRowLeft}>
                <AlertCircle size={18} color={chipOverdue ? theme.error : theme.text} />
                <Text style={[styles.filterRowLabel, { color: theme.text }]}>En retard</Text>
              </View>
              {chipOverdue && <Check size={18} color={appColors.primary} />}
            </TouchableOpacity>

            {advancedFiltersCount > 0 && (
              <TouchableOpacity
                style={[styles.filterClearButton, { borderTopColor: theme.border }]}
                onPress={() => {
                  setChipHighPriority(false);
                  setChipOverdue(false);
                }}
              >
                <Text style={[styles.filterClearText, { color: theme.error }]}>
                  Effacer les filtres ({advancedFiltersCount})
                </Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Petit FilterChip local (réplique simplifiée de tasks.tsx pour rester
// auto-portant ; pas de dépendance au composant FilterChip de tasks.tsx).
const FilterChip: React.FC<{
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  theme: typeof Colors.light;
  primary: string;
}> = ({ label, icon, active, onPress, theme, primary }) => (
  <TouchableOpacity
    onPress={() => {
      tapHaptic();
      onPress();
    }}
    activeOpacity={0.7}
    style={[
      chipStyles.chip,
      {
        backgroundColor: active ? primary : 'transparent',
        borderColor: active ? primary : theme.border,
      },
    ]}
  >
    {icon}
    <Text
      style={[chipStyles.chipText, { color: active ? '#fff' : theme.text, marginLeft: icon ? 6 : 0 }]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

  statsRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsText: { fontSize: 12 },

  primaryChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  funnelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  funnelBadge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  memberSection: { marginBottom: 16 },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  memberMetaText: { fontSize: 12 },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  overdueBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Sheet filtres
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingBottom: 24,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, flex: 1 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterRowLabel: { fontSize: 15, fontWeight: '500' },
  filterClearButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  filterClearText: { fontSize: 14, fontWeight: '600' },
});
