import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  TextInputProps,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: ViewStyle;
  style?: ViewStyle;
  errorStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  labelStyle,
  inputStyle,
  style,
  errorStyle,
  leftIcon,
  rightIcon,
  secureTextEntry,
  showPasswordToggle = false,
  ...rest
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[
          styles.label, 
          { color: theme.text }, 
          labelStyle
        ]}>
          {label}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer, 
        { 
          borderColor: error ? theme.error : theme.border,
          backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
        },
        inputStyle
      ]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            { color: theme.text },
            leftIcon && { paddingLeft: 0 },
            (rightIcon || (secureTextEntry && showPasswordToggle)) && { paddingRight: 0 },
            style
          ]}
          placeholderTextColor={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...rest}
        />
        
        {secureTextEntry && showPasswordToggle && (
          <TouchableOpacity 
            style={styles.iconContainer} 
            onPress={togglePasswordVisibility}
            activeOpacity={0.7}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color={theme.text} />
            ) : (
              <Eye size={20} color={theme.text} />
            )}
          </TouchableOpacity>
        )}
        
        {rightIcon && !showPasswordToggle && (
          <View style={styles.iconContainer}>{rightIcon}</View>
        )}
      </View>
      
      {error && (
        <Text style={[
          styles.error, 
          { color: theme.error },
          errorStyle
        ]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  iconContainer: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    marginTop: 4,
    fontSize: 12,
  },
});