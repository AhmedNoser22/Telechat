import { Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../Services/auth-service';
import { Chat } from '../../Services/chat-service';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { User } from '../../models/User';
import { TypingIndicator } from '../typing-indicator/typing-indicator';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    TypingIndicator,
    TitleCasePipe
],
  templateUrl: './chat-sidebar.html'
})
export class ChatSidebar implements OnInit {
  authService = inject(AuthService);
  chatService = inject(Chat);
  router = inject(Router);

  ngOnInit(): void {
    const token = this.authService.getAccessToken();
    const currentUser = this.authService.currentLoggedUser();

    if (!token || !currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.chatService.startConnection(token, currentUser.id);
  }

  logout() {
  this.chatService.disconnectConnection();
  this.router.navigate(['/login']).then(() => {
    this.authService.logout();
    this.chatService.onlineUsers.set([]);
    this.chatService.currentOpenedChat.set(null);
  });
}


  openChatWindow(user: User) {
    this.chatService.currentOpenedChat.set(user);
    this.chatService.chatMessages.set([]);
    this.chatService.loadMessages(1);
  }
}