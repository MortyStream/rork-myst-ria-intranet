import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useResourcesStore } from '@/store/resources-store';
import { useTasksStore } from '@/store/tasks-store';
import { Task, TaskPriority } from '@/types/task';
import {
  Calendar,
  Flag,
  User,
  X,
  Check,
  ChevronDown,
  Users,
  CheckSquare,
} from 'lucide-react-native';
import { Button } from './Button';
import { Avatar } from './Avatar';

interface TaskFormProps {
  categoryId?: string;
  task?: Task;
  onClose: () => void;
  onSave: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  categoryId,
  task,
  onClose,
  onSave,
}) => {
  const { darkMode } = useSettingsStore();
  const { user } = useAuthStore();
  const { users } = useUsersStore();
  const { categories, isUserCategoryResponsible, initializeDefaultCategories } = useResourcesStore();
  useEffect(() => {
  initializeDefaultCategories();
}, []);
  const { addTask, updateTask } = useTasksStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(task?.categoryId || categoryId || '');
  const [assignedTo, setAssignedTo] = useState<string[]>(task?.assignedTo || []);
  const [deadline, setDeadline] = useState<Date | null>(task?.deadline ? new Date(task.deadline) : null);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [needsValidation, setNeedsValidation] = useState(task?.needsValidation || false);
  
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter categories that the current user is responsible for
 const userCategories = categories.filter(category => 
  category.name.startsWith('Tâches') || 
  user?.role === 'admin' || 
  user?.role === 'responsable_pole'
);

  // Filter users that can be assigned to tasks
 const eligibleUsers = users.filter(u => u.id !== user?.id);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire.');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie.');
      return;
    }

    if (assignedTo.length === 0) {
      Alert.alert('Erreur', 'Veuillez assigner la tâche à au moins une personne.');
      return;
    }

    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour créer une tâche.');
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        title,
        description,
        categoryId: selectedCategoryId,
        assignedTo,
        assignedBy: user.id,
        deadline: deadline?.toISOString(),
        priority,
        needsValidation,
      };

      if (task) {
        // Update existing task
        updateTask(task.id, taskData);
        Alert.alert('Succès', 'La tâche a été mise à jour avec succès.');
      } else {
        // Create new task
        addTask(taskData);
        Alert.alert('Succès', 'La tâche a été créée avec succès.');
      }

      onSave();
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement de la tâche.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (assignedTo.includes(userId)) {
      setAssignedTo(assignedTo.filter(id => id !== userId));
    } else {
      setAssignedTo([...assignedTo, userId]);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getPriorityLabel = (p: TaskPriority) => {
    switch (p) {
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

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
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

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            <View style={styles.formSection}>
              <Text style={[styles.label, { color: theme.text }]}>Titre *</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    color: theme.text,
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Titre de la tâche"
                placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.label, { color: theme.text }]}>Description</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { 
                    color: theme.text,
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Description de la tâche"
                placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />

              <Text style={[styles.label, { color: theme.text }]}>Catégorie *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { 
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.border,
                  }
                ]}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                  {selectedCategoryId 
                    ? categories.find(c => c.id === selectedCategoryId)?.name || 'Sélectionner une catégorie'
                    : 'Sélectionner une catégorie'
                  }
                </Text>
                <ChevronDown size={20} color={theme.text} />
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.text }]}>Priorité</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { 
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.border,
                  }
                ]}
                onPress={() => setShowPriorityPicker(true)}
              >
                <View style={styles.priorityContainer}>
                  <Flag size={20} color={getPriorityColor(priority)} style={styles.priorityIcon} />
                  <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                    {getPriorityLabel(priority)}
                  </Text>
                </View>
                <ChevronDown size={20} color={theme.text} />
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.text }]}>Date d'échéance</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { 
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.border,
                  }
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.dateContainer}>
                  <Calendar size={20} color={theme.primary} style={styles.dateIcon} />
                  <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                    {deadline ? formatDate(deadline) : 'Aucune date d\'échéance'}
                  </Text>
                </View>
                {deadline && (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => setDeadline(null)}
                  >
                    <X size={16} color={theme.text} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.text }]}>Assignée à *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { 
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.border,
                  }
                ]}
                onPress={() => setShowUserPicker(true)}
              >
                <View style={styles.assigneeContainer}>
                  <Users size={20} color={theme.primary} style={styles.assigneeIcon} />
                  <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                    {assignedTo.length > 0 
                      ? `${assignedTo.length} personne${assignedTo.length > 1 ? 's' : ''} assignée${assignedTo.length > 1 ? 's' : ''}`
                      : 'Sélectionner des personnes'
                    }
                  </Text>
                </View>
                <ChevronDown size={20} color={theme.text} />
              </TouchableOpacity>

              {assignedTo.length > 0 && (
                <View style={styles.selectedUsersContainer}>
                  {assignedTo.map(userId => {
                    const selectedUser = users.find(u => u.id === userId);
                    if (!selectedUser) return null;
                    
                    return (
                      <View key={userId} style={[
                        styles.selectedUserItem,
                        { 
                          backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        }
                      ]}>
                        <Avatar
                          source={selectedUser.profileImage ? { uri: selectedUser.profileImage } : undefined}
                          name={`${selectedUser.firstName} ${selectedUser.lastName}`}
                          size={24}
                        />
                        <Text style={[styles.selectedUserName, { color: theme.text }]}>
                          {selectedUser.firstName} {selectedUser.lastName}
                        </Text>
                        <TouchableOpacity
                          style={styles.removeUserButton}
                          onPress={() => toggleUserSelection(userId)}
                        >
                          <X size={16} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.switchContainer}>
                <View style={styles.switchTextContainer}>
                  <CheckSquare size={20} color={theme.primary} style={styles.switchIcon} />
                  <Text style={[styles.switchLabel, { color: theme.text }]}>
                    Nécessite validation
                  </Text>
                </View>
                <Switch
                  value={needsValidation}
                  onValueChange={setNeedsValidation}
                  trackColor={{ false: '#767577', true: `${theme.primary}80` }}
                  thumbColor={needsValidation ? theme.primary : '#f4f3f4'}
                />
              </View>
              <Text style={[styles.helperText, { color: darkMode ? theme.inactive : '#666666' }]}>
                {needsValidation 
                  ? "La tâche devra être validée par le responsable après avoir été marquée comme terminée."
                  : "La tâche sera considérée comme terminée dès que l'assigné la marquera comme telle."}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Annuler"
                onPress={onClose}
                variant="outline"
                style={styles.cancelButton}
                textStyle={{ color: theme.error }}
                fullWidth
              />
              <Button
                title={task ? "Mettre à jour" : "Créer la tâche"}
                onPress={handleSave}
                loading={isSubmitting}
                style={styles.saveButton}
                fullWidth
              />
            </View>
          </ScrollView>

          {/* Category Picker Modal */}
          {showCategoryPicker && (
            <View style={styles.pickerOverlay}>
              <View style={[styles.pickerModal, { backgroundColor: theme.card }]}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>
                  Sélectionner une catégorie
                </Text>
                <ScrollView style={styles.pickerScrollView}>
                  {userCategories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.pickerItem,
                        selectedCategoryId === category.id && { backgroundColor: `${theme.primary}20` }
                      ]}
                      onPress={() => {
                        setSelectedCategoryId(category.id);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <View style={styles.pickerItemContent}>
                        <Text style={styles.categoryEmoji}>{category.icon}</Text>
                        <Text style={[styles.pickerItemText, { color: theme.text }]}>
                          {category.name}
                        </Text>
                      </View>
                      {selectedCategoryId === category.id && (
                        <Check size={20} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.pickerCloseButton, { borderTopColor: theme.border }]}
                  onPress={() => setShowCategoryPicker(false)}
                >
                  <Text style={[styles.pickerCloseText, { color: theme.primary }]}>
                    Annuler
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Priority Picker Modal */}
          {showPriorityPicker && (
            <View style={styles.pickerOverlay}>
              <View style={[styles.pickerModal, { backgroundColor: theme.card }]}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>
                  Sélectionner une priorité
                </Text>
                <View style={styles.priorityPickerContainer}>
                  {(['high', 'medium', 'low'] as TaskPriority[]).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityPickerItem,
                        { borderColor: getPriorityColor(p) },
                        priority === p && { backgroundColor: `${getPriorityColor(p)}20` }
                      ]}
                      onPress={() => {
                        setPriority(p);
                        setShowPriorityPicker(false);
                      }}
                    >
                      <Flag size={20} color={getPriorityColor(p)} style={styles.priorityPickerIcon} />
                      <Text style={[styles.priorityPickerText, { color: theme.text }]}>
                        {getPriorityLabel(p)}
                      </Text>
                      {priority === p && (
                        <Check size={20} color={getPriorityColor(p)} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.pickerCloseButton, { borderTopColor: theme.border }]}
                  onPress={() => setShowPriorityPicker(false)}
                >
                  <Text style={[styles.pickerCloseText, { color: theme.primary }]}>
                    Annuler
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* User Picker Modal */}
          {showUserPicker && (
            <View style={styles.pickerOverlay}>
              <View style={[styles.pickerModal, { backgroundColor: theme.card }]}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>
                  Sélectionner des personnes
                </Text>
                <ScrollView style={styles.pickerScrollView}>
                  {eligibleUsers.map(u => (
                    <TouchableOpacity
                      key={u.id}
                      style={[
                        styles.pickerItem,
                        assignedTo.includes(u.id) && { backgroundColor: `${theme.primary}20` }
                      ]}
                      onPress={() => toggleUserSelection(u.id)}
                    >
                      <View style={styles.userPickerItem}>
                        <Avatar
                          source={u.profileImage ? { uri: u.profileImage } : undefined}
                          name={`${u.firstName} ${u.lastName}`}
                          size={32}
                        />
                        <View style={styles.userPickerInfo}>
                          <Text style={[styles.userPickerName, { color: theme.text }]}>
                            {u.firstName} {u.lastName}
                          </Text>
                          <Text style={[styles.userPickerRole, { color: darkMode ? theme.inactive : '#666666' }]}>
                            {u.role}
                          </Text>
                        </View>
                      </View>
                      {assignedTo.includes(u.id) ? (
                        <Check size={20} color={theme.primary} />
                      ) : (
                        <View style={[styles.checkPlaceholder, { borderColor: theme.border }]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.pickerCloseButton, { borderTopColor: theme.border }]}
                  onPress={() => setShowUserPicker(false)}
                >
                  <Text style={[styles.pickerCloseText, { color: theme.primary }]}>
                    Terminé
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Date Picker */}
          {showDatePicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={deadline || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
      </View>
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
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIcon: {
    marginRight: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 8,
  },
  clearButton: {
    padding: 4,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeIcon: {
    marginRight: 8,
  },
  selectedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  selectedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedUserName: {
    fontSize: 14,
    marginLeft: 8,
    marginRight: 4,
  },
  removeUserButton: {
    padding: 2,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchIcon: {
    marginRight: 8,
  },
  switchLabel: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 16,
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 0,
  },
  cancelButton: {
    marginBottom: 12,
  },
  saveButton: {
    marginBottom: 24,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  pickerScrollView: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  pickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  pickerItemText: {
    fontSize: 16,
  },
  pickerCloseButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  pickerCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  priorityPickerContainer: {
    padding: 16,
  },
  priorityPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  priorityPickerIcon: {
    marginRight: 8,
  },
  priorityPickerText: {
    fontSize: 16,
    flex: 1,
  },
  userPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPickerInfo: {
    marginLeft: 12,
  },
  userPickerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userPickerRole: {
    fontSize: 12,
  },
  checkPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
});
