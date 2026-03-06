import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from 'expo-router';

/**
 * Shows a confirmation dialog when trying to navigate away with unsaved changes.
 * @param isDirty - Whether the form has unsaved changes
 * @param isSaving - Whether the form is currently saving (skip guard during save)
 */
export function useUnsavedChangesGuard(isDirty: boolean, isSaving: boolean) {
  const navigation = useNavigation();

  useEffect(() => {
    if (!isDirty || isSaving) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes that will be lost.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });

    return unsubscribe;
  }, [isDirty, isSaving, navigation]);
}
