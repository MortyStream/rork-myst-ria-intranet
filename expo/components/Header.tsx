import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onTitlePress?: () => void;
  /** @deprecated use onTitlePress instead */
  onMenuPress?: () => void;
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
  onMenuPress,
  rightComponent,
  titleStyle,
  containerStyle,
  noLeftMargin = false,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  // Fallback compat : onMenuPress se comporte comme onTitlePress
  const pressHandler = onTitlePress ?? onMenuPress;

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.background, borderBottomColor: theme.border },
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
          onPress={pressHandler}
          style={[
            styles.titleContainer,
            noLeftMargin && styles.titleContainerNoMargin
          ]}
          disabled={!pressHandler}
          activeOpacity={pressHandler ? 0.6 : 1}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityLabel={pressHandler ? `${title}, appuyer pour ouvrir le menu` : title}
        >
          <View style={styles.titleInner}>
            <Text
              style={[
                styles.title,
                { color: theme.text },
                !showBackButton && styles.titleWithoutBackButton,
                titleStyle
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {pressHandler && (
              <ChevronDown
                size={20}
                color={theme.text}
                style={styles.titleCaret}
                strokeWidth={2.5}
              />
            )}
          </View>
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
    paddingVertical: 10,
    borderBottomWidth: Platform.OS === 'ios' ? 0 : StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 52 : 60,
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
  titleInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleCaret: {
    marginLeft: 6,
    opacity: 0.5,
    marginTop: 2,
  },
  titleContainerNoMargin: {
    marginLeft: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  titleWithoutBackButton: {
    marginLeft: 8,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});