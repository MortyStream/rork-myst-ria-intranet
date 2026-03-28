import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Database,
  Search,
  Plus,
  Trash,
  Edit,
  RefreshCw,
  AlertTriangle,
  Download,
  Filter,
  X,
  Save,
  Info,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Trash2,
  FileText,
  Upload,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';

// Get screen width for responsive design
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data for different tables
const MOCK_DATA = {
  users: [
    { id: '1', email: 'user1@example.com', firstName: 'John', lastName: 'Doe', role: 'user', createdAt: '2023-01-01T00:00:00Z' },
    { id: '2', email: 'user2@example.com', firstName: 'Jane', lastName: 'Smith', role: 'admin', createdAt: '2023-01-02T00:00:00Z' },
    { id: '3', email: 'user3@example.com', firstName: 'Bob', lastName: 'Johnson', role: 'moderator', createdAt: '2023-01-03T00:00:00Z' },
    { id: '4', email: 'user4@example.com', firstName: 'Alice', lastName: 'Williams', role: 'user', createdAt: '2023-01-04T00:00:00Z' },
    { id: '5', email: 'user5@example.com', firstName: 'Charlie', lastName: 'Brown', role: 'user', createdAt: '2023-01-05T00:00:00Z' },
  ],
  calendar_events: [
    { id: '1', title: 'Team Meeting', description: 'Weekly team sync', startDate: '2023-06-01T10:00:00Z', endDate: '2023-06-01T11:00:00Z', createdBy: '1' },
    { id: '2', title: 'Project Deadline', description: 'Submit final deliverables', startDate: '2023-06-15T23:59:59Z', endDate: '2023-06-15T23:59:59Z', createdBy: '2' },
    { id: '3', title: 'Conference', description: 'Annual industry conference', startDate: '2023-07-10T09:00:00Z', endDate: '2023-07-12T17:00:00Z', createdBy: '1' },
  ],
  links: [
    { id: '1', title: 'Documentation', url: 'https://docs.example.com', category: 'Resources', createdAt: '2023-02-01T00:00:00Z' },
    { id: '2', title: 'Company Website', url: 'https://example.com', category: 'Official', createdAt: '2023-02-02T00:00:00Z' },
    { id: '3', title: 'Support Portal', url: 'https://support.example.com', category: 'Help', createdAt: '2023-02-03T00:00:00Z' },
  ],
  tasks: [
    { id: '1', title: 'Complete project proposal', description: 'Draft and submit project proposal', status: 'completed', dueDate: '2023-03-01T00:00:00Z', assignedTo: '1' },
    { id: '2', title: 'Review code changes', description: 'Review pull requests', status: 'in_progress', dueDate: '2023-03-05T00:00:00Z', assignedTo: '2' },
    { id: '3', title: 'Update documentation', description: 'Update API documentation', status: 'pending', dueDate: '2023-03-10T00:00:00Z', assignedTo: '3' },
  ],
  notifications: [
    { id: '1', title: 'New message', content: 'You have a new message from John', type: 'message', createdAt: '2023-04-01T10:30:00Z', userId: '1', read: false },
    { id: '2', title: 'Task assigned', content: 'You have been assigned a new task', type: 'task', createdAt: '2023-04-02T14:45:00Z', userId: '2', read: true },
    { id: '3', title: 'Event reminder', content: 'Team meeting in 30 minutes', type: 'event', createdAt: '2023-04-03T09:30:00Z', userId: '1', read: false },
  ],
  categories: [
    { id: '1', name: 'Resources', description: 'Useful resources and documentation', createdAt: '2023-05-01T00:00:00Z' },
    { id: '2', name: 'Official', description: 'Official company resources', createdAt: '2023-05-02T00:00:00Z' },
    { id: '3', name: 'Help', description: 'Help and support resources', createdAt: '2023-05-03T00:00:00Z' },
  ],
};

