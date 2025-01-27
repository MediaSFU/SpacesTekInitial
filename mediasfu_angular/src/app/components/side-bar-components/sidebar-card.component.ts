import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Space } from '../../../types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUsers, faFlagCheckered, faClock, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-sidebar-card',
  templateUrl: './sidebar-card.component.html',
  styleUrls: ['./sidebar-card.component.css'],
  imports: [CommonModule, FormsModule, FontAwesomeModule]
})
export class SidebarCardComponent {
  @Input() space!: Space;
  @Output() navigateToSpace = new EventEmitter<Space>();

  // FontAwesome Icons
  faUsers = faUsers;
  faFlagCheckered = faFlagCheckered;
  faClock = faClock;
  faCheckCircle = faCheckCircle;


  onClick(): void {
    this.navigateToSpace.emit(this.space);
  }

  participantCount(space: Space): number {
    return space.participants?.length || 0;
  }

  isSpaceEnded(space: Space): boolean {
    return !!space.endedAt && !space.active;
  }

  isSpaceScheduled(space: Space): boolean {
    const now = new Date();
    return now < new Date(space.startedAt);
  }

  getSpaceStatus(space: Space): string {
    if (this.isSpaceEnded(space)) return 'Ended';
    if (this.isSpaceScheduled(space)) return 'Scheduled';
    return space.active ? 'Live' : 'Inactive';
  }
}
