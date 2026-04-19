import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore } from '@/store/tasks-store';
import { useUsersStore } from '@/store/users-store';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { TaskItem } from '@/components/TaskItem';
import { TaskDetail } from '@/components/TaskDetail';
import { TaskForm } from '@/components/TaskForm';
import { Task } from '@/types/task';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const {
    getUserTasks,
    getOverdueTasks,
    getUpcomingDeadlines,
    initializeTasks,
  } = useTasksStore();
  
  const theme = darkMode ? Colors.dark : Colors.light;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | undefined>(undefined);

  useEffect(() => {
    initializeTasks();
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
  
  const canAddTask = user?.role === 'admin' || user?.role === 'responsable_pole' || user?.role === 'responsable_secteur';
  const isAdmin = user?.role === 'admin' || user?.role === 'responsable_pole';
  
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
          
          {isAdmin ? (
            <Card style={styles.adminCard}>
              <Text style={[styles.adminCardTitle, { color: theme.text }]}>
                Gestion des tâches
              </Text>
              <Text style={[styles.adminCardText, { color: darkMode ? theme.inactive : '#666666' }]}>
                En tant qu'administrateur, vous pouvez gérer toutes les tâches de l'équipe.
              </Text>
              <Button
                title="Voir toutes les tâches"
                onPress={() => router.push('/admin')}
                style={styles.adminButton}
              />
            </Card>
          ) : null}
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
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: { marginTop: 40 },
  adminCard: {
    marginTop: 24,
    marginBottom: 24,
  },
  adminCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  adminCardText: {
    fontSize: 14,
    marginBottom: 16,
  },
  adminButton: { alignSelf: 'flex-start' },
  addButton: { marginLeft: 8 },
});
