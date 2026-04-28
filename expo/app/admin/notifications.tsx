import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Send,
  Users,
  Folder,
  Check,
  X,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationsStore } from '@/store/notifications-store';
import { useResourcesStore } from '@/store/resources-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationsStore();
  const { categories } = useResourcesStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['admin', 'committee']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // Vérifier si l'utilisateur est admin ou modérateur
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  useEffect(() => {
    if (!isAdminOrModerator) router.replace('/admin');
  }, [isAdminOrModerator]);
  if (!isAdminOrModerator) return null;
  
  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };
  
  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };
  
  const handleSendNotification = () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour la notification.');
      return;
    }
    
    if (!message.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un message pour la notification.');
      return;
    }
    
    if (selectedRoles.length === 0 && selectedCategories.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un rôle ou une catégorie.');
      return;
    }
    
    setIsSending(true);
    
    try {
      // Créer une notification pour chaque catégorie sélectionnée
      if (selectedCategories.length > 0) {
        selectedCategories.forEach(categoryId => {
          addNotification({
            title,
            message,
            targetRoles: selectedRoles,
            categoryId,
          });
        });
      } else {
        // Créer une notification générale si aucune catégorie n'est sélectionnée
        addNotification({
          title,
          message,
          targetRoles: selectedRoles,
        });
      }
      
      Alert.alert('Succès', 'Notification envoyée avec succès.');
      
      // Réinitialiser le formulaire
      setTitle('');
      setMessage('');
      setSelectedCategories([]);
      
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi de la notification.');
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Envoyer des notifications"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Détails de la notification
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Titre *</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  color: theme.text,
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.border,
                }
              ]}
              placeholder="Entrez le titre de la notification"
              placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
              value={title}
              onChangeText={setTitle}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Message *</Text>
            <TextInput
              style={[
                styles.textArea,
                { 
                  color: theme.text,
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.border,
                }
              ]}
              placeholder="Entrez le message de la notification"
              placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />
          </View>
        </Card>
        
        <Card style={styles.formCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            <Users size={18} color={theme.primary} style={styles.sectionIcon} /> Destinataires
          </Text>
          
          <Text style={[styles.helperText, { color: darkMode ? theme.inactive : '#666666' }]}>
            Sélectionnez les rôles qui recevront cette notification
          </Text>
          
          <View style={styles.rolesContainer}>
            <TouchableOpacity
              style={[
                styles.roleItem,
                { borderColor: theme.border },
                selectedRoles.includes('admin') && { backgroundColor: `${theme.primary}20` }
              ]}
              onPress={() => toggleRole('admin')}
            >
              <Text style={[styles.roleText, { color: theme.text }]}>Administrateurs</Text>
              {selectedRoles.includes('admin') ? (
                <Check size={18} color={theme.primary} />
              ) : (
                <X size={18} color={darkMode ? theme.inactive : '#999999'} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.roleItem,
                { borderColor: theme.border },
                selectedRoles.includes('committee') && { backgroundColor: `${theme.primary}20` }
              ]}
              onPress={() => toggleRole('committee')}
            >
              <Text style={[styles.roleText, { color: theme.text }]}>Comité</Text>
              {selectedRoles.includes('committee') ? (
                <Check size={18} color={theme.primary} />
              ) : (
                <X size={18} color={darkMode ? theme.inactive : '#999999'} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.roleItem,
                { borderColor: theme.border },
                selectedRoles.includes('other') && { backgroundColor: `${theme.primary}20` }
              ]}
              onPress={() => toggleRole('other')}
            >
              <Text style={[styles.roleText, { color: theme.text }]}>Membres</Text>
              {selectedRoles.includes('other') ? (
                <Check size={18} color={theme.primary} />
              ) : (
                <X size={18} color={darkMode ? theme.inactive : '#999999'} />
              )}
            </TouchableOpacity>
          </View>
        </Card>
        
        <Card style={styles.formCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            <Folder size={18} color={theme.primary} style={styles.sectionIcon} /> Catégories concernées
          </Text>
          
          <Text style={[styles.helperText, { color: darkMode ? theme.inactive : '#666666' }]}>
            Sélectionnez les catégories concernées par cette notification (optionnel)
          </Text>
          
          <View style={styles.categoriesContainer}>
            {categories.map(category => (
              <View key={category.id} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryEmoji]}>{category.icon || '📁'}</Text>
                  <Text style={[styles.categoryName, { color: theme.text }]}>
                    {category.name}
                  </Text>
                </View>
                <Switch
                  value={selectedCategories.includes(category.id)}
                  onValueChange={() => toggleCategory(category.id)}
                  trackColor={{ false: '#767577', true: `${theme.primary}80` }}
                  thumbColor={selectedCategories.includes(category.id) ? theme.primary : '#f4f3f4'}
                />
              </View>
            ))}
          </View>
        </Card>
        
        <Button
          title="Envoyer la notification"
          onPress={handleSendNotification}
          loading={isSending}
          style={styles.sendButton}
          fullWidth
          leftIcon={<Send size={18} color="#ffffff" />}
        />
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
  formCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 16,
  },
  rolesContainer: {
    marginBottom: 8,
  },
  roleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 16,
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
  },
  sendButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});