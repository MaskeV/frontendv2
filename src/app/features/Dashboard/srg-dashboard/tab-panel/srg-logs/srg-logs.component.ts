import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { filter, first, from, Subject, Subscription, switchMap, take } from 'rxjs';
import { DecoderService } from '../../../../../services/decoder.service';
import { AppComponent, browserRefresh } from '../../../../../app.component';
import { AuthenticationService } from '../../../../../services/authentication.service';
import { ApplicationService } from '../../../../../services/application.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LoggerService } from '../../../../../services/logger.service';
import { DataDiscoverService } from '../../../../../services/data-discover.service';
import { ValidationService } from '../../../../../services/validation.service';
import { ExcelService } from '../../../../../services/excel.service';
import { Session } from '../../../../../models/session';
import Highcharts from 'highcharts';
import { User } from '../../../../../models/user';
import moment from 'moment';
import { DataDiscoveryObj, DocumentOBJ } from '../../../../../models/dataDiscoveryObj';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HighchartsChartModule } from 'highcharts-angular';
import { FilterAllPipe } from '../../../../../models/filterAllPipe';
import { KeyValuePipe } from "../../../../../pipes/key-value.pipe";
import { DateService } from '../../../../../services/date.service';
import { Datesetter } from '../../../../../models/dateSetter';

@Component({
    selector: 'app-srg-logs',
    imports: [
        CommonModule,
        FormsModule,
        HighchartsChartModule,
        KeyValuePipe
    ],
    templateUrl: './srg-logs.component.html',
    styleUrl: './srg-logs.component.css'
})
export class SrgLogsComponent implements OnInit, OnDestroy {
  indexList: any;
  indexName: any = '';
  indexRawData: any;
  indexDet!: any[];
  fromDate: any;
  toDate: any;
  searchText: any;
  tableSwitch: any;
  indexDetMain: any;
  returnedRecords: any;
  filteredRecordsList!: any[];
  fromTODate: any;
  isCustomFilter: boolean = false;
  toggle: number = 1;

  public max = new Date();

  modalRef!: NgbModalRef;
  alertMessage: any;
  tableViewTypeActivate!: string;
  rowViewTypeActivate: string = "text-success";
  applicationList: any;
  currentUser!: User;
  appName: any = '';
  fromTODuration: string = "Select";
  // dateFormat = 'YYYY-MM-DD HH:mm:ss';
  searchTerm: string = "";
  updatedPitId!: string;
  paginationReferenceArray!: any[];
  numberOfDocuments!: number;

  dataArr: DocumentOBJ[] = [];
  p: any;
  j: number = 1;
  searchText2: any
  sortDirection = 'asc';
  sortparam: any;
  indexTotalList = new Map;
  elkId: any;
  Highcharts: typeof Highcharts = Highcharts;
  columnChart: Highcharts.Options = {};
  timeStampArray: any;
  dataList: any;
  finaldataList: any;

  sessionObject: Session = new Session();
  currentViewingApplication: any;
  previousViewingApplication: any;
  currentViewingIndex: any;
  previousViewingIndex: any;
  browserRefresh: any = false;
  viewEndTime: any;
  viewStartTime: any;
  showChart: boolean = true;
  kqlQuery: any;
  modalVisible = false;
  private destroy$ = new Subject<void>();
  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  startTime!: number;
  endTime!: number;
  thresholdst!: number;

  selectedProject: string = '';
  @ViewChild('alertTemplate', { static: true }) alertTemplateRef!: TemplateRef<any>;

  @ViewChild('alert_message')
  private alertTemplate!: TemplateRef<any>;

  @ViewChild('exportModal')
  private exportModalRef!: TemplateRef<any>;

  allExportFields: string[] = [];
  exportFieldSelection: { [key: string]: boolean } = {};
  exportFieldSearch: string = '';
  isExporting: boolean = false;
  public startAt = new Date(2019, 2, 15, 24, 0, 0);
  constructor(private dataDiscoverService: DataDiscoverService, private decoderService: DecoderService
    , private excelService: ExcelService, public appComponenet: AppComponent, private dateService: DateService
    , private modalService: NgbModal, private applicationService: ApplicationService, private activatedroute: ActivatedRoute
    , private authService: AuthenticationService, private validationService: ValidationService, private router: Router, private loggerService: LoggerService) {
    this.authService.currentUser.subscribe(x => {
      if (x) {
        this.currentUser = x;
      }
    });
  }

  expandedCards: Set<number> = new Set();
  expandedLogIndex: number | null = null;
  currentLogPage: number = 1;

  toggleCard(index: number) {
    if (this.expandedCards.has(index)) {
      this.expandedCards.delete(index);
    } else {
      this.expandedCards.add(index);
    }
  }

  toggleDetailLog(i: number) {
    this.expandedLogIndex = this.expandedLogIndex === i ? null : i;
  }

