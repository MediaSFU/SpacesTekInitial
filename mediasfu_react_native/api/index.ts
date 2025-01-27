import originalData from './db.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Space, UserProfile, ParticipantData, CreateSpaceOptions } from '../types';

const USE_SERVER = true; // Set to `false` to use local storage
const SERVER_URL = 'http://10.0.0.125:3001';

let { users: initialUsers, spaces: initialSpaces } = originalData;

// In-memory data storage
let users: UserProfile[] = initialUsers;
let spaces: Space[] = initialSpaces;

/**
 * Helper function to fetch data from the server
 * @param path - API endpoint
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
async function serverFetch(path: string, options?: RequestInit) {
  try {
    const res = await fetch(path, options);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Server error');
    }
    return res.json();
  } catch (error) {
    console.error(`Server fetch error at ${path}:`, error);
    throw error;
  }
}

/**
 * Reads data from local storage or server based on USE_SERVER flag
 */
async function readFromDb() {
  // Simulate reading from DB
  // In a real application, you'd do a GET request to the server here
  // For now, just simulating by reassigning a global variable.
  // The in-memory array updates won't persist across refreshes.
  // Simulate persistence by reading from localStorage

  if (!USE_SERVER) {
    try {
      const [savedUsers, savedSpaces] = await Promise.all([
        getStoredData('users'),
        getStoredData('spaces'),
      ]);
      users = savedUsers || initialUsers;
      spaces = savedSpaces || initialSpaces;
    } catch (error) {
      console.error('Error reading from local storage:', error);
      users = initialUsers;
      spaces = initialSpaces;
    }
  } else {
    try {
      const data = await serverFetch(`${SERVER_URL}/api/read`);
      users = data.users || initialUsers;
      spaces = data.spaces || initialSpaces;
    } catch (error) {
      console.error('Error reading from server:', error);
      users = initialUsers;
      spaces = initialSpaces;
    }
  }
}

/**
 * Writes data to local storage or server based on USE_SERVER flag
 */
async function writeToDb() {
  // Simulate writing to DB
  // In a real application, you'd do a POST/PUT request to the server here
  // For now, just simulating by reassigning a global variable.
  // The in-memory array updates won't persist across refreshes.
  // Simulate persistence by writing to localStorage
  if (!USE_SERVER) {
    try {
      await Promise.all([
        setStoredData('users', users),
        setStoredData('spaces', spaces),
      ]);
    } catch (error) {
      console.error('Error writing to local storage:', error);
      throw error;
    }
  } else {
    try {
      const data = await serverFetch(`${SERVER_URL}/api/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users, spaces }),
      });
      if (!data.success) {
        throw new Error('Server error during write operation');
      }
      if (data.users) {
        users = data.users;
      }
      if (data.spaces) {
        spaces = data.spaces;
      }
    } catch (error) {
      console.error('Error writing to server:', error);
      throw error;
    }
  }
}

/**
 * Retrieves stored data from AsyncStorage
 * @param key - Storage key
 * @returns Parsed JSON data or null
 */
async function getStoredData(key: string): Promise<any | null> {
  try {
    const storedData = await AsyncStorage.getItem(key);
    return storedData ? JSON.parse(storedData) : null;
  } catch (error) {
    console.error(`Error getting data for key "${key}":`, error);
    return null;
  }
}

/**
 * Stores data in AsyncStorage
 * @param key - Storage key
 * @param value - Data to store
 */
async function setStoredData(key: string, value: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting data for key "${key}":`, error);
    throw error;
  }
}

/**
 * Fetch a user by ID
 * @param id - User ID
 * @returns UserProfile or undefined
 */
export async function fetchUserById(id: string): Promise<UserProfile | undefined> {
  await readFromDb();
  return users.find(u => u.id === id);
}

/**
 * Fetch all spaces
 * @returns Array of Space objects
 */
export async function fetchSpaces(): Promise<Space[]> {
  await readFromDb();
  return spaces;
}

/**
 * Fetch a specific space by ID
 * @param id - Space ID
 * @returns Space or undefined
 */
export async function fetchSpaceById(id: string): Promise<Space | undefined> {
  await readFromDb();
  return spaces.find(space => space.id === id);
}

/**
 * Fetch available users who are not taken
 * @returns Array of UserProfile objects
 */
export async function fetchAvailableUsers(): Promise<UserProfile[]> {
  await readFromDb();
  return users.filter(u => !u.taken);
}

/**
 * Mark a user as taken
 * @param userId - User ID
 */
export async function markUserAsTaken(userId: string): Promise<void> {
  await readFromDb();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.taken = true;
    await writeToDb();
  }
}

