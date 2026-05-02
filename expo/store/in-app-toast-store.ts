import { create } from 'zustand';
import { Notification } from '@/types/notification';

interface InAppToastState {
  current: Notification | null;
  show: (notif: Notification) => void;
  hide: () => void;
}

/**
 * State global pour le toast in-app de notification (pop-up haut style WhatsApp).
 *
 * Le composant <InAppNotificationToast> mounté au root de _layout.tsx lit ce
 * store et s'affiche slide-down quand `current` n'est pas null.
 *
 * Source d'événements : subscriber Realtime sur la table `notifications` dans
 * _layout.tsx qui détecte les INSERT et appelle `show(notif)` après filtrage
 * sur l'user courant.
 *
 * Pas persisté — c'est de l'état UI éphémère, pas pertinent à recharger.
 */
export const useInAppToastStore = create<InAppToastState>((set) => ({
  current: null,
  show: (notif) => set({ current: notif }),
  hide: () => set({ current: null }),
}));
