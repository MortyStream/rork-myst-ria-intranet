import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  Image,
  ImageSourcePropType
} from 'react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';

interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 40,
  style,
  textStyle,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const getInitials = (name?: string): string => {
    if (!name) return '?';
    
    const parts = name.split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };
  
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: source ? 'transparent' : '#c22e0f', // Always use the red color for avatars
  };
  
  const fontSize = size * 0.4;
  
  return (
    <View style={[styles.container, avatarStyle, style]}>
      {source ? (
        <Image
          source={source}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <Text style={[
          styles.text,
          { fontSize, color: '#ffffff' },
          textStyle
        ]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    fontWeight: '600',
  },
});