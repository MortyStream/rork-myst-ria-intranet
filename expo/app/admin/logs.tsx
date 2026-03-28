import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  Clock,
  Filter,
  Calendar,
  User,
  Activity,
  Info,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Database,
  Settings,
  UserCog,
  LogIn,
  LogOut,
  Trash,
  Edit,
  Plus,
  X,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { formatDateTime, formatRelativeTime } from '@/utils/date-utils';

// Types for logs
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  category: string;
  message: string;
  userId?: string;
  userName?: string;
  details?: string;
  ip?: string;
}

// Mock data for logs
const MOCK_LOGS: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    level: 'info',
    category: 'auth',
    message: "Connexion réussie",
    userId: 'user-1',
    userName: 'Kévin Perret',
    ip: '192.168.1.1',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    level: 'warning',
    category: 'auth',
    message: "Tentative de connexion échouée",
    userId: 'user-2',
    userName: 'Modérateur Test',
    details: "Mot de passe incorrect",
    ip: '192.168.1.2',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    level: 'error',
    category: 'database',
    message: "Erreur lors de la mise à jour de la base de données",
    userId: 'user-1',
    userName: 'Kévin Perret',
    details: "Contrainte de clé étrangère violée",
    ip: '192.168.1.1',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    level: 'info',
    category: 'user',
    message: "Utilisateur créé",
    userId: 'user-1',
    userName: 'Kévin Perret',
    details: "Nouvel utilisateur: user@mysteriaevent.ch",
    ip: '192.168.1.1',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    level: 'info',
    category: 'settings',
    message: "Paramètres mis à jour",
    userId: 'user-1',
    userName: 'Kévin Perret',
    details: "Changement du thème de l'application",
    ip: '192.168.1.1',
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    level: 'warning',
    category: 'security',
    message: "Tentative d'accès à une ressource protégée",
    userId: 'user-3',
    userName: 'Utilisateur Standard',
    details: "Accès refusé à la section admin",
    ip: '192.168.1.3',
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    level: 'info',
    category: 'auth',
    message: "Déconnexion",
    userId: 'user-2',
    userName: 'Modérateur Test',
    ip: '192.168.1.2',
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    level: 'error',
    category: 'api',
    message: "Erreur API",
    userId: 'user-1',
    userName: 'Kévin Perret',
    details: "Timeout lors de l'appel à l'API externe",
    ip: '192.168.1.1',
  },
  {
    id: '9',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    level: 'info',
    category: 'database',
    message: "Sauvegarde de la base de données",
    userId: 'user-1',
    userName: 'Kévin Perret',
    details: "Sauvegarde automatique quotidienne",
    ip: '192.168.1.1',
  },
  {
    id: '10',
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    level: 'info',
    category: 'user',
    message: "Rôle utilisateur modifié",
    userId: 'user-1',
    userName: 'Kévin Perret',
    details: "Changement de rôle pour l'utilisateur: user@mysteriaevent.ch",
    ip: '192.168.1.1',
  },
];

