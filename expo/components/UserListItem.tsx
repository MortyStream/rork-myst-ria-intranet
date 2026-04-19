import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User } from '@/types/user';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { ChevronRight, Mail, Phone } from 'lucide-react-native';

interface UserListItemProps {
  user: User;
  onPress?: () => void;
  showContactInfo?: boolean;
  showChevron?: boolean;
}

export const UserListItem: React.FC<UserListItemProps> = ({
  user,
  onPress,
  showContactInfo = false,
  showChevron = true,
}) => {
  const { darkMode } = useSettingsStore();
  const { user: currentUser } = useAuthStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const getRoleBadgeVariant = (role: string): 'primary' | 'secondary' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'admin': return 'primary';
      case 'responsable_pole': return 'secondary';
      case 'responsable_secteur': return 'info';
      case 'membre': return 'info';
      default: return 'info';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'responsable_pole': return 'Resp. de pôle';
      case 'responsable_secteur': return 'Resp. de secteur';
      case 'membre': return 'Membre';
      default: return 'Membre';
    }
  };

  const getAssociationRoleLabel = (assocRole?: string): string => {
    switch (assocRole) {
      case 'president': return 'Président';
      case 'vice_president': return 'Vice-Président(e)';
      case 'tresorier': return 'Trésorier';
      case 'secretaire': return 'Secrétaire';
      case 'comite': return 'Comité';
      default: return '';
    }
  };

  const assocLabel = getAssociationRoleLabel((user as any).associationRole);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.card }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Avatar
          source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
          name={`${user.firstName} ${user.lastName}`}
          size={56}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.name, { color: theme.text }]}>
            {user.firstName} {user.lastName}
          </Text>
          <View style={styles.badgesContainer}>
            <Badge
              label={getRoleLabel(user.role)}
              variant={getRoleBadgeVariant(user.role)}
              size="small"
              style={styles.roleBadge}
            />
            {assocLabel ? (
              <Badge
                label={assocLabel}
                variant="success"
                size="small"
                style={styles.roleBadge}
              />
            ) : null}
          </View>
        </View>
        {showChevron ? (
          <ChevronRight size={20} color={darkMode ? theme.inactive : '#999999'} />
        ) : null}
      </View>
      {showContactInfo ? (
        <View style={styles.contactInfo}>
          {user.email ? (
            <View style={styles.contactItem}>
              <Mail size={16} color={theme.inactive} style={styles.contactIcon} />
              <Text style={[styles.contactText, { color: theme.text }]}>{user.email}</Text>
            </View>
          ) : null}
          {user.phone ? (
            <View style={styles.contactItem}>
              <Phone size={16} color={theme.inactive} style={styles.contactIcon} />
              <Text style={[styles.contactText, { color: theme.text }]}>{user.phone}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  roleBadge: {
    marginRight: 4,
    marginBottom: 4,
  },
  contactInfo: {
    marginTop: 12,
    marginLeft: 72,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
  },
});
