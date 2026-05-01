import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';

export interface ConfirmAction {
  /** Texte du bouton. */
  label: string;
  /** Style : 'cancel' = neutre, 'primary' = couleur app, 'destructive' = rouge. */
  style?: 'cancel' | 'primary' | 'destructive';
  onPress?: () => void;
}

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Actions à proposer (1 à 3 boutons). Le dernier est mis en avant. */
  actions: ConfirmAction[];
  onDismiss: () => void;
}

/**
 * Dialog de confirmation custom — remplacement esthétique de Alert.alert.
 *
 * Avantages vs Alert.alert :
 * - Aligné sur le dark/light mode de l'app
 * - Border radius arrondi, backdrop semi-transparent flouté visuellement
 * - Cohérent iOS / Android (Alert.alert est moche sur Android)
 * - Customisable (couleurs des boutons, multi-action)
 *
 * Usage :
 *   <ConfirmModal
 *     visible={showDelete}
 *     title="Supprimer la tâche ?"
 *     message="« X » sera supprimée définitivement."
 *     actions={[
 *       { label: 'Annuler', style: 'cancel' },
 *       { label: 'Supprimer', style: 'destructive', onPress: () => deleteTask(...) },
 *     ]}
 *     onDismiss={() => setShowDelete(false)}
 *   />
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  actions,
  onDismiss,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();

  const getButtonStyle = (style: ConfirmAction['style'] = 'primary') => {
    switch (style) {
      case 'cancel':
        return {
          textColor: darkMode ? '#cccccc' : '#444',
          fontWeight: '500' as const,
        };
      case 'destructive':
        return {
          textColor: theme.error,
          fontWeight: '700' as const,
        };
      case 'primary':
      default:
        return {
          textColor: appColors.primary,
          fontWeight: '700' as const,
        };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      >
        {/* TouchableOpacity inner pour stopper la propagation du tap */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              shadowColor: darkMode ? '#000' : '#000',
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: darkMode ? '#bbb' : '#555' }]}>
              {message}
            </Text>
          ) : null}

          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            {actions.map((action, idx) => {
              const buttonStyle = getButtonStyle(action.style);
              const isLast = idx === actions.length - 1;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.actionButton,
                    !isLast && { borderRightWidth: 1, borderRightColor: theme.border },
                  ]}
                  onPress={() => {
                    onDismiss();
                    // Délai mini pour laisser le modal disparaître avant l'action
                    setTimeout(() => action.onPress?.(), 0);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.actionText,
                      {
                        color: buttonStyle.textColor,
                        fontWeight: buttonStyle.fontWeight,
                      },
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    minHeight: 50,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 16,
    letterSpacing: 0.1,
  },
});
