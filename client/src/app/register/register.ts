import { Component, inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../Services/auth-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule, MatIconModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  email!: string;
  password!: string;
  fullName!: string;
  userName!: string;
  profilePicture: string = 'https://randomuser.me/api/portraits/lego/5.jpg';
  profileImage: File | null = null;
  authService = inject(AuthService);
  snackBar = inject(MatSnackBar);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  hide = signal(true);

  togglePassword(event: MouseEvent) {
    event.preventDefault();
    this.hide.set(!this.hide());
  }

  register() {
    if (!this.email || !this.password || !this.fullName || !this.userName || !this.profileImage) {
      this.snackBar.open("All fields and a profile image are required", "Close", { duration: 3000 });
      return;
    }

    let formData = new FormData();
    formData.append("email", this.email);
    formData.append("password", this.password);
    formData.append("fullName", this.fullName);
    formData.append("userName", this.userName);
    formData.append("profileImage", this.profileImage);

    this.authService.register(formData).subscribe({
      next: () => {
        this.router.navigate(['/confirm-email'], { queryParams: { email: this.email } });
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.profileImage = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profilePicture = e.target!.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }
}