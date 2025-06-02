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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Mail } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { reinitializeSupabase } from '@/utils/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, refreshUserData } = useAuthStore();
  const { darkMode, appName, logoType, logoText, supabaseUrl, supabaseKey } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  
  // Ensure Supabase is initialized with the current settings
  useEffect(() => {
    // Make sure Supabase is initialized with the current settings
    if (supabaseUrl && supabaseKey) {
      reinitializeSupabase();
    }
  }, [supabaseUrl, supabaseKey]);
  
  const handleLogin = async () => {
    if (!username || !password) {
      setFormError('Veuillez remplir tous les champs');
      return;
    }
    
    setFormError('');
    
    try {
      console.log('Attempting login with provided credentials');
      await login(username, password);
      
      // Check the auth store error state after login attempt
      const currentError = useAuthStore.getState().error;
      
      if (!currentError) {
        console.log('Login successful, refreshing user data and redirecting to home');
        
        // Ensure we have the latest user data from the database
        await refreshUserData();
        
        router.replace('/home');
      } else {
        console.log('Login failed:', currentError);
        // Error is already set in the store and will be displayed
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      Alert.alert('Erreur', `Une erreur est survenue lors de la connexion: ${error.message || JSON.stringify(error)}`);
    }
  };
  
  const handleQuickLogin = async () => {
    setFormError('');
    
    try {
      console.log('Attempting quick admin login');
      await login('kevin.perret@mysteriaevent.ch', 'MysteriaAdmin');
      
      // Check the auth store error state after login attempt
      const currentError = useAuthStore.getState().error;
      
      if (!currentError) {
        console.log('Quick login successful, refreshing user data and redirecting to home');
        
        // Ensure we have the latest user data from the database
        await refreshUserData();
        
        router.replace('/home');
      } else {
        console.log('Quick login failed:', currentError);
        // Error is already set in the store and will be displayed
      }
    } catch (error) {
      console.error('Quick login error:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      Alert.alert('Erreur', `Une erreur est survenue lors de la connexion rapide: ${error.message || JSON.stringify(error)}`);
    }
  };
  
  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };
  
  return (
    <LinearGradient
      colors={[appColors.primary, appColors.primaryLight]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
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
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>{logoText}</Text>
            </View>
            <Text style={styles.title}>{appName}</Text>
            <Text style={styles.subtitle}>Intranet</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Input
              label="Nom d'utilisateur ou email"
              placeholder="Entrez votre identifiant"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={darkMode ? '#ffffff' : '#333333'} />}
              containerStyle={styles.inputContainer}
            />
            
            <Input
              label="Mot de passe"
              placeholder="Entrez votre mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showPasswordToggle
              leftIcon={<Lock size={20} color={darkMode ? '#ffffff' : '#333333'} />}
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
            
            {/* Quick Login button - only shown in development mode */}
            {__DEV__ && (
              <Button
                title="Connexion rapide (Admin)"
                onPress={handleQuickLogin}
                style={styles.quickLoginButton}
                textStyle={styles.quickLoginText}
                fullWidth
              />
            )}
            
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} {appName}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
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
    marginTop: 8,
  },
  quickLoginButton: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  quickLoginText: {
    color: '#ffffff',
  },
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
});