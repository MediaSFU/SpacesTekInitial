import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../api/api.service';
import { Space, UserProfile } from '../../../types';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSearch,
  faFilter,
  faChevronLeft,
  faChevronRight,
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faList
} from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime } from 'rxjs/operators'

import { SidebarCardComponent } from '../side-bar-components/sidebar-card.component';
import { SpaceCardComponent } from '../space-card-components/space-card.component';

@Component({
  selector: 'app-spaces-list',
  templateUrl: './spaces-list.component.html',
  styleUrls: ['./spaces-list.component.css'],
  imports: [
    CommonModule,
    FontAwesomeModule,
    FormsModule,
    SidebarCardComponent,
    SpaceCardComponent
  ]
})
export class SpacesListComponent implements OnInit, OnDestroy {
  // FontAwesome Icons
   faSearch = faSearch;
   faFilter = faFilter;
   faChevronLeft = faChevronLeft;
   faChevronRight = faChevronRight;
   faAngleDoubleLeft = faAngleDoubleLeft;
   faAngleDoubleRight = faAngleDoubleRight;
   faList = faList;

  // State Management with BehaviorSubjects
  spaces = new BehaviorSubject<Space[]>([]);
  previousSpaces: Space[] = [];
  filteredSpaces = new BehaviorSubject<Space[]>([]);
  recentSpaces = new BehaviorSubject<Space[]>([]);
  topSpaces = new BehaviorSubject<Space[]>([]);
  user = new BehaviorSubject<UserProfile | null>(null);
  activeSpace = new BehaviorSubject<Space | null>(null);
  message = new BehaviorSubject<string | null>(null);
  pendingJoin = new BehaviorSubject<[string, string][]>([]);

  // Component Properties for Form Inputs
  searchQuery: string = "";
  filterStatus: string = "All";
  currentPage: number = 1;
  itemsPerPage: number = 5;

  // Subscriptions
  private intervalSub!: Subscription;
  private pendingJoinSub!: Subscription;
  private spacesSub!: Subscription;

  constructor(private apiService: ApiService, public router: Router) { }

  ngOnInit(): void {
    this.loadSpaces();
    this.intervalSub = interval(2000).subscribe(() => this.loadSpaces());

    this.pendingJoinSub = this.pendingJoin
      .pipe(debounceTime(300))
      .subscribe(() => this.checkPendingJoin());

    this.spacesSub = this.spaces
      .pipe(debounceTime(300))
      .subscribe(() => this.filterSpaces());
  }

  ngOnDestroy(): void {
    if (this.intervalSub) this.intervalSub.unsubscribe();
    if (this.pendingJoinSub) this.pendingJoinSub.unsubscribe();
    if (this.spacesSub) this.spacesSub.unsubscribe();
  }

  /**
   * Loads spaces from the API and updates state accordingly.
   */
  async loadSpaces(): Promise<void> {
    try {
      const allSpaces = await this.apiService.fetchSpaces();
      const processedSpaces = allSpaces.map(space => ({
        ...space,
        participants: space.participants.map(p => ({
          ...p,
          avatarUrl: p.avatarUrl || "https://www.mediasfu.com/logo192.png",
        })),
      }));
      // Only update if data has changed
      if (JSON.stringify(this.previousSpaces) !== JSON.stringify(processedSpaces)) {
        this.previousSpaces = processedSpaces;
        this.spaces.next(processedSpaces);
        this.calculateTopAndRecentSpaces(processedSpaces);
        this.updateUserAndActiveSpace(processedSpaces);
      }

    } catch (error) {
      console.error("Error loading spaces:", error);
      this.message.next("Failed to load spaces. Please try again later.");
      setTimeout(() => this.message.next(null), 2000);
    }
  }

  /**
   * Calculates the top and recent spaces for the user.
   * @param spaces The list of spaces to evaluate.
   */
  private calculateTopAndRecentSpaces(spaces: Space[]): void {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const userRecentSpaces = spaces.filter(
      (space) =>
        space.participants.some((p) => p.id === userId) ||
        (space.approvedToJoin && space.approvedToJoin.includes(userId))
    );
    const sortedTopSpaces = [...spaces].sort(
      (a, b) => b.participants.length - a.participants.length
    );

    this.recentSpaces.next(userRecentSpaces.slice(0, 5));
    this.topSpaces.next(sortedTopSpaces.slice(0, 5));
  }

  /**
   * Updates the user and active space based on the list of spaces.
   * @param spaces The list of spaces to evaluate.
   */
  private async updateUserAndActiveSpace(spaces: Space[]): Promise<void> {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const spaceUser = await this.apiService.fetchUserById(userId);
    this.user.next(spaceUser!);

    const active = spaces.find(
      (space) =>
        space.active &&
        !space.endedAt &&
        space.participants.some((p) => p.id === userId)
    );
    this.activeSpace.next(active || null);
  }

  /**
   * Filters spaces based on search query and filter status.
   */
  filterSpaces(): void {
    const query = this.searchQuery.toLowerCase();
    const status = this.filterStatus;

    let filtered = this.spaces.value.filter(space =>
      space.title.toLowerCase().includes(query) ||
      space.description.toLowerCase().includes(query)
    );

    if (status !== "All") {
      filtered = filtered.filter(space => {
        const now = Date.now();
        const ended = this.isSpaceEnded(space);
        const scheduled = this.isSpaceScheduled(space);
        const live = space.active && !ended && !scheduled;

        switch (status) {
          case "Live":
            return live;
          case "Scheduled":
            return scheduled;
          case "Ended":
            return ended;
          default:
            return true;
        }
      });
    }

    this.currentPage = 1; // Reset to first page on filter
    this.filteredSpaces.next(filtered);
  }

