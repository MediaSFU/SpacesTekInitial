import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Import the Header (standalone) if you made it standalone
import { HeaderComponent } from './components/header-components/header.component';

// For icons, global styles, etc. if needed
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  standalone: true,
  selector: 'app-root',
  // Import modules you need for routing, forms, etc.
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    HeaderComponent
  ],
  template: `
    <!-- Equivalent to your React <Header /> -->
    <app-header></app-header>

    <!-- Angular router display area (equivalent to <Routes> / <Route>) -->
    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app.component.css'] // optional
})
export class AppComponent {}
