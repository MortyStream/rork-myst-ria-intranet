import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Link,
  Plus,
  Edit,
  Trash,
  ExternalLink,
  Globe,
  Video,
  Newspaper,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useResourcesStore } from '@/store/resources-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ExternalLink as ExternalLinkType } from '@/types/resource';

export default function AdminLinksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { externalLinks, deleteExternalLink } = useResourcesStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  // Vérifier si l'utilisateur est admin ou modérateur
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  if (!isAdminOrModerator) {
    router.replace('/admin');
    return null;
  }
  
  const handleAddLink = () => {
    router.push('/admin/link-form');
  };
  
  const handleEditLink = (link: ExternalLinkType) => {
    router.push({
      pathname: '/admin/link-form',
      params: { id: link.id }
    });
  };
  
  const handleDeleteLink = (link: ExternalLinkType) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer le lien "${link.title}" ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteExternalLink(link.id);
            Alert.alert('Succès', 'Lien supprimé avec succès.');
          },
        },
      ]
    );
  };
  
  const handleOpenLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };
  
  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'website':
        return <Globe size={24} color="#ffffff" />;
      case 'press':
        return <Newspaper size={24} color="#ffffff" />;
      case 'video':
        return <Video size={24} color="#ffffff" />;
      case 'social':
        return <Link size={24} color="#ffffff" />;
      default:
        return <ExternalLink size={24} color="#ffffff" />;
    }
  };
  
  const getLinkColor = (type: string): string => {
    switch (type) {
      case 'website':
        return theme.primary;
      case 'press':
        return theme.info;
      case 'video':
        return theme.error;
      case 'social':
        return theme.success;
      default:
        return theme.secondary;
    }
  };
  
  const renderLinkItem = ({ item }: { item: ExternalLinkType }) => (
    <Card style={styles.linkCard}>
      <View style={styles.linkHeader}>
        <TouchableOpacity 
          style={styles.linkTitleContainer}
          onPress={() => handleOpenLink(item.url)}
        >
          <View style={[styles.linkIcon, { backgroundColor: getLinkColor(item.type) }]}>
            {getLinkIcon(item.type)}
          </View>
          <View style={styles.linkInfo}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.linkUrl, { color: darkMode ? theme.inactive : '#666666' }]}>
              {item.url}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.linkActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => handleEditLink(item)}
          >
            <Edit size={16} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error }]}
            onPress={() => handleDeleteLink(item)}
          >
            <Trash size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.description && (
        <Text 
          style={[styles.linkDescription, { color: darkMode ? theme.inactive : '#666666' }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
      )}
    </Card>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Gestion des liens"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={handleAddLink}
        >
          <Plus size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Ajouter un lien</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={externalLinks}
        keyExtractor={(item) => item.id}
        renderItem={renderLinkItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="Aucun lien"
            message="Aucun lien n'a été créé pour le moment."
            icon={<Link size={48} color={theme.inactive} />}
            actionLabel="Ajouter un lien"
            onAction={handleAddLink}
            style={styles.emptyState}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  linkCard: {
    marginBottom: 16,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: 12,
  },
  linkActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  linkDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyState: {
    marginTop: 40,
  },
});