import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { User } from '../../../../../models/user';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { LastDayTimerComponent } from '../../../../../utility/last-hour-timer/last-day-timer.component';
import { StandardReportService } from '../../../../../services/standard-report.service';
import { DecoderService } from '../../../../../services/decoder.service';
import { ReportSchedulePayload } from '../../../../../models/report';

interface DaySchedule {
  selected: boolean;
  time: string;
}

interface CriteriaRow {
  condition: string;
  column: string;
  type: string;
  value: string;
}
interface LastRunPayload {
  lastHour: string | null;
  starttime: string | null;
  endtime: string | null;
  Msg: any[]
}

@Component({
    selector: 'app-standard-form',
    imports: [
        FormsModule,
        CommonModule,
        MatSnackBarModule,
        LastDayTimerComponent, MatDatepickerModule, MatNativeDateModule
    ],
    templateUrl: './standard-form.component.html',
    styleUrl: './standard-form.component.css'
})

export class StandardFormComponent {
  @Output() closeForm = new EventEmitter<void>();
  @ViewChild('selectedBox') selectedBox!: ElementRef<HTMLDivElement>;
  criteriaRows: CriteriaRow[] = [
    { condition: 'AND', column: '', type: '', value: '' }
  ];
  selectedRun: LastRunPayload = {
    lastHour: "1",
    starttime: null,
    endtime: null,
    Msg: []
  };

  showEmail = false;
  showSMS = false;
  isEdit = false;

  toEmails: string[] = [''];
  ccEmails: string[] = [''];
  phoneNumbers: string[] = [''];
  reports: any[] = [];
  reportId: number | null = null;
  userDetails: User | null = null;
  userId: any;
  selectedDays: string[] = [];
  commonTime: string = '';
  monthlyDate: string = ''; // format: yyyy-MM-dd
  monthlyDay: number | null = null;
  monthlyTime: string = '09:00';

  weekdays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  dailyAllSelected = false;
  allDaysTime: string = '';

  schedule: {
    frequency: string;
    daily: { [key: string]: { selected: boolean, time: string } };
  } = {
      frequency: 'daily',
      daily: {}
    };
  activeTab: string = 'Daily';

  reportSchedule: ReportSchedulePayload = {
    reportId: 0,
    reportName: '',
    toEmails: '',
    scheduledTime: '',
    status: true,
    createdBy: 41,
    frequency: 'DAILY',
    ccEmails: ''
  };

  toast = {
    visible: false,
    message: '',
    type: ''
  };
  message!: string;


  constructor(private standardReportService: StandardReportService, private decoderService: DecoderService,) { }

  ngOnInit() {
    this.getUserDetails()
    this.loadReports();
    this.weekdays.forEach(day => {
      this.schedule.daily[day] = { selected: false, time: '' };
    });
  }
  onSaveOrCancel() {
    this.closeForm.emit();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    console.log('Active tab set to:', tab);
  }

  availableColumns: { group: string, items: string[] }[] = [
    { group: 'Hardware', items: ['Hardware Name', 'Hardware Detected Time', 'Hardware Type', 'Manufacturer', 'Serial Number', 'Hardware Status'] },
    { group: 'Printer', items: ['Printer Driver Name', 'Printer Port Name', 'Printer Type', 'Printer Status', 'Print Queue', 'Default Printer'] },
    { group: 'Network Adapter', items: ['NW Adapter Domain', 'NW Adapter Host', 'IP Address', 'MAC Address', 'Connection Type', 'Link Speed'] },
    { group: 'CPU', items: ['Processor Name', 'Core Count', 'Thread Count', 'Clock Speed', 'Architecture', 'Cache Size'] },
    { group: 'Memory', items: ['Total RAM', 'Available RAM', 'Memory Type', 'Memory Speed', 'Memory Slots Used'] },
    { group: 'Storage', items: ['Disk Name', 'Disk Type', 'Total Space', 'Free Space', 'Partition Count', 'Disk Status'] },
    { group: 'Operating System', items: ['OS Name', 'OS Version', 'OS Architecture', 'Install Date', 'Last Boot Time'] },
    { group: 'User Info', items: ['User Name', 'User Domain', 'Login Time', 'User Role', 'Session Duration'] },
    { group: 'Software', items: ['Installed Applications', 'Antivirus Name', 'Firewall Status', 'Update Status'] },
    { group: 'Display', items: ['Monitor Name', 'Resolution', 'Refresh Rate', 'Graphics Card', 'Display Port'] }
  ];

