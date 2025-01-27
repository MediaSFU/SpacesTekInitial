import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../api/api.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-create-space',
  templateUrl: './create-space.component.html',
  styleUrls: ['./create-space.component.css'],
  providers: [ApiService],
  imports: [CommonModule, FormsModule, FontAwesomeModule]
})
export class CreateSpaceComponent implements OnInit {
  // Form fields
  title: string = '';
  description: string = '';
  capacity: number = 25;
  askToSpeak: boolean = false;
  askToJoin: boolean = false;
  startTime: string = '';
  duration: number = 15 * 60 * 1000; // Default duration in ms
  error: string = '';

  // Durations array matching React's generateDurations
  durations: { label: string; value: number }[] = [];

  // FontAwesome Icons
  faArrowLeft = faArrowLeft;

  constructor(private router: Router, private apiService: ApiService) {}

  ngOnInit(): void {
    this.durations = this.generateDurations();
  }

  /**
   * Generates durations similar to React's generateDurations function.
   */
  generateDurations(): { label: string; value: number }[] {
    const durations: { label: string; value: number }[] = [];
    const msPerMin = 60000;

    // 15 min to 180 min (3 hours) in 15-minute increments
    for (let m = 15; m <= 180; m += 15) {
      durations.push({ label: `${m} min`, value: m * msPerMin });
    }

    // 4 hr to 6 hr in 1-hour increments
    for (let h = 4; h <= 6; h++) {
      durations.push({ label: `${h} hr`, value: h * 60 * msPerMin });
    }

    return durations;
  }

  /**
   * Navigates back to the home page.
   */
  navigateBack(): void {
    this.router.navigate(['/']);
  }

  /**
   * Handles the creation of a new space.
   */
  async handleCreate(): Promise<void> {
    this.error = ''; // Reset error message

    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) {
      this.router.navigate(['/welcome']);
      return;
    }

    const currentUser = await this.apiService.fetchUserById(currentUserId);
    if (!currentUser) {
      this.error = 'User not found.';
      return;
    }

    let startTimestamp = Date.now();
    if (this.startTime) {
      const chosenTime = new Date(this.startTime).getTime();
      const diff = chosenTime - Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

      // Validate start time: must be within the next 3 days and not in the past
      if (diff > threeDaysMs || diff < 0) {
        this.error = "Scheduled time must be within the next 3 days, and not in the past.";
        return;
      }
      startTimestamp = chosenTime;
    }

    // Validation: Title and Description length
    if (this.title.trim().length < 3) {
      this.error = "Title must be at least 3 characters";
      return;
    }
    if (this.description.trim().length < 10) {
      this.error = "Description must be at least 10 characters";
      return;
    }

    try {
      const newSpace = await this.apiService.createSpace(
        this.title.trim(),
        this.description.trim(),
        currentUser,
        {
          capacity: this.capacity,
          askToSpeak: this.askToSpeak,
          askToJoin: this.askToJoin,
          startTime: startTimestamp,
          duration: this.duration
        }
      );

      // Navigate to the newly created space's page
      this.router.navigate([`/space/${newSpace.id}`]);
    } catch (error: any) {
      console.error("Error creating space:", error);
      this.error = "Failed to create space. Please try again.";
    }
  }
}
