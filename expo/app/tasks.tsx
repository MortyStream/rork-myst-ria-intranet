import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Plus, Search, User, Edit3, Folder, Flag, AlertCircle, X, Check, Clock, CheckCircle2, SlidersHorizontal } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore } from '@/store/tasks-store';
import { useUsersStore } from '@/store/users-store';
import { useResourcesStore } from '@/store/resources-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { TaskItem } from '@/components/TaskItem';
import { TaskItemSkeleton } from '@/components/Skeleton';
import { TaskDetail } from '@/components/TaskDetail';
import { TaskForm } from '@/components/TaskForm';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Task } from '@/types/task';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { tapHaptic, mediumHaptic, warningHaptic } from '@/utils/haptics';

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
  const isLoadingTasks = useTasksStore((state) => state.isLoading);
  const allTasksCount = useTasksStore((state) => state.tasks.length);
  const { getUserById } = useUsersStore();
  const { getCategoryById, getVisibleCategories } = useResourcesStore();

  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | undefined>(undefined);
  // État du dialog de suppression custom (remplace Alert.alert)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  // ── Filtres avancés (chips combinables) ──
  // Scope (OR entre eux) : tâches assignées + tâches créées par moi
  const [chipMine, setChipMine] = useState(false);
  const [chipCreated, setChipCreated] = useState(false);
  // Attributs (AND avec le reste)
  const [chipHighPriority, setChipHighPriority] = useState(false);
  const [chipOverdue, setChipOverdue] = useState(false);
  // Catégorie : null = pas de filtre, sinon ID de la catégorie
  const [chipCategoryId, setChipCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  // Filtres avancés (catégorie + priorité + retard) regroupés dans une feuille
  // dédiée pour ne pas encombrer l'écran principal. Cf. refonte UI 2026-05-05.
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);

  // Nombre de filtres avancés actifs — badge sur l'icône funnel.
  const advancedFiltersCount =
    (chipCategoryId !== null ? 1 : 0) +
    (chipHighPriority ? 1 : 0) +
    (chipOverdue ? 1 : 0);

  // Titre dynamique selon les chips status/scope actifs.
  const dynamicTitle = (() => {
    if (filter === 'pending' && chipCreated) return 'Tâches données à faire';
    if (filter === 'completed' && chipCreated) return 'Tâches données terminées';
    if (filter === 'pending') return 'À faire';
    if (filter === 'completed') return 'Terminées';
    if (chipCreated) return 'Tâches données';
    return 'Toutes les tâches';
  })();

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

  // Recherche : titre / description / nom catégorie / nom-prénom des assignés.
  // Insensible à la casse + ignore espaces de début/fin.
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const matchesSearch = (task: Task): boolean => {
    if (!isSearching) return true;
    const q = trimmedQuery;
    if (task.title?.toLowerCase().includes(q)) return true;
    if (task.description?.toLowerCase().includes(q)) return true;
    if (task.categoryId) {
      const cat = getCategoryById(task.categoryId);
      if (cat?.name?.toLowerCase().includes(q)) return true;
    }
    if (Array.isArray(task.assignedTo)) {
      for (const uid of task.assignedTo) {
        const u = getUserById(uid);
        if (!u) continue;
        const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase();
        if (
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q) ||
          fullName.includes(q)
        ) return true;
      }
    }
    return false;
  };

  // ── Filtres avancés (chips combinables) ──
  // Modèle : chips de "scope" (Mes / Que j'ai créées) sont OR entre elles.
  // Chips d'attributs (Catégorie, Priorité haute, En retard) sont AND avec tout.
  // Dim "Scope" + Dim "Attribut" = AND (intersection cross-dimensions).
  const hasAdvancedFilter = chipMine || chipCreated || chipHighPriority || chipOverdue || chipCategoryId !== null;

  const matchesAdvanced = (task: Task): boolean => {
    // Dimension Scope : Mes tâches OR Que j'ai créées (si l'une est active).
    // Si aucune des deux n'est active → on accepte tous les userTasks (pas de filtre scope).
    if (chipMine || chipCreated) {
      const isMine = chipMine && user ? task.assignedTo?.includes(user.id) : false;
      const isCreated = chipCreated && user ? task.assignedBy === user.id : false;
      if (!isMine && !isCreated) return false;
    }
    // Catégorie
    if (chipCategoryId && task.categoryId !== chipCategoryId) return false;
    // Priorité haute
    if (chipHighPriority && task.priority !== 'high') return false;
    // En retard : deadline < now ET tâche non terminée
    if (chipOverdue) {
      if (!task.deadline) return false;
      if (task.status === 'completed' || task.status === 'validated') return false;
      if (new Date(task.deadline).getTime() >= Date.now()) return false;
    }
    return true;
  };

  // Si l'user tape qqch → on bypass les filtres (Toutes/À faire/Terminées) et on
  // montre TOUS les résultats matchés peu importe leur état (cf. demande Kévin).
  // Sinon → comportement classique des filtres + chips avancés en AND.
  const tasksToShow = useMemo(() => {
    if (isSearching) return userTasks.filter((t) => matchesSearch(t) && matchesAdvanced(t));
    const baseList = filter === 'all' ? userTasks :
                     filter === 'pending' ? pendingTasks :
                     completedTasks;
    if (!hasAdvancedFilter) return baseList;
    return baseList.filter(matchesAdvanced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSearching, trimmedQuery, filter,
    userTasks, pendingTasks, completedTasks,
    chipMine, chipCreated, chipHighPriority, chipOverdue, chipCategoryId,
    hasAdvancedFilter,
  ]);
  
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
    if (!canUserDelete(task)) {
      // Feedback explicite : sinon l'user croit que le long-press marche pas alors
      // qu'en fait il n'a juste pas les droits sur cette tache precise.
      try {
        const Toast = (await import('react-native-toast-message')).default;
        Toast.show({
          type: 'info',
          text1: 'Action non autorisee',
          text2: 'Seul un admin ou le createur de la tache peut la supprimer.',
        });
      } catch {}
      return;
    }
    mediumHaptic();
    setTaskToDelete(task);
  };

  const performDeleteTask = async () => {
    // Snapshot de l'id AVANT que ConfirmModal vide le state (onDismiss appelé
    // synchroniquement avant action.onPress → taskToDelete = null sinon).
    const idToDelete = taskToDelete?.id;
    if (!idToDelete) return;
    try {
      warningHaptic();
      await deleteTask(idToDelete);
    } catch (e: any) {
      console.error('Delete task error:', e);
      Alert.alert('Erreur', `Impossible de supprimer la t\u00e2che.\n${e?.message ?? ''}`);
    } finally {
      setTaskToDelete(null);
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
        
        <View style={styles.searchContainer}>
          <Input
            placeholder="Rechercher une tâche..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={darkMode ? '#ffffff' : '#333333'} />}
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Refonte UI 2026-05-05 : 2 chips simples en tête (À faire / Tâches données),
            les autres filtres (catégorie / priorité / retard) déplacés dans un bottom-sheet
            ouvert via le funnel à côté du titre. Plus de scroll horizontal infini. */}
        {!isSearching && (
          <View style={styles.primaryChipsRow}>
            <FilterChip
              label={`À faire (${pendingTasks.length})`}
              icon={<Clock size={14} color={filter === 'pending' ? '#fff' : theme.text} />}
              active={filter === 'pending'}
              onPress={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
              theme={theme}
              primary={appColors.primary}
            />
            <FilterChip
              label={`Tâches données${chipCreated ? '' : ''}`}
              icon={<Edit3 size={14} color={chipCreated ? '#fff' : theme.text} />}
              active={chipCreated}
              onPress={() => setChipCreated((v) => !v)}
              theme={theme}
              primary={appColors.primary}
            />
          </View>
        )}

        {/* Titre dynamique + bouton funnel pour ouvrir le bottom-sheet de filtres
            avancés. Caché pendant une recherche (search bypass tout filtre). */}
        {!isSearching && (
          <View style={styles.titleRow}>
            <Text style={[styles.titleText, { color: theme.text }]} numberOfLines={1}>
              {dynamicTitle}
            </Text>
            <TouchableOpacity
              onPress={() => {
                tapHaptic();
                setShowFiltersSheet(true);
              }}
              style={[
                styles.funnelButton,
                {
                  backgroundColor: advancedFiltersCount > 0 ? appColors.primary : 'transparent',
                  borderColor: advancedFiltersCount > 0 ? appColors.primary : theme.border,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SlidersHorizontal
                size={16}
                color={advancedFiltersCount > 0 ? '#fff' : theme.text}
              />
              {advancedFiltersCount > 0 && (
                <Text style={styles.funnelBadge}>{advancedFiltersCount}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Skeleton uniquement au tout 1er chargement (cache vide). Si on a déjà
              des tâches en cache (Zustand persist), on saute direct au vrai contenu.
              On masque tout le reste (sections + empty state) pendant le skeleton. */}
          {isLoadingTasks && allTasksCount === 0 ? (
            <View style={styles.section}>
              {Array.from({ length: 4 }).map((_, i) => (
                <TaskItemSkeleton key={i} />
              ))}
            </View>
          ) : (
          <>
          {/* Section "En retard" : cachée pendant une recherche OU quand un filtre
              avancé est actif (les overdue matchés apparaissent dans la liste principale). */}
          {!isSearching && !hasAdvancedFilter && overdueTasks.length > 0 && filter !== 'completed' ? (
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
                  onLongPress={() => handleLongPressTask(task)}
                />
              ))}
            </View>
          ) : null}

          {tasksToShow.length > 0 ? (
            <View style={styles.section}>
              {isSearching || hasAdvancedFilter ? (
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Résultats ({tasksToShow.length})
                </Text>
              ) : filter === 'all' ? (
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
                  onLongPress={() => handleLongPressTask(task)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={isSearching || hasAdvancedFilter ? 'search' : 'check-square'}
              title={isSearching || hasAdvancedFilter ? 'Aucun résultat' : 'Aucune tâche'}
              message={
                isSearching
                  ? `Aucune tâche ne correspond à « ${searchQuery.trim()} ».`
                  : hasAdvancedFilter
                    ? 'Aucune tâche ne correspond aux filtres sélectionnés.'
                    : filter === 'all' ? "Vous n'avez pas de tâches assignées." :
                      filter === 'pending' ? "Vous n'avez pas de tâches en attente." :
                      "Vous n'avez pas de tâches terminées."
              }
              actionLabel={hasAdvancedFilter && !isSearching ? 'Réinitialiser les filtres' : undefined}
              onAction={hasAdvancedFilter && !isSearching ? () => {
                setChipMine(false);
                setChipCreated(false);
                setChipHighPriority(false);
                setChipOverdue(false);
                setChipCategoryId(null);
              } : undefined}
              style={styles.emptyState}
            />
          )}
          </>
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

        {/* Dialog custom pour suppression de tâche (remplace Alert.alert moche sur Android).
            UN SEUL modal : on évitait avant le bug de chaîne où ConfirmModal appelle
            onDismiss() AVANT action.onPress, ce qui vidait taskToDelete et empêchait
            le 2ème modal de s'ouvrir. Une seule confirmation suffit pour un long-press
            qui est déjà un geste volontaire. */}
        <ConfirmModal
          visible={taskToDelete !== null}
          title="Supprimer la tâche ?"
          message={`« ${taskToDelete?.title ?? ''} » sera supprimée définitivement.\n\nCette action est irréversible.`}
          actions={[
            { label: 'Annuler', style: 'cancel' },
            { label: 'Supprimer', style: 'destructive', onPress: performDeleteTask },
          ]}
          onDismiss={() => setTaskToDelete(null)}
        />

        {/* Picker de catégorie pour le chip "Par catégorie" */}
        <Modal
          visible={showCategoryPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowCategoryPicker(false)}
          >
            <TouchableOpacity
              style={[styles.pickerSheet, { backgroundColor: theme.card }]}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>Filtrer par catégorie</Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <X size={22} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                {chipCategoryId !== null && (
                  <TouchableOpacity
                    style={[styles.pickerRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setChipCategoryId(null);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerRowText, { color: theme.error, fontWeight: '600' }]}>
                      Effacer le filtre
                    </Text>
                  </TouchableOpacity>
                )}
                {getVisibleCategories().map((cat) => {
                  const selected = cat.id === chipCategoryId;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.pickerRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        setChipCategoryId(cat.id);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerRowText, { color: theme.text }]}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                      </Text>
                      {selected && <Check size={18} color={appColors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Bottom-sheet "Filtres avancés" — refonte UI 2026-05-05.
            Regroupe Catégorie / Priorité haute / En retard, accessible via le
            funnel dans le titleRow. Évite la pollution visuelle des chips. */}
        <Modal
          visible={showFiltersSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFiltersSheet(false)}
        >
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowFiltersSheet(false)}
          >
            <TouchableOpacity
              style={[styles.filtersSheet, { backgroundColor: theme.card }]}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>Filtres avancés</Text>
                <TouchableOpacity
                  onPress={() => setShowFiltersSheet(false)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <X size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Catégorie : tappe pour ouvrir le picker (fermeture de la sheet) */}
              <TouchableOpacity
                style={[styles.filterRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setShowFiltersSheet(false);
                  setTimeout(() => setShowCategoryPicker(true), 200);
                }}
              >
                <View style={styles.filterRowLeft}>
                  <Folder size={18} color={chipCategoryId ? appColors.primary : theme.text} />
                  <Text style={[styles.filterRowLabel, { color: theme.text }]}>
                    {chipCategoryId
                      ? `Catégorie : ${getCategoryById(chipCategoryId)?.name ?? '?'}`
                      : 'Par catégorie'}
                  </Text>
                </View>
                {chipCategoryId ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setChipCategoryId(null);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <X size={18} color={theme.error} />
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: darkMode ? theme.inactive : '#888' }}>›</Text>
                )}
              </TouchableOpacity>

              {/* Priorité haute : toggle */}
              <TouchableOpacity
                style={[styles.filterRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  tapHaptic();
                  setChipHighPriority((v) => !v);
                }}
              >
                <View style={styles.filterRowLeft}>
                  <Flag size={18} color={chipHighPriority ? theme.error : theme.text} />
                  <Text style={[styles.filterRowLabel, { color: theme.text }]}>Priorité haute</Text>
                </View>
                {chipHighPriority && <Check size={18} color={appColors.primary} />}
              </TouchableOpacity>

              {/* En retard : toggle */}
              <TouchableOpacity
                style={[styles.filterRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  tapHaptic();
                  setChipOverdue((v) => !v);
                }}
              >
                <View style={styles.filterRowLeft}>
                  <AlertCircle size={18} color={chipOverdue ? theme.error : theme.text} />
                  <Text style={[styles.filterRowLabel, { color: theme.text }]}>En retard</Text>
                </View>
                {chipOverdue && <Check size={18} color={appColors.primary} />}
              </TouchableOpacity>

              {/* Effacer tous les filtres avancés */}
              {advancedFiltersCount > 0 && (
                <TouchableOpacity
                  style={[styles.filterClearButton, { borderTopColor: theme.border }]}
                  onPress={() => {
                    tapHaptic();
                    setChipCategoryId(null);
                    setChipHighPriority(false);
                    setChipOverdue(false);
                  }}
                >
                  <Text style={[styles.filterClearText, { color: theme.error }]}>
                    Effacer les filtres ({advancedFiltersCount})
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </AppLayout>
  );
}

/**
 * Petit chip réutilisable pour les filtres avancés.
 * Active = rempli (couleur primaire de l'app), Inactif = outlined.
 * `onClear` (optionnel) = X qui apparaît à droite quand le chip a une valeur stateful (ex. catégorie sélectionnée).
 */
const FilterChip: React.FC<{
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  onClear?: () => void;
  theme: typeof Colors.light;
  primary: string;
}> = ({ label, icon, active, onPress, onClear, theme, primary }) => (
  <TouchableOpacity
    onPress={async () => {
      tapHaptic();
      onPress();
    }}
    activeOpacity={0.7}
    style={[
      chipStyles.chip,
      {
        backgroundColor: active ? primary : 'transparent',
        borderColor: active ? primary : theme.border,
      },
    ]}
  >
    {icon}
    <Text style={[chipStyles.chipText, { color: active ? '#fff' : theme.text }]} numberOfLines={1}>
      {label}
    </Text>
    {onClear && (
      <TouchableOpacity
        onPress={() => {
          tapHaptic();
          onClear();
        }}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 6 }}
        style={chipStyles.chipClear}
      >
        <X size={14} color={active ? '#fff' : theme.text} />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  chipClear: {
    marginLeft: 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { marginTop: -8 },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: -4,
  },
  filterButton: { marginRight: 8 },
  // Row de chips horizontale (scrollable car peut dépasser la largeur) — legacy.
  chipsScrollView: {
    flexGrow: 0,
    marginBottom: 12,
  },
  chipsContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  // Refonte UI 2026-05-05 : 2 chips simples en tête + titleRow + funnel.
  primaryChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 0, // FilterChip a déjà marginRight 8
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  titleText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  funnelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  funnelBadge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  filtersSheet: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingBottom: 24,
    alignSelf: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterRowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  filterClearButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  filterClearText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
  // Modal picker de catégorie (bottom sheet style)
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  pickerList: {
    paddingHorizontal: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerRowText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
