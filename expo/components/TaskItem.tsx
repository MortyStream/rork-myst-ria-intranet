import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Task } from '@/types/task';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { useUsersStore } from '@/store/users-store';
import { useResourcesStore } from '@/store/resources-store';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  Flag,
  Circle,
} from 'lucide-react-native';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  /** Callback quand l'user clique sur la checkbox ronde. Toggle done/pending. */
  onToggleDone?: () => void;
  /** Si true, affiche la checkbox tappable. Sinon, rien (observateur). */
  canToggleDone?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onPress, onToggleDone, canToggleDone }) => {
  const { darkMode } = useSettingsStore();
  const { getUserById } = useUsersStore();
  const { getCategoryById } = useResourcesStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const category = task.categoryId ? getCategoryById(task.categoryId) : null;
  const creator = task.assignedBy ? getUserById(task.assignedBy) : null;
  
  const getStatusIcon = () => {
    switch (task.status) {
      case 'pending':
        return <Clock size={20} color={theme.warning} />;
      case 'in_progress':
        return <AlertCircle size={20} color={theme.info} />;
      case 'completed':
        return <CheckCircle size={20} color={theme.success} />;
      case 'validated':
        return <CheckCircle size={20} color={theme.success} />;
      default:
        return <Clock size={20} color={theme.warning} />;
    }
  };
  
  const getStatusText = () => {
    switch (task.status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return task.needsValidation ? 'À valider' : 'Terminée';
      case 'validated':
        return 'Validée';
      default:
        return 'En attente';
    }
  };
  
  const getStatusColor = () => {
    switch (task.status) {
      case 'pending':
        return theme.warning;
      case 'in_progress':
        return theme.info;
      case 'completed':
        return theme.success;
      case 'validated':
        return theme.success;
      default:
        return theme.warning;
    }
  };
  
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return theme.error;
      case 'medium':
        return theme.warning;
      case 'low':
        return theme.info;
      default:
        return theme.info;
    }
  };
  
  const getPriorityText = () => {
    switch (task.priority) {
      case 'high':
        return 'Haute';
      case 'medium':
        return 'Moyenne';
      case 'low':
        return 'Basse';
      default:
        return 'Moyenne';
    }
  };
  
  const isOverdue = () => {
    if (!task.deadline) return false;
    if (task.status === 'completed' || task.status === 'validated') return false;
    
    const deadlineDate = new Date(task.deadline);
    const now = new Date();
    
    return deadlineDate < now;
  };
  
  const formatDeadline = () => {
    if (!task.deadline) return 'Pas de date limite';

    const deadlineDate = new Date(task.deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `En retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Aujourd\'hui';
    } else if (diffDays === 1) {
      return 'Demain';
    } else {
      return `Dans ${diffDays} jours`;
    }
  };

  /**
   * Format "il y a X" pour la complétion : "à l'instant", "il y a 5 min",
   * "il y a 2h", "hier", "il y a 3 jours", ou date complète au-delà.
   */
  const formatCompletedAgo = (completedAt: string): string => {
    const completed = new Date(completedAt);
    const now = new Date();
    const diffMs = now.getTime() - completed.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'à l\'instant';
    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays === 1) return 'hier';
    if (diffDays < 7) return `il y a ${diffDays} jours`;
    return `le ${completed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  };

  // Récupérer l'utilisateur qui a complété la tâche (pour affichage)
  const completer = task.completedBy ? getUserById(task.completedBy) : null;
  const isDone = task.status === 'completed' || task.status === 'validated';
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: theme.card,
          borderLeftColor: getPriorityColor(),
          borderLeftWidth: 4,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        {canToggleDone && onToggleDone && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onToggleDone();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
            style={styles.checkboxTouchable}
            accessibilityLabel={
              task.status === 'completed' || task.status === 'validated'
                ? 'Marquer comme non terminée'
                : 'Marquer comme terminée'
            }
          >
            {task.status === 'completed' || task.status === 'validated' ? (
              <CheckCircle size={24} color={theme.success} fill={`${theme.success}25`} />
            ) : (
              <Circle size={24} color={darkMode ? theme.inactive : '#999'} strokeWidth={2} />
            )}
          </TouchableOpacity>
        )}
        <Text
          style={[
            styles.title,
            { color: theme.text },
            (task.status === 'completed' || task.status === 'validated') && styles.titleDone,
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: `${getStatusColor()}20` }
        ]}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
      
      <Text 
        style={[styles.description, { color: darkMode ? theme.inactive : '#666666' }]}
        numberOfLines={2}
      >
        {task.description}
      </Text>
      
      <View style={styles.footer}>
        <View style={styles.metaItem}>
          <Flag size={14} color={getPriorityColor()} style={styles.metaIcon} />
          <Text style={[styles.metaText, { color: darkMode ? theme.inactive : '#666666' }]}>
            {getPriorityText()}
          </Text>
        </View>
        
        {task.deadline && (
          <View style={styles.metaItem}>
            <Calendar size={14} color={isOverdue() ? theme.error : (darkMode ? theme.inactive : '#666666')} style={styles.metaIcon} />
            <Text 
              style={[
                styles.metaText, 
                { 
                  color: isOverdue() 
                    ? theme.error 
                    : (darkMode ? theme.inactive : '#666666') 
                }
              ]}
            >
              {formatDeadline()}
            </Text>
          </View>
        )}
        
        {category && (
          <View style={styles.metaItem}>
            <Text style={[styles.categoryText, { color: darkMode ? theme.inactive : '#666666' }]}>
              {category.icon && <Text>{category.icon}</Text>} {category.name}
            </Text>
          </View>
        )}
      </View>

      {/* Footer "Terminée par X · il y a Y" — visible uniquement si complétée */}
      {isDone && task.completedAt && (
        <View style={[styles.completionFooter, { borderTopColor: theme.border }]}>
          <CheckCircle size={12} color={theme.success} />
          <Text style={[styles.completionText, { color: darkMode ? theme.inactive : '#888' }]}>
            Terminée
            {completer ? ` par ${completer.firstName} ${completer.lastName.charAt(0)}.` : ''}
            {' · '}
            {formatCompletedAgo(task.completedAt)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  checkboxTouchable: {
    marginRight: 10,
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
  },
  categoryText: {
    fontSize: 12,
  },
  completionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  completionText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
});