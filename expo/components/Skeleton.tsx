import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

interface SkeletonProps {
  /** Largeur fixe en px ou en %. Défaut '100%'. */
  width?: number | string;
  /** Hauteur fixe en px. Défaut 14. */
  height?: number;
  /** Border radius. Défaut 6. */
  borderRadius?: number;
  /** Style additionnel (margin, etc.). */
  style?: ViewStyle;
}

/**
 * Rectangle gris animé (pulsation opacity 0.3 → 0.7) qui sert de placeholder
 * pendant le chargement. À composer pour reproduire la forme du contenu à venir
 * (ex. un TaskItemSkeleton compose plusieurs Skeleton pour titre + description + meta).
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 14,
  borderRadius = 6,
  style,
}) => {
  const { darkMode } = useSettingsStore();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: darkMode ? '#3a3a3a' : '#e6e6e6',
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Reproduit la forme d'un TaskItem (card avec checkbox + titre + description
 * + meta row). Utilisé dans la page tâches pendant le 1er chargement.
 */
export const TaskItemSkeleton: React.FC = () => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  return (
    <View style={[skeletonStyles.taskCard, { backgroundColor: theme.card, borderLeftColor: theme.border }]}>
      <View style={skeletonStyles.taskHeader}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <View style={skeletonStyles.taskHeaderRight}>
          <Skeleton width="65%" height={16} />
          <Skeleton width={70} height={20} borderRadius={10} />
        </View>
      </View>
      <View style={skeletonStyles.taskBody}>
        <Skeleton width="100%" height={12} />
        <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
      </View>
      <View style={skeletonStyles.taskFooter}>
        <Skeleton width={60} height={10} />
        <Skeleton width={80} height={10} />
        <Skeleton width={70} height={10} />
      </View>
    </View>
  );
};

/**
 * Reproduit la forme d'une catégorie de La Bible (header avec icône + nom +
 * description + flèche). Utilisé dans resources.tsx.
 */
export const CategoryRowSkeleton: React.FC = () => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  return (
    <View style={[skeletonStyles.categoryRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Skeleton width={36} height={36} borderRadius={8} />
      <View style={skeletonStyles.categoryContent}>
        <Skeleton width="55%" height={15} />
        <Skeleton width="85%" height={11} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={16} height={16} borderRadius={8} />
    </View>
  );
};

/**
 * Reproduit la forme d'une row d'annuaire (avatar + nom + email + role badge).
 */
export const UserRowSkeleton: React.FC = () => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  return (
    <View style={[skeletonStyles.userRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={skeletonStyles.userContent}>
        <Skeleton width="60%" height={15} />
        <Skeleton width="80%" height={11} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={56} height={20} borderRadius={10} />
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  // Task
  taskCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  taskHeaderRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskBody: {
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    gap: 14,
  },
  // Category
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    marginHorizontal: 16,
    gap: 12,
  },
  categoryContent: {
    flex: 1,
  },
  // User
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  userContent: {
    flex: 1,
  },
});
