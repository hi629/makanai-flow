import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { isOnboardingComplete as checkOnboarding, initDatabase } from '@/lib/database';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isOnboardingDone, setIsOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await initDatabase();
      
      // Check onboarding status
      const completed = checkOnboarding();
      setIsOnboardingDone(completed);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsOnboardingDone(false);
    } finally {
      SplashScreen.hideAsync();
    }
  };

  // Show nothing while checking onboarding status
  if (isOnboardingDone === null) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {!isOnboardingDone ? (
          <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
        ) : (
          <Stack.Screen name="(tabs)" />
        )}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
