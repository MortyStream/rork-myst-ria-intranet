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
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

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
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={buttonStyles}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    </Animated.View>
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