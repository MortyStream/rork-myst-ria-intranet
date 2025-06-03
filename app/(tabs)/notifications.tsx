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
import { Bell, Check, Trash2, Filter } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { NotificationItem } from '@/components/NotificationItem';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    notifications, 
    isLoading, 
    error, 
    initializeNotifications, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    getUserNotifications,
  } = useNotificationsStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      await initializeNotifications();
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement des notifications.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await initializeNotifications();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du rafraîchissement des notifications.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = (notificationId: string) => {
    markAsRead(notificationId);
    // Navigate to relevant screen based on notification type
    // This would be implemented based on your notification structure
  };

  const handleMarkAllAsRead = () => {
    if (getUnreadCount() === 0) return;
    
    Alert.alert(
      'Marquer tout comme lu',
      'Voulez-vous marquer toutes les notifications comme lues ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: () => markAllAsRead(),
        },
      ]
    );
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      'Supprimer la notification',
      'Voulez-vous supprimer cette notification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => deleteNotification(notificationId),
        },
      ]
    );
  };

  // Get user notifications
  const userNotifications = user ? getUserNotifications(user.id) : [];
  
  // Filter notifications based on selected filter
  const filteredNotifications = userNotifications.filter(notification => {
    switch (selectedFilter) {
      case 'unread':
        return !notification.read;
      case 'read':
        return notification.read;
      default:
        return true;
    }
  });

  const unreadCount = getUnreadCount();

  const filters = [
    { key: 'all', label: 'Toutes', count: userNotifications.length },
    { key: 'unread', label: 'Non lues', count: unreadCount },
    { key: 'read', label: 'Lues', count: userNotifications.filter(n => n.read).length },
  ];

  const renderContent = () => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appColors.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Chargement des notifications...
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
            onPress={loadNotifications}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredNotifications.length === 0) {
      return (
        <EmptyState
          icon="bell"
          title="Aucune notification"
          message={
            selectedFilter === 'all'
              ? "Vous n'avez pas encore de notifications"
              : selectedFilter === 'unread'
              ? "Vous n'avez pas de notifications non lues"
              : "Vous n'avez pas de notifications lues"
          }
        />
      );
    }

    return (
      <ScrollView
        style={styles.notificationsList}
        contentContainerStyle={styles.notificationsContent}
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
        {filteredNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onPress={() => handleNotificationPress(notification.id)}
            onDelete={() => handleDeleteNotification(notification.id)}
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
          title="Notifications 🔔"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            unreadCount > 0 ? (
              <TouchableOpacity 
                style={styles.markAllButton}
                onPress={handleMarkAllAsRead}
              >
                <Check size={24} color={theme.text} />
              </TouchableOpacity>
            ) : null
          }
        />

        {/* Filters */}
        <ScrollView 
          horizontal 
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
          showsHorizontalScrollIndicator={false}
        >
          {filters.map((filter) => {
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
                <Text style={[
                  styles.filterText,
                  { color: isSelected ? '#ffffff' : theme.text }
                ]}>
                  {filter.label}
                </Text>
                {filter.count > 0 && (
                  <Badge
                    text={filter.count.toString()}
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
  markAllButton: {
    padding: 8,
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
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    padding: 16,
  },
});