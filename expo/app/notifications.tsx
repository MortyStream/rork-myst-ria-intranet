import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Platform,
  Animated,
  Linking,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCheck, BellOff, Trash2, ChevronDown, ChevronUp, Settings, Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useSettingsStore } from '@/store/settings-store';
import { useResourcesStore } from '@/store/resources-store';
import { Colors } from '@/constants/colors';
import { NotificationItem } from '@/components/NotificationItem';
import { NotificationItemSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Notification } from '@/types/notification';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { tapHaptic, mediumHaptic, warningHaptic } from '@/utils/haptics';

type NotifSection = { title: string; data: Notification[] };

/**
 * Regroupe les notifications par tranche temporelle relative.
 * Aujourd'hui / Hier / Cette semaine / Plus ancien — l'ordre garantit la
 * stabilité visuelle, et les sections vides sont filtrées en aval.
 */
const groupByDay = (notifs: Notification[]): NotifSection[] => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  for (const n of notifs) {
    const t = new Date(n.createdAt).getTime();
    if (t >= startOfToday) today.push(n);
    else if (t >= startOfYesterday) yesterday.push(n);
    else if (t >= startOfWeek) thisWeek.push(n);
    else older.push(n);
  }

  return [
    { title: "Aujourd'hui", data: today },
    { title: 'Hier', data: yesterday },
    { title: 'Cette semaine', data: thisWeek },
    { title: 'Plus ancien', data: older },
  ].filter((s) => s.data.length > 0);
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    getUserNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    toggleMessaging,
    isMessagingEnabled,
    deleteNotification,
    getUnreadCount,
    initializeNotifications,
  } = useNotificationsStore();
  const { darkMode } = useSettingsStore();
  const { categories, isUserSubscribed, subscribeToCategory, unsubscribeFromCategory, initializeDefaultCategories } = useResourcesStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [refreshing, setRefreshing] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  const [settingsAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    let mounted = true;
    initializeDefaultCategories();
    initializeNotifications().finally(() => {
      if (mounted) setIsFirstLoad(false);
    });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifications = getUserNotifications();
  const unreadCount = getUnreadCount();
  const hasUnread = unreadCount > 0;

  const sections = useMemo(() => groupByDay(notifications), [notifications]);
  const selectedNotif = selectedNotificationId
    ? notifications.find((n) => n.id === selectedNotificationId)
    : null;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await initializeNotifications();
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNotificationPress = (id: string) => {
    tapHaptic();
    markAsRead(id);
    const notif = notifications.find((n) => n.id === id);
    if (!notif) return;

    // Deep-link vers la cible. Priorité event > task > category.
    if (notif.eventId) {
      router.push({ pathname: '/calendar/event-detail', params: { id: notif.eventId } });
      return;
    }
    if (notif.taskId) {
      router.push({ pathname: '/tasks', params: { highlightId: notif.taskId } });
      return;
    }
    if (notif.categoryId) {
      router.push({ pathname: '/resources/[id]', params: { id: notif.categoryId } });
      return;
    }
    // Notif info pure : pas de cible. Le tap a juste marqué comme lu.
  };

  const handleNotificationLongPress = (id: string) => {
    mediumHaptic();
    setSelectedNotificationId(id);
    setShowOptionsModal(true);
  };

  const handleToggleRead = () => {
    if (!selectedNotif) return;
    if (selectedNotif.read) {
      markAsUnread(selectedNotif.id);
    } else {
      markAsRead(selectedNotif.id);
    }
    tapHaptic();
    setShowOptionsModal(false);
    setSelectedNotificationId(null);
  };

  const handleAskDelete = () => {
    setShowOptionsModal(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedNotificationId) return;
    warningHaptic();
    deleteNotification(selectedNotificationId);
    setSelectedNotificationId(null);
  };

  const handleMarkAllAsRead = () => {
    if (!hasUnread) return;
    tapHaptic();
    markAllAsRead();
  };

  const handleToggleMessaging = () => {
    tapHaptic();
    toggleMessaging(!isMessagingEnabled);
  };

  const handleOpenSystemSettings = () => {
    Linking.openSettings();
  };

  const handleToggleCategorySettings = () => {
    tapHaptic();
    const toValue = showCategorySettings ? 0 : 1;
    setShowCategorySettings(!showCategorySettings);
    Animated.spring(settingsAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  };

  const handleToggleCategorySubscription = (categoryId: string) => {
    if (!user) return;
    const isSubscribed = isUserSubscribed(user.id, categoryId);
    if (isSubscribed) {
      unsubscribeFromCategory(user.id, categoryId);
    } else {
      subscribeToCategory(user.id, categoryId);
    }
  };

  const renderControlsRow = () => (
    <View style={[styles.controlsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity style={styles.controlButton} onPress={handleToggleMessaging}>
        {isMessagingEnabled ? (
          <Bell size={18} color={theme.primary} />
        ) : (
          <BellOff size={18} color={theme.inactive} />
        )}
        {hasUnread && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={[styles.controlDivider, { backgroundColor: theme.border }]} />

      <TouchableOpacity style={styles.controlButton} onPress={handleOpenSystemSettings}>
        <Settings size={18} color={theme.text} style={{ opacity: 0.5 }} />
      </TouchableOpacity>

      <View style={[styles.controlDivider, { backgroundColor: theme.border }]} />

      <TouchableOpacity
        style={[styles.controlButton, styles.controlButtonWide]}
        onPress={handleToggleCategorySettings}
      >
        <Text style={[styles.controlText, { color: theme.text }]}>Abonnements</Text>
        {showCategorySettings ? (
          <ChevronUp size={15} color={theme.text} style={{ opacity: 0.5 }} />
        ) : (
          <ChevronDown size={15} color={theme.text} style={{ opacity: 0.5 }} />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({ section }: { section: NotifSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionHeaderText, { color: darkMode ? '#999' : '#777' }]}>
        {section.title.toUpperCase()}
      </Text>
    </View>
  );

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item.id)}
      onLongPress={() => handleNotificationLongPress(item.id)}
    />
  );

  const renderCategoryItem = ({ item }: { item: any }) => {
    if (!user) return null;
    const isSubscribed = isUserSubscribed(user.id, item.id);
    return (
      <Animated.View
        style={[
          styles.categoryItem,
          {
            backgroundColor: theme.card,
            transform: [
              {
                translateX: settingsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryTitle, { color: theme.text }]}>
            {item.icon} {item.name}
          </Text>
        </View>
        <Switch
          value={isSubscribed}
          onValueChange={() => handleToggleCategorySubscription(item.id)}
          trackColor={{ false: theme.inactive, true: `${theme.primary}80` }}
          thumbColor={isSubscribed ? theme.primary : '#f4f3f4'}
          ios_backgroundColor={theme.inactive}
        />
      </Animated.View>
    );
  };

  const showSkeleton = isFirstLoad && notifications.length === 0;

  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Notifications 🔔"
          onTitlePress={() => toggleSidebar && toggleSidebar()}
          rightComponent={
            hasUnread ? (
              <TouchableOpacity
                style={styles.markReadButton}
                onPress={handleMarkAllAsRead}
              >
                <CheckCheck size={20} color={theme.primary} />
              </TouchableOpacity>
            ) : null
          }
        />

        {showCategorySettings ? (
          <ScrollView contentContainerStyle={styles.categoryListContent}>
            {renderControlsRow()}
            {categories.length === 0 ? (
              <EmptyState
                title="Aucune catégorie"
                message="Les catégories de La Bible apparaîtront ici pour vous abonner aux mises à jour."
                icon={<Bell size={48} color={theme.inactive} />}
                style={styles.emptyState}
              />
            ) : (
              categories
                .sort((a, b) => a.order - b.order)
                .map((cat) => (
                  <View key={cat.id}>
                    {renderCategoryItem({ item: cat })}
                  </View>
                ))
            )}
          </ScrollView>
        ) : showSkeleton ? (
          <ScrollView contentContainerStyle={styles.listContent}>
            {renderControlsRow()}
            {Array.from({ length: 5 }).map((_, i) => (
              <NotificationItemSkeleton key={i} />
            ))}
          </ScrollView>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderControlsRow()}
            ListEmptyComponent={
              <EmptyState
                title="Aucune notification"
                message="Vous n'avez pas encore reçu de notifications. Elles apparaîtront ici quand vous serez assigné à une tâche, invité à un événement, ou si une catégorie que vous suivez est mise à jour."
                icon={<Bell size={48} color={theme.inactive} />}
                style={styles.emptyState}
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
              />
            }
          />
        )}

        {/* Menu d'options sur long-press : Marquer lu/non-lu + Supprimer.
            Disponible pour TOUS les users (avant : admin only). */}
        {showOptionsModal && selectedNotif && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setShowOptionsModal(false);
                setSelectedNotificationId(null);
              }}
            />
            <View style={[styles.optionsModal, { backgroundColor: theme.card }]}>
              <View style={styles.optionsHeader}>
                <Text style={[styles.optionsTitle, { color: theme.text }]} numberOfLines={1}>
                  {selectedNotif.title}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
                onPress={handleToggleRead}
              >
                {selectedNotif.read ? (
                  <EyeOff size={20} color={theme.primary} style={styles.optionIcon} />
                ) : (
                  <Eye size={20} color={theme.primary} style={styles.optionIcon} />
                )}
                <Text style={[styles.optionText, { color: theme.text }]}>
                  {selectedNotif.read ? 'Marquer comme non-lue' : 'Marquer comme lue'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleAskDelete}
              >
                <Trash2 size={20} color={theme.error} style={styles.optionIcon} />
                <Text style={[styles.optionText, { color: theme.error }]}>Supprimer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, { borderTopColor: theme.border }]}
                onPress={() => {
                  setShowOptionsModal(false);
                  setSelectedNotificationId(null);
                }}
              >
                <Text style={[styles.cancelText, { color: theme.primary }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ConfirmModal
          visible={showDeleteConfirm}
          title="Supprimer la notification ?"
          message={selectedNotif ? `« ${selectedNotif.title} » sera retirée de votre liste.` : undefined}
          actions={[
            { label: 'Annuler', style: 'cancel' },
            { label: 'Supprimer', style: 'destructive', onPress: handleConfirmDelete },
          ]}
          onDismiss={() => setShowDeleteConfirm(false)}
        />
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    height: 44,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  controlButton: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  controlButtonWide: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
  },
  controlDivider: {
    width: 1,
    height: '50%',
  },
  controlText: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.75,
  },
  unreadBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    paddingTop: 12,
    paddingBottom: 6,
    paddingHorizontal: 24,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  emptyState: {
    marginTop: 60,
  },
  categoryListContent: {
    paddingBottom: 24,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  categoryInfo: { flex: 1 },
  categoryTitle: { fontSize: 15, fontWeight: '500' },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  optionsModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: { elevation: 5 },
    }),
  },
  optionsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.7,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  optionIcon: { marginRight: 16 },
  optionText: { fontSize: 16, fontWeight: '500' },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  cancelText: { fontSize: 16, fontWeight: '600' },
  markReadButton: { padding: 12 }, // touch target ≥ 44pt (icon 20 + padding 12*2 = 44)
});
