import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Phone, Camera, CheckCircle } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { getSupabase } from '@/utils/supabase';
import { compressImage } from '@/utils/image-compression';
import Toast from 'react-native-toast-message';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const { getUserByEditableBy, updateUser: updateUserInStore } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  // Check if the current user can edit a directory profile
  const editableProfile = user ? getUserByEditableBy(user.id) : undefined;
  
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileImage, setProfileImage] = useState<string | undefined>(user?.profileImage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }>({});
  
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à votre galerie.');
      return;
    }

    // Config robuste iOS PHPicker — voir resource-item-form.tsx pour explication
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      allowsMultipleSelection: false,
      selectionLimit: 1,
      exif: false,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploading(true);
      try {
        // Compression : 512px max + JPEG 0.7 → typiquement 50-100 KB au lieu de 3-5 Mo
        const compressed = await compressImage(result.assets[0].uri, {
          maxWidth: 512,
          quality: 0.7,
          format: 'jpeg',
        });

        const supabase = getSupabase();
        const fileName = `${user?.id}-${Date.now()}.${compressed.extension}`;
        const filePath = `profiles/${fileName}`;

        // ArrayBuffer pour ne pas embarquer un type MIME via Blob
        const response = await fetch(compressed.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { data, error } = await supabase
          .storage
          .from('avatars')
          .upload(filePath, arrayBuffer, {
            contentType: compressed.mimeType,
            upsert: true,
          });
        
        if (error) {
          console.error('Error uploading image:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          throw error;
        }
        
        // Get the public URL
        const { data: urlData } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        setProfileImage(urlData.publicUrl);
        Toast.show({
          type: 'success',
          text1: 'Image téléchargée',
          text2: 'Votre photo de profil a été mise à jour',
        });
      } catch (error) {
        console.error('Error uploading image:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Impossible de télécharger l\'image: ' + (error.message || JSON.stringify(error)),
        });
      } finally {
        setIsUploading(false);
      }
    }
  };
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Format suisse: +41 XX XXX XX XX ou +41XXXXXXXXX
    const phoneRegex = /^\+41\s?(\d{2}\s?\d{3}\s?\d{2}\s?\d{2}|\d{9})$/;
    return phoneRegex.test(phone);
  };

  const validateForm = (): boolean => {
    const newErrors: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    } = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'Le prénom est obligatoire';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Le nom est obligatoire';
    }

    if (!email.trim()) {
      newErrors.email = 'L\'email est obligatoire';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Le numéro de téléphone est obligatoire';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Format de téléphone invalide (format suisse: +41 XX XXX XX XX)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Utilisateur non connecté',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const supabase = getSupabase();

      // Check if user exists in the users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking if user exists:', fetchError);
        console.error('Full error object:', JSON.stringify(fetchError, null, 2));
        throw new Error(`Erreur lors de la vérification de l'utilisateur: ${fetchError.message}`);
      }
      
      let dbUpdateError;
      
      if (existingUser) {
        // Update existing user in the users table
        // Use camelCase for column names to match Supabase schema
        const updateData = {
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          avatarUrl: profileImage,
          updatedAt: new Date().toISOString()
        };
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);
        
        dbUpdateError = updateError;
      } else {
        // Insert new user in the users table
        const insertData = {
          id: user.id,
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          avatarUrl: profileImage,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          supabaseUserId: user.id
        };
        
        const { error: insertError } = await supabase
          .from('users')
          .insert(insertData);
        
        dbUpdateError = insertError;
      }
      
      if (dbUpdateError) {
        console.error('Error updating/inserting user in database:', dbUpdateError);
        console.error('Full error object:', JSON.stringify(dbUpdateError, null, 2));
        throw new Error(`Erreur lors de la mise à jour en base de données: ${dbUpdateError.message}`);
      }
      
      // Update the directory profile if it exists
      if (editableProfile) {
        const directoryUpdateData = {
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          avatarUrl: profileImage,
          updatedAt: new Date().toISOString()
        };
        
        const { error: directoryUpdateError } = await supabase
          .from('directory_profiles')
          .update(directoryUpdateData)
          .eq('id', editableProfile.id);
        
        if (directoryUpdateError) {
          console.error('Error updating directory profile:', directoryUpdateError);
          console.error('Full error object:', JSON.stringify(directoryUpdateError, null, 2));
          // Don't throw here, just log the error
        } else {
          console.log('Directory profile updated successfully');
        }
      }
      
      // Update the user in the auth store
      updateUser({
        ...user,
        firstName,
        lastName,
        email,
        phone,
        profileImage
      });
      
      Toast.show({
        type: 'success',
        text1: 'Profil mis à jour',
        text2: 'Vos informations ont été mises à jour avec succès',
      });
      
      router.back();
    } catch (error) {
      console.error('Error saving profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de mettre à jour le profil: ' + (error.message || JSON.stringify(error)),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Modifier mon profil"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.photoContainer}>
            <TouchableOpacity
              style={[styles.photoButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handlePickImage}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="large" color={theme.primary} />
              ) : profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <>
                  <Camera size={32} color={theme.primary} />
                  <Text style={[styles.photoText, { color: theme.text }]}>
                    Ajouter une photo
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              <User size={18} color={theme.primary} /> Informations personnelles
            </Text>
            
            <Input
              label="Prénom *"
              placeholder="Entrez votre prénom"
              value={firstName}
              onChangeText={setFirstName}
              containerStyle={styles.inputContainer}
              error={errors.firstName}
            />
            
            <Input
              label="Nom *"
              placeholder="Entrez votre nom"
              value={lastName}
              onChangeText={setLastName}
              containerStyle={styles.inputContainer}
              error={errors.lastName}
            />
          </View>
          
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              <Mail size={18} color={theme.primary} /> Contact
            </Text>
            
            <Input
              label="Email *"
              placeholder="Entrez votre adresse email"
              value={email}
              onChangeText={setEmail}
              containerStyle={styles.inputContainer}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            
            <Input
              label="Téléphone *"
              placeholder="Format: +41 XX XXX XX XX"
              value={phone}
              onChangeText={setPhone}
              containerStyle={styles.inputContainer}
              keyboardType="phone-pad"
              error={errors.phone}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Annuler"
              onPress={() => router.back()}
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
  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
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