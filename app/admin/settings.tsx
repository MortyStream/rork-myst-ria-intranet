import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Settings,
  Moon,
  Sun,
  Bell,
  BellOff,
  RefreshCw,
  Database,
  Shield,
  Lock,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode, toggleDarkMode } = useSettingsStore();
  const { isMessagingEnabled, toggleMessaging } = useNotificationsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [isResetting, setIsResetting] = useState(false);
  
  // Vérifier si l'utilisateur est admin ou modérateur
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  if (!isAdminOrModerator) {
    router.replace('/admin');
    return null;
  }
  
  const handleResetApp = () => {
    Alert.alert(
      'Réinitialiser l\'application',
      'Êtes-vous sûr de vouloir réinitialiser toutes les données de l\'application ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => {
            setIsResetting(true);
            
            // Simuler une réinitialisation
            setTimeout(() => {
              setIsResetting(false);
              Alert.alert('Succès', 'L\'application a été réinitialisée avec succès.');
            }, 2000);
          },
        },
      ]
    );
  };
  
  const handleExportData = () => {
    Alert.alert('Information', 'L\'exportation des données sera disponible dans une prochaine mise à jour.');
  };
  
  const handleImportData = () => {
    Alert.alert('Information', 'L\'importation des données sera disponible dans une prochaine mise à jour.');
  };
  
  const handleSecuritySettings = () => {
    Alert.alert('Information', 'Les paramètres de sécurité avancés seront disponibles dans une prochaine mise à jour.');
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Paramètres système"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Apparence
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              {darkMode ? (
                <Moon size={20} color={theme.primary} style={styles.settingIcon} />
              ) : (
                <Sun size={20} color={theme.primary} style={styles.settingIcon} />
              )}
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Mode sombre
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#767577', true: `${theme.primary}80` }}
              thumbColor={darkMode ? theme.primary : '#f4f3f4'}
            />
          </View>
        </Card>
        
        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Notifications
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              {isMessagingEnabled ? (
                <Bell size={20} color={theme.primary} style={styles.settingIcon} />
              ) : (
                <BellOff size={20} color={theme.primary} style={styles.settingIcon} />
              )}
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Activer les notifications
              </Text>
            </View>
            <Switch
              value={isMessagingEnabled}
              onValueChange={toggleMessaging}
              trackColor={{ false: '#767577', true: `${theme.primary}80` }}
              thumbColor={isMessagingEnabled ? theme.primary : '#f4f3f4'}
            />
          </View>
          
          <Text style={[styles.settingDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
            {isMessagingEnabled 
              ? "Les utilisateurs recevront des notifications lorsque de nouveaux éléments sont ajoutés aux catégories auxquelles ils sont abonnés."
              : "Les notifications sont désactivées pour tous les utilisateurs."}
          </Text>
        </Card>
        
        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Sécurité
          </Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSecuritySettings}>
            <View style={styles.actionButtonContent}>
              <Shield size={20} color={theme.primary} style={styles.actionButtonIcon} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                Paramètres de sécurité avancés
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <View style={styles.actionButtonContent}>
              <Lock size={20} color={theme.primary} style={styles.actionButtonIcon} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                Modifier le mot de passe administrateur
              </Text>
            </View>
          </TouchableOpacity>
        </Card>
        
        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Données
          </Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
            <View style={styles.actionButtonContent}>
              <Database size={20} color={theme.primary} style={styles.actionButtonIcon} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                Exporter les données
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleImportData}>
            <View style={styles.actionButtonContent}>
              <Database size={20} color={theme.primary} style={styles.actionButtonIcon} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                Importer des données
              </Text>
            </View>
          </TouchableOpacity>
        </Card>
        
        <Card style={[styles.settingsCard, styles.dangerCard]}>
          <Text style={[styles.sectionTitle, { color: theme.error }]}>
            Zone de danger
          </Text>
          
          <Text style={[styles.dangerText, { color: darkMode ? theme.inactive : '#666666' }]}>
            Attention : les actions ci-dessous sont irréversibles et peuvent entraîner une perte de données.
          </Text>
          
          <Button
            title="Réinitialiser l'application"
            onPress={handleResetApp}
            loading={isResetting}
            variant="outline"
            style={styles.resetButton}
            textStyle={{ color: theme.error }}
            fullWidth
            leftIcon={<RefreshCw size={18} color={theme.error} />}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  settingsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  actionButton: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonIcon: {
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
  },
  dangerCard: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  dangerText: {
    fontSize: 14,
    marginBottom: 16,
  },
  resetButton: {
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
});