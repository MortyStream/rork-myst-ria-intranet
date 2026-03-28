import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Key,
  Save,
  RefreshCw,
  AlertTriangle,
  X,
  Database,
  Globe,
  Lock,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { testAuth, reinitializeSupabase } from '@/utils/supabase';

export default function DatabaseConfigScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    darkMode, 
    supabaseUrl, 
    supabaseKey, 
    setSupabaseUrl, 
    setSupabaseKey,
    resetSupabaseConfig
  } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [url, setUrl] = useState(supabaseUrl || '');
  const [key, setKey] = useState(supabaseKey || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failure' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.role === 'admin';
  
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/admin');
    }
  }, [isAdmin, router]);
  
  const handleTestConnection = async () => {
    if (!url || !key) {
      Alert.alert("Erreur", "Veuillez saisir l'URL et la clé API Supabase");
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Test the connection with the new credentials without saving them yet
      const tempSetUrl = useSettingsStore.getState().setSupabaseUrl;
      const tempSetKey = useSettingsStore.getState().setSupabaseKey;
      
      // Temporarily set the new values
      tempSetUrl(url);
      tempSetKey(key);
      
      // Reinitialize Supabase with the new values
      reinitializeSupabase();
      
      // Test authentication
      const result = await testAuth();
      
      if (result.success) {
        setTestResult('success');
        Alert.alert("Succès", "Connexion à Supabase établie avec succès");
      } else {
        setTestResult('failure');
        Alert.alert("Erreur", "Impossible de se connecter à Supabase avec ces informations");
        
        // Revert to original values if test fails
        tempSetUrl(supabaseUrl);
        tempSetKey(supabaseKey);
        reinitializeSupabase();
      }
    } catch (error) {
      console.error("Error testing Supabase connection:", error);
      setTestResult('failure');
      Alert.alert("Erreur", "Impossible de se connecter à Supabase avec ces informations");
      
      // Revert to original values
      useSettingsStore.getState().setSupabaseUrl(supabaseUrl);
      useSettingsStore.getState().setSupabaseKey(supabaseKey);
      reinitializeSupabase();
    } finally {
      setIsTesting(false);
    }
  };
  
  const handleSaveConfig = async () => {
    if (!url || !key) {
      Alert.alert("Erreur", "Veuillez saisir l'URL et la clé API Supabase");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Save the new configuration
      setSupabaseUrl(url);
      setSupabaseKey(key);
      
      // Reinitialize Supabase with the new configuration
      reinitializeSupabase();
      
      setIsEditing(false);
      Alert.alert(
        "Configuration enregistrée",
        "La configuration Supabase a été mise à jour avec succès. L'application utilisera ces nouvelles informations pour se connecter à votre base de données.",
        [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error("Error saving Supabase configuration:", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de l'enregistrement de la configuration");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleResetConfig = () => {
    Alert.alert(
      "Réinitialiser la configuration",
      "Êtes-vous sûr de vouloir réinitialiser la configuration Supabase aux valeurs par défaut ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: () => {
            resetSupabaseConfig();
            setUrl(useSettingsStore.getState().supabaseUrl || '');
            setKey(useSettingsStore.getState().supabaseKey || '');
            setIsEditing(false);
            
            // Reinitialize Supabase with the default configuration
            reinitializeSupabase();
            
            Alert.alert("Configuration réinitialisée", "La configuration Supabase a été réinitialisée aux valeurs par défaut");
          }
        }
      ]
    );
  };
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Configuration Supabase"
        showBackButton={true}
        onBackPress={() => router.back()}
        rightComponent={
          isEditing ? (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                onPress={() => {
                  setIsEditing(false);
                  setUrl(supabaseUrl || '');
                  setKey(supabaseKey || '');
                }}
                style={styles.headerButton}
              >
                <X size={24} color={theme.error} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSaveConfig}
                style={[styles.headerButton, styles.saveButton]}
                disabled={isSaving}
              >
                <Save size={24} color={theme.success} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={() => setIsEditing(true)}
              style={styles.headerButton}
            >
              <Key size={24} color={appColors.primary} />
            </TouchableOpacity>
          )
        }
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Database size={22} color={appColors.primary} style={styles.cardIcon} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Configuration de l'API Supabase
                </Text>
              </View>
            </View>
            
            <Text style={[styles.cardDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
              Configurez les informations de connexion à votre base de données Supabase. Ces informations sont nécessaires pour que l'application puisse communiquer avec votre base de données.
            </Text>
            
            <View style={styles.warningContainer}>
              <AlertTriangle size={20} color={theme.warning} style={styles.warningIcon} />
              <Text style={[styles.warningText, { color: theme.warning }]}>
                Attention : Ces informations sont sensibles. Assurez-vous de les garder confidentielles et de ne pas les partager.
              </Text>
            </View>
            
            <View style={styles.formContainer}>
              <Input
                label="URL Supabase"
                placeholder="https://votre-projet.supabase.co"
                value={url}
                onChangeText={setUrl}
                editable={isEditing}
                leftIcon={<Globe size={20} color={theme.text} />}
                containerStyle={styles.input}
              />
              
              <Input
                label="Clé API Supabase"
                placeholder="Votre clé API Supabase"
                value={key}
                onChangeText={setKey}
                editable={isEditing}
                secureTextEntry={!isEditing}
                leftIcon={<Lock size={20} color={theme.text} />}
                containerStyle={styles.input}
              />
              
              {isEditing && (
                <View style={styles.testButtonContainer}>
                  <Button
                    title="Tester la connexion"
                    onPress={handleTestConnection}
                    loading={isTesting}
                    style={[styles.testButton, { backgroundColor: appColors.primary }]}
                    icon={<RefreshCw size={18} color="#ffffff" />}
                    fullWidth
                  />
                </View>
              )}
              
              {testResult === 'success' && (
                <View style={[styles.testResultContainer, { backgroundColor: theme.success + '20' }]}>
                  <CheckCircle size={20} color={theme.success} style={styles.testResultIcon} />
                  <Text style={[styles.testResultText, { color: theme.success }]}>
                    Connexion établie avec succès
                  </Text>
                </View>
              )}
              
              {testResult === 'failure' && (
                <View style={[styles.testResultContainer, { backgroundColor: theme.error + '20' }]}>
                  <XCircle size={20} color={theme.error} style={styles.testResultIcon} />
                  <Text style={[styles.testResultText, { color: theme.error }]}>
                    Échec de la connexion
                  </Text>
                </View>
              )}
            </View>
          </Card>
          
          <Card style={[styles.card, styles.infoCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Info size={22} color={appColors.primary} style={styles.cardIcon} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Comment obtenir ces informations ?
                </Text>
              </View>
            </View>
            
            <Text style={[styles.infoText, { color: theme.text }]}>
              1. Connectez-vous à votre compte Supabase (https://supabase.com)
            </Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              2. Sélectionnez votre projet
            </Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              3. Dans le menu de gauche, cliquez sur "Settings" puis "API"
            </Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              4. Copiez l'URL du projet et la clé "anon public" ou "service_role" selon vos besoins
            </Text>
          </Card>
          
          {isEditing && (
            <Card style={[styles.card, styles.dangerCard]}>
              <Text style={[styles.dangerTitle, { color: theme.error }]}>
                Réinitialiser la configuration
              </Text>
              
              <Text style={[styles.dangerText, { color: darkMode ? theme.inactive : '#666666' }]}>
                Cette action réinitialisera la configuration Supabase aux valeurs par défaut.
              </Text>
              
              <Button
                title="Réinitialiser la configuration"
                onPress={handleResetConfig}
                variant="outline"
                style={styles.resetButton}
                textStyle={{ color: theme.error }}
                fullWidth
                leftIcon={<RefreshCw size={18} color={theme.error} />}
              />
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  saveButton: {
    marginLeft: 8,
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
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningIcon: {
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
  },
  formContainer: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  testButtonContainer: {
    marginBottom: 16,
  },
  testButton: {
    marginTop: 8,
  },
  testResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  testResultIcon: {
    marginRight: 8,
  },
  testResultText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: 'rgba(0, 123, 255, 0.05)',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
  },
  dangerCard: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  dangerText: {
    fontSize: 14,
    marginBottom: 16,
  },
  resetButton: {
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
});