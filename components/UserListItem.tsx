import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User } from '@/types/user';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { ChevronRight, Mail, Phone, Edit } from 'lucide-react-native';

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
        return 'Administrateur';
      case 'committee':
        return 'Membre du comité';
      case 'actor':
        return 'Comédien';
      case 'partner':
        return 'Partenaire';
      default:
        return 'Membre';
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card },
        !user.editable && styles.nonEditableContainer
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Avatar
            source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
            name={`${user.firstName} ${user.lastName}`}
            size={56}
          />
          {isEditable && (
            <View style={[styles.linkedBadge, { backgroundColor: theme.primary }]}>
              <Edit size={10} color="#FFFFFF" />
            </View>
          )}
        </View>
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
            {!user.editable && (
              <Badge
                label="Non modifiable"
                variant="error"
                size="small"
                style={styles.nonEditableBadge}
              />
            )}
            {isEditable && (
              <Badge
                label="Éditable"
                variant="success"
                size="small"
                style={styles.editableBadge}
              />
            )}
          </View>
        </View>
        {showChevron && (
          <ChevronRight size={20} color={darkMode ? theme.inactive : '#999999'} />
        )}
      </View>
      {showContactInfo && (
        <View style={styles.contactInfo}>
          {user.email && (
            <View style={styles.contactItem}>
              <Mail size={16} color={theme.inactive} style={styles.contactIcon} />
              <Text style={[styles.contactText, { color: theme.text }]}>
                {user.email}
              </Text>
            </View>
          )}
          {user.phone && (
            <View style={styles.contactItem}>
              <Phone size={16} color={theme.inactive} style={styles.contactIcon} />
              <Text style={[styles.contactText, { color: theme.text }]}>
                {user.phone}
              </Text>
            </View>
          )}
        </View>
      )}
      {user.sectors && user.sectors.length > 0 && (
        <View style={styles.sectorsContainer}>
          {user.sectors.map((sector, index) => (
            <View 
              key={index} 
              style={[
                styles.sectorBadge, 
                { backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' },
                sector.isResponsible ? { 
                  backgroundColor: darkMode ? 'rgba(194, 46, 15, 0.2)' : 'rgba(194, 46, 15, 0.1)' 
                } : {}
              ]}
            >
              <Text 
                style={[
                  styles.sectorText, 
                  { color: theme.text },
                  sector.isResponsible ? { color: theme.primary, fontWeight: '500' } : {}
                ]}
                numberOfLines={1}
              >
                {sector.name}
                {sector.isResponsible ? ' (Resp.)' : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    position: 'relative',
  },
  nonEditableContainer: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  linkedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
  nonEditableBadge: {
    marginRight: 4,
    marginBottom: 4,
  },
  editableBadge: {
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
  sectorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginLeft: 72,
  },
  sectorBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  sectorText: {
    fontSize: 12,
  },
});