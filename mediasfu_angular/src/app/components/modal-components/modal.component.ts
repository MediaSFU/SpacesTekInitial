import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';


@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  imports: [CommonModule, FontAwesomeModule]
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Output() onClose = new EventEmitter<void>();

  // Font Awesome Icons
  faTimes = faTimes;

  closeModal(event: MouseEvent): void {
    event.stopPropagation();
    this.onClose.emit();
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
