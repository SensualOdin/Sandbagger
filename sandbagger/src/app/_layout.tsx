import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import {
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Backdrop } from '@/components/Backdrop';
import { useRoundStore } from '@/store/roundStore';
import { theme } from '@/theme';

SplashScreen.preventAutoHideAsync();

// react-navigation paints its theme background behind every screen (visible on
// web, where contentStyle is ignored) — make it the felt, never default grey.
const clubTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: 'transparent' },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    Fraunces_900Black,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });
  // Block rendering until the saved round is restored — see roundStore.
  const hydrated = useRoundStore((s) => s.hasHydrated);

  useEffect(() => {
    if (loaded && hydrated) SplashScreen.hideAsync();
  }, [loaded, hydrated]);

  if (!loaded || !hydrated) return null;

  return (
    <View style={styles.root}>
      <Backdrop />
      {/* phone-frame column on the web; full bleed on device */}
      <View style={[styles.frame, Platform.OS === 'web' && styles.webFrame]}>
        <StatusBar style="light" />
        <ThemeProvider value={clubTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
              animation: 'fade_from_bottom',
            }}
          />
        </ThemeProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.feltDeep },
  frame: { flex: 1, width: '100%' },
  webFrame: { maxWidth: 520, alignSelf: 'center' },
});
