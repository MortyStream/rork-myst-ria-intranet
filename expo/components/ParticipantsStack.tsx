import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Users } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';

interface ParticipantUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface ParticipantsStackProps {
  /** IDs des participants sélectionnés. */
  selectedIds: string[];
  /** Liste complète de tous les utilisateurs disponibles (pour résoudre les IDs). */
  allUsers: ParticipantUser[];
  /** Callback pour retirer un participant. Si non fourni, le mode est read-only. */
  onRemove?: (userId: string) => void;
  /** Texte affiché sous le stack quand peu de participants. Défaut "personne(s) invitée(s)". */
  label?: string;
}

const MAX_VISIBLE_AVATARS = 5;
// Si on a sélectionné >= ce ratio de la totalité, on affiche "Toute l'asso"
const FULL_ASSO_RATIO = 0.85;

/**
 * Affichage compact d'une liste de participants :
 * - Stack d'avatars circulaires qui se chevauchent (max 5 visibles)
 * - Cercle "+N" si plus
 * - Tap → bottom sheet avec liste complète et croix individuelles
 * - Si presque tous les membres sont sélectionnés → label "Toute l'asso"
 *
 * Utilisé dans event-form (participants) et task-form (assignés).
 */
export const ParticipantsStack: React.FC<ParticipantsStackProps> = ({
  selectedIds,
  allUsers,
  onRemove,
  label,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  const [showFullList, setShowFullList] = useState(false);

  // Résolution IDs → User objects (en gardant l'ordre + filtrant les ids invalides)
  const participants = selectedIds
    .map((id) => allUsers.find((u) => u.id === id))
    .filter((u): u is ParticipantUser => !!u);

  const total = participants.length;
  const isFullAsso = allUsers.length > 0 && total / allUsers.length >= FULL_ASSO_RATIO;
  const visibleAvatars = participants.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = Math.max(0, total - MAX_VISIBLE_AVATARS);

  if (total === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Users size={18} color={darkMode ? theme.inactive : '#888'} />
        <Text style={[styles.emptyText, { color: darkMode ? theme.inactive : '#666' }]}>
          Aucun participant sélectionné
        </Text>
      </View>
    );
  }

  // Texte du résumé
  let summaryText: string;
  if (isFullAsso && total === allUsers.length) {
    summaryText = `Toute l'association (${total})`;
  } else if (isFullAsso) {
    summaryText = `Quasiment tout le monde (${total})`;
  } else {
    summaryText = `${total} ${label ?? (total > 1 ? 'personnes invitées' : 'personne invitée')}`;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setShowFullList(true)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarsRow}>
          {visibleAvatars.map((p, idx) => (
            <View
              key={p.id}
              style={[
                styles.avatarWrapper,
                {
                  marginLeft: idx === 0 ? 0 : -12,
                  borderColor: theme.card,
                  zIndex: MAX_VISIBLE_AVATARS - idx,
                },
              ]}
            >
              <Avatar
                source={p.profileImage ? { uri: p.profileImage } : undefined}
                name={`${p.firstName} ${p.lastName}`}
                size={32}
              />
            </View>
          ))}
          {overflowCount > 0 && (
            <View
              style={[
                styles.overflowCircle,
                {
                  backgroundColor: appColors.primary,
                  borderColor: theme.card,
                  marginLeft: -12,
                },
              ]}
            >
              <Text style={styles.overflowText}>+{overflowCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.summaryContainer}>
          <Text style={[styles.summaryText, { color: theme.text }]}>{summaryText}</Text>
          {onRemove && (
            <Text style={[styles.tapHint, { color: darkMode ? theme.inactive : '#888' }]}>
              Appuyer pour gérer
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Bottom sheet — liste détaillée avec croix pour retirer */}
      <Modal
        visible={showFullList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFullList(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowFullList(false)}
        >
          <TouchableOpacity
            style={[styles.sheet, { backgroundColor: theme.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <View style={[styles.handle, { backgroundColor: theme.border }]} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Participants ({total})
              </Text>
              <TouchableOpacity onPress={() => setShowFullList(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {participants.map((p) => (
                <View
                  key={p.id}
                  style={[styles.listRow, { borderBottomColor: theme.border }]}
                >
                  <Avatar
                    source={p.profileImage ? { uri: p.profileImage } : undefined}
                    name={`${p.firstName} ${p.lastName}`}
                    size={36}
                  />
                  <Text style={[styles.listName, { color: theme.text }]}>
                    {p.firstName} {p.lastName}
                  </Text>
                  {onRemove && (
                    <TouchableOpacity
                      onPress={() => {
                        onRemove(p.id);
                        // Si plus personne, on ferme le sheet auto
                        if (total === 1) setShowFullList(false);
                      }}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      style={styles.listRemoveBtn}
                    >
                      <X size={18} color={theme.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  overflowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    paddingHorizontal: 4,
  },
  overflowText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  summaryContainer: {
    flex: 1,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tapHint: {
    fontSize: 11,
    marginTop: 2,
  },
  // Bottom sheet
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sheetList: {
    paddingHorizontal: 20,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  listRemoveBtn: {
    padding: 4,
  },
});
