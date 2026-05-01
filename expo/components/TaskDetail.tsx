import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Task, TaskComment } from '@/types/task';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { useUsersStore } from '@/store/users-store';
import { useResourcesStore } from '@/store/resources-store';
import { useAuthStore } from '@/store/auth-store';
import { useTasksStore } from '@/store/tasks-store';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Flag,
  User,
  MessageSquare,
  Send,
  X,
  Bell,
  CheckSquare,
  PlayCircle
} from 'lucide-react-native';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { formatDate } from '@/utils/date-utils';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onUpdate?: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ 
  task, 
  onClose,
  onUpdate
}) => {
  const { darkMode } = useSettingsStore();
  const { getUserById } = useUsersStore();
  const { getCategoryById } = useResourcesStore();
  const { user } = useAuthStore();
  const { 
    updateTaskStatus, 
    validateTask, 
    addComment, 
    sendTaskReminder 
  } = useTasksStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const category = getCategoryById(task.categoryId);
  const creator = getUserById(task.assignedBy);
  const assignees = task.assignedTo.map(id => getUserById(id)).filter(Boolean);
  const validator = task.validatedBy ? getUserById(task.validatedBy) : null;
  
  const isAssignedToCurrentUser = user ? task.assignedTo.includes(user.id) : false;
  const isCreatedByCurrentUser = user ? task.assignedBy === user.id : false;
  const canUpdateStatus = isAssignedToCurrentUser || isCreatedByCurrentUser;
  const canValidate = isCreatedByCurrentUser && task.status === 'completed' && task.needsValidation;
  const canSendReminder = isCreatedByCurrentUser && (task.status === 'pending' || task.status === 'in_progress');
  
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
  
  const isOverdue = () => {
    if (!task.deadline) return false;
    if (task.status === 'completed' || task.status === 'validated') return false;
    
    const deadlineDate = new Date(task.deadline);
    const now = new Date();
    
    return deadlineDate < now;
  };
  
  const handleStartTask = () => {
    if (!canUpdateStatus) return;
    
    updateTaskStatus(task.id, 'in_progress');
    if (onUpdate) onUpdate();
    
    Alert.alert('Tâche mise à jour', 'La tâche a été marquée comme "En cours".');
  };
  
  const handleCompleteTask = () => {
    if (!canUpdateStatus) return;
    
    updateTaskStatus(task.id, 'completed');
    if (onUpdate) onUpdate();
    
    Alert.alert('Tâche terminée', 'La tâche a été marquée comme terminée.');
  };
  
  const handleValidateTask = () => {
    if (!canValidate || !user) return;
    
    validateTask(task.id, user.id);
    if (onUpdate) onUpdate();
    
    Alert.alert('Tâche validée', 'La tâche a été validée avec succès.');
  };
  
  const handleSendReminder = () => {
    if (!canSendReminder) return;
    
    sendTaskReminder(task.id);
    
    Alert.alert('Rappel envoyé', 'Un rappel a été envoyé aux personnes assignées à cette tâche.');
  };
  
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);

    try {
      const { tapHaptic } = await import('@/utils/haptics');
      tapHaptic();
      addComment(task.id, user.id, newComment.trim());
      setNewComment('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ajout du commentaire.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[
          styles.modalContent,
          {
            backgroundColor: theme.background,
            borderTopColor: getPriorityColor(),
            borderTopWidth: 4,
          }
        ]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {task.title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={styles.section}>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: `${getStatusColor()}20` }
              ]}>
                {task.status === 'pending' && <Clock size={16} color={getStatusColor()} />}
                {task.status === 'in_progress' && <AlertCircle size={16} color={getStatusColor()} />}
                {(task.status === 'completed' || task.status === 'validated') && <CheckCircle size={16} color={getStatusColor()} />}
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
              
              <Text style={[styles.description, { color: theme.text }]}>
                {task.description}
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Détails
              </Text>
              
              <View style={styles.detailItem}>
                <Flag size={16} color={getPriorityColor()} style={styles.detailIcon} />
                <Text style={[styles.detailLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Priorité:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {getPriorityText()}
                </Text>
              </View>
              
              {task.deadline && (
                <View style={styles.detailItem}>
                  <Calendar size={16} color={isOverdue() ? theme.error : theme.primary} style={styles.detailIcon} />
                  <Text style={[styles.detailLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Échéance:
                  </Text>
                  <Text 
                    style={[
                      styles.detailValue, 
                      { 
                        color: isOverdue() ? theme.error : theme.text 
                      }
                    ]}
                  >
                    {new Date(task.deadline).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                    {isOverdue() && ' (En retard)'}
                  </Text>
                </View>
              )}
              
              {category && (
                <View style={styles.detailItem}>
                  <Text style={styles.categoryEmoji}>{category.icon}</Text>
                  <Text style={[styles.detailLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Catégorie:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {category.name}
                  </Text>
                </View>
              )}
              
              {creator && (
                <View style={styles.detailItem}>
                  <User size={16} color={theme.primary} style={styles.detailIcon} />
                  <Text style={[styles.detailLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Créée par:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {creator.firstName} {creator.lastName}
                  </Text>
                </View>
              )}
              
              {validator && (
                <View style={styles.detailItem}>
                  <CheckCircle size={16} color={theme.success} style={styles.detailIcon} />
                  <Text style={[styles.detailLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Validée par:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {validator.firstName} {validator.lastName}
                  </Text>
                </View>
              )}
              
              <Text style={[styles.detailLabel, { color: darkMode ? theme.inactive : '#666666', marginTop: 8 }]}>
                Assignée à:
              </Text>
              <View style={styles.assigneesList}>
                {assignees.map(assignee => (
                  <View key={assignee.id} style={styles.assigneeItem}>
                    <Avatar
                      source={assignee.profileImage ? { uri: assignee.profileImage } : undefined}
                      name={`${assignee.firstName} ${assignee.lastName}`}
                      size={32}
                    />
                    <Text style={[styles.assigneeName, { color: theme.text }]}>
                      {assignee.firstName} {assignee.lastName}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            
            {canUpdateStatus && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Actions
                </Text>
                
                <View style={styles.actionsContainer}>
                  {task.status === 'pending' && (
                    <Button
                      title="Commencer"
                      onPress={handleStartTask}
                      style={styles.actionButton}
                      leftIcon={<PlayCircle size={18} color="#ffffff" />}
                    />
                  )}
                  
                  {(task.status === 'pending' || task.status === 'in_progress') && (
                    <Button
                      title="Terminer"
                      onPress={handleCompleteTask}
                      style={styles.actionButton}
                      leftIcon={<CheckSquare size={18} color="#ffffff" />}
                    />
                  )}
                  
                  {canValidate && (
                    <Button
                      title="Valider"
                      onPress={handleValidateTask}
                      style={styles.actionButton}
                      leftIcon={<CheckCircle size={18} color="#ffffff" />}
                    />
                  )}
                  
                  {canSendReminder && (
                    <Button
                      title="Envoyer un rappel"
                      onPress={handleSendReminder}
                      variant="outline"
                      style={styles.actionButton}
                      leftIcon={<Bell size={18} color={theme.primary} />}
                    />
                  )}
                </View>
              </View>
            )}
            
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                <MessageSquare size={18} color={theme.primary} style={styles.sectionIcon} /> Commentaires
              </Text>
              
              {task.comments && task.comments.length > 0 ? (
                <View style={styles.commentsList}>
                  {task.comments.map(comment => {
                    const commenter = getUserById(comment.userId);
                    return (
                      <View key={comment.id} style={[
                        styles.commentItem, 
                        { backgroundColor: theme.card }
                      ]}>
                        <View style={styles.commentHeader}>
                          <View style={styles.commenterInfo}>
                            <Avatar
                              source={commenter?.profileImage ? { uri: commenter.profileImage } : undefined}
                              name={commenter ? `${commenter.firstName} ${commenter.lastName}` : 'Inconnu'}
                              size={24}
                            />
                            <Text style={[styles.commenterName, { color: theme.text }]}>
                              {commenter ? `${commenter.firstName} ${commenter.lastName}` : 'Utilisateur inconnu'}
                            </Text>
                          </View>
                          <Text style={[styles.commentDate, { color: darkMode ? theme.inactive : '#666666' }]}>
                            {formatDate(new Date(comment.createdAt))}
                          </Text>
                        </View>
                        <Text style={[styles.commentContent, { color: theme.text }]}>
                          {comment.content}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.noCommentsText, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Aucun commentaire pour le moment.
                </Text>
              )}
              
              {user && (
                <View style={styles.addCommentContainer}>
                  <TextInput
                    style={[
                      styles.commentInput,
                      {
                        color: theme.text,
                        backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                        borderColor: theme.border,
                      }
                    ]}
                    placeholder="Ajouter un commentaire..."
                    placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
                    value={newComment}
                    onChangeText={setNewComment}
                    onFocus={() => {
                      // Scroll vers le bas après un délai pour laisser le clavier s'ouvrir
                      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
                    }}
                    multiline
                  />
                  <TouchableOpacity 
                    style={[
                      styles.sendButton,
                      { backgroundColor: theme.primary },
                      (!newComment.trim() || isSubmitting) && { opacity: 0.6 }
                    ]}
                    onPress={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                  >
                    <Send size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 8,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    marginRight: 8,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  assigneesList: {
    marginTop: 8,
  },
  assigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assigneeName: {
    fontSize: 14,
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  actionButton: {
    margin: 4,
    flex: 1,
    minWidth: '45%',
  },
  commentsList: {
    marginBottom: 16,
  },
  commentItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commenterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commenterName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  commentDate: {
    fontSize: 12,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  noCommentsText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});