import React, { useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5; // doit rester impair pour avoir une rangée centrale unique
const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2);

interface WheelPickerProps {
  /** Liste des labels affichés (déjà formatés, ex: '00', '01', ..., '23'). */
  values: string[];
  /** Index actuellement sélectionné (rangée centrale du wheel). */
  selectedIndex: number;
  onChange: (index: number) => void;
  /** Largeur fixe du wheel (par défaut 80px). */
  width?: number;
}

/**
 * Wheel picker vertical (scroll snap-to-item) façon iOS, thémé dark/light.
 * Utilisé par TimePickerModal pour sélectionner heures + minutes.
 *
 * Le scroll snap automatiquement sur la rangée la plus proche (snapToInterval).
 * onChange est appelé après momentum-scroll-end avec l'index final.
 * Tap direct sur une rangée scroll vers elle.
 */
export const WheelPicker: React.FC<WheelPickerProps> = ({
  values,
  selectedIndex,
  onChange,
  width = 80,
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const scrollRef = useRef<ScrollView>(null);
  // Tracker pour distinguer un changement de prop interne (notre commit après
  // scroll) d'un changement externe (parent qui re-positionne, ex: ouverture
  // du modal). Init à -1 pour forcer le scroll initial au mount.
  const lastIdxRef = useRef<number>(-1);

  useEffect(() => {
    if (selectedIndex === lastIdxRef.current) return;
    // Délai minimal pour laisser ScrollView faire son layout — sinon scrollTo
    // est ignoré sur Android au 1er render.
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: lastIdxRef.current !== -1,
      });
      lastIdxRef.current = selectedIndex;
    }, 0);
    return () => clearTimeout(t);
  }, [selectedIndex]);

  const handleMomentumEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const idx = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    lastIdxRef.current = clamped;
    if (clamped !== selectedIndex) onChange(clamped);
  };

  const handleTap = (idx: number) => {
    scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
    lastIdxRef.current = idx;
    if (idx !== selectedIndex) onChange(idx);
  };

  return (
    <View style={[styles.container, { width, height: ITEM_HEIGHT * VISIBLE_COUNT }]}>
      {/* Bandeau de surlignage centré sur la rangée sélectionnée */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            top: PADDING,
            backgroundColor: `${theme.primary}15`,
            borderTopColor: theme.border,
            borderBottomColor: theme.border,
          },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: PADDING }}
      >
        {values.map((v, i) => {
          const isSelected = i === selectedIndex;
          return (
            <TouchableOpacity
              key={i}
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => handleTap(i)}
            >
              <Text
                style={[
                  styles.text,
                  {
                    color: theme.text,
                    fontWeight: isSelected ? '700' : '400',
                    opacity: isSelected ? 1 : 0.4,
                  },
                ]}
              >
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 22,
  },
});
