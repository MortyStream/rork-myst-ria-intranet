import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { Button } from './Button';
import { Calendar, AlertCircle, Info, CheckCircle, XCircle, Database, Folder } from 'lucide-react-native';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode | string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  style,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  // Render the appropriate icon component based on the icon prop
  const renderIcon = () => {
    if (!icon) return null;
    
    // If icon is already a React component, return it
    if (React.isValidElement(icon)) {
      return icon;
    }
    
    // If icon is a string, render the appropriate icon component
    if (typeof icon === 'string') {
      const iconSize = 40;
      const iconColor = theme.primary;
      
      switch (icon.toLowerCase()) {
        case 'calendar':
          return <Calendar size={iconSize} color={iconColor} />;
        case 'alert':
          return <AlertCircle size={iconSize} color={iconColor} />;
        case 'info':
          return <Info size={iconSize} color={iconColor} />;
        case 'success':
          return <CheckCircle size={iconSize} color={iconColor} />;
        case 'error':
          return <XCircle size={iconSize} color={iconColor} />;
        case 'database':
          return <Database size={iconSize} color={iconColor} />;
        case 'folder':
          return <Folder size={iconSize} color={iconColor} />;
        default:
          return <Info size={iconSize} color={iconColor} />;
      }
    }
    
    return null;
  };
  
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{renderIcon()}</View>}
      
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      
      {message && (
        <Text style={[styles.message, { color: darkMode ? theme.inactive : '#666666' }]}>
          {message}
        </Text>
      )}
      
      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <Button
            title={actionLabel}
            onPress={onAction}
            variant="primary"
            size="medium"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionContainer: {
    marginTop: 8,
  },
});