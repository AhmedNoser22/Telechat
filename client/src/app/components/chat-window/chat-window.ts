import { Component, inject, ViewChild, ElementRef, signal, HostListener, effect } from '@angular/core';
import { Chat } from '../../Services/chat-service';
import { AuthService } from '../../Services/auth-service';
import { VideoChat } from '../../Services/video-chat';
import { MatDialog } from '@angular/material/dialog';
import { VideoChatC } from 'src/app/video-chat/video-chat';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [MatIconModule, FormsModule, CommonModule],
  templateUrl: './chat-window.html'
})
export class ChatWindow {
  chatService = inject(Chat);
  authService = inject(AuthService);
  videoService = inject(VideoChat);
  dialog = inject(MatDialog);

  message = '';
  isRecording = false;
  contextMenuVisible = signal(false);
  contextMenuTop = signal(0);
  contextMenuLeft = signal(0);
  selectedMessageId = signal<number | null>(null);
  selectedMessageContent = signal<string | null>(null);

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor() {
    effect(() => {
      if (this.chatService.chatMessages().length > 0) {
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  @HostListener('document:click')
  onDocumentClick() { this.closeContextMenu(); }

  async startRecording() {
    if (this.chatService.isChatBlocked() || this.chatService.blockedByOther()) return;
    this.isRecording = true;
    await this.videoService.startRecording();
  }

  async stopRecording() {
    this.isRecording = false;
    const chat = this.chatService.currentOpenedChat();
    if (chat) await this.videoService.stopRecording(chat.id);
  }

  onRightClick(event: MouseEvent, msg: any) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuTop.set(event.clientY);
    this.contextMenuLeft.set(event.clientX);
    this.selectedMessageId.set(msg.id);
    this.selectedMessageContent.set(msg.content);
    this.contextMenuVisible.set(true);
  }

  closeContextMenu() { this.contextMenuVisible.set(false); }

  deleteForMe() {
    if (this.selectedMessageId()) this.chatService.deleteMessage(this.selectedMessageId()!, false);
    this.closeContextMenu();
  }

  deleteForEveryone() {
    if (this.selectedMessageId()) this.chatService.deleteMessage(this.selectedMessageId()!, true);
    this.closeContextMenu();
  }

  forwardMessage() {
    this.message = this.selectedMessageContent() || '';
    this.closeContextMenu();
  }

  sendMessage() {
    if (!this.message.trim() || this.chatService.isChatBlocked() || this.chatService.blockedByOther()) return;
    this.chatService.sendMessage(this.message);
    this.message = '';
  }

  onTyping() { this.chatService.notifyTyping(); }

  private scrollToBottom() {
    if (this.myScrollContainer) {
      this.myScrollContainer.nativeElement.scrollTo({
        top: this.myScrollContainer.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  startVideoCall() { this.openCall(false); }
  startVoiceCall() { this.openCall(true); }

  private openCall(isAudio: boolean) {
    const chat = this.chatService.currentOpenedChat();
    if (!chat || this.chatService.isChatBlocked() || this.chatService.blockedByOther()) return;
    this.videoService.isAudioOnly = isAudio;
    this.videoService.remoteUserId = chat.id;
    this.videoService.remoteUserName = chat.fullName;
    this.videoService.remoteUserProfilePicture = chat.profilePicture;
    this.dialog.open(VideoChatC, {
      width: '100vw', height: '100vh', maxWidth: '100vw', disableClose: true
    });
  }
}