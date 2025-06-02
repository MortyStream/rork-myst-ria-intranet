import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Picker as RNPicker } from '@react-native-picker/picker';
import { Colors } from '@/constants/colors';
import { useSettingsStore } from '@/store/settings-store';

interface PickerItem {
  label: string;
  value: string;
}

interface PickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: PickerItem[];
  style?: any;
  textStyle?: any;
  itemStyle?: any;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const Picker: React.FC<PickerProps> = ({
  selectedValue,
  onValueChange,
  items,
  style,
  textStyle,
  itemStyle,
  label,
  placeholder,
  disabled = false,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.text }]}>
          {label}
        </Text>
      )}
      <View style={[styles.pickerContainer, style]}>
        <RNPicker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          enabled={!disabled}
          style={[styles.picker, textStyle]}
          itemStyle={[
            styles.pickerItem, 
            { color: Platform.OS === 'ios' ? (darkMode ? '#ffffff' : '#000000') : theme.text },
            itemStyle
          ]}
          dropdownIconColor={theme.text}
        >
          {placeholder && (
            <RNPicker.Item 
              label={placeholder} 
              value="" 
              color={Platform.OS === 'ios' ? (darkMode ? '#ffffff' : '#000000') : theme.inactive}
            />
          )}
          {items.map((item) => (
            <RNPicker.Item 
              key={item.value} 
              label={item.label} 
              value={item.value}
              color={Platform.OS === 'ios' ? (darkMode ? '#ffffff' : '#000000') : theme.text}
            />
          ))}
        </RNPicker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
  },
  pickerItem: {
    fontSize: 16,
  },
});