  /**
   * Checks pendingJoin to see if user has been approved.
   */
  checkPendingJoin(): void {
    if (this.pendingJoin.value.length === 0) return;

    const [spaceId, userId] = this.pendingJoin.value[this.pendingJoin.value.length - 1];
    const space = this.spaces.value.find(s => s.id === spaceId);
    if (!space) return;

    if (space.approvedToJoin && space.approvedToJoin.includes(userId)) {
      this.message.next(`You have been approved to join the space: ${space.title}`);
      setTimeout(() => this.message.next(null), 2000);
      // Remove from pending join
      this.pendingJoin.next(this.pendingJoin.value.slice(0, -1));
    }
  }

  /**
   * Determines if a space can be joined now.
   * @param space The space to evaluate.
   */
  getCanJoinNow(space: Space): boolean {
    const diff = space.startedAt - Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const ended = this.isSpaceEnded(space);
    return diff <= fiveMinutes && !ended;
  }

  /**
   * Determines if a space has ended.
   * @param space The space to evaluate.
   */
  isSpaceEnded(space: Space): boolean {
    return !!space.endedAt && !space.active;
  }

  /**
   * Determines if a space is scheduled.
   * @param space The space to evaluate.
   */
  isSpaceScheduled(space: Space): boolean {
    return Date.now() < space.startedAt;
  }

  /**
   * Counts the number of participants in a space.
   * @param space The space to evaluate.
   */
  participantCount(space: Space): number {
    return space.participants.length;
  }

  /**
   * Determines the join status of the user for a space.
   * @param space The space to evaluate.
   * @param userId The user's ID.
   */
  getJoinStatus(space: Space, userId: string | null): string | null {
    if (!userId) return null;
    if (space.banned && space.banned.includes(userId)) return "Banned";
    if (space.participants.some(p => p.id === userId)) return "Approved";
    if (space.approvedToJoin && space.approvedToJoin.includes(userId)) return "Lobby";
    if (space.askToJoinQueue.includes(userId)) return "Pending approval";
    if (space.askToJoinHistory.includes(userId)) return "Rejected";
    if (!space.askToJoin) return "Lobby";
    if (space.askToJoin && !space.participants.some(p => p.id === userId))
      return "Request to join";
    return "Approved";
  }

  /**
   * Handles joining a space.
   * @param space The space to join.
   */
  async handleJoinSpace(space: Space): Promise<void> {
    const userId = localStorage.getItem("currentUserId");
    if (!userId || !this.user.value) {
      this.router.navigate(['/welcome']);
      return;
    }

    try {
      await this.apiService.joinSpace(space.id, this.user.value, !space.askToSpeak);
      this.router.navigate([`/space/${space.id}`]);
    } catch (error) {
      console.error("Error joining space:", error);
      this.message.next("Failed to join space. Please try again.");
      setTimeout(() => this.message.next(null), 2000);
    }
  }

  /**
   * Handles requesting to join a space.
   * @param space The space to request joining.
   */
  async handleRequestJoinSpace(space: Space): Promise<void> {
    const userId = localStorage.getItem("currentUserId");
    if (!userId || !this.user.value) {
      this.router.navigate(['/welcome']);
      return;
    }

    try {
      await this.apiService.joinSpace(space.id, this.user.value, !space.askToSpeak);
      this.pendingJoin.next([...this.pendingJoin.value, [space.id, this.user.value.id]]);
      this.message.next("Your request to join has been sent.");
      setTimeout(() => this.message.next(null), 2000);
    } catch (error) {
      console.error("Error requesting to join space:", error);
      this.message.next("Failed to request to join space. Please try again.");
      setTimeout(() => this.message.next(null), 2000);
    }
  }

  /**
   * Navigates to the space details page.
   * @param spaceId The ID of the space.
   */
  navigateToSpace(spaceId: string): void {
    this.router.navigate([`/space/${spaceId}`]);
  }

  /**
   * Handles changes in search query and filter status.
   */
  onSearchQueryChange(event: Event): void {
    try {
      const query = (event.target as HTMLInputElement).value;
      this.searchQuery = query;
      this.filterSpaces();
    } catch (error) {
    }
  }

  onFilterStatusChange(event: Event): void {
    try {
      const status = (event.target as HTMLSelectElement).value;
      this.filterStatus = status;
      this.filterSpaces();
    } catch (error) {
    }
  }

  /**
   * Pagination handlers
   */
  handleFirstPage(): void {
    this.currentPage = 1;
  }

  handleLastPage(): void {
    this.currentPage = this.getTotalPages();
  }

  handlePrevPage(): void {
    const prev = this.currentPage > 1 ? this.currentPage - 1 : this.currentPage;
    this.currentPage = prev;
  }

  handleNextPage(): void {
    const next = this.currentPage < this.getTotalPages() ? this.currentPage + 1 : this.currentPage;
    this.currentPage = next;
  }

  handleItemsPerPageChange(event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value);
    this.itemsPerPage = value;
    this.currentPage = 1; // Reset to first page
  }

  /**
   * Retrieves the current spaces to display based on pagination.
   */
  getCurrentSpaces(): Space[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredSpaces.value.slice(start, end);
  }

  /**
   * Retrieves the total number of pages based on the filtered spaces and items per page.
   */
  getTotalPages(): number {
    return Math.ceil(this.filteredSpaces.value.length / this.itemsPerPage);
  }
}
