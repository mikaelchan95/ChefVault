import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius, stringToColor } from '@/src/constants/theme';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useToastStore } from '@/src/stores/toastStore';
import type { CollectionFormData } from '@/src/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESET_COLORS = [
  '#E74C3C',
  '#E67E22',
  '#F1C40F',
  '#2ECC71',
  '#3498DB',
  '#9B59B6',
  '#1ABC9C',
  '#34495E',
];

const NAME_MAX = 50;
const DESC_MAX = 200;

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 55%, 50%)`;
}

export default function CreateCollectionScreen() {
  const { colors, sharedStyles, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const addCollection = useRecipeStore((s) => s.addCollection);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'draft'>('active');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const canCreate = name.trim().length > 0;

  const createBtnScale = useSharedValue(1);
  const createBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createBtnScale.value }],
  }));

  const previewBg = selectedColor ?? stringToColor(name || 'New Collection', isDark);

  async function handleCreate() {
    if (!canCreate) return;

    const data: CollectionFormData = {
      name: name.trim(),
      description: description.trim() || null,
      color: selectedColor,
      icon: null,
      status,
    };

    try {
      const id = await addCollection(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useToastStore.getState().show({ message: 'Collection created!', type: 'success' });
      if (id) router.replace(`/collection/${id}`);
      else router.back();
    } catch {
      useToastStore.getState().show({ message: 'Failed to create collection', type: 'error' });
    }
  }

  function handleClose() {
    if (name.trim() || description.trim()) {
      Alert.alert('Discard Collection?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }

  function handleSelectPreset(color: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor((prev) => (prev === color ? null : color));
  }

  function handleRandomColor() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor(randomColor());
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[sharedStyles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={({ pressed }) => pressed && styles.headerBtnPressed}
        >
          <MaterialIcons name="close" size={24} color={colors.text} />
        </Pressable>

        <Text style={sharedStyles.headerTitle}>New Collection</Text>

        <AnimatedPressable
          onPress={handleCreate}
          onPressIn={() => { createBtnScale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
          onPressOut={() => { createBtnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
          disabled={!canCreate}
          style={[
            styles.createBtn,
            { backgroundColor: canCreate ? colors.primary : colors.field },
            createBtnAnimStyle,
          ]}
        >
          <Text
            style={[
              styles.createBtnText,
              { color: canCreate ? '#FFFFFF' : colors.textMuted },
            ]}
          >
            Create
          </Text>
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <Animated.View entering={FadeInDown.delay(0).duration(300)} style={styles.section}>
          <Text style={sharedStyles.sectionLabel}>Collection Name *</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.field,
                  borderColor: colors.borderSubtle,
                  color: colors.text,
                },
              ]}
              placeholder="e.g. Dinner Service"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
              maxLength={NAME_MAX}
              autoFocus
              returnKeyType="next"
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>
              {name.length}/{NAME_MAX}
            </Text>
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.section}>
          <Text style={sharedStyles.sectionLabel}>Description</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                styles.inputMultiline,
                {
                  backgroundColor: colors.field,
                  borderColor: colors.borderSubtle,
                  color: colors.text,
                },
              ]}
              placeholder="Brief description of this collection..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
              maxLength={DESC_MAX}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>
              {description.length}/{DESC_MAX}
            </Text>
          </View>
        </Animated.View>

        {/* Status */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.section}>
          <Text style={sharedStyles.sectionLabel}>Status</Text>
          <View style={[styles.segmentRow, { backgroundColor: colors.field, borderColor: colors.borderSubtle }]}>
            {(['active', 'draft'] as const).map((s) => {
              const isActive = status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setStatus(s);
                  }}
                  style={[
                    styles.segmentBtn,
                    isActive && { backgroundColor: colors.primary },
                  ]}
                >
                  <MaterialIcons
                    name={s === 'active' ? 'check-circle' : 'edit'}
                    size={16}
                    color={isActive ? '#FFFFFF' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: isActive ? '#FFFFFF' : colors.textMuted },
                    ]}
                  >
                    {s === 'active' ? 'Active' : 'Draft'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Color Picker */}
        <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.section}>
          <Text style={sharedStyles.sectionLabel}>Color</Text>
          <View style={styles.colorRow}>
            {PRESET_COLORS.map((c) => {
              const isSelected = selectedColor === c;
              return (
                <Pressable key={c} onPress={() => handleSelectPreset(c)} hitSlop={4}>
                  <Animated.View
                    layout={Layout.springify()}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      isSelected && styles.colorCircleSelected,
                      isSelected && { borderColor: colors.text },
                    ]}
                  >
                    {isSelected && (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </Animated.View>
                </Pressable>
              );
            })}
            <Pressable onPress={handleRandomColor} hitSlop={4}>
              <View
                style={[
                  styles.colorCircle,
                  styles.randomCircle,
                  { borderColor: colors.border },
                ]}
              >
                <MaterialIcons name="shuffle" size={16} color={colors.textSecondary} />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Preview */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
          <Text style={sharedStyles.sectionLabel}>Preview</Text>
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={[styles.previewCover, { backgroundColor: previewBg }]}>
              <MaterialIcons name="restaurant" size={32} color="rgba(255,255,255,0.15)" />
              {status === 'active' && (
                <View style={styles.previewActiveBadge}>
                  <Text style={styles.previewBadgeText}>Active</Text>
                </View>
              )}
              {status === 'draft' && (
                <View
                  style={[
                    styles.previewDraftBadge,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)',
                    },
                  ]}
                >
                  <Text style={[styles.previewDraftBadgeText, { color: colors.textSecondary }]}>
                    Draft
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.previewInfo}>
              <View style={styles.previewInfoText}>
                <Text
                  style={[styles.previewName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {name.trim() || 'Collection Name'}
                </Text>
                <Text style={[styles.previewCount, { color: colors.textTertiary }]}>
                  0 recipes
                </Text>
              </View>
              <MaterialIcons name="folder-open" size={20} color={colors.primary} />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  headerBtnPressed: { opacity: 0.6 },
  createBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  createBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  scrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.xxl },

  section: { gap: Spacing.sm },

  inputRow: { gap: Spacing.xs },
  input: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: Spacing.md,
  },
  charCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.xs,
    textAlign: 'right',
  },

  segmentRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  segmentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
  randomCircle: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },

  previewCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  previewCover: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewActiveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,122,0,0.9)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewDraftBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewDraftBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewInfo: {
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  previewInfoText: { flex: 1, overflow: 'hidden' },
  previewName: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: -0.2,
  },
  previewCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
    marginTop: 4,
  },
});
