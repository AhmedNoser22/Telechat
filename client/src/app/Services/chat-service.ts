import { Injectable, signal, inject, computed } from '@angular/core';
import { AuthService } from './auth-service';
import { User } from '../models/User';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class Chat {
  private authService = inject(AuthService);
  private hubUrl = 'http://localhost:5000/hubs/chat';

  onlineUsers = signal<User[]>([]);
  currentOpenedChat = signal<User | null>(null);
  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(false);
  isTyping = signal<boolean>(false);

  isChatBlocked = computed(() => {
    const current = this.currentOpenedChat();
    const latest = this.onlineUsers().find(u => u.id === current?.id);
    return latest ? latest.isBlockedByMe : (current?.isBlockedByMe ?? false);
  });

  blockedByOther = computed(() => {
    const current = this.currentOpenedChat();
    const latest = this.onlineUsers().find(u => u.id === current?.id);
    return latest ? latest.isBlockedMe : (current?.isBlockedMe ?? false);
  });

  private hubConnection?: HubConnection;

  startConnection(token: string, senderId?: string) {
    if (!token) return;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}?senderId=${senderId || ''}`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('OnlineUsers', (users: User[]) => {
      this.onlineUsers.set(users);
    });

    const typingHandler = (username: string) => {
      if (this.currentOpenedChat()?.userName?.toLowerCase() === username?.toLowerCase()) {
        this.isTyping.set(true);
        setTimeout(() => this.isTyping.set(false), 3000);
      }

      this.onlineUsers.update(users =>
        users.map(u => u.userName?.toLowerCase() === username?.toLowerCase() ? { ...u, isTyping: true } : u)
      );
      setTimeout(() => {
        this.onlineUsers.update(users =>
          users.map(u => u.userName?.toLowerCase() === username?.toLowerCase() ? { ...u, isTyping: false } : u)
        );
      }, 3000);
    };

    this.hubConnection.on('UserIsTyping', typingHandler);
    this.hubConnection.on('NotifyTypingToUser', typingHandler);

    this.hubConnection.on('ReceiveNewMessage', (message: any) => {
      const mappedMsg = this.mapMessage(message);
      const currentChat = this.currentOpenedChat();
      const myId = this.authService.currentLoggedUser()?.id;

      const isFromCurrent = currentChat?.id === mappedMsg.senderId;
      const isFromMe = myId === mappedMsg.senderId;

      if (isFromCurrent || isFromMe) {
        this.chatMessages.update(prev => [...prev, mappedMsg]);
        if (isFromCurrent) {
          this.hubConnection?.invoke('ReadAllMessages', mappedMsg.senderId).catch(err => console.error(err));
        }
      }

      if (!isFromMe && !isFromCurrent) {
        this.onlineUsers.update(users => users.map(u => {
          if (u.id === mappedMsg.senderId) {
            return { ...u, unreadCount: (u.unreadCount || 0) + 1, lastMessage: mappedMsg.content || '' };
          }
          return u;
        }));
      }
      this.isTyping.set(false);
    });

    this.hubConnection.on('ReceiveMessageList', (response: any[]) => {
      this.chatMessages.set(response.map(m => this.mapMessage(m)));
      this.isLoading.set(false);
    });

    this.hubConnection.on('MessagesSeenByPartner', (_partnerId: string) => {
      this.chatMessages.update(msgs => msgs.map(m => ({ ...m, isRead: true })));
    });

    this.hubConnection.on('MessageDeleted', (messageId: number) => {
      this.chatMessages.update(msgs => msgs.filter(m => m.id !== messageId));
    });

    this.hubConnection.on('UserBlocked', (userId: string) => this.updateLocalUserStatus(userId, { isBlockedByMe: true }));
    this.hubConnection.on('UserUnblocked', (userId: string) => this.updateLocalUserStatus(userId, { isBlockedByMe: false }));
    this.hubConnection.on('YouWereBlocked', (blockerId: string) => this.updateLocalUserStatus(blockerId, { isBlockedMe: true }));
    this.hubConnection.on('YouWereUnblocked', (unblockerId: string) => this.updateLocalUserStatus(unblockerId, { isBlockedMe: false }));

    this.hubConnection.start().catch(err => console.error(err));
  }

  private updateLocalUserStatus(userId: string, data: Partial<User>) {
    this.onlineUsers.update(users => 
      users.map(u => u.id === userId ? { ...u, ...data } : u)
    );
  }

  openChat(user: User) {
    this.onlineUsers.update(users => users.map(u => u.id === user.id ? { ...u, unreadCount: 0 } : u));
    this.currentOpenedChat.set(user);
    this.chatMessages.set([]);
    this.loadMessages(1);
  }

  sendMessage(content: string) {
    const receiverId = this.currentOpenedChat()?.id;
    if (!receiverId || !content.trim() || this.isChatBlocked() || this.blockedByOther()) return;
    this.hubConnection?.invoke('SendMessage', { receiverId, content }).catch(err => console.error(err));
  }

  deleteMessage(messageId: number, deleteForEveryone: boolean) {
    this.hubConnection?.invoke('DeleteMessage', messageId, deleteForEveryone).catch(err => console.error(err));
  }

  blockUser(userId: string) {
    this.hubConnection?.invoke('BlockUser', userId).catch(err => console.error(err));
  }

  unblockUser(userId: string) {
    this.hubConnection?.invoke('UnblockUser', userId).catch(err => console.error(err));
  }

  notifyTyping() {
    const target = this.currentOpenedChat()?.userName;
    if (target && !this.isChatBlocked() && !this.blockedByOther()) {
      this.hubConnection?.invoke('NotifyTyping', target).catch(err => console.error(err));
    }
  }

  loadMessages(pageNumber: number) {
    const receiverId = this.currentOpenedChat()?.id;
    if (receiverId) {
      this.isLoading.set(true);
      this.hubConnection?.invoke('LoadMessages', receiverId, pageNumber).catch(() => this.isLoading.set(false));
    }
  }

  disconnectConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected) this.hubConnection.stop();
  }

  formatEgyptTime(dateInput: any): string {
    if (!dateInput) return '';
    return new Intl.DateTimeFormat('en-EG', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Cairo' }).format(new Date(dateInput));
  }

  private mapMessage(m: any): Message {
    let rawDate = m.createdDate || m.createDate;
    if (rawDate && typeof rawDate === 'string' && !rawDate.includes('Z')) rawDate += 'Z';
    return { ...m, createDate: rawDate };
  }
}