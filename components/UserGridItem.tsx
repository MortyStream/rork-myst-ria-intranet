import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { User } from '@/types/user';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { Edit } from 'lucide-react-native';

interface UserGridItemProps {
  user: User;
  onPress?: () => void;
  size?: number;
  style?: ViewStyle;
}

export const UserGridItem: React.FC<UserGridItemProps> = ({
  user,
  onPress,
  size = 100,
  style,
}) => {
  const { darkMode } = useSettingsStore();
  const { user: currentUser } = useAuthStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  // Check if this profile is editable by the current user
  const isEditable = currentUser && (
    user.editable_by === currentUser.id || 
    user.supabaseUserId === currentUser.id
  );
  
  const getRoleBadgeVariant = (role: string): 'primary' | 'secondary' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'admin':
        return 'primary';
      case 'committee':
        return 'secondary';
      case 'actor':
        return 'info';
      case 'partner':
        return 'warning';
      default:
        return 'info';
    }
  };
  
  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'committee':
        return 'Comité';
      case 'actor':
        return 'Comédien';
      case 'partner':
        return 'Partenaire';
      default:
        return 'Membre';
    }
  };
  
  const avatarSize = size * 0.6;
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: size, height: size + 20 },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
          name={`${user.firstName} ${user.lastName}`}
          size={avatarSize}
        />
        {isEditable && (
          <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
            <Edit size={8} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.roleBadgeContainer}>
          <Badge
            label={getRoleLabel(user.role)}
            variant={getRoleBadgeVariant(user.role)}
            size="small"
          />
        </View>
      </View>
      <Text 
        style={[styles.name, { color: theme.text }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {user.firstName} {user.lastName}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 6,
  },
  editBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  roleBadgeContainer: {
    position: 'absolute',
    top: -6,
    alignItems: 'center',
  },
  name: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
});