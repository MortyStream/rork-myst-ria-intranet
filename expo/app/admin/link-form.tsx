import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe, Video, Newspaper, Link as LinkIcon } from 'lucide-react-native';
import { useResourcesStore } from '@/store/resources-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ExternalLinkType } from '@/types/resource';

const LINK_TYPES = [
  { id: 'website', name: 'Site web', icon: <Globe size={24} color="#ffffff" /> },
  { id: 'press', name: 'Presse', icon: <Newspaper size={24} color="#ffffff" /> },
  { id: 'video', name: 'Vidéo', icon: <Video size={24} color="#ffffff" /> },
  { id: 'social', name: 'Réseau social', icon: <LinkIcon size={24} color="#ffffff" /> },
  { id: 'other', name: 'Autre', icon: <LinkIcon size={24} color="#ffffff" /> },
];

export default function LinkFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addExternalLink, getExternalLinkById, updateExternalLink } = useResourcesStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const linkId = params.id as string | undefined;
  const existingLink = linkId ? getExternalLinkById(linkId) : undefined;

  const [title, setTitle] = useState(existingLink?.title || '');
  const [url, setUrl] = useState(existingLink?.url || '');
  const [description, setDescription] = useState(existingLink?.description || '');
  const [type, setType] = useState<ExternalLinkType>(existingLink?.type || 'website');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!title || !url) {
      Alert.alert('Champs obligatoires', 'Veuillez remplir le titre et l\'URL.');
      return;
    }

    const finalUrl = (!url.startsWith('http://') && !url.startsWith('https://'))
      ? `https://${url}`
      : url;

    setIsSubmitting(true);

    try {
      if (existingLink) {
        await updateExternalLink(existingLink.id, {
          title,
          url: finalUrl,
          description,
          type,
        });
      } else {
        await addExternalLink({
          title,
          url: finalUrl,
          description,
          type,
        });
      }
      router.back();
    } catch (error) {
      console.error('Error saving link:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le lien. Vérifiez votre connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const selectType = (selectedType: ExternalLinkType) => {
    setType(selectedType);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title={existingLink ? 'Modifier un lien' : 'Ajouter un lien'}
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
              label="URL *"
              placeholder="https://example.com"
              value={url}
              onChangeText={setUrl}
              containerStyle={styles.inputContainer}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Input
              label="Titre *"
              placeholder="Entrez le titre du lien"
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
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.label, { color: theme.text }]}>Type de lien</Text>
            <View style={styles.typeContainer}>
              {LINK_TYPES.map((linkType) => (
                <TouchableOpacity
                  key={linkType.id}
                  style={[
                    styles.typeButton,
                    { borderColor: theme.border },
                    type === linkType.id && { 
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    }
                  ]}
                  onPress={() => selectType(linkType.id as ExternalLinkType)}
                >
                  {React.cloneElement(linkType.icon, {
                    color: type === linkType.id ? '#ffffff' : theme.text,
                  })}
                  <Text style={[
                    styles.typeButtonText,
                    { color: type === linkType.id ? '#ffffff' : theme.text }
                  ]}>
                    {linkType.name}
                  </Text>
                </TouchableOpacity>
              ))}
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
              title={existingLink ? "Mettre à jour" : "Enregistrer"}
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
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  typeButtonText: {
    fontSize: 14,
    marginLeft: 6,
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