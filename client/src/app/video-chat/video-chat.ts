import { Component, ElementRef, inject, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { VideoChat } from '../Services/video-chat';
import { CommonModule } from '@angular/common';
import { Chat } from '../Services/chat-service';

@Component({
  selector: 'app-video-chat',
  standalone: true,
  imports: [MatIconModule, CommonModule],
  template: `
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950">
      <div class="relative w-full h-full flex flex-col items-center justify-center">
        
        <video #remoteVideo autoplay playsinline 
               class="w-full h-full object-cover" 
               [class.hidden]="!signalRService.isCallActive"></video>

        <div *ngIf="!signalRService.isCallActive" 
             class="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
          <div class="w-40 h-40 rounded-full border-4 border-rose-600 overflow-hidden mb-6 shadow-2xl">
            <img [src]="getRemoteUserImage()" class="w-full h-full object-cover" />
          </div>
          <h2 class="text-4xl font-black text-white tracking-tight">{{ getRemoteUserName() }}</h2>
          <p class="text-rose-500 animate-pulse mt-4 text-xl font-bold uppercase tracking-widest">
            {{ signalRService.incomingCall ? 'Incoming Call...' : 'Calling...' }}
          </p>
        </div>

        <div *ngIf="!signalRService.isAudioOnly" 
             class="absolute top-6 right-6 w-32 h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-50">
          <video #localVideo autoplay playsinline muted class="w-full h-full object-cover"></video>
        </div>

        <div class="absolute bottom-12 flex flex-wrap justify-center items-center gap-6 z-[60]">
          
          <button (click)="toggleMic()" 
                  [class]="isMicOn ? 'bg-white/10' : 'bg-red-600'"
                  class="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md transition-all">
            <mat-icon class="text-white">{{ isMicOn ? 'mic' : 'mic_off' }}</mat-icon>
          </button>

          <button (click)="toggleSpeaker()" 
                  [class]="isSpeakerOn ? 'bg-white/10' : 'bg-red-600'"
                  class="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md transition-all">
            <mat-icon class="text-white">{{ isSpeakerOn ? 'volume_up' : 'volume_off' }}</mat-icon>
          </button>

          <button *ngIf="signalRService.incomingCall && !signalRService.isCallActive" (click)="acceptCall()"
                  class="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/50">
            <mat-icon class="text-white !text-4xl">call</mat-icon>
          </button>

          <button *ngIf="!signalRService.isAudioOnly" (click)="toggleCamera()" 
                  [class]="isCameraOn ? 'bg-white/10' : 'bg-red-600'"
                  class="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md transition-all">
            <mat-icon class="text-white">{{ isCameraOn ? 'videocam' : 'videocam_off' }}</mat-icon>
          </button>
          
          <button (click)="endCall()" class="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/50">
            <mat-icon class="text-white !text-4xl rotate-[135deg]">call</mat-icon>
          </button>

        </div>
      </div>
    </div>
  `
})
export class VideoChatC implements OnInit, OnDestroy {
  @ViewChild("localVideo") localvideo!: ElementRef<HTMLVideoElement>;
  @ViewChild("remoteVideo") remotevideo!: ElementRef<HTMLVideoElement>;

  signalRService = inject(VideoChat);
  chatService = inject(Chat);
  localStream: MediaStream | null = null;
  
  isMicOn = true;
  isCameraOn = true;
  isSpeakerOn = true;

  async ngOnInit() {
    await this.prepareMedia();
    if (!this.signalRService.incomingCall) {
      this.signalRService.playRingtone();
      this.initiateCall();
    }
  }

  async prepareMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: !this.signalRService.isAudioOnly, 
        audio: true 
      });
      if (this.localvideo?.nativeElement) {
        this.localvideo.nativeElement.srcObject = this.localStream;
      }
    } catch (e) {}
  }

  private createPeer() {
    this.signalRService.peerConnection = new RTCPeerConnection({ 
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] 
    });

    this.signalRService.peerConnection.onicecandidate = (e) => {
      if (e.candidate) this.signalRService.sendIceCandidate(this.signalRService.remoteUserId, e.candidate);
    };

    this.signalRService.peerConnection.ontrack = (e) => {
      if (this.remotevideo?.nativeElement) {
        this.remotevideo.nativeElement.srcObject = e.streams[0];
      }
    };

    this.localStream?.getTracks().forEach(t => {
      this.signalRService.peerConnection?.addTrack(t, this.localStream!);
    });
  }

  async initiateCall() {
    this.createPeer();
    const offer = await this.signalRService.peerConnection!.createOffer();
    await this.signalRService.peerConnection!.setLocalDescription(offer);
    this.signalRService.sendOffer(this.signalRService.remoteUserId, offer, this.signalRService.isAudioOnly);
  }

  async acceptCall() {
    this.signalRService.stopRingtone();
    this.createPeer();
    await this.signalRService.peerConnection!.setRemoteDescription(new RTCSessionDescription(this.signalRService.currentOffer));
    const answer = await this.signalRService.peerConnection!.createAnswer();
    await this.signalRService.peerConnection!.setLocalDescription(answer);
    this.signalRService.sendAnswer(this.signalRService.remoteUserId, answer);
    this.signalRService.isCallActive = true;
    this.signalRService.incomingCall = false;
  }

  toggleMic() {
    this.isMicOn = !this.isMicOn;
    this.localStream?.getAudioTracks().forEach(t => t.enabled = this.isMicOn);
  }

  toggleCamera() {
    this.isCameraOn = !this.isCameraOn;
    this.localStream?.getVideoTracks().forEach(t => t.enabled = this.isCameraOn);
  }

  toggleSpeaker() {
    this.isSpeakerOn = !this.isSpeakerOn;
    if (this.remotevideo?.nativeElement) {
      this.remotevideo.nativeElement.muted = !this.isSpeakerOn;
    }
  }

  endCall() {
    this.signalRService.sendEndCall(this.signalRService.remoteUserId);
    this.stopStream();
    setTimeout(() => location.reload(), 500);
  }

  private stopStream() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.signalRService.peerConnection?.close();
    this.signalRService.isCallActive = false;
  }

  getRemoteUserName() { return this.signalRService.remoteUserName || 'User'; }
  getRemoteUserImage() { return this.signalRService.remoteUserProfilePicture || ''; }

  ngOnDestroy() {
    this.stopStream();
  }
}