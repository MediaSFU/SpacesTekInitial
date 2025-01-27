import originalData from './db.json';
import { Space, UserProfile, ParticipantData, CreateSpaceOptions } from '../types';

const USE_SERVER = process.env.REACT_APP_USE_API; // Toggle this to switch between local and server mode
const SERVER_URL = process.env.REACT_APP_API_URL

let { users: initialUsers, spaces: initialSpaces } = originalData;

// Load from localStorage if available
const savedUsers = localStorage.getItem('users');
const savedSpaces = localStorage.getItem('spaces');
let users: UserProfile[] = savedUsers ? JSON.parse(savedUsers) : initialUsers;
let spaces: Space[] = savedSpaces ? JSON.parse(savedSpaces) : initialSpaces;

async function serverFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Server error');
  }
  return res.json();
}

async function readFromDb() {
  // Simulate reading from DB
  // In a real application, you'd do a GET request to the server here
  // For now, just simulating by reassigning a global variable.
  // The in-memory array updates won't persist across refreshes.
  // Simulate persistence by reading from localStorage

  if (!USE_SERVER) {
    const savedUsers = localStorage.getItem('users');
    const savedSpaces = localStorage.getItem('spaces');
    users = savedUsers ? JSON.parse(savedUsers) : initialUsers;
    spaces = savedSpaces ? JSON.parse(savedSpaces) : initialSpaces;
  } else {
    const data = await serverFetch(`${SERVER_URL}/api/read`);
    users = data.users;
    spaces = data.spaces;
  }
}

