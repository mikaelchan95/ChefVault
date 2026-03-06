import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/useTheme';
import { PressScale, PressSpring } from '@/src/constants/theme';

const HIDE_SPRING = { damping: 15, stiffness: 120 };

interface AnimatedFABProps {
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  scrollY: SharedValue<number>;
}

export function useScrollHandler() {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  return { scrollHandler, scrollY };
}

export function AnimatedFAB({ onPress, icon = 'add', scrollY }: AnimatedFABProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const prevScrollY = useSharedValue(0);
  const translateY = useSharedValue(0);

  useAnimatedReaction(
    () => scrollY.value,
    (current) => {
      const diff = current - prevScrollY.value;
      if (Math.abs(diff) > 15) {
        translateY.value = withSpring(diff > 0 && current > 50 ? 200 : 0, HIDE_SPRING);
        prevScrollY.value = current;
      }
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }, animatedStyle]}>
      <Pressable
        style={styles.pressable}
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(PressScale.button, PressSpring.button); }}
        onPressOut={() => { scale.value = withSpring(1, PressSpring.button); }}
      >
        <MaterialIcons name={icon} size={28} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  pressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
