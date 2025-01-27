import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/useColorScheme';
import Header from '@/components/Header';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
 

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
     <Stack 
      screenOptions={{
        header: Header,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="welcome" options={{ title: 'Welcome', headerShown: false }} />
      <Stack.Screen name="create-space" options={{ title: 'Create Space' }} />
      <Stack.Screen name="space/[spaceId]" options={{ title: 'Space Details' }} />
    </Stack>
    </ThemeProvider>
  );
}
