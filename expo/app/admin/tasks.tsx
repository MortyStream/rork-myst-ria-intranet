import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore } from '@/store/tasks-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { TaskItem } from '@/components/TaskItem';
import { TaskDetail } from '@/components/TaskDetail';
import { TaskForm } from '@/components/TaskForm';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { Task, TaskStatus } from '@/types/task';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'validated';

const STATUS_LABELS: Record<FilterStatus, string> = {
  all: 'Toutes',
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminées',
  validated: 'Validées',
};

export default function AdminTasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const { tasks, initializeTasks } = useTasksStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const canAccess =
    user?.role === 'admin' ||
    (user?.role === 'moderator' && user?.permissions?.includes('tasks'));

  useEffect(() => {
    if (!canAccess) { router.replace('/'); return; }
    initializeTasks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeTasks();
    setRefreshing(false);
  };

  const filteredTasks: Task[] =
    filter === 'all'
      ? [...tasks].sort((a, b) => {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        })
      : tasks.filter(t => t.status === filter);

  const countByStatus = (s: FilterStatus) =>
    s === 'all' ? tasks.length : tasks.filter(t => t.status === s).length;

  if (!canAccess) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Gestion des tâches"
        showBackButton
        onBackPress={() => router.back()}
        rightComponent={
          <Button
            icon={<Plus size={22} color={theme.text} />}
            onPress={() => setShowTaskForm(true)}
            variant="text"
          />
        }
      />

      {/* Filtres statut */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {(Object.keys(STATUS_LABELS) as FilterStatus[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === s ? theme.primary : theme.card,
                borderColor: filter === s ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setFilter(s)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: filter === s ? '#fff' : theme.text },
              ]}
            >
              {STATUS_LABELS[s]} ({countByStatus(s)})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon="check-square"
            title="Aucune tâche"
            message="Aucune tâche dans cette catégorie."
            style={styles.empty}
          />
        ) : (
          filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onPress={() => setSelectedTask(task)}
            />
          ))
        )}
      </ScrollView>

      {selectedTask ? (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={onRefresh}
        />
      ) : null}

      {showTaskForm ? (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          onSave={async () => { setShowTaskForm(false); await initializeTasks(); }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterScroll: { flexGrow: 0 },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  empty: { marginTop: 60 },
});
