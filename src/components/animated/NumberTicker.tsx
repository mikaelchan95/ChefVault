import { useEffect } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface NumberTickerProps {
  value: number;
  style?: TextStyle | TextStyle[];
}

const SLIDE_DISTANCE = 24;
const DURATION = 200;

export function NumberTicker({ value, style }: NumberTickerProps) {
  const displayValue = useSharedValue(value);
  const previousValue = useSharedValue(value);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (value === previousValue.value) return;

    const direction = value > previousValue.value ? -1 : 1;
    previousValue.value = value;

    translateY.value = -direction * SLIDE_DISTANCE;
    opacity.value = 0;

    translateY.value = withTiming(0, { duration: DURATION });
    opacity.value = withTiming(1, { duration: DURATION });
    displayValue.value = value;
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={styles.container}>
      <Animated.Text style={[style, animatedStyle]}>{value}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
