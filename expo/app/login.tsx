import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';

const localLogo = require('../assets/images/logo.png');
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { successHaptic } from '@/utils/haptics';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, refreshUserData } = useAuthStore();
  const { darkMode, appName, logoType, logoText, logoImageUrl } = useSettingsStore();
  const appColors = useAppColors();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      setFormError('Veuillez remplir tous les champs');
      return;
    }
    setFormError('');
    try {
      await login(username, password);
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
        successHaptic();

        // Premier login après installation → onboarding 3 écrans
        const { hasSeenOnboarding } = useSettingsStore.getState();
        router.replace(hasSeenOnboarding ? '/home' : '/onboarding');
      }
    } catch (error: any) {
      Alert.alert('Erreur', `Connexion impossible: ${error.message || JSON.stringify(error)}`);
    }
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
  const mutedColor = theme.inactive;
  const inputIconColor = darkMode ? theme.text : appColors.primary;

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

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.loginButton}
              fullWidth
            />

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
  loginButton: {
    marginTop: 4,
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
