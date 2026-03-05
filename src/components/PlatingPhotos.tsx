import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/useTheme';
import { useImagePicker } from '@/src/hooks/useImagePicker';
import { uploadImage } from '@/src/lib/storage';
import { useToastStore } from '@/src/stores/toastStore';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import { ProgressRing } from '@/src/components/animated/ProgressRing';

const { width: SCREEN_W } = Dimensions.get('window');
const THUMB_SIZE = 120;
const MAX_PHOTOS = 10;

interface PlatingPhotosProps {
  photos: string[];
  onPhotosChange?: (photos: string[]) => void;
  editable?: boolean;
}

/** Horizontal gallery of plating photos with optional camera capture and auto-upload. */
export function PlatingPhotos({ photos, onPhotosChange, editable = false }: PlatingPhotosProps) {
  const { colors } = useTheme();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const addPhoto = useCallback(
    async (uri: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPhotosChange?.([...photosRef.current, uri]);
      setUploading((prev) => new Set([...prev, uri]));

      try {
        const publicUrl = await uploadImage('recipe-images', uri);
        onPhotosChange?.(
          photosRef.current.map((p) => (p === uri ? publicUrl : p)),
        );
      } catch {
        useToastStore.getState().show({ message: 'Photo upload failed', type: 'error' });
        onPhotosChange?.(photosRef.current.filter((p) => p !== uri));
      } finally {
        setUploading((prev) => {
          const next = new Set(prev);
          next.delete(uri);
          return next;
        });
      }
    },
    [onPhotosChange],
  );

  const removePhoto = useCallback(
    (index: number) => {
      Alert.alert('Remove Photo', 'Delete this plating photo?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPhotosChange?.(photos.filter((_, i) => i !== index));
          },
        },
      ]);
    },
    [photos, onPhotosChange],
  );

  const { showPicker } = useImagePicker(addPhoto);

  const isEmpty = photos.length === 0;

  return (
    <>
      <View style={s.container}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <MaterialIcons name="camera-alt" size={16} color={colors.primary} />
            <Text style={[s.title, { color: colors.textSecondary }]}>Plating</Text>
            <Text style={[s.count, { color: colors.textMuted }]}>
              {photos.length}/{MAX_PHOTOS}
            </Text>
          </View>
          {editable && photos.length < MAX_PHOTOS && (
            <Pressable
              style={[s.addButton, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}
              onPress={showPicker}
            >
              <MaterialIcons name="add-a-photo" size={14} color={colors.primary} />
              <Text style={[s.addButtonText, { color: colors.primary }]}>Add</Text>
            </Pressable>
          )}
        </View>

        {isEmpty && !editable && (
          <View style={[s.emptyState, { borderColor: colors.border }]}>
            <MaterialIcons name="camera-alt" size={32} color={colors.textMuted} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>No plating photos yet</Text>
          </View>
        )}

        {isEmpty && editable && (
          <Pressable
            style={[s.emptyCapture, { borderColor: colors.primaryBorder, backgroundColor: colors.primaryLight }]}
            onPress={showPicker}
          >
            <MaterialIcons name="add-a-photo" size={28} color={colors.primary} />
            <Text style={[s.emptyCaptureText, { color: colors.primary }]}>
              Take or choose a photo
            </Text>
            <Text style={[s.emptyCaptureHint, { color: colors.textMuted }]}>
              Capture how the dish should be plated
            </Text>
          </Pressable>
        )}

        {!isEmpty && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            {photos.map((uri, index) => (
              <Animated.View key={`${uri}-${index}`} entering={FadeIn.delay(index * 80).duration(200)}>
                <Pressable
                  onPress={() => setViewerIndex(index)}
                  onLongPress={editable ? () => removePhoto(index) : undefined}
                  style={s.thumbWrapper}
                >
                  <Image
                    source={{ uri }}
                    style={[s.thumb, { borderColor: colors.border }]}
                    contentFit="cover"
                    transition={200}
                  />
                  {uploading.has(uri) && (
                    <View style={s.uploadOverlay}>
                      <ProgressRing size={32} strokeWidth={3} color="#FFF" backgroundColor="rgba(255,255,255,0.2)" />
                    </View>
                  )}
                  {editable && !uploading.has(uri) && (
                    <Pressable
                      style={[s.removeButton, { backgroundColor: colors.error }]}
                      onPress={() => removePhoto(index)}
                      hitSlop={6}
                    >
                      <MaterialIcons name="close" size={12} color="#FFF" />
                    </Pressable>
                  )}
                </Pressable>
              </Animated.View>
            ))}

            {editable && photos.length < MAX_PHOTOS && (
              <Pressable
                style={[s.addThumb, { borderColor: colors.primaryBorder, backgroundColor: colors.primaryLight }]}
                onPress={showPicker}
              >
                <MaterialIcons name="add-a-photo" size={24} color={colors.primary} />
              </Pressable>
            )}
          </ScrollView>
        )}
      </View>

      {/* Fullscreen viewer */}
      <Modal visible={viewerIndex !== null} transparent animationType="fade">
        <View style={s.viewerOverlay}>
          <Pressable style={s.viewerClose} onPress={() => setViewerIndex(null)}>
            <MaterialIcons name="close" size={28} color="#FFF" />
          </Pressable>

          {viewerIndex !== null && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: viewerIndex * SCREEN_W, y: 0 }}
            >
              {photos.map((uri, i) => (
                <View key={`viewer-${i}`} style={s.viewerPage}>
                  <Image
                    source={{ uri }}
                    style={s.viewerImage}
                    contentFit="contain"
                    transition={200}
                  />
                </View>
              ))}
            </ScrollView>
          )}

          {viewerIndex !== null && (
            <Text style={s.viewerCounter}>
              {viewerIndex + 1} / {photos.length}
            </Text>
          )}
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  count: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  addButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.sm,
  },

  emptyState: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxxl,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.md,
  },

  emptyCapture: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyCaptureText: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.md,
  },
  emptyCaptureHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  thumbWrapper: {
    position: 'relative',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  viewerPage: {
    width: SCREEN_W,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_W - 32,
    height: SCREEN_W - 32,
    borderRadius: BorderRadius.md,
  },
  viewerCounter: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.7)',
  },
});
