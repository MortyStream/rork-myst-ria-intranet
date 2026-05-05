import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { tapHaptic, mediumHaptic, successHaptic, warningHaptic, selectionHaptic } from '@/utils/haptics';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type HapticVariant = 'light' | 'medium' | 'success' | 'warning' | 'selection';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'ghost'; // Added 'ghost' as a valid variant
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  small?: boolean;
  // Opt-in haptic. OFF par défaut — anti-saturation tactile (cf. utils/haptics.ts).
  // Utiliser uniquement sur actions confirmées (save, delete, RSVP), pas sur navigation.
  haptic?: HapticVariant;
  // Anti double-tap : bloque les presses dans une fenêtre de 500ms après le 1er.
  // ON par défaut — protège des navigations en double (router.push 2x), des
  // créations en double (POST). Désactiver pour les actions intentionnellement
  // répétables (counter, reorder, picker incrémental).
  allowRapidPress?: boolean;
  // Label d'accessibilité pour VoiceOver/TalkBack. Si absent, fallback sur le
  // title. Indispensable pour les boutons icône-only (App Store Review).
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  small = false,
  haptic,
  allowRapidPress = false,
  accessibilityLabel,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  // Timestamp du dernier press accepté. On bloque tout press qui arrive
  // dans les 500ms suivants (sauf si allowRapidPress=true). Évite typiquement
  // les router.push en double quand le user tape impatiemment pendant le
  // transition de navigation (lent en Expo Go notamment).
  const lastPressAt = useRef<number>(0);

  // Scale press subtil = feedback visuel universel. Spring rapide pour rester
  // snappy. useNativeDriver pour pas bloquer le JS thread.
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const triggerHaptic = () => {
    switch (haptic) {
      case 'light': tapHaptic(); break;
      case 'medium': mediumHaptic(); break;
      case 'success': successHaptic(); break;
      case 'warning': warningHaptic(); break;
      case 'selection': selectionHaptic(); break;
    }
  };

  const handlePress = () => {
    if (!allowRapidPress) {
      const now = Date.now();
      if (now - lastPressAt.current < 500) return;
      lastPressAt.current = now;
    }
    triggerHaptic();
    onPress();
  };
  
  // Map variant to styles
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? `${theme.primary}80` : theme.primary,
          borderColor: 'transparent',
        };
      case 'secondary':
        return {
          backgroundColor: disabled ? `${theme.secondary}80` : theme.secondary,
          borderColor: 'transparent',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: disabled ? `${theme.primary}80` : theme.primary,
          borderWidth: 1,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: disabled ? `${theme.primary}80` : theme.primary,
          borderColor: 'transparent',
        };
    }
  };
  
  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
      case 'secondary':
        return { color: '#ffffff' };
      case 'outline':
      case 'text':
      case 'ghost':
        return { color: disabled ? `${theme.primary}80` : theme.primary };
      default:
        return { color: '#ffffff' };
    }
  };
  
  const buttonStyles = [
    styles.button,
    getButtonStyle(),
    small && styles.smallButton,
    fullWidth && styles.fullWidth,
    style,
    { transform: [{ scale: scaleAnim }] },
  ];

  const textStyles = [
    styles.text,
    getTextStyle(),
    small && styles.smallText,
    textStyle,
  ];

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'secondary' ? '#ffffff' : theme.primary}
        />
      ) : (
        <View style={styles.contentContainer}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          {title && <Text style={textStyles}>{title}</Text>}
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </>
  );

  // On anime le TouchableOpacity directement (via AnimatedTouchableOpacity)
  // au lieu de le wrapper dans un Animated.View. Avantage : aucun split de
  // layout entre wrapper et inner — le bouton est UN seul composant qui
  // participe au layout du parent comme avant V3c. Le scale press est juste
  // une transform visuelle, ne casse aucun flex/wrap/minWidth.
  return (
    <AnimatedTouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {content}
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  smallText: {
    fontSize: 14,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});