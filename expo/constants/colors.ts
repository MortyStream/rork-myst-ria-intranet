import { useSettingsStore } from '@/store/settings-store';

// Function to adjust color brightness
export const adjustBrightness = (color: string, amount: number): string => {
  // Remove the # if it exists
  color = color.replace('#', '');
  
  // Parse the color
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Adjust brightness
  const newR = Math.max(0, Math.min(255, r + amount));
  const newG = Math.max(0, Math.min(255, g + amount));
  const newB = Math.max(0, Math.min(255, b + amount));
  
  // Convert back to hex
  return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
};

// Function to get dynamic colors based on primary color
export const getDynamicColors = (primaryColor: string) => {
  // Generate lighter and darker variants
  const primaryLight = adjustBrightness(primaryColor, 30);
  const primaryDark = adjustBrightness(primaryColor, -30);
  
  return {
    light: {
      primary: primaryColor,
      primaryLight: primaryLight,
      primaryDark: primaryDark,
      secondary: '#4c6ef5',
      background: '#f8f9fa',
      card: '#ffffff',
      text: '#212529',
      border: '#e9ecef',
      notification: '#fa5252',
      inactive: '#adb5bd',
      success: '#37b24d',
      warning: '#f59f00',
      info: '#1c7ed6',
      error: '#e03131',
    },
    dark: {
      primary: primaryColor,
      primaryLight: primaryLight,
      primaryDark: primaryDark,
      secondary: '#5c7cfa',
      background: '#121212',
      card: '#1e1e1e',
      text: '#f8f9fa',
      border: '#343a40',
      notification: '#ff6b6b',
      inactive: '#868e96',
      success: '#40c057',
      warning: '#fcc419',
      info: '#339af0',
      error: '#fa5252',
    }
  };
};

// Export the colors object
export const Colors = {
  light: {
    primary: '#c22e0f',
    primaryLight: '#e05a3f',
    primaryDark: '#9c2500',
    secondary: '#4c6ef5',
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#212529',
    border: '#e9ecef',
    notification: '#fa5252',
    inactive: '#adb5bd',
    success: '#37b24d',
    warning: '#f59f00',
    info: '#1c7ed6',
    error: '#e03131',
  },
  dark: {
    primary: '#c22e0f',
    primaryLight: '#e05a3f',
    primaryDark: '#9c2500',
    secondary: '#5c7cfa',
    background: '#121212',
    card: '#1e1e1e',
    text: '#f8f9fa',
    border: '#343a40',
    notification: '#ff6b6b',
    inactive: '#868e96',
    success: '#40c057',
    warning: '#fcc419',
    info: '#339af0',
    error: '#fa5252',
  }
};

// Hook to get dynamic colors based on settings
export const useAppColors = () => {
  const { darkMode, primaryColor } = useSettingsStore();
  const dynamicColors = getDynamicColors(primaryColor);
  
  return darkMode ? dynamicColors.dark : dynamicColors.light;
};