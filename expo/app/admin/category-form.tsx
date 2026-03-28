import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  FolderPlus,
  Lock,
  Users,
} from 'lucide-react-native';
import { useResourcesStore } from '@/store/resources-store';
import { useSettingsStore } from '@/store/settings-store';
import { useUsersStore } from '@/store/users-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ListItem } from '@/components/ListItem';

// Liste d'emojis pour les catégories
const CATEGORY_EMOJIS = [
  '📋', '💰', '🤝', '🎬', '👥', '🎥', '🌀', '🎭', '🎨', '🖌️', '📱', '🌟', '📚', '📝', '📊', '📈', '📢', '🔍', '🎯', '🏆'
];

export default function CategoryFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addCategory, getCategoryById, updateCategory, initializeDefaultCategories } = useResourcesStore();
  const { users } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const categoryId = params.id as string | undefined;
  const existingCategory = categoryId ? getCategoryById(categoryId) : undefined;

  const [name, setName] = useState(existingCategory?.name || '');
  const [description, setDescription] = useState(existingCategory?.description || '');
  const [icon, setIcon] = useState(existingCategory?.icon || '📁');
  const [order, setOrder] = useState(existingCategory?.order.toString() || '0');
  const [restrictedAccess, setRestrictedAccess] = useState(existingCategory?.restrictedAccess || false);
  const [responsibleId, setResponsibleId] = useState(existingCategory?.responsibleId || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showResponsiblePicker, setShowResponsiblePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialiser les catégories par défaut si nécessaire
  useEffect(() => {
    initializeDefaultCategories();
  }, []);

  // Filtrer les utilisateurs pour n'afficher que les admins, modérateurs et membres du comité
  const eligibleUsers = users.filter(user => 
    user.role === 'admin' || user.role === 'moderator' || user.role === 'committee'
  );

  const handleSave = () => {
    if (!name) {
      Alert.alert('Champ obligatoire', 'Veuillez remplir le nom de la catégorie.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingCategory) {
        // Mise à jour d'une catégorie existante
        updateCategory(existingCategory.id, {
          name,
          description,
          icon,
          order: parseInt(order) || 0,
          restrictedAccess,
          responsibleId: responsibleId || undefined,
        });
        Alert.alert('Succès', 'Catégorie mise à jour avec succès.');
      } else {
        // Création d'une nouvelle catégorie
        addCategory({
          name,
          description,
          icon,
          order: parseInt(order) || 0,
          restrictedAccess,
          responsibleId: responsibleId || undefined,
        });
        Alert.alert('Succès', 'Catégorie créée avec succès.');
      }
      
      router.back();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const selectEmoji = (selectedEmoji: string) => {
    setIcon(selectedEmoji);
    setShowEmojiPicker(false);
  };

  const toggleResponsiblePicker = () => {
    setShowResponsiblePicker(!showResponsiblePicker);
  };

  const selectResponsible = (userId: string) => {
    setResponsibleId(userId);
    setShowResponsiblePicker(false);
  };

  const getResponsibleName = () => {
    if (!responsibleId) return "Aucun responsable";
    const responsible = users.find(user => user.id === responsibleId);
    return responsible ? `${responsible.firstName} ${responsible.lastName}` : "Aucun responsable";
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title={existingCategory ? 'Modifier une catégorie' : 'Ajouter une catégorie'}
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
              <Input
                label="Nom *"
                placeholder="Entrez le nom de la catégorie"
                value={name}
                onChangeText={setName}
                containerStyle={styles.inputContainer}
              />

              <Input
                label="Description"
                placeholder="Entrez une description (optionnel)"
                value={description}
                onChangeText={setDescription}
                containerStyle={styles.inputContainer}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, { color: theme.text }]}>Icône</Text>
              <TouchableOpacity
                style={[styles.emojiButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={toggleEmojiPicker}
              >
                <Text style={styles.emojiText}>{icon}</Text>
                <Text style={[styles.emojiButtonText, { color: theme.text }]}>
                  Changer l'icône
                </Text>
              </TouchableOpacity>

              {showEmojiPicker && (
                <View style={[styles.emojiPickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.emojiGrid}>
                    {CATEGORY_EMOJIS.map((emoji, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.emojiItem,
                          emoji === icon && { backgroundColor: `${theme.primary}20` }
                        ]}
                        onPress={() => selectEmoji(emoji)}
                      >
                        <Text style={styles.emojiItemText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <Input
                label="Ordre"
                placeholder="Entrez l'ordre d'affichage"
                value={order}
                onChangeText={setOrder}
                containerStyle={styles.inputContainer}
                keyboardType="numeric"
              />

              <View style={styles.permissionsSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Permissions
                </Text>

                <View style={styles.switchContainer}>
                  <View style={styles.switchTextContainer}>
                    <Lock size={20} color={theme.primary} style={styles.switchIcon} />
                    <Text style={[styles.switchLabel, { color: theme.text }]}>
                      Accès restreint
                    </Text>
                  </View>
                  <Switch
                    value={restrictedAccess}
                    onValueChange={setRestrictedAccess}
                    trackColor={{ false: '#767577', true: `${theme.primary}80` }}
                    thumbColor={restrictedAccess ? theme.primary : '#f4f3f4'}
                  />
                </View>
                
                <Text style={[styles.helperText, { color: darkMode ? theme.inactive : '#666666' }]}>
                  {restrictedAccess 
                    ? "Seuls les administrateurs, modérateurs et le responsable désigné pourront voir cette catégorie." 
                    : "Tous les utilisateurs pourront voir cette catégorie."}
                </Text>

                <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Responsable de catégorie</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={toggleResponsiblePicker}
                >
                  <View style={styles.pickerButtonContent}>
                    <Users size={20} color={theme.primary} style={styles.pickerIcon} />
                    <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                      {getResponsibleName()}
                    </Text>
                  </View>
                </TouchableOpacity>

                <Text style={[styles.helperText, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Le responsable pourra gérer le contenu de cette catégorie, même s'il n'est pas administrateur.
                </Text>

                {showResponsiblePicker && (
                  <View style={[styles.pickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TouchableOpacity
                      style={[styles.pickerItem, !responsibleId && { backgroundColor: `${theme.primary}20` }]}
                      onPress={() => selectResponsible('')}
                    >
                      <Text style={[styles.pickerItemText, { color: theme.text }]}>
                        Aucun responsable
                      </Text>
                    </TouchableOpacity>
                    
                    {eligibleUsers.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.pickerItem,
                          user.id === responsibleId && { backgroundColor: `${theme.primary}20` }
                        ]}
                        onPress={() => selectResponsible(user.id)}
                      >
                        <Text style={[styles.pickerItemText, { color: theme.text }]}>
                          {user.firstName} {user.lastName} ({user.role === 'admin' ? 'Admin' : user.role === 'moderator' ? 'Modérateur' : 'Comité'})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
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
                title={existingCategory ? "Mettre à jour" : "Enregistrer"}
                onPress={handleSave}
                loading={isSubmitting}
                style={styles.saveButton}
                fullWidth
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emojiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  emojiText: {
    fontSize: 24,
    marginRight: 12,
  },
  emojiButtonText: {
    fontSize: 16,
  },
  emojiPickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiItem: {
    width: '20%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  emojiItemText: {
    fontSize: 24,
  },
  permissionsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchIcon: {
    marginRight: 8,
  },
  switchLabel: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 8,
  },
  pickerButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerIcon: {
    marginRight: 8,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    maxHeight: 200,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  pickerItemText: {
    fontSize: 16,
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