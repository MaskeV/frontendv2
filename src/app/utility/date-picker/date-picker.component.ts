import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { DateService } from '../../services/date.service';
import { Datesetter } from '../../models/dateSetter';
import { CommonModule, } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-picker',
  imports: [CommonModule, FormsModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.css'
})
export class DatePickerComponent {

  @ViewChild('dropdownWrapper') dropdownWrapper!: ElementRef;

  filteredPresetOptions: { label: string; minutes: number }[] = [];
  activeTab: 'first' | 'second' = 'first';
  timeDiffDisplay: string = '';
  selectedPresetLabel: any;
  showToast: any;
  currentDate: string | number | Date | undefined;
  availableTime: any;


  startDateTime: string | null = null;
  endDateTime: string | null = null;
  minStartDate: string | null = null;
  maxStartDate: string | null = null;
  minEndDate: string | null = null;
  maxEndDate: string | null = null;
  datemodel: Datesetter = new Datesetter();
  setButtonClicked: boolean = false;

  dropdownOpen: boolean = false; // State to control the dropdown
  selectedOptionLabel: string = 'Preset Time'; // Label for the selected option
  iconColor: string = 'white'; // default

  prevStartTime: string = '';
  prevEndTime: string = '';

  hover: boolean = false;
  showCard2: boolean = false;
  hideCustomTab = false;
  presetOptions: { label: string; minutes: number }[] = [];

  constructor(private dateService: DateService, private eRef: ElementRef) { }

  ngOnInit() {
    this.setDefaultValues();
    this.selectedOptionLabel = 'Last 30 minutes';
    this.timeDiffDisplay = '30 minutes';
    this.presetOptions = [
      { label: 'Last 15 minutes', minutes: 15 },
      { label: 'Last 30 minutes', minutes: 30 },
      { label: 'Last 1 hour', minutes: 60 },
      { label: 'Last 1 day', minutes: 1440 },
      { label: 'Last 1 week', minutes: 10080 }
    ];

    this.filteredPresetOptions = [...this.presetOptions];
    this.dateService.trigger$.subscribe(() => {
      this.setDefaultValues();
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
    return isoString.slice(0, 16);
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
      this.iconColor = 'white'; // reset back after setting
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

  onPresetClick(option: { label: string; minutes: number }) {
    switch (option.label) {
      case 'Last 15 minutes':
        this.onPresetSelect('last15');
        break;
      case 'Last 30 minutes':
        this.onPresetSelect('last30');
        break;
      case 'Last 1 hour':
        this.onPresetSelect('last1hour');
        break;
      case 'Last 1 day':
        this.onPresetSelect('last1day');
        break;
      case 'Last 1 week':
        this.onPresetSelect('last1week');
        break;
    }

    this.showCard2 = false;
  }


  onPresetSelect(option: string): void {
    this.dropdownOpen = false; // Close the dropdown
    const now = new Date();
    const nowIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    switch (option) {
      case 'last15':
        this.startDateTime = this.formatDateToInput(new Date(nowIST.getTime() - 15 * 60 * 1000));
        this.endDateTime = this.formatDateToInput(nowIST);
        this.selectedOptionLabel = 'Last 15 minutes';
        this.timeDiffDisplay = '15 minutes';
        this.onSetDateTime();
        break;
      case 'last30':
        this.startDateTime = this.formatDateToInput(new Date(nowIST.getTime() - 30 * 60 * 1000));
        this.endDateTime = this.formatDateToInput(nowIST);
        this.selectedOptionLabel = 'Last 30 minutes';
        this.timeDiffDisplay = '30 minutes';
        this.onSetDateTime();
        break;
      case 'last1hour':
        this.startDateTime = this.formatDateToInput(new Date(nowIST.getTime() - 60 * 60 * 1000));
        this.endDateTime = this.formatDateToInput(nowIST);
        this.selectedOptionLabel = 'Last 1 hour';
        this.timeDiffDisplay = '1 hour';
        this.onSetDateTime();
        break;
      case 'last1day':
        this.startDateTime = this.formatDateToInput(new Date(nowIST.getTime() - 24 * 60 * 60 * 1000));
        this.endDateTime = this.formatDateToInput(nowIST);
        this.selectedOptionLabel = 'Last 1 day';
        this.timeDiffDisplay = '1 day';
        this.onSetDateTime();
        break;
      case 'last1week':
        this.startDateTime = this.formatDateToInput(new Date(nowIST.getTime() - 7 * 24 * 60 * 60 * 1000));
        this.endDateTime = this.formatDateToInput(nowIST);
        this.selectedOptionLabel = 'Last 1 week';
        this.timeDiffDisplay = '1 week';
        this.onSetDateTime();
        break;
      case 'last1month':
        this.startDateTime = this.formatDateToInput(new Date(nowIST.getTime() - 30 * 24 * 60 * 60 * 1000));
        this.endDateTime = this.formatDateToInput(nowIST);
        this.selectedOptionLabel = 'Last 1 month';
        this.timeDiffDisplay = '1 month';
        this.onSetDateTime();
        break;
      default:
        this.setDefaultValues();
        this.selectedOptionLabel = 'Custom';
    }


  }

  // @HostListener('document:click', ['$event'])
  // onClickOutside(event: Event) {
  //   // If the click happens outside the dropdown or the button, close the dropdown
  //   if (!this.eRef.nativeElement.contains(event.target)) {
  //     this.dropdownOpen = false;
  //   }
  // }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.dropdownWrapper && !this.dropdownWrapper.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }

  onStartDateTimeChange(): void {
    this.updateMinMaxEndDates();
    this.checkIfChanged();
  }

  onEndDateTimeChange(): void {
    this.checkIfChanged();
  }
  checkIfChanged(): void {
    if (this.startDateTime !== this.prevStartTime || this.endDateTime !== this.prevEndTime) {
      this.iconColor = '#FBC343';
    } else {
      this.iconColor = 'white';
    }
  }

  toggleCard2() {
    this.showCard2 = !this.showCard2;
    this.activeTab = 'first';
  }

  onCustomApply(): void {
    if (!this.startDateTime || !this.endDateTime) {
      return;
    }
    this.onSetDateTime();
    this.showCard2 = false;
    this.selectedOptionLabel = 'Custom';
    this.timeDiffDisplay = 'Custom';
  }


}
