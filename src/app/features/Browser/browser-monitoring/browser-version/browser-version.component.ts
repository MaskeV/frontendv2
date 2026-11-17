import { Component, OnDestroy, OnInit, NgZone } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import * as Highcharts from 'highcharts';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ListViewComponent } from '../../../Dashboard/service-page/general-services/list-view/list-view.component';
import { TreeViewComponent } from '../../../Dashboard/service-page/general-services/tree-view/tree-view.component';
import { TableViewComponent } from '../../../Dashboard/service-page/general-services/table-view/table-view.component';
import { StatViewComponent } from '../../../Dashboard/service-page/general-services/stat-view/stat-view.component';
import { TraceDetailsModalComponent } from '../../../Dashboard/service-page/general-services/trace-details-modal/trace-details-modal.component';
import { BrowserApiService } from '../../../../services/browser-api.service';
import { DateService } from '../../../../services/date.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { SharedService } from '../../../../services/shared.service';
import { Span } from '../../../../models/traceData';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-browser-version',
    templateUrl: './browser-version.component.html',
    styleUrls: ['./browser-version.component.css'],
    imports: [RouterModule, CommonModule, FormsModule,
        ListViewComponent,
        TreeViewComponent,
        TableViewComponent,
        StatViewComponent,
        TraceDetailsModalComponent,
        MatTooltipModule]
})
export class BrowserVersionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private dateSubscription!: Subscription;

  startTime!: number;
  endTime!: number;
  datemodel: any;
  selectedService: string = '';

  versionId: string = '';
  entityId: string = '';
  serviceId: string = '';
  decodedServiceId: string = '';
  instancesLogs: { name: string; value: string; }[] | undefined;
  instNameLogs: string | undefined;
  activeTab: string = 'overview';


  constructor(
    private browserApiService: BrowserApiService,
    private dateService: DateService,
    private serviceIdService: ServiceIdService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private sharedService: SharedService,
    private snakBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.serviceId = sessionStorage.getItem('encodedServiceIdforBrowser') ?? '';
    this.versionId = sessionStorage.getItem('encodedVersionId') ?? '';
    this.entityId = `${this.serviceId}_${this.versionId}`;
    this.selectedService = this.decodeBase64(this.versionId);
    this.decodedServiceId = this.decodeBase64(this.serviceId);


    this.dateService.setActiveComponent('BrowserVersionComponent');
    this.dateSubscription = this.dateService.activeComponent$
      .pipe(
        filter((c) => c === 'BrowserVersionComponent'),
        switchMap(() => this.dateService.date$)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        setTimeout(() => {
          const link = document.querySelector('#bp-tabs .nav-link.active') as HTMLAnchorElement | null;
          const tab = link?.getAttribute('href')?.replace('#', '') || 'overview';
          this.setActiveTab(tab);
        });

      });
  }
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.loadData(tab);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dateSubscription?.unsubscribe();
  }

  formatDate(date: string): number {
    return +date.replace(/[-:\s]/g, '');
  }

  convertTimebucket(tb: string): number {
    const year = +tb.slice(0, 4);
    const month = +tb.slice(4, 6) - 1;
    const day = +tb.slice(6, 8);
    const hour = +tb.slice(8, 10);
    const minute = +tb.slice(10, 12);
    return new Date(year, month, day, hour, minute).getTime();
  }




  loadData(tab: string): void {
    if (!this.startTime || !this.endTime) return;
    this.destroy$.next();
    this.activeTab = tab;
    console.log('🔄 Active Tab:', this.activeTab);


    switch (tab) {
      case 'overview':
        this.getVersionLoad();
        this.getVersionErrorRate();
        this.getVersionErrorCount();
        break;

      case 'trace':
        this.fetchData();
        break;

      case 'log':
        console.log('🕒 Re-fetching Logs for New Time Range');
        this.currentPageLogs = 1;
        this.fetchEndpointsLogs();
        this.getLogsAggregatedData(); // ✅ this auto-calls fetchLogs() internally
        break;
    }
  }


  // ✅ Load Chart
  getVersionLoad(): void {
    this.browserApiService
      .getVersionLoad(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        const data = Array.isArray(response) ? response : [];
        if (data.length === 0) return;

        const chartData = data.map((d: any) => ({
          x: this.convertTimebucket(d.time_bucket),
          y: d.value
        }));

        this.zone.runOutsideAngular(() => {
          setTimeout(() => {
            Highcharts.chart('appLoadGraph', {
              chart: { type: 'line', backgroundColor: 'transparent' as any },
              title: { text: undefined },
              credits: { enabled: false },
              legend: { enabled: false },
              xAxis: {
                type: 'datetime',
                crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
                labels: { style: { color: '#030303', fontSize: '8px' } }, // or use CSS variables if needed
                gridLineColor: '#ede8e8',
                lineColor: '#cccccc',
                tickColor: '#cccccc',
                tickLength: 5,
                tickWidth: 1
              },
              yAxis: {
                min: 0,
                title: undefined,
                tickAmount: 6,
                labels: { style: { color: '#030303', fontSize: '8px' } },
                gridLineColor: '#ede8e8'
              },
              tooltip: {
                shared: true,
                xDateFormat: '%e %b %Y, %H:%M',
                pointFormat: '<b>{point.y}</b> calls/min'
              },
              series: [
                {
                  data: chartData,
                  type: 'line',
                  color: '#007bff'
                }
              ]
            } as Highcharts.Options);
          }, 200);
        });
      });
  }


  getVersionErrorRate(): void {
    this.browserApiService
      .getVersionErrorRate(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        const data = Array.isArray(response) ? response : [];
        if (data.length === 0) return;

        const chartData = data.map((d: any) => ({
          x: this.convertTimebucket(d.time_bucket),
          y: d.value
        }));

        this.zone.runOutsideAngular(() => {
          setTimeout(() => {
            Highcharts.chart('appErrorRateGraph', {
              chart: { type: 'area', backgroundColor: 'transparent' as any },
              title: { text: undefined },
              credits: { enabled: false },
              legend: { enabled: false },
              xAxis: {
                type: 'datetime',
                crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
                labels: { style: { color: '#030303', fontSize: '8px' } }, // or use CSS variables if needed
                gridLineColor: '#ede8e8',
                lineColor: '#cccccc',
                tickColor: '#cccccc',
                tickLength: 5,
                tickWidth: 1
              },
              yAxis: {
                min: 0,
                title: undefined,
                tickAmount: 6,
                labels: { style: { color: '#030303', fontSize: '8px' } },
                gridLineColor: '#ede8e8'
              },
              tooltip: {
                shared: true,
                xDateFormat: '%e %b %Y, %H:%M',
                pointFormat: '<b>{point.y}%</b> errors'
              },
              series: [
                {
                  data: chartData,
                  type: 'area',
                  color: '#dc3545',
                  fillOpacity: 0.3
                }
              ]
            } as Highcharts.Options);
          }, 200);
        });
      });
  }


  getVersionErrorCount(): void {
    this.browserApiService
      .getVersionErrorCount(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        const data = Array.isArray(response) ? response : [];
        if (data.length === 0) return;

        const chartData = data.map((d: any) => ({
          x: this.convertTimebucket(d.time_bucket),
          y: d.value
        }));

        this.zone.runOutsideAngular(() => {
          setTimeout(() => {
            Highcharts.chart('appErrorCountGraph', {
              chart: { type: 'column', backgroundColor: 'transparent' as any },
              title: { text: undefined },
              credits: { enabled: false },
              legend: { enabled: false },
              xAxis: {
                type: 'datetime',
                crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
                labels: { style: { color: '#030303', fontSize: '8px' } }, // or use CSS variables if needed
                gridLineColor: '#ede8e8',
                lineColor: '#cccccc',
                tickColor: '#cccccc',
                tickLength: 5,
                tickWidth: 1
              },
              yAxis: {
                min: 0,
                title: undefined,
                tickAmount: 6,
                labels: { style: { color: '#030303', fontSize: '8px' } },
                gridLineColor: '#ede8e8'
              },

              tooltip: {
                shared: true,
                xDateFormat: '%e %b %Y, %H:%M',
                pointFormat: '<b>{point.y}</b> errors'
              },
              series: [
                {
                  data: chartData,
                  type: 'column',
                  color: '#ffc107'
                }
              ]
            } as Highcharts.Options);
          }, 200);
        });
      });
  }
  decodeBase64(encoded: string): string {
    try {
      const pureBase64 = encoded.split(/[_\.]/)[0];
      return atob(pureBase64);
    } catch {
      return encoded;
    }
  }


  //TRACES START //
  endpoint: string = 'All';
  traceID: string = '';
  status: string = '';
  minDuration: number = 0;
  maxDuration: number = 0;
  selectedTag: string = '';
  tags: string = '';
  selectedItem: string | null = null;
  selectedLatency: string | null = null;
  selectedTraceId: string | null = null;
  rowsPerPage = 20;
  currentPage = 1;
  totalPages: number = 0;
  startdateTime: string = '';
  enddateTime: string = '';

  instName: string = 'All';
  endpointTraces: string = 'All';

  traceState: string = '';

  instances: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];
  endpointsTraces: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];

  paginatedTraceData: any[] = [];  // current page rows
  totalTraces: number = 0;
  isLoading = false;
  totalPagesTrace: number = 0;
  currentPageTrace: number = 1;    // UI input
  pageSizeTrace: number = 10;

  selectedView: 'list' | 'tree' | 'table' | 'stat' = 'table';
  endpoints: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];
  tableData: { endpointId: string, startTime: number, timeBucket: string, isError: number, traceId: string, instance: string, latency: any }[] = [];
  filteredData: { endpointId: string, startTime: number, timeBucket: string, isError: number, traceId: string, instance: string, latency: any }[] = [];
  paginatedData: any = [];
  visiblePageNumbers: number[] = [];
  maxVisiblePages = 3;
  traceMetaData: any[] = [];
  traceMetaDataTree: any = {};
  hierarchicalList: any[] = [];
  hasMoreData: boolean = true;

  showModal: boolean = false;
  modalData: {
    serviceCode: any;
    serviceInstanceName: any;
    endpointName: any;
    type: any;
    component: any;
    peer: any;
    isError: any;
    tags: any;
  } | null = null;
  public traceData: Array<Span> | undefined;
  sortParameter: 'start_time' | 'duration' = 'start_time';
  orderParameter: 'asc' | 'des' = 'des';
  param = -1;

  toggleDropdown() { this.dropdownOpen = !this.dropdownOpen; }
  selectCriteria(key: string) { this.shownCriteria[key] = true; }
  removeCriteria(key: string) {
    this.shownCriteria[key] = false;

    // reset values
    if (key === 'instance') this.instName = 'All';
    if (key === 'endpoint') this.endpointTraces = 'All';
    if (key === 'status') this.traceState = '';
    if (key === 'traceID') this.traceID = '';
    if (key === 'minDuration') this.minDuration = 0;
    if (key === 'maxDuration') this.maxDuration = 0;

    this.currentPage = 1;

    // 🔥 agar ab koi criteria nahi bacha
    if (!this.hasAnyCriteriaSelected()) {
      this.fetchData();
    }
    this.getTraceCount();
    this.getTracesData();
  }


  dropdownOpen = false;
  criteriaList = [
    // { key: 'instance', label: 'Instance' },
    { key: 'endpoint', label: 'Endpoint' },
    { key: 'status', label: 'Status' },
    { key: 'traceID', label: 'Trace ID' },
    { key: 'minDuration', label: 'Min Duration' },
    { key: 'maxDuration', label: 'Max Duration' }
  ];
  shownCriteria: Record<string, boolean> = {
    instance: false,
    endpoint: false,
    status: false,
    traceID: false,
    minDuration: false,
    maxDuration: false
  };
  private hasAnyCriteriaSelected(): boolean {
    return Object.values(this.shownCriteria).some(v => v === true);
  }


  get allCriteriaSelected(): boolean {
    return this.criteriaList.every(c => this.shownCriteria[c.key]);
  }
  get availableCriteria() {
    return this.criteriaList.filter(c => !this.shownCriteria[c.key]);
  }

  //TRACES METHODS//
  //TRACES START

  // fetchEndpoints(): void {
  //   const encodedServiceId = this.serviceIdService.getEncodedServiceId() || this.serviceId;

  //   this.browserApiService.getServicePages(this.serviceId, this.startTime, this.endTime, this.param, this.param)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: (data: any) => {
  //         if (data && typeof data === 'object') {
  //           const endpointsArray = ([] as string[]).concat(
  //             ...Object.values(data).map(value => Array.isArray(value) ? value : [value])
  //           );
  //           this.endpoints = [
  //             { name: 'All', value: 'All' },
  //             ...endpointsArray.map(endpoint => ({ name: endpoint, value: endpoint }))
  //           ];
  //           this.endpoint = 'All';
  //         } else {
  //           console.error('Unexpected data format:', data);
  //         }
  //       },
  //       error: (error) => {
  //         console.error('Error fetching endpoints:', error);
  //       }
  //     });
  // }

  fetchEndpoints(): void {
    const encodedServiceId = this.serviceIdService.getEncodedServiceId() || this.serviceId;
    console.log("Service ID used for endpoints:", this.serviceId);
    this.browserApiService.getServicePages(this.serviceId, this.startTime, this.endTime, this.param, this.param, '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (data && typeof data === 'object') {
            const endpointsArray = ([] as string[]).concat(
              ...Object.entries(data)
                .filter(([key, value]) => key !== 'total_hits' && Array.isArray(value))
                .map(([_, value]) => value as string[])
            );

            const options = [
              { name: 'All', value: 'All' },
              ...endpointsArray.map(endpoint => ({ name: endpoint, value: endpoint }))
            ];

            this.endpoints = options;
            this.endpointsTraces = options;
            
            this.endpoint = 'All';
            this.endpointTraces = 'All';
            
          } else {
            console.error('Unexpected data format:', data);
          }
        },
        error: (error) => {
          console.error('Error fetching endpoints:', error);
        }
      });
  }


  getTracesData(loadMore = false): void {
    this.isLoading = true;
    this.browserApiService
      .getTracesData(
        this.serviceId,
        this.startTime,
        this.endTime,
        this.currentPage,          // ✅ page number
        this.sortParameter,        // start_time | duration
        this.orderParameter,       // asc | des
        this.instName !== 'All' ? this.instName : undefined,
        this.traceState === 'error' ? 1 : this.traceState === 'success' ? 0 : undefined,
        this.endpointTraces !== 'All' ? this.endpointTraces : undefined,
        this.traceID || undefined,
        this.minDuration || undefined,
        this.maxDuration || undefined
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.paginatedTraceData = data || [];
          if (this.paginatedTraceData.length > 0) {
            this.selectItem(this.paginatedTraceData[0]);
          } else {
            this.clearSelection();
          }
          this.tableData = data;
          // this.getTraceCount();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching trace data:', err);
          this.paginatedTraceData = [];
          this.isLoading = false;
        },
      });
  }

  getTraceCount(): void {
    const sdt = +this.startTime;
    const edt = +this.endTime;

    const params: any = {
      serviceId: this.serviceId,
      st: sdt,
      et: edt
    };

    if (this.instName !== 'All') params.instanceId = this.instName;
    if (this.endpointTraces !== 'All') params.endpoint_id = this.endpointTraces;
    if (this.traceState === 'success') params.traceState = 0;
    if (this.traceState === 'error') params.traceState = 1;
    if (this.traceID && this.traceID.trim() !== '') {
      params.trace_id = this.traceID.trim();
    }
    if (this.minDuration) params.minTraceDuration = this.minDuration;
    if (this.maxDuration) params.maxTraceDuration = this.maxDuration;

    this.browserApiService.getTraceCount(
      params.serviceId,
      params.st,
      params.et,
      params.instanceId,
      params.traceState,
      params.endpoint_id,
      params.trace_id,
      params.minTraceDuration,
      params.maxTraceDuration
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.totalTraces = data.total_count;
          this.calculateTotalPages();
        },
        error: (err) => {
          console.error('Error fetching trace count:', err);
        }
      });
  }


  calculateTotalPages(): void {
    this.totalPages = Math.max(1, Math.ceil(this.totalTraces / this.rowsPerPage));
  }

  previousTracePage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getTracesData();
    }
  }



  nextTracePage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getTracesData();
    }
  }

  goToTracePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.getTracesData();
    }
  }

  get traceItemRange(): string {
    if (this.totalTraces === 0) return '0/0';
    const start = (this.currentPage - 1) * this.rowsPerPage + 1;
    const end = Math.min(this.currentPage * this.rowsPerPage, this.totalTraces);
    return `${end}/${this.totalTraces}`;
  }

  getSortParameter(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.sortParameter = selectedValue as 'start_time' | 'duration';
    console.log('Selected sort parameter:', this.sortParameter);
    this.getTracesData();
  }

  getOrderParameter(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.orderParameter = selectedValue as 'asc' | 'des';
    console.log('Selected order parameter:', this.orderParameter);
    this.getTracesData();
  }

  changePage(page: number): void {
    if (page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      this.getTracesData();
      if (this.paginatedData.length > 0) {
        this.selectItem(this.paginatedData[0]);
      } else {
        this.clearSelection();
      }
    }
  }

  fetchData(): void {
    this.currentPage = 1;
    this.fetchEndpoints();
    this.getTraceCount();
    this.getTracesData();
  }

  selectItem(item: any): void {
    if (item) {
      this.clearSelection();

      this.selectedView = 'table';
      this.selectedItem = item.endpoint_id;
      this.selectedTraceId = item.trace_id;
      this.selectedLatency = item.latency;
      this.fetchTraceDataList(item.trace_id);
      // this.fetchTraceDataTable(item.traceId);
    } else {
      this.clearSelection();
    }
  }

  search(): void {
    this.clearSelection();
    this.currentPage = 1;

    // 🔥 agar ek bhi filter select nahi hai
    if (!this.hasAnyCriteriaSelected()) {
      this.fetchData();   // page 1 + total count + full data
      return;
    }

    // 🔥 agar filter selected hai
    this.getTraceCount();
    this.getTracesData();
  }


  openViewLogs() {
    this.sharedService.selectInstanceTraceId(this.selectedTraceId);
    const logTab = document.querySelector('.nav-link[href="#logs"]') as HTMLElement;
    if (logTab) {
      logTab.click();
    }
  }

  openLogTabTraceId(selectedTraceId: string): void {
    const logTab = document.querySelector('.nav-link[href="#logs"]') as HTMLElement;
    if (logTab) {
      logTab.click();
    }
    setTimeout(() => {
      // this.traceIDLogs = selectedTraceId;
    }, 100);
  }

  // decodeBase64(encoded: string): string {
  //   try {
  //     return atob(encoded);
  //   } catch (e) {
  //     console.error('Error decoding base64:', e);
  //     return encoded;
  //   }
  // }

  encodeBase64(value: string): string {
    try {
      return btoa(value);
    } catch (e) {
      console.error('Error encoding base64:', e);
      return value;
    }
  }

  formatTimeBucket(timeBucket: number | string | undefined): string {
    if (!timeBucket) return 'N/A';
    const timeString = timeBucket.toString();
    return `${timeString.substring(0, 4)}-${timeString.substring(4, 6)}-${timeString.substring(6, 8)} ${timeString.substring(8, 10)}:${timeString.substring(10, 12)}:${timeString.substring(12, 14)}`;
  }


  clearSelection(): void {
    this.selectedItem = null;
    this.selectedTraceId = null;
    this.hierarchicalList = [];
    this.traceMetaData = [];
    this.traceData = [];
    this.showModal = false;
  }


  changeView(view: 'list' | 'tree' | 'table' | 'stat'): void {
    this.selectedView = view;
  }

  fetchTraceDataList(traceId: string): void {
    this.browserApiService
      .getTraceMetaData(traceId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error fetching trace metadata:', error);
          return of([]);
        })
      )
      .subscribe({
        next: (response: any) => {
          const spans = response || [];
          this.traceMetaData = spans;
          this.traceData = JSON.parse(JSON.stringify(spans));
          this.hierarchicalList = this.buildHierarchicalList(spans);
        },
        error: (err) => {
          console.error('Error fetching trace metadata:', err);
        },
        complete: () => {
          console.log('Trace metadata fetch completed.');
        }
      });
  }

  buildHierarchicalList(spans: any[]): any[] {
    const spanMap = new Map<string, any>();
    const root: any[] = [];

    spans.forEach(span => {
      span.spanId = span.segmentId + span.spanId;
      if (span.parentSpanId === -1 && span.refs && span.refs.length > 0) {
        const ref = span.refs[0];
        span.parentSpanId = ref.parentSegmentId + ref.parentSpanId;
      } else {
        span.parentSpanId = span.segmentId + span.parentSpanId;
      }
      span.children = [];
      spanMap.set(span.spanId, span);
    });

    spanMap.forEach(span => {
      if (span.parentSpanId === `${span.segmentId}-1`) {
        root.push(span);
      } else {
        const parent = spanMap.get(span.parentSpanId);
        if (parent) {
          parent.children.push(span);
        }
      }
    });

    const hierarchicalList: any[] = [];

    function flatten(span: any, level: number) {
      hierarchicalList.push({ ...span, level });
      span.children.forEach((child: any) => flatten(child, level + 1));
    }
    root.forEach(span => flatten(span, 0));
    return hierarchicalList;
  }

  createBrokenSpan(span: any): any {
    return {
      traceId: span.traceId,
      segmentId: span.segmentId,
      spanId: span.parentSpanId,
      parentSpanId: -1,
      endpointName: `VNode: ${span.segmentId}`,
      serviceCode: "VirtualNode",
      type: `[Broken] ${span.type}`,
      peer: "",
      component: `VirtualNode: #${span.parentSpanId}`,
      isError: true,
      isBroken: true,
      layer: "Broken",
      tags: [],
      logs: [],
      startTime: 0,
      endTime: 0,
      children: []
    };
  }

  trackById(index: number, item: any): string {
    return item.spanId;
  }

  fetchTraceDataTable(traceId: string): void {
    // this.clearSelection();
    this.browserApiService.getTraceMetaData(traceId).pipe(takeUntil(this.destroy$)).subscribe(
      (response: any) => {
        this.traceMetaData = response || [];
      },
      error => {
        console.error('Error fetching trace metadata:', error);
      }
    );
  }

  onListItemSelected(item: any): void {
    this.openModal(item);
  }

  onTableRowSelected(row: any): void {
    this.openModal(row);
  }

  openModal(item: Span): void {
    this.modalData = {
      serviceCode: item.serviceCode,
      serviceInstanceName: item.serviceInstanceName,
      endpointName: item.endpointName,
      type: item.type,
      component: item.component,
      peer: item.peer,
      isError: item.isError,
      tags: item.tags
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalData = null;
  }

  copyTraceId(traceId: string | null, event: MouseEvent) {
    event.stopPropagation();
    if (!traceId) return;

    navigator.clipboard.writeText(traceId).then(() => {
      this.snakBar.open('Trace ID copied!', '', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
    });
  }


  //TRACES END

  //LOGS STARTS//
  // ===================== LOGS FILTER VALUES =====================
  versionIdLogs: any = 'All';
  pageIdLogs: string = 'All';
  categoryLogs: string = 'All';

  currentPageLogs: number = 1;
  size = 20;

  tableDataLogs: any[] = [];
  filteredDataLogs: any[] = [];
  noData: boolean = false;

  endpointsLogs: { name: string; value: string }[] = [{ name: 'All', value: 'All' }];
  sizeParam: number = -1;
  pageParam: number = -1;
  loadingLogs = false;


  // ===================== CRITERIA SYSTEM =====================

  // dropdown open?
  dropDownOpenLogs = false;

  // Available criteria list
  criteriaListLogs = [
    { key: 'page', label: 'Page' },
    { key: 'category', label: 'Category' }
  ];

  // Which criteria pill is visible
  showCriteriaLogs: any = {
    page: false,
    category: false
  };

  // Toggle dropdown
  toggleDropDownLogs() {
    this.dropDownOpenLogs = !this.dropDownOpenLogs;
  }

  // Select a criteria pill
  selectCriteriaLogs(key: string) {
    this.showCriteriaLogs[key] = true;
    this.dropDownOpenLogs = false;
  }

  // Remove pill + reset values
  removeCriteriaLogs(key: string) {
    this.showCriteriaLogs[key] = false;

    if (key === 'page') this.pageIdLogs = 'All';
    if (key === 'category') this.categoryLogs = 'All';
  }

  // Remaining items for dropdown
  get availableCriteriaLogs() {
    return this.criteriaListLogs.filter(c => !this.showCriteriaLogs[c.key]);
  }

  // All selected?
  get allCriteriaSelectedLogs(): boolean {
    return this.criteriaListLogs.every(c => this.showCriteriaLogs[c.key]);
  }


  // ===================== FETCHING DROPDOWN DATA =====================

  // VERSION list
  fetchInstancesLogs(): void {
    this.browserApiService
      .getVersionNames(this.entityId, this.startTime, this.endTime, this.param, this.param)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const arr = ([] as string[]).concat(...Object.values(data));
          this.instancesLogs = [{ name: 'All', value: 'All' }, ...arr.map(x => ({ name: x, value: x }))];
          this.versionIdLogs = 'All';
        },
        error: (err) => console.error('Error fetching instances:', err)
      });
  }

  // PAGE list
  fetchEndpointsLogs(): void {
    this.browserApiService
      .getServicePages(this.serviceId, this.startTime, this.endTime, this.sizeParam, this.pageParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const dynKey = Object.keys(data).find(k => k !== 'total_hits');
          const arr = dynKey ? ([] as string[]).concat(...data[dynKey]) : [];
          this.endpointsLogs = [{ name: 'All', value: 'All' }, ...arr.map(x => ({ name: x, value: x }))];
          this.pageIdLogs = 'All';
        },
        error: (err) => console.error('Error fetching endpoints:', err)
      });
  }


  // ===================== FETCH LOGS =====================

  fetchLogs(): void {
    const sdt = +this.startTime;
    const edt = +this.endTime;

    const version = this.selectedService;
    const page = this.pageIdLogs !== 'All' ? this.pageIdLogs : undefined;
    const category = this.categoryLogs !== 'All' ? this.categoryLogs : undefined;

    this.browserApiService.getLogsData(
      this.serviceId,
      sdt, edt,
      page,
      this.currentPageLogs,
      this.size,
      version,
      category
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.tableDataLogs = Array.isArray(data) ? data : [];
          this.noData = this.tableDataLogs.length === 0;
        },
        error: (err) => {
          console.error('fetchLogs error', err);
          this.noData = true;
        }
      });
  }


  // ===================== PAGINATION TOTAL =====================

  totalLogs: number = 0;
  totalPagesLogs: number = 0;

  getLogsAggregatedData(): void {
    const sdt = +this.startTime;
    const edt = +this.endTime;

    const version = this.selectedService;
    const page = this.pageIdLogs !== 'All' ? this.pageIdLogs : undefined;
    const category = this.categoryLogs !== 'All' ? this.categoryLogs : undefined;

    this.browserApiService
      .getLogsAggregatedData(
        this.serviceId,
        sdt, edt,
        page,
        this.size,
        version,
        category
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.totalLogs = data?.total_hits || 0;
          this.totalPagesLogs = Math.ceil(this.totalLogs / this.size) || 1;
          this.fetchLogs();
        },
        error: (err) => {
          console.error('getLogsAggregatedData error', err);
          this.noData = true;
        }
      });
  }


  // ===================== PAGINATION =====================

  previousPage(): void {
    if (this.currentPageLogs > 1) {
      this.currentPageLogs--;
      this.fetchLogs();
    }
  }

  nextPage(): void {
    if (this.currentPageLogs < this.totalPagesLogs) {
      this.currentPageLogs++;
      this.fetchLogs();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPagesLogs) {
      this.currentPageLogs = page;
      this.fetchLogs();
    }
  }

  get totalPagesArray(): (number | string)[] {
    const visible = 3;
    const total = this.totalPagesLogs;
    const cur = this.currentPageLogs;

    if (total <= visible + 2)
      return Array.from({ length: total }, (_, i) => i + 1);

    if (cur <= visible)
      return [...Array.from({ length: visible }, (_, i) => i + 1), '...', total];

    if (cur >= total - visible + 1)
      return [1, '...', ...Array.from({ length: visible }, (_, i) => total - visible + i + 1)];

    return [1, '...', cur - 1, cur, cur + 1, '...', total];
  }
  getStartIndex(): number {
    if (this.totalLogs === 0) return 0;
    return (this.currentPageLogs - 1) * this.size + 1;
  }

  getEndIndex(): number {
    const end = this.currentPageLogs * this.size;
    return end > this.totalLogs ? this.totalLogs : end;
  }


  // ===================== SEARCH BUTTON =====================

  searchLogs() {
    this.currentPageLogs = 1;
    this.getLogsAggregatedData(); // this will call fetchLogs internally
  }


  toggleRow(item: any) {
    item.expanded = !item.expanded;
  }

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