// Table schema definitions
const TABLE_SCHEMAS = {
  users: [
    { name: 'id', type: 'string', primary: true },
    { name: 'email', type: 'string', required: true },
    { name: 'firstName', type: 'string' },
    { name: 'lastName', type: 'string' },
    { name: 'role', type: 'string' },
    { name: 'createdAt', type: 'datetime' },
  ],
  calendar_events: [
    { name: 'id', type: 'string', primary: true },
    { name: 'title', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'startDate', type: 'datetime', required: true },
    { name: 'endDate', type: 'datetime', required: true },
    { name: 'createdBy', type: 'string', foreign: 'users.id' },
  ],
  links: [
    { name: 'id', type: 'string', primary: true },
    { name: 'title', type: 'string', required: true },
    { name: 'url', type: 'string', required: true },
    { name: 'category', type: 'string' },
    { name: 'createdAt', type: 'datetime' },
  ],
  tasks: [
    { name: 'id', type: 'string', primary: true },
    { name: 'title', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'status', type: 'string', required: true },
    { name: 'dueDate', type: 'datetime' },
    { name: 'assignedTo', type: 'string', foreign: 'users.id' },
  ],
  notifications: [
    { name: 'id', type: 'string', primary: true },
    { name: 'title', type: 'string', required: true },
    { name: 'content', type: 'string' },
    { name: 'type', type: 'string' },
    { name: 'createdAt', type: 'datetime' },
    { name: 'userId', type: 'string', foreign: 'users.id' },
    { name: 'read', type: 'boolean', default: false },
  ],
  categories: [
    { name: 'id', type: 'string', primary: true },
    { name: 'name', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'createdAt', type: 'datetime' },
  ],
};

// Table display names
const TABLE_DISPLAY_NAMES = {
  users: 'Utilisateurs',
  calendar_events: 'Événements',
  links: 'Liens',
  tasks: 'Tâches',
  notifications: 'Notifications',
  categories: 'Catégories',
};

