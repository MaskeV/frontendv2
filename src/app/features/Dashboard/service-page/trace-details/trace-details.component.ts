import { CommonModule } from '@angular/common';
import { ApplicationRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApmApiService } from '../../../../services/apm-api.service';
import { from, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DecoderService } from '../../../../services/decoder.service';
import { Span } from '../../../../models/traceData';
import { SharedService } from '../../../../services/shared.service';
import { DateService } from '../../../../services/date.service';
import { TableViewComponent } from "../general-services/table-view/table-view.component";
import { ListViewComponent } from "../general-services/list-view/list-view.component";
import { TreeViewComponent } from "../general-services/tree-view/tree-view.component";
import { StatViewComponent } from "../general-services/stat-view/stat-view.component";
import { TraceDetailsModalComponent } from "../general-services/trace-details-modal/trace-details-modal.component";
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-trace-details',
    imports: [FormsModule, CommonModule, TableViewComponent, ListViewComponent, TreeViewComponent, StatViewComponent, TraceDetailsModalComponent],
    templateUrl: './trace-details.component.html',
    styleUrl: './trace-details.component.css'
})
export class TraceDetailsComponent implements OnInit, OnDestroy {

  @Input() xValue: number | undefined;
  @Input() yValue: number | undefined;
  @Input() allYValues: any | undefined;

  private destroy$ = new Subject<void>();

  constructor(
    private apiApm: ApmApiService,
    private decoderService: DecoderService,
    private appRef: ApplicationRef,
    private sharedService: SharedService,
    private dateService: DateService,
    private snackBar: MatSnackBar,
    private apmApiService: ApmApiService,
  ) {

  }

  isVisible: boolean = false;

  formattedXValue: string = '';
  traceStartTime: string = '';
  traceEndTime: string = '';
  startdateTime: string = '';
  enddateTime: string = '';
  step: string = '';

  entityId!: string;
  subscriptions: Subscription = new Subscription();

  timeDifference: string = '';



  loadingTrace: boolean = false;
  loadingTraceMetaData = false;

  traceNames: any[] = [];
  selectedTraceId: string | null = null;

  currentPageTrace: number = 1;
  rowsPerPageTrace: number = 15;
  totalHitsTrace: number = 0;
  totalPagesTrace: number = 0;

  traceIDTrace: string | null = '';
  instNameTrace: string = 'All';
  endpointTrace: string = 'All';
  textEndpoint: string = '';
  traceState: string = '';
  minDuration!: any;
  maxDuration!: any;
  sortParameter: 'start_time' | 'duration' | 'isError' = 'start_time';
  orderParameter: 'asc' | 'dec' = 'dec';

  selectedItem: string | null = null;
  hierarchicalList: any[] = [];
  traceMetaData: any[] = [];
  selectedView: 'list' | 'tree' | 'table' | 'stat' = 'table';
  public traceData!: Array<Span>;

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



