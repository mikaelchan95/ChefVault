import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface AnimatedListItemProps {
  index: number;
  children: ReactNode;
}

export function AnimatedListItem({ index, children }: AnimatedListItemProps) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 400)).duration(350).springify()}>
      {children}
    </Animated.View>
  );
}
