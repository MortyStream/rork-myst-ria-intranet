import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  Alert,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore } from '@/store/tasks-store';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { TaskItem } from '@/components/TaskItem';
import { TaskDetail } from '@/components/TaskDetail';
import { TaskForm } from '@/components/TaskForm';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Task } from '@/types/task';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';

export default function TasksScreen() {
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const {
    getUserTasks,
    getOverdueTasks,
    initializeTasks,
    checkAndSendTaskReminders,
    updateTaskStatus,
    deleteTask,
  } = useTasksStore();

  const theme = darkMode ? Colors.dark : Colors.light;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | undefined>(undefined);
  // États du dialog de suppression custom (remplace Alert.alert)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    initializeTasks().then(() => {
      if (user?.id) checkAndSendTaskReminders(user.id);
    });
  }, []);
  
  const userTasks = user ? getUserTasks(user.id) : [];
  const overdueTasks = user ? getOverdueTasks().filter(task => task.assignedTo.includes(user.id)) : [];
  
  const pendingTasks = userTasks.filter(task => 
    task.assignedTo.includes(user?.id || '') && 
    (task.status === 'pending' || task.status === 'in_progress')
  );
  
  const completedTasks = userTasks.filter(task => 
    task.assignedTo.includes(user?.id || '') && 
    (task.status === 'completed' || task.status === 'validated')
  );
  
  const tasksToShow = filter === 'all' ? userTasks : 
                     filter === 'pending' ? pendingTasks : 
                     completedTasks;
  
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await initializeTasks();
    setRefreshing(false);
  }, []);
  
  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
  };

  const handleToggleDone = async (task: Task) => {
    const isDone = task.status === 'completed' || task.status === 'validated';
    const nextStatus = isDone ? 'pending' : 'completed';
    // Haptic instant : feedback tactile d\u00e8s le tap, avant m\u00eame l'API call
    const { tapHaptic } = await import('@/utils/haptics');
    tapHaptic();
    try {
      await updateTaskStatus(task.id, nextStatus);
    } catch (e) {
      console.error('Erreur toggle statut t\u00e2che:', e);
    }
  };

  const canUserToggle = (task: Task): boolean => {
    if (!user) return false;
    // L'utilisateur peut cocher s'il est assign\u00e9 OU s'il a cr\u00e9\u00e9 la t\u00e2che
    return task.assignedTo.includes(user.id) || task.assignedBy === user.id;
  };

  /**
   * Vrai si l'utilisateur peut supprimer la t\u00e2che :
   * - admin (peut tout supprimer)
   * - cr\u00e9ateur de la t\u00e2che (assignedBy)
   */
  const canUserDelete = (task: Task): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return task.assignedBy === user.id;
  };

  const handleLongPressTask = async (task: Task) => {
    if (!canUserDelete(task)) return; // Pas le droit, on ne propose m\u00eame pas le menu
    const { mediumHaptic } = await import('@/utils/haptics');
    mediumHaptic();
    setTaskToDelete(task);
    setConfirmDelete(false);
  };

  const performDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      const { warningHaptic } = await import('@/utils/haptics');
      warningHaptic();
      await deleteTask(taskToDelete.id);
    } catch (e: any) {
      console.error('Delete task error:', e);
      Alert.alert('Erreur', `Impossible de supprimer la t\u00e2che.\n${e?.message ?? ''}`);
    } finally {
      setTaskToDelete(null);
      setConfirmDelete(false);
    }
  };
  
  const handleAddTask = () => {
    setShowTaskForm(true);
  };
  
  const handleTaskFormClose = () => {
    setShowTaskForm(false);
  };
  
  const handleTaskFormSave = async () => {
    setShowTaskForm(false);
    await initializeTasks();
  };
  
  const handleTaskDetailClose = () => {
    setSelectedTask(null);
  };
  
  const canAddTask = user?.role === 'admin' || user?.role === 'moderator';
  
  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Mes tâches ✓"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            canAddTask ? (
              <Button
                icon={<Plus size={24} color={theme.text} />}
                onPress={handleAddTask}
                variant="text"
                style={styles.addButton}
              />
            ) : null
          }
          containerStyle={styles.headerContainer}
        />
        
        <View style={styles.filterContainer}>
          <Button
            title={`Toutes (${userTasks.length})`}
            onPress={() => setFilter('all')}
            variant={filter === 'all' ? 'primary' : 'text'}
            style={styles.filterButton}
          />
          <Button
            title={`À faire (${pendingTasks.length})`}
            onPress={() => setFilter('pending')}
            variant={filter === 'pending' ? 'primary' : 'text'}
            style={styles.filterButton}
          />
          <Button
            title={`Terminées (${completedTasks.length})`}
            onPress={() => setFilter('completed')}
            variant={filter === 'completed' ? 'primary' : 'text'}
            style={styles.filterButton}
          />
        </View>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {overdueTasks.length > 0 && filter !== 'completed' ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.error }]}>
                En retard ({overdueTasks.length})
              </Text>
              {overdueTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onPress={() => handleTaskPress(task)}
                  onToggleDone={() => handleToggleDone(task)}
                  canToggleDone={canUserToggle(task)}
                  onLongPress={canUserDelete(task) ? () => handleLongPressTask(task) : undefined}
                />
              ))}
            </View>
          ) : null}
          
          {tasksToShow.length > 0 ? (
            <View style={styles.section}>
              {filter === 'all' ? (
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Toutes les tâches
                </Text>
              ) : null}
              {tasksToShow.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onPress={() => handleTaskPress(task)}
                  onToggleDone={() => handleToggleDone(task)}
                  canToggleDone={canUserToggle(task)}
                  onLongPress={canUserDelete(task) ? () => handleLongPressTask(task) : undefined}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="check-square"
              title="Aucune tâche"
              message={
                filter === 'all' ? "Vous n'avez pas de tâches assignées." : 
                filter === 'pending' ? "Vous n'avez pas de tâches en attente." : 
                "Vous n'avez pas de tâches terminées."
              }
              style={styles.emptyState}
            />
          )}
          
        </ScrollView>
        
        {selectedTask ? (
          <TaskDetail 
            task={selectedTask} 
            onClose={handleTaskDetailClose} 
            onUpdate={onRefresh}
          />
        ) : null}
        
        {showTaskForm ? (
          <TaskForm
            onClose={handleTaskFormClose}
            onSave={handleTaskFormSave}
          />
        ) : null}

        {/* Dialog custom pour suppression de tâche (remplace Alert.alert moche sur Android) */}
        {/* Étape 1 : menu d'actions */}
        <ConfirmModal
          visible={taskToDelete !== null && !confirmDelete}
          title={taskToDelete?.title ?? ''}
          message="Que voulez-vous faire avec cette tâche ?"
          actions={[
            { label: 'Annuler', style: 'cancel' },
            {
              label: 'Supprimer',
              style: 'destructive',
              onPress: () => setConfirmDelete(true),
            },
          ]}
          onDismiss={() => setTaskToDelete(null)}
        />
        {/* Étape 2 : confirmation finale */}
        <ConfirmModal
          visible={taskToDelete !== null && confirmDelete}
          title="Supprimer la tâche ?"
          message={`« ${taskToDelete?.title ?? ''} » sera supprimée définitivement.\n\nCette action est irréversible.`}
          actions={[
            { label: 'Non', style: 'cancel', onPress: () => setConfirmDelete(false) },
            { label: 'Oui, supprimer', style: 'destructive', onPress: performDeleteTask },
          ]}
          onDismiss={() => {
            setConfirmDelete(false);
            setTaskToDelete(null);
          }}
        />
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { marginTop: -8 },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: -4,
  },
  filterButton: { marginRight: 8 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  emptyState: { marginTop: 40 },
  addButton: { marginLeft: 8 },
});
