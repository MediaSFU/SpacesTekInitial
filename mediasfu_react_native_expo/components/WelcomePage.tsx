import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {FontAwesome5 as Icon} from '@expo/vector-icons';
import {fetchAvailableUsers, markUserAsTaken, createProfile} from '../api';
import {UserProfile} from '../types';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Spinner from './Spinner';

const WelcomePage: React.FC = () => {
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [recentUserId, setRecentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [creatingProfile, setCreatingProfile] = useState<boolean>(false);
  const [animations, setAnimations] = useState<{[key: string]: Animated.Value}>(
    {},
  );

  const router = useRouter();

  const getCurrentUsers = async () => {
    try {
      const lastUsedId = await AsyncStorage.getItem('lastUserId');
      setRecentUserId(lastUsedId);

      const users = await fetchAvailableUsers();
      // Ensure default avatar if missing
      const updatedUsers = users.map(u => ({
        ...u,
        avatarUrl: u.avatarUrl || 'https://www.mediasfu.com/logo192.png',
      }));
      setAvailableUsers(updatedUsers);

      // Initialize animations
      const initialAnimations: {[key: string]: Animated.Value} = {};
      updatedUsers.forEach(user => {
        initialAnimations[user.id] = new Animated.Value(1);
      });
      setAnimations(initialAnimations);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch available users.');
      console.error('Fetch Available Users Error:', error);
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    React.useCallback(() => {
      const interval = setInterval(() => {
        getCurrentUsers();
      }, 2000); // Refresh every 2 seconds

      return () => clearInterval(interval);
    }, []),
  );

  const handleSelect = async (userId: string) => {
    try {
      await markUserAsTaken(userId);
      await AsyncStorage.setItem('currentUserId', userId);
      router.replace({ pathname: '/' });
    } catch (error) {
      Alert.alert('Error', 'Failed to select user. Please try again.');
      console.error('Mark User As Taken Error:', error);
    }
  };

  const handleCreate = async () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Display name cannot be empty.');
      return;
    }

    setCreatingProfile(true);
    try {
      const newUser = await createProfile(
        displayName.trim(),
        avatarUrl.trim() || 'https://www.mediasfu.com/logo192.png',
      );
      await AsyncStorage.setItem('currentUserId', newUser.id);
      router.replace({ pathname: '/' });
    } catch (error) {
      Alert.alert('Error', 'Failed to create profile. Please try again.');
      console.error('Create Profile Error:', error);
    } finally {
      setCreatingProfile(false);
    }
  };

  const handlePressIn = (userId: string) => {
    Animated.timing(animations[userId], {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (userId: string) => {
    Animated.timing(animations[userId], {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <Spinner />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome to SpacesTek</Text>
      <Text style={styles.subtitle}>
        Join immersive audio discussions. Select a profile below or create a new
        one to get started.
      </Text>

      <Text style={styles.sectionHeader}>Pick a Profile</Text>
      <View style={styles.profilesGrid}>
        {availableUsers.map(u => (
          <Animated.View
            key={u.id}
            style={[
              styles.profileCard,
              u.id === recentUserId && styles.recentlyUsedCard,
              {transform: [{scale: animations[u.id] || 1}]},
            ]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelect(u.id)}
              onPressIn={() => handlePressIn(u.id)}
              onPressOut={() => handlePressOut(u.id)}
              style={styles.touchable}>
              <Image
                source={{
                  uri: u.avatarUrl || 'https://www.mediasfu.com/logo192.png',
                }}
                style={styles.avatar}
                resizeMode="cover"
              />
              <Text style={styles.displayName}>{u.displayName}</Text>
              {u.id === recentUserId && (
                <Text style={styles.recentLabel}>Recently Used</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <View style={styles.createProfileContainer}>
        <Text style={styles.sectionHeader}>
          <Icon name="user-plus" size={16} color="#1da1f2" /> Create a New
          Profile
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Display name"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="Avatar URL (optional)"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
        />
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreate}
          disabled={creatingProfile}>
          {creatingProfile ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f7f9f9',
    alignItems: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    color: '#555',
    marginBottom: 20,
    fontSize: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10,
    alignSelf: 'center',
    color: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#fefefe',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    padding: 16,
    alignItems: 'center',
    width: 130,
    margin: 8,
  },
  recentlyUsedCard: {
    borderWidth: 2,
    borderColor: '#1da1f2',
  },
  touchable: {
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recentLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#1da1f2',
    fontWeight: 'bold',
  },
  createProfileContainer: {
    width: '100%',
    maxWidth: 400,
    marginTop: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#1da1f2',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    width: '100%',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default WelcomePage;
