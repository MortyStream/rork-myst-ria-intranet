import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Avatar } from './Avatar';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { User } from '@/types/user';

interface UserGridItemProps {
  user: User;
  onPress: () => void;
  size: number;
  style?: object;
  showRoleBadge?: boolean;
}

export const UserGridItem: React.FC<UserGridItemProps> = ({
  user,
  onPress,
  size,
  style,
  showRoleBadge = false,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return '#e03131';
      case 'moderator':
        return '#4c6ef5';
      case 'member':
        return '#37b24d';
      default:
        return '#868e96';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Admin';
      case 'moderator':
        return 'Mod';
      case 'member':
        return 'Membre';
      default:
        return role;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: size },
        style
      ]}
      onPress={onPress}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          uri={user.avatar}
          size={size - 16}
          name={`${user.firstName} ${user.lastName}`}
        />
        {showRoleBadge && (
          <View style={[
            styles.roleBadge,
            { backgroundColor: getRoleBadgeColor(user.role) }
          ]}>
            <Text style={styles.roleBadgeText}>
              {getRoleLabel(user.role)}
            </Text>
          </View>
        )}
      </View>
      <Text 
        style={[styles.name, { color: theme.text }]}
        numberOfLines={1}
      >
        {user.firstName} {user.lastName}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#4c6ef5',
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});