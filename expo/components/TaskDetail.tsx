import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
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
  PlayCircle,
  Trash2
} from 'lucide-react-native';
import { ConfirmModal } from './ConfirmModal';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { formatDate } from '@/utils/date-utils';
import { subscribeToTaskTyping } from '@/utils/supabase';
import { tapHaptic, mediumHaptic, warningHaptic } from '@/utils/haptics';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onUpdate?: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task: taskProp,
  onClose,
  onUpdate
}) => {
  const router = useRouter();
  const { darkMode } = useSettingsStore();
  const { getUserById } = useUsersStore();
  const { getCategoryById } = useResourcesStore();
  const { user } = useAuthStore();
  const {
    updateTaskStatus,
    validateTask,
    addComment,
    sendTaskReminder,
    toggleCommentReaction,
  } = useTasksStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  // Bind sur la row du store : quand le store est mis à jour (via addComment local OU
  // via un event Realtime global reçu d'un autre user — cf. startTasksRealtimeSync
  // dans _layout.tsx), TaskDetail re-render automatiquement avec les données fraîches.
  // Fallback sur le prop initial si la row n'est pas (encore) dans le store.
  const taskFromStore = useTasksStore((state) => state.tasks.find((t) => t.id === taskProp.id));
  const task = taskFromStore ?? taskProp;

  // Détection de suppression à distance : si la row était dans le store et
  // disparaît (un admin ou le créateur l'a supprimée depuis un autre device),
  // on prévient l'user avec un Toast et on ferme le modal automatiquement.
  const wasInStoreRef = useRef(false);
  useEffect(() => {
    if (taskFromStore) {
      wasInStoreRef.current = true;
      return;
    }
    // taskFromStore est undefined : soit la row n'a jamais été chargée (initial),
    // soit elle vient d'être supprimée. On distingue via le ref.
    if (wasInStoreRef.current && taskProp?.id) {
      (async () => {
        try {
          const Toast = (await import('react-native-toast-message')).default;
          Toast.show({
            type: 'info',
            text1: 'Tâche supprimée',
            text2: 'Cette tâche a été supprimée par un autre utilisateur.',
            visibilityTime: 4000,
          });
        } catch {}
        onClose();
      })();
    }
  }, [taskFromStore, taskProp?.id, onClose]);

  // ── Typing indicator (Realtime broadcast) ──
  // typingUsers : autres users actuellement en train d'écrire dans le commentaire.
  // Auto-clear après 5s sans nouveau broadcast (cas où l'autre user ferme l'app).
  const [typingUsers, setTypingUsers] = useState<{ userId: string; firstName: string }[]>([]);
  const sendTypingRef = useRef<((payload: any) => void) | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!taskProp?.id || !user?.id) return;

    const { sendTyping, unsubscribe } = subscribeToTaskTyping(taskProp.id, {
      onTyping: (payload) => {
        // Ignore self (au cas où config.broadcast.self serait pas respecté)
        if (!payload?.userId || payload.userId === user.id) return;

        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === payload.userId)) return prev;
          return [...prev, { userId: payload.userId, firstName: payload.firstName }];
        });

        // Reset le timer auto-clear pour cet user (5s après dernier event)
        const existing = typingTimersRef.current[payload.userId];
        if (existing) clearTimeout(existing);
        typingTimersRef.current[payload.userId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
          delete typingTimersRef.current[payload.userId];
        }, 5000);
      },
    });

    sendTypingRef.current = sendTyping;

    return () => {
      unsubscribe();
      sendTypingRef.current = null;
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
      setTypingUsers([]);
    };
  }, [taskProp?.id, user?.id]);

  /**
   * Wrapper autour de setNewComment qui broadcaste un event "typing" debouncé
   * (max 1 fois toutes les 2.5s) → les autres users sur la même tâche voient
   * "X est en train d'écrire...". Pas de spam WS même si l'user tape vite.
   */
  const handleCommentChange = (text: string) => {
    setNewComment(text);
    if (!user || !sendTypingRef.current || text.trim().length === 0) return;
    const now = Date.now();
    if (now - lastSentAtRef.current > 2500) {
      sendTypingRef.current({ userId: user.id, firstName: user.firstName });
      lastSentAtRef.current = now;
    }
  };
  
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ID du commentaire pour lequel le picker emoji est ouvert (null = fermé)
  const [reactionPickerCommentId, setReactionPickerCommentId] = useState<string | null>(null);
  // ID du commentaire sur lequel un delete est en cours de confirmation (null = fermé)
  const [commentToDelete, setCommentToDelete] = useState<TaskComment | null>(null);
  // 4 emojis de base autorisés pour les réactions
  const REACTION_EMOJIS = ['👍', '❤️', '🙏', '😂'];

  // Permission delete commentaire : owner du commentaire OU admin.
  // Le store Supabase vérifie aussi via RLS sur tasks.UPDATE, donc même si on
  // affiche l'icône à tort, le serveur refuserait. Mais on évite la latence
  // en ne montrant l'icône qu'aux users légitimement habilités.
  const canDeleteComment = (comment: TaskComment): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return comment.userId === user.id;
  };

  const performDeleteComment = async () => {
    const target = commentToDelete;
    if (!target) return;
    setCommentToDelete(null);
    try {
      warningHaptic();
      await useTasksStore.getState().deleteComment(task.id, target.id);
    } catch (e: any) {
      console.error('deleteComment error:', e);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Le commentaire n\'a pas pu être supprimé.',
      });
    }
  };
  
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

    Toast.show({ type: 'success', text1: 'Tâche démarrée', text2: 'Marquée comme "En cours".' });
  };

  const handleCompleteTask = () => {
    if (!canUpdateStatus) return;

    updateTaskStatus(task.id, 'completed');
    if (onUpdate) onUpdate();

    Toast.show({ type: 'success', text1: 'Tâche terminée' });
  };

  const handleValidateTask = () => {
    if (!canValidate || !user) return;

    validateTask(task.id, user.id);
    if (onUpdate) onUpdate();

    Toast.show({ type: 'success', text1: 'Tâche validée' });
  };

  const handleSendReminder = () => {
    if (!canSendReminder) return;

    sendTaskReminder(task.id);

    Toast.show({ type: 'success', text1: 'Rappel envoyé', text2: 'Aux personnes assignées.' });
  };
  
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);

    try {
      tapHaptic();
      addComment(task.id, user.id, newComment.trim());
      setNewComment('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: "L'ajout du commentaire a échoué." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <>
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
                  <TouchableOpacity
                    key={assignee.id}
                    style={styles.assigneeItem}
                    onPress={() => {
                      onClose();
                      router.push(`/user/${assignee.id}`);
                    }}
                    activeOpacity={0.6}
                    accessibilityLabel={`Voir le profil de ${assignee.firstName} ${assignee.lastName}`}
                  >
                    <Avatar
                      source={assignee.profileImage ? { uri: assignee.profileImage } : undefined}
                      name={`${assignee.firstName} ${assignee.lastName}`}
                      size={32}
                    />
                    <Text style={[styles.assigneeName, { color: theme.text }]}>
                      {assignee.firstName} {assignee.lastName}
                    </Text>
                  </TouchableOpacity>
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
                  {task.comments.map((comment: any) => {
                    const commenter = getUserById(comment.userId);
                    const reactions: Record<string, string[]> = comment.reactions || {};
                    const reactionEntries = Object.entries(reactions).filter(
                      ([, userIds]) => Array.isArray(userIds) && userIds.length > 0
                    );

                    return (
                      <TouchableOpacity
                        key={comment.id}
                        style={[styles.commentItem, { backgroundColor: theme.card }]}
                        onLongPress={async () => {
                          mediumHaptic();
                          setReactionPickerCommentId(comment.id);
                        }}
                        delayLongPress={400}
                        activeOpacity={0.85}
                      >
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
                          <View style={styles.commentMetaRight}>
                            <Text style={[styles.commentDate, { color: darkMode ? theme.inactive : '#666666' }]}>
                              {formatDate(new Date(comment.createdAt))}
                            </Text>
                            {canDeleteComment(comment) && (
                              <TouchableOpacity
                                onPress={() => {
                                  tapHaptic();
                                  setCommentToDelete(comment);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Supprimer ce commentaire"
                                style={styles.commentDeleteBtn}
                              >
                                <Trash2 size={14} color={darkMode ? theme.inactive : '#888'} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        <Text style={[styles.commentContent, { color: theme.text }]}>
                          {comment.content}
                        </Text>

                        {/* Pills des réactions — visibles uniquement si au moins une réaction.
                            Tap → toggle ma réaction sur cet emoji (rapide, sans rouvrir le picker). */}
                        {reactionEntries.length > 0 && (
                          <View style={styles.reactionsRow}>
                            {reactionEntries.map(([emoji, userIds]) => {
                              const reactedByMe = user ? (userIds as string[]).includes(user.id) : false;
                              return (
                                <TouchableOpacity
                                  key={emoji}
                                  onPress={async () => {
                                    if (!user) return;
                                    tapHaptic();
                                    await toggleCommentReaction(task.id, comment.id, emoji, user.id);
                                  }}
                                  activeOpacity={0.7}
                                  style={[
                                    styles.reactionPill,
                                    {
                                      backgroundColor: reactedByMe ? `${theme.primary}25` : (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                                      borderColor: reactedByMe ? theme.primary : 'transparent',
                                    },
                                  ]}
                                >
                                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                                  <Text style={[styles.reactionCount, { color: reactedByMe ? theme.primary : theme.text }]}>
                                    {(userIds as string[]).length}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.noCommentsText, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Aucun commentaire pour le moment.
                </Text>
              )}
              
              {user && (
                <>
                  {/* Indicateur "X est en train d'écrire..." (Realtime broadcast) */}
                  {typingUsers.length > 0 && (
                    <View style={styles.typingIndicator}>
                      <Text style={[styles.typingText, { color: theme.primary }]}>
                        {typingUsers.length === 1
                          ? `${typingUsers[0].firstName} est en train d'écrire`
                          : typingUsers.length === 2
                            ? `${typingUsers[0].firstName} et ${typingUsers[1].firstName} sont en train d'écrire`
                            : 'Plusieurs personnes sont en train d\'écrire'}
                        <Text style={styles.typingDots}>...</Text>
                      </Text>
                    </View>
                  )}
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
                      onChangeText={handleCommentChange}
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
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Reaction picker (popup centrée) — déclenché par long-press sur un commentaire.
        Sibling Modal au-dessus du Modal principal pour ne pas perturber le keyboard. */}
    <Modal
      visible={reactionPickerCommentId !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setReactionPickerCommentId(null)}
    >
      <TouchableOpacity
        style={styles.reactionPickerBackdrop}
        activeOpacity={1}
        onPress={() => setReactionPickerCommentId(null)}
      >
        <View style={[styles.reactionPickerCard, { backgroundColor: theme.card }]}>
          {REACTION_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={async () => {
                if (!user || !reactionPickerCommentId) return;
                tapHaptic();
                const targetCommentId = reactionPickerCommentId;
                setReactionPickerCommentId(null);
                await toggleCommentReaction(task.id, targetCommentId, emoji, user.id);
              }}
              activeOpacity={0.6}
              style={styles.reactionPickerButton}
            >
              <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>

    {/* ConfirmModal delete commentaire — visible quand commentToDelete != null.
        Snapshot de l'id avant performDelete car onDismiss vide le state synchroniquement. */}
    <ConfirmModal
      visible={commentToDelete !== null}
      title="Supprimer ce commentaire ?"
      message="Le commentaire sera supprimé définitivement."
      actions={[
        { label: 'Annuler', style: 'cancel' },
        { label: 'Supprimer', style: 'destructive', onPress: performDeleteComment },
      ]}
      onDismiss={() => setCommentToDelete(null)}
    />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    // marginTop + flex:1 (au lieu de height:'90%' + justifyContent:flex-end)
    // pour que le contenu remplisse jusqu'au bord bas de l'écran, même quand
    // le KeyboardAvoidingView recompose la hauteur lors d'une bascule clavier.
    marginTop: '10%',
    flex: 1,
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
    padding: 10, // touch target ≥ 44pt (icon 24 + padding 10*2 = 44)
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
  commentMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentDeleteBtn: {
    padding: 4,
    borderRadius: 6,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Pills de réactions (sous chaque commentaire qui en a)
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 8,
  },
  // Picker emoji popup (long-press sur un commentaire)
  reactionPickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerCard: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 999,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  reactionPickerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerEmoji: {
    fontSize: 30,
  },
  noCommentsText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  typingIndicator: {
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  typingDots: {
    fontWeight: '700',
    letterSpacing: 1,
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