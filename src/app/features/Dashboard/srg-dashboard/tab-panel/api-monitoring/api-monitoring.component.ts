import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import Highcharts from 'highcharts';
import { Session } from '../../../../../models/session';
import { User } from '../../../../../models/user';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { filter, from, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { ApplicationService } from '../../../../../services/application.service';
import { LoggerService } from '../../../../../services/logger.service';
import { Router } from '@angular/router';
import { DecoderService } from '../../../../../services/decoder.service';
import { DateService } from '../../../../../services/date.service';
import { ApiMonitoringService } from '../../../../../services/api-monitoring.service';
import { UserTypeCrudMapObject } from '../../../../../models/UserTypeCrudMapObject';
import { HighchartsChartModule } from 'highcharts-angular';

@Component({
    selector: 'app-api-monitoring',
    imports: [
        CommonModule,
        FormsModule,
        HighchartsChartModule
    ],
    templateUrl: './api-monitoring.component.html',
    styleUrl: './api-monitoring.component.css'
})
export class ApiMonitoringComponent implements OnInit, OnDestroy {

  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {};

  sessionObject: Session = new Session();
  currentUser = new User();
  browserRefresh: any = false;
  previousViewingIndex: any;
  previousViewingApplication: any;
  applicationList: any;
  appName: any = '';
  currentViewingApplication: any;
  numberOfDocuments!: number;
  returnedRecords: any;
  filteredRecordsList!: any[];
  userTypeCrudMap = new UserTypeCrudMapObject();
  user = new User();
  datemodel: any;
  selectedProject: string = ''; // Currently selected project
  filteredUrls: string[] = []; // URLs filtered based on the selected project
  selectedUrl: string = ''; // Selected URL
  apiMonitoringGraphData: any[] = [];
  apiMonitoringTableData: any[] = [];

  responseBodyModalRef!: NgbModalRef;
  urlDropdown!: unknown[];
  selectedAppId: any;

  currentPage = 1; // Current page number
  itemsPerPage = 10; // Number of items per page

  private datesubscription: Subscription = new Subscription();
    private destroy$ = new Subject<void>();
  

  constructor(
    private applicationService: ApplicationService,
    private loggerService: LoggerService,
    private router: Router,
    private apiMonitoringService: ApiMonitoringService,
    private dateService: DateService,
    public modalService: NgbModal,
    private decoderService: DecoderService,
  ) { }

  ngOnInit(): void {
    this.user = <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!))!;
    this.currentUser.userId = this.user.userId;
    this.sessionObject.featureName = "Monitoring";
    this.sessionObject.menu = "API Monitoring";
    this.sessionObject.configTab = "API Monitoring"
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
    if (this.userTypeCrudMap.view && !this.userTypeCrudMap.create) {
      this.getAllApplicationByUserID();
    }

    const storedAppName = localStorage.getItem('selectedAppName');
    const storedAppId = localStorage.getItem('selectedAppId');
    if (storedAppName) {
      this.selectedProject = storedAppName;
      this.fetchUrlDropdownData(storedAppName);
    }

    this.dateService.setActiveComponent('ApiMonitoringTableComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ApiMonitoringTableComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.fetchApisDropdownData();
        this.onFetchGraphData();
        this.onFetchTableData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  refresh() {
    this.onFetchGraphData();
    this.onFetchTableData();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  getAllApplicationByUserID() {
    this.currentUser.sessionDTO = this.sessionObject;
    this.applicationService.getAllApplicationsByUserID(this.currentUser).pipe(switchMap(data => from(this.decoderService.decodeObject(data))),takeUntil(this.destroy$)).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.applicationList = response.serviceResponse;
        this.applicationList.sort(function (a: { applicationName: string; }, b: { applicationName: string; }) {
          return a.applicationName.toLowerCase().localeCompare(b.applicationName.toLowerCase());
        });
      }
    });
  }

  // TABLE AND GRAPH DATA

  formatTimeBucket(epochTime: number): string {
    const date = new Date(epochTime); // Convert epoch time to a Date object

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Format the date and time as "YYYY-MM-DD HH:mm:ss"
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  onFetchTableData(): void {
    if (!this.selectedProject || !this.selectedUrl) {
      return;
    }
    const encodedProjectName = this.encodeBase64(this.selectedProject);
    const encodedUrl = this.encodeBase64(this.selectedUrl);

    this.apiMonitoringService
      .getApisTableData(this.startTime, this.endTime, encodedProjectName, encodedUrl).pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.apiMonitoringTableData = Object.values(data);
      });
  }

  onFetchGraphData(): void {
    const encodedProjectName = this.encodeBase64(this.selectedProject);
    const encodedUrl = this.encodeBase64(this.selectedUrl);

    this.apiMonitoringService.getApisGraphData(this.startTime, this.endTime, encodedProjectName, encodedUrl).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
        this.apiMonitoringGraphData = Object.values(data);
        const chartData = this.apiMonitoringGraphData.map(item => ({
          key: item.key, 
          averageResponseTime: item.averageResponseTime
        }));

        this.createChart(chartData);
      });
  }

  createChart(data: { key: string; averageResponseTime: number }[]): void {
    const parsedDates = data.map(item => new Date(item.key));

    let format: 'date' | 'time';
    if (parsedDates.length > 1) {
      const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());

      format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
    } else {
      format = 'date';
    }

    const categories = parsedDates.map(date => {
      if (format === 'date') {
        return date.toLocaleDateString();
      } else {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    });

    const seriesData = data.map(item => item.averageResponseTime);

    this.chartOptions = {
      chart: {
        type: 'line',
        backgroundColor: '#212529',
        plotBorderColor: '#fff'
      },
      title: {
        text: 'API Average Response Time',
        style : {
          color: 'white'
        }
      },
      xAxis: {
        categories: categories,
        title: {
          text: format === 'date' ? 'Date' : 'Time'
        },
        labels: {
          style: {
            color: '#666'
          }
        },
        gridLineColor: '#2a2a2a'
      },
      yAxis: {
        min: 0,
        tickAmount: 6,
        title: {
          text: 'Average Response Time (ms)'
        },
        labels: {
          style: {
            color: '#666'
          }
        },
      },
      series: [
        {
          name: 'Average Response Time',
          data: seriesData,
          type: 'line'
        }
      ],
      credits: {
        enabled: false
      },
      legend:{
        enabled: false
      }
    };
  }


  apiMonitoringData: any[] = [];
  startTime!: number;
  endTime!: number;

  fetchApisDropdownData(): void {
    this.apiMonitoringService.getApisDropdownData(this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.apiMonitoringData = Object.values(data);
    });
  }

  fetchUrlDropdownData(appId: string): void {
    this.selectedUrl = '';
    this.urlDropdown = [];
    this.apiMonitoringService.getUrlDropdownData(appId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.urlDropdown = Object.values(data);
    });
  }

  decodeBase64(value: string): string {
    try {
      return atob(value);
    } catch (e) {
      console.error('Error decoding base64:', e);
      return value;
    }
  }

  encodeBase64(value: string): string {
    try {
      return btoa(value);
    } catch (e) {
      console.error('Error encoding base64:', e);
      return value;
    }
  }

  // SORT TABLE

  sortColumn: string = '';
  sortOrder: 'asc' | 'desc' = 'asc';

  sortTable(column: string) {
    this.sortOrder = this.sortColumn === column && this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortColumn = column;

    this.apiMonitoringTableData.sort((a, b) => {
      let valueA = a[column];
      let valueB = b[column];

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (valueA < valueB) {
        return this.sortOrder === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  selectedRow: string = '';

  openResponseBodyModal(template: TemplateRef<any>, responseBody: string) {
    this.selectedRow = responseBody;
    this.responseBodyModalRef = this.modalService.open(template, {
      backdrop: 'static',
      keyboard: false
    });
  }

  reset(): void {
    this.selectedRow = ''; 
  }

  p: number = 1;
  pageChange($event: number) {
    this.p = $event;
  }

  onProjectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.fetchUrlDropdownData(value);
  }
  

}