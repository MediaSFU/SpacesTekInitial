import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Space, UserProfile, ParticipantData, CreateSpaceOptions } from '../../types';
import { firstValueFrom } from 'rxjs';
import originalData from './db.json';

export interface OriginalData {
  users: UserProfile[];
  spaces: Space[];
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly USE_SERVER = true; // Toggle to switch between local and server mode
  private readonly SERVER_URL = 'http://10.0.0.125:3001';

  private users: UserProfile[] = [];
  private spaces: Space[] = [];

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  /**
   * Loads initial data from server or local storage.
   */
  private async loadInitialData(): Promise<void> {
    if (!this.USE_SERVER) {
      const savedUsers = localStorage.getItem('users');
      const savedSpaces = localStorage.getItem('spaces');

      const typedOriginalData = originalData as OriginalData;
      this.users = savedUsers ? JSON.parse(savedUsers) : typedOriginalData?.users;
      this.spaces = savedSpaces ? JSON.parse(savedSpaces) : typedOriginalData?.spaces;
    } else {
      try {
        const data = await this.serverFetch(`${this.SERVER_URL}/api/read`);
        this.users = data.users || [];
        this.spaces = data.spaces || [];
      } catch (error) {
        console.error('Error loading data from server:', error);
      }
    }
  }

  /**
   * Saves current data to server or local storage.
   */
  private async writeToDb(): Promise<void> {
    if (!this.USE_SERVER) {
      localStorage.setItem('users', JSON.stringify(this.users));
      localStorage.setItem('spaces', JSON.stringify(this.spaces));
    } else {
      try {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        const body = { users: this.users, spaces: this.spaces };
        const response = await firstValueFrom(
          this.http.post<{ success: boolean; users?: UserProfile[]; spaces?: Space[] }>(
            `${this.SERVER_URL}/api/write`,
            body,
            { headers }
          )
        );

        if (!response.success) {
          throw new Error('Server error');
        }

        if (response.users && response.spaces) {
          this.users = response.users;
          this.spaces = response.spaces;
        }
      } catch (error) {
        console.error('Error saving data to server:', error);
        throw error;
      }
    }
  }

  /**
   * Fetches data from the server using HttpClient.
   * @param path The API endpoint.
   * @param options Optional HTTP options.
   */
  private async serverFetch(path: string, options?: any): Promise<any> {
    try {
      const response = await firstValueFrom(this.http.get(path, options));
      return response;
    } catch (error: any) {
      const errorMessage = error.error?.error || 'Server error';
      throw new Error(errorMessage);
    }
  }

  /**
   * Fetches a user by their ID.
   * @param id The user's ID.
   */
  async fetchUserById(id: string): Promise<UserProfile | undefined> {
    await this.loadInitialData();
    return this.users.find((user) => user.id === id);
  }

  /**
   * Fetches all spaces.
   */
  async fetchSpaces(): Promise<Space[]> {
    await this.loadInitialData();
    return this.spaces;
  }

  /**
   * Fetches a space by its ID.
   * @param id The space's ID.
   */
  async fetchSpaceById(id: string): Promise<Space | undefined> {
    await this.loadInitialData();
    return this.spaces.find((space) => space.id === id);
  }

  /**
   * Fetches available users (not taken).
   */
  async fetchAvailableUsers(): Promise<UserProfile[]> {
    await this.loadInitialData();
    return this.users.filter((user) => !user.taken);
  }

