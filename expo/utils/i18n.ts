import { useSettingsStore } from '@/store/settings-store';
import fr from '@/locales/fr';
import en from '@/locales/en';

export const useTranslation = () => {
  const { language } = useSettingsStore();
  
  const translations = {
    fr,
    en
  };
  
  const t = (key: string): string => {
    const currentTranslations = translations[language] || translations.fr;
    return currentTranslations[key] || key;
  };
  
  return { t, language };
};