async function writeToDb() {
  // Simulate writing to DB
  // In a real application, you'd do a POST/PUT request to the server here
  // For now, just simulating by reassigning a global variable.
  // The in-memory array updates won't persist across refreshes.
  // Simulate persistence by writing to localStorage
  if (!USE_SERVER) {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('spaces', JSON.stringify(spaces));
  } else {
    const data = await serverFetch(`${SERVER_URL}/api/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users, spaces })
    });
    if (!data.success) {
      throw new Error('Server error');
    }
    if (data.users) {
      users = data.users;
      spaces = data.spaces;
    }
  }
}

export async function fetchUserById(id: string): Promise<UserProfile | undefined> {
  await readFromDb();
  return users.find(u => u.id === id);
}

export async function fetchSpaces(): Promise<Space[]> {
  await readFromDb();
  return Promise.resolve(spaces);
}

export async function fetchSpaceById(id: string): Promise<Space | undefined> {
  await readFromDb();
  return Promise.resolve(spaces.find(space => space.id === id));
}

export async function fetchAvailableUsers(): Promise<UserProfile[]> {
  await readFromDb();
  return Promise.resolve(users.filter(u => !u.taken));
}

export async function markUserAsTaken(userId: string): Promise<void> {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.taken = true;
    await writeToDb();
  }
}

export async function createProfile(displayName: string, avatarUrl?: string): Promise<UserProfile> {
  const uniqueId = Math.random().toString(36).substring(2, 10);
  const newUser: UserProfile = {
    id: uniqueId,
    displayName,
    avatarUrl: avatarUrl || 'https://www.mediasfu.com/logo192.png',
    taken: true
  };
  users.push(newUser);
  await writeToDb();
  return Promise.resolve(newUser);
}

export async function freeUser(userId: string): Promise<void> {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.taken = false;
    await writeToDb();
  }
}

export async function createSpace(
  title: string,
  description: string,
  host: UserProfile,
  options?: CreateSpaceOptions
): Promise<Space> {
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
    duration: options?.duration ?? (15 * 60 * 1000), // default 15min
    endedAt: 0,
    askToJoinQueue: [],
    approvedToJoin: [],
    askToJoinHistory: [],
    banned: [],
    rejectedSpeakers: [],
  };

  spaces.push(newSpace);
  await writeToDb();
  return Promise.resolve(newSpace);
}

export async function updateSpace(spaceId: string, updates: Partial<Space>): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;
  Object.assign(space, updates);
  await writeToDb();
}

export async function endSpace(spaceId: string): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;
  space.active = false;
  space.endedAt = Date.now();
  await writeToDb();
}

export async function joinSpace(spaceId: string, user: UserProfile, asSpeaker: boolean = false, forceAdd = false): Promise<Space | undefined> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return undefined;
  if (space.participants.find(p => p.id === user.id)) {
    return Promise.resolve(space);
  }

  //handle askToJoin
  if (space.askToJoin && !forceAdd && !space.approvedToJoin.includes(user.id)) {
    if (space.askToJoinQueue.includes(user.id)) {
      // Remove from queue
      return Promise.resolve(space);
    } else {
      // Add to queue
      space.askToJoinQueue.push(user.id);
      space.askToJoinHistory.push(user.id);
    }
    await writeToDb();
    return Promise.resolve(space);
  }


  if (!forceAdd) {
    const newParticipant: ParticipantData = {
      id: user.id,
      displayName: user.displayName,
      role: asSpeaker ? 'speaker' : 'listener',
      muted: asSpeaker, // Speakers start muted
      avatarUrl: user.avatarUrl || 'https://www.mediasfu.com/logo192.png'
    };

    space.participants.push(newParticipant);
    if (asSpeaker) {
      space.speakers.push(newParticipant.id);
    } else {
      space.listeners.push(newParticipant.id);
    }
  } else {
    // add to approvedToJoin if not already there
    if (!space.approvedToJoin.includes(user.id)) {
      space.approvedToJoin.push(user.id);
    }
  }

  //remove from askToJoinQueue and remove from history
  space.askToJoinQueue = space.askToJoinQueue.filter(id => id !== user.id);
  space.askToJoinHistory = space.askToJoinHistory.filter(id => id !== user.id);

  await writeToDb();
  return Promise.resolve(space);
}


export async function muteParticipant(spaceId: string, targetId: string, muted: boolean): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;
  const participant = space.participants.find(p => p.id === targetId);
  if (participant) participant.muted = muted;

  await writeToDb();
}

export async function requestToSpeak(spaceId: string, userId: string): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space || !space.askToSpeak) return;

  // If user is already a speaker or host, no need to request
  const participant = space.participants.find(p => p.id === userId);
  if (!participant) return;

  if (participant.role === 'listener') {
    // Add to queue
    if (!space.askToSpeakQueue.includes(userId)) {
      space.askToSpeakQueue.push(userId);
      space.askToSpeakHistory.push(userId);
      space.askToSpeakTimestamps[userId] = Date.now();

      // change role to requested
      participant.role = 'requested';
      await writeToDb();
    }
  }
}

export async function approveRequest(spaceId: string, userId: string, asSpeaker: boolean): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;
  const participant = space.participants.find(p => p.id === userId);
  if (!participant) return;

  if (participant.role === 'requested') {
    // Approve them as either speaker or listener
    participant.role = asSpeaker ? 'speaker' : 'listener';
    participant.muted = asSpeaker; // if speaker, start muted
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

export async function rejectRequest(spaceId: string, userId: string): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;
  const participantIndex = space.participants.findIndex(p => p.id === userId);
  if (participantIndex !== -1) {
    // Remove from askToSpeakQueue
    space.askToSpeakQueue = space.askToSpeakQueue.filter(id => id !== userId);

    // Add to history
    space.askToSpeakHistory.push(userId);

    // Change role back to listener
    space.participants[participantIndex].role = 'listener';

    // Add to rejectedSpeakers
    space.rejectedSpeakers.push(userId);

    await writeToDb();
  }
}

export async function grantSpeakingRole(spaceId: string, userId: string): Promise<void> {
  // Host or automatic logic decides that a listener in queue becomes speaker
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;
  const participant = space.participants.find(p => p.id === userId);
  if (!participant) return;

  // Remove from listeners if there
  space.listeners = space.listeners.filter(id => id !== userId);

  // Update role
  participant.role = 'speaker';
  participant.muted = true; // start muted
  space.speakers.push(userId);

  // Remove from askToSpeakQueue
  space.askToSpeakQueue = space.askToSpeakQueue.filter(id => id !== userId);

  await writeToDb();
}

export async function approveJoinRequest(spaceId: string, userId: string, asSpeaker: boolean): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;
  const participantExist = space.participants.find(p => p.id === userId);
  if (participantExist) return;
  //check queue
  const participantID = space.askToJoinQueue.find(p => p === userId);
  if (!participantID) return;
  const participant = users.find(p => p.id === userId);
  if (!participant) return;
  await joinSpace(spaceId, participant, asSpeaker, true);

  await writeToDb();
}

export async function rejectJoinRequest(spaceId: string, userId: string): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;

  // Remove from participants
  space.participants = space.participants.filter(p => p.id !== userId);

  // Remove from join queue
  space.askToJoinQueue = space.askToJoinQueue.filter(id => id !== userId);

  // Add to join history
  space.askToJoinHistory.push(userId);

  await writeToDb();
}

export async function leaveSpace(spaceId: string, userId: string): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;

  const participantIndex = space.participants.findIndex(p => p.id === userId);
  if (participantIndex > -1) {
    const p = space.participants[participantIndex];
    space.participants.splice(participantIndex, 1);

    // Remove from role arrays
    if (p.id === space.host) {
      // If host leaves, the space might end or reassign host (for simplicity, just end or do nothing)
      space.active = false;
      space.endedAt = Date.now();
    }

    if (p.role === 'speaker') {
      space.speakers = space.speakers.filter(id => id !== p.id);
    } else if (p.role === 'listener') {
      space.listeners = space.listeners.filter(id => id !== p.id);
    }

    // Also remove from askToSpeakQueue if there
    space.askToSpeakQueue = space.askToSpeakQueue.filter(id => id !== userId);

    await writeToDb();
  }
}

export async function banParticipant(spaceId: string, userId: string): Promise<void> {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;

  // Remove from participants
  space.participants = space.participants.filter(p => p.id !== userId);

  // Remove from roles
  space.speakers = space.speakers.filter(id => id !== userId);
  space.listeners = space.listeners.filter(id => id !== userId);

  // Remove from join queue
  space.askToJoinQueue = space.askToJoinQueue.filter(id => id !== userId);

  // Add to banned list
  space.banned.push(userId);

  await writeToDb();

  // if host is banned, end the space
  if (userId === space.host) {
    await endSpace(spaceId);
  }
}
