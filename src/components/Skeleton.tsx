import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '@/src/hooks/useTheme';
import { BorderRadius, Spacing } from '@/src/constants/theme';

function usePulse() {
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
  }, []);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function SkeletonBlock({ style }: { style: object }) {
  const { colors } = useTheme();
  const pulseStyle = usePulse();
  return <Animated.View style={[{ backgroundColor: colors.field }, style, pulseStyle]} />;
}

export function RecipeCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[skeletonStyles.recipeCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <SkeletonBlock style={skeletonStyles.thumbnail} />
      <View style={skeletonStyles.lines}>
        <SkeletonBlock style={skeletonStyles.titleLine} />
        <SkeletonBlock style={skeletonStyles.metaLine} />
        <SkeletonBlock style={skeletonStyles.dateLine} />
      </View>
    </View>
  );
}

export function CollectionCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[skeletonStyles.collectionCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <SkeletonBlock style={skeletonStyles.coverArea} />
      <View style={skeletonStyles.collectionInfo}>
        <SkeletonBlock style={skeletonStyles.collectionName} />
        <SkeletonBlock style={skeletonStyles.collectionCount} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  recipeCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  titleLine: {
    height: 16,
    borderRadius: 4,
    width: '70%',
  },
  metaLine: {
    height: 12,
    borderRadius: 4,
    width: '50%',
  },
  dateLine: {
    height: 12,
    borderRadius: 4,
    width: '35%',
  },
  collectionCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  coverArea: {
    height: 110,
  },
  collectionInfo: {
    padding: Spacing.lg,
    gap: 8,
  },
  collectionName: {
    height: 16,
    borderRadius: 4,
    width: '60%',
  },
  collectionCount: {
    height: 12,
    borderRadius: 4,
    width: '30%',
  },
});
