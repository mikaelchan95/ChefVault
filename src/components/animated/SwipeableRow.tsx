import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/hooks/useTheme';

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  enabled?: boolean;
}

const DELETE_WIDTH = 80;
const DELETE_THRESHOLD = -120;

export function SwipeableRow({ children, onDelete, enabled = true }: SwipeableRowProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);

  const triggerDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      translateX.value = Math.max(-DELETE_WIDTH * 2, Math.min(0, e.translationX));
    })
    .onEnd(() => {
      if (translateX.value < DELETE_THRESHOLD) {
        runOnJS(triggerDelete)();
        translateX.value = withSpring(0);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, -translateX.value / DELETE_WIDTH),
  }));

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.deleteZone, { backgroundColor: colors.error }, deleteStyle]}
      >
        <MaterialIcons name="delete" size={22} color="#FFF" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={contentStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
