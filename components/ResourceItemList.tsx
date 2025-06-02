import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from './Card';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { ResourceCategory } from '@/types/resource';
import { ChevronRight } from 'lucide-react-native';

interface ResourceItemListProps {
  category: ResourceCategory;
}

export const ResourceItemList: React.FC<ResourceItemListProps> = ({ category }) => {
  const router = useRouter();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const handlePress = () => {
    router.push(`/resources/${category.id}`);
  };

  return (
    <Card onPress={handlePress} style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
        <Text style={styles.emoji}>{category.icon || '📄'}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {category.name}
        </Text>
        {category.description && (
          <Text
            style={[styles.description, { color: theme.inactive }]}
            numberOfLines={2}
          >
            {category.description}
          </Text>
        )}
      </View>
      <ChevronRight size={20} color={theme.inactive} />
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
  },
});