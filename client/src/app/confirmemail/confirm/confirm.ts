import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../Services/auth-service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule],
  templateUrl: './confirm.html',
  styleUrl: './confirm.css'
})
export class Confirm implements OnInit {
  email: string = '';
  code: string[] = ['', '', '', '', '', ''];
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];
      if (!this.email) this.router.navigate(['/register']);
    });
  }

  onInput(event: any, index: number) {
    const input = event.target;
    if (input.value && index < 5) {
      const nextInput = input.parentElement.nextElementSibling?.querySelector('input') as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
    if (this.code.join('').length === 6) this.verify();
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.code[index] && index > 0) {
      const prevInput = (event.target as HTMLElement).parentElement?.previousElementSibling?.querySelector('input') as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  verify() {
    const fullCode = this.code.join('');
    this.authService.confirmEmail(this.email, fullCode).subscribe({
      next: () => {
        this.authService.me().subscribe({
          next: () => {
            this.router.navigate(['/chat']);
          },
          error: () => {
            this.router.navigate(['/chat']);
          }
        });
      },
      error: () => {
        this.code = ['', '', '', '', '', ''];
      }
    });
  }
}