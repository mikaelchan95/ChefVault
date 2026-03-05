import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/hooks/useTheme';

interface AnimatedToggleProps {
  value: boolean;
  onToggle: (val: boolean) => void;
  trackColorOff?: string;
  trackColorOn?: string;
  thumbColor?: string;
}

export function AnimatedToggle({
  value,
  onToggle,
  trackColorOff,
  trackColorOn,
  thumbColor,
}: AnimatedToggleProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);
  const thumbScale = useSharedValue(1);

  const offColor = trackColorOff ?? colors.border;
  const onColor = trackColorOn ?? colors.primary;
  const thumb = thumbColor ?? colors.white;

  const handlePress = () => {
    const next = !value;
    progress.value = withSpring(next ? 1 : 0, { damping: 15, stiffness: 120 });
    thumbScale.value = withSequence(
      withSpring(1.15, { damping: 12, stiffness: 200 }),
      withSpring(1.0, { damping: 12, stiffness: 200 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(next);
  };

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offColor, onColor]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(progress.value * 22, { damping: 15, stiffness: 120 }) },
      { scale: thumbScale.value },
    ],
  }));

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, { backgroundColor: thumb }, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
