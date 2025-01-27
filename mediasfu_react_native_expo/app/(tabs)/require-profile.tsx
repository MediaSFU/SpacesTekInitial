import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RequireProfile: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
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
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!hasProfile) {
    router.replace({ pathname: '/welcome' });
    return null;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RequireProfile;
