import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  UserPlus,
  Edit,
  Trash,
  Plus,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useUserGroupsStore } from '@/store/user-groups-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { UserGroup } from '@/types/user-group';

export default function AdminGroupsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { groups, initializeGroups, deleteGroup } = useUserGroupsStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const isAdminOrCommittee = user?.role === 'admin' || user?.role === 'committee' || user?.role === 'moderator';

  useEffect(() => {
    initializeGroups();
  }, []);

  if (!isAdminOrCommittee) {
    router.replace('/admin');
    return null;
  }

  const handleAdd = () => router.push('/admin/group-form');
  const handleEdit = (g: UserGroup) =>
    router.push({ pathname: '/admin/group-form', params: { id: g.id } });

  const handleDelete = (g: UserGroup) => {
    Alert.alert(
      'Confirmer la suppression',
      `Supprimer le groupe "${g.name}" ? Les membres ne seront pas supprimés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(g.id);
              Alert.alert('Succès', 'Groupe supprimé.');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer le groupe.');
            }
          },
        },
      ]
    );
  };

  const renderGroupItem = ({ item }: { item: UserGroup }) => (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: item.color || theme.primary }]}>
          <Text style={styles.iconText}>{item.icon || '👥'}</Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text
              style={[styles.description, { color: darkMode ? theme.inactive : '#666' }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          <View style={styles.memberRow}>
            <Users size={14} color={darkMode ? theme.inactive : '#666'} />
            <Text style={[styles.memberText, { color: darkMode ? theme.inactive : '#666' }]}>
              {item.memberIds.length} membre{item.memberIds.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
          <Edit size={18} color={theme.primary} />
          <Text style={[styles.actionText, { color: theme.primary }]}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Trash size={18} color={theme.error} />
          <Text style={[styles.actionText, { color: theme.error }]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Groupes d'utilisateurs"
        showBackButton={true}
        onBackPress={() => router.back()}
        rightComponent={
          <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
            <Plus size={24} color={theme.text} />
          </TouchableOpacity>
        }
      />
      {groups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="users"
            title="Aucun groupe"
            message="Créez des groupes pour inviter plusieurs personnes d'un coup à vos événements."
          />
          <Button
            title="Créer un groupe"
            onPress={handleAdd}
            leftIcon={<UserPlus size={18} color="#fff" />}
            style={styles.emptyBtn}
          />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { padding: 8 },
  list: { padding: 20 },
  card: { marginBottom: 16, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 20 },
  textBlock: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  description: { fontSize: 13, marginTop: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  memberText: { fontSize: 12 },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    gap: 16,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 14, fontWeight: '500' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyBtn: { marginTop: 16 },
});
