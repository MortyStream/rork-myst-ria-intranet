import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Avatar } from '@/components/Avatar';
import { getSupabase } from '@/utils/supabase';
import Toast from 'react-native-toast-message';

// Permissions configurables pour les modérateurs
const AVAILABLE_PERMISSIONS = [
  { key: 'tasks',         label: 'Tâches',               description: 'Voir et gérer toutes les tâches' },
  { key: 'notifications', label: 'Notifications',         description: 'Envoyer des notifications aux membres' },
  { key: 'links',         label: 'Liens utiles',          description: 'Ajouter et modifier les liens' },
  { key: 'resources',     label: 'La Bible & Ressources', description: 'Gérer les ressources et catégories' },
  { key: 'calendar',      label: 'Calendrier',            description: 'Créer et modifier les événements' },
  { key: 'groups',        label: 'Groupes',               description: "Gérer les groupes d'utilisateurs" },
  { key: 'messages',      label: 'Messages',              description: 'Accéder à la messagerie admin' },
  { key: 'stats',         label: 'Statistiques',          description: 'Consulter les statistiques' },
] as const;

type PermKey = typeof AVAILABLE_PERMISSIONS[number]['key'];

export default function PermissionsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { users, initializeUsers, updateUser } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [saving, setSaving] = useState<string | null>(null); // userId en cours de sauvegarde
  // Permissions locales par userId, initialisées depuis le store
  const [localPerms, setLocalPerms] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (user?.role !== 'admin') { router.replace('/'); return; }
    initializeUsers();
  }, []);

  const moderators = users.filter(u => u.role === 'moderator');

  // Initialise les permissions locales dès que la liste est dispo
  useEffect(() => {
    const map: Record<string, string[]> = {};
    for (const mod of moderators) {
      map[mod.id] = mod.permissions ?? [];
    }
    setLocalPerms(map);
  }, [users]);

  const toggle = (userId: string, key: PermKey) => {
    setLocalPerms(prev => {
      const current = prev[userId] ?? [];
      const next = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];
      return { ...prev, [userId]: next };
    });
  };

  const save = async (userId: string) => {
    setSaving(userId);
    try {
      const perms = localPerms[userId] ?? [];
      const supabase = getSupabase();
      const { error } = await supabase
        .from('users')
        .update({ permissions: perms })
        .eq('id', userId);
      if (error) throw error;
      updateUser(userId, { permissions: perms });
      Toast.show({ type: 'success', text1: 'Permissions sauvegardées' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: e.message });
    } finally {
      setSaving(null);
    }
  };

  if (user?.role !== 'admin') return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Permissions des modérateurs"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: darkMode ? theme.inactive : '#666' }]}>
          L'admin dispose de tous les droits. Configure ici ce que chaque modérateur peut faire.
        </Text>

        {moderators.length === 0 ? (
          <Text style={[styles.empty, { color: theme.text }]}>
            Aucun modérateur trouvé.
          </Text>
        ) : (
          moderators.map(mod => (
            <View
              key={mod.id}
              style={[styles.modCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              {/* En-tête modérateur */}
              <View style={styles.modHeader}>
                <Avatar
                  source={mod.profileImage ? { uri: mod.profileImage } : undefined}
                  name={`${mod.firstName} ${mod.lastName}`}
                  size={40}
                />
                <View style={styles.modInfo}>
                  <Text style={[styles.modName, { color: theme.text }]}>
                    {mod.firstName} {mod.lastName}
                  </Text>
                  <Text style={[styles.modEmail, { color: darkMode ? theme.inactive : '#888' }]}>
                    {mod.email}
                  </Text>
                </View>
              </View>

              {/* Toggles de permissions */}
              {AVAILABLE_PERMISSIONS.map(perm => {
                const enabled = (localPerms[mod.id] ?? []).includes(perm.key);
                return (
                  <View
                    key={perm.key}
                    style={[styles.permRow, { borderTopColor: theme.border }]}
                  >
                    <View style={styles.permInfo}>
                      <Text style={[styles.permLabel, { color: theme.text }]}>
                        {perm.label}
                      </Text>
                      <Text style={[styles.permDesc, { color: darkMode ? theme.inactive : '#999' }]}>
                        {perm.description}
                      </Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={() => toggle(mod.id, perm.key)}
                      trackColor={{ false: theme.inactive, true: `${theme.primary}80` }}
                      thumbColor={enabled ? theme.primary : '#f4f3f4'}
                      ios_backgroundColor={theme.inactive}
                    />
                  </View>
                );
              })}

              {/* Bouton sauvegarder */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={() => save(mod.id)}
                disabled={saving === mod.id}
              >
                {saving === mod.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  intro: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  modCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  modHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  modInfo: { flex: 1 },
  modName: { fontSize: 16, fontWeight: '600' },
  modEmail: { fontSize: 12, marginTop: 2 },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  permInfo: { flex: 1, paddingRight: 12 },
  permLabel: { fontSize: 14, fontWeight: '500' },
  permDesc: { fontSize: 12, marginTop: 2 },
  saveBtn: {
    margin: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
