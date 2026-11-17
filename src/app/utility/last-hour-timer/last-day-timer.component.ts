import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';

interface PresetOption {
  label: string;
  minutes: number;
}

interface LastRunPayload {
  lastHour: string | null;
  starttime: string | null;
  endtime: string | null;
  Msg: any[]
}

@Component({
    selector: 'app-day-timer',
    imports: [
        FormsModule,
        CommonModule,
        MatSnackBarModule
    ],
    templateUrl: './last-day-timer.component.html',
    styleUrl: './last-day-timer.component.css'
})

export class LastDayTimerComponent {


  @Output() ApplyLastRun = new EventEmitter<LastRunPayload>();
  hover: boolean = false;
  showCard2: boolean = false;
  activeTab: string = 'first';
  currentDate: Date = new Date();

  startDate: string = '';
  endDate: string = '';
  startDateTime: string = '';
  endDateTime: string = '';
  timeDiffDisplay: string = '';

  filteredPresetOptions: { label: string; days: number; }[] = [];



  presetOptions: { label: string; days: number; }[] = [
    { label: 'Last 1 day', days: 1 },
    { label: 'Last 2 days', days: 2 },
    { label: 'Last 3 days', days: 3 },
    { label: 'Last 5 days', days: 5 },
    { label: 'Last 7 days', days: 7 }
  ];


  startTime: string = '';
  endTime: string = '';
  availableTime: string = '';


  currentTotalMinutes: number = 0;

  currentTimeStr: string = '';
  showToast: boolean = false;

    constructor(private snack: MatSnackBar) { }

    ngOnInit(): void {
    this.filterPresetOptions();
    this.initializeDefaultTimeRange();
  }


  private formatDateTime(date: Date): string {
    this.currentDate = new Date();
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}:${this.pad(date.getSeconds())}`;
  }


  private getTimeDiffDisplay(start: Date, end: Date): string {
    const diff = (end.getTime() - start.getTime()) / 1000; // in seconds
    const hrs = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (hrs >= 1) return `${hrs} hour${hrs > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`;
    return `${mins} minutes`;
  }


  calculateCurrentTimeInMinutes() {
    const now = new Date();
    this.currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  }


  setCurrentTimeString() {
    const now = new Date();
    const hh = this.pad(now.getHours());
    const mm = this.pad(now.getMinutes());
    const ss = this.pad(now.getSeconds());
    this.currentTimeStr = `${hh}:${mm}:${ss}`;
  }

  showEndTimeMessage(): void {
    this.showToast = true;
    setTimeout(() => this.showToast = false, 6000);
  }
  getCurrentDate(): String {
    const currentDate = new Date();
    // Get individual components of the local date and time
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day}`;
    return formattedDateTime;
  }


  toggleCard2() {
    this.showCard2 = !this.showCard2;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    if (this.showCard2 && !targetElement.closest('.button-wrapper')) {
      this.showCard2 = false;
    }
  }

  selectPreset(days: number, label: string) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - days);

    this.startDateTime = this.formatDate(start);
    this.endDateTime = this.formatDate(end);
    this.timeDiffDisplay = `${days} day${days > 1 ? 's' : ''}`;

    this.ApplyLastRun.emit({
      lastHour: label.split(" ")[1],
      starttime: null,
      endtime: null,
      Msg: [this.startDateTime, this.endDateTime, this.timeDiffDisplay]
    });
  }

  onCustomApply() {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const now = new Date();

    if (end < start) {
      this.snack.open("End date should be after start date", 'Close', { duration: 3000 });
      return;
    }

    if (end > now) {
      this.snack.open("End date cannot be in the future", 'Close', { duration: 3000 });
      return;
    }

    const days = this.getDateDiffInDays(start, end);

    this.startDateTime = this.formatDate(start);
    this.endDateTime = this.formatDate(end);
    this.timeDiffDisplay = `${days} day${days > 1 ? 's' : ''}`;

    this.ApplyLastRun.emit({
      lastHour: null,
      starttime: this.startDateTime,
      endtime: this.endDateTime,
      Msg: [this.startDateTime, this.endDateTime, this.timeDiffDisplay]
    });
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;
  }

  private pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  private getDateDiffInDays(start: Date, end: Date): number {
    const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  }

  filterPresetOptions() {
    const today = new Date();
    this.filteredPresetOptions = this.presetOptions.filter(option => {
      const dateBefore = new Date();
      dateBefore.setDate(today.getDate() - option.days);
      return dateBefore >= new Date(today.getFullYear(), 0, 1); // Optional limit
    });
  }

  initializeDefaultTimeRange(): void {
    let lastHour: string | null = null;
    if (this.filteredPresetOptions.length > 0) {
      const option = this.filteredPresetOptions[0];
      this.selectPreset(option.days, option.label);
      lastHour = option.label.split(" ")[1];
    }

    this.ApplyLastRun.emit({
      lastHour: lastHour,
      starttime: lastHour ? null : this.startDateTime,
      endtime: lastHour ? null : this.endDateTime,
      Msg: [this.startDateTime, this.endDateTime, this.timeDiffDisplay]
    });
  }

}

