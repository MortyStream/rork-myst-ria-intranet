import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, UserPlus, X, Users } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useUserGroupsStore } from '@/store/user-groups-store';
import { useUsersStore } from '@/store/users-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';

const GROUP_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#9C27B0', '#FF9800', '#795548', '#607D8B'];
const GROUP_ICONS = ['👥', '🎯', '⭐', '🏛️', '📚', '🎨', '🎵', '⚽', '💼', '🚀'];

export default function GroupFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const { groups, addGroup, updateGroup, setGroupMembers, initializeGroups } = useUserGroupsStore();
  const { users } = useUsersStore();

  const isAdminOrCommittee = user?.role === 'admin' || user?.role === 'committee' || user?.role === 'moderator';

  const groupId = params.id as string | undefined;
  const existing = groupId ? groups.find((g) => g.id === groupId) : undefined;

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [color, setColor] = useState(existing?.color || GROUP_COLORS[0]);
  const [icon, setIcon] = useState(existing?.icon || GROUP_ICONS[0]);
  const [memberIds, setMemberIds] = useState<string[]>(existing?.memberIds || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!existing && groupId) {
      initializeGroups();
    }
  }, []);

  useEffect(() => {
    if (!isAdminOrCommittee) {
      Alert.alert('Accès refusé', "Vous n'avez pas les droits.", [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [isAdminOrCommittee]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter((u) => {
      if (!q) return true;
      return (
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  const toggleMember = (uid: string) => {
    setMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const toggleAll = () => {
    if (memberIds.length === users.length) {
      setMemberIds([]);
    } else {
      setMemberIds(users.map((u) => u.id));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Champ obligatoire', 'Veuillez saisir un nom.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (existing) {
        await updateGroup(existing.id, { name: name.trim(), description, color, icon });
        await setGroupMembers(existing.id, memberIds);
      } else {
        await addGroup({ name: name.trim(), description, color, icon, memberIds });
      }
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', "Impossible d'enregistrer le groupe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title={existing ? 'Modifier le groupe' : 'Nouveau groupe'}
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Input
            label="Nom du groupe *"
            value={name}
            onChangeText={setName}
            placeholder="Ex : Comité, Pôle Communication"
            containerStyle={styles.field}
          />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="(optionnel)"
            containerStyle={styles.field}
            multiline
          />

          <Text style={[styles.label, { color: theme.text }]}>Icône</Text>
          <View style={styles.iconsRow}>
            {GROUP_ICONS.map((em) => (
              <TouchableOpacity
                key={em}
                style={[
                  styles.iconOption,
                  { borderColor: icon === em ? theme.primary : theme.border },
                  icon === em && { borderWidth: 2 },
                ]}
                onPress={() => setIcon(em)}
              >
                <Text style={{ fontSize: 22 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Couleur</Text>
          <View style={styles.colorsRow}>
            {GROUP_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <View style={styles.membersHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Users size={18} color={theme.primary} />
              <Text style={[styles.label, { color: theme.text, marginLeft: 8, marginBottom: 0 }]}>
                Membres ({memberIds.length}/{users.length})
              </Text>
            </View>
            <TouchableOpacity onPress={toggleAll}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>
                {memberIds.length === users.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.search, { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: theme.border }]}>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Rechercher un utilisateur..."
              placeholderTextColor={darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredUsers}
            keyExtractor={(u) => u.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const selected = memberIds.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.userRow, { borderBottomColor: theme.border }]}
                  onPress={() => toggleMember(item.id)}
                >
                  <Avatar
                    source={item.avatarUrl ? { uri: item.avatarUrl } : undefined}
                    name={`${item.firstName} ${item.lastName}`}
                    size={36}
                  />
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.text }]}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={[styles.userRole, { color: darkMode ? theme.inactive : '#666' }]}>
                      {item.role}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent' },
                    ]}
                  >
                    {selected && <Check size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: darkMode ? theme.inactive : '#666', padding: 16, textAlign: 'center' }}>
                Aucun utilisateur trouvé.
              </Text>
            }
          />

          <View style={styles.buttons}>
            <Button
              title="Annuler"
              onPress={() => router.back()}
              variant="outline"
              style={styles.cancel}
              textStyle={{ color: theme.error }}
              fullWidth
            />
            <Button
              title={existing ? 'Mettre à jour' : 'Créer'}
              onPress={handleSave}
              loading={isSubmitting}
              fullWidth
              style={styles.save}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  iconsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorSelected: { borderWidth: 2, borderColor: '#000' },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  search: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  searchInput: { fontSize: 15 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '500' },
  userRole: { fontSize: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: { marginTop: 24 },
  cancel: { marginBottom: 12 },
  save: { marginBottom: 8 },
});
