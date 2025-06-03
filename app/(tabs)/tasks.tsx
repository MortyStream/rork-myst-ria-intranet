import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Filter, Search } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useTasksStore } from '@/store/tasks-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { TaskItem } from '@/components/TaskItem';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Task } from '@/types/task';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getUserTasks, updateTask, deleteTask, initializeTasks } = useTasksStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  useEffect(() => {
    if (user) {
      initializeTasks();
    }
  }, [user]);
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    initializeTasks();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  const handleAddTask = () => {
    router.push('/admin/task-form');
  };
  
  const handleTaskPress = (task: Task) => {
    router.push(`/tasks/${task.id}`);
  };
  
  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour de la tâche.');
    }
  };
  
  const handleTaskDelete = async (taskId: string) => {
    try {
      Alert.alert(
        'Confirmer la suppression',
        'Êtes-vous sûr de vouloir supprimer cette tâche ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Supprimer', 
            style: 'destructive',
            onPress: () => deleteTask(taskId)
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression de la tâche.');
    }
  };
  
  // Get user tasks
  const userTasks = user ? getUserTasks(user.id) : [];
  
  // Filter tasks based on search query and status
  const filteredTasks = userTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  
  // Sort tasks by priority and due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // First sort by status (pending and in_progress first)
    const statusOrder = { 'pending': 0, 'in_progress': 1, 'completed': 2, 'cancelled': 3 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Then by priority
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Finally by due date
    const aDate = new Date(a.dueDate || a.deadline || '');
    const bDate = new Date(b.dueDate || b.deadline || '');
    return aDate.getTime() - bDate.getTime();
  });
  
  const renderTaskItem = ({ item }: { item: Task }) => (
    <TaskItem
      task={item}
      onPress={() => handleTaskPress(item)}
      onUpdate={(updates) => handleTaskUpdate(item.id, updates)}
      onDelete={() => handleTaskDelete(item.id)}
      showActions={isAdminOrModerator}
    />
  );
  
  const filterButtons = [
    { key: 'all', label: 'Toutes' },
    { key: 'pending', label: 'En attente' },
    { key: 'in_progress', label: 'En cours' },
    { key: 'completed', label: 'Terminées' },
  ];
  
  return (
    <AppLayout 
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Mes tâches ✅"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            isAdminOrModerator && (
              <Button
                icon={<Plus size={24} color={theme.text} />}
                onPress={handleAddTask}
                variant="text"
                style={styles.addButton}
              />
            )
          }
          containerStyle={styles.headerContainer}
        />
        
        <View style={styles.searchContainer}>
          <Input
            placeholder="Rechercher une tâche..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={darkMode ? '#ffffff' : '#333333'} />}
            containerStyle={styles.searchInput}
          />
        </View>
        
        <View style={styles.filterContainer}>
          {filterButtons.map((button) => (
            <TouchableOpacity
              key={button.key}
              style={[
                styles.filterButton,
                { backgroundColor: theme.card },
                filterStatus === button.key && { backgroundColor: theme.primary }
              ]}
              onPress={() => setFilterStatus(button.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: theme.text },
                  filterStatus === button.key && { color: '#ffffff' }
                ]}
              >
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {sortedTasks.length > 0 ? (
          <FlatList
            data={sortedTasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState
            icon="check-square"
            title="Aucune tâche trouvée"
            message={
              searchQuery || filterStatus !== 'all'
                ? "Aucune tâche ne correspond à vos critères de recherche"
                : "Vous n'avez pas encore de tâches assignées"
            }
            style={styles.emptyState}
          />
        )}
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyState: {
    marginTop: 40,
  },
});