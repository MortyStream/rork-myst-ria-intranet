import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, isLoading, error } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleResetPassword = async () => {
    if (!email) {
      setFormError('Veuillez entrer votre adresse email');
      return;
    }
    
    if (!email.includes('@')) {
      setFormError('Veuillez entrer une adresse email valide');
      return;
    }
    
    setFormError('');
    
    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la réinitialisation du mot de passe');
    }
  };
  
  const handleBackToLogin = () => {
    router.back();
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Mot de passe oublié"
        onBackPress={handleBackToLogin}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {isSubmitted ? (
            <View style={styles.successContainer}>
              <Text style={[styles.successTitle, { color: theme.text }]}>
                Email envoyé !
              </Text>
              <Text style={[styles.successMessage, { color: darkMode ? theme.inactive : '#666666' }]}>
                Si un compte existe avec cette adresse email, vous recevrez un lien pour réinitialiser votre mot de passe.
              </Text>
              <Button
                title="Retour à la connexion"
                onPress={handleBackToLogin}
                style={styles.backButton}
              />
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={[styles.instructions, { color: theme.text }]}>
                Entrez votre adresse email pour recevoir un lien de réinitialisation de mot de passe.
              </Text>
              
              <Input
                label="Email"
                placeholder="Entrez votre adresse email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon={<Mail size={20} color={darkMode ? theme.text : '#333333'} />}
                containerStyle={styles.inputContainer}
              />
              
              {(formError || error) && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {formError || error}
                </Text>
              )}
              
              <Button
                title="Réinitialiser le mot de passe"
                onPress={handleResetPassword}
                loading={isLoading}
                style={styles.resetButton}
                fullWidth
              />
              
              <Button
                title="Retour à la connexion"
                onPress={handleBackToLogin}
                variant="outline"
                style={styles.backButton}
                fullWidth
              />
            </View>
          )}
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
    padding: 24,
  },
  formContainer: {
    marginTop: 24,
  },
  instructions: {
    fontSize: 16,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 16,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
});