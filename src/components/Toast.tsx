import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { useToastStore } from '@/src/stores/toastStore';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';

export function Toast() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);

  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 150 });

      if (toast.type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (toast.type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      translateY.value = withTiming(-100, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [toast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -50 || (e.translationY < -20 && e.velocityY < -500)) {
        translateY.value = withTiming(-100, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 });
        runOnJS(hide)();
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const accentColor =
    toast?.type === 'success'
      ? colors.success
      : toast?.type === 'error'
        ? colors.error
        : colors.primary;

  if (!toast) return null;

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            top: insets.top + Spacing.sm,
            backgroundColor: colors.card,
            borderColor: colors.borderSubtle,
            borderLeftColor: accentColor,
            shadowColor: colors.shadow,
          },
          animatedStyle,
        ]}
      >
        <Text style={[styles.message, { color: colors.text }]} numberOfLines={1}>
          {toast.message}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    zIndex: 9999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.md,
  },
});
