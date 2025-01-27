import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Space } from '../../../types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUsers, faFlagCheckered, faClock, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-space-card',
  templateUrl: './space-card.component.html',
  styleUrls: ['./space-card.component.css'],
  imports: [CommonModule, FormsModule, FontAwesomeModule]
})
export class SpaceCardComponent implements OnInit, OnChanges {
  @Input() space!: Space;
  @Input() userId: string | null = null;

  @Output() joinSpaceEvent = new EventEmitter<Space>();
  @Output() requestJoinSpaceEvent = new EventEmitter<Space>();
  @Output() viewDetailsEvent = new EventEmitter<Space>();

  // FontAwesome Icons
  faUsers = faUsers;
  faFlagCheckered = faFlagCheckered;
  faClock = faClock;
  faCheckCircle = faCheckCircle;

  // State variables
  ended = false;
  scheduled = false;
  canJoinNow = false;
  private _joinStatus: string | null = null;

  ngOnInit(): void {
    this.updateState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['space'] || changes['userId']) {
      this.updateState();
    }
  }

  /**
   * Updates component state variables based on inputs.
   */
  private updateState(): void {
    this.ended = this.isSpaceEnded(this.space);
    this.scheduled = this.isSpaceScheduled(this.space);
    this.canJoinNow = this.getCanJoinNow(this.space);
    this._joinStatus = this.getJoinStatus(this.space, this.userId);
  }

  /**
   * Returns the cached join status for the current user.
   */
  get joinStatus(): string | null {
    return this._joinStatus;
  }

  /**
   * Determines if the space has ended.
   */
  private isSpaceEnded(space: Space): boolean {
    return !!space.endedAt && !space.active;
  }

  /**
   * Determines if the space is scheduled for a future time.
   */
  private isSpaceScheduled(space: Space): boolean {
    return Date.now() < space.startedAt;
  }

  /**
   * Determines if the user can join the space now (within 5 minutes of start, not ended).
   */
  private getCanJoinNow(space: Space): boolean {
    const diff = space.startedAt - Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return diff <= fiveMinutes && !this.isSpaceEnded(space);
  }

  /**
   * Determines the join status of the user in the space.
   */
  private getJoinStatus(space: Space, userId: string | null): string | null {
    if (!userId) return null;

    if (space.banned?.includes(userId)) {
      return 'Banned';
    }

    if (space.participants.some((p) => p.id === userId)) {
      return 'Approved';
    }
    if (space.approvedToJoin?.includes(userId)) {
      return 'Lobby';
    }
    if (space.askToJoinQueue.includes(userId)) {
      return 'Pending approval';
    }
    if (space.askToJoinHistory.includes(userId)) {
      return 'Rejected';
    }
    if (!space.askToJoin) {
      return 'Lobby';
    }
    return 'Request to join';
  }

  /**
   * Emits the join space event.
   */
  onJoinSpace(): void {
    this.joinSpaceEvent.emit(this.space);
  }

  /**
   * Emits the request join space event.
   */
  onRequestJoinSpace(): void {
    this.requestJoinSpaceEvent.emit(this.space);
  }

  /**
   * Emits the view details event.
   */
  onViewDetails(): void {
    this.viewDetailsEvent.emit(this.space);
  }
}
