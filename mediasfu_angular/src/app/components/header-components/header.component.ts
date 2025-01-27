import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../api/api.service';
import { UserProfile } from '../../../types';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [FontAwesomeModule, CommonModule],
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser = new BehaviorSubject<UserProfile | null>(null);
  faSignOutAlt = faSignOutAlt;
  private urlSubscription!: Subscription;

  constructor(public router: Router, private apiService: ApiService) {}

  ngOnInit(): void {
    this.checkCurrentUser();

    // Listen to URL changes
    this.urlSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.handleUrlChange();
      });
  }

  ngOnDestroy(): void {
    // Clean up subscription
    if (this.urlSubscription) {
      this.urlSubscription.unsubscribe();
    }
  }

  /**
   * Checks if a user is logged in and updates the header state.
   */
  private async checkCurrentUser(): Promise<void> {
    const currentUserId = localStorage.getItem('currentUserId');
    if (currentUserId) {
      const user = await this.apiService.fetchUserById(currentUserId);
      if (user) {
        this.currentUser.next({
          ...user,
          avatarUrl: user.avatarUrl || 'https://www.mediasfu.com/logo192.png',
        });
      }
    } else {
      this.currentUser.next(null); // Clear user if not logged in
    }
  }

  /**
   * Handles URL change events.
   */
  private handleUrlChange(): void {
    // Perform any actions needed on URL change
    this.checkCurrentUser(); // Example: Refresh user data if needed
  }

  /**
   * Handles user logout and navigates to the welcome page.
   */
  async handleLogout(): Promise<void> {
    const currentUserId = localStorage.getItem('currentUserId');
    if (currentUserId) {
      await this.apiService.freeUser(currentUserId);
      localStorage.removeItem('currentUserId');
      this.currentUser.next(null);
      localStorage.setItem('lastUserId', currentUserId || '');
      this.router.navigate(['/welcome']);
    }
  }
}
