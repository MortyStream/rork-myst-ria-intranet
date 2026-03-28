import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { SideBar } from './SideBar';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

interface AppLayoutProps {
  children: React.ReactNode;
  hideMenuButton?: boolean;
  onSidebarToggle?: (toggle: () => void) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  hideMenuButton = false,
  onSidebarToggle 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarAnimation = useRef(new Animated.Value(0)).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;
  
  // Close sidebar when route changes
  useEffect(() => {
    if (isSidebarOpen) {
      toggleSidebar();
    }
  }, [pathname]);
  
  const toggleSidebar = useCallback(() => {
    const toValue = isSidebarOpen ? 0 : 1;
    
    Animated.parallel([
      Animated.timing(sidebarAnimation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnimation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsSidebarOpen(!isSidebarOpen);
  }, [isSidebarOpen, sidebarAnimation, overlayAnimation]);

  // Expose toggleSidebar to parent
  useEffect(() => {
    if (onSidebarToggle) {
      onSidebarToggle(toggleSidebar);
    }
  }, [onSidebarToggle, toggleSidebar]);
  
  const sidebarTranslateX = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 0],
  });
  
  const overlayOpacity = overlayAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Main Content */}
      <View style={styles.content}>
        {children}
      </View>
      
      {/* Menu Button - Only show if hideMenuButton is false */}
      {!hideMenuButton && (
        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: theme.card }]}
          onPress={toggleSidebar}
        >
          <Menu size={24} color={theme.text} />
        </TouchableOpacity>
      )}
      
      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
            backgroundColor: 'black',
          },
          isSidebarOpen ? styles.overlayVisible : styles.overlayHidden,
        ]}
        pointerEvents={isSidebarOpen ? 'auto' : 'none'}
        onTouchStart={toggleSidebar}
      />
      
      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: sidebarTranslateX }],
            backgroundColor: theme.card,
          },
        ]}
      >
        <SideBar onClose={toggleSidebar} />
      </Animated.View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 100,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  overlayVisible: {
    width,
    height,
  },
  overlayHidden: {
    width: 0,
    height: 0,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    zIndex: 999,
  },
});