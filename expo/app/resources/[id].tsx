import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Folder,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  ChevronLeft,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash,
  Download,
  Check,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { useResourcesStore } from '@/store/resources-store';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { ResourceItem, ResourceItemType } from '@/types/resource';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';
import { ConfirmModal } from '@/components/ConfirmModal';
import { getCachedOrDownload, isFileCached } from '@/utils/file-cache';

export default function ResourceCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const { user } = useAuthStore();
  const {
    getCategoryById,
    getResourceItemsByCategory,
    isUserCategoryResponsible,
    deleteResourceItem,
    resourceItems: allResourceItems,
  } = useResourcesStore();

  const [category, setCategory] = useState(getCategoryById(id));
  const [resourceItems, setResourceItems] = useState<ResourceItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Map itemId → boolean (true = fichier déjà téléchargé en cache local)
  const [cachedItems, setCachedItems] = useState<Record<string, boolean>>({});
  // Map itemId → boolean (true = téléchargement en cours)
  const [downloadingItems, setDownloadingItems] = useState<Record<string, boolean>>({});
  // Lien externe en attente de confirmation (remplace l'Alert.alert natif).
  const [linkToOpen, setLinkToOpen] = useState<{ url: string; title: string } | null>(null);

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  const isCategoryResponsible = user ? isUserCategoryResponsible(user.id, id) : false;
  const canManageItems = isAdminOrModerator || isCategoryResponsible;

  useEffect(() => {
    loadResourceItems();
  }, [currentFolder, id]);

  const loadResourceItems = () => {
    setIsLoading(true);
    try {
      const items = getResourceItemsByCategory(id, currentFolder);

      // Filter out hidden items if user is not admin/moderator/responsible
      const visibleItems = canManageItems
        ? items
        : items.filter(item => !item.hidden);

      setResourceItems(visibleItems);
      // Lance la détection des fichiers déjà cachés en arrière-plan
      detectCachedFiles(visibleItems);
    } catch (error) {
      console.error('Error loading resource items:', error);
      Alert.alert('Erreur', 'Impossible de charger les éléments de cette catégorie.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Pour chaque item de type file/image, vérifie en arrière-plan si le fichier
   * est déjà dans le cache local pour afficher le badge "✓ Hors ligne".
   */
  const detectCachedFiles = async (items: ResourceItem[]) => {
    const checks = items
      .filter((it) => (it.type === 'file' && it.fileUrl) || (it.type === 'image' && it.content))
      .map(async (it) => {
        const url = it.type === 'file' ? it.fileUrl! : it.content!;
        const cached = await isFileCached(it.id, url);
        return { id: it.id, cached };
      });
    const results = await Promise.all(checks);
    const map: Record<string, boolean> = {};
    for (const r of results) map[r.id] = r.cached;
    setCachedItems(map);
  };

  /**
   * Ouvre un fichier (PDF, image, etc.) :
   * 1. Si en cache local → ouvre direct via Sharing.shareAsync (système natif)
   * 2. Sinon → télécharge dans le cache puis ouvre
   * 3. La share sheet permet à l'user de prévisualiser, partager ou ouvrir
   *    dans une autre app (Adobe, Files, Mail, etc.)
   */
  const openCachedFile = async (itemId: string, remoteUrl: string, title: string) => {
    setDownloadingItems((prev) => ({ ...prev, [itemId]: true }));
    try {
      const cached = await getCachedOrDownload(itemId, remoteUrl);

      // Marque comme caché pour le badge UI
      setCachedItems((prev) => ({ ...prev, [itemId]: true }));

      // Ouvre via la share sheet native (préview + ouverture par n'importe quelle app)
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(cached.localUri, {
          dialogTitle: title,
          UTI: 'public.item', // iOS : générique, laisse iOS détecter le bon UTI
        });
      } else {
        // Fallback (web, ou cas exotique) — utilise le navigateur sur l'URL distante
        await Linking.openURL(remoteUrl);
      }
    } catch (err: any) {
      console.error('openCachedFile error:', err);
      Alert.alert(
        "Impossible d'ouvrir le fichier",
        err?.message?.includes('Téléchargement échoué')
          ? "Échec du téléchargement. Vérifiez votre connexion internet."
          : "Une erreur est survenue lors de l'ouverture du fichier."
      );
    } finally {
      setDownloadingItems((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setFolderPath([...folderPath, { id: currentFolder, name: folderName }]);
    setCurrentFolder(folderId);
  };

  const navigateBack = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      const lastFolder = newPath.pop();
      setFolderPath(newPath);
      setCurrentFolder(lastFolder?.id || null);
    } else {
      router.back();
    }
  };

  const handleAddItem = () => {
    router.push({
      pathname: '/admin/resource-item-form',
      params: { 
        categoryId: id,
        parentId: currentFolder || ''
      }
    });
  };

  const handleEditItem = (item: ResourceItem) => {
    router.push({
      pathname: '/admin/resource-item-form',
      params: { 
        id: item.id,
        categoryId: id
      }
    });
  };

  const handleDeleteItem = (item: ResourceItem) => {
    // Compte récursif des descendants si c'est un dossier
    const countDescendants = (parentId: string): number => {
      const direct = allResourceItems.filter(it => it.parentId === parentId);
      let total = direct.length;
      for (const child of direct) {
        total += countDescendants(child.id);
      }
      return total;
    };

    const childCount = item.type === 'folder' ? countDescendants(item.id) : 0;
    const isHeavy = childCount > 0;

    const typeLabel: Record<string, string> = {
      folder: 'dossier',
      file: 'fichier',
      link: 'lien',
      image: 'image',
      text: 'texte',
    };
    const labelText = typeLabel[item.type] ?? 'élément';

    const detail = isHeavy
      ? `« ${item.title} » contient ${childCount} élément${childCount > 1 ? 's' : ''}.\n\nTout sera supprimé définitivement.`
      : `« ${item.title} » sera supprimé${item.type === 'image' ? 'e' : ''}.`;

    Alert.alert(
      `Supprimer le ${labelText} ?`,
      detail,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isHeavy ? `Tout supprimer (${childCount + 1})` : 'Supprimer',
          style: 'destructive',
          onPress: () => {
            if (isHeavy) {
              Alert.alert(
                'Vraiment ?',
                `Confirmez la suppression de « ${item.title} » et de ses ${childCount} élément${childCount > 1 ? 's' : ''}.`,
                [
                  { text: 'Non, annuler', style: 'cancel' },
                  {
                    text: 'Oui, tout supprimer',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteResourceItem(item.id);
                      loadResourceItems();
                    },
                  },
                ]
              );
            } else {
              deleteResourceItem(item.id);
              loadResourceItems();
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (item: ResourceItem) => {
    switch (item.type) {
      case 'folder':
        navigateToFolder(item.id, item.title);
        break;
      case 'link':
        if (item.url) {
          setLinkToOpen({ url: item.url, title: item.title });
        }
        break;
      case 'file':
        if (item.fileUrl) {
          openCachedFile(item.id, item.fileUrl, item.title);
        } else {
          Alert.alert('Fichier indisponible', "Aucun fichier n'est attaché à cet élément.");
        }
        break;
      case 'image':
        if (item.content) {
          openCachedFile(item.id, item.content, item.title);
        } else {
          Alert.alert('Image indisponible', "Aucune image n'est attachée.");
        }
        break;
      case 'text':
        Alert.alert(item.title, item.content || 'Aucun contenu');
        break;
    }
  };

  const getItemIcon = (type: ResourceItemType) => {
    switch (type) {
      case 'folder':
        return <Folder size={24} color={theme.primary} />;
      case 'file':
        return <FileText size={24} color={theme.primary} />;
      case 'link':
        return <LinkIcon size={24} color={theme.primary} />;
      case 'image':
        return <ImageIcon size={24} color={theme.primary} />;
      case 'text':
        return <AlignLeft size={24} color={theme.primary} />;
    }
  };

  const renderItem = ({ item }: { item: ResourceItem }) => {
    const isCacheable = item.type === 'file' || item.type === 'image';
    const isCached = isCacheable && cachedItems[item.id];
    const isDownloading = downloadingItems[item.id];

    return (
      <Card style={styles.itemCard}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => handleItemPress(item)}
        >
          <View style={styles.itemIconContainer}>
            {getItemIcon(item.type)}
          </View>
          <View style={styles.itemDetails}>
            <View style={styles.itemTitleRow}>
              <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {isDownloading && (
                <ActivityIndicator size="small" color={theme.primary} style={styles.itemBadge} />
              )}
              {!isDownloading && isCached && (
                <View style={[styles.cachedBadge, { backgroundColor: `${theme.success}25` }]}>
                  <Check size={10} color={theme.success} strokeWidth={3} />
                  <Text style={[styles.cachedBadgeText, { color: theme.success }]}>
                    Hors ligne
                  </Text>
                </View>
              )}
            </View>
            {item.description && (
              <Text
                style={[styles.itemDescription, { color: darkMode ? theme.inactive : '#666666' }]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            )}
          </View>
          {item.hidden && (
            <View style={styles.hiddenBadge}>
              <EyeOff size={16} color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>

        {canManageItems && (
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={() => handleEditItem(item)}
            >
              <Edit size={16} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.error }]}
              onPress={() => handleDeleteItem(item)}
            >
              <Trash size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {folderPath.length > 0 && (
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.card }]}
          onPress={navigateBack}
        >
          <ChevronLeft size={20} color={theme.primary} />
          <Text style={[styles.backButtonText, { color: theme.text }]}>
            Retour
          </Text>
        </TouchableOpacity>
      )}
      
      {folderPath.length > 0 && (
        <View style={styles.breadcrumbs}>
          <TouchableOpacity
            onPress={() => {
              setFolderPath([]);
              setCurrentFolder(null);
            }}
          >
            <Text style={[styles.breadcrumbItem, { color: theme.primary }]}>
              {category?.name}
            </Text>
          </TouchableOpacity>
          
          {folderPath.map((folder, index) => (
            <React.Fragment key={index}>
              <Text style={{ color: theme.inactive }}> / </Text>
              {index < folderPath.length - 1 ? (
                <TouchableOpacity
                  onPress={() => {
                    const newPath = folderPath.slice(0, index + 1);
                    setFolderPath(newPath);
                    setCurrentFolder(newPath[newPath.length - 1].id);
                  }}
                >
                  <Text style={[styles.breadcrumbItem, { color: theme.primary }]}>
                    {folder.name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.breadcrumbItem, { color: theme.text }]}>
                  {folder.name}
                </Text>
              )}
            </React.Fragment>
          ))}
        </View>
      )}
      
      {canManageItems && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={handleAddItem}
        >
          <Plus size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!category) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Catégorie introuvable"
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <EmptyState
          title="Catégorie introuvable"
          message="La catégorie que vous recherchez n'existe pas ou a été supprimée."
          icon="alert"
          actionLabel="Retour aux catégories"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <AppLayout hideMenuButton={true}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: category.name,
            headerStyle: {
              backgroundColor: theme.background,
            },
            headerTintColor: theme.text,
          }}
        />

        <Header
          title={category.name}
          showBackButton={true}
          onBackPress={() => router.back()}
        />

        {renderHeader()}
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={resourceItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <EmptyState
                title={currentFolder ? "Dossier vide" : "Aucun élément"}
                message={currentFolder 
                  ? "Ce dossier ne contient aucun élément pour le moment."
                  : "Cette catégorie ne contient aucun élément pour le moment."
                }
                icon={<Folder size={48} color={theme.inactive} />}
                actionLabel={canManageItems ? "Ajouter un élément" : undefined}
                onAction={canManageItems ? handleAddItem : undefined}
                style={styles.emptyState}
              />
            }
          />
        )}

        {/* Confirm ouverture lien externe — remplace l'Alert.alert natif blanc.
            Cohérent thème sombre, plus l'URL et le titre du lien comme contexte. */}
        <ConfirmModal
          visible={linkToOpen !== null}
          title={linkToOpen ? `Ouvrir « ${linkToOpen.title} » ?` : 'Ouvrir le lien'}
          message="Ce lien s'ouvrira dans votre navigateur."
          actions={[
            { label: 'Annuler', style: 'cancel' },
            {
              label: 'Ouvrir',
              style: 'primary',
              onPress: async () => {
                const target = linkToOpen;
                setLinkToOpen(null);
                if (!target) return;
                try {
                  await Linking.openURL(target.url);
                } catch {
                  Alert.alert('Erreur', "Impossible d'ouvrir ce lien.");
                }
              },
            },
          ]}
          onDismiss={() => setLinkToOpen(null)}
        />
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  breadcrumbs: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginLeft: 8,
  },
  breadcrumbItem: {
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  itemCard: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  itemIconContainer: {
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemBadge: {
    marginLeft: 4,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cachedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  itemDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  hiddenBadge: {
    backgroundColor: '#888888',
    borderRadius: 12,
    padding: 4,
    marginLeft: 8,
  },
  itemActions: {
    flexDirection: 'row',
    paddingRight: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyState: {
    marginTop: 40,
  },
});