import { inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { AuthService } from './auth-service';
import { Chat } from './chat-service';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VideoChat {
  public hubConnection!: HubConnection;
  public incomingCall = false;
  public isCallActive = false;
  public isAudioOnly = false;
  public remoteUserId = '';
  public remoteUserName = '';
  remoteUserProfilePicture: string = '';
  public remoteUserImage = '';
  public currentOffer: any = null;
  public callRequest = new Subject<void>();
  public peerConnection: RTCPeerConnection | null = null;
  public isCaller = false;

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  private ringtoneAudio = new Audio('/ringtone.mp3');
  private endCallAudio = new Audio('/end-call.mp3');

  private authServices = inject(AuthService);
  private chatService = inject(Chat);
  private http = inject(HttpClient);

  constructor() {
    this.ringtoneAudio.loop = true;
  }

  playRingtone() {
    this.ringtoneAudio.currentTime = 0;
    this.ringtoneAudio.play().catch(() => {});
  }

  stopRingtone() {
    this.ringtoneAudio.pause();
    this.ringtoneAudio.currentTime = 0;
  }

  playEndCall() {
    this.stopRingtone();
    this.endCallAudio.currentTime = 0;
    this.endCallAudio.play().catch(() => {});
  }

  startConnection() {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl("http://localhost:5000/hubs/video", {
        accessTokenFactory: () => this.authServices.getAccessToken()!
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch(err => console.error(err));

    this.hubConnection.on("ReceiveOffer", (senderId: string, offer: string, isAudioOnly: boolean, senderName: string, senderImage: string) => {
      this.remoteUserId = senderId;
      this.remoteUserName = senderName;
      this.remoteUserImage = senderImage;
      this.isAudioOnly = isAudioOnly;
      this.currentOffer = JSON.parse(offer);
      this.incomingCall = true;
      this.isCaller = false;
      this.playRingtone();
      this.callRequest.next();
    });

    this.hubConnection.on("ReceiveAnswer", async (senderId: string, answer: string) => {
      this.stopRingtone();
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
        this.isCallActive = true;
      }
    });

    this.hubConnection.on("ReceiveIceCandidate", async (senderId: string, candidate: string) => {
      if (this.peerConnection) {
        try { 
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate))); 
        } catch(e) {}
      }
    });

    this.hubConnection.on("NotifyCallEntry", (callType: string) => {
      const currentChat = this.chatService.currentOpenedChat() as any;
      if (currentChat?.id) {
        this.chatService.sendMessage(callType);
      }
    });

    this.hubConnection.on("CallEnded", () => { 
      this.playEndCall();
      this.peerConnection?.close();
      this.peerConnection = null;
      setTimeout(() => location.reload(), 1500); 
    });
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
      this.mediaRecorder.start();
    } catch (err) {}
  }

  async stopRecording(receiverId: string) {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;
    this.mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      const file = new File([audioBlob], `voice_${Date.now()}.wav`, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('receiverId', receiverId);
      this.http.post('http://localhost:5000/api/Chat/upload-voice', formData).subscribe({
        next: (res: any) => {
          this.chatService.sendMessage(res.url);
        }
      });
      this.mediaRecorder?.stream.getTracks().forEach(t => t.stop());
    };
    this.mediaRecorder.stop();
  }

  sendOffer(rId: string, offer: any, audioOnly: boolean) {
    const user = this.authServices.currentLoggedUser() as any;
    this.hubConnection.invoke("SendOffer", rId, JSON.stringify(offer), audioOnly, user.fullName, user.profilePicture); 
  }
  
  sendAnswer(rId: string, answer: any) { 
    this.hubConnection.invoke("SendAnswer", rId, JSON.stringify(answer)); 
  }
  
  sendIceCandidate(rId: string, candidate: any) { 
    this.hubConnection.invoke("SendIceCandidate", rId, JSON.stringify(candidate)); 
  }
  
  sendEndCall(rId: string) {
    this.playEndCall();
    const type = this.isAudioOnly ? "📞 Voice Call" : "📹 Video Call";
    this.hubConnection.invoke('EndCall', rId, type); 
  }
}