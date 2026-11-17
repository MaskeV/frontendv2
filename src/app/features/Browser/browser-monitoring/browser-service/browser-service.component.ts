import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { filter, forkJoin, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { AuthenticationService } from '../../../../services/authentication.service';
import { ApplicationService } from '../../../../services/application.service';
import * as Highcharts from 'highcharts';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HighchartsChartModule } from "highcharts-angular";
import { ListViewComponent } from '../../../Dashboard/service-page/general-services/list-view/list-view.component';
import { TreeViewComponent } from '../../../Dashboard/service-page/general-services/tree-view/tree-view.component';
import { Datesetter } from '../../../../models/dateSetter';
import { BrowserApiService } from '../../../../services/browser-api.service';
import { DateService } from '../../../../services/date.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { StatViewComponent } from '../../../Dashboard/service-page/general-services/stat-view/stat-view.component';
import { TableViewComponent } from '../../../Dashboard/service-page/general-services/table-view/table-view.component';
import { TraceDetailsModalComponent } from '../../../Dashboard/service-page/general-services/trace-details-modal/trace-details-modal.component';
import * as bootstrap from 'bootstrap';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-browser-service',
  imports: [CommonModule, RouterModule, FormsModule, ListViewComponent,
    TreeViewComponent,
    TableViewComponent,
    StatViewComponent,
    TraceDetailsModalComponent, HighchartsChartModule,
    MatTooltipModule],
  templateUrl: './browser-service.component.html',
  styleUrls: ['./browser-service.component.css']
})
export class BrowserServiceComponent implements OnInit, OnDestroy, AfterViewInit {

  private datesubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  entityId: string = '';
  apiEntityId: string = '';
  selectedService: string = '';
  applicationTechnology: string = '';
  datemodel: any;
  startTime: number = 0;
  endTime: number = 0;

  overviewTotalHits: any;
  overviewErrorCount: any;
  overviewAvgLoad: any;
  versionId: any;
  serviceId: any;
  newInstanceIdForVersionGraphs: any;
  errorRate: any;
  showTraceInfo = false;

  avgLoad: string = 'Average number of page hits per unit time (traffic trend over the selected duration).';
  totalHitsKpi: string = 'Total number of API requests received in the selected time range.';
  apiErrorCount: string = 'Total number of failed API requests during the selected time range.';
  appLoad: string = 'Total number of page hits received by the application in the selected time range.';
  appErrorRate: string = 'Percentage of total requests that resulted in errors.';
  appErrorCount: string = 'Total count of error occurrences during the selected time range.';
  versionLoad: string = 'Total number of requests (page hits) handled by each version during the selected time range.';
  versionErrorRate: string = 'Percentage of requests that resulted in errors for each version.';
  versionErrorCount: string = 'Total number of error occurrences recorded for each version during the selected time range.';
  pageLoad: string = 'Total number of requests (page hits) received by each page during the selected time range.';
  pageErrorRate: string = 'Percentage of requests that resulted in errors for each page.';
  pageErrorCount: string = 'Total number of error occurrences recorded for each page during the selected time range.';

