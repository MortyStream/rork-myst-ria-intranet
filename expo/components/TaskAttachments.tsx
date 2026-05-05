import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Paperclip,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Trash2,
  X,
  Plus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { useTaskAttachmentsStore } from '@/store/task-attachments-store';
import { TaskAttachment } from '@/types/task';
import { ConfirmModal } from './ConfirmModal';
import { tapHaptic, warningHaptic, successHaptic } from '@/utils/haptics';
import { getSupabase } from '@/utils/supabase';
import { sanitizeFilename } from '@/utils/image-compression';

interface TaskAttachmentsProps {
  taskId: string;
  /** Si false, l'user voit la liste mais pas le bouton "Joindre". */
  canAdd: boolean;
}

/**
 * Section "Pièces jointes" embarquée dans TaskDetail (Feature F1, 2026-05-05).
 *
 * - Charge la liste de la task au mount via le store
 * - 3 types : image (expo-image-picker), fichier (expo-document-picker), lien
 * - Tap sur un attachment = ouverture (Linking)
 * - Long-press = ConfirmModal de suppression (uploader OR admin)
 */
export const TaskAttachments: React.FC<TaskAttachmentsProps> = ({ taskId, canAdd }) => {
  const { darkMode } = useSettingsStore();
  const { user } = useAuthStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const { fetchForTask, addLink, addUploaded, deleteAttachment, getForTask } =
    useTaskAttachmentsStore();
  const attachments = getForTask(taskId);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [toDelete, setToDelete] = useState<TaskAttachment | null>(null);

  useEffect(() => {
    fetchForTask(taskId);
  }, [taskId]);

  const isAdmin = user?.role === 'admin';
  const canDeleteAttachment = (a: TaskAttachment): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return a.uploadedBy === user.id;
  };

  const handlePickImage = async () => {
    setPickerVisible(false);
    if (!user) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Accès refusé', text2: 'Autorise les photos.' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        selectionLimit: 1,
        exif: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setIsUploading(true);
      const supabase = getSupabase();
      const fileName = sanitizeFilename(asset.fileName ?? `image-${Date.now()}.jpg`);
      const path = `${taskId}/${Date.now()}-${fileName}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const mimeType = asset.mimeType ?? 'image/jpeg';

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;

      await addUploaded(
        taskId,
        'image',
        fileName,
        path,
        mimeType,
        asset.fileSize ?? 0,
        user.id
      );
      successHaptic();
      Toast.show({ type: 'success', text1: 'Image jointe' });
    } catch (e: any) {
      console.error('Image attachment error:', e);
      Toast.show({ type: 'error', text1: 'Erreur', text2: e?.message ?? 'Upload échoué.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickFile = async () => {
    setPickerVisible(false);
    if (!user) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setIsUploading(true);
      const supabase = getSupabase();
      const fileName = sanitizeFilename(asset.name);
      const path = `${taskId}/${Date.now()}-${fileName}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const mimeType = asset.mimeType ?? 'application/octet-stream';

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;

      await addUploaded(
        taskId,
        'file',
        fileName,
        path,
        mimeType,
        asset.size ?? 0,
        user.id
      );
      successHaptic();
      Toast.show({ type: 'success', text1: 'Fichier joint' });
    } catch (e: any) {
      console.error('File attachment error:', e);
      Toast.show({ type: 'error', text1: 'Erreur', text2: e?.message ?? 'Upload échoué.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!user) return;
    const url = linkUrl.trim();
    if (!url) {
      Toast.show({ type: 'error', text1: 'URL manquante' });
      return;
    }
    // Préfixer avec https:// si l'user a oublié
    const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try {
      await addLink(taskId, linkName.trim() || finalUrl, finalUrl, user.id);
      successHaptic();
      Toast.show({ type: 'success', text1: 'Lien ajouté' });
      setLinkName('');
      setLinkUrl('');
      setLinkModalVisible(false);
    } catch (e: any) {
      console.error('Link attachment error:', e);
      Toast.show({ type: 'error', text1: 'Erreur', text2: e?.message ?? 'Ajout échoué.' });
    }
  };

  const handleOpen = async (a: TaskAttachment) => {
    tapHaptic();
    try {
      await Linking.openURL(a.url);
    } catch {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible d\'ouvrir.' });
    }
  };

  const performDelete = async () => {
    const target = toDelete;
    setToDelete(null);
    if (!target) return;
    try {
      warningHaptic();
      await deleteAttachment(target.id);
      Toast.show({ type: 'info', text1: 'Pièce jointe supprimée' });
    } catch (e: any) {
      console.error('Delete attachment error:', e);
      Toast.show({ type: 'error', text1: 'Erreur', text2: e?.message ?? 'Suppression échoué.' });
    }
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getIcon = (type: TaskAttachment['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={18} color={theme.primary} />;
      case 'file':
        return <FileText size={18} color={theme.primary} />;
      case 'link':
        return <LinkIcon size={18} color={theme.primary} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Paperclip size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Pièces jointes ({attachments.length})
          </Text>
        </View>
        {canAdd && (
          <TouchableOpacity
            onPress={() => {
              tapHaptic();
              setPickerVisible(true);
            }}
            disabled={isUploading}
            style={[styles.addBtn, { borderColor: theme.primary }]}
            accessibilityLabel="Joindre une pièce"
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Plus size={14} color={theme.primary} />
                <Text style={[styles.addBtnText, { color: theme.primary }]}>Joindre</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {attachments.length === 0 ? (
        <Text style={[styles.emptyText, { color: darkMode ? theme.inactive : '#888' }]}>
          Aucune pièce jointe.
        </Text>
      ) : (
        attachments.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleOpen(a)}
            onLongPress={() => {
              if (canDeleteAttachment(a)) setToDelete(a);
            }}
            delayLongPress={400}
            activeOpacity={0.7}
            accessibilityLabel={`Ouvrir ${a.name}`}
          >
            <View style={styles.iconWrap}>{getIcon(a.type)}</View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {a.name}
              </Text>
              <Text style={[styles.meta, { color: darkMode ? theme.inactive : '#888' }]} numberOfLines={1}>
                {a.type === 'link' ? a.url : formatSize(a.sizeBytes)}
              </Text>
            </View>
            {canDeleteAttachment(a) && (
              <TouchableOpacity
                onPress={() => {
                  tapHaptic();
                  setToDelete(a);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Supprimer la pièce jointe"
              >
                <Trash2 size={16} color={darkMode ? theme.inactive : '#999'} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))
      )}

      {/* Bottom sheet : type d'attachment à ajouter */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={[styles.sheet, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Quel type ?</Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.sheetRow, { borderBottomColor: theme.border }]}
              onPress={handlePickImage}
            >
              <ImageIcon size={20} color={theme.primary} />
              <Text style={[styles.sheetRowText, { color: theme.text }]}>Photo / image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetRow, { borderBottomColor: theme.border }]}
              onPress={handlePickFile}
            >
              <FileText size={20} color={theme.primary} />
              <Text style={[styles.sheetRowText, { color: theme.text }]}>Fichier (PDF, doc, etc.)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetRow, { borderBottomColor: theme.border }]}
              onPress={() => {
                setPickerVisible(false);
                setTimeout(() => setLinkModalVisible(true), 200);
              }}
            >
              <LinkIcon size={20} color={theme.primary} />
              <Text style={[styles.sheetRowText, { color: theme.text }]}>Lien externe</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal saisie lien */}
      <Modal
        visible={linkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLinkModalVisible(false)}
      >
        <View style={styles.linkBackdrop}>
          <View style={[styles.linkCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>Ajouter un lien</Text>
            <TextInput
              style={[
                styles.linkInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                },
              ]}
              placeholder="Nom (optionnel)"
              placeholderTextColor={darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
              value={linkName}
              onChangeText={setLinkName}
            />
            <TextInput
              style={[
                styles.linkInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                },
              ]}
              placeholder="URL (https://...)"
              placeholderTextColor={darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              keyboardType={Platform.OS === 'ios' ? 'url' : 'default'}
            />
            <View style={styles.linkActions}>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => {
                  setLinkModalVisible(false);
                  setLinkName('');
                  setLinkUrl('');
                }}
              >
                <Text style={[styles.linkBtnText, { color: theme.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={handleAddLink}>
                <Text style={[styles.linkBtnText, { color: theme.primary, fontWeight: '700' }]}>
                  Ajouter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={toDelete !== null}
        title="Supprimer la pièce jointe ?"
        message={toDelete ? `« ${toDelete.name} » sera supprimée définitivement.` : ''}
        actions={[
          { label: 'Annuler', style: 'cancel' },
          { label: 'Supprimer', style: 'destructive', onPress: performDelete },
        ]}
        onDismiss={() => setToDelete(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 12, fontWeight: '600' },
  emptyText: { fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  iconWrap: { width: 32, alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 11, marginTop: 2 },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetRowText: { fontSize: 15, fontWeight: '500' },

  linkBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  linkCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
  },
  linkTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  linkInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  linkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  linkBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  linkBtnText: { fontSize: 15 },
});
