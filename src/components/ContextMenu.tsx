import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

export interface ContextMenuItem {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface ContextMenuProps {
  visible: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  anchorY?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ContextMenu({ visible, onClose, items, anchorY }: ContextMenuProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={StyleSheet.absoluteFill}
        >
          <View style={s.overlayBg} />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={[
            s.menuCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderSubtle,
            },
            anchorY != null && { marginTop: anchorY },
          ]}
        >
          {items.map((item, index) => {
            const itemColor = item.destructive ? colors.error : colors.text;
            return (
              <View key={item.label}>
                {index > 0 && (
                  <View style={[s.divider, { backgroundColor: colors.border }]} />
                )}
                <AnimatedPressable
                  onPress={() => {
                    item.onPress();
                    onClose();
                  }}
                  style={({ pressed }) => [
                    s.menuItem,
                    pressed && s.menuItemPressed,
                  ]}
                >
                  <MaterialIcons
                    name={item.icon as keyof typeof MaterialIcons.glyphMap}
                    size={22}
                    color={itemColor}
                  />
                  <Text style={[s.menuItemText, { color: itemColor }]}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              </View>
            );
          })}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingVertical: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  menuItemPressed: {
    opacity: 0.6,
  },
  menuItemText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.base,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
});
