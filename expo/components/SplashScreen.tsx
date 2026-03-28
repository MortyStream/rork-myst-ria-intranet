import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'expo-router';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [loadingText, setLoadingText] = useState('Initialisation...');
  const [loadingStep, setLoadingStep] = useState(0);
  const { initializeAuth, refreshUserData, user } = useAuthStore();
  const router = useRouter();

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
      setLoadingStep(currentStep);
    }, 1500);

    const initialize = async () => {
      try {
        // Initialize auth system
        await initializeAuth();
        
        // If user exists, refresh their data to ensure we have the latest role
        if (user) {
          console.log('User exists, refreshing data...');
          await refreshUserData();
        }
        
        // Wait a bit to show the splash screen
        setTimeout(() => {
          if (onFinish) {
            onFinish();
          }
        }, 2000);
      } catch (error) {
        console.error('Error during initialization:', error);
        // Still finish the splash screen even on error
        if (onFinish) {
          onFinish();
        }
      }
    };

    initialize();

    return () => {
      clearInterval(interval);
    };
  }, [initializeAuth, refreshUserData, user, onFinish]);

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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#e94560',
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
  },
  version: {
    position: 'absolute',
    bottom: 40,
    color: '#ffffff',
    opacity: 0.6,
    fontSize: 14,
  },
});

export default SplashScreen;