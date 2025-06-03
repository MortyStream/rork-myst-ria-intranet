import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, ExternalLink, Edit, Trash } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useLinksStore } from '@/store/links-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Link } from '@/types/link';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';

export default function LinksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { links, initializeLinks, deleteLink } = useLinksStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  useEffect(() => {
    initializeLinks();
  }, []);
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    initializeLinks();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  const handleAddLink = () => {
    router.push('/admin/link-form');
  };
  
  const handleLinkPress = async (link: Link) => {
    try {
      const supported = await Linking.canOpenURL(link.url);
      if (supported) {
        await Linking.openURL(link.url);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien.');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ouverture du lien.');
    }
  };
  
  const handleEditLink = (link: Link) => {
    router.push({
      pathname: '/admin/link-form',
      params: { id: link.id }
    });
  };
  
  const handleDeleteLink = (link: Link) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer le lien "${link.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => deleteLink(link.id)
        }
      ]
    );
  };
  
  // Filter links based on search query
  const filteredLinks = links.filter(link => 
    link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sort links by category and title
  const sortedLinks = [...filteredLinks].sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.title.localeCompare(b.title);
  });
  
  const renderLinkItem = ({ item }: { item: Link }) => (
    <Card style={styles.linkItem}>
      <TouchableOpacity
        style={styles.linkContent}
        onPress={() => handleLinkPress(item)}
      >
        <View style={styles.linkHeader}>
          <Text style={[styles.linkTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          <ExternalLink size={16} color={theme.primary} />
        </View>
        
        <Text style={[styles.linkDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
          {item.description}
        </Text>
        
        <View style={styles.linkMeta}>
          <Text style={[styles.linkCategory, { color: theme.primary }]}>
            {item.category}
          </Text>
          <Text style={[styles.linkUrl, { color: darkMode ? theme.inactive : '#666666' }]}>
            {item.url}
          </Text>
        </View>
      </TouchableOpacity>
      
      {isAdminOrModerator && (
        <View style={styles.linkActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditLink(item)}
          >
            <Edit size={16} color={theme.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteLink(item)}
          >
            <Trash size={16} color={theme.error} />
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
  
  return (
    <AppLayout 
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Liens 🔗"
          onTitlePress={() => toggleSidebar?.()}
          rightComponent={
            isAdminOrModerator && (
              <Button
                icon={<Plus size={24} color={theme.text} />}
                onPress={handleAddLink}
                variant="text"
                style={styles.addButton}
              />
            )
          }
          containerStyle={styles.headerContainer}
        />
        
        <View style={styles.searchContainer}>
          <Input
            placeholder="Rechercher un lien..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color={darkMode ? '#ffffff' : '#333333'} />}
            containerStyle={styles.searchInput}
          />
        </View>
        
        {sortedLinks.length > 0 ? (
          <FlatList
            data={sortedLinks}
            renderItem={renderLinkItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState
            icon="link"
            title="Aucun lien trouvé"
            message={
              searchQuery
                ? "Aucun lien ne correspond à votre recherche"
                : "Il n'y a pas encore de liens enregistrés"
            }
            style={styles.emptyState}
          />
        )}
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
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
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  linkItem: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  linkContent: {
    padding: 16,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  linkDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  linkMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkCategory: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  linkUrl: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  linkActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
  },
  emptyState: {
    marginTop: 40,
  },
});