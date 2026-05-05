import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
// Pas besoin de l'icône X (le Header gère le retour via chevron natif)
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  CheckSquare,
  Calendar as CalendarIcon,
  BookOpen,
  Users as UsersIcon,
  ChevronRight,
  X as XIcon,
  Lock,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore } from '@/store/tasks-store';
import { useCalendarStore } from '@/store/calendar-store';
import { useResourcesStore } from '@/store/resources-store';
import { useUsersStore } from '@/store/users-store';
import { Header } from '@/components/Header';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';

const MAX_PER_SECTION = 8;

const norm = (s?: string | null): string =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function SearchScreen() {
  const router = useRouter();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [query, setQuery] = useState('');
  const tasks = useTasksStore((s) => s.tasks);
  const events = useCalendarStore((s) => s.events);
  const items = useResourcesStore((s) => s.resourceItems);
  const users = useUsersStore((s) => s.users);

  const q = norm(query.trim());
  const isSearching = q.length >= 2;

  const matchedTasks = useMemo(() => {
    if (!isSearching) return [];
    return tasks
      .filter((t) => norm(t.title).includes(q) || norm(t.description).includes(q))
      .slice(0, MAX_PER_SECTION);
  }, [tasks, q, isSearching]);

  const matchedEvents = useMemo(() => {
    if (!isSearching) return [];
    return events
      .filter(
        (e) =>
          norm(e.title).includes(q) ||
          norm(e.description).includes(q) ||
          norm(e.location).includes(q)
      )
      .slice(0, MAX_PER_SECTION);
  }, [events, q, isSearching]);

  const matchedItems = useMemo(() => {
    if (!isSearching) return [];
    return items
      .filter(
        (i) =>
          norm(i.title).includes(q) ||
          norm(i.description).includes(q) ||
          norm(i.content).includes(q)
      )
      .slice(0, MAX_PER_SECTION);
  }, [items, q, isSearching]);

  const matchedUsers = useMemo(() => {
    if (!isSearching) return [];
    return users
      .filter((u) => {
        const full = `${u.firstName ?? ''} ${u.lastName ?? ''}`;
        return (
          norm(u.firstName).includes(q) ||
          norm(u.lastName).includes(q) ||
          norm(u.email).includes(q) ||
          norm(full).includes(q)
        );
      })
      .slice(0, MAX_PER_SECTION);
  }, [users, q, isSearching]);

  const totalResults =
    matchedTasks.length + matchedEvents.length + matchedItems.length + matchedUsers.length;

  const goToTask = () => {
    Keyboard.dismiss();
    // Pas de deep-link vers une task spécifique (TaskDetail = Modal interne au
    // screen tasks). On route juste vers la liste — l'user finira la nav lui-même.
    router.push('/tasks');
  };

  const goToEvent = (id: string) => {
    Keyboard.dismiss();
    router.push({ pathname: '/calendar/event-detail', params: { id } });
  };

  const goToCategory = (id: string) => {
    Keyboard.dismiss();
    router.push({ pathname: '/resources/[id]', params: { id } });
  };

  const goToUser = (id: string) => {
    Keyboard.dismiss();
    router.push({ pathname: '/user/[id]', params: { id } });
  };

  const renderSectionHeader = (title: string, count: number, Icon: React.ComponentType<{ size: number; color: string }>) => (
    <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
      <Icon size={16} color={theme.primary} />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.sectionCount, { color: theme.inactive }]}>{count}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Recherche"
        showBackButton
        onBackPress={() => router.back()}
      />

      <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Search size={18} color={theme.inactive} style={{ marginRight: 8 }} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher tâches, events, Bible, membres…"
          placeholderTextColor={theme.inactive}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <XIcon size={18} color={theme.inactive} />
          </TouchableOpacity>
        )}
      </View>

      {!isSearching ? (
        <View style={styles.placeholderWrap}>
          <EmptyState
            title="Cherche tout d'un coup"
            message="Tape au moins 2 lettres pour chercher dans tâches, événements, Bible et annuaire en même temps."
            icon={<Search size={48} color={theme.inactive} />}
          />
        </View>
      ) : totalResults === 0 ? (
        <View style={styles.placeholderWrap}>
          <EmptyState
            title="Aucun résultat"
            message={`Rien ne correspond à « ${query} ». Vérifie l'orthographe ou simplifie la recherche.`}
            icon={<Search size={48} color={theme.inactive} />}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.resultsContent}
          keyboardShouldPersistTaps="handled"
        >
          {matchedTasks.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader('Tâches', matchedTasks.length, CheckSquare)}
              {matchedTasks.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={goToTask}
                >
                  <CheckSquare size={18} color="#5b8def" />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                      {t.title}
                    </Text>
                    {t.description ? (
                      <Text style={[styles.rowSubtitle, { color: theme.inactive }]} numberOfLines={1}>
                        {t.description}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={16} color={theme.inactive} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {matchedEvents.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader('Événements', matchedEvents.length, CalendarIcon)}
              {matchedEvents.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => goToEvent(e.id)}
                >
                  <CalendarIcon size={18} color="#9b59b6" />
                  <View style={styles.rowText}>
                    <View style={styles.rowTitleRow}>
                      <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                        {e.title}
                      </Text>
                      {e.restrictedAccess && <Lock size={12} color={theme.primary} />}
                    </View>
                    <Text style={[styles.rowSubtitle, { color: theme.inactive }]} numberOfLines={1}>
                      {new Date(e.startTime).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {e.location ? ` · ${e.location}` : ''}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.inactive} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {matchedItems.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader('Bible', matchedItems.length, BookOpen)}
              {matchedItems.map((i) => (
                <TouchableOpacity
                  key={i.id}
                  style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => i.categoryId && goToCategory(i.categoryId)}
                >
                  <BookOpen size={18} color="#27ae60" />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                      {i.title}
                    </Text>
                    {i.description ? (
                      <Text style={[styles.rowSubtitle, { color: theme.inactive }]} numberOfLines={1}>
                        {i.description}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={16} color={theme.inactive} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {matchedUsers.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader('Membres', matchedUsers.length, UsersIcon)}
              {matchedUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => goToUser(u.id)}
                >
                  <Avatar
                    name={`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || '?'}
                    source={u.avatarUrl ? { uri: u.avatarUrl } : undefined}
                    size={32}
                  />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                      {`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email}
                    </Text>
                    {u.email ? (
                      <Text style={[styles.rowSubtitle, { color: theme.inactive }]} numberOfLines={1}>
                        {u.email}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={16} color={theme.inactive} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  placeholderWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  rowText: {
    flex: 1,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
});
