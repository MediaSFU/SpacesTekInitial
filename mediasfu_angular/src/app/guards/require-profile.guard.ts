// src/app/guards/require-profile.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const RequireProfileGuard: CanActivateFn = () => {
  const router = inject(Router);
  const currentUserId = localStorage.getItem('currentUserId');

  // If no user ID, redirect to /welcome
  if (!currentUserId) {
    router.navigate(['/welcome']);
    return false;
  }

  // Otherwise, allow route activation
  return true;
};
