import { getSupabase } from './supabase';
import { useAuthStore } from '@/store/auth-store';

export interface LogAction {
  level: 'info' | 'warning' | 'error';
  category: string;
  message: string;
  details?: string;
  ip?: string;
}

/**
 * Logs an action to the database
 * @param action The action to log
 * @returns Promise<boolean> indicating success or failure
 */
export const logAction = async (action: LogAction): Promise<boolean> => {
  try {
    // Get the current user
    const currentUser = useAuthStore.getState().user;
    
    if (!currentUser) {
      console.warn('No user found when trying to log action');
      return false;
    }
    
    // Create the log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: action.level,
      category: action.category,
      message: action.message,
      details: action.details,
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      ip: action.ip || '127.0.0.1', // Default IP if not provided
    };
    
    // In a real implementation, we would insert this into the database
    // For now, we'll just log it to the console
    console.log('LOG ACTION:', logEntry);
    
    // Get Supabase client
    const supabase = getSupabase();
    
    // Insert the log entry into the logs table
    const { error } = await supabase
      .from('logs')
      .insert([logEntry]);
    
    if (error) {
      console.error('Error logging action:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error logging action:', error);
    return false;
  }
};

/**
 * Logs an info action
 * @param category The category of the action
 * @param message The message to log
 * @param details Optional details about the action
 * @returns Promise<boolean> indicating success or failure
 */
export const logInfo = async (
  category: string,
  message: string,
  details?: string
): Promise<boolean> => {
  return await logAction({
    level: 'info',
    category,
    message,
    details,
  });
};

/**
 * Logs a warning action
 * @param category The category of the action
 * @param message The message to log
 * @param details Optional details about the action
 * @returns Promise<boolean> indicating success or failure
 */
export const logWarning = async (
  category: string,
  message: string,
  details?: string
): Promise<boolean> => {
  return await logAction({
    level: 'warning',
    category,
    message,
    details,
  });
};

/**
 * Logs an error action
 * @param category The category of the action
 * @param message The message to log
 * @param details Optional details about the action
 * @returns Promise<boolean> indicating success or failure
 */
export const logError = async (
  category: string,
  message: string,
  details?: string
): Promise<boolean> => {
  return await logAction({
    level: 'error',
    category,
    message,
    details,
  });
};

/**
 * Logs a database action
 * @param action The type of action (create, update, delete)
 * @param table The table being affected
 * @param recordName The name or identifier of the record
 * @param details Optional details about the action
 * @returns Promise<boolean> indicating success or failure
 */
export const logDatabaseAction = async (
  action: 'create' | 'update' | 'delete',
  table: string,
  recordName: string,
  details?: string
): Promise<boolean> => {
  const actionMessages = {
    create: `Création d'un enregistrement dans la table "${table}"`,
    update: `Mise à jour d'un enregistrement dans la table "${table}"`,
    delete: `Suppression d'un enregistrement dans la table "${table}"`,
  };
  
  return await logInfo(
    'database',
    `${actionMessages[action]}: ${recordName}`,
    details
  );
};

/**
 * Logs a user action
 * @param action The type of action (login, logout, register, update, delete)
 * @param userEmail The email of the user
 * @param details Optional details about the action
 * @returns Promise<boolean> indicating success or failure
 */
export const logUserAction = async (
  action: 'login' | 'logout' | 'register' | 'update' | 'delete',
  userEmail: string,
  details?: string
): Promise<boolean> => {
  const actionMessages = {
    login: 'Connexion',
    logout: 'Déconnexion',
    register: 'Inscription',
    update: 'Mise à jour du profil',
    delete: 'Suppression du compte',
  };
  
  return await logInfo(
    'auth',
    `${actionMessages[action]}: ${userEmail}`,
    details
  );
};

/**
 * Logs a security action
 * @param action The type of action (access_denied, permission_change, role_change)
 * @param resource The resource being accessed
 * @param details Optional details about the action
 * @returns Promise<boolean> indicating success or failure
 */
export const logSecurityAction = async (
  action: 'access_denied' | 'permission_change' | 'role_change',
  resource: string,
  details?: string
): Promise<boolean> => {
  const actionMessages = {
    access_denied: `Accès refusé à la ressource "${resource}"`,
    permission_change: `Modification des permissions pour "${resource}"`,
    role_change: `Modification du rôle pour "${resource}"`,
  };
  
  return await logWarning(
    'security',
    actionMessages[action],
    details
  );
};

/**
 * Logs a system action
 * @param action The type of action (settings_change, backup, restore)
 * @param details Optional details about the action
 * @returns Promise<boolean> indicating success or failure
 */
export const logSystemAction = async (
  action: 'settings_change' | 'backup' | 'restore',
  details?: string
): Promise<boolean> => {
  const actionMessages = {
    settings_change: 'Modification des paramètres système',
    backup: 'Sauvegarde de la base de données',
    restore: 'Restauration de la base de données',
  };
  
  return await logInfo(
    'settings',
    actionMessages[action],
    details
  );
};

/**
 * Logs an API error
 * @param endpoint The API endpoint
 * @param errorMessage The error message
 * @param details Optional details about the error
 * @returns Promise<boolean> indicating success or failure
 */
export const logApiError = async (
  endpoint: string,
  errorMessage: string,
  details?: string
): Promise<boolean> => {
  return await logError(
    'api',
    `Erreur API sur ${endpoint}: ${errorMessage}`,
    details
  );
};