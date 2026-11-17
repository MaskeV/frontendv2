import { ApplicationRef, Component, Input } from '@angular/core';
import { TraceDetailsModalComponent } from "../../trace-details-modal/trace-details-modal.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { from, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { Span } from '../../../../../../models/traceData';
import { DateService } from '../../../../../../services/date.service';
import { ApmApiService } from '../../../../../../services/apm-api.service';
import { SharedService } from '../../../../../../services/shared.service';
import { DecoderService } from '../../../../../../services/decoder.service';
import { TableViewComponent } from "../../table-view/table-view.component";
import { ListViewComponent } from "../../list-view/list-view.component";
import { TreeViewComponent } from "../../tree-view/tree-view.component";
import { StatViewComponent } from "../../stat-view/stat-view.component";

@Component({
    selector: 'app-instance-trace-modal',
    imports: [TraceDetailsModalComponent, FormsModule, CommonModule, TableViewComponent, ListViewComponent, TreeViewComponent, StatViewComponent],
    templateUrl: './instance-trace-modal.component.html',
    styleUrl: './instance-trace-modal.component.css'
})
export class InstanceTraceModalComponent {
  @Input() xValue: number | undefined;
  @Input() yValue: number | undefined;
  @Input() allYValues: any | undefined;
  isVisible: boolean = false;
  startdateTime: string = '';
  enddateTime: string = '';
  timeDifference: string = '';
  formattedXValue: string = '';
  step: string = '';
  serviceId: string = '';
  serviceName: string = '';
  subscriptions: Subscription = new Subscription();
  traceStartTime: string = '';
  traceEndTime: string = '';
  minDuration: string = '';
  maxDuration: string = '';
  rowsPerPage = 20;
  currentPage = 1;
  totalPages: number = 0;
  visiblePageNumbers: number[] = [];
  maxVisiblePages = 3;
  traceMetaData: any[] = [];
  traceMetaDataTree: any = {};
  hierarchicalList: any[] = [];
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
  public traceData: Array<Span> = [];
  sortParameter: 'start_time' | 'duration' = 'start_time';
  orderParameter: 'asc' | 'dec' = 'dec';
  selectedView: 'list' | 'tree' | 'table' | 'stat' = 'table';
  tableData: { endpointId: string, startTime: number, timeBucket: string, isError: number, traceId: string, instance: string, latency: number }[] = [];
  filteredData: { endpointId: string, startTime: number, timeBucket: string, isError: number, traceId: string, instance: string }[] = [];
  paginatedData: { endpointId: string, startTime: number, timeBucket: string, isError: number, traceId: string, instance: string,  latency?: any }[] = [];
  searchQuery: string = '';
  selectedItem: string | null = null;
  selectedTraceId: string | null = null;
  selectedLatency: string | null = null;
  showDropdown: boolean = false;
  endpoint: string = 'All';
  endpoints: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];
  status: string = '';
  traceID!: string;
  selectedService!: string;
  entityId!: string;
  private destroy$ = new Subject<void>();
  ServiceInstanceNames: string[] = [];
  selectedServiceInstance!: string;
  selectedServiceId!: string;
  entityInstanceId!: string;

  constructor(
    private dateService: DateService,
    private apmApi: ApmApiService,
    private appRef: ApplicationRef,
    private sharedService: SharedService,
    private decoderService: DecoderService,
  ) { }

  ngOnInit(): void {

    const storedServiceId = sessionStorage.getItem('SelectedServiceId');
    this.serviceId = storedServiceId ? btoa(storedServiceId) + '.1' : '';

    this.selectedServiceInstance = sessionStorage.getItem('SelectedServiceInstance')!;
    this.selectedServiceId = sessionStorage.getItem('SelectedServiceId')!;


    this.entityId = sessionStorage.getItem('encodedEntityIDForServices')!;
    // this.service = atob((sessionStorage.getItem('encodedEntityIDForServices')).substring(0, (sessionStorage.getItem('encodedEntityIDForServices')).length - 2));

    let encodedSelectedServiceId = btoa(this.selectedServiceId) + '.1';
    let encodedSelectedServiceInstance = btoa(this.selectedServiceInstance);

    this.entityInstanceId = encodedSelectedServiceId + '_' + encodedSelectedServiceInstance;

    // this.entityId =  sessionStorage.getItem('encodedEntityIDForServices');

    this.subscriptions.add(
      this.sharedService.selectedTraceId$.subscribe(traceId => {
        if (traceId) {
          this.traceID = traceId;
          this.fetchTraceData();
        }
      })
    );

    this.dateService.date$.subscribe(dates => {
      let { startdateTime, enddateTime } = dates;

      startdateTime += '00'; // Adding seconds to startdateTime
      enddateTime += '59'; // Adding seconds to enddateTime

      this.startdateTime = startdateTime;
      this.enddateTime = enddateTime;

      const differenceInSeconds = this.calculateTimeDifference(startdateTime, enddateTime);
      this.timeDifference = `${differenceInSeconds} seconds`;

      this.step = this.calculateStep(differenceInSeconds);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }

  //Min Duration

  openMinDurationModal(x: number, y: number) {
    this.xValue = x;
    this.formattedXValue = this.epochToFormattedDate(x);
    // this.yValue = y;
    this.yValue = Math.trunc(y);
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

    this.fetchData();
  }

  //No Duration

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

    this.fetchData();
  }

  openSuccessRateModal(x: number, y: number) {
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

    this.fetchData();
  }

  closeMainModal() {
    this.isVisible = false;
  }

  private calculateTimeDifference(start: string, end: string): number {
    const startDateTime = this.convertToEpoch(start);
    const endDateTime = this.convertToEpoch(end);

    const differenceInMs = endDateTime - startDateTime;
    return Math.floor(differenceInMs / 1000);
  }

  private convertToEpoch(dateTime: string): number {
    const year = parseInt(dateTime.substring(0, 4), 10);
    const month = parseInt(dateTime.substring(4, 6), 10) - 1; // Months are 0-based
    const day = parseInt(dateTime.substring(6, 8), 10);
    const hours = parseInt(dateTime.substring(8, 10), 10);
    const minutes = parseInt(dateTime.substring(10, 12), 10);
    const seconds = parseInt(dateTime.substring(12, 14), 10);

    return new Date(Date.UTC(year, month, day, hours, minutes, seconds)).getTime();
  }

  private epochToFormattedDate(epoch: number): string {
    const date = new Date(epoch);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
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

  fetchTraceData(): void {
    this.clearSelection();

    this.entityId = sessionStorage.getItem('encodedEntityIDForServices')!;

    const sdt = this.traceStartTime;
    const edt = this.traceEndTime;

    let instanceId = this.entityInstanceId;

    let params: {
      serviceId: string;
      st: number;
      et: number;
      instanceId?: string;
      traceState?: number;
      minTraceDuration?: number;
    } = {
      serviceId: this.entityId,
      st: +sdt,
      et: +edt
    };

    if (this.status) {
      params.traceState = this.status === 'success' ? 0 : 1;
    }

    // Only set minTraceDuration if yValue is defined
    if (this.yValue !== undefined) {
      params.minTraceDuration = this.yValue;
    }

    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }

    this.apmApi.getTracesData(
      params.serviceId,
      params.st,
      params.et,
      this.currentPage,
      this.sortParameter,
      this.orderParameter,
      params.instanceId || undefined,
      params.traceState !== undefined ? params.traceState : undefined,
      this.searchQuery && this.searchQuery.startsWith('/') ? this.searchQuery : undefined,
      this.searchQuery && !this.searchQuery.startsWith('/') ? this.searchQuery : undefined,
      params.minTraceDuration
    ).pipe(switchMap(data => from(this.decoderService.decodeObject(data))),takeUntil(this.destroy$)).subscribe(
      data => {
        this.tableData = data;
        this.filteredData = data;
        this.calculateTotalPages();
        this.updatePaginatedData();


        if (this.paginatedData.length > 0) {
          this.selectItem(this.paginatedData[0]);
        } else {
          this.clearSelection();
        }
      },
      error => {
        console.error('Error fetching trace data:', error);
        this.clearSelection();
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

  updatePaginatedData(): void {
    this.paginatedData = this.filteredData;
  }

  calculateTotalPages(): void {
    const totalItems = this.filteredData.length;
    const itemsPerPage = this.rowsPerPage;

    if (totalItems === itemsPerPage) {
      this.totalPages = this.currentPage + 1;
    } else {
      this.totalPages = this.currentPage;
    }
    this.updateVisiblePageNumbers();
  }

  updateVisiblePageNumbers(): void {
    const startPage = Math.max(1, this.currentPage - Math.floor(this.maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages, startPage + this.maxVisiblePages - 1);

    this.visiblePageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      this.visiblePageNumbers.push(i);
    }

    // Ensure no duplication and display the correct sequence up to totalPages
    if (endPage < this.totalPages) {
      for (let i = endPage + 1; i <= Math.min(this.totalPages, endPage + this.maxVisiblePages); i++) {
        this.visiblePageNumbers.push(i);
      }
    }
  }

  changePage(page: number): void {
    if (page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchTraceData();


      if (this.paginatedData.length > 0) {
        this.selectItem(this.paginatedData[0]);
      } else {
        this.clearSelection();
        this.appRef.tick();
      }
    }
  }

  openViewLogs() {
    this.sharedService.selectTraceId(this.selectedTraceId);
    const logTab = document.querySelector('.nav-link[href="#instanceLogs"]') as HTMLElement;
    if (logTab) {
      logTab.click();
    }
    this.closeMainModal();
  }

  fetchData(): void {
    this.currentPage = 1;
    this.fetchTraceData();
  }

  selectItem(item: any): void {
    if (item) {
      this.clearSelection();
      this.selectedItem = this.decodeBase64(item.endpointId);
      this.selectedTraceId = item.traceId;
      this.selectedLatency = item.latency;
      this.fetchTraceDataList(item.traceId);
      this.fetchTraceDataTable(item.traceId);
    } else {
      this.clearSelection();
    }
  }

  search(): void {
    this.clearSelection();
    this.currentPage = 1;
    this.sortParameter
    this.orderParameter
    this.fetchTraceData();
    setTimeout(() => {
      if (this.paginatedData.length > 0) {
        this.selectItem(this.paginatedData[0]);
      } else {
        this.clearSelection();
      }
    }, 5000);
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

  formatTimeBucket(timeBucket: any): string {
    const timeString = timeBucket.toString();
    return `${timeString.substring(0, 4)}-${timeString.substring(4, 6)}-${timeString.substring(6, 8)} ${timeString.substring(8, 10)}:${timeString.substring(10, 12)}:${timeString.substring(12, 14)}`;
  }

  clearSelection(): void {
    this.selectedItem = null;
    this.selectedTraceId = null;
    this.selectedLatency = null;
    this.hierarchicalList = [];
    this.traceMetaData = [];
    this.traceData = [];
    this.showModal = false;
  }


  changeView(view: 'list' | 'tree' | 'table' | 'stat'): void {
    this.selectedView = view;
  }

  fetchTraceDataList(traceId: string): void {
    this.apmApi.getTraceMetaData(traceId).pipe(takeUntil(this.destroy$)).subscribe(
      (response: any) => {
        const spans = response || [];
        this.traceData = JSON.parse(JSON.stringify(spans));
        this.hierarchicalList = this.buildHierarchicalList(spans);
      },
      error => {
        console.error('Error fetching trace metadata:', error);
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
    this.apmApi.getTraceMetaData(traceId).pipe(takeUntil(this.destroy$)).subscribe(
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
}
