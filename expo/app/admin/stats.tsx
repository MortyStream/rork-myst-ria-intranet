import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Folder,
  FileText,
  Bell,
  Calendar,
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Award,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useResourcesStore } from '@/store/resources-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useCalendarStore } from '@/store/calendar-store';
import { useTasksStore } from '@/store/tasks-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';

/**
 * Dashboard admin enrichi (#3 roadmap) — stats utiles pour piloter l'asso :
 * tâches (statut, retards, top contributeurs, taux complétion), events (RSVP rate),
 * membres (rôles, dormants), Bible (types). Tout en lecture sur les stores
 * Zustand (pas de query DB supplémentaire).
 */
export default function StatsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { users } = useUsersStore();
  const { categories, resourceItems } = useResourcesStore();
  const { notifications } = useNotificationsStore();
  const { events } = useCalendarStore();
  const { tasks } = useTasksStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  React.useEffect(() => {
    if (!isAdminOrModerator) router.replace('/admin');
  }, [isAdminOrModerator]);

  if (!isAdminOrModerator) return null;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // ── TÂCHES ────────────────────────────────────────────────────────────────
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const validated = tasks.filter((t) => t.status === 'validated').length;
    const now = Date.now();
    const overdue = tasks.filter(
      (t) =>
        t.deadline &&
        new Date(t.deadline).getTime() < now &&
        t.status !== 'completed' &&
        t.status !== 'validated'
    ).length;
    const high = tasks.filter((t) => t.priority === 'high').length;
    const medium = tasks.filter((t) => t.priority === 'medium').length;
    const low = tasks.filter((t) => t.priority === 'low').length;
    const completionRate = total > 0 ? Math.round(((completed + validated) / total) * 100) : 0;

    // Top contributeurs : qui crée le plus + qui termine le plus
    const createdByMap = new Map<string, number>();
    const completedByMap = new Map<string, number>();
    for (const t of tasks) {
      if (t.assignedBy) createdByMap.set(t.assignedBy, (createdByMap.get(t.assignedBy) ?? 0) + 1);
      if (t.completedBy) completedByMap.set(t.completedBy, (completedByMap.get(t.completedBy) ?? 0) + 1);
    }
    const topCreators = Array.from(createdByMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const topCompleters = Array.from(completedByMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, pending, inProgress, completed, validated, overdue, high, medium, low, completionRate, topCreators, topCompleters };
  }, [tasks]);

  // ── ÉVÉNEMENTS ────────────────────────────────────────────────────────────
  const eventStats = useMemo(() => {
    const now = Date.now();
    const upcoming = events.filter((e) => new Date(e.startTime).getTime() > now);
    const past = events.filter((e) => new Date(e.startTime).getTime() <= now);
    // RSVP rate sur events upcoming : confirmed sur (confirmed+pending+declined).
    let totalInvites = 0;
    let totalConfirmed = 0;
    for (const e of upcoming) {
      const ps = e.participants ?? [];
      totalInvites += ps.length;
      totalConfirmed += ps.filter((p) => p.status === 'confirmed').length;
    }
    const rsvpRate = totalInvites > 0 ? Math.round((totalConfirmed / totalInvites) * 100) : 0;
    const restricted = events.filter((e) => e.restrictedAccess).length;
    return { total: events.length, upcoming: upcoming.length, past: past.length, rsvpRate, restricted };
  }, [events]);

  // ── MEMBRES ───────────────────────────────────────────────────────────────
  const memberStats = useMemo(() => {
    const total = users.length;
    const byRole: Record<string, number> = {};
    for (const u of users) {
      const r = u.role ?? 'membre';
      byRole[r] = (byRole[r] ?? 0) + 1;
    }
    const neverLogged = users.filter((u) => !u.lastLogin).length;
    const now = Date.now();
    const activeRecent = users.filter((u) => {
      if (!u.lastLogin) return false;
      return now - new Date(u.lastLogin).getTime() < 30 * 24 * 60 * 60 * 1000;
    }).length;
    return { total, byRole, neverLogged, activeRecent };
  }, [users]);

  // ── ITEMS BIBLE ───────────────────────────────────────────────────────────
  const itemStats = useMemo(() => {
    const total = resourceItems.length;
    const byType: Record<string, number> = {};
    for (const i of resourceItems) {
      byType[i.type] = (byType[i.type] ?? 0) + 1;
    }
    return { total, byType };
  }, [resourceItems]);

  const findUser = (id: string) => users.find((u) => u.id === id);
  const userName = (id: string) => {
    const u = findUser(id);
    if (!u) return '—';
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || '—';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Statistiques"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Vue d'ensemble — 4 cards en grille */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Vue d'ensemble</Text>
        <View style={styles.statsGrid}>
          <StatCard
            theme={theme}
            darkMode={darkMode}
            icon={<CheckSquare size={20} color="#fff" />}
            iconBg={theme.primary}
            value={taskStats.total}
            label="Tâches"
            subline={`${taskStats.completionRate}% terminées`}
          />
          <StatCard
            theme={theme}
            darkMode={darkMode}
            icon={<AlertTriangle size={20} color="#fff" />}
            iconBg={theme.error}
            value={taskStats.overdue}
            label="En retard"
            subline={taskStats.total > 0 ? `${Math.round((taskStats.overdue / taskStats.total) * 100)}% du total` : '—'}
          />
          <StatCard
            theme={theme}
            darkMode={darkMode}
            icon={<Calendar size={20} color="#fff" />}
            iconBg={theme.success}
            value={eventStats.upcoming}
            label="Events à venir"
            subline={`RSVP ${eventStats.rsvpRate}% confirmés`}
          />
          <StatCard
            theme={theme}
            darkMode={darkMode}
            icon={<Users size={20} color="#fff" />}
            iconBg={theme.info}
            value={memberStats.total}
            label="Membres"
            subline={`${memberStats.activeRecent} actifs sur 30j`}
          />
        </View>

        {/* TÂCHES par statut */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tâches — par statut</Text>
        <Card style={styles.chartCard}>
          <BarRow theme={theme} label="À faire" value={taskStats.pending} total={taskStats.total} color={theme.warning} />
          <BarRow theme={theme} label="En cours" value={taskStats.inProgress} total={taskStats.total} color={theme.info} />
          <BarRow theme={theme} label="Terminées" value={taskStats.completed} total={taskStats.total} color={theme.success} />
          <BarRow theme={theme} label="Validées" value={taskStats.validated} total={taskStats.total} color={theme.primary} />
          <BarRow theme={theme} label="En retard" value={taskStats.overdue} total={taskStats.total} color={theme.error} />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tâches — par priorité</Text>
        <Card style={styles.chartCard}>
          <BarRow theme={theme} label="Haute" value={taskStats.high} total={taskStats.total} color={theme.error} />
          <BarRow theme={theme} label="Moyenne" value={taskStats.medium} total={taskStats.total} color={theme.warning} />
          <BarRow theme={theme} label="Basse" value={taskStats.low} total={taskStats.total} color={theme.info} />
        </Card>

        {/* Top contributeurs */}
        {(taskStats.topCreators.length > 0 || taskStats.topCompleters.length > 0) && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Top contributeurs</Text>
            <Card style={styles.chartCard}>
              <View style={styles.topRow}>
                <View style={styles.topBlock}>
                  <View style={styles.topHeader}>
                    <TrendingUp size={16} color={theme.primary} />
                    <Text style={[styles.topTitle, { color: theme.text }]}>Créent le plus</Text>
                  </View>
                  {taskStats.topCreators.length === 0 ? (
                    <Text style={[styles.topEmpty, { color: theme.inactive }]}>—</Text>
                  ) : (
                    taskStats.topCreators.map(([uid, count], idx) => {
                      const u = findUser(uid);
                      return (
                        <View key={uid} style={styles.topItem}>
                          <Text style={[styles.topRank, { color: theme.primary }]}>{idx + 1}</Text>
                          <Avatar
                            name={userName(uid)}
                            source={u?.avatarUrl ? { uri: u.avatarUrl } : undefined}
                            size={28}
                          />
                          <Text style={[styles.topName, { color: theme.text }]} numberOfLines={1}>
                            {userName(uid)}
                          </Text>
                          <Text style={[styles.topCount, { color: theme.inactive }]}>{count}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
                <View style={styles.topBlock}>
                  <View style={styles.topHeader}>
                    <Award size={16} color={theme.success} />
                    <Text style={[styles.topTitle, { color: theme.text }]}>Terminent le plus</Text>
                  </View>
                  {taskStats.topCompleters.length === 0 ? (
                    <Text style={[styles.topEmpty, { color: theme.inactive }]}>—</Text>
                  ) : (
                    taskStats.topCompleters.map(([uid, count], idx) => {
                      const u = findUser(uid);
                      return (
                        <View key={uid} style={styles.topItem}>
                          <Text style={[styles.topRank, { color: theme.success }]}>{idx + 1}</Text>
                          <Avatar
                            name={userName(uid)}
                            source={u?.avatarUrl ? { uri: u.avatarUrl } : undefined}
                            size={28}
                          />
                          <Text style={[styles.topName, { color: theme.text }]} numberOfLines={1}>
                            {userName(uid)}
                          </Text>
                          <Text style={[styles.topCount, { color: theme.inactive }]}>{count}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </Card>
          </>
        )}

        {/* ÉVÉNEMENTS */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Événements</Text>
        <Card style={styles.chartCard}>
          <BarRow theme={theme} label="À venir" value={eventStats.upcoming} total={eventStats.total} color={theme.success} />
          <BarRow theme={theme} label="Passés" value={eventStats.past} total={eventStats.total} color={theme.inactive} />
          <BarRow theme={theme} label="Privés" value={eventStats.restricted} total={eventStats.total} color={theme.primary} />
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: darkMode ? theme.inactive : '#666' }]}>Taux RSVP confirmés (à venir)</Text>
            <Text style={[styles.metricValue, { color: theme.primary }]}>{eventStats.rsvpRate}%</Text>
          </View>
        </Card>

        {/* MEMBRES */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Membres — par rôle</Text>
        <Card style={styles.chartCard}>
          {Object.entries(memberStats.byRole)
            .sort((a, b) => b[1] - a[1])
            .map(([role, count]) => (
              <BarRow
                key={role}
                theme={theme}
                label={roleLabel(role)}
                value={count}
                total={memberStats.total}
                color={roleColor(role, theme)}
              />
            ))}
          <View style={[styles.metricRow, { marginTop: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color={theme.inactive} />
              <Text style={[styles.metricLabel, { color: darkMode ? theme.inactive : '#666' }]}>Jamais connectés</Text>
            </View>
            <Text style={[styles.metricValue, { color: memberStats.neverLogged > 0 ? theme.warning : theme.text }]}>
              {memberStats.neverLogged}
            </Text>
          </View>
        </Card>

        {/* BIBLE */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Bible — par type</Text>
        <Card style={styles.chartCard}>
          {Object.entries(itemStats.byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <BarRow
                key={type}
                theme={theme}
                label={typeLabel(type)}
                value={count}
                total={itemStats.total}
                color={theme.primary}
              />
            ))}
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: darkMode ? theme.inactive : '#666' }]}>Catégories Bible</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{categories.length}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: darkMode ? theme.inactive : '#666' }]}>Notifications totales</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{notifications.length}</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sous-composants présentationnels ───────────────────────────────────────

interface StatCardProps {
  theme: typeof Colors.dark;
  darkMode: boolean;
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
  subline: string;
}
const StatCard: React.FC<StatCardProps> = ({ theme, darkMode, icon, iconBg, value, label, subline }) => (
  <Card style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: iconBg }]}>{icon}</View>
    <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: darkMode ? theme.inactive : '#666' }]}>{label}</Text>
    <Text style={[styles.statSubline, { color: theme.inactive }]} numberOfLines={1}>
      {subline}
    </Text>
  </Card>
);

interface BarRowProps {
  theme: typeof Colors.dark;
  label: string;
  value: number;
  total: number;
  color: string;
}
const BarRow: React.FC<BarRowProps> = ({ theme, label, value, total, color }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: theme.text }]} numberOfLines={1}>{label}</Text>
      <View style={[styles.barTrack, { backgroundColor: 'rgba(127,127,127,0.18)' }]}>
        <View style={[styles.barFill, { backgroundColor: color, width: `${pct}%` }]} />
      </View>
      <Text style={[styles.barValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
};

const roleLabel = (r: string): string => {
  switch (r) {
    case 'admin': return 'Admin';
    case 'responsable_pole': return 'Resp. pôle';
    case 'responsable_secteur': return 'Resp. secteur';
    case 'membre': return 'Membre';
    case 'user': return 'User';
    case 'moderator': return 'Modérateur';
    case 'committee': return 'Comité';
    default: return r.charAt(0).toUpperCase() + r.slice(1);
  }
};

const roleColor = (r: string, theme: typeof Colors.dark): string => {
  switch (r) {
    case 'admin': return theme.error;
    case 'responsable_pole': return theme.primary;
    case 'responsable_secteur': return theme.warning;
    case 'membre':
    case 'user': return theme.info;
    default: return theme.inactive;
  }
};

const typeLabel = (t: string): string => {
  switch (t) {
    case 'folder': return 'Dossiers';
    case 'file': return 'Fichiers';
    case 'link': return 'Liens';
    case 'text': return 'Textes';
    case 'image': return 'Images';
    default: return t;
  }
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 13, fontWeight: '500' },
  statSubline: { fontSize: 11, marginTop: 2 },
  chartCard: {
    marginBottom: 20,
    padding: 14,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  barLabel: {
    width: 100,
    fontSize: 13,
  },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: { height: '100%', borderRadius: 6 },
  barValue: { width: 32, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.2)',
    marginTop: 6,
  },
  metricLabel: { fontSize: 13 },
  metricValue: { fontSize: 15, fontWeight: '700' },
  topRow: {
    flexDirection: 'row',
    gap: 12,
  },
  topBlock: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  topTitle: { fontSize: 13, fontWeight: '700' },
  topEmpty: { fontSize: 12, fontStyle: 'italic' },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  topRank: { fontSize: 14, fontWeight: '700', width: 16 },
  topName: { flex: 1, fontSize: 13, fontWeight: '500' },
  topCount: { fontSize: 13, fontWeight: '700' },
});
