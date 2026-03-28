import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'primary':
        return theme.primary;
      case 'secondary':
        return theme.secondary;
      case 'success':
        return theme.success;
      case 'error':
        return theme.error;
      case 'warning':
        return theme.warning;
      case 'info':
        return theme.info;
      default:
        return theme.primary;
    }
  };
  
  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'small':
        return {
          container: {
            paddingVertical: 2,
            paddingHorizontal: 6,
            borderRadius: 4,
          },
          text: {
            fontSize: 10,
          },
        };
      case 'medium':
        return {
          container: {
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 6,
          },
          text: {
            fontSize: 12,
          },
        };
      case 'large':
        return {
          container: {
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
          },
          text: {
            fontSize: 14,
          },
        };
      default:
        return {
          container: {
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 6,
          },
          text: {
            fontSize: 12,
          },
        };
    }
  };
  
  const sizeStyle = getSizeStyle();
  
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() },
        sizeStyle.container,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          sizeStyle.text,
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
  },
});