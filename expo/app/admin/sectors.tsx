import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Briefcase,
  Plus,
  Edit,
  Trash,
  UserCog,
  X,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useUserGroupsStore } from '@/store/user-groups-store';
import { useSectorsStore } from '@/store/sectors-store';
import { useUsersStore } from '@/store/users-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { ConfirmModal } from '@/components/ConfirmModal';
import { tapHaptic, warningHaptic, successHaptic } from '@/utils/haptics';

/**
 * Panel admin Pôles → Secteurs (Vague B Phase 2, 2026-05-05).
 *
 * Vue arborescente :
 *  - Liste des 5 pôles (user_groups), avec leur RP désigné.
 *  - Pour chaque pôle, ses secteurs avec : RS désigné, nombre de membres,
 *    bouton edit/delete.
 *  - Bouton "+ Créer un secteur" sous chaque pôle.
 *
 * Permissions UI (RLS DB en backstop) :
 *  - admin : tout le monde, tous les pôles.
 *  - responsable_pole : voit tout, mais peut éditer uniquement les secteurs
 *    de son pôle (RLS rejettera côté DB de toute façon).
 *  - responsable_secteur : lecture + peut update son propre secteur.
 *  - autres : redirect /admin (pas d'accès).
 */
export default function AdminSectorsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();

  const { groups, initializeGroups, setGroupResponsible } = useUserGroupsStore();
  const { sectors, initializeSectors, deleteSector, getSectorsByPole } = useSectorsStore();
  const { users, initializeUsers, getUserById } = useUsersStore();

  const isAdmin = user?.role === 'admin';
  const isResponsablePole = user?.role === 'responsable_pole';
  const isResponsableSecteur = user?.role === 'responsable_secteur';
  const canAccess = isAdmin || isResponsablePole || isResponsableSecteur;

  // Modal state : désignation du RP d'un pôle
  const [poleEditingResponsible, setPoleEditingResponsible] = useState<string | null>(null);
  // Modal state : confirm delete secteur
  const [sectorToDelete, setSectorToDelete] = useState<{ id: string; name: string } | null>(null);
  // Search dans le user-picker du RP
  const [poleResponsibleSearch, setPoleResponsibleSearch] = useState('');

  useEffect(() => {
    initializeGroups();
    initializeSectors();
    initializeUsers();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!canAccess) router.replace('/admin');
  }, [user, canAccess]);

  if (!user || !canAccess) return null;

  // Filtrer les pôles : admin voit tous, RP voit son pôle, RS voit les pôles
  // qui contiennent ses secteurs (pour pouvoir les inspecter).
  const visiblePoles = useMemo(() => {
    if (isAdmin) return groups;
    if (isResponsablePole) return groups.filter((g) => g.responsibleId === user.id);
    if (isResponsableSecteur) {
      const myPoleIds = new Set(
        sectors.filter((s) => s.responsibleId === user.id).map((s) => s.poleId)
      );
      return groups.filter((g) => myPoleIds.has(g.id));
    }
    return [];
  }, [groups, sectors, user.id, isAdmin, isResponsablePole, isResponsableSecteur]);

  const filteredUsersForResponsible = useMemo(() => {
    const q = poleResponsibleSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [users, poleResponsibleSearch]);

  const handleAssignPoleResponsible = async (poleId: string, userId: string | null) => {
    try {
      await setGroupResponsible(poleId, userId);
      successHaptic();
      setPoleEditingResponsible(null);
    } catch (e) {
      console.error('setGroupResponsible error:', e);
      Alert.alert('Erreur', 'Impossible de désigner le responsable.');
    }
  };

  const handleCreateSector = (poleId: string) => {
    tapHaptic();
    router.push({ pathname: '/admin/sector-form', params: { poleId } });
  };

  const handleEditSector = (sectorId: string) => {
    tapHaptic();
    router.push({ pathname: '/admin/sector-form', params: { id: sectorId } });
  };

  const handleDeleteSector = (id: string, name: string) => {
    tapHaptic();
    setSectorToDelete({ id, name });
  };

  const performDeleteSector = async () => {
    const target = sectorToDelete;
    setSectorToDelete(null);
    if (!target) return;
    try {
      warningHaptic();
      await deleteSector(target.id);
    } catch (e: any) {
      console.error('deleteSector error:', e);
      Alert.alert('Erreur', `Impossible de supprimer le secteur.\n${e?.message ?? ''}`);
    }
  };

  // L'user peut-il ajouter/modifier/supprimer des secteurs sous CE pôle ?
  // RLS DB est strict de toute façon ; ici on hide l'UI pour les non-autorisés.
  const canManageSectorsOfPole = (poleId: string): boolean => {
    if (isAdmin) return true;
    const pole = groups.find((g) => g.id === poleId);
    return !!pole && pole.responsibleId === user.id;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Pôles & Secteurs"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {visiblePoles.length === 0 ? (
          <Text style={[styles.emptyText, { color: darkMode ? theme.inactive : '#666' }]}>
            Aucun pôle visible pour ton rôle.
          </Text>
        ) : (
          visiblePoles.map((pole) => {
            const responsible = pole.responsibleId ? getUserById(pole.responsibleId) : null;
            const poleSectors = getSectorsByPole(pole.id);
            const canManage = canManageSectorsOfPole(pole.id);

            return (
              <View key={pole.id} style={styles.poleSection}>
                {/* Header pôle */}
                <View style={[styles.poleHeader, { borderColor: theme.border }]}>
                  <View style={styles.poleTitleRow}>
                    <View
                      style={[
                        styles.poleIcon,
                        { backgroundColor: pole.color || appColors.primary },
                      ]}
                    >
                      <Text style={styles.poleIconText}>{pole.icon || '🏛️'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.poleName, { color: theme.text }]}>{pole.name}</Text>
                      <Text
                        style={[
                          styles.poleResponsibleLine,
                          { color: darkMode ? theme.inactive : '#666' },
                        ]}
                      >
                        RP :{' '}
                        {responsible
                          ? `${responsible.firstName} ${responsible.lastName}`
                          : 'pas désigné'}
                      </Text>
                    </View>
                    {isAdmin && (
                      <TouchableOpacity
                        onPress={() => {
                          tapHaptic();
                          setPoleResponsibleSearch('');
                          setPoleEditingResponsible(pole.id);
                        }}
                        style={[styles.poleActionBtn, { borderColor: theme.border }]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <UserCog size={16} color={appColors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Liste secteurs du pôle */}
                {poleSectors.length === 0 ? (
                  <View style={styles.noSectorWrap}>
                    <Text style={[styles.noSectorText, { color: darkMode ? theme.inactive : '#666' }]}>
                      Aucun secteur actif pour ce pôle.
                    </Text>
                  </View>
                ) : (
                  poleSectors.map((sector) => {
                    const rs = sector.responsibleId ? getUserById(sector.responsibleId) : null;
                    return (
                      <Card key={sector.id} style={styles.sectorCard}>
                        <TouchableOpacity
                          style={styles.sectorRow}
                          onPress={() => handleEditSector(sector.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.sectorBullet, { backgroundColor: appColors.primary }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.sectorName, { color: theme.text }]}>
                              {sector.name}
                            </Text>
                            <View style={styles.sectorMeta}>
                              <Text style={[styles.sectorMetaText, { color: darkMode ? theme.inactive : '#666' }]}>
                                RS : {rs ? `${rs.firstName} ${rs.lastName}` : 'pas désigné'}
                              </Text>
                              <Text style={[styles.sectorMetaDot, { color: darkMode ? theme.inactive : '#666' }]}>·</Text>
                              <Text style={[styles.sectorMetaText, { color: darkMode ? theme.inactive : '#666' }]}>
                                {sector.memberIds.length} membre{sector.memberIds.length > 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>
                          <ChevronRight size={18} color={darkMode ? theme.inactive : '#888'} />
                        </TouchableOpacity>
                        {canManage && (
                          <View style={[styles.sectorActions, { borderTopColor: theme.border }]}>
                            <TouchableOpacity
                              style={styles.sectorActionBtn}
                              onPress={() => handleEditSector(sector.id)}
                            >
                              <Edit size={16} color={appColors.primary} />
                              <Text style={[styles.sectorActionText, { color: appColors.primary }]}>
                                Modifier
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.sectorActionBtn}
                              onPress={() => handleDeleteSector(sector.id, sector.name)}
                            >
                              <Trash size={16} color={theme.error} />
                              <Text style={[styles.sectorActionText, { color: theme.error }]}>
                                Supprimer
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </Card>
                    );
                  })
                )}

                {/* Bouton créer secteur sous ce pôle */}
                {canManage && (
                  <TouchableOpacity
                    style={[styles.addSectorBtn, { borderColor: appColors.primary }]}
                    onPress={() => handleCreateSector(pole.id)}
                    activeOpacity={0.7}
                  >
                    <Plus size={18} color={appColors.primary} />
                    <Text style={[styles.addSectorText, { color: appColors.primary }]}>
                      Créer un secteur
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ConfirmModal delete secteur */}
      <ConfirmModal
        visible={sectorToDelete !== null}
        title="Supprimer ce secteur ?"
        message={
          sectorToDelete
            ? `« ${sectorToDelete.name} » sera supprimé. Les membres affectés seront retirés du secteur (ils restent dans l'asso).`
            : ''
        }
        actions={[
          { label: 'Annuler', style: 'cancel' },
          { label: 'Supprimer', style: 'destructive', onPress: performDeleteSector },
        ]}
        onDismiss={() => setSectorToDelete(null)}
      />

      {/* Modal user-picker pour désigner le RP d'un pôle (admin only) */}
      <Modal
        visible={poleEditingResponsible !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPoleEditingResponsible(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Désigner le Responsable de Pôle
              </Text>
              <TouchableOpacity
                onPress={() => setPoleEditingResponsible(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.modalSearch,
                {
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderColor: theme.border,
                },
              ]}
            >
              <TextInput
                style={[styles.modalSearchInput, { color: theme.text }]}
                placeholder="Rechercher un utilisateur..."
                placeholderTextColor={darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                value={poleResponsibleSearch}
                onChangeText={setPoleResponsibleSearch}
              />
            </View>
            <FlatList
              data={filteredUsersForResponsible}
              keyExtractor={(u) => u.id}
              style={{ maxHeight: 400 }}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[styles.modalRow, { borderBottomColor: theme.border }]}
                  onPress={() => poleEditingResponsible && handleAssignPoleResponsible(poleEditingResponsible, null)}
                >
                  <Text style={[styles.modalRowText, { color: theme.error, fontWeight: '600' }]}>
                    Aucun (retirer le RP)
                  </Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => {
                const currentPole = groups.find((g) => g.id === poleEditingResponsible);
                const isSelected = currentPole?.responsibleId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.modalRow, { borderBottomColor: theme.border }]}
                    onPress={() => poleEditingResponsible && handleAssignPoleResponsible(poleEditingResponsible, item.id)}
                  >
                    <Avatar
                      source={item.avatarUrl ? { uri: item.avatarUrl } : undefined}
                      name={`${item.firstName} ${item.lastName}`}
                      size={32}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.modalRowText, { color: theme.text }]}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={[styles.modalRowSubtext, { color: darkMode ? theme.inactive : '#666' }]}>
                        {item.role}
                      </Text>
                    </View>
                    {isSelected && <Check size={20} color={appColors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 40 },

  poleSection: { marginBottom: 28 },
  poleHeader: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  poleTitleRow: { flexDirection: 'row', alignItems: 'center' },
  poleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  poleIconText: { fontSize: 18 },
  poleName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  poleResponsibleLine: { fontSize: 12, marginTop: 2 },
  poleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noSectorWrap: { paddingVertical: 8, paddingLeft: 4 },
  noSectorText: { fontSize: 13, fontStyle: 'italic' },

  sectorCard: { marginBottom: 10, padding: 0, overflow: 'hidden' },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  sectorBullet: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  sectorName: { fontSize: 15, fontWeight: '600' },
  sectorMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  sectorMetaText: { fontSize: 12 },
  sectorMetaDot: { fontSize: 12 },
  sectorActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 16,
  },
  sectorActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectorActionText: { fontSize: 13, fontWeight: '500' },

  addSectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addSectorText: { fontSize: 14, fontWeight: '600' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, flex: 1 },
  modalSearch: {
    marginHorizontal: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalSearchInput: { fontSize: 14 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalRowText: { fontSize: 15, fontWeight: '500' },
  modalRowSubtext: { fontSize: 12, marginTop: 2 },
});
