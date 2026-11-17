import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { DateService } from '../../services/date.service';
import { Datesetter } from '../../models/dateSetter';
import { CommonModule, } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-picker-smetering',
  imports: [CommonModule, FormsModule],
  templateUrl: './date-picker-smetering.component.html',
  styleUrl: './date-picker-smetering.component.css'
})
export class DatePickerSMeteringComponent {

  @ViewChild('dropdownWrapper') dropdownWrapper!: ElementRef;


  startDateTime: string | null = null;
  endDateTime: string | null = null;
  minStartDate: string | null = null;
  maxStartDate: string | null = null;
  minEndDate: string | null = null;
  maxEndDate: string | null = null;
  datemodel: Datesetter = new Datesetter();
  setButtonClicked: boolean = false;

  dropdownOpen: boolean = false; // State to control the dropdown
  selectedOptionLabel: string = 'Preset Day'; // Label for the selected option

  prevStartTime: string = '';
  prevEndTime: string = '';
  constructor(private dateService: DateService, private eRef: ElementRef) { }

  ngOnInit() {
    this.setDefaultValues();
    this.dateService.trigger$.subscribe(() => {
      this.setDefaultValues(); // Replace with the function you want to call
    });
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }


  setDefaultValues(): void {
    const now = new Date();
    const nowIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    // Set the maximum possible start date to now
    this.maxStartDate = this.formatDateToInput(nowIST);

    // Set the minimum start date to 60 days before now
    const sixtyDaysAgo = new Date(nowIST.getTime() - 60 * 24 * 60 * 60 * 1000);
    this.minStartDate = this.formatDateToInput(sixtyDaysAgo);

    this.startDateTime = this.formatDateToInput(new Date(nowIST.getTime() - 30 * 60 * 1000)); // Default: 30 minutes before end date
    this.endDateTime = this.formatDateToInput(nowIST);

    this.updateMinMaxEndDates();
    this.onSetDateTime();
  }

  formatDateToInput(date: Date): string {
    const isoString = date.toISOString();
    return isoString.slice(0, 10); // YYYY-MM-DD
  }

  onSetDateTime(): void {
    this.setButtonClicked = true;
    if (this.startDateTime && this.endDateTime) {
      if (this.prevStartTime === this.startDateTime && this.prevEndTime === this.endDateTime) {
        return;
      }
      this.updateDateModel();
      this.updateMinMaxEndDates();
      this.prevStartTime = this.startDateTime;
      this.prevEndTime = this.endDateTime;
    } else {
      this.setDefaultValues();
    }
  }
  Preset(): void {
    this.selectedOptionLabel = 'Preset Time';
  }

  updateDateModel(): void {
    if (this.setButtonClicked && this.startDateTime && this.endDateTime) {
      this.datemodel.startdateTime = this.convertDateFormat(this.startDateTime);
      this.datemodel.enddateTime = this.convertDateFormat(this.endDateTime);
      this.dateService.setDate(this.datemodel);

      this.setButtonClicked = false;
    }
  }

  convertDateFormat(dateTime: string): string {
    return dateTime.replace(/[-:T]/g, '');
  }

  onStartDateTimeChange(): void {
    this.updateMinMaxEndDates();
  }

  updateMinMaxEndDates(): void {
    if (this.startDateTime) {
      this.minEndDate = this.startDateTime;
      const startDate = new Date(this.startDateTime);
      const sixtyDaysLater = new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000);
      this.maxEndDate = this.formatDateToInput(sixtyDaysLater);
    } else {
      this.minEndDate = null;
      this.maxEndDate = this.maxStartDate;
    }
  }

  onPresetSelect(option: string): void {
    this.dropdownOpen = false; // Close the dropdown
    const now = new Date();
    const nowIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);  // IST adjustment if needed

    let startDate: Date;

    switch (option) {
      case 'last1day':
        startDate = new Date(nowIST.getTime() - 1 * 24 * 60 * 60 * 1000);
        this.selectedOptionLabel = 'Last 1 day';
        break;
      case 'last7days':
        startDate = new Date(nowIST.getTime() - 7 * 24 * 60 * 60 * 1000);
        this.selectedOptionLabel = 'Last 7 days';
        break;
      case 'last15days':
        startDate = new Date(nowIST.getTime() - 15 * 24 * 60 * 60 * 1000);
        this.selectedOptionLabel = 'Last 15 days';
        break;
      case 'last30days':
        startDate = new Date(nowIST.getTime() - 30 * 24 * 60 * 60 * 1000);
        this.selectedOptionLabel = 'Last 30 days';
        break;
      default:
        this.setDefaultValues();
        this.selectedOptionLabel = 'Custom';
        return;
    }

    this.startDateTime = this.formatDateToInput(startDate);
    this.endDateTime = this.formatDateToInput(nowIST);
    this.onSetDateTime();
  }


  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.dropdownWrapper && !this.dropdownWrapper.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }


}
