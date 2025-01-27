import React from 'react';
import { View, Platform, StatusBar, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import SpacesList from './components/SpacesList';
import SpaceDetails from './components/SpaceDetails';
import CreateSpace from './components/CreateSpace';
import WelcomePage from './components/WelcomePage';
import Header from './components/Header';
import Spinner from './components/Spinner';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { RootStackParamList } from './types';

const Stack = createStackNavigator();

// Wrapper to ensure the user has selected a profile
const RequireProfile: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasProfile, setHasProfile] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const checkProfile = async () => {
      const currentUserId = await AsyncStorage.getItem('currentUserId');
      setHasProfile(!!currentUserId);
      setIsLoading(false);
    };
    checkProfile();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner />
      </View>
    );
  }

  if (!hasProfile) {
    return <NavigateToWelcome />;
  }

  return <>{children}</>;
};

// Navigate to WelcomePage if no profile
const NavigateToWelcome: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  React.useEffect(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  }, [navigation]);
  return null;
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        paddingTop: Platform.OS === 'android' ? getStatusBarHeight() : 0,
      }}
    >
      <StatusBar
        animated
        hidden={false}
        networkActivityIndicatorVisible={true}
        translucent={true}
        backgroundColor="rgba(0, 0, 0, 0.2)"
        barStyle="light-content"
      />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home" id={undefined}>
          <Stack.Screen
            name="Welcome"
            component={WelcomePage}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Home" options={{ header: HeaderComponent }}>
            {() => (
              <RequireProfile>
                <SpacesList />
              </RequireProfile>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="SpaceDetails"
            options={{ title: 'Space Details', header: HeaderComponent }}
          >
            {() => (
              <RequireProfile>
                <SpaceDetails />
              </RequireProfile>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="CreateSpace"
            options={{ title: 'Create Space', header: HeaderComponent }}
          >
            {() => (
              <RequireProfile>
                <CreateSpace />
              </RequireProfile>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const HeaderComponent = () => <Header />;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
