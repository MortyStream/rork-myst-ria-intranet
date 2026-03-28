import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, User, Key, X, Save, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { useSupabaseUsersStore } from '@/store/supabase-users-store';
import { useSupabaseRolesStore } from '@/store/supabase-roles-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Picker } from '@/components/Picker';

export default function SupabaseUserFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getUserById, createUser, updateUser, isLoading, error, useMockData } = useSupabaseUsersStore();
  const { roles, fetchRoles, isLoading: rolesLoading } = useSupabaseRolesStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const isEditMode = !!id;
  const user = id ? getUserById(id) : undefined;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [roleId, setRoleId] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    // Fetch roles when component mounts
    fetchRoles();
    
    if (user) {
      setEmail(user.email || '');
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setRole(user.role || '');
      setRoleId(user.roleId || '');
    }
  }, [user]);
  
  const validateForm = () => {
    if (!email) {
      setFormError("L'email est obligatoire");
      return false;
    }
    
    if (!isEditMode && !password) {
      setFormError('Le mot de passe est obligatoire pour un nouveau compte');
      return false;
    }
    
    if (!firstName || !lastName) {
      setFormError('Le prénom et le nom sont obligatoires');
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError("Format d'email invalide");
      return false;
    }
    
    // Validate password strength for new accounts
    if (!isEditMode && password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    
    // Validate role selection
    if (!role && !roleId) {
      setFormError('Veuillez sélectionner un rôle');
      return false;
    }
    
    setFormError('');
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSuccess(false);
    
    try {
      // If a custom role is selected from the dropdown, use that role
      // Otherwise, use the manually entered role
      const selectedRole = roleId ? 
        (roles.find(r => r.id === roleId)?.label || role) : 
        role;
      
      // Map role names to expected values for the RPC function
      let normalizedRole = selectedRole.toLowerCase();
      
      // Map role names to the expected values
      if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
        normalizedRole = 'admin';
      } else if (normalizedRole === 'modérateur' || normalizedRole === 'moderator' || normalizedRole === 'moderateur') {
        normalizedRole = 'modérateur';
      } else if (normalizedRole === 'user' || normalizedRole === 'utilisateur') {
        normalizedRole = 'utilisateur';
      } else if (normalizedRole === 'externe' || normalizedRole === 'external') {
        normalizedRole = 'externe';
      } else {
        // Default to 'utilisateur' if role doesn't match expected values
        normalizedRole = 'utilisateur';
      }
      
      if (isEditMode && user) {
        const updatedUser = await updateUser(user.id, {
          email,
          firstName,
          lastName,
          role: selectedRole,
        });
        
        console.log("Utilisateur mis à jour avec succès :", updatedUser);
        setSuccess(true);
        
        // Navigate back to the list after successful update
        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        const newUser = await createUser(email, password, {
          firstName,
          lastName,
          role: normalizedRole, // Use normalized role for RPC function
        });
        
        console.log("Utilisateur créé avec succès :", newUser);
        setSuccess(true);
        
        // Navigate back to the list after successful creation
        setTimeout(() => {
          router.back();
        }, 1000);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setFormError("Une erreur est survenue lors de l'enregistrement");
      setSuccess(false);
    }
  };
  
  // Prepare role options for the picker
  const roleOptions = [
    { label: '-- Sélectionner un rôle --', value: '' },
    ...roles.map(role => ({ label: role.label, value: role.id }))
  ];
  
  // Handle role selection
  const handleRoleChange = (value: string) => {
    setRoleId(value);
    
    // If a role is selected from the dropdown, update the role field
    if (value) {
      const selectedRole = roles.find(r => r.id === value);
      if (selectedRole) {
        setRole(selectedRole.label);
      }
    } else {
      // If no role is selected, clear the role field
      setRole('');
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title={isEditMode ? 'Modifier un compte' : 'Créer un compte'}
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      {useMockData && (
        <View style={[styles.mockDataBanner, { backgroundColor: theme.warning + '20' }]}>
          <AlertTriangle size={20} color={theme.warning} style={styles.mockDataIcon} />
          <Text style={[styles.mockDataText, { color: theme.text }]}>
            Mode démo : Les modifications seront simulées et ne seront pas enregistrées dans Supabase.
          </Text>
        </View>
      )}
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {success && (
            <View style={[styles.successContainer, { backgroundColor: theme.success + '20' }]}>
              <CheckCircle size={20} color={theme.success} style={styles.successIcon} />
              <Text style={[styles.successText, { color: theme.success }]}>
                {isEditMode ? 'Utilisateur mis à jour avec succès !' : 'Utilisateur créé avec succès !'}
              </Text>
            </View>
          )}
          
          <View style={[styles.formContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Input
              label="Email"
              placeholder="Entrez l'email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={theme.text} />}
              containerStyle={styles.inputContainer}
            />
            
            {!isEditMode && (
              <Input
                label="Mot de passe"
                placeholder="Entrez le mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                showPasswordToggle
                leftIcon={<Key size={20} color={theme.text} />}
                containerStyle={styles.inputContainer}
              />
            )}
            
            <Input
              label="Prénom"
              placeholder="Entrez le prénom"
              value={firstName}
              onChangeText={setFirstName}
              leftIcon={<User size={20} color={theme.text} />}
              containerStyle={styles.inputContainer}
            />
            
            <Input
              label="Nom"
              placeholder="Entrez le nom"
              value={lastName}
              onChangeText={setLastName}
              leftIcon={<User size={20} color={theme.text} />}
              containerStyle={styles.inputContainer}
            />
            
            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerLabel, { color: theme.text }]}>Rôle</Text>
              <Picker
                selectedValue={roleId}
                onValueChange={handleRoleChange}
                items={roleOptions}
                style={[styles.picker, { backgroundColor: theme.input, borderColor: theme.border }]}
                textStyle={{ color: theme.text }}
                itemStyle={{ color: theme.text }}
              />
            </View>
            
            {!roleId && (
              <Input
                label="Rôle personnalisé"
                placeholder="Entrez un rôle personnalisé"
                value={role}
                onChangeText={setRole}
                containerStyle={styles.inputContainer}
                helperText="Laissez vide pour utiliser un rôle existant"
              />
            )}
            
            {(formError || error) && (
              <View style={[styles.errorContainer, { backgroundColor: theme.error + '20' }]}>
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {formError || error}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.buttonsContainer}>
            <Button
              title="Annuler"
              onPress={() => router.back()}
              variant="outline"
              style={[styles.button, { borderColor: theme.border }]}
              icon={<X size={20} color={theme.text} />}
            />
            
            <Button
              title={isEditMode ? 'Mettre à jour' : 'Créer'}
              onPress={handleSubmit}
              loading={isLoading}
              style={[styles.button, { backgroundColor: theme.primary }]}
              icon={<Save size={20} color="#ffffff" />}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mockDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  mockDataIcon: {
    marginRight: 8,
  },
  mockDataText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formContainer: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});