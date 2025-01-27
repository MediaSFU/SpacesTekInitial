import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import { ParticipantData, Space } from '../../../types';
import { DomSanitizer } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCrown,
  faMicrophone,
  faMicrophoneSlash,
  faEnvelope,
  faTrash,
  faCheck,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-participant-card',
  templateUrl: './participant-card.component.html',
  styleUrls: ['./participant-card.component.css'],
  imports: [CommonModule, FontAwesomeModule, FormsModule],
})
export class ParticipantCardComponent implements OnInit {
  @Input() participant!: ParticipantData;
  @Input() isHost: boolean = false;
  @Input() currentUserId?: string;
  @Input() space!: Space;

  @Output() onMute = new EventEmitter<string>();
  @Output() onToggleMic = new EventEmitter<string>();
  @Output() onSendMessage = new EventEmitter<string>();
  @Output() onRemoveParticipant = new EventEmitter<string>();

  @ViewChild('videoElement', { static: true })
  videoElement!: ElementRef<HTMLVideoElement>;

  // Font Awesome Icons
  faCrown = faCrown;
  faMicrophone = faMicrophone;
  faMicrophoneSlash = faMicrophoneSlash;
  faEnvelope = faEnvelope;
  faTrash = faTrash;
  faCheck = faCheck;
  faTimes = faTimes;

  showActions: boolean = false;
  showRemoveParticipant: boolean = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {}

  get displayName(): string {
    return this.participant.displayName || 'Unnamed';
  }

  get roleLabel(): string {
    const roleLabels: { [key: string]: string } = {
      host: 'Host',
      speaker: 'Speaker',
      listener: 'Listener',
      requested: 'Requested',
    };
    return roleLabels[this.participant.role] || 'Participant';
  }

  handleDoubleClick(): void {
    if (this.participant.role === 'requested' && this.isHost && !this.space?.rejectedSpeakers.includes(this.participant.id)) {
      this.showActions = !this.showActions;
    } else if (this.isHost && this.participant.role !== 'host') {
      this.showRemoveParticipant = !this.showRemoveParticipant;
    }
  }

  handleMute(): void {
    this.onMute.emit(this.participant.id);
  }

  handleToggleMic(): void {
    this.onToggleMic.emit(this.participant.id);
  }

  handleSendMessage(): void {
    this.onSendMessage.emit(this.participant.id);
  }

  handleRemoveParticipant(): void {
    this.onRemoveParticipant.emit(this.participant.id);
    this.showRemoveParticipant = false;
  }

  approveRequest(): void {
    // Emit event or call service to approve request
    this.showActions = false;
  }

  rejectRequest(): void {
    // Emit event or call service to reject request
    this.showActions = false;
  }
}