  formatTimeBucket(timeBucket: number): string {
    const s = String(timeBucket);
    if (s.length < 12) return s;
    return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)} ${s.substring(8, 10)}:${s.substring(10, 12)}:${s.substring(12, 14) || '00'}`;
  }

  readonly logPageSize = 10;

  get pagedIndexDet(): any[] {
    if (!this.indexDet) return [];
    const start = (this.currentLogPage - 1) * this.logPageSize;
    return this.indexDet.slice(start, start + this.logPageSize);
  }

  get totalLogPages(): number {
    if (!this.indexDet || !this.indexDet.length) return 1;
    return Math.ceil(this.indexDet.length / this.logPageSize);
  }

  get logItemRange(): string {
    if (!this.indexDet || !this.indexDet.length) return '0 of 0';
    const start = (this.currentLogPage - 1) * this.logPageSize + 1;
    const end = Math.min(this.currentLogPage * this.logPageSize, this.indexDet.length);
    return `${start}–${end} of ${this.indexDet.length}`;
  }

  prevLogPage() {
    if (this.currentLogPage > 1) {
      this.currentLogPage--;
      this.expandedLogIndex = null;
    }
  }

  nextLogPage() {
    if (this.currentLogPage < this.totalLogPages) {
      this.currentLogPage++;
      this.expandedLogIndex = null;
    }
  }

  getLogLevel(item: any): string {
    for (const key of ['level', 'log_level', 'severity', 'Level', 'LOG_LEVEL']) {
      if (item[key] != null && item[key] !== '') return String(item[key]).toUpperCase();
    }
    if (item.log) {
      const match = /\b(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\b/.exec(item.log);
      if (match) return match[1].toUpperCase();
    }
    return '-';
  }

  getLevelBadgeClass(level: string): string {
    switch (level) {
      case 'INFO':    return 'srg-level-badge--info';
      case 'WARN':
      case 'WARNING': return 'srg-level-badge--warn';
      case 'ERROR':
      case 'ERR':     return 'srg-level-badge--error';
      case 'DEBUG':   return 'srg-level-badge--debug';
      case 'TRACE':   return 'srg-level-badge--trace';
      case 'FATAL':   return 'srg-level-badge--fatal';
      default:        return '';
    }
  }

  copyToClipboard(val: any) {
    const textToCopy = typeof val === 'string' ? val : JSON.stringify(val);
    navigator.clipboard.writeText(textToCopy).then(() => {
      console.log('Value copied to clipboard');
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }

  // for time fromTODate
  ngOnInit(): void {
    this.browserRefresh = browserRefresh;
    if (!this.browserRefresh) {
      sessionStorage.setItem("onPageNavigateTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
    }
    this.sessionObject.featureName = "Data Discover";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.previousViewingApplication = sessionStorage.getItem("previousViewingApplication");
    this.previousViewingIndex = sessionStorage.getItem("previousViewingIndex");
    if (this.browserRefresh) {
      if (this.previousViewingIndex != null || this.previousViewingIndex != undefined) {
        sessionStorage.setItem("viewEndTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
        this.sessionObject.applicationName = this.previousViewingApplication;
        this.sessionObject.indexName = this.previousViewingIndex;
        sessionStorage.removeItem("onPageExitTime");
        this.loggerService.logMyInfo(this.sessionObject, '/data-discover');
      }
    }
    this.currentViewingApplication = null;

    // this.getAllIndicesByUserID();
    this.getAllApplicationByUserID();
    this.numberOfDocuments = 10;
    this.dataDiscoverService.currentMessage.subscribe((message: any) => this.returnedRecords = message);
    this.dataDiscoverService.filteredList.subscribe((list: any[]) => this.filteredRecordsList = list);

    const storedAppName = localStorage.getItem('selectedAppName');
    if (storedAppName) {
      this.appName = storedAppName;
      this.getAllIndicesByAppNameAndUserID(this.alertTemplateRef);
    }
    

    this.dateService.setActiveComponent('SrgLogsComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'SrgLogsComponent'),
      switchMap(() => this.dateService.date$)).subscribe((dates) => {
        this.datemodel = dates;        
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
      }
    );
  }

  ngOnDestroy(): void {
    if (this.previousViewingIndex != null || this.previousViewingIndex != undefined) {
      sessionStorage.setItem("viewEndTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
      this.sessionObject.applicationName = this.previousViewingApplication;
      this.sessionObject.indexName = this.previousViewingIndex;
    }
    sessionStorage.setItem("onPageExitTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
    this.loggerService.logMyInfo(this.sessionObject, '/data-discover');
    sessionStorage.removeItem("previousViewingApplication");
    sessionStorage.removeItem("previousViewingIndex");

    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  formatForThresholdDate(dateStr: string): number {
    const yyyy = parseInt(dateStr.substring(0, 4));
    const MM = parseInt(dateStr.substring(4, 6)) - 1;
    const dd = parseInt(dateStr.substring(6, 8));
    const hh = parseInt(dateStr.substring(8, 10));
    const mm = parseInt(dateStr.substring(10, 12));

    let inputDate = new Date(yyyy, MM, dd, hh, mm);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(inputDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate.getTime() === today.getTime()) {
      inputDate.setDate(inputDate.getDate() - 1);
    }

    const newYYYY = inputDate.getFullYear();
    const newMM = String(inputDate.getMonth() + 1).padStart(2, "0");
    const newDD = String(inputDate.getDate()).padStart(2, "0");
    const newHH = String(inputDate.getHours()).padStart(2, "0");
    const newMMm = String(inputDate.getMinutes()).padStart(2, "0");

    return parseInt(`${newYYYY}${newMM}${newDD}${newHH}${newMMm}`);
  }

  formatToISO(dateStr: string): string {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 12) return new Date().toISOString();
    const yyyy = parseInt(dateStr.substring(0, 4));
    const MM = parseInt(dateStr.substring(4, 6)) - 1;
    const dd = parseInt(dateStr.substring(6, 8));
    const hh = parseInt(dateStr.substring(8, 10));
    const mm = parseInt(dateStr.substring(10, 12));
    
    let ss = 0;
    if (dateStr.length >= 14) {
      ss = parseInt(dateStr.substring(12, 14));
    }
    
    const inputDate = new Date(yyyy, MM, dd, hh, mm, ss);
    return inputDate.toISOString();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, '');
    date = date.replace(/:/g, '');
    date = date.replace(' ', '');
    return parseInt(date);
  }

  openCustomFilter() {
    if (this.toggle === 1) {
      this.isCustomFilter = true;
      this.toggle = 2;
      this.fromTODuration = '';
    }
    else {
      this.isCustomFilter = false;
      this.toggle = 1;
      this.fromTODate = null;
      this.fromTODuration = "15_MINUTE";
    }

  }
  closeCustomFilter() {
    this.isCustomFilter = false;
    this.toggle = 1;
    this.fromTODate = null;

  }

  getAllApplicationByUserID() {
    this.applicationService.getFullApplicationData(this.currentUser.userId, 'SRG', this.sessionObject).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.applicationList = response.serviceResponse.applications;
        this.applicationList.sort(function (a: { applicationName: string; }, b: { applicationName: string; }) {
          return a.applicationName.toLowerCase().localeCompare(b.applicationName.toLowerCase());
        });

      }
    });
  }

  getAllIndicesByAppNameAndUserID(alertTemplate: TemplateRef<any>) {
    this.indexName = "";
    let element = document.getElementById('index') as HTMLSelectElement;
    element.disabled = true;
    this.indexList = [];
    let indList: string[] = [];
    this.sessionObject.applicationName = this.appName;
    this.sessionObject.indexName = null;

    this.currentViewingApplication = this.appName;
    sessionStorage.setItem("previousViewingApplication", this.appName);
    this.previousViewingIndex = sessionStorage.getItem("previousViewingIndex");
    let data = { applicationName: this.appName, userID: this.currentUser.userId, sessionDTO: this.sessionObject }
    this.dataDiscoverService.getAllIndicesByAppNameAndUserID(data).pipe(first()).subscribe((response: any) => {
      if (this.currentViewingApplication != null && this.currentViewingApplication != undefined && this.previousViewingApplication != null && this.previousViewingApplication != undefined) {
        if (this.previousViewingApplication != this.currentViewingApplication) {
          sessionStorage.setItem("viewEndTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
          this.sessionObject.applicationName = this.previousViewingApplication;
          this.sessionObject.indexName = this.previousViewingIndex;
          sessionStorage.removeItem("onPageExitTime");
          this.loggerService.logMyInfo(this.sessionObject, '/data-discover');
          sessionStorage.removeItem("previousViewingIndex");
          this.previousViewingIndex = null;
          this.previousViewingApplication = this.currentViewingApplication;
        }
      } else {
        this.previousViewingApplication = this.appName;
      }
      if (response.serviceStatus == 'Success') {
        this.indexTotalList = response.serviceResponse;
        Object.keys(this.indexTotalList).map(function (key, _index) {
          indList.push(key);
        });
        this.indexList = indList;
        if (this.indexList == "" || this.indexList == "null") {
          this.openAlertMod(alertTemplate, "Index not found !!!");
        }
        this.indexList.sort(function (a: string, b: string) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        element.disabled = false;
      } else if (response.serviceStatus == 'Fail') {
        this.openAlertMod(alertTemplate, "Index not found !!!");
      }

    });
  }

  getAllIndicesByUserID() {
    this.dataDiscoverService.getAllIndicesByUserID(this.sessionObject).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.indexList = response.serviceResponse;
      }
    });
  }
  getFromToFromDuration() {
    if (this.isCustomFilter) {

      if (this.fromTODate != null) {
        this.fromDate = this.fromTODate[0];
        this.toDate = this.fromTODate[1];
      }
      else {
        this.fromDate = null;
        this.toDate = null;
      }

    }
    else {
      let startDate: any;
      let endDate = new Date(); // current Date
      const date = this.fromTODuration.split("_");

      switch (date[1]) {
        case "MINUTE": {
          startDate = moment(endDate).subtract(date[0], 'minutes');
          this.fromDate = startDate._d;
          break;
        }
        case "HOUR": {
          startDate = moment(endDate).subtract(date[0], 'hours');
          this.fromDate = startDate._d;
          break;
        }
        case "DAY": {
          startDate = moment(endDate).subtract(date[0], 'days');
          this.fromDate = startDate._d;
          break;
        }
        case "Today": {
          startDate = new Date(moment().format('yyyy-MM-DD 00:00:00'));
          this.fromDate = startDate;
          break;
        }
      }
      this.toDate = endDate;

    }

  }
  getIndexData2(alertTemplate: TemplateRef<any>): void {

    if (!this.validationService.validateZeroNumber(this.numberOfDocuments)) {
      this.openAlertMod(alertTemplate, "Number of records cannot be zero !!!");
      return ;
    }
    if (!this.validationService.validateRange(10, 500, this.numberOfDocuments)) {
      this.openAlertMod(alertTemplate, "Number of records must be between 10 and 500 !!!");
      return ;
    }
    this.clearData();

    console.log("From Date: " + this.fromDate)
    console.log("To Date: " + this.toDate)
    if (this.appName) {
      if (this.indexName) {
        this.getFromToFromDuration();
        if (this.fromDate) {
          if (this.toDate) {
            let arr = [];
            let varr = [];
            const dataDiscoveryObj = new DataDiscoveryObj;
            arr = Object.keys(this.indexTotalList);
            varr = Object.values(this.indexTotalList);
            for (let i = 0; i < arr.length; i++) {
              if (arr[i] == this.indexName) {
                this.elkId = varr[i];
              }
            }
            dataDiscoveryObj.elkId = this.elkId;
            dataDiscoveryObj.indexName = this.indexName;
            dataDiscoveryObj.fromDate = this.formatToISO(this.datemodel.startdateTime);
            dataDiscoveryObj.toDate = this.formatToISO(this.datemodel.enddateTime);
            dataDiscoveryObj.numberOfDocuments = this.numberOfDocuments;
            if (this.tableSwitch) {
              dataDiscoveryObj.isTable = "Y";
            }
            else {
              dataDiscoveryObj.isTable = "N";
            }
            this.sessionObject.applicationName = this.appName;
            this.sessionObject.indexName = this.indexName;
            dataDiscoveryObj.sessionDTO = this.sessionObject;
            this.currentViewingIndex = this.indexName;
            sessionStorage.setItem("previousViewingIndex", this.currentViewingIndex);

            this.dataDiscoverService.getElasticDataByIndexName(dataDiscoveryObj).pipe(first()).subscribe((response: any) => {
              if (this.previousViewingIndex != null && this.previousViewingIndex != undefined && this.currentViewingIndex != null && this.currentViewingIndex != undefined) {
                if (this.previousViewingIndex != this.currentViewingIndex) {
                  sessionStorage.setItem("viewEndTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
                  this.sessionObject.applicationName = this.previousViewingApplication;
                  this.sessionObject.indexName = this.previousViewingIndex;
                  sessionStorage.removeItem("onPageExitTime");
                  this.loggerService.logMyInfo(this.sessionObject, '/data-discover');
                  sessionStorage.setItem("viewStartTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
                }
              } else {
                sessionStorage.setItem("viewStartTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
              }
              if (this.currentViewingIndex != null || this.currentViewingIndex != undefined) {
                this.previousViewingIndex = this.currentViewingIndex;
              } else {
                this.previousViewingIndex = this.indexName;
              }
              if (response.serviceStatus == 'Success') {
                this.showChart = true;
                this.indexRawData = response.serviceResponse;
                this.indexDetMain = Object.assign([], this.indexRawData.rawData);
                this.indexDet = this.indexRawData.rawData;
                this.updatedPitId = this.indexRawData.updatedPitId;
                this.timeStampArray = this.indexRawData.timeStampList;
                this.dataList = this.indexRawData.dataList;
                this.paginationReferenceArray = this.indexRawData.paginationReferenceArray;

                if (this.indexRawData.isTable === "Y") {
                  const logsTable = document.getElementById('logsTable') as HTMLTableElement;
                  if (logsTable) {
                    this.constructTable(logsTable, this.indexDet);
                  }
                }
                
                this.finaldataList = [
                  {
                    type: undefined,
                    data: this.dataList
                  }];
                this.columnChart = {
                  chart: {
                    type: 'column',
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    borderWidth: 0,
                    style: {
                      fontFamily: "'JetBrains Mono', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    }
                  },
                  title: { text: '' },
                  subtitle: { text: '' },
                  xAxis: {
                    type: 'datetime',
                    categories: this.timeStampArray,
                    lineColor: '#334155',
                    tickColor: 'transparent',
                    tickPositions: this.timeStampArray && this.timeStampArray.length > 1 ? [0, this.timeStampArray.length - 1] : [0],
                    labels: {
                      style: {
                        color: '#94a3b8',
                        fontWeight: '500',
                        fontSize: '11px'
                      },
                      rotation: 0,
                      align: 'center'
                    }
                  },
                  yAxis: {
                    title: { text: '' },
                    gridLineColor: '#1e293b',
                    gridLineDashStyle: 'Dash',
                    labels: {
                      style: {
                        color: '#94a3b8',
                        fontWeight: '500',
                        fontSize: '11px'
                      }
                    }
                  },
                  legend: { enabled: false },
                  exporting: { enabled: false },
                  credits: { enabled: false },
                  series: this.finaldataList,
                  plotOptions: {
                    column: {
                      color: '#1c82c5ff',
                      borderRadius: 2,
                      borderWidth: 0,
                      pointPadding: 0.1,
                      groupPadding: 0.1
                    }
                  },
                  responsive: {
                    rules: [{
                      condition: { maxWidth: 500 },
                      chartOptions: {
                        legend: {
                          align: 'center',
                          verticalAlign: 'bottom',
                          layout: 'horizontal',
                        }
                      }
                    }]
                  }
                };
              }
            });
          }
          else {
            this.openAlertMod(alertTemplate, "Kindly provide End Date !!!");
          }
        }
        else {
          this.openAlertMod(alertTemplate, "Kindly provide Start Date !!!");
        }
      }
      else {
        this.openAlertMod(alertTemplate, "Kindly select an Index !!!");
      }
    }
    else {
      this.openAlertMod(alertTemplate, "Kindly select an Application !!!");
    }
  }

  getIndexData(alertTemplate: TemplateRef<any>): void {
    if (!this.validationService.validateZeroNumber(this.numberOfDocuments)) {
      this.openAlertMod(alertTemplate, "Number of records cannot be zero !!!");
      return;
    }
  
    if (!this.validationService.validateRange(10, 500, this.numberOfDocuments)) {
      this.openAlertMod(alertTemplate, "Number of records must be between 10 and 500 !!!");
      return;
    }
  
    this.clearData();
    
      this.fromDate = this.startTime;
      this.toDate = this.endTime;      
  
      if (!this.appName) {
        this.openAlertMod(alertTemplate, "Kindly select an Application !!!");
        return;
      }
      if (!this.indexName) {
        this.openAlertMod(alertTemplate, "Kindly select an Index !!!");
        return;
      }
  
      this.getFromToFromDuration();
  
      const arr = Object.keys(this.indexTotalList);
      const varr = Object.values(this.indexTotalList);
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === this.indexName) {
          this.elkId = varr[i];
        }
      }
  
      const dataDiscoveryObj = new DataDiscoveryObj();
      dataDiscoveryObj.elkId = this.elkId;
      dataDiscoveryObj.indexName = this.indexName;
      dataDiscoveryObj.fromDate = this.formatToISO(this.datemodel.startdateTime);
      dataDiscoveryObj.toDate = this.formatToISO(this.datemodel.enddateTime);
      dataDiscoveryObj.numberOfDocuments = this.numberOfDocuments;
      dataDiscoveryObj.isTable = this.tableSwitch ? "Y" : "N";
  
      this.sessionObject.applicationName = this.appName;
      this.sessionObject.indexName = this.indexName;
      dataDiscoveryObj.sessionDTO = this.sessionObject;
  
      this.currentViewingIndex = this.indexName;
      sessionStorage.setItem("previousViewingIndex", this.currentViewingIndex);
  
      this.dataDiscoverService.getElasticDataByIndexName(dataDiscoveryObj).pipe(first()).subscribe((response: any) => {
        if (this.previousViewingIndex && this.currentViewingIndex && this.previousViewingIndex !== this.currentViewingIndex) {
          sessionStorage.setItem("viewEndTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
          this.sessionObject.applicationName = this.previousViewingApplication;
          this.sessionObject.indexName = this.previousViewingIndex;
          sessionStorage.removeItem("onPageExitTime");
          this.loggerService.logMyInfo(this.sessionObject, '/data-discover');
          sessionStorage.setItem("viewStartTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
        } else {
          sessionStorage.setItem("viewStartTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
        }
  
        this.previousViewingIndex = this.currentViewingIndex || this.indexName;
  
        if (response.serviceStatus === 'Success') {
          this.showChart = true;
          this.indexRawData = response.serviceResponse;
          this.indexDetMain = [...this.indexRawData.rawData];
          this.indexDet = this.indexRawData.rawData;
          this.updatedPitId = this.indexRawData.updatedPitId;
          this.timeStampArray = this.indexRawData.timeStampList;
          this.dataList = this.indexRawData.dataList;
          this.paginationReferenceArray = this.indexRawData.paginationReferenceArray;
  
          if (this.indexRawData.isTable === "Y") {
            const logsTable = document.getElementById('logsTable') as HTMLTableElement;
            if (logsTable) {
              this.constructTable(logsTable, this.indexDet);
            }
          }
  
          this.finaldataList = [{ type: undefined, data: this.dataList }];
          this.columnChart = {
            chart: {
              type: 'column',
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              borderWidth: 0,
              style: {
                fontFamily: "'JetBrains Mono', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
              }
            },
            title: { text: '' },
            subtitle: { text: '' },
            xAxis: {
              type: 'datetime',
              categories: this.timeStampArray,
              lineColor: '#334155',
              tickColor: 'transparent',
              tickPositions: this.timeStampArray && this.timeStampArray.length > 1 ? [0, this.timeStampArray.length - 1] : [0],
              labels: {
                style: {
                  color: '#94a3b8',
                  fontWeight: '500',
                  fontSize: '11px'
                },
                rotation: 0,
                align: 'center'
              }
            },
            yAxis: {
              title: { text: '' },
              gridLineColor: '#1e293b',
              gridLineDashStyle: 'Dash',
              labels: {
                style: {
                  color: '#94a3b8',
                  fontWeight: '500',
                  fontSize: '11px'
                }
              }
            },
            legend: { enabled: false },
            exporting: { enabled: false },
            credits: { enabled: false },
            series: this.finaldataList,
            plotOptions: {
              column: {
                color: '#1a8ac7ff',
                borderRadius: 2,
                borderWidth: 0,
                pointPadding: 0.1,
                groupPadding: 0.1
              }
            },
            responsive: {
              rules: [{
                condition: { maxWidth: 500 },
                chartOptions: {
                  legend: {
                    align: 'center',
                    verticalAlign: 'bottom',
                    layout: 'horizontal',
                  }
                }
              }]
            }
          };
          
          // this.columnChart = {
          //   chart: { type: 'column' },
          //   title: { text: '' },
          //   subtitle: { text: '' },
          //   xAxis: {
          //     type: 'datetime',
          //     categories: this.timeStampArray
          //   },
          //   yAxis: { title: { text: '' } },
          //   legend: {
          //     enabled: false,
          //     align: 'right',
          //     verticalAlign: 'middle'
          //   },
          //   exporting: { enabled: false },
          //   credits: { enabled: false },
          //   series: this.finaldataList,
          //   responsive: {
          //     rules: [{
          //       condition: { maxWidth: 500 },
          //       chartOptions: {
          //         legend: {
          //           align: 'center',
          //           verticalAlign: 'bottom',
          //           layout: 'horizontal',
          //         }
          //       }
          //     }]
          //   }
          // };
        }
      });
  }  

  constructTable(selector: HTMLElement, list: any[]) {
    const cols = this.Headers(list, selector);
  
    for (let i = 0; i < list.length; i++) {
      const row = document.createElement('tr');
      for (let colIndex = 0; colIndex < cols.length; colIndex++) {
        const cell = document.createElement('td');
        const val = list[i][cols[colIndex]] ?? '';
        cell.innerHTML = val;
        row.appendChild(cell);
      }
      selector.appendChild(row);
    }
  }
  
  Headers(list: any[], selector: HTMLElement): string[] {
    const columns: string[] = [];
    const headerRow = document.createElement('tr');
  
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      for (const key in row) {
        if (!columns.includes(key)) {
          columns.push(key);
          const th = document.createElement('th');
          th.innerHTML = key;
          headerRow.appendChild(th);
        }
      }
    }
  
    selector.appendChild(headerRow);
    return columns;
  }
  

  openExportModal() {
    const fieldSet = new Set<string>();
    for (const item of this.indexDet) {
      Object.keys(item).forEach(k => fieldSet.add(k));
    }
    this.allExportFields = Array.from(fieldSet);
    this.exportFieldSelection = {};
    this.allExportFields.forEach(f => this.exportFieldSelection[f] = true);
    this.exportFieldSearch = '';
    this.modalRef = this.modalService.open(this.exportModalRef, { size: 'lg', centered: true, scrollable: true });
  }

  get filteredExportFields(): string[] {
    if (!this.exportFieldSearch) return this.allExportFields;
    const s = this.exportFieldSearch.toLowerCase();
    return this.allExportFields.filter(f => f.toLowerCase().includes(s));
  }

  get selectedExportFieldCount(): number {
    return this.allExportFields.filter(f => this.exportFieldSelection[f]).length;
  }

  get hasExportFieldSelected(): boolean {
    return this.allExportFields.some(f => this.exportFieldSelection[f]);
  }

  selectAllExportFields() {
    this.allExportFields.forEach(f => this.exportFieldSelection[f] = true);
  }

  deselectAllExportFields() {
    this.allExportFields.forEach(f => this.exportFieldSelection[f] = false);
  }

  confirmExport() {
    const selected = this.allExportFields.filter(f => this.exportFieldSelection[f]);
    if (!selected.length) return;

    this.isExporting = true;

    const payload = new DataDiscoveryObj();
    payload.elkId = this.elkId;
    payload.indexName = this.indexName;
    payload.fromDate = this.formatToISO(this.datemodel.startdateTime);
    payload.toDate = this.formatToISO(this.datemodel.enddateTime);
    payload.isTable = 'N';
    payload.pagination = false;
    payload.search = false;
    payload.sessionDTO = this.sessionObject;

    this.dataDiscoverService.exportAllLogs(payload).pipe(first()).subscribe({
      next: (response: any) => {
        this.isExporting = false;
        if (response.serviceStatus === 'Success') {
          const allDocs: any[] = response.serviceResponse.rawData ?? [];
          const filtered = allDocs.map((item: any) => {
            const obj: any = {};
            selected.forEach(k => obj[k] = item[k] ?? '');
            return obj;
          });
          this.excelService.exportAsExcelFile(filtered, this.indexName + '_logs');
          this.modalRef.close();
        } else {
          this.openAlertMod(this.alertTemplate, 'Export failed. Please try again.');
        }
      },
      error: () => {
        this.isExporting = false;
        this.openAlertMod(this.alertTemplate, 'Export failed. Please try again.');
      }
    });
  }

  searchLogs(event: any) {
    const filterPipe = new FilterAllPipe();
    const filteredArr = filterPipe.transform(this.indexDetMain, event);
  
    if (this.indexRawData.isTable === 'Y') {
      const logsTable = document.getElementById('logsTable') as HTMLTableElement;
  
      // Clear existing rows
      while (logsTable.firstChild) {
        logsTable.removeChild(logsTable.firstChild);
      }
  
      // Construct table with filtered data
      this.constructTable(logsTable, filteredArr);
    } else {
      this.indexDet = filteredArr;
    }
  
    this.returnedRecords = event ? filteredArr.length : null;
  }
  

  resetForm() {
    this.fromTODate = null;
    this.fromDate = null;
    this.toDate = null;
    this.tableSwitch = false;
    this.clearData();
    this.fromTODuration = "15_MINUTE";
    this.getFromToFromDuration();
  }

  clearData() {
    this.indexDet = [];
    this.indexRawData = null;
    this.returnedRecords = null;
    this.searchText = null;
    this.searchTerm = "";
    this.currentLogPage = 1;
    this.expandedLogIndex = null;

    const logsTable = document.getElementById('logsTable') as HTMLTableElement;

    if (logsTable) {
      while (logsTable.firstChild) {
        logsTable.removeChild(logsTable.firstChild);
      }
    }

    if (this.tableSwitch) {
      this.tableViewTypeActivate = "text-success";
      this.rowViewTypeActivate = "";
    }
    else {
      this.tableViewTypeActivate = "";
      this.rowViewTypeActivate = "text-success";
    }
  }

  cancelRequest() {
    this.modalRef.close();
  }

  openAlertMod(template: TemplateRef<any>, message: any) {
    this.modalRef = this.modalService.open(template, { size: 'modal-sm' });
    this.alertMessage = message;
  }

  loadNextLogDocuments() {

    const dataDiscoveryObj = new DataDiscoveryObj();
    dataDiscoveryObj.elkId = this.elkId;
    dataDiscoveryObj.indexName = this.indexName;
    dataDiscoveryObj.fromDate = this.formatToISO(this.datemodel.startdateTime);
    dataDiscoveryObj.toDate = this.formatToISO(this.datemodel.enddateTime);
    dataDiscoveryObj.isTable = 'N';
    dataDiscoveryObj.pagination = true;
    dataDiscoveryObj.updatedPitId = this.updatedPitId;
    dataDiscoveryObj.paginationReferenceArray = this.paginationReferenceArray;
    dataDiscoveryObj.numberOfDocuments = this.numberOfDocuments;
    if (this.searchTerm !== "") {
      dataDiscoveryObj.search = true;
      dataDiscoveryObj.searchKeyWord = this.searchTerm;
    }

    this.sessionObject.applicationName = this.appName;
    this.sessionObject.indexName = this.indexName;
    dataDiscoveryObj.sessionDTO = this.sessionObject;
    this.currentViewingIndex = this.indexName;
    sessionStorage.setItem("previousViewingIndex", this.currentViewingIndex);
    this.dataDiscoverService.getElasticDataByIndexName(dataDiscoveryObj).pipe(first()).subscribe((response: any) => {

      if (this.previousViewingIndex != null && this.previousViewingIndex != undefined && this.currentViewingIndex != null && this.currentViewingIndex != undefined) {
        if (this.previousViewingIndex != this.currentViewingIndex) {
          sessionStorage.setItem("viewEndTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
          this.sessionObject.applicationName = this.previousViewingApplication;
          this.sessionObject.indexName = this.previousViewingIndex;
          sessionStorage.removeItem("onPageExitTime");
          this.loggerService.logMyInfo(this.sessionObject, '/data-discover');
          sessionStorage.setItem("viewStartTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
        }
      } else {
        sessionStorage.setItem("viewStartTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
      }
      if (this.currentViewingIndex != null || this.currentViewingIndex != undefined) {
        this.previousViewingIndex = this.currentViewingIndex;
      } else {
        this.previousViewingIndex = this.indexName;
      }
      if (response.serviceStatus == 'Success') {
        this.updatedPitId = response.serviceResponse.updatedPitId;
        this.paginationReferenceArray = response.serviceResponse.paginationReferenceArray;
        let nextLogDocuments = response.serviceResponse.rawData;
        // console.log(nextLogDocuments.length)
        this.indexDet = this.indexDet.concat(nextLogDocuments);
        //console.log(this.indexDet.length)
      }
      else {
        //this.openAlertMod(alertTemplate, "Kindly select an Application !!!");
      }

    });
  }

  getLogDocumentsBySearchKeyword(): void {

    if (this.validationService.validateNullUndefinedEmptyString(this.searchTerm)) {
      this.openAlertMod(this.alertTemplate, "Kindly enter keyword to be searched !!!");
      return;
    }
    this.indexDet = []
    const dataDiscoveryObj = new DataDiscoveryObj();
    dataDiscoveryObj.elkId = this.elkId;
    dataDiscoveryObj.indexName = this.indexName;
    dataDiscoveryObj.fromDate = this.formatToISO(this.datemodel.startdateTime);
    dataDiscoveryObj.toDate = this.formatToISO(this.datemodel.enddateTime);
    dataDiscoveryObj.numberOfDocuments = this.numberOfDocuments;
    dataDiscoveryObj.isTable = 'N';
    dataDiscoveryObj.search = true;
    dataDiscoveryObj.searchKeyWord = this.searchTerm;
    this.sessionObject.applicationName = this.appName;
    this.sessionObject.indexName = this.indexName;
    dataDiscoveryObj.sessionDTO = this.sessionObject;
    this.currentViewingIndex = this.indexName;
    sessionStorage.setItem("previousViewingIndex", this.currentViewingIndex);
    this.dataDiscoverService.getElasticDataByIndexName(dataDiscoveryObj).pipe(first()).subscribe((response: any) => {

      if (this.previousViewingIndex != null && this.previousViewingIndex != undefined && this.currentViewingIndex != null && this.currentViewingIndex != undefined) {
        if (this.previousViewingIndex != this.currentViewingIndex) {
          sessionStorage.setItem("viewEndTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
          this.sessionObject.applicationName = this.previousViewingApplication;
          this.sessionObject.indexName = this.previousViewingIndex;
          sessionStorage.removeItem("onPageExitTime");
          this.loggerService.logMyInfo(this.sessionObject, '/data-discover');
          sessionStorage.setItem("viewStartTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
        }
      } else {
        sessionStorage.setItem("viewStartTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
      }
      if (this.currentViewingIndex != null || this.currentViewingIndex != undefined) {
        this.previousViewingIndex = this.currentViewingIndex;
      } else {
        this.previousViewingIndex = this.indexName;
      }
      if (response.serviceStatus == 'Success') {
        this.indexRawData = response.serviceResponse;
        this.indexDetMain = Object.assign([], this.indexRawData.rawData);
        this.indexDet = this.indexRawData.rawData;
        this.updatedPitId = this.indexRawData.updatedPitId;
        this.paginationReferenceArray = this.indexRawData.paginationReferenceArray;
      }
    });
  }

  onSearch(event: any) {

    if (event.target.value === "") {
      this.getIndexData(this.alertTemplate);
    }
  }

  openDocumentModal(indexD: Record<string, unknown>) {
    this.dataArr = [];
    this.searchText2 = "";
  
    for (const [key, value] of Object.entries(indexD)) {
      const documentObj = new DocumentOBJ();
      documentObj.documentField = key;
      documentObj.documentValue = value;
      this.dataArr.push(documentObj);
    }
  
    this.modalVisible = true;
  }

  pageChange($event: number) {
    console.log(event)
    this.j = $event;
  }

  search() {
    this.p = 1;
  }

  sortBy(value: String) {
    this.sortparam = value;
    if (this.sortDirection === 'desc') {
      this.sortDirection = 'asc';
    }
    else {
      this.sortDirection = 'desc';
    }
  }

  showHide() {
    if (this.showChart == true) {
      this.showChart = false
    }
    else if (this.showChart == false) {
      this.showChart = true;
    }
  }

  getLogDocumentsByQuery(): void {
    if (this.validationService.validateNullUndefinedEmptyString(this.kqlQuery)) {
      this.openAlertMod(this.alertTemplate, "Kindly enter Query to be searched !!!");
      return;
    }
    this.indexDet = []
    const dataDiscoveryObj = new DataDiscoveryObj();
    dataDiscoveryObj.elkId = this.elkId;
    dataDiscoveryObj.indexName = this.indexName;
    dataDiscoveryObj.fromDate = this.formatToISO(this.datemodel.startdateTime);
    dataDiscoveryObj.toDate = this.formatToISO(this.datemodel.enddateTime);
    dataDiscoveryObj.numberOfDocuments = this.numberOfDocuments;
    dataDiscoveryObj.isTable = 'N';
    dataDiscoveryObj.isQuerySearch = true;
    dataDiscoveryObj.searchKeyWord = this.searchTerm;
    dataDiscoveryObj.kqlQuery = this.kqlQuery;
    dataDiscoveryObj.sessionDTO = this.sessionObject;
    this.sessionObject.applicationName = this.appName;
    this.sessionObject.indexName = this.indexName;
    this.dataDiscoverService.getLogDocumentsByQuery(dataDiscoveryObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.indexRawData = response.serviceResponse;
        this.indexDetMain = Object.assign([], this.indexRawData.rawData);
        this.indexDet = this.indexRawData.rawData;
        this.updatedPitId = this.indexRawData.updatedPitId;
        this.timeStampArray = this.indexRawData.timeStampList;
        this.dataList = this.indexRawData.dataList;
        this.paginationReferenceArray = this.indexRawData.paginationReferenceArray;
        if (this.indexRawData.isTable == "Y") {
          if (this.indexRawData.isTable === "Y") {
            const logsTable = document.getElementById('logsTable') as HTMLTableElement;
            if (logsTable) {
              this.constructTable(logsTable, this.indexDet);
            }
          }
          
        }
      }
    });
  }

}
