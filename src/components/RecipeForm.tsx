import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { useToastStore } from '@/src/stores/toastStore';
import { uploadImages } from '@/src/lib/storage';
import { CUISINES, UNITS } from '@/src/types';
import type { Ingredient, Step } from '@/src/types';
import { PlatingPhotos } from '@/src/components/PlatingPhotos';
import { SwipeableRow } from '@/src/components/animated/SwipeableRow';
import { useUnsavedChangesGuard } from '@/src/hooks/useUnsavedChangesGuard';

export interface IngredientDraft {
  name: string;
  quantity: string;
  unit: string;
  notes: string;
  cost: string;
}

export interface StepDraft {
  instruction: string;
  timer_minutes: string;
}

export interface RecipeFormData {
  title: string;
  cuisine: string | null;
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  description: string | null;
  plating_photos: string[];
  ingredients: Ingredient[];
  steps: Step[];
}

export interface RecipeFormProps {
  initialValues?: {
    title: string;
    cuisine: string;
    servings: string;
    prepTime: string;
    cookTime: string;
    description: string;
    ingredients: IngredientDraft[];
    steps: StepDraft[];
    platingPhotos: string[];
  };
  onSave: (data: RecipeFormData) => Promise<void>;
  headerTitle: string;
  saveButtonText: string;
  successMessage: string;
  errorMessage: string;
}

const EMPTY_INGREDIENT: IngredientDraft = { name: '', quantity: '', unit: 'g', notes: '', cost: '' };
const EMPTY_STEP: StepDraft = { instruction: '', timer_minutes: '' };

