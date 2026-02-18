import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../Services/auth-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../models/ApiResponse';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatInputModule, MatIconModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email!: string;
  password!: string;
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  hide = signal(true);

  login() {
    if (!this.email || !this.password) {
      this.snackBar.open("Please fill all required fields", "Close", { duration: 3000 });
      return;
    }
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.authService.me().subscribe();
        this.snackBar.open("Logged In Successfully", "Close", { duration: 3000 });
      },
      error: (err: HttpErrorResponse) => {
        let error = err.error as ApiResponse<string>;
        this.snackBar.open(error.error || "Login Failed", "Close", { duration: 3000 });
      },
      complete: () => {
        this.router.navigate(['/']);
      }
    });
  }

  togglePassword(event: MouseEvent) {
    event.preventDefault();
    this.hide.set(!this.hide());
  }
}