import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';

export default function LinksScreen() {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [toggleSidebar, setToggleSidebar] = React.useState<(() => void) | null>(null);

  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header
          title="Liens 🔗"
          onTitlePress={() => toggleSidebar?.()}
        />
        <View style={styles.content}>
          <Text style={[styles.text, { color: theme.text }]}>
            Page des liens - À implémenter
          </Text>
        </View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
  },
});