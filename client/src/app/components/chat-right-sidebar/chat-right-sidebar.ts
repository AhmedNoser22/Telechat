import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { Chat } from '../../Services/chat-service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'vibeLabel', standalone: true })
export class VibeLabelPipe implements PipeTransform {
  transform(vibes: {emoji:string,label:string}[], emoji: string): string {
    return vibes.find(v => v.emoji === emoji)?.label ?? '';
  }
}

@Component({
  selector: 'app-chat-right-sidebar',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, VibeLabelPipe],
  templateUrl: './chat-right-sidebar.html'
})
export class ChatRightSidebar {
  chatService = inject(Chat);
  showBlockModal = signal(false);
  savedNickname = signal('');
  nicknameValue = '';
  editingNickname = signal(false);
  selectedVibe = signal('');
  isMuted = signal(false);

  vibes = [
    { emoji: '💖', label: 'Love' },
    { emoji: '😂', label: 'Fun' },
    { emoji: '🔥', label: 'Hot' },
    { emoji: '😎', label: 'Cool' },
    { emoji: '🤝', label: 'Work' },
  ];

  openBlockModal() { this.showBlockModal.set(true); }
  closeBlockModal() { this.showBlockModal.set(false); }

  confirmBlock() {
    const userId = this.chatService.currentOpenedChat()?.id;
    if (userId) {
      this.chatService.blockUser(userId);
      this.showBlockModal.set(false);
    }
  }

  unblockUser() {
    const userId = this.chatService.currentOpenedChat()?.id;
    if (userId) this.chatService.unblockUser(userId);
  }

  startEditNickname() {
    this.nicknameValue = this.savedNickname();
    this.editingNickname.set(true);
  }

  saveNickname() {
    this.savedNickname.set(this.nicknameValue.trim());
    this.editingNickname.set(false);
  }

  cancelNickname() {
    this.editingNickname.set(false);
  }

  setVibe(emoji: string) {
    this.selectedVibe.set(this.selectedVibe() === emoji ? '' : emoji);
  }

  toggleMute() {
    this.isMuted.update(v => !v);
  }
}