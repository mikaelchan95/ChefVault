import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/useTheme';

const SPRING_CONFIG = { damping: 15, stiffness: 120 };

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
  const isHidden = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    const diff = scrollY.value - prevScrollY.value;
    if (Math.abs(diff) > 5) {
      isHidden.value = diff > 0 && scrollY.value > 50;
      prevScrollY.value = scrollY.value;
    }

    return {
      transform: [
        { translateY: withSpring(isHidden.value ? 200 : 0, SPRING_CONFIG) },
        { scale: scale.value },
      ],
    };
  });

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }, animatedStyle]}>
      <Pressable
        style={styles.pressable}
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.92, SPRING_CONFIG); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG); }}
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
