import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCheck, BellOff, MoreVertical, Edit, Trash } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useSettingsStore } from '@/store/settings-store';
import { useResourcesStore } from '@/store/resources-store';
import { Colors } from '@/constants/colors';
import { NotificationItem } from '@/components/NotificationItem';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { Notification } from '@/types/notification';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    getUserNotifications, 
    markAsRead, 
    markAllAsRead, 
    toggleMessaging, 
    isMessagingEnabled,
    deleteNotification 
  } = useNotificationsStore();
  const { darkMode } = useSettingsStore();
  const { categories, isUserSubscribed, subscribeToCategory, unsubscribeFromCategory } = useResourcesStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [refreshing, setRefreshing] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [showNotificationOptions, setShowNotificationOptions] = useState(false);
  
  const notifications = getUserNotifications();
  const hasUnread = notifications.some(notification => !notification.read);
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // In a real app, you would fetch fresh data here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  const handleNotificationPress = (id: string) => {
    markAsRead(id);
  };
  
  const handleNotificationLongPress = (id: string) => {
    if (isAdminOrModerator) {
      setSelectedNotification(id);
      setShowNotificationOptions(true);
    }
  };
  
  const handleEditNotification = () => {
    if (selectedNotification) {
      router.push({
        pathname: '/admin/notification-form',
        params: { id: selectedNotification }
      });
      setShowNotificationOptions(false);
    }
  };
  
  const handleDeleteNotification = () => {
    if (selectedNotification) {
      Alert.alert(
        'Confirmer la suppression',
        'Êtes-vous sûr de vouloir supprimer cette notification ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Supprimer', 
            style: 'destructive',
            onPress: () => {
              deleteNotification(selectedNotification);
              setShowNotificationOptions(false);
              setSelectedNotification(null);
            }
          }
        ]
      );
    }
  };
  
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  
  const handleToggleMessaging = () => {
    const newState = !isMessagingEnabled;
    toggleMessaging(newState);
    
    if (newState) {
      Alert.alert('Notifications activées', 'Vous recevrez désormais des notifications.');
    } else {
      Alert.alert('Notifications désactivées', 'Vous ne recevrez plus de notifications.');
    }
  };
  
  const handleToggleCategorySettings = () => {
    setShowCategorySettings(!showCategorySettings);
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
  
  const renderCategoryItem = ({ item }) => {
    if (!user) return null;
    
    const isSubscribed = isUserSubscribed(user.id, item.id);
    
    return (
      <View style={[styles.categoryItem, { borderBottomColor: theme.border }]}>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryTitle, { color: theme.text }]}>
            {item.icon} {item.name}
          </Text>
        </View>
        <Switch
          value={isSubscribed}
          onValueChange={() => handleToggleCategorySubscription(item.id)}
          trackColor={{ false: '#767577', true: `${theme.primary}80` }}
          thumbColor={isSubscribed ? theme.primary : '#f4f3f4'}
        />
      </View>
    );
  };
  
  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item.id)}
      onLongPress={() => handleNotificationLongPress(item.id)}
    />
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Notifications 🔔</Text>
        
        <View style={styles.headerButtons}>
          {hasUnread && (
            <TouchableOpacity 
              style={styles.markReadButton} 
              onPress={handleMarkAllAsRead}
            >
              <CheckCheck size={20} color={theme.primary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.toggleButton} 
            onPress={handleToggleMessaging}
          >
            {isMessagingEnabled ? (
              <Bell size={24} color={theme.primary} />
            ) : (
              <BellOff size={24} color={theme.text} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.settingsButton, { backgroundColor: theme.card }]}
        onPress={handleToggleCategorySettings}
      >
        <Text style={[styles.settingsButtonText, { color: theme.text }]}>
          {showCategorySettings ? "Masquer les paramètres de catégories" : "Gérer les abonnements aux catégories"}
        </Text>
      </TouchableOpacity>
      
      {showCategorySettings ? (
        <FlatList
          data={categories.sort((a, b) => a.order - b.order)}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.categoryListContent}
          ItemSeparatorComponent={() => <Divider style={{ marginVertical: 0 }} />}
          ListHeaderComponent={
            <View style={styles.categoryHeader}>
              <Text style={[styles.categoryHeaderText, { color: theme.text }]}>
                Choisissez les catégories pour lesquelles vous souhaitez recevoir des notifications
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Aucune notification"
              message="Vous n'avez pas encore reçu de notifications."
              icon={<Bell size={48} color={theme.inactive} />}
              style={styles.emptyState}
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      
      {/* Modal pour les options de notification */}
      {showNotificationOptions && (
        <View style={styles.modalOverlay}>
          <View style={[styles.optionsModal, { backgroundColor: theme.card }]}>
            <Text style={[styles.optionsTitle, { color: theme.text }]}>
              Options de notification
            </Text>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleEditNotification}
            >
              <Edit size={20} color={theme.primary} style={styles.optionIcon} />
              <Text style={[styles.optionText, { color: theme.text }]}>Modifier</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleDeleteNotification}
            >
              <Trash size={20} color={theme.error} style={styles.optionIcon} />
              <Text style={[styles.optionText, { color: theme.error }]}>Supprimer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.cancelButton, { borderTopColor: theme.border }]}
              onPress={() => setShowNotificationOptions(false)}
            >
              <Text style={[styles.cancelText, { color: theme.primary }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markReadButton: {
    padding: 8,
    marginRight: 8,
  },
  toggleButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  settingsButtonText: {
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    marginTop: 40,
  },
  categoryListContent: {
    paddingBottom: 20,
  },
  categoryHeader: {
    padding: 16,
  },
  categoryHeaderText: {
    fontSize: 14,
    textAlign: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  optionsModal: {
    width: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});