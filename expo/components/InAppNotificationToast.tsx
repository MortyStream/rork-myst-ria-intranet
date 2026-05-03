import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Calendar, CheckSquare, Folder } from 'lucide-react-native';
import { useInAppToastStore } from '@/store/in-app-toast-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { tapHaptic } from '@/utils/haptics';

const AUTO_DISMISS_MS = 4500;

/**
 * Toast in-app style WhatsApp : slide-down du haut quand une notif arrive en
 * temps réel (subscriber Realtime sur la table notifications dans _layout.tsx).
 *
 * Comportement :
 * - Slide-in animé (translateY) à l'apparition
 * - Auto-dismiss après 4.5s
 * - Tap → mark as read + deep-link vers la cible (event/task/category)
 * - Swipe vers le haut → dismiss manuel (pas de mark-as-read)
 * - Swipe latéral (gauche ou droite) → mark-as-read + dismiss (style WhatsApp)
 *
 * Le composant lit le store `useInAppToastStore.current`. Quand il est null,
 * on retourne null (pas de mount inutile).
 */
export const InAppNotificationToast: React.FC = () => {
  const router = useRouter();
  const { current, hide } = useInAppToastStore();
  const { markAsRead } = useNotificationsStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const translateY = useRef(new Animated.Value(-200)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide-in à l'apparition + reset du timer auto-dismiss
  useEffect(() => {
    if (!current) {
      // pas de notif active : remettre l'animation hors écran (ne pas leak l'état d'animation entre 2 toasts)
      translateY.setValue(-200);
      translateX.setValue(0);
      return;
    }

    // Animer vers le bas (entrée)
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 9,
    }).start();

    // Programmer auto-dismiss
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      animateOutAndHide();
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const animateOutAndHide = () => {
    Animated.timing(translateY, {
      toValue: -200,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      hide();
    });
  };

  // Swipe latéral assez fort → fly out de côté + mark-as-read + hide
  const animateOutHorizontal = (direction: 'left' | 'right') => {
    Animated.timing(translateX, {
      toValue: direction === 'right' ? 500 : -500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // current peut être null si déjà dismissé (sécu race)
      const id = useInAppToastStore.getState().current?.id;
      if (id) markAsRead(id);
      hide();
      // Reset translateX pour le prochain toast
      translateX.setValue(0);
    });
  };

  // PanResponder : gère swipe vertical (haut → dismiss) ET latéral (gauche/droite
  // → mark-as-read + dismiss style WhatsApp). On choisit l'axe au démarrage du
  // geste selon le delta dominant pour éviter le drag diagonal weird.
  const gestureAxis = useRef<'horizontal' | 'vertical' | null>(null);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 5 || Math.abs(g.dx) > 5,
      onPanResponderGrant: () => {
        gestureAxis.current = null;
      },
      onPanResponderMove: (_, g) => {
        // Bloquer l'axe au premier mouvement significatif
        if (!gestureAxis.current) {
          if (Math.abs(g.dx) > Math.abs(g.dy)) {
            gestureAxis.current = 'horizontal';
          } else if (g.dy < 0) {
            // Vertical autorisé uniquement vers le haut
            gestureAxis.current = 'vertical';
          }
        }
        if (gestureAxis.current === 'horizontal') {
          translateX.setValue(g.dx);
        } else if (gestureAxis.current === 'vertical' && g.dy < 0) {
          translateY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (gestureAxis.current === 'horizontal') {
          if (Math.abs(g.dx) > 80) {
            animateOutHorizontal(g.dx > 0 ? 'right' : 'left');
          } else {
            // Snap back horizontal
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 60,
              friction: 9,
            }).start();
          }
        } else if (gestureAxis.current === 'vertical') {
          if (g.dy < -40) {
            animateOutAndHide();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 60,
              friction: 9,
            }).start();
          }
        }
        gestureAxis.current = null;
      },
    })
  ).current;

  if (!current) return null;

  const handlePress = () => {
    tapHaptic();
    markAsRead(current.id);

    // Deep-link cohérent avec la logique de notifications.tsx
    if (current.eventId) {
      router.push({ pathname: '/calendar/event-detail', params: { id: current.eventId } });
    } else if (current.taskId) {
      router.push({ pathname: '/tasks', params: { highlightId: current.taskId } });
    } else if (current.categoryId) {
      router.push({ pathname: '/resources/[id]', params: { id: current.categoryId } });
    }
    // Sinon notif info pure : on ferme juste

    animateOutAndHide();
  };

  // Couleur d'accent selon le type, comme dans NotificationItem
  const getAccent = () => {
    if (current.taskId) return '#5b8def';
    if (current.eventId) return '#9b59b6';
    if (current.categoryId) return '#27ae60';
    return theme.primary;
  };

  const getIcon = () => {
    if (current.taskId) return <CheckSquare size={20} color="#ffffff" />;
    if (current.eventId) return <Calendar size={20} color="#ffffff" />;
    if (current.categoryId) return <Folder size={20} color="#ffffff" />;
    return <Bell size={20} color="#ffffff" />;
  };

  const accent = getAccent();

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateY }, { translateX }] },
      ]}
      pointerEvents="box-none"
      {...panResponder.panHandlers}
    >
      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handlePress}
          style={[
            styles.card,
            {
              backgroundColor: darkMode ? '#1f1f1f' : '#ffffff',
              borderLeftColor: accent,
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: accent }]}>
            {getIcon()}
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {current.title}
            </Text>
            <Text
              style={[styles.message, { color: darkMode ? '#bbbbbb' : '#555555' }]}
              numberOfLines={2}
            >
              {current.message}
            </Text>
          </View>
          {/* Petite barre handle visuelle pour suggérer le swipe */}
          <View style={[styles.handleBar, { backgroundColor: darkMode ? '#444' : '#ccc' }]} />
        </TouchableOpacity>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: Platform.OS === 'android' ? 8 : 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingRight: 18,
    borderRadius: 16,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  handleBar: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
});
