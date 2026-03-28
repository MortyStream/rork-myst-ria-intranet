import React from 'react';
import { 
  View, 
  StyleSheet, 
  ViewStyle, 
  TouchableOpacity, 
  TouchableOpacityProps 
} from 'react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  onLongPress?: () => void;
  touchableProps?: TouchableOpacityProps;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  onLongPress,
  touchableProps
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const cardStyle = [
    styles.card,
    { 
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    style
  ];
  
  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});