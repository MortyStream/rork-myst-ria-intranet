import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Notification } from '@/types/notification';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { Bell, FileText, Folder, Calendar, CheckSquare, ChevronRight, Check, CheckCheck } from 'lucide-react-native';
import { formatRelativeDate } from '@/utils/date-utils';
import { useResourcesStore } from '@/store/resources-store';
import { useTasksStore } from '@/store/tasks-store';
import { useCalendarStore } from '@/store/calendar-store';
import { ResourceItem } from '@/types/resource';

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * Card de notification — non-lue : border-left coloré + bg teinté + titre bold.
 * Lue : neutre, plus discrète.
 *
 * Le tap et long-press délèguent au parent (notifications.tsx) qui gère :
 * - markAsRead + deep-link sur tap
 * - menu d'options (lire/non-lire/supprimer) sur long-press
 *
 * Important : ne PAS faire de navigation interne ici (cas historique de double
 * routing avec le parent qui causait des conflits/no-op selon les cas).
 */
// React.memo : évite re-render si la notif et les callbacks sont stables.
// Critique avec la SectionList des notifs + Realtime sur INSERT (chaque
// nouvelle notif fait re-render toute la liste sinon).
const NotificationItemComponent: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onLongPress,
}) => {
  const { darkMode } = useSettingsStore();
  const { getResourceItemById } = useResourcesStore();
  // On regarde directement les tasks/events pour détecter l'obsolescence —
  // pas besoin d'appel async, juste un lookup mémoire dans le store déjà chargé.
  const tasks = useTasksStore((s) => s.tasks);
  const events = useCalendarStore((s) => s.events);
  const theme = darkMode ? Colors.dark : Colors.light;

  const [pressAnim] = React.useState(new Animated.Value(1));
  const [resourceItem, setResourceItem] = useState<ResourceItem | undefined>();

  // Détection d'obsolescence : la notif vise une tâche terminée/validée, ou
  // un événement passé. On affiche alors la card grisée + un badge "Terminée".
  // Si la cible n'existe plus en local (orphan), on traite comme normal —
  // l'auto-cleanup au refresh DB s'occupera du nettoyage.
  const linkedTask = notification.taskId ? tasks.find((t) => t.id === notification.taskId) : undefined;
  const linkedEvent = notification.eventId ? events.find((e) => e.id === notification.eventId) : undefined;
  const isTaskDone = !!linkedTask && (linkedTask.status === 'completed' || linkedTask.status === 'validated');
  const isEventPast = !!linkedEvent && !!linkedEvent.startTime && new Date(linkedEvent.startTime).getTime() < Date.now();
  const isObsolete = isTaskDone || isEventPast;

  useEffect(() => {
    let mounted = true;
    if (notification.categoryId && notification.resourceItemId) {
      getResourceItemById(notification.resourceItemId).then((item) => {
        if (mounted) setResourceItem(item);
      });
    }
    return () => { mounted = false; };
  }, [notification.resourceItemId, notification.categoryId, getResourceItemById]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 40,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 40,
      friction: 6,
    }).start();
  };

  const getIconForType = () => {
    if (notification.taskId) return <CheckSquare size={20} color="#ffffff" />;
    if (notification.eventId) return <Calendar size={20} color="#ffffff" />;
    if (notification.categoryId && notification.resourceItemId && resourceItem) {
      return resourceItem.type === 'folder'
        ? <Folder size={20} color="#ffffff" />
        : <FileText size={20} color="#ffffff" />;
    }
    if (notification.categoryId) return <Folder size={20} color="#ffffff" />;
    return <Bell size={20} color="#ffffff" />;
  };

  // Couleur de l'icône / accent : varie selon le type pour donner du rythme
  // visuel à la liste sans tout uniformiser sur theme.primary.
  const getAccentColor = () => {
    if (notification.taskId) return '#5b8def';
    if (notification.eventId) return '#9b59b6';
    if (notification.categoryId) return '#27ae60';
    return theme.primary;
  };

  const accent = isObsolete ? theme.inactive : getAccentColor();
  const isUnread = !notification.read && !isObsolete;
  const isActionable = !!(notification.taskId || notification.eventId || notification.categoryId);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      delayLongPress={500}
      delayPressIn={0}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: isUnread
              ? (darkMode ? `${accent}18` : `${accent}10`)
              : theme.card,
            borderLeftColor: isUnread ? accent : 'transparent',
            transform: [{ scale: pressAnim }],
            opacity: isObsolete ? 0.55 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isUnread ? accent : theme.inactive,
              ...Platform.select({
                ios: {
                  shadowColor: isUnread ? accent : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isUnread ? 0.3 : 0.1,
                  shadowRadius: 3,
                },
                android: { elevation: isUnread ? 3 : 1 },
              }),
            },
          ]}
        >
          {getIconForType()}
          {isUnread && (
            <View style={[styles.unreadDot, { backgroundColor: theme.background, borderColor: accent }]} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.title,
                {
                  color: theme.text,
                  fontWeight: isUnread ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {isActionable && (
              <ChevronRight size={16} color={theme.inactive} style={styles.chevron} />
            )}
          </View>

          <Text
            style={[styles.message, { color: darkMode ? '#bbbbbb' : '#555555' }]}
            numberOfLines={3}
          >
            {notification.message}
          </Text>

          <View style={styles.footerRow}>
            <View style={styles.timeAndStatus}>
              <Text style={[styles.time, { color: theme.inactive }]}>
                {formatRelativeDate(new Date(notification.createdAt))}
              </Text>
              {/* Indicateur ✓ / ✓✓ style WhatsApp — masqué sur les notifs obsolètes
                  pour ne pas brouiller la sémantique avec le badge "Terminée". */}
              {!isObsolete && (
                isUnread ? (
                  <Check size={14} color={theme.inactive} strokeWidth={2.5} />
                ) : (
                  <CheckCheck size={14} color={accent} strokeWidth={2.5} />
                )
              )}
            </View>
            {isObsolete && (
              <View style={[styles.obsoleteBadge, { backgroundColor: darkMode ? '#2a2a2a' : '#e8e8e8' }]}>
                <Check size={10} color={darkMode ? '#888' : '#666'} />
                <Text style={[styles.obsoleteText, { color: darkMode ? '#aaa' : '#666' }]}>
                  {isTaskDone ? 'Tâche terminée' : 'Événement passé'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const NotificationItem = React.memo(NotificationItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 12, // visuel équilibré avec borderLeft 4
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    borderLeftWidth: 4,
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  chevron: {
    marginLeft: 8,
    opacity: 0.5,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 6,
  },
  time: {
    fontSize: 11.5,
    fontWeight: '500',
    opacity: 0.7,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  obsoleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  obsoleteText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
