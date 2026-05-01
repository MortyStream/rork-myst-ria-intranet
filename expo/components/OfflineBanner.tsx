import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { usePendingQueueStore } from '@/store/pending-queue-store';

/**
 * Toast "Hors ligne" — pill compacte en bas de l'écran qui apparaît seulement
 * quand le device perd Internet. Disparaît auto au retour de la connexion.
 *
 * Pourquoi en bas plutôt qu'en haut :
 * - Ne masque pas la status bar / notch
 * - Plus discret, pas anxiogène
 * - Conditional render → 0 pixel résiduel quand online
 */

// État partagé entre tous les usagers de useIsOnline
let _globalOnline = true;
const _listeners = new Set<(online: boolean) => void>();
// Listeners spécifiques aux *transitions* (pas chaque check). Utile pour
// déclencher des actions one-shot comme flushPendingQueue() au retour online.
const _transitionListeners = new Set<(transition: 'online' | 'offline') => void>();

const setGlobalOnline = (online: boolean) => {
  const prev = _globalOnline;
  _globalOnline = online;
  _listeners.forEach((cb) => cb(online));
  if (prev !== online) {
    const transition: 'online' | 'offline' = online ? 'online' : 'offline';
    _transitionListeners.forEach((cb) => {
      try { cb(transition); } catch (e) { console.log('[NetTransition] listener error:', e); }
    });
  }
};

/** Getter synchrone — utilisable depuis n'importe où (store actions, etc.). */
export const getIsOnline = (): boolean => _globalOnline;

/**
 * Souscrit aux transitions online/offline (passages d'un état à l'autre).
 * Retourne une fonction de désinscription.
 */
export const onNetworkTransition = (
  cb: (transition: 'online' | 'offline') => void
): (() => void) => {
  _transitionListeners.add(cb);
  return () => { _transitionListeners.delete(cb); };
};

/**
 * Hook réutilisable : retourne `true` si le device est connecté.
 * Utile pour disable des boutons ou afficher un message dans des forms.
 */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(_globalOnline);
  useEffect(() => {
    const cb = (val: boolean) => setOnline(val);
    _listeners.add(cb);
    return () => { _listeners.delete(cb); };
  }, []);
  return online;
}

export const OfflineBanner: React.FC = () => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [isOffline, setIsOffline] = useState(false);
  // shouldRender contrôle le mount/unmount complet (évite tout pixel résiduel)
  const [shouldRender, setShouldRender] = useState(false);
  // Compteur d'actions en attente de sync — affiché dans le pill quand > 0
  const pendingCount = usePendingQueueStore((s) => s.actions.length);
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(40)).current;

  // Souscription NetInfo (lazy require pour éviter de planter en SSR/test)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    (async () => {
      try {
        const NetInfo = await import('@react-native-community/netinfo');

        const state = await NetInfo.default.fetch();
        if (!mounted) return;
        const online = !!state.isConnected && state.isInternetReachable !== false;
        setIsOffline(!online);
        setGlobalOnline(online);

        unsubscribe = NetInfo.default.addEventListener((s) => {
          const isOnline = !!s.isConnected && s.isInternetReachable !== false;
          setIsOffline(!isOnline);
          setGlobalOnline(isOnline);
        });
      } catch (err) {
        console.log('[OfflineBanner] NetInfo unavailable:', err);
      }
    })();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Mount/unmount + animations
  useEffect(() => {
    if (isOffline) {
      // Apparition : mount d'abord, puis fade-in + slide-up
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (shouldRender) {
      // Disparition : fade-out + slide-down, puis unmount complet
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 40,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Unmount après l'animation pour libérer 100% du DOM/JSX
        setShouldRender(false);
      });
    }
  }, [isOffline, opacityAnim, translateAnim, shouldRender]);

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.pill, { backgroundColor: theme.warning }]}>
        <WifiOff size={14} color="#000" />
        <Text style={styles.text} numberOfLines={1}>
          {pendingCount > 0
            ? `Hors ligne · ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente`
            : 'Hors ligne'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  text: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