export function RecipeForm({
  initialValues,
  onSave,
  headerTitle,
  saveButtonText,
  successMessage,
  errorMessage,
}: RecipeFormProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [cuisine, setCuisine] = useState(initialValues?.cuisine ?? '');
  const [servings, setServings] = useState(initialValues?.servings ?? '4');
  const [prepTime, setPrepTime] = useState(initialValues?.prepTime ?? '');
  const [cookTime, setCookTime] = useState(initialValues?.cookTime ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initialValues?.ingredients ?? [{ ...EMPTY_INGREDIENT }],
  );
  const [steps, setSteps] = useState<StepDraft[]>(
    initialValues?.steps ?? [{ ...EMPTY_STEP }],
  );
  const [platingPhotos, setPlatingPhotos] = useState<string[]>(initialValues?.platingPhotos ?? []);
  const [unitPickerIndex, setUnitPickerIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = useCallback(() => setIsDirty(true), []);

  useUnsavedChangesGuard(isDirty, saving);

  const saveScale = useSharedValue(1);
  const saveAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const addIngredientRow = useCallback(() => {
    markDirty();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients((prev) => [...prev, { ...EMPTY_INGREDIENT }]);
  }, [markDirty]);

  const removeIngredientRow = useCallback((index: number) => {
    markDirty();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }, [markDirty]);

  const updateIngredient = useCallback((index: number, field: keyof IngredientDraft, value: string) => {
    markDirty();
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
    );
  }, [markDirty]);

  const addStepRow = useCallback(() => {
    markDirty();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSteps((prev) => [...prev, { ...EMPTY_STEP }]);
  }, [markDirty]);

  const removeStepRow = useCallback((index: number) => {
    markDirty();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }, [markDirty]);

  const updateStep = useCallback((index: number, field: keyof StepDraft, value: string) => {
    markDirty();
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }, [markDirty]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      useToastStore.getState().show({ message: 'Please enter a recipe title', type: 'error' });
      return;
    }

    const validIngredients: Ingredient[] = ingredients
      .filter((i) => i.name.trim() && i.quantity.trim())
      .map((i, idx) => ({
        id: '',
        recipe_id: '',
        name: i.name.trim(),
        quantity: parseFloat(i.quantity) || 0,
        unit: i.unit,
        notes: i.notes.trim() || null,
        cost_per_unit: i.cost.trim() ? parseFloat(i.cost) : null,
        sort_order: idx,
      }));

    const validSteps: Step[] = steps
      .filter((s) => s.instruction.trim())
      .map((s, idx) => ({
        id: '',
        recipe_id: '',
        step_number: idx + 1,
        instruction: s.instruction.trim(),
        timer_seconds: s.timer_minutes ? parseInt(s.timer_minutes, 10) * 60 : null,
      }));

    setSaving(true);
    try {
      const finalPhotos = await uploadImages('recipe-images', platingPhotos);

      await onSave({
        title: title.trim(),
        cuisine: cuisine || null,
        servings: parseInt(servings, 10) || 4,
        prep_time: prepTime ? parseInt(prepTime, 10) : null,
        cook_time: cookTime ? parseInt(cookTime, 10) : null,
        description: description.trim() || null,
        plating_photos: finalPhotos,
        ingredients: validIngredients,
        steps: validSteps,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useToastStore.getState().show({ message: successMessage, type: 'success' });
      router.back();
    } catch {
      useToastStore.getState().show({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [title, cuisine, servings, prepTime, cookTime, description, ingredients, steps, platingPhotos, onSave, successMessage, errorMessage]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
        <Pressable onPress={handleSave} disabled={saving}>
          <Text style={[styles.doneButton, { color: saving ? colors.textMuted : colors.primary }]}>Done</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={44}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Recipe Info</Text>
            <View style={styles.fieldGroup}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Recipe Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]}
                  value={title}
                  onChangeText={(v) => { markDirty(); setTitle(v); }}
                  placeholder="e.g. Braised Short Ribs"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Cuisine</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {CUISINES.map((c) => (
                    <Pressable
                      key={c}
                      style={[
                        styles.chip,
                        { backgroundColor: colors.field, borderColor: colors.border },
                        cuisine === c && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => { markDirty(); setCuisine(cuisine === c ? '' : c); }}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: colors.textSecondary },
                        cuisine === c && styles.chipTextActive,
                      ]}>{c}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.row}>
                <View style={[styles.field, styles.flex]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Servings</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]}
                    value={servings}
                    onChangeText={(v) => { markDirty(); setServings(v); }}
                    keyboardType="numeric"
                    selectionColor={colors.primary}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={[styles.field, styles.flex]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Prep Time (min)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]}
                    value={prepTime}
                    onChangeText={(v) => { markDirty(); setPrepTime(v); }}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.primary}
                  />
                </View>
                <View style={[styles.field, styles.flex]}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Cook Time (min)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]}
                    value={cookTime}
                    onChangeText={(v) => { markDirty(); setCookTime(v); }}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.primary}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]}
                  value={description}
                  onChangeText={(v) => { markDirty(); setDescription(v); }}
                  placeholder="Allergens, plating notes, source..."
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Ingredients</Text>
              <Pressable
                style={[styles.addRowButton, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}
                onPress={addIngredientRow}
              >
                <MaterialIcons name="add" size={14} color={colors.primary} />
                <Text style={[styles.addRowText, { color: colors.primary }]}>Add Ingredient</Text>
              </Pressable>
            </View>
            <View style={[styles.ingredientsList, { backgroundColor: colors.field, borderColor: colors.border }]}>
              {ingredients.map((ing, index) => (
                <Animated.View key={index} entering={FadeInDown.duration(250)}>
                  <SwipeableRow onDelete={() => removeIngredientRow(index)} enabled>
                    <View style={[styles.ingredientRow, { borderBottomColor: colors.border, backgroundColor: colors.field }]}>
                      <TextInput
                        style={[styles.inlineInput, styles.flex, { color: colors.text }]}
                        value={ing.name}
                        onChangeText={(v) => updateIngredient(index, 'name', v)}
                        placeholder="Ingredient"
                        placeholderTextColor={colors.textMuted}
                        selectionColor={colors.primary}
                      />
                      <TextInput
                        style={[styles.inlineInput, styles.qtyInput, { color: colors.text }]}
                        value={ing.quantity}
                        onChangeText={(v) => updateIngredient(index, 'quantity', v)}
                        placeholder="Qty"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        selectionColor={colors.primary}
                      />
                      <Pressable
                        style={[styles.unitPicker, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setUnitPickerIndex(index)}
                      >
                        <Text style={[styles.unitPickerText, { color: colors.text }]}>{ing.unit}</Text>
                      </Pressable>
                      <TextInput
                        style={[styles.inlineInput, styles.costInput, { color: colors.primary }]}
                        value={ing.cost}
                        onChangeText={(v) => updateIngredient(index, 'cost', v)}
                        placeholder="$"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        selectionColor={colors.primary}
                      />
                      <Pressable onPress={() => removeIngredientRow(index)} hitSlop={8} style={{ padding: 10, margin: -10 }}>
                        <MaterialIcons name="delete-outline" size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </SwipeableRow>
                </Animated.View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Preparation Steps</Text>
              <Pressable
                style={[styles.addRowButton, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}
                onPress={addStepRow}
              >
                <MaterialIcons name="add" size={14} color={colors.primary} />
                <Text style={[styles.addRowText, { color: colors.primary }]}>Add Step</Text>
              </Pressable>
            </View>
            <View style={styles.stepsContainer}>
              {steps.map((step, index) => (
                <Animated.View key={index} entering={FadeInDown.duration(250)} style={styles.stepItem}>
                  <View style={styles.stepNumberCol}>
                    <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    {index < steps.length - 1 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
                  </View>
                  <View style={styles.stepEditContent}>
                    <TextInput
                      style={[styles.stepTextArea, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]}
                      value={step.instruction}
                      onChangeText={(v) => updateStep(index, 'instruction', v)}
                      placeholder="e.g. Sear on high heat, 3 min per side"
                      placeholderTextColor={colors.textMuted}
                      selectionColor={colors.primary}
                      multiline
                      textAlignVertical="top"
                    />
                    <View style={styles.stepTimerRow}>
                      <MaterialIcons name="timer" size={18} color={colors.primary} />
                      <TextInput
                        style={[styles.timerInput, { color: colors.primary }]}
                        value={step.timer_minutes}
                        onChangeText={(v) => updateStep(index, 'timer_minutes', v)}
                        placeholder="Minutes"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        selectionColor={colors.primary}
                      />
                      <Pressable onPress={() => removeStepRow(index)} hitSlop={8} style={{ padding: 10, margin: -10 }}>
                        <MaterialIcons name="delete-outline" size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>

          <PlatingPhotos
            photos={platingPhotos}
            onPhotosChange={setPlatingPhotos}
            editable
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={unitPickerIndex !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setUnitPickerIndex(null)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Unit</Text>
            <View style={styles.unitGrid}>
              {UNITS.map((u) => {
                const isSelected = unitPickerIndex !== null && ingredients[unitPickerIndex]?.unit === u;
                return (
                  <Pressable
                    key={u}
                    style={[
                      styles.unitOption,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      if (unitPickerIndex !== null) {
                        updateIngredient(unitPickerIndex, 'unit', u);
                        setUnitPickerIndex(null);
                      }
                    }}
                  >
                    <Text style={[
                      styles.unitOptionText,
                      { color: colors.textSecondary },
                      isSelected && styles.unitOptionTextActive,
                    ]}>{u}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      <View
        style={[
          styles.saveBar,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: colors.card,
            borderTopColor: colors.borderSubtle,
          },
        ]}
      >
        <Animated.View style={saveAnimStyle}>
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, saving && { opacity: 0.6 }]}
            onPressIn={() => { if (!saving) saveScale.value = withSpring(0.96); }}
            onPressOut={() => { if (!saving) saveScale.value = withSpring(1); }}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>{saveButtonText}</Text>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: { width: 40 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.lg, textAlign: 'center' },
  doneButton: { fontFamily: 'Inter_700Bold', fontSize: FontSize.base },

  scrollContent: { paddingBottom: 120 },

  section: { padding: Spacing.lg, gap: Spacing.lg },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  addRowText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.sm },

  fieldGroup: { gap: Spacing.lg },
  field: { gap: Spacing.sm },
  fieldLabel: { fontFamily: 'Inter_700Bold', fontSize: FontSize.sm, paddingLeft: 4 },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    paddingHorizontal: Spacing.lg,
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.md,
  },
  textArea: { height: 88, paddingTop: Spacing.md, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.md },

  ingredientsList: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inlineInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
  },
  qtyInput: { width: 60, textAlign: 'right' },
  costInput: { width: 56, textAlign: 'right', fontFamily: 'Inter_500Medium' },

  stepsContainer: { gap: Spacing.xxl },
  stepItem: { flexDirection: 'row', gap: Spacing.lg },
  stepNumberCol: { alignItems: 'center' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontFamily: 'Inter_700Bold', fontSize: FontSize.sm, color: '#FFFFFF' },
  stepLine: { width: 2, flex: 1, marginTop: Spacing.sm },
  stepEditContent: { flex: 1, gap: Spacing.sm },
  stepTextArea: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    minHeight: 88,
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  stepTimerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingLeft: 4 },
  timerInput: { fontFamily: 'Inter_700Bold', fontSize: FontSize.sm, flex: 1, padding: 0 },

  chipScroll: { marginBottom: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.xxl, marginRight: 8, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  unitPicker: { width: 48, height: 36, borderRadius: BorderRadius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  unitPickerText: { fontFamily: 'Inter_500Medium', fontSize: FontSize.sm, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, paddingBottom: 40, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.lg, marginBottom: Spacing.lg, textAlign: 'center' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  unitOption: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: StyleSheet.hairlineWidth, minWidth: 56, alignItems: 'center' },
  unitOptionText: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.md },
  unitOptionTextActive: { color: '#FFFFFF' },

  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