/**
 * Create a new user profile
 * @param displayName - User's display name
 * @param avatarUrl - (Optional) Avatar URL
 * @returns Created UserProfile
 */
export async function createProfile(displayName: string, avatarUrl?: string): Promise<UserProfile> {
  await readFromDb();
  const uniqueId = Math.random().toString(36).substring(2, 10);
  const newUser: UserProfile = {
    id: uniqueId,
    displayName,
    avatarUrl: avatarUrl || 'https://www.mediasfu.com/logo192.png',
    taken: true,
  };
  users.push(newUser);
  await writeToDb();
  return newUser;
}

/**
 * Free a user (mark as not taken)
 * @param userId - User ID
 */
export async function freeUser(userId: string): Promise<void> {
  await readFromDb();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.taken = false;
    await writeToDb();
  }
}

/**
 * Create a new space
 * @param title - Title of the space
 * @param description - Description of the space
 * @param host - Host user profile
 * @param options - (Optional) Additional space options
 * @returns Created Space
 */
export async function createSpace(
  title: string,
  description: string,
  host: UserProfile,
  options?: CreateSpaceOptions
): Promise<Space> {
  await readFromDb();
  const spaceId = Math.random().toString(36).substring(2, 10);
  const remoteName = 'remote_' + Math.random().toString(36).substring(2, 10);
  const hostParticipant: ParticipantData = {
    id: host.id,
    displayName: host.displayName,
    role: 'host',
    muted: false,
    avatarUrl: host.avatarUrl || 'https://www.mediasfu.com/logo192.png',
  };
  const startedAt = options?.startTime || Date.now();

  const newSpace: Space = {
    id: spaceId,
    title,
    description,
    remoteName,
    participants: [hostParticipant],
    host: hostParticipant.id,
    speakers: [],
    listeners: [],
    startedAt,
    active: true,
    capacity: options?.capacity ?? 100,
    askToSpeak: options?.askToSpeak ?? false,
    askToSpeakQueue: [],
    askToSpeakHistory: [],
    askToSpeakTimestamps: {},
    askToJoin: options?.askToJoin ?? false,
    duration: options?.duration ?? 15 * 60 * 1000, // default 15 minutes
    endedAt: 0,
    askToJoinQueue: [],
    approvedToJoin: [],
    askToJoinHistory: [],
    banned: [],
    rejectedSpeakers: [],
  };

  spaces.push(newSpace);
  await writeToDb();
  return newSpace;
}

/**
 * Update a space with partial data
 * @param spaceId - Space ID
 * @param updates - Partial Space data to update
 */
export async function updateSpace(spaceId: string, updates: Partial<Space>): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }
  Object.assign(space, updates);
  await writeToDb();
}

/**
 * End a space
 * @param spaceId - Space ID
 */
export async function endSpace(spaceId: string): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }
  space.active = false;
  space.endedAt = Date.now();
  await writeToDb();
}

/**
 * Join a space
 * @param spaceId - Space ID
 * @param user - UserProfile of the joining user
 * @param asSpeaker - Whether to join as a speaker
 * @param forceAdd - Forcefully add the user, bypassing queues
 * @returns Updated Space or undefined
 */
