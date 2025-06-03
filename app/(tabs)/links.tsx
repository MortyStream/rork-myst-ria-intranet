import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, ExternalLink, Search, Link as LinkIcon } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';

interface Link {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  createdAt: string;
  createdBy: string;
}

export default function LinksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);

  // Check if user is admin or moderator
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      // Mock data - in a real app, this would come from an API
      const mockLinks: Link[] = [
        {
          id: '1',
          title: 'Documentation Projet',
          url: 'https://docs.example.com',
          description: 'Documentation complète du projet',
          category: 'Documentation',
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
        },
        {
          id: '2',
          title: 'Slack Workspace',
          url: 'https://workspace.slack.com',
          description: 'Espace de travail collaboratif',
          category: 'Communication',
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
        },
        {
          id: '3',
          title: 'GitHub Repository',
          url: 'https://github.com/project',
          description: 'Dépôt de code source',
          category: 'Développement',
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
        },
      ];
      
      setLinks(mockLinks);
    } catch (error) {
      console.error('Error loading links:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement des liens.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLinks();
    } catch (error) {
      console.error('Error refreshing links:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du rafraîchissement des liens.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLinkPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien.');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ouverture du lien.');
    }
  };

  const handleAddLink = () => {
    router.push('/admin/link-form');
  };

  // Filter links based on search query
  const filteredLinks = links.filter(link => {
    const searchLower = searchQuery.toLowerCase();
    return (
      link.title.toLowerCase().includes(searchLower) ||
      link.description?.toLowerCase().includes(searchLower) ||
      link.category.toLowerCase().includes(searchLower) ||
      link.url.toLowerCase().includes(searchLower)
    );
  });

  // Group links by category
  const groupedLinks = filteredLinks.reduce((groups, link) => {
    const category = link.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(link);
    return groups;
  }, {} as Record<string, Link[]>);

  const renderContent = () => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appColors.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Chargement des liens...
          </Text>
        </View>
      );
    }

    if (filteredLinks.length === 0) {
      return (
        <EmptyState
          icon="link"
          title="Aucun lien trouvé"
          message={
            searchQuery
              ? "Aucun lien ne correspond à votre recherche"
              : "Il n'y a pas encore de liens disponibles"
          }
        />
      );
    }

    return (
      <ScrollView
        style={styles.linksList}
        contentContainerStyle={styles.linksContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[appColors.primary]}
            tintColor={appColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedLinks).map(([category, categoryLinks]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: theme.text }]}>
              {category}
            </Text>
            
            {categoryLinks.map((link) => (
              <TouchableOpacity
                key={link.id}
                style={[styles.linkItem, { backgroundColor: theme.card }]}
                onPress={() => handleLinkPress(link.url)}
              >
                <View style={styles.linkIcon}>
                  <LinkIcon size={20} color={appColors.primary} />
                </View>
                
                <View style={styles.linkContent}>
                  <Text style={[styles.linkTitle, { color: theme.text }]}>
                    {link.title}
                  </Text>
                  
                  {link.description && (
                    <Text style={[styles.linkDescription, { color: theme.inactive }]} numberOfLines={2}>
                      {link.description}
                    </Text>
                  )}
                  
                  <Text style={[styles.linkUrl, { color: appColors.primary }]} numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
                
                <ExternalLink size={20} color={theme.inactive} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header
          title="Liens 🔗"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            isAdminOrModerator ? (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddLink}
              >
                <Plus size={24} color={theme.text} />
              </TouchableOpacity>
            ) : null
          }
        />

        {/* Search */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Rechercher un lien..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={theme.inactive} />}
            containerStyle={styles.searchInput}
          />
        </View>

        {renderContent()}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  linksList: {
    flex: 1,
  },
  linksContent: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18,
  },
  linkUrl: {
    fontSize: 12,
    fontWeight: '500',
  },
});