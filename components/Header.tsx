import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onTitlePress?: () => void;
  rightComponent?: React.ReactNode;
  titleStyle?: object;
  containerStyle?: object;
  noLeftMargin?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  onTitlePress,
  rightComponent,
  titleStyle,
  containerStyle,
  noLeftMargin = false,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.background },
      containerStyle
    ]}>
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity
            onPress={onBackPress}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={onTitlePress}
          style={[
            styles.titleContainer,
            noLeftMargin && styles.titleContainerNoMargin
          ]}
          disabled={!onTitlePress}
          activeOpacity={onTitlePress ? 0.7 : 1}
        >
          <Text 
            style={[
              styles.title, 
              { color: theme.text },
              !showBackButton && styles.titleWithoutBackButton,
              onTitlePress && styles.clickableTitle,
              titleStyle
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </TouchableOpacity>
      </View>
      {rightComponent && (
        <View style={styles.rightContainer}>
          {rightComponent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8, // Reduced from 12
    borderBottomWidth: Platform.OS === 'ios' ? 0 : 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    height: Platform.OS === 'ios' ? 44 : 56, // Explicit height
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  titleContainerNoMargin: {
    marginLeft: 0,
  },
  title: {
    fontSize: 18, // Reduced from 20
    fontWeight: '600',
  },
  titleWithoutBackButton: {
    marginLeft: 8,
  },
  clickableTitle: {
    opacity: 0.9,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});