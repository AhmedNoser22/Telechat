import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Services/auth-service';

export const authGuard: CanActivateFn = () => {
  if (inject(AuthService).isLoggedIn()) {
    return true;
  }
  inject(Router).navigate(['/login']);
  return false;
};