  constructor(
    private browserApiService: BrowserApiService,
    private dateService: DateService,
    private serviceIdService: ServiceIdService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthenticationService,
    private applicationService: ApplicationService
  ) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.entityId = sessionStorage.getItem('encodedServiceIdforBrowser') || 'defaultEntity';
    this.serviceId = this.entityId;
    this.versionId = sessionStorage.getItem('encodedVersionId') ?? '';
    this.newInstanceIdForVersionGraphs = `${this.serviceId}_${this.versionId}`;
    this.apiEntityId = this.entityId;
    this.selectedService = this.decodeBase64(this.entityId);

    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.applicationService.getFullApplicationData(user.userId, 'BRUM', user.sessionDTO).pipe(takeUntil(this.destroy$)).subscribe({
          next: (res: any) => {
            if (res && res.serviceStatus?.toUpperCase() === 'SUCCESS') {
              const apps = res.serviceResponse?.applications || [];
              const currentApp = apps.find((app: any) => app.applicationName === this.selectedService);
              if (currentApp) {
                this.applicationTechnology = currentApp.applicationTechnology || '';
              }
            }
          },
          error: (err) => console.error('Error fetching technology info:', err)
        });
      }
    });

    this.dateService.setActiveComponent('BrowserServiceComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'BrowserServiceComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe(dates => {
      this.datemodel = dates;
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);

      // Get active tab from DOM, fallback to 'overview' on first load
      const activeTabEl = document.querySelector('#browser-service-nav .nav-link.active') as HTMLElement;
      const tabHref = activeTabEl?.getAttribute('href')?.replace('#', '');
      const activeTabName = tabHref?.replace('bs-', '') || 'overview';
      this.loadData(activeTabName);
    });
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
    document.addEventListener('mousemove', this.onMouseMove);
  }

  private onMouseMove = (e: MouseEvent): void => {
    const el = (e.target as HTMLElement).closest('.log-hoverable-cell') as HTMLElement | null;
    if (!el) return;
    const x = e.clientX + 14;
    const y = e.clientY - 10;
    el.style.setProperty('--tooltip-x', `${Math.min(x, window.innerWidth - 400)}px`);
    el.style.setProperty('--tooltip-y', `${y}px`);
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    document.removeEventListener('mousemove', this.onMouseMove);
  }

  formatDate(date: string): number {
    return parseInt(date.replace(/-/g, '').replace(/:/g, '').replace(' ', ''));
  }

  decodeBase64(encoded: string): string {
    try {
      const pureBase64 = encoded.split(/[_\.]/)[0];
      return atob(pureBase64);
    } catch {
      return encoded;
    }
  }

  order: string = 'desc';
  sizeParam: number = -1;
  pageParam: number = -1;
  size: number = 20;

  versionLoadPair: { versionLoadPairText: string; versionLoadPairValue: any; isCopied: boolean; percentile: number; }[] = [];
  errorRatePair: { errorRateText: string; errorRateValue: any; isCopied: boolean; percentile: number; }[] = [];
  errorCountPair: { errorCountText: string; errorCountValue: any; isCopied: boolean; percentile: number; }[] = [];
  loadPagesPair: { loadPagesText: string; loadPagesValue: any; isCopied: boolean; percentile: number; }[] = [];
  errorCountPagesPair: { errorCountPagesText: string; errorCountPagesValue: any; isCopied: boolean; percentile: number; }[] = [];
  errorPagesPerPair: { errorPagesPerText: string; errorPagesPerValue: any; isCopied: boolean; percentile: number; }[] = [];

  isDataAvailable1: boolean = false;
  isDataAvailable2: boolean = false;
  isDataAvailable3: boolean = false;
  isDataAvailable4: boolean = false;
  isDataAvailable5: boolean = false;
  isDataAvailable6: boolean = false;

  combinedVersionData: any[] = [];
  searchTextVersion: string = '';
  versionName!: any[];
  totalVersions: number = 0;
  totalPagesVersions: number = 0;
  currentPageVersions: number = 1;
  versionLoadPairVersionTab: any[] = [];
  errorRatePairVerisonTab: any[] = [];
  errorCountPairVersionTab: any[] = [];
  isDataAvailableErrorCount: boolean = false;
  isDataAvailableErrorRate: boolean = false;

  pageName: { name: string }[] = [];
  combinedDataPages: { [key: string]: any } = {};
  searchTextPage: string = '';
  totalHits: number = 0;
  totalHitsPages: number = 0;
  currentPagePages: number = 1;
  errorEndpoints: number = 0;
  filteredPageNames: { name: string }[] = [];
  viewModePages: 'all' | 'success' | 'error' = 'all';

  instName: string = 'All';
  endpointTraces: string = 'All';
  traceID: string = '';
  traceState: string = '';
  minDuration?: number;
  maxDuration?: number;
  orderParameter: 'asc' | 'dec' = 'dec';
  currentPageTrace: number = 1;
  pageSizeTrace: number = 20;
  totalTraces: number = 0;
  totalPagesTrace: number = 0;

  instances: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];
  endpointsTraces: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];
  tableData: any[] = [];
  filteredData: any[] = [];
  isLoading = false;
  selectedTraceId: string | null = null;
  selectedView: 'list' | 'tree' | 'table' | 'stat' = 'table';
  hierarchicalList: any[] = [];
  traceMetaData: any[] = [];
  traceData: any[] = [];
  showModal = false;
  modalData: any = null;
  forceReload = false;

  dropdownOpen = false;
  criteriaList = [
    { key: 'instance', label: 'Version' },
    { key: 'endpoint', label: 'Endpoint' },
    { key: 'status', label: 'Status' },
    { key: 'traceID', label: 'Trace ID' },
    { key: 'minDuration', label: 'Min Duration' },
    { key: 'maxDuration', label: 'Max Duration' }
  ];
  shownCriteria: Record<string, boolean> = {
    instance: false, endpoint: false, status: false,
    traceID: false, minDuration: false, maxDuration: false
  };

  get allCriteriaSelected(): boolean {
    return this.criteriaList.every(c => this.shownCriteria[c.key]);
  }
  get availableCriteria() {
    return this.criteriaList.filter(c => !this.shownCriteria[c.key]);
  }

  toggleDropdown() { this.dropdownOpen = !this.dropdownOpen; }
  selectCriteria(key: string) { this.shownCriteria[key] = true; }
  removeCriteria(key: string) {
    this.shownCriteria[key] = false;
    switch (key) {
      case 'traceID': this.traceID = ''; break;
      case 'instance': this.instName = 'All'; break;
      case 'endpoint': this.endpointTraces = 'All'; break;
      case 'status': this.traceState = ''; break;
      case 'minDuration': this.minDuration = undefined; break;
      case 'maxDuration': this.maxDuration = undefined; break;
    }
    this.fetchTraceData();
  }

  instancesLogs: { name: string; value: string }[] = [{ name: 'All', value: 'All' }];
  endpointsLogs: { name: string; value: string }[] = [{ name: 'All', value: 'All' }];
  errorLogsCount: number = 0;
  versionIdLogs: string = 'All';
  pageIdLogs: string = 'All';
  categoryLogs: string = 'All';
  dropDownOpenLogs = false;
  criteriaListLogs = [
    { key: 'instance', label: 'Version' },
    { key: 'page', label: 'Page' },
    { key: 'category', label: 'Category' }
  ];
  showCriteriaLogs: any = { instance: false, page: false, category: false };

  toggleDropDownLogs() { this.dropDownOpenLogs = !this.dropDownOpenLogs; }
  selectCriteriaLogs(key: string) {
    this.showCriteriaLogs[key] = true;
    this.dropDownOpenLogs = false;
  }
  removeCriteriaLogs(key: string) {
    this.showCriteriaLogs[key] = false;
    if (key === 'instance') this.versionIdLogs = 'All';
    if (key === 'page') this.pageIdLogs = 'All';
    if (key === 'category') this.categoryLogs = 'All';
    this.getLogsAggregatedData();
    this.getLogsErrorTimeSeries();
  }
  get availableCriteriaLogs() {
    return this.criteriaListLogs.filter(c => !this.showCriteriaLogs[c.key]);
  }

  tableDataLogs: any[] = [];
  noData = false;
  currentPageLogs: number = 1;
  loadingLogs = false;
  totalPagesLogs: number = 0;
  totalLogs: number = 0;

  Highcharts: typeof Highcharts = Highcharts;
  logsErrorChart: any = null;

  loadData(tabName: string) {
    if (tabName !== 'log') this.dropDownOpenLogs = false;
    if (tabName !== 'trace') this.dropdownOpen = false;
    switch (tabName) {
      case 'overview':
        this.getAppLoad();
        this.getAppErrorRate();
        this.getAppErrorCount();
        this.getOverviewKpiValues();
        this.getLoadVersion();
        this.getErrorRateVersion();
        this.getErrorCountVersion();
        this.getLoadPages();
        this.getErrorCountPages();
        this.getPagesErrorPer();
        break;
      case 'version':
        this.getLoadVersionVersionTab();
        this.getLoadVersion();
        this.getErrorRateVersion();
        this.getErrorCountVersion();
        this.getVersionNames();
        break;
      case 'page':
        this.getLoadPages();
        this.getErrorCountPages();
        this.getPagesErrorPer();
        this.getPageNames();
        break;
      case 'trace':
        this.fetchInstances();
        this.fetchEndpointsTraces();
        this.fetchTraceData();
        break;
      case 'log':
        this.fetchInstancesLogs();
        this.fetchEndpointsLogs();
        this.getLogsAggregatedData();
        this.getLogsErrorTimeSeries();
        break;
    }
  }

  getAppLoad(): void {
    this.browserApiService.getAppLoad(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => this.initializeAppLoadChart(data),
        error: err => console.error('App Load Error:', err)
      });
  }

  initializeAppLoadChart(data: any): void {
    if (!data?.length) return;
    const chartData = data.map((d: any) => ({ x: this.convertTimebucket(d.time_bucket), y: d.value }));
    Highcharts.chart('appLoadChartContainer', {
      chart: { type: 'line', backgroundColor: 'transparent', spacing: [5, 5, 5, 5] },
      title: { text: undefined },
      xAxis: {
        type: 'datetime', crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
        labels: { style: { color: '#030303', fontSize: '8px' } },
        gridLineColor: '#ede8e8', lineColor: '#cccccc', tickColor: '#cccccc'
      },
      yAxis: { min: 0, title: undefined, tickAmount: 6, labels: { style: { color: '#030303', fontSize: '8px' } }, gridLineColor: '#ede8e8' },
      tooltip: {
        shared: true, useHTML: true, backgroundColor: '#fff', style: { color: '#000', fontSize: '11px' },
        formatter: function () {
          let s = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/>`;
          this.points?.forEach((p: any) => { s += `<span style="color:${p.series.color}">●</span> ${p.series.name}: ${p.y}<br/>`; });
          return s;
        }
      },
      legend: { enabled: false },
      series: [{ type: 'line', name: 'App Load', data: chartData, color: '#007bff', lineWidth: 2, marker: { enabled: true, radius: 2 } }] as Highcharts.SeriesLineOptions[],
      credits: { enabled: false }, exporting: { enabled: false }
    } as Highcharts.Options);
  }

  getAppErrorRate(): void {
    this.browserApiService.getAppErrorRatePer(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: data => this.initializeAppErrorRateChart(data), error: err => console.error(err) });
  }

  initializeAppErrorRateChart(data: any): void {
    if (!data?.length) return;
    const chartData = data.map((d: any) => ({ x: this.convertTimebucket(d.time_bucket), y: d.value }));
    Highcharts.chart('appErrorRateChartContainer', {
      chart: { type: 'line', backgroundColor: 'transparent', spacing: [5, 5, 5, 5] },
      title: { text: undefined },
      xAxis: {
        type: 'datetime', crosshair: { width: 2, color: 'red', dashStyle: 'ShortDot' },
        labels: { style: { color: '#030303', fontSize: '8px' } },
        gridLineColor: '#ede8e8', lineColor: '#cccccc', tickColor: '#cccccc'
      },
      yAxis: { min: 0, title: undefined, tickAmount: 6, labels: { style: { color: '#030303', fontSize: '8px' } }, gridLineColor: '#ede8e8' },
      tooltip: {
        shared: true, useHTML: true, backgroundColor: '#fff', style: { color: '#000', fontSize: '11px' },
        formatter: function () {
          let s = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/>`;
          this.points?.forEach((p: any) => { s += `<span style="color:${p.series.color}">●</span> ${p.series.name}: ${p.y}%<br/>`; });
          return s;
        }
      },
      legend: { enabled: false },
      series: [{ type: 'line', name: 'App Error Rate', data: chartData, color: '#dc3545', lineWidth: 2, marker: { enabled: true, radius: 2 } }] as Highcharts.SeriesLineOptions[],
      credits: { enabled: false }, exporting: { enabled: false }
    } as Highcharts.Options);
  }

  getAppErrorCount(): void {
    this.browserApiService.getAppErrorCount(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: data => this.initializeAppErrorCountChart(data), error: err => console.error(err) });
  }

  initializeAppErrorCountChart(data: any): void {
    if (!data?.length) return;
    const chartData = data.map((d: any) => ({ x: this.convertTimebucket(d.time_bucket), y: d.value }));
    Highcharts.chart('appErrorCountChartContainer', {
      chart: { type: 'line', backgroundColor: 'transparent', spacing: [5, 5, 5, 5] },
      title: { text: undefined },
      xAxis: {
        type: 'datetime', crosshair: { width: 2, color: '#ff6b6b', dashStyle: 'ShortDot' },
        labels: { style: { color: '#030303', fontSize: '8px' } },
        gridLineColor: '#ede8e8', lineColor: '#cccccc', tickColor: '#cccccc'
      },
      yAxis: { min: 0, title: undefined, tickAmount: 6, labels: { style: { color: '#030303', fontSize: '8px' } }, gridLineColor: '#ede8e8' },
      tooltip: {
        shared: true, useHTML: true, backgroundColor: '#fff', style: { color: '#000', fontSize: '11px' },
        formatter: function () {
          let s = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/>`;
          this.points?.forEach((p: any) => { s += `<span style="color:${p.series.color}">●</span> ${p.series.name}: ${p.y} errors<br/>`; });
          return s;
        }
      },
      legend: { enabled: false },
      series: [{ type: 'line', name: 'App Error Count', data: chartData, color: '#ff6b6b', lineWidth: 2, marker: { enabled: true, radius: 2 } }] as Highcharts.SeriesLineOptions[],
      credits: { enabled: false }, exporting: { enabled: false }
    } as Highcharts.Options);
  }

  getLoadVersion(): void {
    this.browserApiService.getLoadVersion(this.entityId, this.startTime, this.endTime, this.order, this.size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            const entries = Object.entries(data);
            const maxLoadValue = Math.max(...entries.map(([_, v]) => Number(v)));
            this.versionLoadPair = entries.map(([version, value]) => ({
              versionLoadPairText: version, versionLoadPairValue: value, isCopied: false,
              percentile: maxLoadValue === 0 ? 0 : (Number(value) / maxLoadValue) * 100
            }));
            this.isDataAvailable1 = true;
          } else { this.isDataAvailable1 = false; }
        },
        error: () => { this.isDataAvailable1 = false; }
      });
  }

  getErrorRateVersion(): void {
    this.browserApiService.getErrorRateVersion(this.entityId, this.startTime, this.endTime, this.order, this.size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            const entries = Object.entries(data);
            const maxValue = Math.max(...entries.map(([_, v]) => Number(v)));
            this.errorRatePair = entries.map(([version, value]) => ({
              errorRateText: version, errorRateValue: value, isCopied: false,
              percentile: maxValue === 0 ? 0 : (Number(value) / maxValue) * 100
            }));
            this.isDataAvailable2 = true;
          } else { this.isDataAvailable2 = false; }
        },
        error: () => { this.isDataAvailable2 = false; }
      });
  }

  getErrorCountVersion(): void {
    this.browserApiService.getErrorCountVersion(this.entityId, this.startTime, this.endTime, this.order, this.size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            const entries = Object.entries(data);
            const maxValue = Math.max(...entries.map(([_, v]) => Number(v)));
            this.errorCountPair = entries.map(([version, value]) => ({
              errorCountText: version, errorCountValue: value, isCopied: false,
              percentile: maxValue === 0 ? 0 : (Number(value) / maxValue) * 100
            }));
            this.isDataAvailable3 = true;
          } else { this.isDataAvailable3 = false; }
        },
        error: () => { this.isDataAvailable3 = false; }
      });
  }

  getLoadPages(): void {
    this.browserApiService.getLoadPages(this.entityId, this.startTime, this.endTime, this.order, this.size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            const sortedEntries = Object.entries(data).sort((a: any, b: any) => Number(b[1]) - Number(a[1]));
            const maxValue = sortedEntries.length > 0 ? Number(sortedEntries[0][1]) : 0;
            this.loadPagesPair = sortedEntries.map(([instance, value]) => ({
              loadPagesText: instance, loadPagesValue: value, isCopied: false,
              percentile: maxValue === 0 ? 0 : (Number(value) / maxValue) * 100
            }));
            this.isDataAvailable4 = true;
          } else { this.isDataAvailable4 = false; }
        },
        error: () => { this.isDataAvailable4 = false; }
      });
  }

  getErrorCountPages(): void {
    this.browserApiService.getErrorCountPages(this.entityId, this.startTime, this.endTime, this.order, this.size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            const sortedEntries = Object.entries(data).sort((a: any, b: any) => Number(b[1]) - Number(a[1]));
            const maxLoadValue = sortedEntries.length > 0 ? Number(sortedEntries[0][1]) : 0;
            this.errorCountPagesPair = sortedEntries.map(([instance, value]) => ({
              errorCountPagesText: instance, errorCountPagesValue: value, isCopied: false,
              percentile: maxLoadValue === 0 ? 0 : (Number(value) / maxLoadValue) * 100
            }));
            this.isDataAvailable5 = true;
          } else { this.isDataAvailable5 = false; }
        },
        error: () => { this.isDataAvailable5 = false; }
      });
  }

  getPagesErrorPer(): void {
    this.browserApiService.getPagesErrorPer(this.entityId, this.startTime, this.endTime, this.order, this.size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            const sortedEntries = Object.entries(data).sort((a: any, b: any) => Number(b[1]) - Number(a[1]));
            const maxLoadValue = sortedEntries.length > 0 ? Number(sortedEntries[0][1]) : 0;
            this.errorPagesPerPair = sortedEntries.map(([instance, value]) => ({
              errorPagesPerText: instance, errorPagesPerValue: value, isCopied: false,
              percentile: maxLoadValue === 0 ? 0 : (Number(value) / maxLoadValue) * 100
            }));
            this.isDataAvailable6 = true;
          } else { this.isDataAvailable6 = false; }
        },
        error: () => { this.isDataAvailable6 = false; }
      });
  }

  getLoadVersionVersionTab(): void {
    this.browserApiService.getVersionLoadVersionTab(this.entityId, this.startTime, this.endTime, this.newInstanceIdForVersionGraphs)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (data && typeof data === 'object' && data.pv !== undefined) {
            const pvValue = Number(data.pv);
            this.versionLoadPairVersionTab = [{
              versionLoadPairTextVersionTab: this.decodeBase64(this.versionId),
              versionLoadPairValueVersionTab: pvValue, isCopied: false,
              percentile: pvValue === 0 ? 0 : 100
            }];
            this.isDataAvailable1 = true;
          } else { this.isDataAvailable1 = false; }
        },
        error: () => { this.isDataAvailable1 = false; }
      });
  }

  getVersionNames(): void {
    const params = {
      serviceId: this.entityId, st: this.startTime, et: this.endTime,
      page: this.currentPageVersions || 1, size: this.size || 10,
      searchWord: this.searchTextVersion || ''
    };
    forkJoin({
      versionRes: this.browserApiService.getVersionNames(params.serviceId, params.st, params.et, params.page, params.size, params.searchWord),
      combinedRes: this.browserApiService.getAllVersionsCombinedData(this.entityId, this.startTime, this.endTime)
    }).pipe(takeUntil(this.destroy$)).subscribe(({ versionRes, combinedRes }: any) => {
      this.totalVersions = versionRes.total_hits || 0;
      this.totalPagesVersions = Math.ceil(this.totalVersions / (this.size || 10));
      let versions: string[] = [];
      for (const key in versionRes) {
        if (key !== 'total_hits') versions.push(...versionRes[key]);
      }
      versions = [...new Set(versions)];
      this.combinedVersionData = versions.map(v => {
        const m = combinedRes[v];
        return { name: v, total_hits: m?.total_hits || 0, error_count: m?.error_count || 0, pv: m?.pv || 0, error_rate: m?.error_rate || 0 };
      });
    });
  }

  onSearchVersion(): void { this.currentPageVersions = 1; this.getVersionNames(); }
  previousPageVersion(): void { if (this.currentPageVersions > 1) { this.currentPageVersions--; this.getVersionNames(); } }
  nextPageVersion(): void { if (this.currentPageVersions < this.totalPagesVersions) { this.currentPageVersions++; this.getVersionNames(); } }
  goToPageVersion(page: number): void { if (page >= 1 && page <= this.totalPagesVersions) { this.currentPageVersions = page; this.getVersionNames(); } }

  get totalPagesArrayVersions(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPagesVersions <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesVersions }, (_, i) => i + 1);
    } else {
      if (this.currentPageVersions <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPagesVersions];
      } else if (this.currentPageVersions >= this.totalPagesVersions - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPagesVersions - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPageVersions - 1, this.currentPageVersions, this.currentPageVersions + 1, '...', this.totalPagesVersions];
      }
    }
    return pages;
  }

  setVersionId(event: MouseEvent): void {
    event.preventDefault();
    const aElement = event.target as HTMLElement;
    const serviceId = aElement.textContent?.trim() as string;
    this.serviceIdService.setServiceId2(serviceId);
    const encodedId = this.serviceIdService.getEncodedServiceId();
    sessionStorage.setItem("encodedVersionId", encodedId);
    this.router.navigate(['browser/browser-service/browser-version']);
  }

  getPageNames(): void {
    this.browserApiService.getAllEndpointsCombinedData(this.apiEntityId, this.startTime, this.endTime, 'page')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const data = res?.data || {};
        this.combinedDataPages = data;
        this.totalHits = res?.total_endpoints ?? Object.keys(data).length;
        this.errorEndpoints = res?.total_error_endpoints ?? Object.values(data).filter((item: any) => (item.page_error_rate ?? 0) > 0).length;
        let allNames = Object.keys(data).map(key => ({ name: key }));
        if (this.viewModePages === 'error') allNames = allNames.filter(x => (data[x.name]?.page_error_rate ?? 0) > 0);
        else if (this.viewModePages === 'success') allNames = allNames.filter(x => (data[x.name]?.page_error_rate ?? 0) === 0);
        if (this.searchTextPage.trim()) {
          const txt = this.searchTextPage.toLowerCase();
          allNames = allNames.filter(x => x.name.toLowerCase().includes(txt));
        }
        this.filteredPageNames = allNames;
        this.totalHitsPages = Math.max(1, Math.ceil(allNames.length / this.size));
        if (this.currentPagePages > this.totalHitsPages) this.currentPagePages = this.totalHitsPages;
        const start = (this.currentPagePages - 1) * this.size;
        this.pageName = allNames.slice(start, start + this.size);
      }, err => {
        console.error("getPageNames error", err);
        this.pageName = []; this.filteredPageNames = []; this.totalHits = 0; this.totalHitsPages = 1;
      });
  }

  seeAllPages(): void { this.viewModePages = 'all'; this.currentPagePages = 1; this.getPageNames(); }
  seeSuccessPages(): void { this.viewModePages = 'success'; this.currentPagePages = 1; this.getPageNames(); }
  seeErrorPages(): void { this.viewModePages = 'error'; this.currentPagePages = 1; this.getPageNames(); }
  previousPagePage(): void { if (this.currentPagePages > 1) { this.currentPagePages--; this.getPageNames(); } }
  nextPagePage(): void { if (this.currentPagePages < this.totalHitsPages) { this.currentPagePages++; this.getPageNames(); } }
  goToPagePage(page: number): void { if (page >= 1 && page <= this.totalHitsPages) { this.currentPagePages = page; this.getPageNames(); } }
  onSearchClick(): void { this.currentPagePages = 1; this.getPageNames(); }

  setPageId(event: MouseEvent): void {
    event.preventDefault();
    const a = event.target as HTMLElement;
    const pageName = (a.textContent || '').trim();
    this.serviceIdService.setServiceId2(pageName);
    const encodedId = this.serviceIdService.getEncodedServiceId();
    sessionStorage.setItem("encodedPageId", encodedId);
    this.router.navigate(['browser/browser-service/browser-page']);
  }

  fetchInstances(): void {
    this.browserApiService.getVersionNames(this.entityId, this.startTime, this.endTime, -1, -1)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const vals = Object.entries(data).filter(([k]) => k !== 'total_hits').flatMap(([_, v]) => v as string[]);
        this.instances = [{ name: 'All', value: 'All' }, ...vals.map(v => ({ name: v, value: v }))];
      });
  }

  fetchEndpointsTraces(): void {
    this.browserApiService.getServicePages(this.entityId, this.startTime, this.endTime, -1, -1)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const key = Object.keys(data).find(k => k !== 'total_hits');
        if (!key) { return; }
        const arr = ([] as string[]).concat(...data[key]);
        this.endpointsTraces = [{ name: 'All', value: 'All' }, ...arr.map(e => ({ name: e, value: e }))];
      });
  }

  search(): void {
    this.currentPageTrace = 1;
    this.tableData = [];
    this.filteredData = [];
    this.totalPagesTrace = 1;
    this.selectedTraceId = null;
    this.forceReload = true;
    this.fetchTraceData();
  }

  fetchTraceData(): void {
    this.isLoading = true;
    const params: any = {
      serviceId: this.entityId, st: +this.startTime, et: +this.endTime,
      page: this.currentPageTrace, sortBy: 'start_time', order: this.orderParameter
    };
    if (this.instName !== 'All') params.instanceId = this.instName;
    if (this.endpointTraces !== 'All') params.endpoint_id = this.endpointTraces;
    if (this.traceState === 'success') params.traceState = 0;
    if (this.traceState === 'error') params.traceState = 1;
    if (this.traceID.trim() !== '') params.trace_id = this.traceID.trim();
    if (this.minDuration) params.minTraceDuration = this.minDuration;
    if (this.maxDuration) params.maxTraceDuration = this.maxDuration;

    this.browserApiService.getTracesData(
      params.serviceId, params.st, params.et, params.page, params.sortBy, params.order,
      params.instanceId, params.traceState, params.endpoint_id, params.trace_id,
      params.minTraceDuration, params.maxTraceDuration
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.tableData = data;
        if (this.tableData.length > 0) this.selectItem(this.tableData[0]);
        this.getTraceCount();
        this.isLoading = false;
      },
      error: err => { console.error(err); this.isLoading = false; }
    });
  }

  getTraceCount(): void {
    const params: any = { serviceId: this.entityId, st: +this.startTime, et: +this.endTime };
    if (this.instName !== 'All') params.instanceId = this.instName;
    if (this.endpointTraces !== 'All') params.endpoint_id = this.endpointTraces;
    if (this.traceState === 'success') params.traceState = 0;
    if (this.traceState === 'error') params.traceState = 1;
    if (this.traceID.trim() !== '') params.trace_id = this.traceID.trim();
    if (this.minDuration) params.minTraceDuration = this.minDuration;
    if (this.maxDuration) params.maxTraceDuration = this.maxDuration;

    this.browserApiService.getTraceCount(
      params.serviceId, params.st, params.et, params.instanceId, params.traceState,
      params.endpoint_id, params.trace_id, params.minTraceDuration, params.maxTraceDuration
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => { this.totalTraces = data.total_count; this.calculateTotalPagesTrace(); },
      error: err => console.error(err)
    });
  }

  calculateTotalPagesTrace(): void { this.totalPagesTrace = Math.max(1, Math.ceil(this.totalTraces / this.pageSizeTrace)); }
  previousTracePage(): void { if (this.currentPageTrace > 1) { this.currentPageTrace--; this.fetchTraceData(); } }
  nextTracePage(): void { if (this.currentPageTrace < this.totalPagesTrace) { this.currentPageTrace++; this.fetchTraceData(); } }
  goToTracePage(page: number): void { this.currentPageTrace = page; this.fetchTraceData(); }

  get traceItemRange(): string {
    if (this.totalTraces === 0) return '0/0';
    const end = Math.min(this.currentPageTrace * this.pageSizeTrace, this.totalTraces);
    return `${end}/${this.totalTraces}`;
  }

  selectItem(item: any): void {
    this.selectedTraceId = item.trace_id;
    this.selectedView = 'table';
    this.fetchTraceMeta(item.trace_id);
  }

  fetchTraceMeta(traceId: string): void {
    this.browserApiService.getTraceMetaData(traceId).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
      const spans = Array.isArray(response) ? response : (response ? [response] : []);
      const { roots, flat } = this.buildTraceTree(spans);
      this.traceMetaData = spans;
      this.traceData = roots;
      this.hierarchicalList = flat;
    });
  }

  toggleTraceInfo() { this.showTraceInfo = !this.showTraceInfo; }

  private buildTraceTree(spans: any[]): { roots: any[]; flat: any[] } {
    if (!spans || spans.length === 0) return { roots: [], flat: [] };
    const idOf = (s: any) => `${s.segmentId}_${s.spanId}`;
    const parentOf = (s: any) => {
      if (s.parentSpanId == null || String(s.parentSpanId).endsWith('-1')) return null;
      if (s.refs && s.refs.length > 0) { const ref = s.refs[0]; return `${ref.parentSegmentId}_${ref.parentSpanId}`; }
      return `${s.segmentId}_${s.parentSpanId}`;
    };
    const map = new Map<string, any>();
    spans.forEach(s => {
      const _id = idOf(s); const _pid = parentOf(s);
      const label = s.operationName || s.endpointName || s.component || '(unknown)';
      map.set(_id, { ...s, _id, _pid, name: label, serviceName: s.serviceCode || s.service || '', children: [] });
    });
    const roots: any[] = [];
    map.forEach(node => { if (!node._pid || !map.has(node._pid)) roots.push(node); else map.get(node._pid).children.push(node); });
    const flat: any[] = [];
    const walk = (node: any, level: number) => { flat.push({ ...node, level }); node.children.forEach((child: any) => walk(child, level + 1)); };
    roots.forEach(r => walk(r, 0));
    return { roots, flat };
  }

  buildHierarchicalList(spans: any[]): any[] {
    const map = new Map(); const root: any[] = [];
    spans.forEach(s => { s.spanId = s.segmentId + s.spanId; s.parentSpanId = s.segmentId + s.parentSpanId; s.children = []; map.set(s.spanId, s); });
    map.forEach(span => { if (span.parentSpanId === `${span.segmentId}-1`) root.push(span); else map.get(span.parentSpanId)?.children.push(span); });
    const list: any[] = [];
    const flatten = (span: any, level: number) => { list.push({ ...span, level }); span.children.forEach((c: any) => flatten(c, level + 1)); };
    root.forEach(s => flatten(s, 0));
    return list;
  }

  changeView(v: 'list' | 'tree' | 'table' | 'stat') { this.selectedView = v; }
  onListItemSelected(i: any) { this.openModal(i); }
  onTableRowSelected(i: any) { this.openModal(i); }
  openModal(item: any): void { this.modalData = item; this.showModal = true; }
  closeModal(): void { this.showModal = false; }

  formatTimeBucket(timeBucket: any): string {
    if (timeBucket == null) return '';
    const s = String(timeBucket);
    if (s.length < 12) return s;
    return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)} ${s.substring(8, 10)}:${s.substring(10, 12)}:${s.substring(12, 14)}`;
  }

  fetchInstancesLogs(): void {
    this.browserApiService.getVersionNames(this.entityId, this.startTime, this.endTime, -1, -1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const vals = Object.entries(data).filter(([k]) => k !== 'total_hits').flatMap(([_, v]) => v as string[]);
          this.instancesLogs = [{ name: 'All', value: 'All' }, ...vals.map(v => ({ name: v, value: v }))];
        },
        error: (e) => console.error(e)
      });
  }

  fetchEndpointsLogs(): void {
    this.browserApiService.getServicePages(this.entityId, this.startTime, this.endTime, -1, -1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const dynKey = Object.keys(data).find(k => k !== 'total_hits');
          const arr = dynKey ? ([] as string[]).concat(...data[dynKey]) : [];
          this.endpointsLogs = [{ name: 'All', value: 'All' }, ...arr.map(v => ({ name: v, value: v }))];
        },
        error: (e) => console.error(e)
      });
  }

  fetchLogs(): void {
    const version = this.versionIdLogs && this.versionIdLogs !== 'All' ? this.versionIdLogs : undefined;
    const page = this.pageIdLogs && this.pageIdLogs !== 'All' ? this.pageIdLogs : undefined;
    const category = this.categoryLogs && this.categoryLogs !== 'All' ? this.categoryLogs : undefined;
    this.browserApiService.getLogsData(this.entityId, +this.startTime, +this.endTime, page, this.currentPageLogs, this.size, version, category)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.tableDataLogs = Array.isArray(data) ? data : [];
          this.noData = this.tableDataLogs.length === 0;
          this.errorLogsCount = this.tableDataLogs.filter(x => x.grade === 'Error').length;
        },
        error: () => { this.tableDataLogs = []; this.noData = true; }
      });
  }

  filterErrorLogs() { this.tableDataLogs = this.tableDataLogs.filter(x => x.grade === 'Error'); this.getLogsAggregatedData(); }

  getLogsAggregatedData(): void {
    const version = this.versionIdLogs && this.versionIdLogs !== 'All' ? this.versionIdLogs : undefined;
    const page = this.pageIdLogs && this.pageIdLogs !== 'All' ? this.pageIdLogs : undefined;
    const category = this.categoryLogs && this.categoryLogs !== 'All' ? this.categoryLogs : undefined;
    this.browserApiService.getLogsAggregatedData(this.entityId, +this.startTime, +this.endTime, page, this.size, version, category)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.totalLogs = data?.total_hits || 0;
          this.totalPagesLogs = Math.ceil(this.totalLogs / this.size);
          this.fetchLogs();
        },
        error: () => { this.noData = true; }
      });
  }

  searchLogs(): void { this.currentPageLogs = 1; this.getLogsAggregatedData(); this.getLogsErrorTimeSeries(); }

  previousPage(): void { if (this.currentPageLogs > 1) { this.currentPageLogs--; this.fetchLogs(); } }
  nextPage(): void { if (this.currentPageLogs < this.totalPagesLogs) { this.currentPageLogs++; this.fetchLogs(); } }
  goToPage(page: number): void { if (page >= 1 && page <= this.totalPagesLogs) { this.currentPageLogs = page; this.fetchLogs(); } }

  get totalPagesArray(): (number | string)[] {
    const visible = 3; const total = this.totalPagesLogs; const cur = this.currentPageLogs;
    if (total <= visible + 2) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= visible) return [...Array.from({ length: visible }, (_, i) => i + 1), '...', total];
    if (cur >= total - visible + 1) return [1, '...', ...Array.from({ length: visible }, (_, i) => total - visible + i + 1)];
    return [1, '...', cur - 1, cur, cur + 1, '...', total];
  }

  getStartIndex(): number { return this.totalLogs === 0 ? 0 : (this.currentPageLogs - 1) * this.size + 1; }
  getEndIndex(): number { const end = this.currentPageLogs * this.size; return end > this.totalLogs ? this.totalLogs : end; }

  getLogsErrorTimeSeries(): void {
    const version = this.versionIdLogs && this.versionIdLogs !== 'All' ? this.versionIdLogs : undefined;
    const page = this.pageIdLogs && this.pageIdLogs !== 'All' ? this.pageIdLogs : undefined;
    const category = this.categoryLogs && this.categoryLogs !== 'All' ? this.categoryLogs : undefined;
    this.browserApiService.getLogsErrorTimeSeries(this.entityId, this.startTime, this.endTime, version, page, category)
      .subscribe({
        next: (res) => { this.buildLogsErrorChart(res?.time_series || []); },
        error: (err) => { console.error(err); this.logsErrorChart = null; }
      });
  }

  buildLogsErrorChart(data: any[]): void {
    if (!data || !Array.isArray(data) || data.length === 0) { this.logsErrorChart = null; return; }
    const labels = data.map(d => `${d.time_bucket.slice(0, 4)}-${d.time_bucket.slice(4, 6)}-${d.time_bucket.slice(6, 8)}`);
    const seriesData = data.map(d => ({ y: Number(d.ERROR || 0), total: Number(d.total ?? d.ERROR ?? 0) }));
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    this.logsErrorChart = {
      chart: { type: 'column', backgroundColor: 'transparent', spacing: [5, 5, 5, 5] },
      title: { text: null },
      plotOptions: { column: { pointPadding: 0.1, maxPointWidth: 10, borderWidth: 0.05 } },
      xAxis: { categories: labels, labels: { style: { color: labelColor, fontSize: '9px' }, y: 10 }, gridLineColor: gridColor },
      yAxis: { min: 0, tickAmount: 6, title: { text: "" }, labels: { style: { color: labelColor, fontSize: '9px' } }, gridLineColor: gridColor },
      tooltip: {
        shared: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' }, useHTML: true,
        formatter: function (this: any) {
          const category = this.points?.[0]?.category ?? this.x;
          const total = (this.points && (this.points[0]?.point?.total ?? this.points[0]?.total)) ?? (this.point && this.point.total) ?? (this.y ?? 0);
          const errorVal = this.points?.[0]?.y ?? this.y ?? 0;
          return `<b>${category}</b><br/><b>Total: ${total}</b><br/><span style="color:#FF4C4C">●</span> ERROR: <b>${errorVal}</b>`;
        }
      },
      legend: { enabled: false },
      series: [{ name: "ERROR", type: "column", data: seriesData, color: "#FF4C4C" }],
      credits: { enabled: false }
    };
  }

  convertTimebucket(timebucket: string): number {
    const tb = timebucket.toString();
    return new Date(+tb.slice(0, 4), +tb.slice(4, 6) - 1, +tb.slice(6, 8), +tb.slice(8, 10), +tb.slice(10, 12)).getTime();
  }

  copyText(text: string | null, event: MouseEvent) {
    event.stopPropagation();
    if (!text) return;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      this.snackBar.open('Text copied!', '', { duration: 2000, horizontalPosition: 'end', verticalPosition: 'bottom' });
    } catch (err) { console.error(err); }
    document.body.removeChild(textarea);
  }

  copyTraceId(traceId: string | null, event: MouseEvent) {
    event.stopPropagation();
    if (!traceId) return;
    navigator.clipboard.writeText(traceId).then(() => {
      this.snackBar.open('Trace ID copied!', '', { duration: 2000, horizontalPosition: 'end', verticalPosition: 'bottom' });
    });
  }

  getOverviewKpiValues() {
    this.browserApiService.getOverViewPageCombinedData(this.apiEntityId, this.startTime, this.endTime).subscribe(res => {
      this.overviewTotalHits = res.total_hits ?? null;
      this.overviewErrorCount = res.error_count ?? null;
      this.overviewAvgLoad = res.pv ?? null;
      this.errorRate = res.error_rate ?? null;
    });
  }

  getImagePath(tech: string | undefined): string {
    if (!tech) return 'assets/img/technologies/UNDEFINED.png';
    switch (tech.toUpperCase()) {
      case 'ANGULAR': return 'assets/images/angular.png';
      case 'REACT': return 'assets/images/react.png';
      case 'VUE': return 'assets/images/vue.jpeg';
      default: return 'assets/img/technologies/UNDEFINED.png';
    }
  }

  onImageError(event: Event) { (event.target as HTMLImageElement).src = 'assets/img/technologies/UNDEFINED.png'; }

  showLogDetailsModal = false;
  logModalTitle = '';
  logModalContent = '';

  openLogModal(title: string, content: string): void {
    this.logModalTitle = title;
    this.logModalContent = content;
    this.showLogDetailsModal = true;
  }

  closeLogModal(): void {
    this.showLogDetailsModal = false;
  }
}