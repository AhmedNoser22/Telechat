import { Component, inject } from '@angular/core';
import { Chat } from '../../Services/chat-service';
import { AuthService } from '../../Services/auth-service';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-chat-box',
  standalone: true,
  imports: [MatIconModule, DatePipe],
  templateUrl: './chat-box.html'
})
export class ChatBox {
  chatService = inject(Chat);
  authService = inject(AuthService);
 
}