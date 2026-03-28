import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogEntry, LogFilter, LogExportOptions } from '@/types/log';
import { getSupabase } from '@/utils/supabase';

interface LogsState {
  logs: LogEntry[];
  isLoading: boolean;
  error: string | null;
}

interface LogsStore extends LogsState {
  // Fetch operations
  fetchLogs: (filter?: LogFilter) => Promise<LogEntry[]>;
  refreshLogs: () => Promise<void>;
  
  // Export operations
  exportLogs: (options: LogExportOptions) => Promise<string | null>;
  
  // Clear operations
  clearLogs: (olderThan?: Date) => Promise<boolean>;
  
  // Filter helpers
  getLogsByLevel: (level: LogEntry['level']) => LogEntry[];
  getLogsByCategory: (category: LogEntry['category']) => LogEntry[];
  getLogsByUser: (userId: string) => LogEntry[];
  getLogsByDateRange: (startDate: Date, endDate: Date) => LogEntry[];
  searchLogs: (query: string) => LogEntry[];
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

export const useLogsStore = create<LogsStore>()(
  persist(
    (set, get) => ({
      logs: [],
      isLoading: false,
      error: null,
      
      fetchLogs: async (filter) => {
        set({ isLoading: true, error: null });
        
        try {
          // In a real implementation, we would fetch logs from Supabase
          // For now, we'll just use mock data
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          let filteredLogs = [...MOCK_LOGS];
          
          // Apply filters if provided
          if (filter) {
            if (filter.level) {
              filteredLogs = filteredLogs.filter(log => log.level === filter.level);
            }
            
            if (filter.category) {
              filteredLogs = filteredLogs.filter(log => log.category === filter.category);
            }
            
            if (filter.userId) {
              filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
            }
            
            if (filter.startDate) {
              const startDate = new Date(filter.startDate);
              filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startDate);
            }
            
            if (filter.endDate) {
              const endDate = new Date(filter.endDate);
              filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endDate);
            }
            
            if (filter.searchQuery) {
              const query = filter.searchQuery.toLowerCase();
              filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(query) ||
                (log.details && log.details.toLowerCase().includes(query)) ||
                (log.userName && log.userName.toLowerCase().includes(query))
              );
            }
          }
          
          // Sort logs by timestamp (newest first)
          filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          set({ logs: filteredLogs, isLoading: false });
          return filteredLogs;
        } catch (error: any) {
          console.error('Error fetching logs:', error);
          set({ isLoading: false, error: error.message || 'Failed to fetch logs' });
          return [];
        }
      },
      
      refreshLogs: async () => {
        await get().fetchLogs();
      },
      
      exportLogs: async (options) => {
        try {
          // Get logs with any filters applied
          const logsToExport = options.filters 
            ? await get().fetchLogs(options.filters)
            : get().logs;
          
          if (logsToExport.length === 0) {
            return null;
          }
          
          // Format logs based on the requested format
          switch (options.format) {
            case 'csv':
              return exportToCSV(logsToExport);
            case 'json':
              return JSON.stringify(logsToExport, null, 2);
            case 'txt':
              return exportToTXT(logsToExport);
            default:
              return null;
          }
        } catch (error: any) {
          console.error('Error exporting logs:', error);
          set({ error: error.message || 'Failed to export logs' });
          return null;
        }
      },
      
      clearLogs: async (olderThan) => {
        try {
          // In a real implementation, we would delete logs from Supabase
          // For now, we'll just simulate it
          
          if (olderThan) {
            // Delete logs older than the specified date
            const filteredLogs = get().logs.filter(log => 
              new Date(log.timestamp) >= olderThan
            );
            set({ logs: filteredLogs });
          } else {
            // Delete all logs
            set({ logs: [] });
          }
          
          return true;
        } catch (error: any) {
          console.error('Error clearing logs:', error);
          set({ error: error.message || 'Failed to clear logs' });
          return false;
        }
      },
      
      getLogsByLevel: (level) => {
        return get().logs.filter(log => log.level === level);
      },
      
      getLogsByCategory: (category) => {
        return get().logs.filter(log => log.category === category);
      },
      
      getLogsByUser: (userId) => {
        return get().logs.filter(log => log.userId === userId);
      },
      
      getLogsByDateRange: (startDate, endDate) => {
        return get().logs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= startDate && logDate <= endDate;
        });
      },
      
      searchLogs: (query) => {
        const searchQuery = query.toLowerCase();
        return get().logs.filter(log => 
          log.message.toLowerCase().includes(searchQuery) ||
          (log.details && log.details.toLowerCase().includes(searchQuery)) ||
          (log.userName && log.userName.toLowerCase().includes(searchQuery))
        );
      },
    }),
    {
      name: 'mysteria-logs-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Don't persist logs to avoid storage issues
        // Only persist settings or filters if needed
      }),
    }
  )
);

// Helper function to export logs to CSV format
const exportToCSV = (logs: LogEntry[]): string => {
  // Define CSV headers
  const headers = [
    'ID',
    'Timestamp',
    'Level',
    'Category',
    'Message',
    'User ID',
    'User Name',
    'Details',
    'IP'
  ].join(',');
  
  // Convert each log to a CSV row
  const rows = logs.map(log => {
    return [
      log.id,
      log.timestamp,
      log.level,
      log.category,
      `"${log.message.replace(/"/g, '""')}"`, // Escape quotes in CSV
      log.userId || '',
      log.userName ? `"${log.userName.replace(/"/g, '""')}"` : '',
      log.details ? `"${log.details.replace(/"/g, '""')}"` : '',
      log.ip || ''
    ].join(',');
  });
  
  // Combine headers and rows
  return [headers, ...rows].join('\n');
};

// Helper function to export logs to TXT format
const exportToTXT = (logs: LogEntry[]): string => {
  return logs.map(log => {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const level = log.level.toUpperCase();
    const user = log.userName || log.userId || 'Unknown';
    
    let txt = `[${timestamp}] ${level} - ${log.category.toUpperCase()} - ${log.message}`;
    
    if (log.details) {
      txt += `\n  Details: ${log.details}`;
    }
    
    txt += `\n  User: ${user}`;
    
    if (log.ip) {
      txt += ` (IP: ${log.ip})`;
    }
    
    return txt;
  }).join('\n\n');
};