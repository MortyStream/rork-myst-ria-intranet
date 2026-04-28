import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Edit, Shield, ShieldCheck, ShieldAlert, User as UserIcon } from 'lucide-react-native';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { Avatar } from '@/components/Avatar';
import { User } from '@/types/user';
import { AppLayout } from '@/components/AppLayout';

type RoleKey = 'admin' | 'moderator' | 'committee' | 'user';

const ROLES: { key: RoleKey; label: string; color: string }[] = [
  { key: 'admin',     label: 'Admin',       color: '#e53935' },
  { key: 'moderator', label: 'Modérateur',  color: '#fb8c00' },
  { key: 'committee', label: 'Comité',      color: '#8e24aa' },
  { key: 'user',      label: 'Membre',      color: '#1e88e5' },
];

function getRoleInfo(role: string) {
  return ROLES.find(r => r.key === role) ?? { key: role, label: role, color: '#888' };
}

export default function UsersScreen() {
  const router = useRouter();
  const { users, isLoading, error, initializeUsers, updateUserRole, toggleUserEditable } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const appColors = useAppColors();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { initializeUsers(); }, []);

  const filtered = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await initializeUsers();
    setIsRefreshing(false);
  };

  const handleChangeRole = (user: User) => {
    const roleOptions = ROLES.map(r => ({
      text: r.key === user.role ? `✓ ${r.label}` : r.label,
      onPress: async () => {
        if (r.key === user.role) return;
        try {
          await updateUserRole(user.id, r.key);
        } catch (e: any) {
          Alert.alert('Erreur', e.message ?? 'Impossible de changer le rôle.');
        }
      },
    }));

    Alert.alert(
      `Rôle de ${user.firstName} ${user.lastName}`,
      'Choisissez un rôle :',
      [
        ...roleOptions,
        { text: 'Annuler', style: 'cancel' as const },
      ]
    );
  };

  const handleToggleEditable = (user: User) => {
    const next = !user.editable;
    Alert.alert(
      next ? 'Rendre modifiable' : 'Verrouiller le profil',
      `${user.firstName} ${user.lastName} pourra ${next ? '' : 'ne plus '}modifier son profil.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const ok = await toggleUserEditable(user.id, next);
            if (!ok) Alert.alert('Erreur', 'Impossible de modifier le statut.');
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: User }) => {
    const roleInfo = getRoleInfo(item.role ?? 'user');
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Ligne principale */}
        <View style={styles.cardTop}>
          <Avatar
            source={item.profileImage ? { uri: item.profileImage } : undefined}
            name={`${item.firstName} ${item.lastName}`}
            size={44}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={[styles.userEmail, { color: theme.inactive }]} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          {/* Badge rôle */}
          <TouchableOpacity
            style={[styles.roleBadge, { backgroundColor: `${roleInfo.color}20`, borderColor: `${roleInfo.color}60` }]}
            onPress={() => handleChangeRole(item)}
          >
            <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${appColors.primary}15` }]}
            onPress={() => router.push({ pathname: '/admin/user-form', params: { id: item.id } })}
          >
            <Edit size={14} color={appColors.primary} />
            <Text style={[styles.actionBtnText, { color: appColors.primary }]}>Modifier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${roleInfo.color}15` }]}
            onPress={() => handleChangeRole(item)}
          >
            <Shield size={14} color={roleInfo.color} />
            <Text style={[styles.actionBtnText, { color: roleInfo.color }]}>Changer le rôle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, {
              backgroundColor: item.editable ? `${theme.error}15` : `${theme.success}15`
            }]}
            onPress={() => handleToggleEditable(item)}
          >
            <Text style={[styles.actionBtnText, {
              color: item.editable ? theme.error : theme.success
            }]}>
              {item.editable ? '🔓 Verrouiller' : '🔒 Déverrouiller'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <AppLayout>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Gestion des utilisateurs"
          showBackButton={true}
          onBackPress={() => router.back()}
          rightComponent={
            <TouchableOpacity onPress={() => router.push('/admin/user-form')} style={styles.addButton}>
              <Plus size={24} color={theme.text} />
            </TouchableOpacity>
          }
        />

        {/* Barre de recherche */}
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={18} color={theme.inactive} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher un utilisateur..."
            placeholderTextColor={theme.inactive}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Compteurs par rôle */}
        <View style={styles.roleStats}>
          {ROLES.map(r => {
            const count = users.filter(u => u.role === r.key).length;
            if (count === 0) return null;
            return (
              <View key={r.key} style={[styles.roleStat, { backgroundColor: `${r.color}18` }]}>
                <Text style={[styles.roleStatCount, { color: r.color }]}>{count}</Text>
                <Text style={[styles.roleStatLabel, { color: r.color }]}>{r.label}</Text>
              </View>
            );
          })}
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: `${theme.error}20` }]}>
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          </View>
        )}

        {isLoading && !isRefreshing ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={appColors.primary} />
            <Text style={[styles.loaderText, { color: theme.inactive }]}>Chargement...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <EmptyState
                title="Aucun utilisateur"
                message={searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Aucun utilisateur trouvé."}
                icon={<UserIcon size={48} color={theme.inactive} />}
              />
            }
          />
        )}
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addButton: { padding: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  roleStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  roleStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  roleStatCount: { fontSize: 13, fontWeight: '700' },
  roleStatLabel: { fontSize: 12, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  userEmail: { fontSize: 13 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: { fontSize: 12, fontWeight: '500' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14 },
  errorBanner: { margin: 16, padding: 12, borderRadius: 8 },
  errorText: { fontSize: 14, textAlign: 'center' },
});
