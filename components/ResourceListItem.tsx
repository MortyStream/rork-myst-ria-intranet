import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from './Card';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { ResourceItem, ResourceItemType } from '@/types/resource';
import { Folder, FileText, Link, Image, AlignLeft, ChevronRight, EyeOff } from 'lucide-react-native';

interface ResourceListItemProps {
  item: ResourceItem;
  onPress?: () => void;
}

export const ResourceListItem: React.FC<ResourceListItemProps> = ({ item, onPress }) => {
  const router = useRouter();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const getIcon = () => {
    switch (item.type) {
      case 'folder':
        return <Folder size={24} color={theme.primary} />;
      case 'file':
        return <FileText size={24} color={theme.primary} />;
      case 'link':
        return <Link size={24} color={theme.primary} />;
      case 'image':
        return <Image size={24} color={theme.primary} />;
      case 'text':
        return <AlignLeft size={24} color={theme.primary} />;
      default:
        return <FileText size={24} color={theme.primary} />;
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (item.type === 'folder') {
      router.push(`/resources/${item.categoryId}?folder=${item.id}`);
    }
  };

  return (
    <Card onPress={handlePress} style={styles.container}>
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description && (
          <Text
            style={[styles.description, { color: theme.inactive }]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        )}
      </View>
      <View style={styles.rightContainer}>
        {item.hidden && (
          <View style={styles.hiddenBadge}>
            <EyeOff size={16} color="#ffffff" />
          </View>
        )}
        {item.type === 'folder' && (
          <ChevronRight size={20} color={theme.inactive} />
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    marginRight: 14,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiddenBadge: {
    backgroundColor: '#888888',
    borderRadius: 12,
    padding: 4,
    marginRight: 8,
  },
});