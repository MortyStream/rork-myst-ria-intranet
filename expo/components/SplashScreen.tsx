import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useSettingsStore } from '@/store/settings-store';
import { Colors, useAppColors } from '@/constants/colors';

const localLogo = require('../assets/images/logo.png');

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { darkMode, appName, logoType, logoText, logoImageUrl } = useSettingsStore();
  const appColors = useAppColors();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [loadingText, setLoadingText] = useState('Initialisation...');

  useEffect(() => {
    const loadingTexts = [
      'Initialisation...',
      'Chargement des données...',
      'Vérification de la session...',
      'Presque prêt...',
    ];
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep = (currentStep + 1) % loadingTexts.length;
      setLoadingText(loadingTexts[currentStep]);
    }, 800);

    if (onFinish) {
      const timer = setTimeout(() => onFinish(), 2000);
      return () => { clearInterval(interval); clearTimeout(timer); };
    }
    return () => clearInterval(interval);
  }, [onFinish]);

  const logoSource = (logoType === 'image' && logoImageUrl)
    ? { uri: logoImageUrl }
    : localLogo;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Logo */}
        {logoSource ? (
          <Image
            source={logoSource}
            style={[
              styles.logoImage,
              // Si fond sombre + logo blanc : pas de tint. Sinon inverser.
              darkMode ? styles.logoOnDark : styles.logoOnLight,
            ]}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.logoTextContainer, { borderColor: appColors.primary }]}>
            <Text style={[styles.logoTextFallback, { color: appColors.primary }]}>
              {(logoText || appName || 'M').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Spinner */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appColors.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>{loadingText}</Text>
        </View>
      </View>

      <Text style={[styles.version, { color: theme.inactive }]}>Version 1.0.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoImage: {
    width: 260,
    height: 100,
    marginBottom: 32,
  },
  logoOnDark: {
    // Logo blanc sur fond sombre — pas de tint needed
  },
  logoOnLight: {
    // Logo blanc sur fond clair — on le teinte en sombre
    tintColor: '#1a1a1a',
  },
  logoTextContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoTextFallback: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    opacity: 0.7,
  },
  version: {
    position: 'absolute',
    bottom: 40,
    fontSize: 13,
  },
});

export default SplashScreen;