  selectedColumns: string[] = [];

  selectedFromAvailable: string[] = [];
  selectedFromSelected: string[] = [];

  isMouseDown = false;



  addCriteriaRow(): void {
    this.criteriaRows.push({ condition: 'AND', column: '', type: '', value: '' });
  }


  removeCriteriaRow(index: number): void {
    if (this.criteriaRows.length > 1) {
      this.criteriaRows.splice(index, 1);
    }
  }
  toggleAvailableSelection(item: string, event: MouseEvent, isHover = false) {
    if (isHover && !this.isMouseDown) return;

    const index = this.selectedFromAvailable.indexOf(item);
    if (index > -1 && isHover) return; // don't unselect while dragging

    if (index > -1) {
      this.selectedFromAvailable.splice(index, 1);
    } else {
      this.selectedFromAvailable.push(item);
    }
  }

  toggleSelectedSelection(item: string, event: MouseEvent, isHover = false) {
    if (isHover && !this.isMouseDown) return;

    const index = this.selectedFromSelected.indexOf(item);
    if (index > -1 && isHover) return;

    if (index > -1) {
      this.selectedFromSelected.splice(index, 1);
    } else {
      this.selectedFromSelected.push(item);
    }
  }

  moveToSelected() {
    this.selectedColumns.push(...this.selectedFromAvailable);
    this.selectedColumns = Array.from(new Set(this.selectedColumns));
    this.selectedFromAvailable = [];
  }

  deleteFromSelected() {
    this.selectedColumns = this.selectedColumns.filter(
      item => !this.selectedFromSelected.includes(item)
    );
    this.selectedFromSelected = [];
    this.isMouseDown = false;
  }

  onMouseDown() {
    this.isMouseDown = true;
  }

  onMouseUp() {
    this.isMouseDown = false;
  }

