import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  darkMode: boolean;
  persistLogin: boolean;
  language: 'fr' | 'en';

  // True une fois que l'utilisateur a passé l'onboarding du premier launch.
  hasSeenOnboarding: boolean;

  // App appearance customization
  appName: string;
  primaryColor: string;
  welcomeMessage: string;
  logoType: 'text' | 'image';
  logoText: string;
  logoImageUrl: string;

  // Supabase configuration
  supabaseUrl: string;
  supabaseKey: string;
}

interface SettingsStore extends SettingsState {
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  togglePersistLogin: () => void;
  setPersistLogin: (enabled: boolean) => void;
  setLanguage: (language: 'fr' | 'en') => void;
  markOnboardingSeen: () => void;
  
  // App appearance actions
  setAppName: (name: string) => void;
  setPrimaryColor: (color: string) => void;
  setWelcomeMessage: (message: string) => void;
  setLogoType: (type: 'text' | 'image') => void;
  setLogoText: (text: string) => void;
  setLogoImageUrl: (url: string) => void;
  resetAppearance: () => void;
  
  // Supabase configuration actions
  setSupabaseUrl: (url: string) => void;
  setSupabaseKey: (key: string) => void;
  resetSupabaseConfig: () => void;
}

// Default appearance settings
const DEFAULT_APP_NAME = "Mystéria Event";
const DEFAULT_PRIMARY_COLOR = "#c22e0f";
// Vide par défaut : le home masque la carte tant qu'un admin n'a pas écrit une vraie annonce.
const DEFAULT_WELCOME_MESSAGE = "";
// Message historique à considérer comme vide (migration douce pour les installations existantes).
export const LEGACY_WELCOME_MESSAGE = "Bienvenue sur l'intranet Mystéria Event";
const DEFAULT_LOGO_TYPE = "text";
const DEFAULT_LOGO_TEXT = "M";
const DEFAULT_LOGO_IMAGE_URL = "";

// Default Supabase configuration
const DEFAULT_SUPABASE_URL = "https://gwxyspmmczqqqrgmpmcf.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eHlzcG1tY3pxcXFyZ21wbWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzI2NzUsImV4cCI6MjA1Njg0ODY3NX0.0_r_O3qB5l3BB8dwxyL_GnH5ZXlsaQvnK2cAvXoQiBc";

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      darkMode: true,
      persistLogin: true,
      language: 'fr',
      hasSeenOnboarding: false,
      
      // Default appearance settings
      appName: DEFAULT_APP_NAME,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      welcomeMessage: DEFAULT_WELCOME_MESSAGE,
      logoType: DEFAULT_LOGO_TYPE as 'text' | 'image',
      logoText: DEFAULT_LOGO_TEXT,
      logoImageUrl: DEFAULT_LOGO_IMAGE_URL,
      
      // Default Supabase configuration
      supabaseUrl: DEFAULT_SUPABASE_URL,
      supabaseKey: DEFAULT_SUPABASE_KEY,
      
      toggleDarkMode: () => {
        set(state => ({ darkMode: !state.darkMode }));
      },
      
      setDarkMode: (enabled) => {
        set({ darkMode: enabled });
      },
      
      togglePersistLogin: () => {
        set(state => ({ persistLogin: !state.persistLogin }));
      },
      
      setPersistLogin: (enabled) => {
        set({ persistLogin: enabled });
      },
      
      setLanguage: (language) => {
        set({ language });
      },

      markOnboardingSeen: () => {
        set({ hasSeenOnboarding: true });
      },
      
      // App appearance actions
      setAppName: (name) => {
        set({ appName: name });
      },
      
      setPrimaryColor: (color) => {
        set({ primaryColor: color });
      },
      
      setWelcomeMessage: (message) => {
        set({ welcomeMessage: message });
      },
      
      setLogoType: (type) => {
        set({ logoType: type });
      },
      
      setLogoText: (text) => {
        set({ logoText: text });
      },
      
      setLogoImageUrl: (url) => {
        set({ logoImageUrl: url });
      },
      
      resetAppearance: () => {
        set({
          appName: DEFAULT_APP_NAME,
          primaryColor: DEFAULT_PRIMARY_COLOR,
          welcomeMessage: DEFAULT_WELCOME_MESSAGE,
          logoType: DEFAULT_LOGO_TYPE as 'text' | 'image',
          logoText: DEFAULT_LOGO_TEXT,
          logoImageUrl: DEFAULT_LOGO_IMAGE_URL,
        });
      },
      
      // Supabase configuration actions
      setSupabaseUrl: (url) => {
        set({ supabaseUrl: url });
      },
      
      setSupabaseKey: (key) => {
        set({ supabaseKey: key });
      },
      
      resetSupabaseConfig: () => {
        set({
          supabaseUrl: DEFAULT_SUPABASE_URL,
          supabaseKey: DEFAULT_SUPABASE_KEY,
        });
      }
    }),
    {
      name: 'mysteria-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);