import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Palette,
  Type,
  Image,
  MessageSquare,
  RefreshCw,
  Check,
  X,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, adjustBrightness } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

// Predefined color options
const COLOR_OPTIONS = [
  '#c22e0f', // Default Mystéria red
  '#e03131', // Red
  '#f76707', // Orange
  '#f59f00', // Yellow
  '#37b24d', // Green
  '#1098ad', // Teal
  '#1c7ed6', // Blue
  '#4c6ef5', // Indigo
  '#7950f2', // Violet
  '#ae3ec9', // Purple
  '#212529', // Dark
];

export default function AppearanceScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    darkMode, 
    appName, 
    primaryColor, 
    welcomeMessage, 
    logoType, 
    logoText,
    logoImageUrl,
    setAppName,
    setPrimaryColor,
    setWelcomeMessage,
    setLogoType,
    setLogoText,
    setLogoImageUrl,
    resetAppearance,
  } = useSettingsStore();
  
  const theme = darkMode ? Colors.dark : Colors.light;
  
  // Local state for form values
  const [localAppName, setLocalAppName] = useState(appName);
  const [localWelcomeMessage, setLocalWelcomeMessage] = useState(welcomeMessage);
  const [localLogoText, setLocalLogoText] = useState(logoText);
  const [localLogoType, setLocalLogoType] = useState(logoType);
  const [selectedColor, setSelectedColor] = useState(primaryColor);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Reset local state when global state changes
  useEffect(() => {
    setLocalAppName(appName);
    setLocalWelcomeMessage(welcomeMessage);
    setLocalLogoText(logoText);
    setLocalLogoType(logoType);
    setSelectedColor(primaryColor);
  }, [appName, welcomeMessage, logoText, logoType, primaryColor]);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  
  if (!isAdmin) {
    router.replace('/admin');
    return null;
  }
  
  const handleSaveChanges = () => {
    setIsSaving(true);
    
    // Simulate a delay for saving
    setTimeout(() => {
      // Update global state
      setAppName(localAppName);
      setPrimaryColor(selectedColor);
      setWelcomeMessage(localWelcomeMessage);
      setLogoType(localLogoType);
      setLogoText(localLogoText);
      
      setIsSaving(false);
      setIsEditing(false);
      
      Alert.alert(
        "Modifications enregistrées",
        "Les changements d'apparence ont été appliqués avec succès.",
        [{ text: "OK" }]
      );
    }, 1000);
  };
  
  const handleResetAppearance = () => {
    Alert.alert(
      "Réinitialiser l'apparence",
      "Êtes-vous sûr de vouloir réinitialiser tous les paramètres d'apparence aux valeurs par défaut ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: () => {
            resetAppearance();
            setLocalAppName(appName);
            setLocalWelcomeMessage(welcomeMessage);
            setLocalLogoText(logoText);
            setLocalLogoType(logoType);
            setSelectedColor(primaryColor);
            setIsEditing(false);
            
            Alert.alert(
              "Apparence réinitialisée",
              "Les paramètres d'apparence ont été réinitialisés aux valeurs par défaut."
            );
          }
        }
      ]
    );
  };
  
  const renderColorOption = (color: string) => {
    const isSelected = color === selectedColor;
    
    return (
      <TouchableOpacity
        key={color}
        style={[
          styles.colorOption,
          { backgroundColor: color },
          isSelected && styles.colorOptionSelected,
          isSelected && { borderColor: darkMode ? '#ffffff' : '#000000' }
        ]}
        onPress={() => setSelectedColor(color)}
        disabled={!isEditing}
      >
        {isSelected && (
          <Check size={16} color="#ffffff" />
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Apparence de l'application"
        showBackButton={true}
        onBackPress={() => router.back()}
        rightComponent={
          isEditing ? (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                onPress={() => setIsEditing(false)}
                style={styles.headerButton}
              >
                <X size={24} color={theme.error} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSaveChanges}
                style={[styles.headerButton, styles.saveButton]}
                disabled={isSaving}
              >
                <Check size={24} color={theme.success} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={() => setIsEditing(true)}
              style={styles.headerButton}
            >
              <Palette size={24} color={theme.primary} />
            </TouchableOpacity>
          )
        }
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Preview Section */}
        <Card style={styles.previewCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Aperçu
          </Text>
          
          <View style={[styles.logoPreview, { backgroundColor: `${selectedColor}15` }]}>
            <Text style={[styles.logoPreviewText, { color: selectedColor }]}>
              {localLogoText}
            </Text>
          </View>
          
          <Text style={[styles.appNamePreview, { color: theme.text }]}>
            {localAppName}
          </Text>
          
          <View style={[styles.welcomePreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.welcomePreviewText, { color: theme.text }]}>
              {localWelcomeMessage}
            </Text>
          </View>
          
          <View style={styles.colorPreview}>
            <View style={[styles.colorPreviewItem, { backgroundColor: selectedColor }]}>
              <Text style={styles.colorPreviewText}>Primaire</Text>
            </View>
            <View style={[styles.colorPreviewItem, { backgroundColor: adjustBrightness(selectedColor, 30) }]}>
              <Text style={styles.colorPreviewText}>Clair</Text>
            </View>
            <View style={[styles.colorPreviewItem, { backgroundColor: adjustBrightness(selectedColor, -30) }]}>
              <Text style={styles.colorPreviewText}>Foncé</Text>
            </View>
          </View>
        </Card>
        
        {/* App Name Section */}
        <Card style={styles.settingsCard}>
          <View style={styles.settingHeader}>
            <Type size={20} color={theme.primary} style={styles.settingIcon} />
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Nom de l'application
            </Text>
          </View>
          
          <Input
            value={localAppName}
            onChangeText={setLocalAppName}
            placeholder="Nom de l'application"
            editable={isEditing}
            containerStyle={styles.input}
          />
        </Card>
        
        {/* Logo Section */}
        <Card style={styles.settingsCard}>
          <View style={styles.settingHeader}>
            <Image size={20} color={theme.primary} style={styles.settingIcon} />
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Logo
            </Text>
          </View>
          
          <View style={styles.logoTypeContainer}>
            <Text style={[styles.logoTypeLabel, { color: theme.text }]}>
              Type de logo:
            </Text>
            <View style={styles.logoTypeOptions}>
              <TouchableOpacity
                style={[
                  styles.logoTypeOption,
                  localLogoType === 'text' && [styles.logoTypeOptionSelected, { borderColor: theme.primary }],
                  { backgroundColor: localLogoType === 'text' ? `${theme.primary}15` : theme.card }
                ]}
                onPress={() => setLocalLogoType('text')}
                disabled={!isEditing}
              >
                <Text style={[
                  styles.logoTypeOptionText,
                  { color: localLogoType === 'text' ? theme.primary : theme.text }
                ]}>
                  Texte
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.logoTypeOption,
                  localLogoType === 'image' && [styles.logoTypeOptionSelected, { borderColor: theme.primary }],
                  { backgroundColor: localLogoType === 'image' ? `${theme.primary}15` : theme.card }
                ]}
                onPress={() => {
                  Alert.alert(
                    "Fonctionnalité à venir",
                    "L'upload d'images sera disponible dans une prochaine mise à jour. Pour le moment, seul le logo texte est disponible."
                  );
                }}
                disabled={!isEditing}
              >
                <Text style={[
                  styles.logoTypeOptionText,
                  { color: localLogoType === 'image' ? theme.primary : theme.text }
                ]}>
                  Image
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {localLogoType === 'text' && (
            <Input
              value={localLogoText}
              onChangeText={setLocalLogoText}
              placeholder="Texte du logo (1-2 caractères)"
              maxLength={2}
              editable={isEditing}
              containerStyle={styles.input}
            />
          )}
          
          {localLogoType === 'image' && (
            <View style={[styles.imageUploadPlaceholder, { backgroundColor: `${theme.primary}15`, borderColor: theme.border }]}>
              <Text style={[styles.imageUploadText, { color: theme.text }]}>
                L'upload d'images sera disponible dans une prochaine mise à jour
              </Text>
            </View>
          )}
        </Card>
        
        {/* Welcome Message Section */}
        <Card style={styles.settingsCard}>
          <View style={styles.settingHeader}>
            <MessageSquare size={20} color={theme.primary} style={styles.settingIcon} />
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Message d'accueil
            </Text>
          </View>
          
          <Input
            value={localWelcomeMessage}
            onChangeText={setLocalWelcomeMessage}
            placeholder="Message d'accueil"
            multiline
            numberOfLines={3}
            editable={isEditing}
            containerStyle={styles.input}
          />
        </Card>
        
        {/* Color Theme Section */}
        <Card style={styles.settingsCard}>
          <View style={styles.settingHeader}>
            <Palette size={20} color={theme.primary} style={styles.settingIcon} />
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Couleur principale
            </Text>
          </View>
          
          <View style={styles.colorOptions}>
            {COLOR_OPTIONS.map(renderColorOption)}
          </View>
        </Card>
        
        {/* Reset Section */}
        <Card style={[styles.settingsCard, styles.dangerCard]}>
          <Text style={[styles.dangerTitle, { color: theme.error }]}>
            Réinitialiser l'apparence
          </Text>
          
          <Text style={[styles.dangerText, { color: darkMode ? theme.inactive : '#666666' }]}>
            Cette action réinitialisera tous les paramètres d'apparence aux valeurs par défaut.
          </Text>
          
          <Button
            title="Réinitialiser l'apparence"
            onPress={handleResetAppearance}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  previewCard: {
    marginBottom: 16,
    alignItems: 'center',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoPreviewText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  appNamePreview: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  welcomePreview: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  welcomePreviewText: {
    fontSize: 16,
    textAlign: 'center',
  },
  colorPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  colorPreviewItem: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  colorPreviewText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsCard: {
    marginBottom: 16,
    padding: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    marginBottom: 8,
  },
  logoTypeContainer: {
    marginBottom: 16,
  },
  logoTypeLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  logoTypeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logoTypeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  logoTypeOptionSelected: {
    borderWidth: 1,
  },
  logoTypeOptionText: {
    fontWeight: '500',
  },
  imageUploadPlaceholder: {
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imageUploadText: {
    textAlign: 'center',
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderWidth: 2,
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