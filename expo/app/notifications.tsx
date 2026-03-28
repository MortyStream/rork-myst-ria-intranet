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
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCheck, BellOff, Edit, Trash, ChevronDown, ChevronUp } from 'lucide-react-native';
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
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { Badge } from '@/components/Badge';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    getUserNotifications, 
    markAsRead, 
    markAllAsRead, 
    toggleMessaging, 
    isMessagingEnabled,
    deleteNotification,
    getUnreadCount 
  } = useNotificationsStore();
  const { darkMode } = useSettingsStore();
  const { categories, isUserSubscribed, subscribeToCategory, unsubscribeFromCategory } = useResourcesStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [refreshing, setRefreshing] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [showNotificationOptions, setShowNotificationOptions] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  const [settingsAnimation] = useState(new Animated.Value(0));
  
  const notifications = getUserNotifications();
  const unreadCount = getUnreadCount();
  const hasUnread = unreadCount > 0;
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
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
      router.push(`/admin/notification-form/${selectedNotification}`);
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
    const toValue = showCategorySettings ? 0 : 1;
    setShowCategorySettings(!showCategorySettings);
    Animated.spring(settingsAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 40,
      friction: 7
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
  
  const renderCategoryItem = ({ item }: { item: any }) => {
    if (!user) return null;
    
    const isSubscribed = isUserSubscribed(user.id, item.id);
    
    return (
      <Animated.View style={[
        styles.categoryItem,
        {
          borderBottomColor: theme.border,
          backgroundColor: theme.card,
          transform: [{
            translateX: settingsAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })
          }]
        }
      ]}>
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
  
  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item.id)}
      onLongPress={() => handleNotificationLongPress(item.id)}
    />
  );

  const renderHeader = () => (
    <>
      <View style={styles.statusContainer}>
        <TouchableOpacity 
          style={[styles.statusButton, { backgroundColor: theme.card }]}
          onPress={handleToggleMessaging}
        >
          <View style={styles.statusContent}>
            {isMessagingEnabled ? (
              <Bell size={20} color={theme.primary} />
            ) : (
              <BellOff size={20} color={theme.inactive} />
            )}
            <Text style={[styles.statusText, { color: theme.text }]}>
              {isMessagingEnabled ? 'Notifications activées' : 'Notifications désactivées'}
            </Text>
          </View>
          {hasUnread && (
            <Badge
              label={unreadCount.toString()}
              variant="primary"
              size="small"
              style={styles.badge}
            />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.settingsButton, { backgroundColor: theme.card }]}
        onPress={handleToggleCategorySettings}
      >
        <View style={styles.settingsButtonContent}>
          <Text style={[styles.settingsButtonText, { color: theme.text }]}>
            {showCategorySettings ? "Masquer les paramètres" : "Gérer les abonnements"}
          </Text>
          {showCategorySettings ? (
            <ChevronUp size={20} color={theme.text} />
          ) : (
            <ChevronDown size={20} color={theme.text} />
          )}
        </View>
      </TouchableOpacity>
    </>
  );
  
  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Notifications"
          onTitlePress={() => toggleSidebar && toggleSidebar()}
          rightComponent={
            hasUnread && (
              <TouchableOpacity 
                style={styles.markReadButton} 
                onPress={handleMarkAllAsRead}
              >
                <CheckCheck size={20} color={theme.primary} />
              </TouchableOpacity>
            )
          }
        />
        
        {showCategorySettings ? (
          <FlatList
            data={categories.sort((a, b) => a.order - b.order)}
            keyExtractor={(item) => item.id}
            renderItem={renderCategoryItem}
            contentContainerStyle={styles.categoryListContent}
            ItemSeparatorComponent={() => <Divider style={{ marginVertical: 0 }} />}
            ListHeaderComponent={renderHeader()}
          />
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderHeader()}
            ListEmptyComponent={
              <EmptyState
                title="Aucune notification"
                message="Vous n'avez pas encore reçu de notifications."
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
        
        {showNotificationOptions && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              onPress={() => setShowNotificationOptions(false)}
            />
            <View style={[styles.optionsModal, { backgroundColor: theme.card }]}>
              <Text style={[styles.optionsTitle, { color: theme.text }]}>
                Options
              </Text>
              
              <TouchableOpacity 
                style={[styles.optionItem, { borderBottomColor: theme.border }]}
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
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    marginLeft: 8,
  },
  settingsButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsButtonText: {
    fontSize: 15,
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
      android: {
        elevation: 1,
      },
    }),
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
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
      android: {
        elevation: 5,
      },
    }),
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  markReadButton: {
    padding: 8,
  },
});