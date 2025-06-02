import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const toggleShowCurrentPassword = () => {
    setShowCurrentPassword(!showCurrentPassword);
  };
  
  const toggleShowNewPassword = () => {
    setShowNewPassword(!showNewPassword);
  };
  
  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  const handleSave = () => {
    // Réinitialiser l'erreur
    setError('');
    
    // Vérifier que tous les champs sont remplis
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    
    // Vérifier que le nouveau mot de passe et la confirmation correspondent
    if (newPassword !== confirmPassword) {
      setError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }
    
    // Vérifier que le nouveau mot de passe est différent de l'ancien
    if (currentPassword === newPassword) {
      setError('Le nouveau mot de passe doit être différent de l\'ancien.');
      return;
    }
    
    // Vérifier que le nouveau mot de passe est assez fort
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simuler une requête API pour changer le mot de passe
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Succès',
        'Votre mot de passe a été modifié avec succès.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }, 1500);
  };
  
  const handleCancel = () => {
    router.back();
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Changer le mot de passe"
        showBackButton={true}
        onBackPress={handleCancel}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              <Lock size={18} color={theme.primary} /> Sécurité
            </Text>
            
            <Input
              label="Mot de passe actuel"
              placeholder="Entrez votre mot de passe actuel"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              containerStyle={styles.inputContainer}
              rightIcon={
                <TouchableOpacity onPress={toggleShowCurrentPassword}>
                  {showCurrentPassword ? (
                    <EyeOff size={20} color={theme.text} />
                  ) : (
                    <Eye size={20} color={theme.text} />
                  )}
                </TouchableOpacity>
              }
            />
            
            <Input
              label="Nouveau mot de passe"
              placeholder="Entrez votre nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              containerStyle={styles.inputContainer}
              rightIcon={
                <TouchableOpacity onPress={toggleShowNewPassword}>
                  {showNewPassword ? (
                    <EyeOff size={20} color={theme.text} />
                  ) : (
                    <Eye size={20} color={theme.text} />
                  )}
                </TouchableOpacity>
              }
            />
            
            <Input
              label="Confirmer le nouveau mot de passe"
              placeholder="Confirmez votre nouveau mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              containerStyle={styles.inputContainer}
              rightIcon={
                <TouchableOpacity onPress={toggleShowConfirmPassword}>
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={theme.text} />
                  ) : (
                    <Eye size={20} color={theme.text} />
                  )}
                </TouchableOpacity>
              }
            />
            
            {error ? (
              <Text style={[styles.errorText, { color: theme.error }]}>
                {error}
              </Text>
            ) : null}
            
            <Text style={[styles.passwordRequirements, { color: darkMode ? theme.inactive : '#666666' }]}>
              Le mot de passe doit contenir au moins 8 caractères.
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Annuler"
              onPress={handleCancel}
              variant="outline"
              style={styles.cancelButton}
              textStyle={{ color: theme.error }}
              fullWidth
            />
            <Button
              title="Enregistrer"
              onPress={handleSave}
              loading={isSubmitting}
              style={styles.saveButton}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// TouchableOpacity component for the eye icons
const TouchableOpacity = ({ children, onPress }) => {
  return (
    <View style={{ padding: 8 }} onTouchEnd={onPress}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
  },
  passwordRequirements: {
    fontSize: 14,
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
  cancelButton: {
    marginBottom: 12,
  },
  saveButton: {
    marginBottom: 24,
  },
});