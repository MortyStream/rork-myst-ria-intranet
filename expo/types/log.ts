/**
 * Represents a log entry in the system
 */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  userName?: string;
  details?: string;
  ip?: string;
}

/**
 * Log levels for different types of events
 */
export type LogLevel = 'info' | 'warning' | 'error';

/**
 * Categories for log entries
 */
export type LogCategory = 
  | 'auth'       // Authentication-related events
  | 'database'   // Database operations
  | 'user'       // User-related actions
  | 'settings'   // System settings changes
  | 'security'   // Security-related events
  | 'api'        // API calls and errors
  | 'system';    // General system events

/**
 * Interface for log filtering options
 */
export interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  userId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

/**
 * Interface for log export options
 */
export interface LogExportOptions {
  format: 'csv' | 'json' | 'txt';
  filters?: LogFilter;
}