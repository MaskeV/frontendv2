import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomReportFormComponent } from '../custom-report/custom-report-form/custom-report-form.component';
import { PaginatePipe } from '../../../../pipes/paginate.pipe';
import { StandardReportService } from '../../../../services/standard-report.service';
import { ReportSchedulePayload } from '../../../../models/report';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-scheduled-reports',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        CustomReportFormComponent,
        PaginatePipe,
        NgbDropdownModule
    ],
    templateUrl: './scheduled-reports.component.html',
    styleUrl: './scheduled-reports.component.css'
})

export class ScheduledReportsComponent {

  allData: any[] = [];

  inputPage: number = 1;
  addReport: boolean = false
  pageSizeOptions = [5, 10, 20];
  pageSize = 5;
  currentPage = 1;
  totalItems = 0;
  totalPages = 0;
  pagedData: any[] = [];

  zones: any[] = [];
  zonePage: number = -1;
  zoneSize: number = -1;

  zoneIdNameMap: { [id: number]: string } = {};
  teamIdNameMap: { [id: number]: string } = {};

  reportId!: number;
  reportUpdateData: any[] = [];

  isUpdate: boolean = false;

  constructor(
    // private dateService: DateService,
    private standardReportService: StandardReportService,
  ) { }

  ngOnInit() {
    this.getAllReportMeteringSchedule();
    this.updatePagedData();

  }

    toast = {
    visible: false,
    message: '',
    type: ''
  };

  showToast(message: string, type: 'success' | 'error') {
    this.toast.message = message;
    this.toast.type = type;
    this.toast.visible = true;
    setTimeout(() => this.toast.visible = false, 3000);
  }

  getAllReportMeteringSchedule(): void {
    this.allData = [];
    this.standardReportService.getAllReportMeteringSchedule().subscribe((data: any) => {
      const responseData = data?.serviceResponse;

      if (Array.isArray(responseData)) {
        this.allData = responseData;
        this.getZones();
        this.totalItems = this.allData.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
      } else {
        this.allData = [];
        this.totalItems = this.allData.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
      }
    });
  }

  getZones(): void {
    this.standardReportService.getZones(this.zonePage, this.zoneSize).subscribe((data: any) => {
      const responseData = data?.serviceResponse;
      this.zones = Array.isArray(responseData) ? responseData : [];

      this.zoneIdNameMap = {};
      this.zones.forEach(zone => {
        this.zoneIdNameMap[zone.id] = zone.name;
      });

      this.loadAllTeamsFromHistory(); // load team names next
    });
  }


  loadAllTeamsFromHistory(): void {
    const uniqueZoneIds = new Set<number>();

    this.allData.forEach(report => {
      report.meteringMappings?.forEach((mapping: { zoneId: any; }) => {
        if (mapping.zoneId) {
          uniqueZoneIds.add(Number(mapping.zoneId));
        }
      });
    });

    const zoneIdArray = Array.from(uniqueZoneIds);
    let completed = 0;

    this.teamIdNameMap = {};

    zoneIdArray.forEach(zoneId => {
      this.standardReportService.getAllGroupsByZone(zoneId, this.zonePage, this.zoneSize)
        .subscribe((data: any) => {
          const responseData = data?.serviceResponse;
          if (Array.isArray(responseData)) {
            responseData.forEach((team: { id: number | string, name: string }) => {
              this.teamIdNameMap[Number(team.id)] = team.name;
            });
          }

          completed++;
          if (completed === zoneIdArray.length) {
            this.mapZoneAndTeamNames(); // only after all team data is fetched
          }
        });
    });
  }


  mapZoneAndTeamNames(): void {
    this.allData.forEach(report => {
      if (Array.isArray(report.meteringMappings)) {
        report.meteringMappings.forEach((mapping: {
          zoneName?: string;
          zoneId: string | number;
          teamName?: string;
          teamId: string | number;
        }) => {
          const zoneKey = Number(mapping.zoneId);
          const teamKey = Number(mapping.teamId);

          mapping.zoneName = this.zoneIdNameMap[zoneKey] || 'Unknown Zone';
          mapping.teamName = this.teamIdNameMap[teamKey] || 'Unknown Team';
        });
      }
    });
  }

  dayNumberToName(dayNum: string): string {
    const daysMap: { [key: string]: string } = {
      '1': 'Mon',
      '2': 'Tue',
      '3': 'Wed',
      '4': 'Thu',
      '5': 'Fri',
      '6': 'Sat',
      '7': 'Sun'
    };
    return daysMap[dayNum] || 'Unknown';
  }

  formatScheduledDOW(dowStr: string | null): string {
    if (!dowStr) return '';
    return dowStr
      .split(',')
      .map(dayNum => this.dayNumberToName(dayNum.trim()))
      .join(', ');
  }

  updatePagedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = this.currentPage * this.pageSize;
    this.pagedData = this.allData.slice(start, end);
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedData();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagedData();
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }
  addNew(): void {
    this.addReport = true
  }

  handleCloseForm() {
    this.addReport = false;
  }

  goToPage() {
    console.log(this.inputPage)
    let page = Number(this.inputPage);
    if (isNaN(page) || page < 1) page = 1;
    else if (page > this.totalPages) page = this.totalPages;

    this.currentPage = page;
    this.inputPage = page;
    console.log(this.currentPage)
  }

  getReportMeteringSchedule(id: number): void {
    this.isUpdate = true;
    this.reportUpdateData = [];
    this.standardReportService.getReportMeteringSchedule(id).subscribe((data: any) => {
      const responseData = data?.serviceResponse;
      this.reportUpdateData = responseData;
    });
  }

  deleteReportMeteringSchedule(id: number): void {
    if (confirm('Are you sure you want to delete this Report?')) {
      this.standardReportService.deleteReportMeteringSchedule(id).subscribe({
        next: (data: any) => {
          console.log('Delete successful:', data);
          this.showToast('Delete successful.', 'success');
          this.getAllReportMeteringSchedule();
        },
        error: (err: any) => {
          console.error('Delete failed:', err);
          this.showToast('Delete failed.', 'error');
        }
      });
    }
  }

  cancleUpdateReport(): void{
    this.reportUpdateData = [];
    this.isUpdate = false;
  }


  showEmail = false;
  showSMS = false;
  toEmails: string[] = [''];
  ccEmails: string[] = [''];
  phoneNumbers: string[] = [''];

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

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  days: string[] = ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  selectedDays: string[] = [];

  onDayToggle(day: string, checked: boolean): void {
    if (checked) {
      if (day === 'All') {
        this.selectedDays = [...this.days];
      } else {
        this.selectedDays = this.selectedDays.filter(d => d !== 'All');
        if (!this.selectedDays.includes(day)) {
          this.selectedDays.push(day);
        }
      }
    } else {
      this.selectedDays = this.selectedDays.filter(d => d !== day);
    }

    // Optional cleanup: ensure All is unchecked if not all selected
    if (this.selectedDays.length !== this.days.length && this.selectedDays.includes('All')) {
      this.selectedDays = this.selectedDays.filter(d => d !== 'All');
    }
  }

}