export async function joinSpace(
  spaceId: string,
  user: UserProfile,
  asSpeaker: boolean = false,
  forceAdd = false
): Promise<Space | undefined> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return undefined; }

  if (space.participants.find(p => p.id === user.id)) {
    return space;
  }

  // Handle askToJoin
  if (space.askToJoin && !forceAdd && !space.approvedToJoin.includes(user.id)) {
    if (space.askToJoinQueue.includes(user.id)) {
      // User already in queue
      return space;
    } else {
      // Add user to queue
      space.askToJoinQueue.push(user.id);
      space.askToJoinHistory.push(user.id);
      await writeToDb();
      return space;
    }
  }

  if (!forceAdd) {
    const newParticipant: ParticipantData = {
      id: user.id,
      displayName: user.displayName,
      role: asSpeaker ? 'speaker' : 'listener',
      muted: asSpeaker, // Speakers start muted
      avatarUrl: user.avatarUrl || 'https://www.mediasfu.com/logo192.png',
    };

    space.participants.push(newParticipant);
    if (asSpeaker) {
      space.speakers.push(newParticipant.id);
    } else {
      space.listeners.push(newParticipant.id);
    }
  } else {
    // Add to approvedToJoin if not already there
    if (!space.approvedToJoin.includes(user.id)) {
      space.approvedToJoin.push(user.id);
    }
  }

  // Remove from askToJoinQueue and history
  space.askToJoinQueue = space.askToJoinQueue.filter(id => id !== user.id);
  space.askToJoinHistory = space.askToJoinHistory.filter(id => id !== user.id);

  await writeToDb();
  return space;
}

/**
 * Mute or unmute a participant
 * @param spaceId - Space ID
 * @param targetId - Participant ID
 * @param muted - Mute status
 */
export async function muteParticipant(spaceId: string, targetId: string, muted: boolean): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }
  const participant = space.participants.find(p => p.id === targetId);
  if (participant) {
    participant.muted = muted;
    await writeToDb();
  }
}

/**
 * Request to speak in a space
 * @param spaceId - Space ID
 * @param userId - User ID requesting to speak
 */
export async function requestToSpeak(spaceId: string, userId: string): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space || !space.askToSpeak) { return; }

  const participant = space.participants.find(p => p.id === userId);
  if (!participant) { return; }

  if (participant.role === 'listener') {
    // Add to queue
    if (!space.askToSpeakQueue.includes(userId)) {
      space.askToSpeakQueue.push(userId);
      space.askToSpeakHistory.push(userId);
      space.askToSpeakTimestamps[userId] = Date.now();

      // Change role to 'requested'
      participant.role = 'requested';
      await writeToDb();
    }
  }
}

/**
 * Approve a user's request to speak
 * @param spaceId - Space ID
 * @param userId - User ID
 * @param asSpeaker - Whether to approve as a speaker
 */
export async function approveRequest(spaceId: string, userId: string, asSpeaker: boolean): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }
  const participant = space.participants.find(p => p.id === userId);
  if (!participant) { return; }

  if (participant.role === 'requested') {
    // Approve as speaker or listener
    participant.role = asSpeaker ? 'speaker' : 'listener';
    participant.muted = asSpeaker; // Speakers start muted

    if (asSpeaker) {
      space.speakers.push(participant.id);
      // remove from listeners if previously there
      space.listeners = space.listeners.filter(id => id !== userId);
    } else {
      space.listeners.push(participant.id);
    }

    //update the participant in the space
    const index = space.participants.findIndex(p => p.id === userId);
    if (index !== -1) {
      space.participants[index] = participant;
    }

    // Remove from askToSpeakQueue
    space.askToSpeakQueue = space.askToSpeakQueue.filter(id => id !== userId);

    await writeToDb();
  }
}

/**
 * Reject a user's request to speak
 * @param spaceId - Space ID
 * @param userId - User ID
 */
