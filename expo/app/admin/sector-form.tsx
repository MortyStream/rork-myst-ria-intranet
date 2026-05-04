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
import { Check, UserCog, Users } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useUserGroupsStore } from '@/store/user-groups-store';
import { useSectorsStore } from '@/store/sectors-store';
import { useUsersStore } from '@/store/users-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { successHaptic } from '@/utils/haptics';

/**
 * Form création / édition d'un secteur (Vague B Phase 2, 2026-05-05).
 *
 * 2 modes :
 *  - Création : reçoit `?poleId=...` en param, on créera le secteur sous ce pôle.
 *  - Édition : reçoit `?id=...`, on charge le secteur existant.
 *
 * Champs :
 *  - Nom du secteur (text)
 *  - Responsable de Secteur (RS) — picker user
 *  - Membres — multi-select user
 */
export default function SectorFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();

  const { groups, initializeGroups } = useUserGroupsStore();
  const { sectors, addSector, updateSector, setSectorMembers, initializeSectors, getSectorById } = useSectorsStore();
  const { users, initializeUsers, getUserById } = useUsersStore();

  const sectorId = params.id as string | undefined;
  const poleIdParam = params.poleId as string | undefined;
  const existing = sectorId ? getSectorById(sectorId) : undefined;
  const poleId = existing?.poleId ?? poleIdParam;
  const pole = poleId ? groups.find((g) => g.id === poleId) : undefined;

  // Permissions UI : admin OU RP du pôle OU RS du secteur (en édition)
  const isAdmin = user?.role === 'admin';
  const isPoleResponsible = !!pole && pole.responsibleId === user?.id;
  const isSectorResponsible = !!existing && existing.responsibleId === user?.id;
  const canManage = isAdmin || isPoleResponsible || isSectorResponsible;

  const [name, setName] = useState(existing?.name || '');
  const [responsibleId, setResponsibleId] = useState<string | null>(existing?.responsibleId ?? null);
  const [memberIds, setMemberIds] = useState<string[]>(existing?.memberIds || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    initializeGroups();
    initializeSectors();
    initializeUsers();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!canManage) {
      Alert.alert('Accès refusé', "Tu n'as pas les droits sur ce secteur.", [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [user, canManage]);

  // Pré-remplit les valeurs du secteur quand il arrive dans le store (init async).
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setResponsibleId(existing.responsibleId);
      setMemberIds(existing.memberIds);
    }
  }, [existing?.id, existing?.updatedAt]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const toggleMember = (uid: string) => {
    setMemberIds((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Champ obligatoire', 'Veuillez saisir un nom de secteur.');
      return;
    }
    if (!poleId) {
      Alert.alert('Erreur', 'Pôle parent non trouvé.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (existing) {
        await updateSector(existing.id, { name: name.trim(), responsibleId });
        await setSectorMembers(existing.id, memberIds);
      } else {
        await addSector({
          name: name.trim(),
          poleId,
          responsibleId,
          memberIds,
        });
      }
      successHaptic();
      router.back();
    } catch (e: any) {
      console.error('Save sector error:', e);
      Alert.alert('Erreur', `Impossible d'enregistrer le secteur.\n${e?.message ?? ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !canManage) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title={existing ? 'Modifier le secteur' : 'Nouveau secteur'}
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {pole && (
            <View style={[styles.poleBadge, { backgroundColor: pole.color || appColors.primary }]}>
              <Text style={styles.poleBadgeText}>
                {pole.icon || '🏛️'} {pole.name}
              </Text>
            </View>
          )}

          <Input
            label="Nom du secteur *"
            value={name}
            onChangeText={setName}
            placeholder="Ex : Costumes, Maquillage, Scénographie…"
            containerStyle={styles.field}
          />

          {/* Responsable de Secteur — section dédiée */}
          <View style={styles.sectionHeader}>
            <UserCog size={18} color={appColors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Responsable de Secteur
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: darkMode ? theme.inactive : '#666' }]}>
            Le RS pilote le secteur et peut éditer ses membres. Il sera automatiquement
            ajouté aux membres si pas déjà inclus.
          </Text>
          <TouchableOpacity
            style={[styles.responsibleRow, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={() => {
              // Si déjà désigné, on retire ; sinon on ouvre le picker (qu'on fait simple
              // = scroll dans la liste membres ci-dessous + tap sur le bouton "Désigner")
              if (responsibleId) {
                setResponsibleId(null);
              }
            }}
            activeOpacity={0.7}
          >
            {responsibleId ? (
              <>
                {(() => {
                  const rs = getUserById(responsibleId);
                  if (!rs) return <Text style={{ color: theme.text }}>Utilisateur introuvable</Text>;
                  return (
                    <>
                      <Avatar
                        source={rs.avatarUrl ? { uri: rs.avatarUrl } : undefined}
                        name={`${rs.firstName} ${rs.lastName}`}
                        size={36}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.responsibleName, { color: theme.text }]}>
                          {rs.firstName} {rs.lastName}
                        </Text>
                        <Text style={[styles.responsibleHint, { color: darkMode ? theme.inactive : '#666' }]}>
                          Tap pour retirer
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </>
            ) : (
              <Text style={[styles.responsibleEmpty, { color: darkMode ? theme.inactive : '#666' }]}>
                Pas de RS désigné — tap sur un membre ci-dessous pour le désigner
              </Text>
            )}
          </TouchableOpacity>

          {/* Section Membres */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Users size={18} color={appColors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Membres ({memberIds.length})
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: darkMode ? theme.inactive : '#666' }]}>
            Tap court : ajouter/retirer du secteur. Tap long : désigner comme RS.
          </Text>

          <View
            style={[
              styles.search,
              {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderColor: theme.border,
              },
            ]}
          >
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
              const isRS = responsibleId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.userRow, { borderBottomColor: theme.border }]}
                  onPress={() => toggleMember(item.id)}
                  onLongPress={() => {
                    setResponsibleId(item.id);
                    if (!memberIds.includes(item.id)) {
                      setMemberIds((prev) => [...prev, item.id]);
                    }
                  }}
                  delayLongPress={400}
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
                      {isRS ? ' · RS' : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: selected ? appColors.primary : theme.border,
                        backgroundColor: selected ? appColors.primary : 'transparent',
                      },
                    ]}
                  >
                    {selected && <Check size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text
                style={{
                  color: darkMode ? theme.inactive : '#666',
                  padding: 16,
                  textAlign: 'center',
                }}
              >
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
              title={existing ? 'Mettre à jour' : 'Créer le secteur'}
              onPress={handleSave}
              loading={isSubmitting}
              fullWidth
              haptic="success"
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
  poleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  poleBadgeText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  field: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionHint: { fontSize: 12, marginBottom: 12, lineHeight: 16 },

  responsibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  responsibleName: { fontSize: 15, fontWeight: '600' },
  responsibleHint: { fontSize: 11, marginTop: 2 },
  responsibleEmpty: { fontSize: 13, fontStyle: 'italic', flex: 1, padding: 6 },

  search: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  searchInput: { fontSize: 15 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  buttons: { marginTop: 24, gap: 12 },
  cancel: {},
});