  ngOnInit(): void {
    this.entityId = sessionStorage.getItem('encodedEntityIDForServices')!;
    this.subscriptions.add(
      this.sharedService.selectedTraceId$.subscribe(traceId => {
        if (traceId) {
          this.traceIDTrace = traceId;
          this.fetchTraceData();
        }
      })
    );
    this.dateService.date$.subscribe(dates => {
      let { startdateTime, enddateTime } = dates;
      startdateTime += '00';
      enddateTime += '59';
      this.startdateTime = startdateTime;
      this.enddateTime = enddateTime;
      const differenceInSeconds = this.calculateTimeDifference(startdateTime, enddateTime);
      this.timeDifference = `${differenceInSeconds} seconds`;
      this.step = this.calculateStep(differenceInSeconds);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private calculateTimeDifference(start: string, end: string): number {
    const startDateTime = this.convertToEpoch(start);
    const endDateTime = this.convertToEpoch(end);
    const differenceInMs = endDateTime - startDateTime;
    return Math.floor(differenceInMs / 1000);
  }

  private calculateStep(differenceInSeconds: number): string {
    if (differenceInSeconds <= 3659) {
      return 'MINUTE';
    } else if (differenceInSeconds <= 86459) {
      return 'HOUR';
    } else {
      return 'DAY';
    }
  }

  closeMainModal() {
    this.isVisible = false;
  }

  openMinDurationModal(x: number, y: number) {
    this.xValue = x;
    this.formattedXValue = this.epochToFormattedDate(x);
    this.yValue = y;
    this.isVisible = true;
    this.traceStartTime = this.formattedXValue;
    let traceEndEpoch = x;
    
    switch (this.step) {
      case 'MINUTE':
        traceEndEpoch += 60 * 1000;
        break;
      case 'HOUR':
        traceEndEpoch += 3600 * 1000;
        break;
      case 'DAY':
        traceEndEpoch += 86400 * 1000;
        break;
      default:
        traceEndEpoch = x;
    }
    const endDateTimeEpoch = this.convertToEpoch(this.enddateTime);
    this.traceEndTime = this.epochToFormattedDate(Math.min(traceEndEpoch, endDateTimeEpoch));
    this.minDuration = this.yValue; 
    this.maxDuration = null; 
    this.traceIDTrace = null; 
    this.traceState = '';
    this.fetchData();
  }

  openNoDurationModal(x: number, y: number) {
    this.xValue = x;
    this.formattedXValue = this.epochToFormattedDate(x);
    this.isVisible = true;
    this.yValue = undefined;

    this.traceStartTime = this.formattedXValue;

    let traceEndEpoch = x;
    switch (this.step) {
      case 'MINUTE':
        traceEndEpoch += 60 * 1000;
        break;
      case 'HOUR':
        traceEndEpoch += 3600 * 1000;
        break;
      case 'DAY':
        traceEndEpoch += 86400 * 1000;
        break;
      default:
        traceEndEpoch = x;
    }

    const endDateTimeEpoch = this.convertToEpoch(this.enddateTime);
    this.traceEndTime = this.epochToFormattedDate(Math.min(traceEndEpoch, endDateTimeEpoch));
    this.traceState = 'error'
    this.minDuration = null;
    this.maxDuration = null;
    this.traceIDTrace = null; 
    this.fetchData();
  }

  epochToFormattedDate(epoch: number): string {
    const date = new Date(epoch);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(epoch + istOffset);
    const yyyy = istDate.getUTCFullYear();
    const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getUTCDate()).padStart(2, '0');
    const hh = String(istDate.getUTCHours()).padStart(2, '0');
    const min = String(istDate.getUTCMinutes()).padStart(2, '0');
    const ss = String(istDate.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
  }


  private convertToEpoch(dateTime: string): number {
    const year = parseInt(dateTime.substring(0, 4), 10);
    const month = parseInt(dateTime.substring(4, 6), 10) - 1;
    const day = parseInt(dateTime.substring(6, 8), 10);
    const hours = parseInt(dateTime.substring(8, 10), 10);
    const minutes = parseInt(dateTime.substring(10, 12), 10);
    const seconds = parseInt(dateTime.substring(12, 14), 10);
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds)).getTime();
  }

  fetchData(): void {
    this.currentPageTrace = 1;
    this.fetchTraceData();
  }

  selectedCriteria: string | null = null;;
  dropdownOpen = false;

  criteriaList = [
    { key: 'status', label: 'Status' },
    { key: 'traceID', label: 'Trace ID' },
    { key: 'minDuration', label: 'Min Duration' },
    { key: 'maxDuration', label: 'Max Duration' }
  ];

  shownCriteria: Record<string, boolean> = {
    status: true,
    traceID: false,
    minDuration: true,
    maxDuration: false
  };

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown() {
    setTimeout(() => {
      this.dropdownOpen = false;
    }, 150);
  }

  selectCriteria(key: string) {
    if (!this.shownCriteria[key]) {
      this.shownCriteria[key] = true;
    }
  }

  removeCriteria(criteriaKey: string) {
    this.shownCriteria[criteriaKey] = false;
    if (criteriaKey === 'status') this.traceState = '';
    if (criteriaKey === 'traceID') this.traceIDTrace = '';
    if (criteriaKey === 'minDuration') this.minDuration = null;
    if (criteriaKey === 'maxDuration') this.maxDuration = null;
  }

  get allCriteriaSelected(): boolean {
    return this.criteriaList.every(c => this.shownCriteria[c.key]);
  }

  get availableCriteria() {
    return this.criteriaList.filter(c => !this.shownCriteria[c.key]);
  }

  get anyFilterActive(): boolean {
    return Object.values(this.shownCriteria).some(v => v === true);
  }

  fetchTraceData(): void {
    this.loadingTrace = true;
    const sdt = +this.traceStartTime;
    const edt = +this.traceEndTime;

    let instanceId = '';
    let endpointId = '';


    const endpointValue = this.textEndpoint?.trim() ? this.textEndpoint : this.endpointTrace;

    if (this.instNameTrace !== 'All') {
      instanceId = btoa(this.instNameTrace);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    if (endpointValue !== 'All') {
      endpointId = btoa(endpointValue);
      endpointId = `${this.entityId}_${endpointId}`;
    } else {
      endpointId = this.entityId!;
    }

    const params: {
      serviceId: string;
      st: number;
      et: number;
      page?: number;
      sortBy?: string;
      instanceId?: string;
      traceState?: number;
      endpointId?: string;
      traceId?: string;
      minTraceDuration?: number;
      maxTraceDuration?: number;
    } = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }

    if (endpointId !== this.entityId) {
      params.endpointId = endpointId;
    }

    if (this.traceState === 'success') {
      params.traceState = 0;
    } else if (this.traceState === 'error') {
      params.traceState = 1;
    }

    if (this.traceIDTrace) {
      params.traceId = this.traceIDTrace;
    }

    if (this.currentPageTrace) {
      params.page = this.currentPageTrace;
    }

    if (this.sortParameter) {
      params.sortBy = this.sortParameter;
    }

    if (this.minDuration) {
      params.minTraceDuration = this.minDuration;
    }

    if (this.maxDuration) {
      params.maxTraceDuration = this.maxDuration;
    }

    this.apmApiService.getTracesData(
      params.serviceId,
      params.st,
      params.et,
      params.page,
      params.sortBy,
      this.orderParameter,
      params.instanceId || undefined,
      params.traceState,
      params.endpointId || undefined,
      params.traceId || undefined,
      params.minTraceDuration || undefined,
      params.maxTraceDuration || undefined,
    ).pipe(
      switchMap(data => from(this.decoderService.decodeObject(data))),
      takeUntil(this.destroy$)
    ).subscribe((data: any) => {
      this.traceNames = data;
      if (this.traceNames.length > 0) {
        this.selectItem(this.traceNames[0]);
      }
      this.getTraceSegmentsCount();
      this.loadingTrace = false;
    });
  }

  getTraceSegmentsCount(): void {
    const sdt = +this.traceStartTime;
    const edt = +this.traceEndTime;
    let instanceId = '';
    let endpointId = '';
    const endpointValue = this.textEndpoint?.trim() ? this.textEndpoint : this.endpointTrace;
    if (this.instNameTrace !== 'All') {
      instanceId = btoa(this.instNameTrace);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }
    if (endpointValue !== 'All') {
      endpointId = btoa(endpointValue);
      endpointId = `${this.entityId}_${endpointId}`;
    } else {
      endpointId = this.entityId!;
    }
    let params: {
      serviceId: string;
      st: number;
      et: number;
      instanceId?: string;
      traceState?: number;
      endpointId?: string;
      traceId?: string;
      minTraceDuration?: number;
      maxTraceDuration?: number;
    } = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };
    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }
    if (endpointId !== this.entityId) {
      params.endpointId = endpointId;
    }
    if (this.traceState === 'success') {
      params.traceState = 0;
    } else if (this.traceState === 'error') {
      params.traceState = 1;
    }
    if (this.traceIDTrace) {
      params.traceId = this.traceIDTrace;
    }
    if (this.minDuration) {
      params.minTraceDuration = this.minDuration;
    }
    if (this.maxDuration) {
      params.maxTraceDuration = this.maxDuration;
    }
    this.apmApiService.getTraceSegmentsCount(
      params.serviceId,
      params.st,
      params.et,
      params.instanceId || undefined,
      params.traceState,
      params.endpointId || undefined,
      params.traceId || undefined,
      params.minTraceDuration || undefined,
      params.maxTraceDuration || undefined,
    ).pipe(takeUntil(this.destroy$)).subscribe(
      (data: any) => {
        this.totalHitsTrace = data;
        this.calculateTracePagination();
      }
    );
  }

  calculateTracePagination(): void {
    this.totalPagesTrace = Math.ceil(this.totalHitsTrace / this.rowsPerPageTrace);
  }

  previousTracePage(): void {
    if (this.currentPageTrace > 1) {
      this.currentPageTrace--;
      this.fetchTraceData();
    }
  }

  nextTracePage(): void {
    if (this.currentPageTrace < this.totalPagesTrace) {
      this.currentPageTrace++;
      this.fetchTraceData();
    }
  }

  goToTracePage(page: number): void {
    this.currentPageTrace = page;
    this.fetchTraceData();
  }

  get traceItemRange(): string {
    if (this.totalHitsTrace === 0) return '0/0';
    const start = (this.currentPageTrace - 1) * this.rowsPerPageTrace + 1;
    const end = Math.min(this.currentPageTrace * this.rowsPerPageTrace, this.totalHitsTrace);
    return `${end}/${this.totalHitsTrace}`;
  }

  get totalTracePagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];

    if (this.totalPagesTrace <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesTrace }, (_, i) => i + 1);
    } else {
      if (this.currentPageTrace <= visiblePages) {
        pages = [
          ...Array.from({ length: visiblePages }, (_, i) => i + 1),
          '...',
          this.totalPagesTrace
        ];
      } else if (this.currentPageTrace >= this.totalPagesTrace - visiblePages + 1) {
        pages = [
          1,
          '...',
          ...Array.from(
            { length: visiblePages },
            (_, i) => this.totalPagesTrace - visiblePages + i + 1
          )
        ];
      } else {
        pages = [
          1,
          '...',
          this.currentPageTrace - 1,
          this.currentPageTrace,
          this.currentPageTrace + 1,
          '...',
          this.totalPagesTrace
        ];
      }
    }
    return pages;
  }

  toggleSort(column: 'start_time' | 'duration' | 'isError') {
    if (this.sortParameter === column) {
      this.orderParameter = this.orderParameter === 'asc' ? 'dec' : 'asc';
    } else {
      this.sortParameter = column;
      this.orderParameter = 'asc';
    }
    this.fetchTraceData();
  }

  formatEndpointId(endpointId: string): string {
    if (!endpointId) return '';
    if (/^[A-Za-z0-9+/=]+$/.test(endpointId) && endpointId.length % 4 === 0) {
      try {
        const decoded = atob(endpointId);
        endpointId = decoded;
      } catch (err) {
        console.warn('Base64 decode failed:', err);
      }
    }
    const [method] = endpointId.split(':', 2);
    const m = method?.toUpperCase();
    const httpMethods = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);
    if (httpMethods.has(m)) {
      return m;
    }
    return '';
  }

  copyTraceId(traceId: string | null, event: MouseEvent) {
    event.stopPropagation();
    if (!traceId) return;
    const textarea = document.createElement('textarea');
    textarea.value = traceId;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      this.snackBar.open('Trace ID copied!', '', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
    } catch (err) {
      console.error('Fallback: Could not copy text', err);
    }
    document.body.removeChild(textarea);
  }

  searchTrace(): void {
    this.currentPageTrace = 1;
    this.fetchTraceData();
  }

  cancelCustomEndpoint(): void {
    this.textEndpoint = '';
    this.endpointTrace = 'All';
  }

  clearSelection(): void {
    this.selectedItem = null;
    this.selectedTraceId = null;
    this.hierarchicalList = [];
    this.traceMetaData = [];
    this.traceData = [];

  }

  selectItem(item: any): void {
    if (item) {
      this.clearSelection();
      this.selectedItem = this.decodeBase64(item.endpointId);
      this.selectedTraceId = item.traceId;
      this.selectedView = "table"
      this.fetchTraceDataList(item.traceId);
    } else {
      this.clearSelection();
    }
  }

  fetchTraceDataList(traceId: string): void {
    this.apmApiService.getTraceMetaData(traceId).pipe(takeUntil(this.destroy$)).pipe(takeUntil(this.destroy$)).subscribe(
      (response: any) => {
        const spans = response || [];
        this.traceMetaData = response || [];
        this.traceData = JSON.parse(JSON.stringify(spans));
        this.hierarchicalList = this.buildHierarchicalList(spans);
      },
      error => {
        console.log("Error Occured!");
      }
    );
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


  decodeBase64(encoded: string): string {
    try {
      return atob(encoded);
    } catch (e) {
      console.error('Error decoding base64:', e);
      return encoded;
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

  fetchTraceDataTable(traceId: string): void {
    this.apiApm.getTraceMetaData(traceId).subscribe(
      (response: any) => {
        this.traceMetaData = response || [];
      },
      error => {
        console.error('Error fetching trace metadata:', error);
      }
    );
  }

  getSortParameter(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.sortParameter = selectedValue as 'start_time' | 'duration';
    this.fetchTraceData();
  }

  getOrderParameter(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.orderParameter = selectedValue as 'asc' | 'dec';
    this.fetchTraceData();
  }

  formatTimeBucket(timeBucket: any): string {
    const timeString = timeBucket.toString();
    return `${timeString.substring(0, 4)}-${timeString.substring(4, 6)}-${timeString.substring(6, 8)} ${timeString.substring(8, 10)}:${timeString.substring(10, 12)}:${timeString.substring(12, 14)}`;
  }

  openViewLogs() {
    this.sharedService.selectTraceId(this.selectedTraceId);
    const logTab = document.querySelector('.nav-link[href="#log"]') as HTMLElement;
    if (logTab) {
      logTab.click();
    }
    this.closeMainModal();
  }

  changeView(view: 'list' | 'tree' | 'table' | 'stat'): void {
    this.selectedView = view;
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

  onListItemSelected(item: any): void {
    this.openModal(item);
  }

  closeModal(): void {
    this.showModal = false;
    this.modalData = null;
  }

}
