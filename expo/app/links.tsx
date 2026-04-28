import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  Linking,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link as LinkIcon, Plus, ExternalLink, Globe, Video, Newspaper } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useResourcesStore } from '@/store/resources-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ExternalLink as ExternalLinkType } from '@/types/resource';
import { AppLayout } from '@/components/AppLayout';
import { Header } from '@/components/Header';

export default function LinksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { externalLinks, initializeExternalLinks } = useResourcesStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [refreshing, setRefreshing] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState<(() => void) | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const pressAnimation = new Animated.Value(1);

  // Re-fetch à chaque fois que l'écran reçoit le focus (retour depuis link-form, etc.)
  useFocusEffect(
    useCallback(() => {
      initializeExternalLinks();
    }, [])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await initializeExternalLinks();
    setRefreshing(false);
  }, []);
  
  const handleAddLink = () => {
    router.push('/admin/link-form');
  };
  
  const handleLinkPress = async (url: string, id: string) => {
    setPressedId(id);
    
    // Animate press
    Animated.sequence([
      Animated.timing(pressAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pressAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    // Pas de canOpenURL : échoue sur Android 11+ sans permission QUERY_ALL_PACKAGES.
    // openURL directement — si aucun navigateur n'est installé (très rare), le catch gère.
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening URL:', error);
    } finally {
      setTimeout(() => setPressedId(null), 200);
    }
  };

  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  const getLinkIcon = (type: string) => {
    const iconProps = {
      size: 24,
      color: '#ffffff',
      strokeWidth: 2,
    };
    
    switch (type) {
      case 'website':
        return <Globe {...iconProps} />;
      case 'press':
        return <Newspaper {...iconProps} />;
      case 'video':
        return <Video {...iconProps} />;
      case 'social':
        return <LinkIcon {...iconProps} />;
      default:
        return <ExternalLink {...iconProps} />;
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
  
  const renderLinkItem = ({ item }: { item: ExternalLinkType }) => {
    const isPressed = pressedId === item.id;
    
    return (
      <Animated.View
        style={[
          styles.linkCardContainer,
          {
            transform: [{
              scale: isPressed ? pressAnimation : 1
            }]
          }
        ]}
      >
        <Card
          style={[
            styles.linkCard,
            { backgroundColor: theme.card }
          ]}
          onPress={() => handleLinkPress(item.url, item.id)}
        >
          <View style={styles.linkContent}>
            <View style={[
              styles.linkIcon, 
              { 
                backgroundColor: getLinkColor(item.type),
                shadowColor: getLinkColor(item.type),
                shadowOpacity: darkMode ? 0.3 : 0.2,
              }
            ]}>
              {getLinkIcon(item.type)}
            </View>
            
            <View style={styles.linkInfo}>
              <Text 
                style={[
                  styles.linkTitle, 
                  { color: theme.text }
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              
              {item.description && (
                <Text 
                  style={[
                    styles.linkDescription, 
                    { color: darkMode ? theme.inactive : '#666666' }
                  ]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}
            </View>
            
            <ExternalLink 
              size={18} 
              color={darkMode ? theme.inactive : '#999999'}
              style={styles.externalIcon}
            />
          </View>
        </Card>
      </Animated.View>
    );
  };
  
  return (
    <AppLayout
      hideMenuButton={true}
      onSidebarToggle={(toggle) => setToggleSidebar(() => toggle)}
    >
      <SafeAreaView 
        style={[
          styles.container, 
          { backgroundColor: theme.background }
        ]} 
        edges={['top']}
      >
        <Header
          title="Liens importants 🔗"
          onTitlePress={() => toggleSidebar && toggleSidebar()}
          rightComponent={
            isAdminOrModerator && (
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={handleAddLink}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Plus size={24} color={theme.text} />
              </TouchableOpacity>
            )
          }
        />
        
        <FlatList
          data={externalLinks}
          keyExtractor={(item) => item.id}
          renderItem={renderLinkItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Aucun lien"
              message="Aucun lien important n'a été ajouté pour le moment."
              icon={<LinkIcon size={48} color={theme.inactive} />}
              actionLabel={isAdminOrModerator ? "Ajouter un lien" : undefined}
              onAction={isAdminOrModerator ? handleAddLink : undefined}
              style={styles.emptyState}
            />
          }
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.text}
            />
          }
        />
      </SafeAreaView>
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
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  linkCardContainer: {
    marginBottom: 12,
  },
  linkCard: {
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }
    }),
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }
    }),
  },
  linkInfo: {
    flex: 1,
    marginRight: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  linkDescription: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  externalIcon: {
    opacity: 0.6,
  },
  emptyState: {
    marginTop: 40,
  },
});