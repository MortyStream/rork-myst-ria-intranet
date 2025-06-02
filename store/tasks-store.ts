import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskComment, TaskStatus, TaskPriority } from '@/types/task';
import { useAuthStore } from './auth-store';
import { useNotificationsStore } from './notifications-store';
import { useResourcesStore } from './resources-store';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
}

interface TasksStore extends TasksState {
  // Task operations
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'comments'>) => string;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Task status operations
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  validateTask: (id: string, validatorId: string) => void;
  
  // Comment operations
  addComment: (taskId: string, userId: string, content: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;
  
  // Getters
  getTaskById: (id: string) => Task | undefined;
  getUserTasks: (userId: string) => Task[];
  getCategoryTasks: (categoryId: string) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByPriority: (priority: TaskPriority) => Task[];
  getOverdueTasks: () => Task[];
  getUpcomingDeadlines: (days: number) => Task[]; // Tasks due in the next X days
  
  // Reminders
  sendTaskReminder: (taskId: string) => void;
  sendDeadlineReminders: () => void; // Send reminders for tasks due soon
}

export const useTasksStore = create<TasksStore>()(
  persist(
    (set, get) => ({
      tasks: [
        // Sample tasks for testing
        {
          id: 'task-1',
          title: 'Préparer le matériel pour la réunion',
          description: 'Préparer le projecteur, les documents et la salle pour la réunion du comité',
          categoryId: 'category-1',
          assignedTo: ['admin-id'],
          assignedBy: 'moderator-id',
          deadline: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          priority: 'high',
          status: 'pending',
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-2',
          title: 'Finaliser le budget',
          description: 'Finaliser le budget pour le prochain trimestre et l\'envoyer au trésorier',
          categoryId: 'category-2',
          assignedTo: ['admin-id', 'moderator-id'],
          assignedBy: 'admin-id',
          deadline: new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
          priority: 'medium',
          status: 'in_progress',
          comments: [
            {
              id: 'comment-1',
              taskId: 'task-2',
              userId: 'admin-id',
              content: 'J\'ai commencé à travailler sur le budget, je devrais avoir fini d\'ici demain.',
              createdAt: new Date().toISOString(),
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-3',
          title: 'Contacter les fournisseurs',
          description: 'Contacter les fournisseurs pour obtenir des devis pour le matériel technique',
          categoryId: 'category-3',
          assignedTo: ['moderator-id'],
          assignedBy: 'admin-id',
          deadline: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (overdue)
          priority: 'low',
          status: 'completed',
          needsValidation: true,
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ],
      isLoading: false,
      error: null,
      
      addTask: (taskData) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          set({ error: 'User not authenticated' });
          return '';
        }
        
        const newTask: Task = {
          ...taskData,
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'pending',
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set(state => ({
          tasks: [...state.tasks, newTask]
        }));
        
        // Send notifications to assigned users
        const { addNotification } = useNotificationsStore.getState();
        const { getCategoryById } = useResourcesStore.getState();
        const category = getCategoryById(taskData.categoryId);
        
        taskData.assignedTo.forEach(userId => {
          addNotification({
            title: 'Nouvelle tâche assignée',
            message: `Vous avez été assigné à la tâche "${taskData.title}" dans la catégorie "${category?.name || 'Inconnue'}"`,
            targetUserIds: [userId],
            targetRoles: [],
          });
        });
        
        return newTask.id;
      },
      
      updateTask: (id, data) => {
        const task = get().getTaskById(id);
        if (!task) return;
        
        // Check if assignedTo has changed
        const newAssignees = data.assignedTo?.filter(userId => !task.assignedTo.includes(userId)) || [];
        
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === id 
              ? { 
                  ...task, 
                  ...data, 
                  updatedAt: new Date().toISOString() 
                } 
              : task
          )
        }));
        
        // If there are new assignees, send notifications
        if (newAssignees.length > 0) {
          const { addNotification } = useNotificationsStore.getState();
          const { getCategoryById } = useResourcesStore.getState();
          const category = getCategoryById(task.categoryId);
          
          newAssignees.forEach(userId => {
            addNotification({
              title: 'Nouvelle tâche assignée',
              message: `Vous avez été assigné à la tâche "${task.title}" dans la catégorie "${category?.name || 'Inconnue'}"`,
              targetUserIds: [userId],
              targetRoles: [],
            });
          });
        }
      },
      
      deleteTask: (id) => {
        set(state => ({
          tasks: state.tasks.filter(task => task.id !== id)
        }));
      },
      
      updateTaskStatus: (id, status) => {
        const task = get().getTaskById(id);
        if (!task) return;
        
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === id 
              ? { 
                  ...task, 
                  status,
                  updatedAt: new Date().toISOString() 
                } 
              : task
          )
        }));
        
        // If task is completed, send notification to the creator
        if (status === 'completed' && task.assignedBy) {
          const { addNotification } = useNotificationsStore.getState();
          const currentUser = useAuthStore.getState().user;
          
          if (currentUser && task.assignedBy !== currentUser.id) {
            addNotification({
              title: 'Tâche terminée',
              message: `La tâche "${task.title}" a été marquée comme terminée par ${currentUser.firstName} ${currentUser.lastName}`,
              targetUserIds: [task.assignedBy],
              targetRoles: [],
            });
          }
        }
      },
      
      validateTask: (id, validatorId) => {
        const task = get().getTaskById(id);
        if (!task || !task.needsValidation) return;
        
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === id 
              ? { 
                  ...task, 
                  status: 'validated',
                  validatedBy: validatorId,
                  updatedAt: new Date().toISOString() 
                } 
              : task
          )
        }));
        
        // Send notification to the assignees
        const { addNotification } = useNotificationsStore.getState();
        const { getUserById } = useAuthStore.getState();
        const validator = getUserById(validatorId);
        
        if (validator) {
          task.assignedTo.forEach(userId => {
            if (userId !== validatorId) {
              addNotification({
                title: 'Tâche validée',
                message: `La tâche "${task.title}" a été validée par ${validator.firstName} ${validator.lastName}`,
                targetUserIds: [userId],
                targetRoles: [],
              });
            }
          });
        }
      },
      
      addComment: (taskId, userId, content) => {
        const task = get().getTaskById(taskId);
        if (!task) return;
        
        const newComment: TaskComment = {
          id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          taskId,
          userId,
          content,
          createdAt: new Date().toISOString(),
        };
        
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { 
                  ...task, 
                  comments: [...(task.comments || []), newComment],
                  updatedAt: new Date().toISOString() 
                } 
              : task
          )
        }));
        
        // Send notification to other assignees and the creator
        const { addNotification } = useNotificationsStore.getState();
        const { getUserById } = useAuthStore.getState();
        const commenter = getUserById(userId);
        
        if (commenter) {
          // Collect all users involved with the task
          const notifyUsers = [...new Set([...task.assignedTo, task.assignedBy])].filter(id => id !== userId);
          
          notifyUsers.forEach(notifyUserId => {
            addNotification({
              title: 'Nouveau commentaire',
              message: `${commenter.firstName} ${commenter.lastName} a commenté sur la tâche "${task.title}"`,
              targetUserIds: [notifyUserId],
              targetRoles: [],
            });
          });
        }
      },
      
      deleteComment: (taskId, commentId) => {
        const task = get().getTaskById(taskId);
        if (!task || !task.comments) return;
        
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { 
                  ...task, 
                  comments: task.comments?.filter(comment => comment.id !== commentId) || [],
                  updatedAt: new Date().toISOString() 
                } 
              : task
          )
        }));
      },
      
      getTaskById: (id) => {
        return get().tasks.find(task => task.id === id);
      },
      
      getUserTasks: (userId) => {
        return get().tasks.filter(task => 
          task.assignedTo.includes(userId) || task.assignedBy === userId
        );
      },
      
      getCategoryTasks: (categoryId) => {
        return get().tasks.filter(task => task.categoryId === categoryId);
      },
      
      getTasksByStatus: (status) => {
        return get().tasks.filter(task => task.status === status);
      },
      
      getTasksByPriority: (priority) => {
        return get().tasks.filter(task => task.priority === priority);
      },
      
      getOverdueTasks: () => {
        const now = new Date();
        return get().tasks.filter(task => 
          task.deadline && 
          new Date(task.deadline) < now && 
          task.status !== 'completed' && 
          task.status !== 'validated'
        );
      },
      
      getUpcomingDeadlines: (days) => {
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        
        return get().tasks.filter(task => 
          task.deadline && 
          new Date(task.deadline) > now && 
          new Date(task.deadline) < future && 
          task.status !== 'completed' && 
          task.status !== 'validated'
        );
      },
      
      sendTaskReminder: (taskId) => {
        const task = get().getTaskById(taskId);
        if (!task) return;
        
        const { addNotification } = useNotificationsStore.getState();
        const { getUserById } = useAuthStore.getState();
        const { getCategoryById } = useResourcesStore.getState();
        const category = getCategoryById(task.categoryId);
        const creator = getUserById(task.assignedBy);
        
        task.assignedTo.forEach(userId => {
          addNotification({
            title: 'Rappel de tâche',
            message: `Rappel: La tâche "${task.title}" dans la catégorie "${category?.name || 'Inconnue'}" ${
              task.deadline ? `est à échéance le ${new Date(task.deadline).toLocaleDateString('fr-FR')}` : 'nécessite votre attention'
            }`,
            targetUserIds: [userId],
            targetRoles: [],
          });
        });
      },
      
      sendDeadlineReminders: () => {
        // Get tasks due in the next 24 hours
        const upcomingTasks = get().getUpcomingDeadlines(1);
        
        upcomingTasks.forEach(task => {
          get().sendTaskReminder(task.id);
        });
        
        // Also remind about overdue tasks
        const overdueTasks = get().getOverdueTasks();
        
        overdueTasks.forEach(task => {
          const { addNotification } = useNotificationsStore.getState();
          
          task.assignedTo.forEach(userId => {
            addNotification({
              title: 'Tâche en retard',
              message: `La tâche "${task.title}" est en retard. La date d'échéance était le ${new Date(task.deadline!).toLocaleDateString('fr-FR')}.`,
              targetUserIds: [userId],
              targetRoles: [],
            });
          });
          
          // Also notify the creator
          if (task.assignedBy) {
            addNotification({
              title: 'Tâche en retard',
              message: `La tâche "${task.title}" que vous avez assignée est en retard.`,
              targetUserIds: [task.assignedBy],
              targetRoles: [],
            });
          }
        });
      }
    }),
    {
      name: 'mysteria-tasks-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);