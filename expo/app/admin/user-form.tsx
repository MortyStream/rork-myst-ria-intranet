import React, { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function UserFormScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addUser } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('user');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is admin or moderator
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  if (!isAdminOrModerator) {
    router.replace('/directory');
    return null;
  }

  const handleSubmit = async () => {
    if (isLoading) return;

    if (!firstName || !lastName || !email) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      setIsLoading(true);

      await addUser({
        firstName,
        lastName,
        email,
        phone,
        role,
        avatarUrl: '',
        bio: '',
      });

      Alert.alert('Succès', 'Utilisateur ajouté avec succès.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de l\'ajout de l\'utilisateur.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Ajouter un utilisateur"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <View style={styles.form}>
        <Input
          label="Prénom *"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Entrez le prénom"
          autoCapitalize="words"
        />

        <Input
          label="Nom *"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Entrez le nom"
          autoCapitalize="words"
        />

        <Input
          label="Email *"
          value={email}
          onChangeText={setEmail}
          placeholder="Entrez l'email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Téléphone"
          value={phone}
          onChangeText={setPhone}
          placeholder="Entrez le numéro de téléphone"
          keyboardType="phone-pad"
        />

        <Input
          label="Rôle"
          value={role}
          onChangeText={setRole}
          placeholder="Entrez le rôle"
          autoCapitalize="none"
        />

        <Button
          title="Ajouter l'utilisateur"
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.submitButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 20,
    gap: 16,
  },
  submitButton: {
    marginTop: 8,
  },
});