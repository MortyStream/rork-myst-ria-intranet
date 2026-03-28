import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Folder,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  Plus,
  EyeOff,
  Upload,
  File,
} from 'lucide-react-native';
import { useResourcesStore } from '@/store/resources-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ResourceItemType } from '@/types/resource';

const ITEM_TYPES: { id: ResourceItemType; name: string; icon: React.ReactNode }[] = [
  { id: 'folder', name: 'Dossier', icon: <Folder size={24} /> },
  { id: 'file', name: 'Fichier', icon: <FileText size={24} /> },
  { id: 'link', name: 'Lien', icon: <LinkIcon size={24} /> },
  { id: 'image', name: 'Image', icon: <ImageIcon size={24} /> },
  { id: 'text', name: 'Texte', icon: <AlignLeft size={24} /> },
];

export default function ResourceItemFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { 
    addResourceItem, 
    getResourceItemById, 
    updateResourceItem,
    getCategoryById,
    getUserSubscriptions,
    isUserCategoryResponsible,
  } = useResourcesStore();
  const { addNotification } = useNotificationsStore();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const categoryId = params.categoryId as string;
  const parentId = params.parentId as string | null;
  const itemId = params.id as string | undefined;
  
  const [existingItem, setExistingItem] = useState<any>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ResourceItemType>('folder');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [hidden, setHidden] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingItem, setIsLoadingItem] = useState(!!itemId);
  const [error, setError] = useState<string | null>(null);

  const category = getCategoryById(categoryId);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  const isCategoryResponsible = user ? isUserCategoryResponsible(user.id, categoryId) : false;
  const canHideItems = isAdminOrModerator || isCategoryResponsible;

  // Charger l'élément existant si on est en mode édition
  useEffect(() => {
    const loadExistingItem = async () => {
      if (itemId) {
        try {
          const item = await getResourceItemById(itemId);
          if (item) {
            setExistingItem(item);
            setTitle(item.title);
            setDescription(item.description || '');
            setType(item.type);
            setUrl(item.url || '');
            setContent(item.content || '');
            if (item.type === 'image') {
              setImage(item.content);
            }
            setFileName(item.fileUrl ? 'Fichier déjà téléchargé' : '');
            setHidden(item.hidden || false);
          }
        } catch (error) {
          console.error('Error loading item:', error);
          setError('Impossible de charger les détails de cet élément.');
        } finally {
          setIsLoadingItem(false);
        }
      } else {
        setIsLoadingItem(false);
      }
    };

    loadExistingItem();
  }, [itemId]);

  const handlePickImage = async () => {
    // Simuler la sélection d'une image
    // Dans une vraie application, nous utiliserions expo-image-picker
    setImage('https://images.unsplash.com/photo-1518791841217-8f162f1e1131?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=800&q=60');
    Alert.alert('Image sélectionnée', 'Une image a été sélectionnée.');
  };

  const handlePickFile = async () => {
    try {
      // Simuler la sélection d'un fichier
      // Dans une vraie application, nous utiliserions expo-document-picker
      setFileName('document_exemple.pdf');
      Alert.alert('Fichier sélectionné', 'document_exemple.pdf a été sélectionné.');
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du fichier.');
    }
  };

  const toggleTypePicker = () => {
    setShowTypePicker(!showTypePicker);
  };

  const selectType = (selectedType: ResourceItemType) => {
    setType(selectedType);
    setShowTypePicker(false);
  };

  const handleSave = async () => {
    if (!title) {
      Alert.alert('Champ obligatoire', 'Veuillez remplir le titre.');
      return;
    }

    if (type === 'link' && !url) {
      Alert.alert('Champ obligatoire', 'Veuillez remplir l\'URL pour un lien.');
      return;
    }

    if (type === 'file' && !fileName && !existingItem?.fileUrl) {
      Alert.alert('Champ obligatoire', 'Veuillez sélectionner un fichier.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Préparer les données selon le type
      let itemContent = null;
      let itemUrl = null;
      let fileUrl = existingItem?.fileUrl || (fileName ? 'file://example/path/' + fileName : null);

      switch (type) {
        case 'link':
          itemUrl = url;
          break;
        case 'text':
          itemContent = content;
          break;
        case 'image':
          itemContent = image;
          break;
        case 'file':
          // Dans une vraie application, vous téléchargeriez le fichier sur un serveur
          // et stockeriez l'URL ici. Pour cette démo, nous utilisons un chemin fictif.
          break;
      }

      if (existingItem) {
        // Mise à jour d'un élément existant
        await updateResourceItem(existingItem.id, {
          title,
          description,
          type,
          content: itemContent,
          url: itemUrl,
          fileUrl,
          hidden,
        });
        Alert.alert('Succès', 'Élément mis à jour avec succès.');
      } else {
        // Création d'un nouvel élément
        const newItemId = await addResourceItem({
          title,
          description,
          type,
          parentId,
          categoryId,
          content: itemContent,
          url: itemUrl,
          fileUrl,
          hidden,
          createdBy: user?.id || 'unknown',
        });
        
        // Envoyer des notifications aux abonnés
        if (user && category) {
          // Récupérer les abonnés de cette catégorie
          const subscriptions = getUserSubscriptions(categoryId);
          
          if (subscriptions.length > 0) {
            // Créer une notification
            addNotification({
              title: 'Nouvel élément ajouté',
              message: `${user.firstName} ${user.lastName} a ajouté "${title}" dans la catégorie "${category.name}"`,
              targetRoles: ['admin', 'committee'],
              targetUserIds: subscriptions,
              categoryId,
              resourceItemId: newItemId,
            });
          }
        }
        
        Alert.alert('Succès', 'Élément créé avec succès.');
      }
      
      router.back();
    } catch (error) {
      console.error('Error saving resource item:', error);
      setError('Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const renderTypeContent = () => {
    switch (type) {
      case 'link':
        return (
          <Input
            label="URL"
            placeholder="https://example.com"
            value={url}
            onChangeText={setUrl}
            containerStyle={styles.inputContainer}
            keyboardType="url"
            autoCapitalize="none"
          />
        );
      case 'text':
        return (
          <View style={styles.textAreaContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Contenu</Text>
            <TextInput
              style={[
                styles.textArea,
                { 
                  color: theme.text,
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.border,
                }
              ]}
              placeholder="Entrez votre texte ici..."
              placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />
          </View>
        );
      case 'image':
        return (
          <View style={styles.imageContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Image</Text>
            <TouchableOpacity
              style={[
                styles.imagePickerButton,
                { backgroundColor: theme.card, borderColor: theme.border }
              ]}
              onPress={handlePickImage}
            >
              {image ? (
                <View style={styles.previewContainer}>
                  <Text style={[styles.previewText, { color: theme.text }]}>Image sélectionnée</Text>
                  <ImageIcon size={48} color={theme.primary} />
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Plus size={32} color={theme.primary} />
                  <Text style={[styles.imagePlaceholderText, { color: theme.text }]}>
                    Sélectionner une image
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      case 'file':
        return (
          <View style={styles.fileContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Fichier</Text>
            <TouchableOpacity
              style={[
                styles.filePickerButton,
                { backgroundColor: theme.card, borderColor: theme.border }
              ]}
              onPress={handlePickFile}
            >
              {fileName || existingItem?.fileUrl ? (
                <View style={styles.previewContainer}>
                  <Text style={[styles.previewText, { color: theme.text }]}>
                    {fileName || 'Fichier déjà téléchargé'}
                  </Text>
                  <File size={24} color={theme.primary} />
                </View>
              ) : (
                <View style={styles.filePlaceholder}>
                  <Upload size={32} color={theme.primary} />
                  <Text style={[styles.filePlaceholderText, { color: theme.text }]}>
                    Sélectionner un fichier
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  if (isLoadingItem) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Chargement..."
          showBackButton={true}
          onBackPress={handleCancel}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title={existingItem ? 'Modifier un élément' : 'Ajouter un élément'}
        showBackButton={true}
        onBackPress={handleCancel}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: `${theme.error}20` }]}>
              <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            </View>
          )}

          <View style={styles.formSection}>
            <Input
              label="Titre *"
              placeholder="Entrez le titre"
              value={title}
              onChangeText={setTitle}
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Description"
              placeholder="Entrez une description (optionnel)"
              value={description}
              onChangeText={setDescription}
              containerStyle={styles.inputContainer}
            />

            <Text style={[styles.label, { color: theme.text }]}>Type d'élément</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                { backgroundColor: theme.card, borderColor: theme.border }
              ]}
              onPress={toggleTypePicker}
            >
              <View style={styles.pickerButtonContent}>
                {ITEM_TYPES.find(t => t.id === type)?.icon}
                <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                  {ITEM_TYPES.find(t => t.id === type)?.name || 'Sélectionner'}
                </Text>
              </View>
            </TouchableOpacity>

            {showTypePicker && (
              <View style={[
                styles.pickerContainer,
                { backgroundColor: theme.card, borderColor: theme.border }
              ]}>
                {ITEM_TYPES.map((typeOption) => (
                  <TouchableOpacity
                    key={typeOption.id}
                    style={[
                      styles.pickerItem,
                      type === typeOption.id && { backgroundColor: `${theme.primary}20` }
                    ]}
                    onPress={() => selectType(typeOption.id)}
                  >
                    <View style={styles.pickerItemContent}>
                      {React.cloneElement(typeOption.icon as React.ReactElement, {
                        color: type === typeOption.id ? theme.primary : theme.text
                      })}
                      <Text style={[
                        styles.pickerItemText,
                        { color: theme.text }
                      ]}>
                        {typeOption.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {renderTypeContent()}

            {canHideItems && (
              <View style={styles.visibilityContainer}>
                <View style={styles.switchContainer}>
                  <View style={styles.switchTextContainer}>
                    <EyeOff size={20} color={theme.primary} style={styles.switchIcon} />
                    <Text style={[styles.switchLabel, { color: theme.text }]}>
                      Cacher cet élément
                    </Text>
                  </View>
                  <Switch
                    value={hidden}
                    onValueChange={setHidden}
                    trackColor={{ false: '#767577', true: `${theme.primary}80` }}
                    thumbColor={hidden ? theme.primary : '#f4f3f4'}
                  />
                </View>
                <Text style={[styles.helperText, { color: darkMode ? theme.inactive : '#666666' }]}>
                  {hidden 
                    ? "Cet élément ne sera visible que pour les administrateurs, modérateurs et le responsable de la catégorie." 
                    : "Cet élément sera visible pour tous les utilisateurs ayant accès à cette catégorie."}
                </Text>
              </View>
            )}
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
              title={existingItem ? "Mettre à jour" : "Enregistrer"}
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
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  pickerButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    marginLeft: 12,
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
  pickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  textAreaContainer: {
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  imageContainer: {
    marginBottom: 16,
  },
  imagePickerButton: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    marginBottom: 8,
    fontSize: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 16,
  },
  fileContainer: {
    marginBottom: 16,
  },
  filePickerButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filePlaceholder: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filePlaceholderText: {
    marginTop: 8,
    fontSize: 16,
  },
  visibilityContainer: {
    marginTop: 16,
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
  buttonContainer: {
    marginTop: 16,
  },
  cancelButton: {
    marginBottom: 12,
  },
  saveButton: {
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});