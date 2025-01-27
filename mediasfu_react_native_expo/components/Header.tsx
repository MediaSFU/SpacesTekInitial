import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 as Icon } from '@expo/vector-icons';
import { freeUser, fetchUserById } from '../api';
import { UserProfile } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Header: React.FC = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const currentUserId = await AsyncStorage.getItem('currentUserId');
      if (currentUserId) {
        const user = await fetchUserById(currentUserId);
        if (user) {
          setCurrentUser({
            ...user,
            avatarUrl: user.avatarUrl || 'https://www.mediasfu.com/logo192.png',
          });
        }else{
          await AsyncStorage.removeItem('currentUserId');
          router.replace({ pathname: '/welcome' });
        }
      }
    };
    fetchCurrentUser();
  }, []);

  const handleLogout = async () => {
    const currentUserId = await AsyncStorage.getItem('currentUserId');
    if (currentUserId) {
      try {
        await freeUser(currentUserId);
        await AsyncStorage.setItem('lastUserId', currentUserId);
        await AsyncStorage.removeItem('currentUserId');
        router.replace({ pathname: '/welcome' });
      } catch (error) {
        Alert.alert('Error', 'Failed to logout. Please try again.');
        console.error('Logout Error:', error);
      }
    } else {
      router.replace({ pathname: '/welcome' });
    }
  };

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={styles.appNameContainer}
        onPress={() => router.replace({ pathname: '/' })}
      >
        <Text style={styles.appNameText}>SpacesTek</Text>
      </TouchableOpacity>

      {currentUser && (
        <View style={styles.userContainer}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <Image
              source={{ uri: currentUser.avatarUrl }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <Text style={styles.userName}>{currentUser.displayName}</Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="sign-out-alt" size={20} color="#1da1f2" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
    top: 0,
    zIndex: 1000,
    width: '100%',
    maxWidth: 1000,
    marginHorizontal: 'auto',
  },
  appNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    cursor: 'pointer',
  },
  appNameText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#333',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    objectFit: 'cover',
  },
  userName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  logoutText: {
    color: '#1da1f2',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Header;
