import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api/api.service';
import { Space, ParticipantData } from '../../../types';
import {
  faMicrophone, faMicrophoneSlash, faCrown, faSignOutAlt, faUserSlash, faCheck, faTimes, faArrowLeft, faPowerOff, faUsers, faEye,
  faCheckCircle, faClock, faFlagCheckered, faSyncAlt, faCamera, faArrowRight
} from '@fortawesome/free-solid-svg-icons';


import { ModalComponent } from '../modal-components/modal.component';
import { ParticipantCardComponent } from '../participant-card-components/participant-card.component';
import { SpinnerComponent } from '../spinner-components/spinner.component';



@Component({
  selector: 'app-space-details',
  templateUrl: './space-details.component.html',
  styleUrls: ['./space-details.component.css'],
  providers: [ApiService],
  imports: [CommonModule, FormsModule, FontAwesomeModule, ModalComponent,
    ParticipantCardComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceDetailsComponent implements OnInit, OnDestroy {
  // FontAwesome Icons
  faMicrophone = faMicrophone;
  faMicrophoneSlash = faMicrophoneSlash;
  faCrown = faCrown;
  faSignOutAlt = faSignOutAlt;
  faUserSlash = faUserSlash;
  faCheck = faCheck;
  faTimes = faTimes;
  faArrowLeft = faArrowLeft;
  faPowerOff = faPowerOff;
  faUsers = faUsers;
  faEye = faEye;
  faCheckCircle = faCheckCircle;
  faClock = faClock;
  faFlagCheckered = faFlagCheckered;
  faSyncAlt = faSyncAlt;
  faCamera = faCamera;
  faArrowRight = faArrowRight;

  // State Management with BehaviorSubjects
  space = new BehaviorSubject<Space | null>(null);
  currentUser = new BehaviorSubject<ParticipantData | null>(null);
  message = new BehaviorSubject<string>('');
  isLoading = new BehaviorSubject<boolean>(true);
  canSpeak = new BehaviorSubject<boolean>(false);
  showJoinRequests = new BehaviorSubject<boolean>(false);
  showSpeakRequests = new BehaviorSubject<boolean>(false);
  alertedRemainingTime = new BehaviorSubject<boolean>(false);
  isMuted = new BehaviorSubject<boolean>(true);

  isConnected = new BehaviorSubject<boolean>(false);
  participants = new BehaviorSubject<ParticipantData[]>([]);

  canJoinNow = new BehaviorSubject<boolean>(false);
  banned = new BehaviorSubject<boolean>(false);

  // Additional Properties
  spaceId: string | null = null;
  refreshSub!: Subscription;


  progress = 0;
  scheduled = false;
  ended = false;
  private previousSpace: Space | null = null;
  private isFetching = false; // Prevent overlapping API calls

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private apiService: ApiService,
  ) { }

  ngOnInit(): void {
    // Retrieve spaceId from route parameters
    this.spaceId = this.route.snapshot.paramMap.get('spaceId');

    // Initial data load
    this.loadSpace(this.spaceId!);

    // Set up interval to refresh space every second
    this.refreshSub = interval(1000).subscribe(() => {
      this.loadSpace(this.spaceId!);
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
    // Additional cleanup if necessary
  }

  /**
   * Loads space data and updates state accordingly.
   */
  private async loadSpace(spaceId: string): Promise<void> {
    if (this.isFetching) return; // Prevent overlapping calls
    this.isFetching = true;

    const uid = localStorage.getItem('currentUserId');
    if (!uid) {
      this.router.navigate(['/welcome']);
      return;
    }

    try {
      const newSpace = await this.apiService.fetchSpaceById(spaceId);
      if (!newSpace) {
        this.router.navigate(['/']);
        return;
      }

      // Update state only if the data has changed
      if (JSON.stringify(this.previousSpace) !== JSON.stringify(newSpace)) {
        this.previousSpace = newSpace;
        this.space.next(newSpace);
        this.participants.next(newSpace.participants);

        this.space?.next(newSpace);

        const p = newSpace.participants.find(part => part.id === uid) || null;
        this.currentUser.next(p);


        // Update canSpeak status
        if (p?.role === 'speaker' || p?.role === 'host' || !newSpace.askToSpeak) {
          this.canSpeak.next(true);
        } else {
          this.canSpeak.next(false);
        }

        // Update loading state
        this.isLoading.next(false);

        // Handle space state changes (e.g., ended, scheduled)
        this.handleSpaceState(newSpace);
      }

      this.updateDerivedState(newSpace);
    } catch (error) {
      console.error('Error loading space:', error);
      this.message.next('Failed to load space. Please try again later.');
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Updates derived state like progress, scheduled, ended, and canJoinNow.
   */
  private updateDerivedState(space: Space): void {
    const now = Date.now();
    this.scheduled = now < space.startedAt;
    this.ended = !!space.endedAt && !space.active;

    const remainingTime = space.startedAt + (space.duration || 0) - now;
    const totalDuration = space.duration || 1;
    this.progress = Math.max(0, Math.min((1 - remainingTime / totalDuration) * 100, 100));

    this.canJoinNow.next(remainingTime <= 5 * 60 * 1000 && !this.ended);
  }

  /**
   * Handles joining a space?.
   */
  async handleJoin(): Promise<void> {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;

    try {
      const user = await this.apiService.fetchUserById(currentUserId);
      if (!user) return;

      const currentSpace = this.space?.value;
      if (!currentSpace) return;

      if (currentSpace.askToJoin && !(currentSpace.host === currentUserId || currentSpace.approvedToJoin.includes(user.id))) {
        const existingRequest = currentSpace.askToJoinQueue.includes(user.id);
        if (existingRequest) {
          this.message.next('Your request to join is pending approval by the host.');
          return;
        } else {
          const existingHistory = currentSpace.askToJoinHistory.includes(user.id);
          if (existingHistory) {
            this.message.next('Your request to join was rejected by the host.');
            return;
          }
        }

        await this.apiService.joinSpace(currentSpace.id, user, !currentSpace.askToSpeak);
        const updatedSpace = await this.apiService.fetchSpaceById(currentSpace.id);
        if (updatedSpace) {
          this.space?.next(updatedSpace);
          const p = updatedSpace.participants.find(part => part.id === currentUserId) || null;
          this.currentUser.next(p);
          this.message.next('Your request to join has been sent and is pending approval.');
        }
      } else {
        // Directly join
        await this.apiService.joinSpace(currentSpace.id, user, !currentSpace.askToSpeak);
        const updatedSpace = await this.apiService.fetchSpaceById(currentSpace.id);
        if (updatedSpace) {
          this.space?.next(updatedSpace);
          const p = updatedSpace.participants.find(part => part.id === currentUserId) || null;
          this.currentUser.next(p);
        }
      }
    } catch (error) {
      console.error('Error joining space:', error);
    }
  }

  /**
   * Handles leaving a space?.
   */
  async handleLeave(): Promise<void> {
    const currentSpace = this.space?.value;
    const user = this.currentUser.value;
    if (currentSpace && user) {
      try {
        await this.apiService.leaveSpace(currentSpace.id, user.id);
        this.router.navigate(['/']);
      } catch (error) {
        console.error('Error leaving space:', error);
      }
    }
  }

  /**
   * Handles muting a participant.
   * @param targetId Participant ID to mute.
   */
  async handleMuteParticipant(targetId: string): Promise<void> {
    const currentSpace = this.space?.value;
    if (currentSpace) {
      try {
        await this.apiService.muteParticipant(currentSpace.id, targetId, true);
        const updatedSpace = await this.apiService.fetchSpaceById(currentSpace.id);
        if (updatedSpace) {
          this.space?.next(updatedSpace);
        }
      } catch (error) {
        console.error('Error muting participant:', error);
      }
    }
  }

  async handleRemoveParticipant(targetId: string): Promise<void> {
    const currentSpace = this.space?.value;
    if (currentSpace) {
      try {
        const updatedSpace = await this.apiService.fetchSpaceById(currentSpace.id);
        if (updatedSpace) {
          this.space?.next(updatedSpace);
        }
      } catch (error) {
        console.error('Error removing participant:', error);
      }
    }
  }

  /**
   * Handles ending the space (host only).
   */
  async handleEndSpace(): Promise<void> {
    const currentSpace = this.space?.value;
    if (currentSpace && this.isHost()) {
      try {
        await this.apiService.endSpace(currentSpace.id);
        this.space?.next(currentSpace);
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1000);
      } catch (error) {
        console.error('Error ending space:', error);
      }
    }
  }

  /**
   * Toggles the microphone.
   */
  async handleToggleMic(): Promise<void> {
    const user = this.currentUser.value;
    const space = this.space?.value;
    if (user && space) {
      if (user.role === 'speaker' || user.role === 'host' || !space?.askToSpeak) {
        try {
        } catch (error) {
          console.error('Error toggling mic:', error);
        }
      } else {
        this.message.next('You do not have permission to toggle your mic.');
      }
    }
  }

  /**
   * Requests to speak.
   */
  async checkRequestToSpeak(): Promise<void> {
    const space = this.space?.value;
    const user = this.currentUser.value;
    if (!space || !user) return;

    const hasRejectedSpeakRequest = space?.rejectedSpeakers.includes(user.id);
    if (hasRejectedSpeakRequest) {
      this.message.next('You have been rejected from speaking in this space?.');
      return;
    }

    const isPending = space?.askToSpeakQueue.includes(user.id);
    if (isPending) {
      this.message.next('Your request to speak is pending approval by the host.');
      return;
    } else if (space?.rejectedSpeakers.includes(user.id)) {
      this.message.next('Your request to speak has been rejected by the host.');
      return;
    }

    try {
      await this.apiService.requestToSpeak(space?.id, user.id);
      this.message.next('Your request to speak has been sent and is pending approval.');
      this.loadSpace(space?.id);
    } catch (error) {
      this.message.next('Error requesting to speak. Please try again.');
    }
  }

  /**
   * Approves a join request.
   * @param userId User ID to approve.
   */
  async handleApproveJoin(userId: string): Promise<void> {
    const space = this.space?.value;
    if (space) {
      try {
        await this.apiService.approveJoinRequest(space?.id, userId, false);
        this.loadSpace(space?.id);
      } catch (error) {
        console.error('Error approving join request:', error);
      }
    }
  }

  /**
   * Rejects a join request.
   * @param userId User ID to reject.
   */
  async handleRejectJoin(userId: string): Promise<void> {
    const space = this.space?.value;
    if (space) {
      try {
        await this.apiService.rejectJoinRequest(space?.id, userId);
        this.loadSpace(space?.id);
      } catch (error) {
        console.error('Error rejecting join request:', error);
      }
    }
  }

  /**
   * Approves a speak request.
   * @param userId User ID to approve.
   */
  async handleApproveSpeak(userId: string): Promise<void> {
    const space = this.space?.value;
    if (space) {
      try {
        await this.apiService.approveRequest(space?.id, userId, true);
        this.loadSpace(space?.id);
      } catch (error) {
        console.error('Error approving speak request:', error);
      }
    }
  }

  /**
   * Rejects a speak request.
   * @param userId User ID to reject.
   */
  async handleRejectSpeak(userId: string): Promise<void> {
    const space = this.space?.value;
    if (space) {
      try {
        await this.apiService.rejectRequest(space?.id, userId);
        this.loadSpace(space?.id);
      } catch (error) {
        console.error('Error rejecting speak request:', error);
      }
    }
  }

  /**
   * Retrieves counts of speakers and listeners.
   * @param space Current space data.
   */
  getCounts(space: Space): { speakers: number, listeners: number } {
    let speakers = space?.speakers.length;
    let listeners = space?.listeners.length;

    if (space?.host && !space?.speakers.includes(space?.host)) {
      speakers += 1;
    }

    return { speakers, listeners };
  }

  /**
   * Checks if the current user is the host.
   */
  isHost(): boolean {
    const currentUser = this.currentUser.value;
    const space = this.space?.value;
    return currentUser?.id === space?.host;
  }

  /**
   * Handles space state changes like ending or scheduling.
   * @param space Current space data.
   */
  async handleSpaceState(space: Space): Promise<void> {
    const now = Date.now();
    const ended = space?.endedAt !== 0 || !space?.active;
    const scheduled = now < space?.startedAt;
    const remainingTime = space?.duration ? space?.startedAt + space?.duration - now : 0;
    const totalDuration = space?.duration || 1;
    const progress = Math.max(0, Math.min((1 - remainingTime / totalDuration) * 100, 100));
    this.progress = progress;
    this.scheduled = scheduled;
    this.ended = ended;
    if (!this.canJoinNow.value) this.canJoinNow.next(this.getCanJoinNow(space));

    if (space?.duration) {
      if (remainingTime < 0) {
        this.message.next('Space has ended.');
        await this.apiService.endSpace(space?.id);
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 500);
      } else if (remainingTime < 60000 && !this.alertedRemainingTime.value) {
        this.message.next('Space will end in less than a minute.');
        this.alertedRemainingTime.next(true);
      }
    }

    if (space?.endedAt && space?.endedAt !== 0) {
      this.message.next('Space has ended.');
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 500);
    }

    //banned users
    if (space?.banned?.includes(this.currentUser.value?.id ?? localStorage.getItem('currentUserId')!)) {
      this.banned.next(true);
      this.message.next('You have been banned from this space.');
      await this.apiService.leaveSpace(space?.id, this.currentUser.value?.id!);
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 500);
    }
  }

  /**
   * Retrieves the display name of a participant by ID.
   * @param id Participant ID.
   */
  getParticipantDisplayName(id: string): string {
    const space = this.space?.value;
    if (space) {
      const participant = space?.participants.find(p => p.id === id);
      return participant ? participant.displayName : id;
    }
    return id;
  }

  /**
 * Determines if a space has ended.
 * @param space The space to evaluate.
 */
  isSpaceEnded(space: Space): boolean {
    return !!space?.endedAt && !space?.active;
  }

  /**
 * Determines if a space can be joined now.
 * @param space The space to evaluate.
 */
  getCanJoinNow(space: Space): boolean {
    const diff = space?.startedAt - Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const ended = this.isSpaceEnded(space);
    return diff <= fiveMinutes && !ended;
  }

  /**
  * Tracks participants by their ID to minimize re-renders.
  */
  trackByParticipantId(index: number, participant: ParticipantData): string {
    return participant.id;
  }

}