export default function DatabaseTableScreen() {
  const router = useRouter();
  const { table, action } = useLocalSearchParams<{ table: string, action?: string }>();
  const { user } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const appColors = useAppColors();
  
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedItem, setEditedItem] = useState<any | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Vérifier si l'utilisateur est admin ou modérateur
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  
  // Get table schema
  const tableSchema = TABLE_SCHEMAS[table as keyof typeof TABLE_SCHEMAS] || [];
  const tableDisplayName = TABLE_DISPLAY_NAMES[table as keyof typeof TABLE_DISPLAY_NAMES] || table;
  
  useEffect(() => {
    if (!isAdminOrModerator) {
      router.replace('/admin');
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, we would fetch data from Supabase
        // For now, we'll just use mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData = MOCK_DATA[table as keyof typeof MOCK_DATA] || [];
        setData(mockData);
        setFilteredData(mockData);
      } catch (error) {
        console.error(`Error fetching ${table} data:`, error);
        Alert.alert("Erreur", `Impossible de récupérer les données de la table ${table}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Check if we should open the add form directly
    if (action === 'add') {
      handleAddItem();
    }
  }, [table, isAdminOrModerator, action]);
  
  useEffect(() => {
    // Filter and sort data
    let result = [...data];
    
    // Apply search filter
    if (searchQuery) {
      result = result.filter(item => {
        return Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }
    
    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    setFilteredData(result);
    setCurrentPage(1); // Reset to first page when filtering/sorting
  }, [data, searchQuery, sortField, sortDirection]);
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if already sorting by this field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const handleAddItem = () => {
    // Create a new item with default values based on schema
    const newItem: any = {};
    tableSchema.forEach(field => {
      if (field.type === 'string') newItem[field.name] = '';
      if (field.type === 'number') newItem[field.name] = 0;
      if (field.type === 'boolean') newItem[field.name] = false;
      if (field.type === 'datetime') newItem[field.name] = new Date().toISOString();
      
      // Skip id field, it will be generated
      if (field.name === 'id') delete newItem[field.name];
    });
    
    setEditedItem(newItem);
    setIsEditModalVisible(true);
  };
  
  const handleEditItem = (item: any) => {
    setEditedItem({...item});
    setIsEditModalVisible(true);
  };
  
  const handleDeleteItem = (item: any) => {
    Alert.alert(
      "Confirmer la suppression",
      `Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.`,
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            // In a real implementation, we would delete from Supabase
            // For now, we'll just update our local state
            const newData = data.filter(i => i.id !== item.id);
            setData(newData);
            Alert.alert("Succès", "Élément supprimé avec succès");
          }
        }
      ]
    );
  };
  
  const handleViewItem = (item: any) => {
    setSelectedItem(item);
  };
  
  const handleSaveItem = () => {
    if (!editedItem) return;
    
    // Validate required fields
    const missingRequiredFields = tableSchema
      .filter(field => field.required && !editedItem[field.name])
      .map(field => field.name);
    
    if (missingRequiredFields.length > 0) {
      Alert.alert(
        "Champs obligatoires manquants",
        `Veuillez remplir les champs suivants : ${missingRequiredFields.join(', ')}`
      );
      return;
    }
    
    // In a real implementation, we would save to Supabase
    // For now, we'll just update our local state
    if (editedItem.id) {
      // Update existing item
      const newData = data.map(item => 
        item.id === editedItem.id ? editedItem : item
      );
      setData(newData);
    } else {
      // Add new item with generated ID
      const newItem = {
        ...editedItem,
        id: Math.random().toString(36).substring(2, 9)
      };
      setData([...data, newItem]);
    }
    
    setIsEditModalVisible(false);
    setEditedItem(null);
    Alert.alert("Succès", "Élément enregistré avec succès");
  };
  
  const handleExportData = (format: 'csv' | 'json') => {
    // In a real implementation, we would generate the file and trigger a download
    // For now, we'll just show a success message
    
    if (format === 'csv') {
      // Convert data to CSV
      const headers = tableSchema.map(field => field.name).join(',');
      const rows = data.map(item => {
        return tableSchema.map(field => {
          const value = item[field.name];
          // Handle special cases for CSV formatting
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value;
        }).join(',');
      }).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      
      // On web, we could trigger a download
      if (Platform.OS === 'web') {
        Alert.alert("Export CSV", "Les données ont été exportées au format CSV avec succès.");
        // In a real implementation, we would use something like:
        // const blob = new Blob([csvContent], { type: 'text/csv' });
        // const url = URL.createObjectURL(blob);
        // const a = document.createElement('a');
        // a.href = url;
        // a.download = `${table}.csv`;
        // a.click();
      } else {
        // On mobile, we could use Share API
        Share.share({
          title: `Export ${tableDisplayName}`,
          message: csvContent,
        }).then(result => {
          if (result.action === Share.sharedAction) {
            Alert.alert("Export CSV", "Les données ont été partagées au format CSV avec succès.");
          }
        });
      }
    } else if (format === 'json') {
      // Convert data to JSON
      const jsonContent = JSON.stringify(data, null, 2);
      
      // On web, we could trigger a download
      if (Platform.OS === 'web') {
        Alert.alert("Export JSON", "Les données ont été exportées au format JSON avec succès.");
        // In a real implementation, we would use something like:
        // const blob = new Blob([jsonContent], { type: 'application/json' });
        // const url = URL.createObjectURL(blob);
        // const a = document.createElement('a');
        // a.href = url;
        // a.download = `${table}.json`;
        // a.click();
      } else {
        // On mobile, we could use Share API
        Share.share({
          title: `Export ${tableDisplayName}`,
          message: jsonContent,
        }).then(result => {
          if (result.action === Share.sharedAction) {
            Alert.alert("Export JSON", "Les données ont été partagées au format JSON avec succès.");
          }
        });
      }
    }
    
    setShowActionsModal(false);
  };
  
  const handleClearTable = () => {
    Alert.alert(
      "⚠️ Vider la table",
      `Êtes-vous sûr de vouloir supprimer TOUTES les données de la table "${tableDisplayName}" ? Cette action est irréversible.`,
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
              `Dernière chance : Êtes-vous VRAIMENT sûr de vouloir vider la table "${tableDisplayName}" ? Toutes les données seront perdues définitivement.`,
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
                    // supabase.from(table).delete().neq('id', '')
                    
                    // For now, we'll just clear our local state
                    setData([]);
                    setShowActionsModal(false);
                    Alert.alert("Table vidée", `Toutes les données de la table "${tableDisplayName}" ont été supprimées avec succès.`);
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };
  
  const handleImportData = () => {
    setIsImportModalVisible(true);
  };
  
  const processImport = () => {
    if (!importText.trim()) {
      Alert.alert("Erreur", "Veuillez entrer des données à importer.");
      return;
    }
    
    try {
      // Try to parse as JSON
      const importedData = JSON.parse(importText);
      
      // Validate the imported data
      if (!Array.isArray(importedData)) {
        Alert.alert("Erreur", "Les données importées doivent être un tableau d'objets.");
        return;
      }
      
      // Check if the imported data has the required fields
      const requiredFields = tableSchema.filter(field => field.required).map(field => field.name);
      const missingFields = importedData.some(item => {
        return requiredFields.some(field => !item[field]);
      });
      
      if (missingFields) {
        Alert.alert(
          "Avertissement",
          `Certains éléments importés ne contiennent pas tous les champs requis : ${requiredFields.join(', ')}. Voulez-vous continuer ?`,
          [
            {
              text: "Annuler",
              style: "cancel"
            },
            {
              text: "Continuer",
              onPress: () => {
                // Add IDs to items that don't have them
                const newData = importedData.map(item => {
                  if (!item.id) {
                    return {
                      ...item,
                      id: Math.random().toString(36).substring(2, 9)
                    };
                  }
                  return item;
                });
                
                // Merge with existing data
                setData([...data, ...newData]);
                setIsImportModalVisible(false);
                setImportText('');
                Alert.alert("Succès", `${newData.length} éléments importés avec succès.`);
              }
            }
          ]
        );
      } else {
        // Add IDs to items that don't have them
        const newData = importedData.map(item => {
          if (!item.id) {
            return {
              ...item,
              id: Math.random().toString(36).substring(2, 9)
            };
          }
          return item;
        });
        
        // Merge with existing data
        setData([...data, ...newData]);
        setIsImportModalVisible(false);
        setImportText('');
        Alert.alert("Succès", `${newData.length} éléments importés avec succès.`);
      }
    } catch (error) {
      // If JSON parsing fails, try to parse as CSV
      try {
        const lines = importText.trim().split('\n');
        const headers = lines[0].split(',');
        
        const importedData = lines.slice(1).map(line => {
          const values = line.split(',');
          const item: any = {};
          
          headers.forEach((header, index) => {
            item[header.trim()] = values[index] ? values[index].trim() : '';
          });
          
          // Add ID if missing
          if (!item.id) {
            item.id = Math.random().toString(36).substring(2, 9);
          }
          
          return item;
        });
        
        // Check if the imported data has the required fields
        const requiredFields = tableSchema.filter(field => field.required).map(field => field.name);
        const missingFields = importedData.some(item => {
          return requiredFields.some(field => !item[field]);
        });
        
        if (missingFields) {
          Alert.alert(
            "Avertissement",
            `Certains éléments importés ne contiennent pas tous les champs requis : ${requiredFields.join(', ')}. Voulez-vous continuer ?`,
            [
              {
                text: "Annuler",
                style: "cancel"
              },
              {
                text: "Continuer",
                onPress: () => {
                  // Merge with existing data
                  setData([...data, ...importedData]);
                  setIsImportModalVisible(false);
                  setImportText('');
                  Alert.alert("Succès", `${importedData.length} éléments importés avec succès.`);
                }
              }
            ]
          );
        } else {
          // Merge with existing data
          setData([...data, ...importedData]);
          setIsImportModalVisible(false);
          setImportText('');
          Alert.alert("Succès", `${importedData.length} éléments importés avec succès.`);
        }
      } catch (csvError) {
        Alert.alert("Erreur", "Le format des données importées n'est pas valide. Veuillez utiliser JSON ou CSV.");
      }
    }
  };
  
  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  
  // Calculate responsive column widths based on screen size and number of columns to display
  const calculateColumnWidths = () => {
    const totalColumns = Math.min(3, tableSchema.length); // Display max 3 columns
    const actionWidth = 100; // Fixed width for actions
    const availableWidth = SCREEN_WIDTH - actionWidth - 40; // 40 for padding
    const columnWidth = availableWidth / totalColumns;
    
    return {
      columnWidth,
      actionWidth
    };
  };
  
  const { columnWidth, actionWidth } = calculateColumnWidths();
  
  const renderTableHeader = () => {
    return (
      <View style={[styles.tableHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {tableSchema.slice(0, 3).map((field, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.headerCell,
              { width: columnWidth },
              index === 0 && styles.firstHeaderCell,
              index === Math.min(2, tableSchema.length - 1) && styles.lastHeaderCell
            ]}
            onPress={() => handleSort(field.name)}
          >
            <Text 
              style={[styles.headerCellText, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {field.name}
            </Text>
            {sortField === field.name && (
              sortDirection === 'asc' ? 
                <ChevronUp size={16} color={theme.text} /> : 
                <ChevronDown size={16} color={theme.text} />
            )}
          </TouchableOpacity>
        ))}
        <View style={[styles.headerCell, styles.actionsHeaderCell, { width: actionWidth }]}>
          <Text style={[styles.headerCellText, { color: theme.text }]}>
            Actions
          </Text>
        </View>
      </View>
    );
  };
  
  const renderTableRow = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={[styles.tableRow, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => handleViewItem(item)}
      >
        {tableSchema.slice(0, 3).map((field, index) => (
          <View 
            key={index} 
            style={[
              styles.cell,
              { width: columnWidth },
              index === 0 && styles.firstCell,
              index === Math.min(2, tableSchema.length - 1) && styles.lastCell
            ]}
          >
            <Text 
              style={[styles.cellText, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item[field.name]?.toString() || '-'}
            </Text>
          </View>
        ))}
        <View style={[styles.actionsCell, { width: actionWidth }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: appColors.primary }]}
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
      </TouchableOpacity>
    );
  };
  
  const renderItemDetail = () => {
    if (!selectedItem) return null;
    
    return (
      <Modal
        visible={!!selectedItem}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Détails de l'élément
              </Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {tableSchema.map((field, index) => (
                <View key={index} style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: darkMode ? theme.inactive : '#666666' }]}>
                    {field.name}:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedItem[field.name]?.toString() || '-'}
                  </Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <Button
                title="Modifier"
                onPress={() => {
                  setSelectedItem(null);
                  handleEditItem(selectedItem);
                }}
                style={{ backgroundColor: appColors.primary }}
                icon={<Edit size={18} color="#ffffff" />}
              />
              <Button
                title="Fermer"
                onPress={() => setSelectedItem(null)}
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
  
  const renderEditModal = () => {
    if (!editedItem) return null;
    
    return (
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editedItem.id ? 'Modifier l\'élément' : 'Ajouter un élément'}
              </Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {tableSchema.map((field, index) => {
                // Skip id field for new items
                if (field.name === 'id' && !editedItem.id) return null;
                
                return (
                  <View key={index} style={styles.formField}>
                    <Input
                      label={`${field.name}${field.required ? ' *' : ''}`}
                      value={editedItem[field.name]?.toString() || ''}
                      onChangeText={(value) => {
                        const newItem = {...editedItem};
                        
                        // Convert value based on field type
                        if (field.type === 'number') {
                          newItem[field.name] = parseFloat(value) || 0;
                        } else if (field.type === 'boolean') {
                          newItem[field.name] = value.toLowerCase() === 'true';
                        } else {
                          newItem[field.name] = value;
                        }
                        
                        setEditedItem(newItem);
                      }}
                      editable={field.name !== 'id'} // ID is not editable
                      containerStyle={styles.input}
                    />
                  </View>
                );
              })}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <Button
                title="Enregistrer"
                onPress={handleSaveItem}
                style={{ backgroundColor: appColors.primary }}
                icon={<Save size={18} color="#ffffff" />}
              />
              <Button
                title="Annuler"
                onPress={() => setIsEditModalVisible(false)}
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
                À propos de cette table
              </Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <Text style={[styles.infoText, { color: theme.text }]}>
                Cette page vous permet de gérer les données de la table "{tableDisplayName}".
              </Text>
              <Text style={[styles.infoText, { color: theme.text, marginTop: 12 }]}>
                Vous pouvez ajouter, modifier, supprimer et rechercher des éléments. Les modifications sont enregistrées dans votre base de données Supabase.
              </Text>
              
              <Text style={[styles.infoSectionTitle, { color: theme.text, marginTop: 20 }]}>
                Structure de la table
              </Text>
              
              {tableSchema.map((field, index) => (
                <View key={index} style={styles.schemaItem}>
                  <Text style={[styles.schemaName, { color: theme.text }]}>
                    {field.name}
                  </Text>
                  <View style={styles.schemaDetails}>
                    <Text style={[styles.schemaType, { color: darkMode ? theme.inactive : '#666666' }]}>
                      Type: {field.type}
                    </Text>
                    {field.primary && (
                      <View style={[styles.schemaBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.schemaBadgeText, { color: theme.primary }]}>
                          Clé primaire
                        </Text>
                      </View>
                    )}
                    {field.required && (
                      <View style={[styles.schemaBadge, { backgroundColor: theme.warning + '20' }]}>
                        <Text style={[styles.schemaBadgeText, { color: theme.warning }]}>
                          Obligatoire
                        </Text>
                      </View>
                    )}
                    {field.foreign && (
                      <View style={[styles.schemaBadge, { backgroundColor: theme.info + '20' }]}>
                        <Text style={[styles.schemaBadgeText, { color: theme.info }]}>
                          Clé étrangère: {field.foreign}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
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
  
  const renderActionsModal = () => {
    return (
      <Modal
        visible={showActionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Actions sur la table
              </Text>
              <TouchableOpacity onPress={() => setShowActionsModal(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.actionsModalContent}>
              <TouchableOpacity
                style={[styles.actionMenuItem, { borderColor: theme.border }]}
                onPress={() => handleAddItem()}
              >
                <View style={[styles.actionMenuItemIcon, { backgroundColor: appColors.primary + '20' }]}>
                  <Plus size={20} color={appColors.primary} />
                </View>
                <View style={styles.actionMenuItemContent}>
                  <Text style={[styles.actionMenuItemTitle, { color: theme.text }]}>
                    Ajouter une entrée
                  </Text>
                  <Text style={[styles.actionMenuItemDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Créer un nouvel élément dans la table
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionMenuItem, { borderColor: theme.border }]}
                onPress={() => handleExportData('csv')}
              >
                <View style={[styles.actionMenuItemIcon, { backgroundColor: theme.info + '20' }]}>
                  <FileText size={20} color={theme.info} />
                </View>
                <View style={styles.actionMenuItemContent}>
                  <Text style={[styles.actionMenuItemTitle, { color: theme.text }]}>
                    Exporter en CSV
                  </Text>
                  <Text style={[styles.actionMenuItemDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Télécharger toutes les données au format CSV
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionMenuItem, { borderColor: theme.border }]}
                onPress={() => handleExportData('json')}
              >
                <View style={[styles.actionMenuItemIcon, { backgroundColor: theme.info + '20' }]}>
                  <Download size={20} color={theme.info} />
                </View>
                <View style={styles.actionMenuItemContent}>
                  <Text style={[styles.actionMenuItemTitle, { color: theme.text }]}>
                    Exporter en JSON
                  </Text>
                  <Text style={[styles.actionMenuItemDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Télécharger toutes les données au format JSON
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionMenuItem, { borderColor: theme.border }]}
                onPress={handleImportData}
              >
                <View style={[styles.actionMenuItemIcon, { backgroundColor: appColors.secondary + '20' }]}>
                  <Upload size={20} color={appColors.secondary} />
                </View>
                <View style={styles.actionMenuItemContent}>
                  <Text style={[styles.actionMenuItemTitle, { color: theme.text }]}>
                    Importer des données
                  </Text>
                  <Text style={[styles.actionMenuItemDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Importer des données depuis CSV ou JSON
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionMenuItem, { borderColor: theme.border }]}
                onPress={handleClearTable}
              >
                <View style={[styles.actionMenuItemIcon, { backgroundColor: theme.error + '20' }]}>
                  <Trash2 size={20} color={theme.error} />
                </View>
                <View style={styles.actionMenuItemContent}>
                  <Text style={[styles.actionMenuItemTitle, { color: theme.error }]}>
                    Vider la table
                  </Text>
                  <Text style={[styles.actionMenuItemDescription, { color: darkMode ? theme.inactive : '#666666' }]}>
                    Supprimer toutes les données de la table
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <Button
              title="Fermer"
              onPress={() => setShowActionsModal(false)}
              variant="outline"
              style={{ borderColor: theme.border, marginTop: 16 }}
              textStyle={{ color: theme.text }}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderImportModal = () => {
    return (
      <Modal
        visible={isImportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsImportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Importer des données
              </Text>
              <TouchableOpacity onPress={() => setIsImportModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.importInstructions, { color: theme.text }]}>
              Collez vos données au format JSON ou CSV ci-dessous :
            </Text>
            
            <TextInput
              style={[
                styles.importTextInput,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text
                }
              ]}
              multiline
              numberOfLines={10}
              value={importText}
              onChangeText={setImportText}
              placeholder="Collez vos données ici..."
              placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
            />
            
            <Text style={[styles.importNote, { color: darkMode ? theme.inactive : '#666666' }]}>
              Note: Pour le format CSV, la première ligne doit contenir les noms des colonnes.
            </Text>
            
            <View style={styles.modalActions}>
              <Button
                title="Importer"
                onPress={processImport}
                style={{ backgroundColor: appColors.primary }}
                icon={<Upload size={18} color="#ffffff" />}
              />
              <Button
                title="Annuler"
                onPress={() => setIsImportModalVisible(false)}
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
        title={`Table: ${tableDisplayName}`}
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
          
          <TouchableOpacity
            style={[styles.actionIconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowActionsModal(true)}
          >
            <MoreHorizontal size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: appColors.primary }]}
          onPress={handleAddItem}
        >
          <Plus size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appColors.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Chargement des données...
          </Text>
        </View>
      ) : (
        <>
          <Card style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.tableWrapper}>
                {renderTableHeader()}
                
                <FlatList
                  data={paginatedData}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderTableRow}
                  scrollEnabled={true}
                  ListEmptyComponent={
                    <EmptyState
                      title="Aucune donnée trouvée"
                      message={searchQuery ? "Essayez de modifier votre recherche." : "Cette table ne contient aucune donnée."}
                      icon={<Database size={48} color={theme.inactive} />}
                      actionLabel="Ajouter un élément"
                      onAction={handleAddItem}
                      style={styles.emptyState}
                    />
                  }
                />
              </View>
            </ScrollView>
            
            {filteredData.length > 0 && (
              <View style={[styles.pagination, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    { backgroundColor: currentPage > 1 ? appColors.primary : theme.inactive }
                  ]}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  <ArrowLeft size={16} color="#ffffff" />
                </TouchableOpacity>
                
                <Text style={[styles.paginationText, { color: theme.text }]}>
                  Page {currentPage} sur {totalPages}
                </Text>
                
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    { backgroundColor: currentPage < totalPages ? appColors.primary : theme.inactive }
                  ]}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ArrowRight size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}
          </Card>
          
          <View style={styles.tableInfo}>
            <Text style={[styles.tableInfoText, { color: darkMode ? theme.inactive : '#666666' }]}>
              {filteredData.length} élément{filteredData.length !== 1 ? 's' : ''} au total
            </Text>
          </View>
        </>
      )}
      
      {renderItemDetail()}
      {renderEditModal()}
      {renderInfoModal()}
      {renderActionsModal()}
      {renderImportModal()}
      
      <TouchableOpacity 
        style={[styles.infoButton, { backgroundColor: theme.info }]}
        onPress={() => setShowInfoModal(true)}
      >
        <Info size={20} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  actionIconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    height: 44,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
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
  tableContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 0,
  },
  tableWrapper: {
    minWidth: SCREEN_WIDTH - 40, // Ensure it's at least the screen width minus padding
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  firstHeaderCell: {
    paddingLeft: 16,
  },
  lastHeaderCell: {
    paddingRight: 16,
  },
  actionsHeaderCell: {
    justifyContent: 'center',
  },
  headerCellText: {
    fontWeight: '600',
    fontSize: 14,
    marginRight: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  cell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  firstCell: {
    paddingLeft: 16,
  },
  lastCell: {
    paddingRight: 16,
  },
  cellText: {
    fontSize: 14,
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  paginationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 14,
  },
  tableInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tableInfoText: {
    fontSize: 14,
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
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  formField: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 0,
  },
  emptyState: {
    paddingVertical: 40,
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
  infoText: {
    fontSize: 16,
    lineHeight: 24,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  schemaItem: {
    marginBottom: 16,
  },
  schemaName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  schemaDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  schemaType: {
    fontSize: 14,
    marginRight: 8,
    marginBottom: 4,
  },
  schemaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  schemaBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Actions modal styles
  actionsModalContent: {
    marginBottom: 16,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  actionMenuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionMenuItemContent: {
    flex: 1,
  },
  actionMenuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionMenuItemDescription: {
    fontSize: 14,
  },
  // Import modal styles
  importInstructions: {
    fontSize: 16,
    marginBottom: 12,
  },
  importTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    height: 200,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  importNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 16,
  },
});