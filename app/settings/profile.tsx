import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { uploadImage, isLocalUri } from '@/src/lib/storage';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, sharedStyles } = useTheme();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const [name, setName] = useState(profile?.name ?? '');
  const [title, setTitle] = useState(profile?.title ?? '');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalAvatarUrl = avatarUri ?? null;
      if (finalAvatarUrl && isLocalUri(finalAvatarUrl)) {
        finalAvatarUrl = await uploadImage('avatars', finalAvatarUrl);
        setAvatarUri(finalAvatarUrl);
      }
      useAuthStore.getState().updateProfile({
        name: name.trim(),
        title: title.trim() || null,
        avatar_url: finalAvatarUrl,
      });
      setSaved(true);
      setTimeout(() => router.back(), 600);
    } catch {
      Alert.alert('Error', 'Failed to upload avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.field,
      borderColor: colors.border,
      color: colors.text,
    },
  ];

  return (
    <View style={[sharedStyles.screenContainer, { paddingTop: insets.top }]}>
      <View style={sharedStyles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={sharedStyles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={pickAvatar} style={styles.avatarWrapper}>
            <View
              style={[styles.avatar, { backgroundColor: colors.primaryLight }]}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {(profile?.name ?? 'C')[0].toUpperCase()}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.cameraOverlay,
                { backgroundColor: colors.primary },
              ]}
            >
              <MaterialIcons name="camera-alt" size={16} color={colors.white} />
            </View>
          </Pressable>
          <Text style={[styles.avatarHint, { color: colors.textTertiary }]}>
            Tap to change photo
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Name
            </Text>
            <TextInput
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Professional Title
            </Text>
            <TextInput
              style={inputStyle}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Head Chef"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Email
            </Text>
            <View style={styles.emailRow}>
              <TextInput
                style={[
                  inputStyle,
                  { flex: 1, color: colors.textMuted, opacity: 0.7 },
                ]}
                value={profile?.email ?? ''}
                editable={false}
              />
              <View
                style={[
                  styles.lockBadge,
                  { backgroundColor: colors.surface },
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={14}
                  color={colors.textMuted}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              sharedStyles.primaryButton,
              pressed && { opacity: 0.85 },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saving || !name.trim()}
          >
            <Text style={sharedStyles.primaryButtonText}>
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarInitial: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xxxl,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
  },
  form: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.sm,
    marginLeft: Spacing.xs,
  },
  input: {
    fontFamily: 'Inter_500Medium',
    fontSize: FontSize.base,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lockBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
  },
});
