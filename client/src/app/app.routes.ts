import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'chat',
    loadComponent: () => import('./chat/chat').then(m => m.ChatA),
    canActivate: [authGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register').then(m => m.Register),
  },
  {
    path: 'confirm-email',
    loadComponent: () => import('./confirmemail/confirm/confirm').then(m => m.Confirm),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.Login),
  },
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  { path: '**', redirectTo: 'chat' },
];