export async function rejectRequest(spaceId: string, userId: string): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }

  const participantIndex = space.participants.findIndex(p => p.id === userId);
  if (participantIndex !== -1) {
    // Remove from askToSpeakQueue
    space.askToSpeakQueue = space.askToSpeakQueue.filter(id => id !== userId);

    // Add to askToSpeakHistory
    space.askToSpeakHistory.push(userId);

    // Change role back to 'listener'
    space.participants[participantIndex].role = 'listener';

    // Add to rejectedSpeakers
    space.rejectedSpeakers.push(userId);

    await writeToDb();
  }
}

/**
 * Grant speaking role to a user
 * @param spaceId - Space ID
 * @param userId - User ID
 */
export async function grantSpeakingRole(spaceId: string, userId: string): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }
  const participant = space.participants.find(p => p.id === userId);
  if (!participant) { return; }

  // Remove from listeners
  space.listeners = space.listeners.filter(id => id !== userId);

  // Update role to 'speaker'
  participant.role = 'speaker';
  participant.muted = true; // Start muted
  space.speakers.push(userId);

  // Remove from askToSpeakQueue
  space.askToSpeakQueue = space.askToSpeakQueue.filter(id => id !== userId);

  await writeToDb();
}

/**
 * Approve a user's request to join a space
 * @param spaceId - Space ID
 * @param userId - User ID
 * @param asSpeaker - Whether to approve as a speaker
 */
export async function approveJoinRequest(spaceId: string, userId: string, asSpeaker: boolean): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }

  const participantExist = space.participants.find(p => p.id === userId);
  if (participantExist) { return; }

  // Check if user is in the askToJoinQueue
  const isInQueue = space.askToJoinQueue.includes(userId);
  if (!isInQueue) { return; }

  const participant = users.find(p => p.id === userId);
  if (!participant) { return; }

  await joinSpace(spaceId, participant, asSpeaker, true);

  await writeToDb();
}

/**
 * Reject a user's request to join a space
 * @param spaceId - Space ID
 * @param userId - User ID
 */
export async function rejectJoinRequest(spaceId: string, userId: string): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }

  // Remove from participants
  space.participants = space.participants.filter(p => p.id !== userId);

  // Remove from join queue
  space.askToJoinQueue = space.askToJoinQueue.filter(id => id !== userId);

  // Add to join history
  space.askToJoinHistory.push(userId);

  await writeToDb();
}

/**
 * Leave a space
 * @param spaceId - Space ID
 * @param userId - User ID
 */
export async function leaveSpace(spaceId: string, userId: string): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }

  const participantIndex = space.participants.findIndex(p => p.id === userId);
  if (participantIndex > -1) {
    const participant = space.participants[participantIndex];
    space.participants.splice(participantIndex, 1);

    // Remove from role arrays
    if (participant.id === space.host) {
      // If host leaves, end the space
      space.active = false;
      space.endedAt = Date.now();
    }

    if (participant.role === 'speaker') {
      space.speakers = space.speakers.filter(id => id !== participant.id);
    } else if (participant.role === 'listener') {
      space.listeners = space.listeners.filter(id => id !== participant.id);
    }

    // Also remove from askToSpeakQueue if present
    space.askToSpeakQueue = space.askToSpeakQueue.filter(id => id !== userId);

    await writeToDb();
  }
}

/**
 * Ban a participant from a space
 * @param spaceId - Space ID
 * @param userId - User ID
 */
export async function banParticipant(spaceId: string, userId: string): Promise<void> {
  await readFromDb();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) { return; }

  // Remove from participants
  space.participants = space.participants.filter(p => p.id !== userId);

  // Remove from role arrays
  space.speakers = space.speakers.filter(id => id !== userId);
  space.listeners = space.listeners.filter(id => id !== userId);

  // Remove from join queue
  space.askToJoinQueue = space.askToJoinQueue.filter(id => id !== userId);

  // Add to banned list
  space.banned.push(userId);

  await writeToDb();

  // If host is banned, end the space
  if (userId === space.host) {
    await endSpace(spaceId);
  }
}
