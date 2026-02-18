import { Component } from '@angular/core';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  template: `
    <div class="flex items-center gap-1.5 py-1 px-2 bg-rose-50/50 rounded-full w-fit animate-fade-in">
      <span class="text-[10px] font-bold text-rose-500 italic tracking-tight">typing</span>
      <div class="flex gap-1">
        <div class="dot w-1 h-1 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div class="dot w-1 h-1 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div class="dot w-1 h-1 bg-rose-600 rounded-full animate-bounce"></div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.3s ease-out forwards;
    }
    .dot {
      animation-duration: 0.6s;
    }
  `],
})
export class TypingIndicator {}