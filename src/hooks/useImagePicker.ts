import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsMultipleSelection: false,
  quality: 0.8,
  allowsEditing: true,
  aspect: [4, 3],
};

async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Camera Access Needed',
      'Grant camera permission in Settings to take plating photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  }
  return true;
}

/** Returns helpers for taking/picking plating photos. */
export function useImagePicker(onPhotoPicked: (uri: string) => void) {
  const takePhoto = useCallback(async () => {
    if (!(await ensureCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      onPhotoPicked(result.assets[0].uri);
    }
  }, [onPhotoPicked]);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      onPhotoPicked(result.assets[0].uri);
    }
  }, [onPhotoPicked]);

  const showPicker = useCallback(() => {
    Alert.alert('Add Plating Photo', 'Choose a source', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [takePhoto, pickFromGallery]);

  return { takePhoto, pickFromGallery, showPicker };
}
