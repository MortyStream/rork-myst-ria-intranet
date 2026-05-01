import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Alert,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { getSupabase } from '@/utils/supabase';
import { sendPushNotifications } from '@/utils/push-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { compressImage } from '@/utils/image-compression';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Moon,
  Sun,
  LogOut,
  Lock,
  Bug,
  AlertTriangle,
  Shield,
  UserCircle,
  Camera,
  X,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { ListItem } from '@/components/ListItem';
import { Divider } from '@/components/Divider';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Badge } from '@/components/Badge';
import { AppLayout } from '@/components/AppLayout';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();

  const [showBugReport, setShowBugReport] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [screenshotUris, setScreenshotUris] = useState<string[]>([]);
  const MAX_SCREENSHOTS = 5;
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | undefined>(undefined);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleProfile = () => router.push('/profile');
  const handleEditProfile = () => router.push('/profile/edit');
  const handleChangePassword = () => router.push('/profile/change-password');
  const handleAdminPanel = () => router.push('/admin');

  const handleReportBug = () => {
    setShowBugReport(true);
    setReportSent(false);
    setScreenshotUris([]);
  };

  const handlePickScreenshot = async () => {
    if (screenshotUris.length >= MAX_SCREENSHOTS) {
      Alert.alert('Limite atteinte', `Vous pouvez joindre au maximum ${MAX_SCREENSHOTS} captures d'écran.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', "L'accès à la galerie est requis pour joindre une capture d'écran.");
      return;
    }
    const remaining = MAX_SCREENSHOTS - screenshotUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      allowsEditing: false,
      exif: false,
      base64: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Compression chaque screenshot : 1280px max + JPEG 0.7 → ~150 KB au lieu de 3-5 Mo
      const compressedUris = await Promise.all(
        result.assets.map(async (asset) => {
          const compressed = await compressImage(asset.uri, {
            maxWidth: 1280,
            quality: 0.7,
            format: 'jpeg',
          });
          return compressed.uri;
        })
      );
      setScreenshotUris(prev => [...prev, ...compressedUris].slice(0, MAX_SCREENSHOTS));
    }
  };

  const handleRemoveScreenshot = (uri: string) => {
    setScreenshotUris(prev => prev.filter(u => u !== uri));
  };

  const sendBugReport = async () => {
    if (!bugDescription.trim()) {
      Alert.alert('Erreur', 'Veuillez décrire le problème rencontré.');
      return;
    }
    setIsSendingReport(true);

    // ── Étape 1 : persistance Supabase + push (obligatoires) ───────────────
    let coreSuccess = false;
    try {
      const supabase = getSupabase();
      const { error: dbError } = await supabase.from('bug_reports').insert({
        userId: user?.id ?? 'unknown',
        userFirstName: user?.firstName ?? '',
        userLastName: user?.lastName ?? '',
        userRole: user?.role ?? '',
        description: bugDescription.trim(),
      });
      if (dbError) console.error('bug_reports insert error:', dbError);

      const { data: adminRows } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(5);
      if (adminRows && adminRows.length > 0) {
        const adminIds = adminRows.map((r: any) => r.id);
        await sendPushNotifications(
          adminIds,
          '🐛 Nouveau rapport de bug',
          `${user?.firstName} ${user?.lastName} : ${bugDescription.trim().slice(0, 80)}${bugDescription.length > 80 ? '…' : ''}`,
        );
      }
      coreSuccess = true;
    } catch (coreError) {
      console.error('Error sending bug report (core):', coreError);
      Alert.alert('Erreur', "Impossible d'envoyer le rapport. Vérifiez votre connexion.");
      setIsSendingReport(false);
      return;
    }

    // ── Étape 2 : email via client mail (best-effort, n'empêche pas le succès) ──
    if (coreSuccess) {
      try {
        const mailSubject = `🐛 Bug Report — ${user?.firstName ?? ''} ${user?.lastName ?? ''}`;
        const mailBody =
          `Rapport de bug — ${new Date().toLocaleString('fr-FR')}\n\n` +
          `Signalé par : ${user?.firstName ?? ''} ${user?.lastName ?? ''} (${user?.role ?? 'membre'})\n` +
          `Email : ${user?.email ?? ''}\n\n` +
          `───────────────────\n${bugDescription.trim()}\n───────────────────\n\n` +
          `Envoyé depuis l'app Mystéria Intranet`;
        const attachments = screenshotUris.length > 0 ? screenshotUris : undefined;

        // Tente composeAsync directement (sans isAvailableAsync qui bloque sur Android)
        try {
          await MailComposer.composeAsync({
            recipients: ['Kevin.perret@mysteriaevent.ch'],
            subject: mailSubject,
            body: mailBody,
            attachments,
          });
        } catch (composeError) {
          // Fallback mailto sans canOpenURL (échoue sur Android 11+ sans permission)
          const subject = encodeURIComponent(mailSubject);
          const body = encodeURIComponent(mailBody);
          await Linking.openURL(`mailto:Kevin.perret@mysteriaevent.ch?subject=${subject}&body=${body}`);
        }
      } catch (mailError) {
        console.warn('Mail composer error (non-bloquant):', mailError);
      }

      const { successHaptic } = await import('@/utils/haptics');
      successHaptic();

      setReportSent(true);
      setBugDescription('');
      setScreenshotUris([]);
    }

    setIsSendingReport(false);
  };

  const closeBugReport = () => {
    setShowBugReport(false);
    setBugDescription('');
    setScreenshotUris([]);
  };

  const getRoleBadgeVariant = (role: string): 'primary' | 'secondary' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'admin':     return 'primary';
      case 'moderator': return 'secondary';
      case 'committee': return 'info';
      default:          return 'info';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin':     return 'Administrateur';
      case 'moderator': return 'Modérateur';
      case 'committee': return 'Comité';
      default:          return 'Membre';
    }
  };

  const handleSidebarToggle = useCallback((toggle: () => void) => {
    setToggleSidebar(() => toggle);
  }, []);

  // ─── Écran : Signalement de bug ──────────────────────────────────────────────
  if (showBugReport) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Signaler un bug"
          showBackButton={true}
          onBackPress={closeBugReport}
          noLeftMargin={true}
        />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {reportSent ? (
              <View style={styles.reportSentContainer}>
                <AlertTriangle size={64} color={theme.success} style={styles.reportSentIcon} />
                <Text style={[styles.reportSentTitle, { color: theme.text }]}>
                  Merci pour votre signalement !
                </Text>
                <Text style={[styles.reportSentMessage, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Il sera traité dans les plus brefs délais.
                </Text>
                <Button title="Retour aux réglages" onPress={closeBugReport} style={styles.reportSentButton} />
              </View>
            ) : (
              <>
                <View style={styles.bugReportHeader}>
                  <Bug size={24} color={appColors.primary} />
                  <Text style={[styles.bugReportTitle, { color: theme.text }]}>
                    Décrivez le problème rencontré
                  </Text>
                </View>
                <Text style={[styles.bugReportDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Veuillez fournir autant de détails que possible pour nous aider à résoudre le problème.
                </Text>
                <View style={[styles.textAreaContainer, { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.textArea, { color: theme.text }]}
                    placeholder="Décrivez le bug ici..."
                    placeholderTextColor={darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    value={bugDescription}
                    onChangeText={setBugDescription}
                  />
                </View>

                {/* Captures d'écran (max 5) */}
                {screenshotUris.length < MAX_SCREENSHOTS && (
                  <TouchableOpacity
                    style={[styles.screenshotButton, { borderColor: appColors.primary, backgroundColor: `${appColors.primary}10` }]}
                    onPress={handlePickScreenshot}
                  >
                    <Camera size={18} color={appColors.primary} />
                    <Text style={[styles.screenshotButtonText, { color: appColors.primary }]}>
                      {screenshotUris.length === 0
                        ? "Joindre des captures d'écran"
                        : `Ajouter une capture (${screenshotUris.length}/${MAX_SCREENSHOTS})`}
                    </Text>
                  </TouchableOpacity>
                )}

                {screenshotUris.length > 0 && (
                  <View style={styles.screenshotGrid}>
                    {screenshotUris.map((uri, idx) => (
                      <View key={idx} style={styles.screenshotPreviewContainer}>
                        <Image
                          source={{ uri }}
                          style={styles.screenshotPreview}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={[styles.screenshotRemoveBtn, { backgroundColor: theme.error }]}
                          onPress={() => handleRemoveScreenshot(uri)}
                        >
                          <X size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <Button title="Envoyer le rapport" onPress={sendBugReport} loading={isSendingReport} style={styles.sendReportButton} fullWidth />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Écran principal : Réglages ──────────────────────────────────────────────
  return (
    <AppLayout hideMenuButton={true} onSidebarToggle={handleSidebarToggle}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Réglages ⚙️"
          onTitlePress={toggleSidebar ? toggleSidebar : undefined}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

          {/* Profil */}
          {user && (
            <View style={styles.profileSection}>
              <Avatar
                source={user.profileImage ? { uri: user.profileImage } : undefined}
                name={`${user.firstName} ${user.lastName}`}
                size={80}
              />
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>
                  {user.firstName} {user.lastName}
                </Text>
                <Badge
                  label={getRoleLabel(user.role)}
                  variant={getRoleBadgeVariant(user.role)}
                  size="small"
                  style={styles.roleBadge}
                />
              </View>
            </View>
          )}

          {/* Compte */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Compte</Text>
            <ListItem title="Mon profil" leftIcon={<UserCircle size={20} color={appColors.primary} />} showChevron onPress={handleProfile} />
            <ListItem title="Modifier mon profil" leftIcon={<User size={20} color={appColors.primary} />} showChevron onPress={handleEditProfile} />
            <ListItem title="Changer le mot de passe" leftIcon={<Lock size={20} color={appColors.primary} />} showChevron onPress={handleChangePassword} />
            {isAdminOrModerator && (
              <ListItem
                title="Panneau d'administration"
                leftIcon={<Shield size={20} color={appColors.primary} />}
                showChevron
                onPress={handleAdminPanel}
              />
            )}
          </View>

          <Divider />

          {/* Apparence */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Apparence</Text>
            <ListItem
              title="Mode sombre"
              leftIcon={darkMode ? <Moon size={20} color={appColors.primary} /> : <Sun size={20} color={appColors.primary} />}
              rightIcon={
                <Switch
                  value={darkMode}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: '#767577', true: `${appColors.primary}80` }}
                  thumbColor={darkMode ? appColors.primary : '#f4f3f4'}
                />
              }
            />
          </View>

          <Divider />

          {/* Support */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Support</Text>
            <ListItem title="Signaler un bug" leftIcon={<Bug size={20} color={appColors.primary} />} showChevron onPress={handleReportBug} />
            <ListItem
              title="Contacter l'administrateur"
              leftIcon={<AlertTriangle size={20} color={appColors.primary} />}
              showChevron
              onPress={() => Linking.openURL('mailto:kevin.perret@mysteriaevent.ch')}
            />
          </View>

          <Divider />

          {/* Déconnexion */}
          <View style={styles.section}>
            <ListItem
              title="Se déconnecter"
              leftIcon={<LogOut size={20} color={theme.error} />}
              titleStyle={{ color: theme.error }}
              onPress={handleLogout}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.version, { color: darkMode ? theme.inactive : '#999999' }]}>
              Version {Constants.expoConfig?.version ?? '—'}
            </Text>
            <Text style={[styles.copyright, { color: darkMode ? theme.inactive : '#999999' }]}>© {new Date().getFullYear()} Mystéria Event</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  profileSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  roleBadge: { marginBottom: 8 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', paddingHorizontal: 20, paddingVertical: 12 },
  footer: { alignItems: 'center', paddingVertical: 24 },
  version: { fontSize: 14, marginBottom: 4 },
  copyright: { fontSize: 12 },
  keyboardAvoidingView: { flex: 1 },
  bugReportHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 20, paddingTop: 20 },
  bugReportTitle: { fontSize: 18, fontWeight: '600', marginLeft: 12 },
  bugReportDescription: { fontSize: 14, marginBottom: 24, paddingHorizontal: 20 },
  textAreaContainer: { borderWidth: 1, borderRadius: 8, marginBottom: 16, marginHorizontal: 20 },
  textArea: { padding: 12, fontSize: 16, minHeight: 150, textAlignVertical: 'top' },
  screenshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  screenshotButtonText: { fontSize: 14, fontWeight: '500' },
  screenshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  screenshotPreviewContainer: {
    position: 'relative',
  },
  screenshotPreview: {
    width: 90,
    height: 150,
    borderRadius: 8,
  },
  screenshotRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendReportButton: { marginBottom: 24, marginHorizontal: 20 },
  reportSentContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  reportSentIcon: { marginBottom: 24 },
  reportSentTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  reportSentMessage: { fontSize: 16, marginBottom: 32, textAlign: 'center' },
  reportSentButton: { minWidth: 200 },
});