export default function LogsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.role === 'admin';
  
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/admin');
      return;
    }
    
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, we would fetch logs from an API
        // For now, we'll just use mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLogs(MOCK_LOGS);
        setFilteredLogs(MOCK_LOGS);
      } catch (error) {
        console.error('Error fetching logs:', error);
        Alert.alert('Erreur', 'Impossible de récupérer les journaux');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLogs();
  }, [isAdmin]);
  
  useEffect(() => {
    // Apply filters
    let result = [...logs];
    
    // Search filter
    if (searchQuery) {
      result = result.filter(log => 
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.userName && log.userName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Level filter
    if (selectedLevel) {
      result = result.filter(log => log.level === selectedLevel);
    }
    
    // Category filter
    if (selectedCategory) {
      result = result.filter(log => log.category === selectedCategory);
    }
    
    setFilteredLogs(result);
  }, [logs, searchQuery, selectedLevel, selectedCategory]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // In a real implementation, we would fetch fresh logs
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Randomize the order a bit to simulate new logs
      const shuffled = [...MOCK_LOGS].sort(() => 0.5 - Math.random());
      setLogs(shuffled);
      Alert.alert('Succès', 'Journaux rafraîchis avec succès');
    } catch (error) {
      console.error('Error refreshing logs:', error);
      Alert.alert('Erreur', 'Impossible de rafraîchir les journaux');
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleExportLogs = () => {
    Alert.alert(
      "Exporter les journaux",
      "Choisissez le format d'exportation pour vos journaux.",
      [
        {
          text: "CSV",
          onPress: () => {
            // Simuler un délai pour l'exportation
            setTimeout(() => {
              Alert.alert("Export CSV", "Les journaux ont été exportés au format CSV avec succès.");
            }, 1000);
          }
        },
        {
          text: "JSON",
          onPress: () => {
            // Simuler un délai pour l'exportation
            setTimeout(() => {
              Alert.alert("Export JSON", "Les journaux ont été exportés au format JSON avec succès.");
            }, 1000);
          }
        },
        {
          text: "TXT",
          onPress: () => {
            // Simuler un délai pour l'exportation
            setTimeout(() => {
              Alert.alert("Export TXT", "Les journaux ont été exportés au format TXT avec succès.");
            }, 1000);
          }
        },
        {
          text: "Annuler",
          style: "cancel"
        }
      ]
    );
  };
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  const clearFilters = () => {
    setSelectedLevel(null);
    setSelectedCategory(null);
    setSearchQuery('');
  };
  
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info size={16} color={theme.info} />;
      case 'warning':
        return <AlertTriangle size={16} color={theme.warning} />;
      case 'error':
        return <X size={16} color={theme.error} />;
      default:
        return <Info size={16} color={theme.info} />;
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <LogIn size={16} color={appColors.primary} />;
      case 'database':
        return <Database size={16} color={appColors.primary} />;
      case 'user':
        return <User size={16} color={appColors.primary} />;
      case 'settings':
        return <Settings size={16} color={appColors.primary} />;
      case 'security':
        return <ShieldAlert size={16} color={appColors.primary} />;
      case 'api':
        return <Activity size={16} color={appColors.primary} />;
      default:
        return <FileText size={16} color={appColors.primary} />;
    }
  };
  
  const renderLogItem = ({ item }: { item: LogEntry }) => (
    <Card style={styles.logItem}>
      <View style={styles.logHeader}>
        <View style={styles.logTimestamp}>
          <Clock size={14} color={darkMode ? theme.inactive : '#666666'} style={styles.logIcon} />
          <Text style={[styles.logTimeText, { color: darkMode ? theme.inactive : '#666666' }]}>
            {formatRelativeTime(new Date(item.timestamp))}
          </Text>
        </View>
        
        <View style={[
          styles.logLevelBadge, 
          { 
            backgroundColor: 
              item.level === 'info' ? theme.info + '20' : 
              item.level === 'warning' ? theme.warning + '20' : 
              theme.error + '20' 
          }
        ]}>
          {getLevelIcon(item.level)}
          <Text style={[
            styles.logLevelText, 
            { 
              color: 
                item.level === 'info' ? theme.info : 
                item.level === 'warning' ? theme.warning : 
                theme.error 
            }
          ]}>
            {item.level === 'info' ? 'Info' : item.level === 'warning' ? 'Avertissement' : 'Erreur'}
          </Text>
        </View>
      </View>
      
      <View style={styles.logContent}>
        <View style={styles.logCategoryContainer}>
          {getCategoryIcon(item.category)}
          <Text style={[styles.logCategoryText, { color: appColors.primary }]}>
            {item.category.toUpperCase()}
          </Text>
        </View>
        
        <Text style={[styles.logMessage, { color: theme.text }]}>
          {item.message}
        </Text>
        
        {item.details && (
          <Text style={[styles.logDetails, { color: darkMode ? theme.inactive : '#666666' }]}>
            {item.details}
          </Text>
        )}
      </View>
      
      {item.userName && (
        <View style={styles.logUser}>
          <User size={14} color={darkMode ? theme.inactive : '#666666'} style={styles.logIcon} />
          <Text style={[styles.logUserText, { color: darkMode ? theme.inactive : '#666666' }]}>
            {item.userName}
          </Text>
        </View>
      )}
      
      {item.ip && (
        <View style={styles.logIp}>
          <Text style={[styles.logIpText, { color: darkMode ? theme.inactive : '#999999' }]}>
            IP: {item.ip}
          </Text>
        </View>
      )}
    </Card>
  );
  
  // Get unique categories for filter
  const categories = [...new Set(logs.map(log => log.category))];
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Journaux et historique"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <View style={styles.actionsContainer}>
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Search size={20} color={darkMode ? theme.inactive : '#999999'} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Rechercher..."
              placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: theme.card, borderColor: theme.border },
              (selectedLevel || selectedCategory) && { borderColor: appColors.primary, borderWidth: 2 }
            ]}
            onPress={toggleFilters}
          >
            <Filter size={20} color={(selectedLevel || selectedCategory) ? appColors.primary : theme.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleRefresh}
            disabled={isLoading || refreshing}
          >
            <RefreshCw size={20} color={theme.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleExportLogs}
          >
            <Download size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
      
      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.filterSection}>
            <Text style={[styles.filterTitle, { color: theme.text }]}>Niveau</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedLevel === null && { backgroundColor: appColors.primary + '20' }
                ]}
                onPress={() => setSelectedLevel(null)}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: theme.text },
                  selectedLevel === null && { color: appColors.primary, fontWeight: '600' }
                ]}>
                  Tous
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedLevel === 'info' && { backgroundColor: theme.info + '20' }
                ]}
                onPress={() => setSelectedLevel('info')}
              >
                <Info size={14} color={selectedLevel === 'info' ? theme.info : theme.text} style={styles.filterOptionIcon} />
                <Text style={[
                  styles.filterOptionText,
                  { color: theme.text },
                  selectedLevel === 'info' && { color: theme.info, fontWeight: '600' }
                ]}>
                  Info
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedLevel === 'warning' && { backgroundColor: theme.warning + '20' }
                ]}
                onPress={() => setSelectedLevel('warning')}
              >
                <AlertTriangle size={14} color={selectedLevel === 'warning' ? theme.warning : theme.text} style={styles.filterOptionIcon} />
                <Text style={[
                  styles.filterOptionText,
                  { color: theme.text },
                  selectedLevel === 'warning' && { color: theme.warning, fontWeight: '600' }
                ]}>
                  Avertissement
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedLevel === 'error' && { backgroundColor: theme.error + '20' }
                ]}
                onPress={() => setSelectedLevel('error')}
              >
                <X size={14} color={selectedLevel === 'error' ? theme.error : theme.text} style={styles.filterOptionIcon} />
                <Text style={[
                  styles.filterOptionText,
                  { color: theme.text },
                  selectedLevel === 'error' && { color: theme.error, fontWeight: '600' }
                ]}>
                  Erreur
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={[styles.filterTitle, { color: theme.text }]}>Catégorie</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedCategory === null && { backgroundColor: appColors.primary + '20' }
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: theme.text },
                  selectedCategory === null && { color: appColors.primary, fontWeight: '600' }
                ]}>
                  Toutes
                </Text>
              </TouchableOpacity>
              
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterOption,
                    selectedCategory === category && { backgroundColor: appColors.primary + '20' }
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  {getCategoryIcon(category)}
                  <Text style={[
                    styles.filterOptionText,
                    { color: theme.text },
                    selectedCategory === category && { color: appColors.primary, fontWeight: '600' }
                  ]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.clearFiltersButton, { borderColor: theme.border }]}
            onPress={clearFilters}
          >
            <Text style={[styles.clearFiltersText, { color: theme.text }]}>
              Effacer les filtres
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {isLoading || refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appColors.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Chargement des journaux...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Aucun journal trouvé"
              message={searchQuery || selectedLevel || selectedCategory ? 
                "Essayez de modifier vos filtres." : 
                "Aucun journal n'est disponible pour le moment."}
              icon={<FileText size={48} color={theme.inactive} />}
              actionLabel="Rafraîchir"
              onAction={handleRefresh}
              style={styles.emptyState}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    marginRight: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
  },
  filtersContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionIcon: {
    marginRight: 4,
  },
  filterOptionText: {
    fontSize: 14,
  },
  clearFiltersButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logItem: {
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIcon: {
    marginRight: 4,
  },
  logTimeText: {
    fontSize: 12,
  },
  logLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logLevelText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  logContent: {
    marginBottom: 8,
  },
  logCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  logMessage: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  logDetails: {
    fontSize: 14,
  },
  logUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logUserText: {
    fontSize: 12,
    marginLeft: 4,
  },
  logIp: {
    alignItems: 'flex-end',
  },
  logIpText: {
    fontSize: 10,
  },
  emptyState: {
    marginTop: 40,
  },
});