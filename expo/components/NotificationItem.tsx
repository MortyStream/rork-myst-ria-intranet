import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Notification } from '@/types/notification';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { Bell, FileText, Folder, Calendar } from 'lucide-react-native';
import { formatRelativeDate } from '@/utils/date-utils';
import { useResourcesStore } from '@/store/resources-store';
import { useCalendarStore } from '@/store/calendar-store';
import { useRouter } from 'expo-router';
import { ResourceItem } from '@/types/resource';

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onLongPress,
}) => {
  const router = useRouter();
  const { darkMode } = useSettingsStore();
  const { getCategoryById, getResourceItemById } = useResourcesStore();
  const { getEventById } = useCalendarStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [pressAnim] = React.useState(new Animated.Value(1));
  const [resourceItem, setResourceItem] = useState<ResourceItem | undefined>();
  
  useEffect(() => {
    const loadResourceItem = async () => {
      if (notification.categoryId && notification.resourceItemId) {
        const item = await getResourceItemById(notification.resourceItemId);
        setResourceItem(item);
      }
    };
    
    loadResourceItem();
  }, [notification.resourceItemId, getResourceItemById]);
  
  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 40,
      friction: 3
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 40,
      friction: 6
    }).start();
  };
  
  const handlePress = async () => {
    if (onPress) {
      onPress();
    }
    
    if (notification.categoryId && notification.resourceItemId) {
      const category = await getCategoryById(notification.categoryId);
      const item = await getResourceItemById(notification.resourceItemId);
      
      if (category && item) {
        router.push({
          pathname: '/resource-detail',
          params: {
            categoryId: notification.categoryId,
            itemId: notification.resourceItemId
          }
        });
      }
    }
    
    if (notification.eventId) {
      const event = await getEventById(notification.eventId);
      
      if (event) {
        router.push({
          pathname: '/calendar/event-detail',
          params: { id: notification.eventId }
        });
      }
    }
  };
  
  const getNotificationIcon = () => {
    if (notification.eventId) {
      return <Calendar size={18} color="#ffffff" />;
    }
    
    if (notification.categoryId && notification.resourceItemId && resourceItem) {
      if (resourceItem.type === 'folder') {
        return <Folder size={18} color="#ffffff" />;
      } else {
        return <FileText size={18} color="#ffffff" />;
      }
    }
    
    return <Bell size={18} color="#ffffff" />;
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      delayPressIn={0}
    >
      <Animated.View
        style={[
          styles.container,
          { 
            backgroundColor: notification.read ? theme.card : `${theme.primary}10`,
            transform: [{ scale: pressAnim }]
          }
        ]}
      >
        <View style={[
          styles.iconContainer,
          { 
            backgroundColor: notification.read ? theme.inactive : theme.primary,
            ...Platform.select({
              ios: {
                shadowColor: notification.read ? theme.inactive : theme.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
              },
              android: {
                elevation: 3,
              },
            }),
          }
        ]}>
          {getNotificationIcon()}
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {notification.title}
          </Text>
          
          <Text 
            style={[styles.message, { color: theme.inactive }]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>
          
          <Text style={[styles.time, { color: theme.inactive }]}>
            {formatRelativeDate(new Date(notification.createdAt))}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
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
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
});