import { Component, inject } from '@angular/core';
import { ChatSidebar } from "../components/chat-sidebar/chat-sidebar";
import { ChatWindow } from "../components/chat-window/chat-window";
import { ChatRightSidebar } from "../components/chat-right-sidebar/chat-right-sidebar";
import { Chat } from '../Services/chat-service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat',
  imports: [ChatSidebar, ChatWindow, ChatRightSidebar,MatIconModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class ChatA {
  chatService = inject(Chat)
  showLeft = true;
  showRight = true;
}
