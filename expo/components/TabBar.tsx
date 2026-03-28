import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ViewStyle,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
  style?: ViewStyle;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs = [], 
  activeTab,
  onTabPress,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  // Safety check to ensure tabs is an array
  const tabItems = Array.isArray(tabs) ? tabs : [];
  
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {tabItems.map((tab) => {
        const isActive = activeTab === tab.key;
        
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <View style={styles.iconContainer}>
                {tab.icon}
                
                {!!tab.badgeCount && tab.badgeCount > 0 && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.notification },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? theme.primary : theme.inactive,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});