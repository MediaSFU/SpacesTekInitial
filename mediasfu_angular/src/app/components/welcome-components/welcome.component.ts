import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from '../../api/api.service';
import { UserProfile } from '../../../types';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUserPlus, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
  imports: [CommonModule, FormsModule, FontAwesomeModule]
})
export class WelcomeComponent implements OnInit {
  availableUsers$ = new BehaviorSubject<UserProfile[]>([]);
  displayName: string = '';
  avatarUrl: string = '';
  recentUserId: string | null = null;

  faUserPlus = faUserPlus;
  faSignOutAlt = faSignOutAlt;

  constructor(private apiService: ApiService, private router: Router) { }

  ngOnInit(): void {
    this.loadAvailableUsers();

    // Refresh user list every 2 seconds
    setInterval(() => {
      this.loadAvailableUsers();
    }, 2000);
  }


  private async loadAvailableUsers(): Promise<void> {
    try {
      const lastUsedId = localStorage.getItem('lastUserId');
      this.recentUserId = lastUsedId;

      const users = await this.apiService.fetchAvailableUsers();
      const updatedUsers = users.map((user) => ({
        ...user,
        avatarUrl: user.avatarUrl || 'https://www.mediasfu.com/logo192.png'
      }));

      // Emit only if the data has changed
      if (JSON.stringify(this.availableUsers$.value) !== JSON.stringify(updatedUsers)) {
        this.availableUsers$.next(updatedUsers);
      }
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  }

  async handleSelect(userId: string): Promise<void> {
    try {
      await this.apiService.markUserAsTaken(userId);
      localStorage.setItem('currentUserId', userId);
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error selecting user:', error);
    }
  }

  async handleCreate(): Promise<void> {
    if (!this.displayName.trim()) return;

    try {
      const newUser = await this.apiService.createProfile(
        this.displayName.trim(),
        this.avatarUrl.trim() || 'https://www.mediasfu.com/logo192.png'
      );
      localStorage.setItem('currentUserId', newUser.id);
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  }
}
