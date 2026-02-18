import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/ApiResponse';
import { User } from '../models/User';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = "http://localhost:5000/api/account";
  private tokenKey = "token";
  private httpClient = inject(HttpClient);
  
  currentUserSignal = signal<User | null>(JSON.parse(localStorage.getItem('user') || 'null'));

  register(data: FormData): Observable<ApiResponse<string>> {
    return this.httpClient.post<ApiResponse<string>>(`${this.baseUrl}/register`, data);
  }

  confirmEmail(email: string, code: string): Observable<ApiResponse<string>> {
    return this.httpClient.post<ApiResponse<string>>(`${this.baseUrl}/confirm-email`, { email, code })
      .pipe(tap((response) => {
        if (response.isSuccess) {
          localStorage.setItem(this.tokenKey, response.data);
        }
      }));
  }

  login(email: string, password: string): Observable<ApiResponse<string>> {
    return this.httpClient.post<ApiResponse<string>>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((response) => {
        if (response.isSuccess) {
          localStorage.setItem(this.tokenKey, response.data);
        }
      }));
  }

  me(): Observable<ApiResponse<User>> {
    return this.httpClient.get<ApiResponse<User>>(`${this.baseUrl}/me`, {
      headers: { "Authorization": `Bearer ${this.getAccessToken()}` }
    }).pipe(tap((response) => {
      if (response.isSuccess) {
        localStorage.setItem('user', JSON.stringify(response.data));
        this.currentUserSignal.set(response.data);
      }
    }));
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('user');
    this.currentUserSignal.set(null);
  }

  currentLoggedUser(): User | null {
    return this.currentUserSignal();
  }
}