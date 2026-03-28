import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  showChevron = false,
  onPress,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container
      style={[
        styles.container,
        { borderBottomColor: theme.border },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
      <View style={styles.contentContainer}>
        <Text 
          style={[
            styles.title, 
            { color: theme.text },
            titleStyle
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text 
            style={[
              styles.subtitle, 
              { color: darkMode ? theme.inactive : '#666666' },
              subtitleStyle
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      {showChevron && (
        <View style={styles.chevronContainer}>
          <ChevronRight size={20} color={darkMode ? theme.inactive : '#999999'} />
        </View>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftIconContainer: {
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  rightIconContainer: {
    marginLeft: 12,
  },
  chevronContainer: {
    marginLeft: 8,
  },
});