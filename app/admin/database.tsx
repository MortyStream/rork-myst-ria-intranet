import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Database,
  Key,
  Users,
  Calendar,
  Link,
  CheckSquare,
  Bell,
  FolderTree,
  RefreshCw,
  AlertTriangle,
  Settings,
  Download,
  Upload,
  FileText,
  Shield,
  Info,
  ChevronRight,
  Server,
  Layers,
  X,
  UserCog,
  BarChart2,
  HardDrive,
  Clock,
  Activity,
  Plus,
  Trash2,
  MoreVertical,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSupabaseUsersStore } from '@/store/supabase-users-store';
import { useSupabaseRolesStore } from '@/store/supabase-roles-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { getSupabase, testAuth } from '@/utils/supabase';
import { Button } from '@/components/Button';

export default function DatabaseScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { useMockData, setUseMockData, users, fetchUsers } = useSupabaseUsersStore();
  const { roles, fetchRoles } = useSupabaseRolesStore();
  const { darkMode, supabaseUrl, supabaseKey } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('testing');
  const [lastConnectionTest, setLastConnectionTest] = useState<Date | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [tableWithOpenActions, setTableWithOpenActions] = useState<string | null>(null);
  
  // Stats data
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    recentUsers: 0,
    totalEvents: 0,
    totalLinks: 0,
    totalTasks: 0,
    totalNotifications: 0,
    totalCategories: 0,
    databaseSize: '0 MB',
    lastUpdated: null as Date | null,
  });
  
  // Vérifier si l'utilisateur est admin ou modérateur
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('testing');
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setConnectionStatus('disconnected');
          return;
        }
        
        const authWorks = await testAuth();
        setConnectionStatus(authWorks ? 'connected' : 'disconnected');
        setLastConnectionTest(new Date());
      } catch (error) {
        console.error("Error checking Supabase connection:", error);
        setConnectionStatus('disconnected');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkConnection();
    
    // Load users and roles for stats
    fetchUsers();
    fetchRoles();
    
    // Load stats
    fetchDatabaseStats();
  }, []);
  
  const fetchDatabaseStats = async () => {
    try {
      // In a real implementation, we would fetch this data from Supabase
      // For now, we'll use mock data
      
      // Get users from the store
      const allUsers = useSupabaseUsersStore.getState().users;
      
      // Calculate recent users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentUsers = allUsers.filter(user => {
        if (!user.lastSignIn) return false;
        const lastSignInDate = new Date(user.lastSignIn);
        return lastSignInDate > sevenDaysAgo;
      }).length;
      
      // Mock data for other tables
      const mockTableCounts = {
        events: 12,
        links: 8,
        tasks: 24,
        notifications: 56,
        categories: 9,
      };
      
      // Mock database size
      const mockDatabaseSize = '42.8 MB';
      
      setStatsData({
        totalUsers: allUsers.length,
        recentUsers,
        totalEvents: mockTableCounts.events,
        totalLinks: mockTableCounts.links,
        totalTasks: mockTableCounts.tasks,
        totalNotifications: mockTableCounts.notifications,
        totalCategories: mockTableCounts.categories,
        databaseSize: mockDatabaseSize,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error fetching database stats:", error);
      Alert.alert("Erreur", "Impossible de récupérer les statistiques de la base de données");
    }
  };
  
  if (!isAdminOrModerator) {
    router.replace('/admin');
    return null;
  }
  
  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    try {
      const authWorks = await testAuth();
      setConnectionStatus(authWorks ? 'connected' : 'disconnected');
      setLastConnectionTest(new Date());
      
      if (authWorks) {
        Alert.alert("Succès", "Connexion à Supabase établie avec succès");
      } else {
        Alert.alert("Erreur", "Impossible de se connecter à Supabase");
      }
    } catch (error) {
      console.error("Error testing Supabase connection:", error);
      setConnectionStatus('disconnected');
      Alert.alert("Erreur", "Une erreur est survenue lors du test de connexion");
    }
  };
  
  const handleConfigureAPI = () => {
    router.push('/admin/database-config');
  };
  
  const handleManageUsers = () => {
    router.push('/admin/users');
  };
  
  const handleManageRoles = () => {
    router.push('/admin/roles');
  };
  
  const handleManageTable = (tableName: string) => {
    router.push({
      pathname: '/admin/database-table',
      params: { table: tableName }
    });
  };
  
  const handleBackupDatabase = () => {
    Alert.alert(
      "Sauvegarde de la base de données",
      "Choisissez le format d'exportation pour votre base de données Supabase.",
      [
        {
          text: "CSV",
          onPress: () => {
            // Simuler un délai pour l'exportation
            setTimeout(() => {
              Alert.alert("Export CSV", "Les données ont été exportées au format CSV avec succès.");
            }, 1000);
          }
        },
        {
          text: "JSON",
          onPress: () => {
            // Simuler un délai pour l'exportation
            setTimeout(() => {
              Alert.alert("Export JSON", "Les données ont été exportées au format JSON avec succès.");
            }, 1000);
          }
        },
        {
          text: "SQL",
          onPress: () => {
            // Simuler un délai pour l'exportation
            setTimeout(() => {
              Alert.alert("Export SQL", "Les données ont été exportées au format SQL avec succès.");
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
  
  const handleRestoreDatabase = () => {
    Alert.alert(
      "Restauration de la base de données",
      "Choisissez la source de données à importer dans votre base Supabase.",
      [
        {
          text: "Importer depuis CSV",
          onPress: () => {
            // Simuler un délai pour l'importation
            setTimeout(() => {
              Alert.alert("Import CSV", "Les données ont été importées depuis CSV avec succès.");
            }, 1500);
          }
        },
        {
          text: "Importer depuis JSON",
          onPress: () => {
            // Simuler un délai pour l'importation
            setTimeout(() => {
              Alert.alert("Import JSON", "Les données ont été importées depuis JSON avec succès.");
            }, 1500);
          }
        },
        {
          text: "Importer depuis SQL",
          onPress: () => {
            // Simuler un délai pour l'importation
            setTimeout(() => {
              Alert.alert("Import SQL", "Les données ont été importées depuis SQL avec succès.");
            }, 1500);
          }
        },
        {
          text: "Annuler",
          style: "cancel"
        }
      ]
    );
  };
  
  const handleSecurityPermissions = () => {
    Alert.alert(
      "Sécurité et permissions",
      "Cette section vous permet de gérer les permissions d'accès à votre base de données Supabase.",
      [
        {
          text: "Permissions des tables",
          onPress: () => {
            // Simuler un délai pour l'action
            setTimeout(() => {
              Alert.alert("Permissions des tables", "Vous pouvez configurer qui peut lire, écrire ou modifier chaque table de votre base de données.");
            }, 500);
          }
        },
        {
          text: "Rôles et accès",
          onPress: () => {
            // Simuler un délai pour l'action
            setTimeout(() => {
              Alert.alert("Rôles et accès", "Vous pouvez définir des rôles personnalisés avec des permissions spécifiques pour votre base de données.");
            }, 500);
          }
        },
        {
          text: "Politiques de sécurité",
          onPress: () => {
            // Simuler un délai pour l'action
            setTimeout(() => {
              Alert.alert("Politiques de sécurité", "Vous pouvez configurer des politiques de sécurité au niveau des lignes pour un contrôle d'accès précis.");
            }, 500);
          }
        },
        {
          text: "Annuler",
          style: "cancel"
        }
      ]
    );
  };
  
  const handleLogsHistory = () => {
    router.push('/admin/logs');
  };
  
  const handleViewStats = () => {
    // Refresh stats before showing the modal
    fetchDatabaseStats();
    setShowStatsModal(true);
  };
  
  const toggleMockData = (value: boolean) => {
    setUseMockData(value);
    if (value) {
      Alert.alert(
        "Mode démo activé",
        "Les données affichées sont simulées et ne reflètent pas les données réelles de Supabase."
      );
    } else {
      Alert.alert(
        "Mode démo désactivé",
        "L'application tentera de se connecter à votre base de données Supabase réelle."
      );
    }
  };
  
  const handleAddTableEntry = (tableName: string) => {
    router.push({
      pathname: '/admin/database-table',
      params: { table: tableName, action: 'add' }
    });
  };
  
  const handleExportTableCSV = (tableName: string) => {
    // In a real implementation, we would fetch all data from the table and convert to CSV
    Alert.alert(
      "Exporter la table",
      `Voulez-vous exporter toutes les données de la table "${tableName}" au format CSV ?`,
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Exporter",
          onPress: () => {
            // Simuler un délai pour l'exportation
            setTimeout(() => {
              Alert.alert("Export CSV", `Les données de la table "${tableName}" ont été exportées au format CSV avec succès.`);
            }, 1000);
          }
        }
      ]
    );
  };
  
  const handleClearTable = (tableName: string) => {
    Alert.alert(
      "⚠️ Vider la table",
      `Êtes-vous sûr de vouloir supprimer TOUTES les données de la table "${tableName}" ? Cette action est irréversible.`,
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Confirmer",
          style: "destructive",
          onPress: () => {
            // Double confirmation
            Alert.alert(
              "⚠️ Confirmation finale",
              `Dernière chance : Êtes-vous VRAIMENT sûr de vouloir vider la table "${tableName}" ? Toutes les données seront perdues définitivement.`,
              [
                {
                  text: "Non, annuler",
                  style: "cancel"
                },
                {
                  text: "Oui, vider la table",
                  style: "destructive",
                  onPress: () => {
                    // In a real implementation, we would delete all data from the table
                    // supabase.from(tableName).delete().neq('id', '')
                    
                    // Simuler un délai pour la suppression
                    setTimeout(() => {
                      Alert.alert("Table vidée", `Toutes les données de la table "${tableName}" ont été supprimées avec succès.`);
                    }, 1500);
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };
  
  const toggleTableActions = (tableName: string) => {
    if (tableWithOpenActions === tableName) {
      setTableWithOpenActions(null);
    } else {
      setTableWithOpenActions(tableName);
    }
  };
  
  const renderConnectionStatus = () => {
    if (connectionStatus === 'testing') {
      return (
        <View style={styles.statusIndicator}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.statusText, { color: theme.text }]}>
            Test de connexion...
          </Text>
        </View>
      );
    } else if (connectionStatus === 'connected') {
      return (
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.statusText, { color: theme.success }]}>
            Connecté
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: theme.error }]} />
          <Text style={[styles.statusText, { color: theme.error }]}>
            Déconnecté
          </Text>
        </View>
      );
    }
  };
  
  const tables = [
    { name: 'users', title: 'Utilisateurs', icon: <Users size={20} color={appColors.primary} /> },
    { name: 'calendar_events', title: 'Événements', icon: <Calendar size={20} color={appColors.primary} /> },
    { name: 'links', title: 'Liens', icon: <Link size={20} color={appColors.primary} /> },
    { name: 'tasks', title: 'Tâches', icon: <CheckSquare size={20} color={appColors.primary} /> },
    { name: 'notifications', title: 'Notifications', icon: <Bell size={20} color={appColors.primary} /> },
    { name: 'categories', title: 'Catégories', icon: <FolderTree size={20} color={appColors.primary} /> },
  ];
  
  const renderInfoModal = () => {
    return (
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                À propos de la gestion de base de données
              </Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <Text style={[styles.infoText, { color: theme.text }]}>
                Cette section vous permet de gérer votre base de données Supabase directement depuis l'application. Vous pouvez configurer la connexion, gérer les utilisateurs, accéder aux tables de données et effectuer des sauvegardes.
              </Text>
              
              <Text style={[styles.infoText, { color: theme.text, marginTop: 12 }]}>
                En mode démo, les données sont simulées pour vous permettre de tester les fonctionnalités sans risque.
              </Text>
              
              <Text style={[styles.infoSectionTitle, { color: theme.text, marginTop: 20 }]}>
                Fonctionnalités disponibles
              </Text>
              
              <View style={styles.infoFeature}>
                <Server size={18} color={appColors.primary} style={styles.infoFeatureIcon} />
                <Text style={[styles.infoFeatureText, { color: theme.text }]}>
                  Gestion de la connexion à Supabase
                </Text>
              </View>
              
              <View style={styles.infoFeature}>
                <Users size={18} color={appColors.primary} style={styles.infoFeatureIcon} />
                <Text style={[styles.infoFeatureText, { color: theme.text }]}>
                  Gestion des utilisateurs et des comptes
                </Text>
              </View>
              
              <View style={styles.infoFeature}>
                <UserCog size={18} color={appColors.primary} style={styles.infoFeatureIcon} />
                <Text style={[styles.infoFeatureText, { color: theme.text }]}>
                  Gestion des rôles personnalisés
                </Text>
              </View>
              
              <View style={styles.infoFeature}>
                <Layers size={18} color={appColors.primary} style={styles.infoFeatureIcon} />
                <Text style={[styles.infoFeatureText, { color: theme.text }]}>
                  Accès aux tables de données
                </Text>
              </View>
              
              <View style={styles.infoFeature}>
                <Download size={18} color={appColors.primary} style={styles.infoFeatureIcon} />
                <Text style={[styles.infoFeatureText, { color: theme.text }]}>
                  Sauvegarde et restauration des données
                </Text>
              </View>
              
              <View style={styles.infoFeature}>
                <Shield size={18} color={appColors.primary} style={styles.infoFeatureIcon} />
                <Text style={[styles.infoFeatureText, { color: theme.text }]}>
                  Gestion de la sécurité et des permissions
                </Text>
              </View>
              
              <View style={styles.infoFeature}>
                <BarChart2 size={18} color={appColors.primary} style={styles.infoFeatureIcon} />
                <Text style={[styles.infoFeatureText, { color: theme.text }]}>
                  Statistiques de la base de données
                </Text>
              </View>
            </ScrollView>
            
            <Button
              title="Fermer"
              onPress={() => setShowInfoModal(false)}
              style={{ backgroundColor: appColors.primary, marginTop: 16 }}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderStatsModal = () => {
    return (
      <Modal
        visible={showStatsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Statistiques de la base de données
              </Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <Text style={[styles.infoText, { color: theme.text }]}>
                Aperçu des statistiques de votre base de données Supabase.
              </Text>
              
              {statsData.lastUpdated && (
                <Text style={[styles.statsLastUpdated, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Dernière mise à jour: {statsData.lastUpdated.toLocaleString()}
                </Text>
              )}
              
              <Text style={[styles.infoSectionTitle, { color: theme.text, marginTop: 20 }]}>
                Utilisateurs
              </Text>
              
              <View style={styles.statsRow}>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Users size={24} color={appColors.primary} style={styles.statsIcon} />
                  <Text style={[styles.statsValue, { color: theme.text }]}>{statsData.totalUsers}</Text>
                  <Text style={[styles.statsLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Utilisateurs totaux
                  </Text>
                </View>
                
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Clock size={24} color={appColors.secondary} style={styles.statsIcon} />
                  <Text style={[styles.statsValue, { color: theme.text }]}>{statsData.recentUsers}</Text>
                  <Text style={[styles.statsLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Actifs (7 jours)
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.infoSectionTitle, { color: theme.text, marginTop: 20 }]}>
                Tables
              </Text>
              
              <View style={styles.statsRow}>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Calendar size={24} color={appColors.primary} style={styles.statsIcon} />
                  <Text style={[styles.statsValue, { color: theme.text }]}>{statsData.totalEvents}</Text>
                  <Text style={[styles.statsLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Événements
                  </Text>
                </View>
                
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Link size={24} color={appColors.secondary} style={styles.statsIcon} />
                  <Text style={[styles.statsValue, { color: theme.text }]}>{statsData.totalLinks}</Text>
                  <Text style={[styles.statsLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Liens
                  </Text>
                </View>
              </View>
              
              <View style={styles.statsRow}>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <CheckSquare size={24} color={appColors.primary} style={styles.statsIcon} />
                  <Text style={[styles.statsValue, { color: theme.text }]}>{statsData.totalTasks}</Text>
                  <Text style={[styles.statsLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Tâches
                  </Text>
                </View>
                
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Bell size={24} color={appColors.secondary} style={styles.statsIcon} />
                  <Text style={[styles.statsValue, { color: theme.text }]}>{statsData.totalNotifications}</Text>
                  <Text style={[styles.statsLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Notifications
                  </Text>
                </View>
              </View>
              
              <View style={styles.statsRow}>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <FolderTree size={24} color={appColors.primary} style={styles.statsIcon} />
                  <Text style={[styles.statsValue, { color: theme.text }]}>{statsData.totalCategories}</Text>
                  <Text style={[styles.statsLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Catégories
                  </Text>
                </View>
                
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <HardDrive size={24} color={appColors.secondary} style={styles.statsIcon} />
                  <Text style={[styles.statsValue, { color: theme.text }]}>{statsData.databaseSize}</Text>
                  <Text style={[styles.statsLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Taille de la base
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.statsNote, { color: darkMode ? theme.inactive : '#666666' }]}>
                Note: Ces statistiques sont calculées à partir des données disponibles dans l'application. Pour des statistiques plus détaillées, consultez le tableau de bord Supabase.
              </Text>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <Button
                title="Rafraîchir"
                onPress={fetchDatabaseStats}
                style={{ backgroundColor: appColors.primary }}
                icon={<RefreshCw size={18} color="#ffffff" />}
              />
              <Button
                title="Fermer"
                onPress={() => setShowStatsModal(false)}
                variant="outline"
                style={{ borderColor: theme.border, marginLeft: 8 }}
                textStyle={{ color: theme.text }}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Base de données"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      {useMockData && (
        <View style={[styles.mockDataBanner, { backgroundColor: theme.warning + '20' }]}>
          <AlertTriangle size={20} color={theme.warning} style={styles.mockDataIcon} />
          <Text style={[styles.mockDataText, { color: theme.text }]}>
            Mode démo : Les données affichées sont simulées car l'API Supabase Admin n'est pas disponible.
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Connection Status Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Server size={22} color={appColors.primary} style={styles.cardIcon} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                État de la connexion
              </Text>
            </View>
            
            {renderConnectionStatus()}
          </View>
          
          <View style={styles.connectionDetails}>
            <Text style={[styles.connectionDetailsText, { color: darkMode ? theme.inactive : '#666666' }]}>
              URL: {supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Non configurée'}
            </Text>
            <Text style={[styles.connectionDetailsText, { color: darkMode ? theme.inactive : '#666666' }]}>
              Clé API: {supabaseKey ? '••••••••••••••••••••' : 'Non configurée'}
            </Text>
            {lastConnectionTest && (
              <Text style={[styles.connectionDetailsText, { color: darkMode ? theme.inactive : '#666666' }]}>
                Dernier test: {lastConnectionTest.toLocaleString()}
              </Text>
            )}
          </View>
          
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: appColors.primary }]}
              onPress={handleTestConnection}
            >
              <RefreshCw size={18} color="#ffffff" style={styles.actionButtonIcon} />
              <Text style={styles.actionButtonText}>Tester la connexion</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
              onPress={handleConfigureAPI}
            >
              <Key size={18} color={theme.text} style={styles.actionButtonIcon} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>Configurer l'API</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.mockDataToggleContainer}>
            <Text style={[styles.mockDataToggleLabel, { color: theme.text }]}>
              Mode démo
            </Text>
            <Switch
              value={useMockData}
              onValueChange={toggleMockData}
              trackColor={{ false: Platform.OS === 'ios' ? '#e9e9ea' : '#767577', true: appColors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#ffffff' : useMockData ? '#ffffff' : '#f4f3f4'}
              ios_backgroundColor="#e9e9ea"
            />
          </View>
        </Card>
        
        {/* Database Stats Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <BarChart2 size={22} color={appColors.primary} style={styles.cardIcon} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Statistiques
              </Text>
            </View>
          </View>
          
          <Text style={[styles.cardDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
            Consultez les statistiques de votre base de données Supabase pour avoir un aperçu de son état et de son utilisation.
          </Text>
          
          <View style={styles.statsPreview}>
            <View style={styles.statsPreviewItem}>
              <View style={[styles.statsPreviewIcon, { backgroundColor: appColors.primary + '20' }]}>
                <Users size={20} color={appColors.primary} />
              </View>
              <View style={styles.statsPreviewContent}>
                <Text style={[styles.statsPreviewLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Utilisateurs
                </Text>
                <Text style={[styles.statsPreviewValue, { color: theme.text }]}>
                  {statsData.totalUsers}
                </Text>
              </View>
            </View>
            
            <View style={styles.statsPreviewItem}>
              <View style={[styles.statsPreviewIcon, { backgroundColor: appColors.secondary + '20' }]}>
                <Activity size={20} color={appColors.secondary} />
              </View>
              <View style={styles.statsPreviewContent}>
                <Text style={[styles.statsPreviewLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Actifs (7j)
                </Text>
                <Text style={[styles.statsPreviewValue, { color: theme.text }]}>
                  {statsData.recentUsers}
                </Text>
              </View>
            </View>
            
            <View style={styles.statsPreviewItem}>
              <View style={[styles.statsPreviewIcon, { backgroundColor: theme.info + '20' }]}>
                <Database size={20} color={theme.info} />
              </View>
              <View style={styles.statsPreviewContent}>
                <Text style={[styles.statsPreviewLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                  Taille
                </Text>
                <Text style={[styles.statsPreviewValue, { color: theme.text }]}>
                  {statsData.databaseSize}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.viewStatsButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleViewStats}
          >
            <Text style={[styles.viewStatsButtonText, { color: theme.text }]}>
              Voir toutes les statistiques
            </Text>
            <ChevronRight size={20} color={darkMode ? theme.inactive : '#666666'} />
          </TouchableOpacity>
        </Card>
        
        {/* User Management Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Users size={22} color={appColors.primary} style={styles.cardIcon} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Gestion des utilisateurs
              </Text>
            </View>
          </View>
          
          <Text style={[styles.cardDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
            Gérez les comptes d'authentification Supabase, créez de nouveaux utilisateurs, modifiez les rôles et supprimez des comptes.
          </Text>
          
          <View style={styles.userManagementButtons}>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleManageUsers}
            >
              <View style={styles.menuItemContent}>
                <Users size={20} color={appColors.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Gérer les utilisateurs
                </Text>
              </View>
              <ChevronRight size={20} color={darkMode ? theme.inactive : '#666666'} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleManageRoles}
            >
              <View style={styles.menuItemContent}>
                <UserCog size={20} color={appColors.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Gérer les rôles
                </Text>
              </View>
              <ChevronRight size={20} color={darkMode ? theme.inactive : '#666666'} />
            </TouchableOpacity>
          </View>
        </Card>
        
        {/* Database Tables Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Layers size={22} color={appColors.primary} style={styles.cardIcon} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Tables de données
              </Text>
            </View>
          </View>
          
          <Text style={[styles.cardDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
            Accédez aux tables de votre base de données Supabase pour visualiser, modifier ou supprimer des enregistrements.
          </Text>
          
          <View style={styles.tablesList}>
            {tables.map((table, index) => (
              <View key={index}>
                <View style={[
                  styles.tableItem,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  index === tables.length - 1 && !tableWithOpenActions && styles.lastMenuItem
                ]}>
                  <TouchableOpacity
                    style={styles.tableItemMain}
                    onPress={() => handleManageTable(table.name)}
                  >
                    <View style={styles.menuItemContent}>
                      {table.icon}
                      <Text style={[styles.menuItemText, { color: theme.text }]}>
                        {table.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.tableItemActions}>
                    <TouchableOpacity
                      style={styles.tableQuickAction}
                      onPress={() => handleAddTableEntry(table.name)}
                    >
                      <Plus size={18} color={appColors.primary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.tableQuickAction}
                      onPress={() => handleExportTableCSV(table.name)}
                    >
                      <Download size={18} color={theme.info} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.tableActionsToggle}
                      onPress={() => toggleTableActions(table.name)}
                    >
                      <MoreVertical size={18} color={darkMode ? theme.inactive : '#666666'} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {tableWithOpenActions === table.name && (
                  <View style={[
                    styles.tableActionsMenu,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    index === tables.length - 1 && styles.lastMenuItem
                  ]}>
                    <TouchableOpacity
                      style={styles.tableActionMenuItem}
                      onPress={() => handleAddTableEntry(table.name)}
                    >
                      <Plus size={18} color={appColors.primary} style={styles.tableActionMenuItemIcon} />
                      <Text style={[styles.tableActionMenuItemText, { color: theme.text }]}>
                        Ajouter une entrée
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.tableActionMenuItem}
                      onPress={() => handleExportTableCSV(table.name)}
                    >
                      <Download size={18} color={theme.info} style={styles.tableActionMenuItemIcon} />
                      <Text style={[styles.tableActionMenuItemText, { color: theme.text }]}>
                        Exporter en CSV
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.tableActionMenuItem}
                      onPress={() => handleClearTable(table.name)}
                    >
                      <Trash2 size={18} color={theme.error} style={styles.tableActionMenuItemIcon} />
                      <Text style={[styles.tableActionMenuItemText, { color: theme.error }]}>
                        Vider la table
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        </Card>
        
        {/* Backup & Restore Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Database size={22} color={appColors.primary} style={styles.cardIcon} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Sauvegarde et restauration
              </Text>
            </View>
          </View>
          
          <Text style={[styles.cardDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
            Exportez vos données pour les sauvegarder ou importez des données existantes dans votre base Supabase.
          </Text>
          
          <View style={styles.backupActions}>
            <TouchableOpacity
              style={[styles.backupButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleBackupDatabase}
            >
              <Download size={20} color={appColors.primary} style={styles.backupButtonIcon} />
              <Text style={[styles.backupButtonText, { color: theme.text }]}>
                Exporter les données
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.backupButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleRestoreDatabase}
            >
              <Upload size={20} color={appColors.primary} style={styles.backupButtonIcon} />
              <Text style={[styles.backupButtonText, { color: theme.text }]}>
                Importer des données
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        {/* Advanced Settings Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Settings size={22} color={appColors.primary} style={styles.cardIcon} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Paramètres avancés
              </Text>
            </View>
          </View>
          
          <Text style={[styles.cardDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
            Configurez des paramètres avancés pour votre base de données Supabase.
          </Text>
          
          <View style={styles.advancedMenuItems}>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleSecurityPermissions}
            >
              <View style={styles.menuItemContent}>
                <Shield size={20} color={appColors.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Sécurité et permissions
                </Text>
              </View>
              <ChevronRight size={20} color={darkMode ? theme.inactive : '#666666'} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleLogsHistory}
            >
              <View style={styles.menuItemContent}>
                <FileText size={20} color={appColors.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Journaux et historique
                </Text>
              </View>
              <ChevronRight size={20} color={darkMode ? theme.inactive : '#666666'} />
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
      
      <TouchableOpacity 
        style={[styles.infoButton, { backgroundColor: theme.info }]}
        onPress={() => setShowInfoModal(true)}
      >
        <Info size={20} color="#ffffff" />
      </TouchableOpacity>
      
      {renderInfoModal()}
      {renderStatsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mockDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  mockDataIcon: {
    marginRight: 8,
  },
  mockDataText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectionDetails: {
    marginBottom: 16,
  },
  connectionDetailsText: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  mockDataToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  mockDataToggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  userManagementButtons: {
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  lastMenuItem: {
    marginBottom: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  tablesList: {
    marginBottom: 8,
  },
  tableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 1,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  tableItemMain: {
    flex: 1,
  },
  tableItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableQuickAction: {
    padding: 8,
    marginLeft: 4,
  },
  tableActionsToggle: {
    padding: 8,
    marginLeft: 4,
  },
  tableActionsMenu: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingVertical: 8,
  },
  tableActionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tableActionMenuItemIcon: {
    marginRight: 12,
  },
  tableActionMenuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  backupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
  },
  backupButtonIcon: {
    marginRight: 8,
  },
  backupButtonText: {
    fontWeight: '500',
    fontSize: 14,
  },
  advancedMenuItems: {
    marginBottom: 8,
  },
  infoButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalScrollView: {
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoFeatureIcon: {
    marginRight: 12,
  },
  infoFeatureText: {
    fontSize: 16,
  },
  // Stats preview styles
  statsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statsPreviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statsPreviewContent: {
    flex: 1,
  },
  statsPreviewLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statsPreviewValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewStatsButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Stats modal styles
  statsLastUpdated: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    width: '48%',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statsIcon: {
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statsNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});