  /**
   * Marks a user as taken.
   * @param userId The user's ID.
   */
  async markUserAsTaken(userId: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.taken = true;
      await this.writeToDb();
    }
  }

  /**
   * Creates a new user profile.
   * @param displayName The display name of the user.
   * @param avatarUrl Optional avatar URL.
   */
  async createProfile(displayName: string, avatarUrl?: string): Promise<UserProfile> {
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const newUser: UserProfile = {
      id: uniqueId,
      displayName,
      avatarUrl: avatarUrl || 'https://www.mediasfu.com/logo192.png',
      taken: true,
    };
    this.users.push(newUser);
    await this.writeToDb();
    return newUser;
  }

  /**
   * Frees a user (marks as not taken).
   * @param userId The user's ID.
   */
  async freeUser(userId: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.taken = false;
      await this.writeToDb();
    }
  }

  /**
   * Creates a new space.
   * @param title The title of the space.
   * @param description The description of the space.
   * @param host The host user profile.
   * @param options Optional space creation options.
   */
  async createSpace(
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
      duration: options?.duration ?? 15 * 60 * 1000, // default 15 minutes
      endedAt: 0,
      askToJoinQueue: [],
      approvedToJoin: [],
      askToJoinHistory: [],
      banned: [],
      rejectedSpeakers: [],
    };

    this.spaces.push(newSpace);
    await this.writeToDb();
    return newSpace;
  }

  /**
   * Updates an existing space with provided partial updates.
   * @param spaceId The space's ID.
   * @param updates Partial updates to apply.
   */
  async updateSpace(spaceId: string, updates: Partial<Space>): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;
    Object.assign(space, updates);
    await this.writeToDb();
  }

  /**
   * Ends a space by setting it as inactive and recording the end time.
   * @param spaceId The space's ID.
   */
  async endSpace(spaceId: string): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;
    space.active = false;
    space.endedAt = Date.now();
    await this.writeToDb();
  }

  /**
   * Joins a space, optionally as a speaker or forcing addition.
   * @param spaceId The space's ID.
   * @param user The user profile.
   * @param asSpeaker Whether to join as a speaker.
   * @param forceAdd Whether to force add the user regardless of join requests.
   */
  async joinSpace(
    spaceId: string,
    user: UserProfile,
    asSpeaker: boolean = false,
    forceAdd: boolean = false
  ): Promise<Space | undefined> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;

    // check if user is banned
    if (space.banned.includes(user.id)) return;

    // If the user is already a participant, return the space
    if (space.participants.find((p: { id: any; }) => p.id === user.id)) return space;

    // Handle askToJoin logic
    if (space.askToJoin && !forceAdd && !space.approvedToJoin.includes(user.id)) {
      if (space.askToJoinQueue.includes(user.id)) {
        // Remove from queue
        return Promise.resolve(space);
      } else {
        // Add to queue
        space.askToJoinQueue.push(user.id);
        space.askToJoinHistory.push(user.id);
      }
      await this.writeToDb();
      return space;
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
      // add to approvedToJoin if not already there
      if (!space.approvedToJoin.includes(user.id)) {
        space.approvedToJoin.push(user.id);
      }
    }

    // Remove from askToJoinQueue and askToJoinHistory
    space.askToJoinQueue = space.askToJoinQueue.filter((id: any) => id !== user.id);
    space.askToJoinHistory = space.askToJoinHistory.filter((id: any) => id !== user.id);

    await this.writeToDb();
    return space;
  }

  /**
   * Mutes or unmutes a participant in a space.
   * @param spaceId The space's ID.
   * @param targetId The participant's ID.
   * @param muted Whether to mute the participant.
   */
  async muteParticipant(spaceId: string, targetId: string, muted: boolean): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;
    const participant = space.participants.find((p: { id: string; }) => p.id === targetId);
    if (participant) participant.muted = muted;
    await this.writeToDb();
  }

  /**
   * Requests to speak in a space.
   * @param spaceId The space's ID.
   * @param userId The user's ID.
   */
  async requestToSpeak(spaceId: string, userId: string): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space || !space.askToSpeak) return;

    const participant = space.participants.find((p: { id: string; }) => p.id === userId);
    if (participant?.role === 'listener' && !space.askToSpeakQueue.includes(userId)) {
      space.askToSpeakQueue.push(userId);
      space.askToSpeakHistory.push(userId);
      space.askToSpeakTimestamps[userId] = Date.now();

      // change role to requested
      participant.role = 'requested';
      await this.writeToDb();
    }
  }

  /**
   * Approves a speak request.
   * @param spaceId The space's ID.
   * @param userId The user's ID.
   * @param asSpeaker Whether to approve as a speaker.
   */
  async approveRequest(spaceId: string, userId: string, asSpeaker: boolean): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;
    const participant = space.participants.find((p: { id: string; }) => p.id === userId);
    if (!participant) return;

    if (participant.role === 'requested') {
      // Approve as speaker or listener
      participant.role = asSpeaker ? 'speaker' : 'listener';
      participant.muted = asSpeaker; // If speaker, start muted
      if (asSpeaker) {
        space.speakers.push(participant.id);
        // Remove from listeners if previously there
        space.listeners = space.listeners.filter((id: string) => id !== userId);
      } else {
        space.listeners.push(participant.id);
      }

      //update the participant in the space
      const index = space.participants.findIndex((p: { id: string; }) => p.id === userId);
      if (index !== -1) {
        space.participants[index] = participant;
      }

      // Remove from askToSpeakQueue
      space.askToSpeakQueue = space.askToSpeakQueue.filter((id: string) => id !== userId);
      await this.writeToDb();
    }
  }

  /**
   * Rejects a speak request.
   * @param spaceId The space's ID.
   * @param userId The user's ID.
   */
  async rejectRequest(spaceId: string, userId: string): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;
    const participantIndex = space.participants.findIndex((p: { id: string; }) => p.id === userId);
    if (participantIndex !== -1) {
      // Remove from askToSpeakQueue
      space.askToSpeakQueue = space.askToSpeakQueue.filter((id: string) => id !== userId);
      // Add to askToSpeakHistory
      space.askToSpeakHistory.push(userId);

      // change role to listener
      space.participants[participantIndex].role = 'listener';

      // Add to rejectedSpeakers
      space.rejectedSpeakers.push(userId);

      await this.writeToDb();
    }
  }

  /**
 * Requests to join a space.
 * @param spaceId The space's ID.
 * @param userId The user's ID.
 */

  async grantSpeakingRole(spaceId: string, userId: string): Promise<void> {
    // Host or automatic logic decides that a listener in queue becomes speaker
    const space = this.spaces.find(s => s.id === spaceId);
    if (!space) return;
    const participant = space.participants.find((p: { id: string; }) => p.id === userId);
    if (!participant) return;

    // Remove from listeners if there
    space.listeners = space.listeners.filter((id: string) => id !== userId);
    // Update role
    participant.role = 'speaker';
    participant.muted = true; // start muted
    space.speakers.push(userId);

    // Remove from askToSpeakQueue
    space.askToSpeakQueue = space.askToSpeakQueue.filter((id: string) => id !== userId);

    await this.writeToDb();
  }


  /**
   * Approves a join request, optionally as a speaker.
   * @param spaceId The space's ID.
   * @param userId The user's ID.
   * @param asSpeaker Whether to approve as a speaker.
   */
  async approveJoinRequest(spaceId: string, userId: string, asSpeaker: boolean): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;
    const participantExist = space.participants.find((p: { id: string; }) => p.id === userId);
    if (participantExist) return;

    //check queue
    const participantID = space.askToJoinQueue.find((p: string) => p === userId);
    if (!participantID) return;
    const participant = this.users.find(p => p.id === userId);
    if (!participant) return;
    await this.joinSpace(spaceId, participant, asSpeaker, true);

    await this.writeToDb();
  }

  /**
   * Rejects a join request.
   * @param spaceId The space's ID.
   * @param userId The user's ID.
   */
  async rejectJoinRequest(spaceId: string, userId: string): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;

    // Remove from participants
    space.participants = space.participants.filter((p: { id: string; }) => p.id !== userId);

    // Remove from join queue
    space.askToJoinQueue = space.askToJoinQueue.filter((id: string) => id !== userId);

    // Add to join history
    space.askToJoinHistory.push(userId);

    await this.writeToDb();
  }

  /**
   * Leaves a space.
   * @param spaceId The space's ID.
   * @param userId The user's ID.
   */
  async leaveSpace(spaceId: string, userId: string): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;

    const participantIndex = space.participants.findIndex((p: { id: string; }) => p.id === userId);
    if (participantIndex > -1) {
      const p = space.participants[participantIndex];
      space.participants.splice(participantIndex, 1);

      // If the participant is the host, end the space
      if (p.id === space.host) {
        // If host leaves, the space might end or reassign host (for simplicity, just end or do nothing)
        space.active = false;
        space.endedAt = Date.now();
      }

      // Remove from role arrays
      if (p.role === 'speaker') {
        space.speakers = space.speakers.filter((id: any) => id !== p.id);
      } else if (p.role === 'listener') {
        space.listeners = space.listeners.filter((id: any) => id !== p.id);
      }

      // Remove from askToSpeakQueue if present
      space.askToSpeakQueue = space.askToSpeakQueue.filter((id: string) => id !== userId);

      await this.writeToDb();
    }
  }

  /**
   * Bans a participant from a space.
   * @param spaceId The space's ID.
   * @param userId The user's ID.
   */
  async banParticipant(spaceId: string, userId: string): Promise<void> {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;

    // Remove from participants
    space.participants = space.participants.filter((p: { id: string; }) => p.id !== userId);

    // Remove from role arrays
    space.speakers = space.speakers.filter((id: string) => id !== userId);
    space.listeners = space.listeners.filter((id: string) => id !== userId);

    // Remove from askToSpeakQueue
    space.askToSpeakQueue = space.askToSpeakQueue.filter((id: string) => id !== userId);

    // Remove from askToJoinQueue
    space.askToJoinQueue = space.askToJoinQueue.filter((id: string) => id !== userId);

    // Add to banned
    space.banned.push(userId);

    await this.writeToDb();

    // If the participant is the host, end the space
    if (userId === space.host) {
      await this.endSpace(spaceId);
    }
  }
}