  scrollSelectedBox(direction: 'up' | 'down') {
    const scrollAmount = 50;
    if (this.selectedBox) {
      this.selectedBox.nativeElement.scrollBy({
        top: direction === 'up' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  onApplyLastRun(LastRun: LastRunPayload) {

    this.selectedRun = LastRun
    console.log("Selected Run Interval:", LastRun);
    // call api
  }







  toggleEmail(event: any) {
    this.showEmail = event.target.checked;
  }

  toggleSMS(event: any) {
    this.showSMS = event.target.checked;
  }

  addToEmail() {
    this.toEmails.push('');
  }

  removeToEmail(index: number) {
    this.toEmails.splice(index, 1);
  }

  addCcEmail() {
    this.ccEmails.push('');
  }

  removeCcEmail(index: number) {
    this.ccEmails.splice(index, 1);
  }

  addPhoneNumber() {
    this.phoneNumbers.push('');
  }

  removePhoneNumber(index: number) {
    this.phoneNumbers.splice(index, 1);
  }



  onDateChange() {
    if (this.monthlyDate) {
      const date = new Date(this.monthlyDate);
      const dayOnly = date.getDate();
      this.reportSchedule.scheduledDOM = dayOnly;
      console.log('Scheduled Day of Month:', dayOnly);
    }
  }

  getOrdinal(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  get monthlySchedule() {
    return {
      dayOfMonth: this.monthlyDay,
      time: this.monthlyTime
    };
  }

  loadReports(): void {
    this.standardReportService.getAllReports().subscribe(
      (data) => {
        this.reports = data.serviceResponse || [];

        console.log("all reports ", data);
      },
      (error) => {
        console.error('Error fetching reports:', error);
      }
    );
  }

  getUserDetails() {
    this.userDetails = sessionStorage.getItem('currentUser')
      ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!))
      : null;
    this.userId = this.userDetails?.id;
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toast.message = message;
    this.toast.type = type;
    this.toast.visible = true;
    setTimeout(() => this.toast.visible = false, 3000);
  }


  submitSchedule() {
    let payload: ReportSchedulePayload | null = null;
    console.log("this.activeTab.toLowerCase()", this.activeTab.toLowerCase());

    if (this.activeTab.toLowerCase() == 'daily') {
      this.reportSchedule.frequency = 'DAILY';
      this.reportSchedule.createdBy = this.userId;
      this.reportSchedule.toEmails = this.toEmails.filter(e => e.trim()).join(',');
      this.reportSchedule.ccEmails = this.ccEmails.filter(e => e.trim()).join(',');
      payload = { ...this.reportSchedule };
    }

    else if (this.activeTab.toLowerCase() == 'weekly') {
      this.reportSchedule.frequency = 'WEEKLY';
      this.reportSchedule.createdBy = this.userId;
      console.log("selectedDays ", this.selectedDays);

      // this.reportSchedule.scheduledDOM = Number(this.monthlyDate.split("/")[0]);
      this.reportSchedule.scheduledDOW = this.getDayNumbersString(this.selectedDays);
      this.reportSchedule.toEmails = this.toEmails.filter(e => e.trim()).join(',');
      this.reportSchedule.ccEmails = this.ccEmails.filter(e => e.trim()).join(',');
      payload = { ...this.reportSchedule };
    }
    else if (this.activeTab.toLowerCase() == 'monthly') {
      this.reportSchedule.frequency = 'MONTHLY';
      this.reportSchedule.createdBy = this.userId;
      console.log("this.monthly ", this.monthlyDate.split("/")[0]);

      // this.reportSchedule.scheduledDOM = Number(this.monthlyDate.split("/")[0]);
      this.reportSchedule.toEmails = this.toEmails.filter(e => e.trim()).join(',');
      this.reportSchedule.ccEmails = this.ccEmails.filter(e => e.trim()).join(',');
      payload = { ...this.reportSchedule };
    }

    if (!payload) {
      console.warn('No valid payload to submit for activeTab:', this.activeTab);
      this.message = 'No valid payload to submit for activeTab:', this.activeTab
      this.showToast(this.message, 'error');
      return;
    }

    this.standardReportService.createReportSchedule(payload).subscribe({
      next: (res) => {
        const msg = res?.serviceMessage || 'Schedule created successfully';

        if (res?.serviceStatus === 'Fail') {
          this.message = `Error creating schedule: ${msg}`;
          this.showToast(this.message, 'error');
        } else {
          this.message = `Schedule Created: ${msg}`;
          this.showToast(this.message, 'success');
        }

        console.log('Schedule response:', res);
      },
      error: (err) => {
        const errMsg = err?.error?.serviceMessage || 'Unknown error creating schedule';
        this.message = `Error creating schedule: ${errMsg}`;
        this.showToast(this.message, 'error');
      }
    });
  }

  onReportChange(selectedId: number) {
    this.reportId = selectedId;

    const selectedReport = this.reports.find(r => r.id == selectedId);
    if (selectedReport) {
      this.reportSchedule.reportId = selectedReport.id;
      this.reportSchedule.reportName = selectedReport.reportName;
      this.selectedColumns = selectedReport.reportColumn.split(",");
    } else {
      this.reportSchedule.reportId = 0;
      this.reportSchedule.reportName = '';
    }
  }



  toggleAllDailyDays() {
    if (this.dailyAllSelected) {
      this.weekdays.forEach(day => {
        this.schedule.daily[day].selected = true;
        this.schedule.daily[day].time = this.allDaysTime;
      });
    } else {
      this.weekdays.forEach(day => {
        this.schedule.daily[day].selected = false;
        this.schedule.daily[day].time = '';
      });
    }
    this.updateSelectedDays();
  }


  onDaySelectionChange() {
    this.updateSelectedDays();


    if (this.selectedDays.length && !this.commonTime) {
      this.commonTime = '09:00';
      this.onCommonTimeChange(this.commonTime);
    }
  }


  updateSelectedDays() {
    this.selectedDays = this.weekdays.filter(day => this.schedule.daily[day].selected);
  }


  onCommonTimeChange(time: string) {
    this.selectedDays.forEach(day => {
      this.schedule.daily[day].time = time;
    });
  }


  onAllDaysTimeChange(time: string) {
    this.weekdays.forEach(day => {
      this.schedule.daily[day].time = time;
    });
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  getDayNumbersString(days: string[]): string {
    const dayMap: { [key: string]: number } = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7
    };

    const dayNumbers = days
      .map(day => dayMap[day])
      .filter(num => num !== undefined);

    return dayNumbers.join(',');
  }


}
