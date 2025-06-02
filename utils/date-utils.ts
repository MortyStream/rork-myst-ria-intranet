import { format, formatDistance, isAfter, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format a date to a readable string
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: fr });
};

// Format a date to a readable string with time
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy à HH:mm', { locale: fr });
};

// Format a date to a relative string (e.g. "il y a 2 jours")
export const formatRelativeDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: fr });
};

// Check if a date is after another date
export const isDateAfter = (date: Date | string, compareDate: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const compareDateObj = typeof compareDate === 'string' ? new Date(compareDate) : compareDate;
  return isAfter(dateObj, compareDateObj);
};

// Get the status color based on the last sign-in date
export const getUserStatusColor = (lastSignIn: string | undefined | null): 'success' | 'warning' | 'error' | 'inactive' => {
  if (!lastSignIn) {
    return 'inactive';
  }
  
  const lastSignInDate = parseISO(lastSignIn);
  const now = new Date();
  const twoDaysAgo = subDays(now, 2);
  const sevenDaysAgo = subDays(now, 7);
  
  if (isAfter(lastSignInDate, twoDaysAgo)) {
    return 'success'; // Active - less than 2 days
  } else if (isAfter(lastSignInDate, sevenDaysAgo)) {
    return 'warning'; // Semi-active - less than 7 days
  } else {
    return 'error'; // Inactive - more than 7 days
  }
};

// Format a date for API requests (ISO format)
export const formatDateForApi = (date: Date): string => {
  return date.toISOString();
};

// Parse a date string from the API
export const parseDateFromApi = (dateString: string): Date => {
  return parseISO(dateString);
};

// Get the current date at midnight
export const getCurrentDateAtMidnight = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

// Get the date X days from now
export const getDateDaysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Format a time (hours and minutes)
export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'HH:mm', { locale: fr });
};

// Get the day of the week
export const getDayOfWeek = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'EEEE', { locale: fr });
};

// Get the month name
export const getMonthName = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMMM', { locale: fr });
};

// Format a date for display in a calendar
export const formatCalendarDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'EEEE d MMMM', { locale: fr });
};