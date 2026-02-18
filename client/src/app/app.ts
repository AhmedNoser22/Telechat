import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoChat } from './Services/video-chat';
import { MatDialog } from '@angular/material/dialog';
import { VideoChatC } from './video-chat/video-chat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App implements OnInit {
  private signalRService = inject(VideoChat);
  private dialog = inject(MatDialog);

  ngOnInit() {
    this.signalRService.startConnection();
    
    this.signalRService.callRequest.subscribe(() => {
      if (this.dialog.openDialogs.length === 0) {
        this.dialog.open(VideoChatC, {
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          disableClose: true,
          panelClass: 'video-call-dialog'
        });
      }
    });
  }
}