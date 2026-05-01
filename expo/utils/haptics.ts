import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Wrapper haptic feedback — vibrations courtes natives sur iOS Taptic Engine
 * et Android (selon device).
 *
 * Règles d'usage (anti-fatigue tactile) :
 * - JAMAIS sur tap simple de navigation (saturation)
 * - OUI sur actions confirmées : check/uncheck, RSVP, save, delete
 * - OUI sur succès/erreur après une opération réseau
 *
 * No-op sur web et plateformes non supportées.
 */

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Tap léger — pour les actions discrètes : toggle de tâche, sélection, send commentaire.
 * iOS : ImpactFeedbackStyle.Light
 */
export function tapHaptic(): void {
  if (!isSupported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/**
 * Tap moyen — pour les actions plus engageantes : ouverture d'un menu, confirmation.
 */
export function mediumHaptic(): void {
  if (!isSupported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/**
 * Feedback de succès — sauvegarde profil, RSVP envoyé, tâche créée, bug reporté.
 * Triple-tap pattern reconnaissable.
 */
export function successHaptic(): void {
  if (!isSupported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/**
 * Feedback de warning — pour les actions destructives confirmées (suppression).
 */
export function warningHaptic(): void {
  if (!isSupported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/**
 * Feedback d'erreur — pour les échecs (mauvais mdp, upload échoué, etc.).
 */
export function errorHaptic(): void {
  if (!isSupported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

/**
 * Feedback de sélection — quand on parcourt un picker, switch de filtre, etc.
 * Plus subtil que tapHaptic.
 */
export function selectionHaptic(): void {
  if (!isSupported) return;
  Haptics.selectionAsync().catch(() => {});
}
