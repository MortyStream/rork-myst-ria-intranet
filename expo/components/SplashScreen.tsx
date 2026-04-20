import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [loadingText, setLoadingText] = useState('Initialisation...');

  useEffect(() => {
    const loadingTexts = [
      'Initialisation...',
      'Chargement des données...',
      'Préparation de l\'application...',
      'Vérification de la session...',
      'Presque prêt...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep = (currentStep + 1) % loadingTexts.length;
      setLoadingText(loadingTexts[currentStep]);
    }, 1500);

    if (onFinish) {
      const timer = setTimeout(() => onFinish(), 2000);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Image 
          source={{ uri: 'https://i.imgur.com/JFHjdNr.jpg' }} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Mysteria</Text>
        <Text style={styles.subtitle}>Événements d'horreur</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      </View>
      <Text style={styles.version}>Version 1.0.0</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120, borderRadius: 60, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#e94560', marginBottom: 40 },
  loadingContainer: { alignItems: 'center', marginTop: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#ffffff', opacity: 0.8 },
  version: { position: 'absolute', bottom: 40, color: '#ffffff', opacity: 0.6, fontSize: 14 },
});

export default SplashScreen;
