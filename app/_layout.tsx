import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { Toast } from '@/src/components/Toast';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isLoaded = useRecipeStore((s) => s.isLoaded);

  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initialize();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (session) {
      useRecipeStore.getState().initialize();
    }
  }, [session]);

  useEffect(() => {
    if (isInitialized && (!session || isLoaded)) SplashScreen.hideAsync();
  }, [isInitialized, session, isLoaded]);

  return (
    <>
      <StatusBar style={colors.statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="recipe/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="recipe/create" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="recipe/edit/[id]" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="collection/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="collection/create" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="preplist/create" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <Toast />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
