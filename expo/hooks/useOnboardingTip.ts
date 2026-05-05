import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const STORAGE_KEY = 'onboarding-tips-seen-v1';

/**
 * Identifiants des tips disponibles dans l'app. Ajouter une entrée ici plutôt
 * qu'un string libre pour éviter les typos ("longpress" vs "long-press") qui
 * casseraient la dédup.
 */
export type OnboardingTipKey =
  | 'tasks-long-press'
  | 'events-long-press'
  | 'comment-long-press';

const TIP_MESSAGES: Record<OnboardingTipKey, { text1: string; text2: string }> = {
  'tasks-long-press': {
    text1: '💡 Astuce',
    text2: 'Appui long sur une tâche pour la supprimer.',
  },
  'events-long-press': {
    text1: '💡 Astuce',
    text2: 'Appui long sur un événement pour le supprimer.',
  },
  'comment-long-press': {
    text1: '💡 Astuce',
    text2: 'Appui long sur un commentaire pour réagir avec un emoji.',
  },
};

async function readSeen(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function markSeen(key: OnboardingTipKey) {
  try {
    const seen = await readSeen();
    if (seen.has(key)) return;
    seen.add(key);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // best-effort
  }
}

/**
 * Affiche une fois (et une seule) un Toast info avec le tip associé à `key`.
 * Activation conditionnelle via `enabled` — utile pour attendre que le contexte
 * pertinent soit prêt (ex: liste populée, screen monté côté user authentifié).
 *
 * Le marquage "vu" est immédiat dès le show — on ne replay PAS le tip si l'user
 * close avant la fin de visibilityTime. C'est volontaire : le but est de donner
 * l'info une fois, pas d'imposer une lecture complète.
 */
export function useOnboardingTip(key: OnboardingTipKey, enabled: boolean = true) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled || firedRef.current) return;
    let cancelled = false;
    readSeen().then((seen) => {
      if (cancelled || firedRef.current) return;
      if (seen.has(key)) {
        firedRef.current = true;
        return;
      }
      firedRef.current = true;
      const msg = TIP_MESSAGES[key];
      Toast.show({
        type: 'info',
        text1: msg.text1,
        text2: msg.text2,
        visibilityTime: 4500,
        position: 'bottom',
      });
      void markSeen(key);
    });
    return () => { cancelled = true; };
  }, [key, enabled]);
}
