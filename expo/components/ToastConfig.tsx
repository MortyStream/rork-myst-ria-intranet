import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

/**
 * Toasts custom — remplace l'apparence par défaut blanche de
 * react-native-toast-message qui jurait en dark mode. Même look que les
 * cards de l'app : bg `theme.card`, text `theme.text`, accent border-left
 * coloré selon le type (success vert, error rouge, info bleu).
 *
 * Branché dans `_layout.tsx` via <Toast config={toastConfig} />.
 */

interface ToastBaseProps {
  text1?: string;
  text2?: string;
}

const SuccessToast: React.FC<ToastBaseProps> = ({ text1, text2 }) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const accent = theme.success;
  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderLeftColor: accent }]}>
      <View style={[styles.iconBubble, { backgroundColor: `${accent}22` }]}>
        <CheckCircle size={18} color={accent} />
      </View>
      <View style={styles.content}>
        {text1 ? (
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.message, { color: darkMode ? '#bbbbbb' : '#555555' }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const ErrorToast: React.FC<ToastBaseProps> = ({ text1, text2 }) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const accent = theme.error;
  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderLeftColor: accent }]}>
      <View style={[styles.iconBubble, { backgroundColor: `${accent}22` }]}>
        <AlertCircle size={18} color={accent} />
      </View>
      <View style={styles.content}>
        {text1 ? (
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.message, { color: darkMode ? '#bbbbbb' : '#555555' }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const InfoToast: React.FC<ToastBaseProps> = ({ text1, text2 }) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const accent = theme.info;
  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderLeftColor: accent }]}>
      <View style={[styles.iconBubble, { backgroundColor: `${accent}22` }]}>
        <Info size={18} color={accent} />
      </View>
      <View style={styles.content}>
        {text1 ? (
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.message, { color: darkMode ? '#bbbbbb' : '#555555' }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export const toastConfig = {
  success: (props: any) => <SuccessToast text1={props.text1} text2={props.text2} />,
  error: (props: any) => <ErrorToast text1={props.text1} text2={props.text2} />,
  info: (props: any) => <InfoToast text1={props.text1} text2={props.text2} />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    maxWidth: 420,
    minHeight: 60,
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 17,
  },
});
