import { useState, useCallback } from 'react';
import {
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
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useToastStore } from '@/src/stores/toastStore';
import { uploadImages } from '@/src/lib/storage';
import { CUISINES, UNITS, type UnitType } from '@/src/types';
import type { Recipe, Ingredient, Step } from '@/src/types';
import { PlatingPhotos } from '@/src/components/PlatingPhotos';
import { SwipeableRow } from '@/src/components/animated/SwipeableRow';

interface IngredientDraft {
  name: string;
  quantity: string;
  unit: UnitType;
  notes: string;
  cost: string;
}

interface StepDraft {
  instruction: string;
  timer_minutes: string;
}

export default function CreateRecipeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const addRecipe = useRecipeStore((s) => s.addRecipe);

  const [title, setTitle] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [servings, setServings] = useState('4');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([
    { name: '', quantity: '', unit: 'g', notes: '', cost: '' },
  ]);
  const [steps, setSteps] = useState<StepDraft[]>([
    { instruction: '', timer_minutes: '' },
  ]);
  const [platingPhotos, setPlatingPhotos] = useState<string[]>([]);
  const [unitPickerIndex, setUnitPickerIndex] = useState<number | null>(null);
  const saveScale = useSharedValue(1);
  const saveAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const addIngredientRow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: 'g', notes: '', cost: '' }]);
  }, []);

  const removeIngredientRow = useCallback((index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateIngredient = useCallback((index: number, field: keyof IngredientDraft, value: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
    );
  }, []);

  const addStepRow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSteps((prev) => [...prev, { instruction: '', timer_minutes: '' }]);
  }, []);

  const removeStepRow = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateStep = useCallback((index: number, field: keyof StepDraft, value: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }, []);

  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      useToastStore.getState().show({ message: 'Please enter a recipe title', type: 'error' });
      return;
    }

    const validIngredients: Ingredient[] = ingredients
      .filter((i) => i.name.trim() && i.quantity.trim())
      .map((i, idx) => ({
        id: `new-${idx}`,
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
        id: `new-s${idx}`,
        recipe_id: '',
        step_number: idx + 1,
        instruction: s.instruction.trim(),
        timer_seconds: s.timer_minutes ? parseInt(s.timer_minutes, 10) * 60 : null,
      }));

    setSaving(true);
    try {
      const finalPhotos = await uploadImages('recipe-images', platingPhotos);

      const recipe: Recipe = {
        id: '',
        user_id: '',
        title: title.trim(),
        cuisine: cuisine || null,
        servings: parseInt(servings, 10) || 4,
        prep_time: prepTime ? parseInt(prepTime, 10) : null,
        cook_time: cookTime ? parseInt(cookTime, 10) : null,
        description: description.trim() || null,
        image_url: null,
        plating_photos: finalPhotos,
        created_at: '',
        updated_at: '',
        ingredients: validIngredients,
        steps: validSteps,
      };

      await addRecipe(recipe);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useToastStore.getState().show({ message: 'Recipe created!', type: 'success' });
      router.back();
    } catch {
      useToastStore.getState().show({ message: 'Failed to save recipe', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [title, cuisine, servings, prepTime, cookTime, description, ingredients, steps, platingPhotos, addRecipe]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Recipe</Text>
        <Pressable onPress={handleSave}>
          <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
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
        >
          {/* Recipe Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Recipe Info</Text>
            <View style={styles.fieldGroup}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Recipe Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]}
                  value={title}
                  onChangeText={setTitle}
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
                      style={[styles.chip, cuisine === c && styles.chipActive]}
                      onPress={() => setCuisine(cuisine === c ? '' : c)}
                    >
                      <Text style={[styles.chipText, cuisine === c && styles.chipTextActive]}>{c}</Text>
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
                    onChangeText={setServings}
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
                    onChangeText={setPrepTime}
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
                    onChangeText={setCookTime}
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
                  onChangeText={setDescription}
                  placeholder="Notes about this recipe..."
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Ingredients</Text>
              <Pressable
                style={[styles.addRowButton, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}
                onPress={addIngredientRow}
              >
                <MaterialIcons name="add" size={14} color={colors.primary} />
                <Text style={[styles.addRowText, { color: colors.primary }]}>Add Row</Text>
              </Pressable>
            </View>
            <View style={[styles.ingredientsList, { backgroundColor: colors.field, borderColor: colors.border }]}>
              {ingredients.map((ing, index) => (
                <Animated.View key={index} entering={FadeInDown.duration(250)}>
                  <SwipeableRow onDelete={() => removeIngredientRow(index)} enabled>
                    <View style={[styles.ingredientRow, { borderBottomColor: colors.border, backgroundColor: colors.field }]}>
                      <MaterialIcons name="drag-indicator" size={20} color={colors.textMuted} />
                      <TextInput
                        style={[styles.inlineInput, styles.flex, { color: colors.text }]}
                        value={ing.name}
                        onChangeText={(v) => updateIngredient(index, 'name', v)}
                        placeholder="Item"
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
                      <Pressable
                        onPress={() => removeIngredientRow(index)}
                        hitSlop={8}
                        style={styles.deleteButton}
                      >
                        <MaterialIcons name="delete-outline" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </SwipeableRow>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Steps */}
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
                      <Text style={[styles.stepNumberText, { color: '#FFFFFF' }]}>{index + 1}</Text>
                    </View>
                    {index < steps.length - 1 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
                  </View>
                  <View style={styles.stepEditContent}>
                    <TextInput
                      style={[styles.stepTextArea, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]}
                      value={step.instruction}
                      onChangeText={(v) => updateStep(index, 'instruction', v)}
                      placeholder="Instruction detail..."
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
                      <Pressable
                        onPress={() => removeStepRow(index)}
                        hitSlop={8}
                      >
                        <MaterialIcons name="delete-outline" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Plating Photos */}
          <PlatingPhotos
            photos={platingPhotos}
            onPhotosChange={setPlatingPhotos}
            editable
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Unit Picker Modal */}
      <Modal visible={unitPickerIndex !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setUnitPickerIndex(null)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Unit</Text>
            <View style={styles.unitGrid}>
              {UNITS.map((u) => {
                const isSelected = unitPickerIndex !== null && ingredients[unitPickerIndex]?.unit === u;
                return (
                  <Pressable
                    key={u}
                    style={[styles.unitOption, isSelected ? styles.unitOptionActive : { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      if (unitPickerIndex !== null) {
                        updateIngredient(unitPickerIndex, 'unit', u);
                        setUnitPickerIndex(null);
                      }
                    }}
                  >
                    <Text style={[styles.unitOptionText, isSelected && styles.unitOptionTextActive]}>{u}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Save Button */}
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
            style={[styles.saveButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPressIn={() => { saveScale.value = withSpring(0.96); }}
            onPressOut={() => { saveScale.value = withSpring(1); }}
            onPress={handleSave}
          >
            <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>Save Recipe</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 40,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.lg,
    textAlign: 'center',
  },
  doneButton: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.base,
  },

  scrollContent: {
    paddingBottom: 120,
  },

  section: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  addRowText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
  },

  fieldGroup: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
    paddingLeft: 4,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    paddingHorizontal: Spacing.lg,
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.md,
  },
  textArea: {
    height: 88,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

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
  qtyInput: {
    width: 60,
    textAlign: 'right',
  },
  unitInput: {
    width: 44,
    textAlign: 'center',
  },
  costInput: {
    width: 56,
    textAlign: 'right',
    fontFamily: 'Inter_500Medium',
  },
  deleteButton: {
    padding: 4,
  },

  stepsContainer: {
    gap: Spacing.xxl,
  },
  stepItem: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  stepNumberCol: {
    alignItems: 'center',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginTop: Spacing.sm,
  },
  stepEditContent: {
    flex: 1,
    gap: Spacing.sm,
  },
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
  stepTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: 4,
  },
  timerInput: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
    flex: 1,
    padding: 0,
  },

  chipScroll: { marginBottom: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#2A2A2A', marginRight: 8, borderWidth: 1, borderColor: '#333333' },
  chipActive: { backgroundColor: '#FF7A00', borderColor: '#FF7A00' },
  chipText: { color: '#A0A0A0', fontSize: 14, fontFamily: 'Inter_500Medium' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  unitPicker: { width: 48, height: 36, borderRadius: BorderRadius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  unitPickerText: { fontFamily: 'Inter_500Medium', fontSize: FontSize.sm, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: FontSize.lg, marginBottom: Spacing.lg, textAlign: 'center' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  unitOption: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: StyleSheet.hairlineWidth, minWidth: 56, alignItems: 'center' },
  unitOptionActive: { backgroundColor: '#FF7A00', borderColor: '#FF7A00' },
  unitOptionText: { fontFamily: 'Inter_600SemiBold', fontSize: FontSize.md, color: '#A0A0A0' },
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
  saveButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  saveButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
