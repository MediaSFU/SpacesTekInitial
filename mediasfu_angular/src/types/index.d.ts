export interface CreateSpaceOptions {
  capacity?: number;
  askToSpeak?: boolean;
  askToJoin?: boolean;
  startTime?: number;
  duration?: number; // in ms
}

export interface ParticipantData {
  id: string; // Unique ID for SDK
  displayName: string;
  role: 'host' | 'speaker' | 'listener' | 'requested';
  muted: boolean;
  avatarUrl?: string;
}

export interface Space {
  id: string;
  title: string;
  description: string;
  remoteName: string; // Used by the media server
  participants: ParticipantData[];
  host: string; // host participant ID
  speakers: string[]; // array of participant IDs
  listeners: string[]; // array of participant IDs
  startedAt: number;
  endedAt?: number;
  active: boolean;
  capacity: number;
  duration?: number; // in ms
  askToSpeak: boolean;
  askToSpeakQueue: string[]; // participant IDs requesting to speak
  askToSpeakHistory: string[]; // participant IDs who have requested in the past
  askToSpeakTimestamps: Record<string, number>; // participantID -> timestamp
  askToJoin: boolean;
  askToJoinQueue: string[]; // participant IDs requesting to join
  approvedToJoin: string[]; // participant IDs approved to join
  askToJoinHistory: string[]; // participant IDs who have requested in the past
  banned: string[]; // participant IDs banned from the space
  rejectedSpeakers: string[]; // participant IDs rejected from speaking
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  taken: boolean;
  password?: string; // optional if we introduce password
}

