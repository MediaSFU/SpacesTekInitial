import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome-components/welcome.component';
import { SpacesListComponent } from './components/spaces-list-components/spaces-list.component';
import { SpaceDetailsComponent } from './components/space-details-components/space-details.component';
import { CreateSpaceComponent } from './components/create-space-components/create-space.component';
import { RequireProfileGuard } from './guards/require-profile.guard';

export const APP_ROUTES: Routes = [
  { path: 'welcome', component: WelcomeComponent },
  {
    path: '',
    component: SpacesListComponent,
    canActivate: [RequireProfileGuard]
  },
  {
    path: 'space/:spaceId',
    component: SpaceDetailsComponent,
    canActivate: [RequireProfileGuard]
  },
  {
    path: 'create-space',
    component: CreateSpaceComponent,
    canActivate: [RequireProfileGuard]
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
