import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

type RoleKey = 'admin' | 'moderator' | 'committee' | 'user';

const ROLES: { key: RoleKey; label: string; description: string; color: string }[] = [
  { key: 'admin',     label: 'Admin',       description: 'Accès complet à tout',           color: '#e53935' },
  { key: 'moderator', label: 'Modérateur',  description: 'Gère le contenu et les membres', color: '#fb8c00' },
  { key: 'committee', label: 'Comité',      description: 'Membre du comité directeur',     color: '#8e24aa' },
  { key: 'user',      label: 'Membre',      description: 'Accès standard',                 color: '#1e88e5' },
];

export default function UserFormScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addUser } = useUsersStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleKey>('user');
  const [isLoading, setIsLoading] = useState(false);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => {
    if (!isAdminOrModerator) router.replace('/directory');
  }, [isAdminOrModerator]);
  if (!isAdminOrModerator) return null;

  const handleSubmit = async () => {
    if (isLoading) return;
    if (!firstName || !lastName || !email) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires (prénom, nom, email).');
      return;
    }
    try {
      setIsLoading(true);
      await addUser({ firstName, lastName, email, phone, role, avatarUrl: '', bio: '' });
      Alert.alert('Succès', 'Utilisateur ajouté avec succès.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Une erreur est survenue lors de l'ajout.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header title="Ajouter un utilisateur" showBackButton onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Input
          label="Prénom *"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Entrez le prénom"
          autoCapitalize="words"
          containerStyle={styles.input}
        />
        <Input
          label="Nom *"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Entrez le nom"
          autoCapitalize="words"
          containerStyle={styles.input}
        />
        <Input
          label="Email *"
          value={email}
          onChangeText={setEmail}
          placeholder="Entrez l'email"
          keyboardType="email-address"
          autoCapitalize="none"
          containerStyle={styles.input}
        />
        <Input
          label="Téléphone"
          value={phone}
          onChangeText={setPhone}
          placeholder="Entrez le numéro de téléphone"
          keyboardType="phone-pad"
          containerStyle={styles.input}
        />

        {/* Sélecteur de rôle */}
        <Text style={[styles.roleLabel, { color: theme.text }]}>Rôle *</Text>
        <View style={styles.roleGrid}>
          {ROLES.map(r => {
            const isSelected = role === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.roleOption,
                  { borderColor: isSelected ? r.color : theme.border, backgroundColor: isSelected ? `${r.color}18` : theme.card },
                ]}
                onPress={() => setRole(r.key)}
              >
                <View style={[styles.roleColorDot, { backgroundColor: r.color }]} />
                <View style={styles.roleOptionTexts}>
                  <Text style={[styles.roleOptionLabel, { color: isSelected ? r.color : theme.text }]}>
                    {r.label}
                  </Text>
                  <Text style={[styles.roleOptionDesc, { color: theme.inactive }]}>
                    {r.description}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.roleCheck, { backgroundColor: r.color }]}>
                    <Text style={styles.roleCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="Ajouter l'utilisateur"
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.submitButton}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 20, gap: 4, paddingBottom: 40 },
  input: { marginBottom: 12 },
  roleLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  roleGrid: { gap: 8, marginBottom: 24 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    gap: 12,
  },
  roleColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleOptionTexts: { flex: 1 },
  roleOptionLabel: { fontSize: 15, fontWeight: '600' },
  roleOptionDesc: { fontSize: 12, marginTop: 1 },
  roleCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleCheckText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  submitButton: { marginTop: 8 },
});
