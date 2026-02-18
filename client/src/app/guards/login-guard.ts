import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../Services/auth-service';

export const loginGuard: CanActivateFn = () => {
  return !inject(AuthService).isLoggedIn();
};
