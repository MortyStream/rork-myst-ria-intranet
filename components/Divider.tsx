import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';

interface DividerProps {
  style?: ViewStyle;
  vertical?: boolean;
  thickness?: number;
  margin?: number;
}

export const Divider: React.FC<DividerProps> = ({
  style,
  vertical = false,
  thickness = 1,
  margin = 8,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const dividerStyle: ViewStyle = {
    backgroundColor: theme.border,
    ...(vertical
      ? {
          width: thickness,
          height: '100%',
          marginHorizontal: margin,
        }
      : {
          height: thickness,
          width: '100%',
          marginVertical: margin,
        }),
  };
  
  return <View style={[dividerStyle, style]} />;
};

const styles = StyleSheet.create({});