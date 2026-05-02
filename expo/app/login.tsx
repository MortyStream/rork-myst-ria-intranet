import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';

const localLogo = require('../assets/images/logo.png');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

const SAVED_CREDENTIALS_KEY = 'mysteria-saved-credentials';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, refreshUserData } = useAuthStore();
  const { darkMode, appName, logoType, logoText, logoImageUrl } = useSettingsStore();
  const appColors = useAppColors();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{ email: string; password: string } | null>(null);

  // Charger les identifiants sauvegardés
  useEffect(() => {
    AsyncStorage.getItem(SAVED_CREDENTIALS_KEY).then((raw) => {
      if (raw) {
        try {
          const creds = JSON.parse(raw);
          setSavedCredentials(creds);
        } catch {}
      }
    });
  }, []);

  const doLogin = async (email: string, pwd: string) => {
    await login(email, pwd);
    const state = useAuthStore.getState();
    // On se fie à isAuthenticated et à la présence d'un user — un "warning"
    // non bloquant dans state.error ne doit pas empêcher la redirection.
    if (state.isAuthenticated && state.user) {
      try {
        await refreshUserData();
      } catch (e) {
        console.log('refreshUserData error (ignored):', e);
      }
      // Haptic success — feedback tactile que le login a marché
      const { successHaptic } = await import('@/utils/haptics');
      successHaptic();

      // Premier login après installation → onboarding 3 écrans
      const { hasSeenOnboarding } = useSettingsStore.getState();
      router.replace(hasSeenOnboarding ? '/home' : '/onboarding');
      return true;
    }
    return false;
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setFormError('Veuillez remplir tous les champs');
      return;
    }
    setFormError('');
    try {
      const success = await doLogin(username, password);
      if (success && rememberMe) {
        await AsyncStorage.setItem(
          SAVED_CREDENTIALS_KEY,
          JSON.stringify({ email: username, password })
        );
        setSavedCredentials({ email: username, password });
      }
    } catch (error: any) {
      Alert.alert('Erreur', `Connexion impossible: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleQuickLogin = async () => {
    if (!savedCredentials) return;
    setFormError('');
    try {
      await doLogin(savedCredentials.email, savedCredentials.password);
    } catch (error: any) {
      Alert.alert('Erreur', `Connexion rapide impossible: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleForgetCredentials = async () => {
    await AsyncStorage.removeItem(SAVED_CREDENTIALS_KEY);
    setSavedCredentials(null);
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const theme = darkMode ? Colors.dark : Colors.light;

  const logoSource = (logoType === 'image' && logoImageUrl)
    ? { uri: logoImageUrl }
    : localLogo;

  // Couleurs adaptées au thème
  const bgColor = darkMode ? theme.background : '#ffffff';
  const logoTint = darkMode ? undefined : appColors.primary;
  const subtitleColor = darkMode ? theme.inactive : appColors.primary;
  const formBg = darkMode ? theme.card : '#f5f5f5';
  const textColor = theme.text;
  const mutedColor = theme.inactive;
  const inputIconColor = darkMode ? theme.text : appColors.primary;
  const quickLoginBg = darkMode ? 'rgba(255,255,255,0.08)' : `${appColors.primary}15`;
  const quickLoginBorder = darkMode ? 'rgba(255,255,255,0.2)' : `${appColors.primary}40`;
  const quickLoginTextColor = darkMode ? '#ffffff' : appColors.primary;
  const forgetTextColor = darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  return (
    // View fixe — pas de composant recréé à chaque render (évite le bug clavier)
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            {logoSource ? (
              <Image
                source={logoSource}
                style={[styles.logoImage, logoTint ? { tintColor: logoTint } : undefined]}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.logoContainer, { backgroundColor: `${appColors.primary}15` }]}>
                <Text style={[styles.logoText, { color: appColors.primary }]}>
                  {(logoText || appName || 'M').charAt(0)}
                </Text>
              </View>
            )}
            <Text style={[styles.subtitle, { color: subtitleColor }]}>Intranet</Text>
          </View>

          <View style={[styles.formContainer, { backgroundColor: formBg }]}>
            <Input
              label="Nom d'utilisateur ou email"
              placeholder="Entrez votre identifiant"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={inputIconColor} />}
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Mot de passe"
              placeholder="Entrez votre mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showPasswordToggle
              leftIcon={<Lock size={20} color={inputIconColor} />}
              containerStyle={styles.inputContainer}
            />

            {(formError || error) && (
              <Text style={styles.errorText}>
                {formError || error}
              </Text>
            )}

            {/* Mémoriser mes identifiants */}
            <View style={styles.rememberRow}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: theme.border, true: appColors.primary }}
                thumbColor="#ffffff"
              />
              <Text style={[styles.rememberText, { color: mutedColor }]}>
                Mémoriser mes identifiants
              </Text>
            </View>

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.loginButton}
              fullWidth
            />

            {/* Connexion rapide — visible uniquement si des identifiants sont sauvegardés */}
            {savedCredentials && (
              <View style={styles.quickLoginContainer}>
                <Button
                  title={`⚡ Connexion rapide (${savedCredentials.email})`}
                  onPress={handleQuickLogin}
                  loading={isLoading}
                  style={[styles.quickLoginButton, { backgroundColor: quickLoginBg, borderColor: quickLoginBorder }]}
                  textStyle={[styles.quickLoginText, { color: quickLoginTextColor }]}
                  fullWidth
                />
                <TouchableOpacity onPress={handleForgetCredentials} style={styles.forgetLink}>
                  <Text style={[styles.forgetText, { color: forgetTextColor }]}>
                    Oublier ces identifiants
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotPasswordButton}
            >
              <Text style={[styles.forgotPasswordText, { color: mutedColor }]}>
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: mutedColor }]}>
              © {new Date().getFullYear()} {appName}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoImage: {
    width: 240,
    height: 80,
    marginBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  formContainer: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  errorText: {
    color: '#ff3b30',
    marginBottom: 16,
    textAlign: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  rememberText: {
    fontSize: 14,
  },
  loginButton: {
    marginTop: 4,
  },
  quickLoginContainer: {
    marginTop: 12,
  },
  quickLoginButton: {
    borderWidth: 1,
  },
  quickLoginText: {
    fontSize: 14,
  },
  forgetLink: {
    alignItems: 'center',
    marginTop: 6,
  },
  forgetText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    fontSize: 12,
  },
});
