import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Filter, Search, CheckSquare, Clock, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useTasksStore } from '@/store/tasks-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { TaskItem } from '@/components/TaskItem';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { tasks, isLoading, error, initializeTasks, getTasksByUser, getOverdueTasks, getUpcomingDeadlines } = useTasksStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      await initializeTasks();
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement des tâches.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await initializeTasks();
    } catch (error) {
      console.error('Error refreshing tasks:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du rafraîchissement des tâches.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTaskPress = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  const handleAddTask = () => {
    router.push('/tasks/create');
  };

  // Get user tasks
  const userTasks = user ? getTasksByUser(user.id) : [];
  const overdueTasks = user ? getOverdueTasks().filter(task => task.assignedTo.includes(user.id)) : [];
  const upcomingTasks = user ? getUpcomingDeadlines(7).filter(task => task.assignedTo.includes(user.id)) : [];

  // Filter tasks based on search and filter
  const filteredTasks = userTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (selectedFilter) {
      case 'pending':
        return task.status === 'pending';
      case 'in_progress':
        return task.status === 'in_progress';
      case 'completed':
        return task.status === 'completed';
      case 'overdue':
        return overdueTasks.some(overdueTask => overdueTask.id === task.id);
      default:
        return true;
    }
  });

  const getFilterCount = (filter: string) => {
    switch (filter) {
      case 'pending':
        return userTasks.filter(task => task.status === 'pending').length;
      case 'in_progress':
        return userTasks.filter(task => task.status === 'in_progress').length;
      case 'completed':
        return userTasks.filter(task => task.status === 'completed').length;
      case 'overdue':
        return overdueTasks.length;
      default:
        return userTasks.length;
    }
  };

  const filters = [
    { key: 'all', label: 'Toutes', icon: CheckSquare },
    { key: 'pending', label: 'En attente', icon: Clock },
    { key: 'in_progress', label: 'En cours', icon: CheckSquare },
    { key: 'completed', label: 'Terminées', icon: CheckSquare },
    { key: 'overdue', label: 'En retard', icon: AlertCircle },
  ];

  const renderContent = () => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appColors.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Chargement des tâches...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: appColors.primary }]}
            onPress={loadTasks}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <EmptyState
          icon="check-square"
          title="Aucune tâche trouvée"
          message={
            searchQuery
              ? "Aucune tâche ne correspond à votre recherche"
              : selectedFilter === 'all'
              ? "Vous n'avez pas encore de tâches"
              : `Vous n'avez pas de tâches ${filters.find(f => f.key === selectedFilter)?.label.toLowerCase()}`
          }
        />
      );
    }

    return (
      <ScrollView
        style={styles.tasksList}
        contentContainerStyle={styles.tasksContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[appColors.primary]}
            tintColor={appColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onPress={() => handleTaskPress(task.id)}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header
          title="Mes tâches ✅"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddTask}
            >
              <Plus size={24} color={theme.text} />
            </TouchableOpacity>
          }
        />

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statNumber, { color: appColors.primary }]}>
              {userTasks.filter(task => task.status === 'pending').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.inactive }]}>
              En attente
            </Text>
          </Card>
          
          <Card style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statNumber, { color: '#f59f00' }]}>
              {userTasks.filter(task => task.status === 'in_progress').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.inactive }]}>
              En cours
            </Text>
          </Card>
          
          <Card style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statNumber, { color: overdueTasks.length > 0 ? '#e03131' : theme.inactive }]}>
              {overdueTasks.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.inactive }]}>
              En retard
            </Text>
          </Card>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Rechercher une tâche..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={theme.inactive} />}
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Filters */}
        <ScrollView 
          horizontal 
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
          showsHorizontalScrollIndicator={false}
        >
          {filters.map((filter) => {
            const count = getFilterCount(filter.key);
            const isSelected = selectedFilter === filter.key;
            
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  { 
                    backgroundColor: isSelected ? appColors.primary : theme.card,
                    borderColor: isSelected ? appColors.primary : theme.border,
                  }
                ]}
                onPress={() => setSelectedFilter(filter.key as any)}
              >
                <filter.icon 
                  size={16} 
                  color={isSelected ? '#ffffff' : theme.text} 
                  style={styles.filterIcon}
                />
                <Text style={[
                  styles.filterText,
                  { color: isSelected ? '#ffffff' : theme.text }
                ]}>
                  {filter.label}
                </Text>
                {count > 0 && (
                  <Badge
                    text={count.toString()}
                    variant={isSelected ? 'light' : 'primary'}
                    size="small"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {renderContent()}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  filtersContainer: {
    paddingVertical: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterIcon: {
    marginRight: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  tasksList: {
    flex: 1,
  },
  tasksContent: {
    padding: 16,
  },
});