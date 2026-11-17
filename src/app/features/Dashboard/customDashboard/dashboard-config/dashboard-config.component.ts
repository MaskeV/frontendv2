import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as Highcharts from 'highcharts';
import { ApplicationService } from '../../../../services/application.service';
import { Session } from '../../../../models/session';
import { User } from '../../../../models/user';
import { LoggerService } from '../../../../services/logger.service';
import { DecoderService } from '../../../../services/decoder.service';
import { Router } from '@angular/router';
import { DashboardApiService } from '../../../../services/dashboard-api.service';
import { filter, from, Subject, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticationService } from '../../../../services/authentication.service';
import { RoleService } from '../../../../services/role.service';
import { Product } from '../../../../models/Role';

import 'highcharts/modules/heatmap';
import 'highcharts/modules/tilemap';
import 'highcharts/modules/funnel';
import { ApmApiService } from '../../../../services/apm-api.service';
import { InfraService } from '../../../../services/infra.service';
import { DashboardRefreshService } from '../../../../services/dashboard-refresh.service';
import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../services/sanitization.service';
import { CustomDashboardThemeService } from '../custom-dashboard-theme.service';

@Component({
  selector: 'app-dashboard-config',
  imports: [CommonModule, FormsModule, SanitizeInputDirective],
  templateUrl: './dashboard-config.component.html',
  styleUrl: './dashboard-config.component.css'
})
export class DashboardConfigComponent implements OnInit, OnDestroy {
  @Input() editWidget: any = null;

  Highcharts: typeof Highcharts = Highcharts;

  user = new User();
  currentUser: User = new User();
  sessionObject: Session = new Session();

  destroy$ = new Subject<void>();

  startTime: any;
  endTime: any;

  graphTypes = [
    { id: 'spline', label: 'Spline Chart', icon: 'fa-chart-line' },
    { id: 'column', label: 'Column Chart', icon: 'fa-chart-column' },
    { id: 'bar', label: 'Bar Chart', icon: 'fa-chart-bar' },
    { id: 'area', label: 'Area Chart', icon: 'fa-chart-area' },
    { id: 'stackedColumn', label: 'Stacked Column', icon: 'fa-chart-column' },
    { id: 'stackedArea', label: 'Stacked Area', icon: 'fa-chart-area' },
    { id: 'scatter', label: 'Scatter Chart', icon: 'fa-braille' },
    // { id: 'funnel', label: 'Funnel Chart', icon: 'fa-filter' },
    { id: 'table', label: 'Table View', icon: 'fa-table' },
    { id: 'numeric', label: 'KPI', icon: 'fa-hashtag' },
    { id: 'hexagonal', label: 'Hexagon Tiles', icon: 'fa-hexagon-nodes' }
  ];
  selectedGraph = this.graphTypes[0];

  chartsMetricsData: any[] = [];

  selectedMetricIds: string[] = [];
  selectedMetric: string[] = [];
  selectedMetricName: string[] = [];
  selectedMetricLabel = '';
  categories: string[] = [];
  metricsData: Record<string, { id: string, label: string, value: string[], metricTableName: any; }[]> = {};
  selectedCategory = '';

  showApplicationDropdown = false;
  applicationNames: any[] = [];
  selectedApplication: any = [];

  endpointNames: string[] = [];
  selectedEndpoints: string[] = [];
  showEndpointDropdown = false;
  endpointLoading = false;

  processList: string[] = [];
  selectedProcess = '';
  showProcessDropdown = false;
  processLoading = false;

  numericOperations = ['min', 'max', 'avg'];
  selectedOperation = 'avg';
  numericData: { name: string, value: any, downApps?: number, totalApps?: number }[] = [];
  selectedNumericItem: any = null;
  tableData: any;
  hasEntityData = false;
  metrics: string[] = [];
  objectEntries = Object.entries;

  showMetricPanel = false;
  showGraphDropdown = false;
  showResult = false;

  dashboards: any[] = [];
  selectedDashboardId: any;

  showPinModal = false;
  pinTitle = 'Chart Name';

  showCreateModal = false;
  newDashboardName = '';
  isPublicDashboard: boolean = false;

  chartCategories: string[] = [];
  chartDataStore: { name: string, data: number[] }[] = [];

  chartUnit: any;

  get isProcessMetric(): boolean {
    return this.selectedMetricName?.some(m =>
      m === 'linux_process_details' || m === 'windows_process_details'
    ) ?? false;
  }

  private get processHostType(): string {
    return this.selectedMetricName?.includes('windows_process_details') ? 'windows' : 'linux';
  }

  get isEditMode(): boolean {
    return !!this.editWidget;
  }

  get isEndpointDetailsMetric(): boolean {
    return this.selectedMetricName?.some(m => m === 'endpoint_details') ?? false;
  }

  get isTraceCountMetric(): boolean {
    return this.selectedMetricName?.some(m => m === 'service_traces_status_code') ?? false;
  }

  // True whenever the selected metric is endpoint-based (regardless of chart type)
  get isEndpointMetricBase(): boolean {
    return this.selectedMetricName?.some(m => m.startsWith('endpoint_')) ?? false;
  }

  get isInstanceMetricBase(): boolean {
    return this.selectedMetricName?.some(m => m.startsWith('service_instance_')) ?? false;
  }

  // Keep existing — used for encoding logic in runQuery (chart-type-aware)
  get isEndpointMetric(): boolean {
    return this.isEndpointMetricBase && this.selectedGraph.id !== 'table';
  }

  // New: single-select application for endpoint metrics in table mode
  get isEndpointTableMetric(): boolean {
    return this.isEndpointMetricBase && this.selectedGraph.id === 'table';
  }

  get isInstanceTableMetric(): boolean {
    return this.isInstanceMetricBase && this.selectedGraph.id === 'table';
  }

  xAxisDataLabel: string = '';
  yAxisDataLabel: string = '';
  legendEnable: boolean = false;
  legendAlign: 'left' | 'right' | 'bottom' = 'bottom';

  constructor(
    private authService: AuthenticationService,
    private applicationService: ApplicationService,
    private dashboardApiService: DashboardApiService,
    private roleService: RoleService,
    private loggerService: LoggerService,
    private decoderService: DecoderService,
    private router: Router,
    private dateService: DateService,
    private snackBar: MatSnackBar,
    private apmApiService: ApmApiService,
    private infraService: InfraService,
    private dashboardRefreshService: DashboardRefreshService,
    private sanitizationService: SanitizationService,
    public themeService: CustomDashboardThemeService,
  ) {
    this.authService.currentUser.subscribe(
      x => this.currentUser = x || new User()
    );
  }

  ngOnInit() {
    this.user = this.decoderService.decryptJson(
      JSON.parse(sessionStorage.getItem('currentUser')!)
    ) as User;

    this.sessionObject.featureName = 'Custom Dashboard';
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');

    const browser = this.loggerService.getBrowserNameAndVersion();
    this.sessionObject.browserName = browser.name;
    this.sessionObject.browserVersion = browser.version;

    this.currentUser.sessionDTO = this.sessionObject;

    this.dateService.setActiveComponent('DashboardConfigComponent');

    this.dateService.activeComponent$.pipe(
      filter(c => c === 'DashboardConfigComponent'),
      switchMap(() => this.dateService.date$),
      takeUntil(this.destroy$)
    ).subscribe(d => {
      this.startTime = this.formatDate(d.startdateTime);
      this.endTime = this.formatDate(d.enddateTime);
    });

    this.fetchProductsAndFeatures();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['editWidget'] && this.editWidget) {
      this.populateEditMode(this.editWidget);
    }
    // clear form when editWidget is set to null (panel closed)
    if (changes['editWidget'] && !this.editWidget) {
      this.resetForm();
    }
  }

  formatDate(date: string) {
    return Number(date.replace(/[-:\s]/g, ''));
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1;
    const day = bucket.length >= 8 ? +bucket.slice(6, 8) : 0;

    const hour = bucket.length >= 10 ? +bucket.slice(8, 10) : 0;
    const minute = bucket.length >= 12 ? +bucket.slice(10, 12) : 0;

    return new Date(year, month, day, hour, minute);
  }

  formatTime(value: string | number): string {
    if (!value) return '';
    const v = value.toString();
    const year = v.slice(0, 4);
    const month = v.slice(4, 6);
    const day = v.slice(6, 8);
    if (v.length === 12) {
      const hour = v.slice(8, 10);
      const minute = v.slice(10, 12);
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
    if (v.length === 10) {
      const hour = v.slice(8, 10);
      return `${year}-${month}-${day} ${hour}:00`;
    }
    if (v.length === 8) {
      return `${year}-${month}-${day}`;
    }
    return v;
  }

  showSnack(message: string) {
    this.snackBar.open(message, '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /* METRICS */

  availableProducts: Product[] = [];

  fetchProductsAndFeatures() {
    if (this.user) {
      const userId = this.user.userId;
      const userType = this.user.userType;

      this.roleService.findProducts(userId, userType).subscribe({
        next: (response: any) => {
          if (response && response.products) {
            this.availableProducts = response.products;
            this.getMetrics();
          }
        },
        error: (error) => {
          console.error('Error fetching products and features:', error);
        }
      });
    }
  }

  getMetrics() {
    this.dashboardApiService.getMetrics(this.selectedGraph.id).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.chartsMetricsData = data
          this.getMetricsGroupedByType();
        },
        error: (err) => {
          console.log("Error Occurred", err)
        }
      });
  }

  normalizeProduct(value: string): string {
    return value?.toUpperCase().replace(/[\s_-]/g, '');
  }

  getMetricsGroupedByType() {
    if (!this.availableProducts || this.availableProducts.length === 0) {
      this.categories = [];
      this.metricsData = {};
      return;
    }

    const productSet = new Set(
      this.availableProducts.map(p => this.normalizeProduct(p))
    );

    const source = Array.isArray(this.chartsMetricsData) ? this.chartsMetricsData : [];

    const filteredData = source.filter(x =>
      productSet.has(this.normalizeProduct(x.appType))
    );

    this.categories = filteredData.map(x => x.type);
    this.metricsData = Object.fromEntries(
      filteredData.map(x => [x.type, x.metrics])
    );

    // ── Reconcile metric immediately if in edit mode ──
    if (this._pendingMetricKey) {
      const allKeys = this._pendingAllMetricKeys?.length
        ? this._pendingAllMetricKeys
        : [this._pendingMetricKey];

      // Find the category that actually contains the metric
      const matchingCategory = this.categories.find(cat =>
        this.metricsData[cat]?.some(m =>
          allKeys.some(k => m.metricTableName.includes(k))
        )
      );

      if (matchingCategory) {
        this.selectedCategory = matchingCategory;

        const matches = this.metricsData[matchingCategory].filter(m =>
          allKeys.some(k => m.metricTableName.includes(k))
        );

        if (matches.length) {
          this.selectedMetric = matches.flatMap(m => m.value);
          this.selectedMetricName = matches.flatMap(m => m.metricTableName);
          this.selectedMetricIds = matches.map(m => (m as any).id);
          this.selectedMetricLabel = matches.map(m => m.label).join(', ');
          this._pendingMetricKey = '';
          this._pendingAllMetricKeys = [];
        }
      } else {
        this.selectedCategory = this.categories[0];
      }
    } else {
      this.selectedCategory = this.categories[0];
    }

    this.getAllAppListByUserID();
  }

  selectCategory(category: string) {
    this.showResult = false;
    this.selectedCategory = category;
    // Reset process state when category changes
    this.processList = [];
    this.selectedProcess = '';
    this.getAllAppListByUserID();
  }

  selectMetric(metric: any) {
    this.showResult = false;
    this.selectedMetric = metric.value;
    this.selectedMetricName = metric.metricTableName;
    this.selectedMetricIds = [metric.id];
    this.selectedMetricLabel = metric.label;
    this.selectedApplication = [];
    this.selectedEndpoints = [];
    this.endpointNames = [];
    this.processList = [];
    this.selectedProcess = '';
    this.showMetricPanel = false;
  }

  toggleMetric(item: any) {
    const metric = item.value[0];
    const name = item.metricTableName[0];
    const exists = this.selectedMetric.includes(metric);

    if (exists) {
      this.selectedMetric = this.selectedMetric.filter(x => x !== metric);
      this.selectedMetricName = this.selectedMetricName.filter(y => y !== name);
      this.selectedMetricIds = this.selectedMetricIds.filter(id => id !== item.id);
    } else {
      this.selectedMetric.push(metric);
      this.selectedMetricName.push(name);
      this.selectedMetricIds.push(item.id);
    }
    this.selectedMetricLabel =
      this.metricsData[this.selectedCategory]
        .filter(x => this.selectedMetric.includes(x.value[0]))
        .map(x => x.label)
        .join(', ');
    this.selectedApplication = [];
  }

  isMetricSelected(value: string[]): boolean {
    return this.selectedMetric.includes(value[0]);
  }

  getAllAppListByUserID() {
    const userId = this.user?.userId;
    const category = this.selectedCategory;

    if (!userId || !category) return;

    const matched = this.chartsMetricsData.find(x => x.type === category);
    const appType = matched?.appType;

    if (!appType) return;

    if (category === appType) {
      this.applicationService
        .getFullApplicationData(userId, appType, this.sessionObject)
        .subscribe(this.handleResponse);
    } else {
      this.applicationService
        .getFullApplicationData(userId, appType, this.sessionObject, category)
        .subscribe(this.handleResponse);
    }
  }

  isAppSelected(app: any): boolean {
    if (!Array.isArray(this.selectedApplication)) {
      this.selectedApplication = [];
    }
    return this.selectedApplication.some(
      (a: any) => a.applicationId === app.applicationId
    );
  }

  toggleApplication(app: any) {
    if (!Array.isArray(this.selectedApplication)) {
      this.selectedApplication = [];
    }
    const index = this.selectedApplication.findIndex(
      (a: any) => a.applicationId === app.applicationId
    );
    if (index > -1) {
      this.selectedApplication.splice(index, 1);
    } else {
      this.selectedApplication.push(app);
    }
    this.selectedApplication = [...this.selectedApplication];
  }

  selectAllApplications(): void {
    this.selectedApplication = [...this.applicationNames];
  }

  deselectAllApplications(): void {
    this.selectedApplication = [];
  }

  handleResponse = {
    next: (res: any) => {
      const data =
        this.selectedCategory === 'Linux' || this.selectedCategory === 'Windows'
          ? (res?.serviceResponse?.ipList || []).filter(
            (item: any) => item.ipType?.toUpperCase() === this.selectedCategory.toUpperCase()
          )
          : (res?.serviceResponse?.applications || []);

      this.applicationNames = data;

      // ── Reconcile metric ──────────────────────────────────────────────────
      if (this._pendingMetricKey && this.metricsData[this.selectedCategory]) {
        const allKeys = this._pendingAllMetricKeys?.length
          ? this._pendingAllMetricKeys
          : [this._pendingMetricKey];

        const matches = this.metricsData[this.selectedCategory].filter(m =>
          allKeys.some(k => m.value.includes(k))
        );

        if (matches.length) {
          this.selectedMetric = matches.flatMap(m => m.value);
          this.selectedMetricName = matches.flatMap(m => m.metricTableName);
          this.selectedMetricIds = matches.map(m => (m as any).id);
          this.selectedMetricLabel = matches.map(m => m.label).join(', ');
          this._pendingMetricKey = '';
          this._pendingAllMetricKeys = [];
        }
      }

      // ── Reconcile applications ────────────────────────────────────────────
      if (this._pendingAppNames.length) {
        const matched = this.applicationNames.filter((a: any) => {
          // Check ALL possible name fields — order must not matter
          const candidates = [
            a.applicationName,
            a.ipAddress,
            a.applicationId,
          ].filter(Boolean);
          return candidates.some(c => this._pendingAppNames.includes(c));
        });

        if (matched.length) {
          this.selectedApplication = matched;
          this._pendingAppNames = [];

          // ── Reconcile entity (endpoints or process) ───────────────────────
          if (this._pendingEntity.length && this.selectedApplication.length) {
            if (this.isProcessMetric) {
              this.selectedProcess = this._pendingEntity[0] || '';
              this._pendingEntity = [];

            } else if (this.isEndpointMetric || this.isTraceCountMetric) {
              const app = this.selectedApplication[0];
              const entityId = btoa(app.applicationName || app.ipAddress) + '.1';
              this.endpointLoading = true;

              this.apmApiService
                .getEndpoint(entityId, this.startTime, this.endTime, -1, -1)
                .pipe(
                  switchMap(data => from(this.decoderService.decodeObject(data))),
                  takeUntil(this.destroy$)
                )
                .subscribe({
                  next: (epRes: any) => {
                    const key = Object.keys(epRes)[0];
                    this.endpointNames = key ? (epRes[key] as string[]) : [];
                    this.selectedEndpoints = this.endpointNames.filter(ep =>
                      this._pendingEntity.includes(ep)
                    );
                    this._pendingEntity = [];
                    this.endpointLoading = false;
                  },
                  error: () => {
                    this.endpointLoading = false;
                    this._pendingEntity = [];
                  }
                });
            } else {
              this._pendingEntity = [];
            }
          }
        }
      }
    },
    error: (err: any) => console.error(err)
  };

  selectSingleApplication(app: any) {
    this.selectedApplication = [app];
    this.selectedEndpoints = [];
    this.endpointNames = [];
    this.processList = [];
    this.selectedProcess = '';
    this.showResult = false;

    if (this.isProcessMetric) {
      this.fetchProcessList(app);
    } else if (this.isEndpointMetric || this.isEndpointDetailsMetric || this.isTraceCountMetric) {
      this.fetchEndpoints(app);
    }
  }

  // ── Process list ────────────────────────────────────────────────────────────

  /** Fetch the list of processes running on the selected host */
  fetchProcessList(app: any) {
    const ipAddress = app.ipAddress || app.applicationName;
    const serviceId = btoa(ipAddress) + '.1';
    const hostType = this.processHostType;

    this.processLoading = true;
    this.processList = [];

    this.infraService.getProcessList(serviceId, this.startTime, this.endTime, hostType).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list: any) => {
          this.processList = Array.isArray(list) ? list : [];
          this.processLoading = false;
        },
        error: () => {
          this.processList = [];
          this.processLoading = false;
        }
      });
  }

  selectProcess(processName: string) {
    this.selectedProcess = processName;
    this.showProcessDropdown = false;
    this.showResult = false;
  }

  // ── Endpoint helpers (unchanged) ────────────────────────────────────────────

  fetchEndpoints(app: any) {
    const entityId = btoa(app.applicationName || app.ipAddress) + '.1';
    this.endpointLoading = true;
    this.endpointNames = [];

    this.apmApiService
      .getEndpoint(entityId, this.startTime, this.endTime, -1, -1)
      .pipe(switchMap(data => from(this.decoderService.decodeObject(data))), takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const key = Object.keys(res)[0];
          this.endpointNames = key ? (res[key] as string[]) : [];
          this.endpointLoading = false;
        },
        error: () => { this.endpointLoading = false; }
      });
  }

  isEndpointSelected(ep: string): boolean {
    return this.selectedEndpoints.includes(ep);
  }

  toggleEndpoint(ep: string) {
    const idx = this.selectedEndpoints.indexOf(ep);
    if (idx > -1) {
      this.selectedEndpoints.splice(idx, 1);
    } else {
      this.selectedEndpoints.push(ep);
    }
    this.selectedEndpoints = [...this.selectedEndpoints];
  }

  selectAllEndpoints() {
    this.selectedEndpoints = [...this.endpointNames];
  }

  deselectAllEndpoints() {
    this.selectedEndpoints = [];
  }

  /* RUN QUERY */

  runQuery() {
    this.showApplicationDropdown = false;
    this.showEndpointDropdown = false;
    this.showMetricPanel = false;
    this.showGraphDropdown = false;
    this.showProcessDropdown = false;

    if (!this.selectedMetricIds || !this.selectedApplication?.length) return;

    // ── PROCESS METRICS ──────────────────────────────────────────────────────
    if (this.isProcessMetric) {
      if (!this.selectedProcess) return;

      const app = this.selectedApplication[0];
      const ipAddress = app.ipAddress || app.applicationName;
      const serviceId = btoa(ipAddress) + '.1';
      const hostType = this.processHostType;

      this.infraService.getProcessDetailsTimeSeries(serviceId, this.startTime, this.endTime, this.selectedProcess, undefined, undefined, hostType)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: any) => {

            if (!Array.isArray(data) || !data.length) {
              this.showResult = true;
              return;
            }

            this.chartCategories = data.map((x: any) => {
              const d = this.parseTimeBucket(x.time_bucket.toString());
              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            });

            this.chartDataStore = [
              {
                name: `${this.selectedProcess} - CPU %`,
                data: data.map((x: any) => x.cpu_percent ?? null)
              },
              {
                name: `${this.selectedProcess} - Memory %`,
                data: data.map((x: any) => x.memory_percent ?? null)
              }
            ];

            this.chartUnit = '%';
            this.showResult = true;

            setTimeout(() => this.renderChart(), 50);
          },
          error: () => { this.showResult = true; }
        });

      return;
    }

    // ── ENDPOINT METRICS ────────────────────────────────────────────────────
    let encodedCategory: string;

    if (this.isEndpointMetric || this.isEndpointDetailsMetric || this.isTraceCountMetric) {
      if (!this.selectedEndpoints?.length) return;

      const app = this.selectedApplication[0];
      const appName = app.applicationName || app.ipAddress;
      const encodedApp = btoa(appName);

      encodedCategory = this.selectedEndpoints
        .map(ep => `${encodedApp}.1_${btoa(ep)}`)
        .join(',');
    } else {
      encodedCategory = this.selectedApplication
        .map((a: any) => btoa(a.ipAddress || a.applicationName) + '.1')
        .join(',');
    }

    if (this.selectedGraph.id === 'numeric') {
      this.dashboardApiService
        .getMetricNumericData(encodedCategory, this.selectedMetricIds, this.selectedOperation, this.startTime, this.endTime)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          this.numericData = res.map((x: any) => ({
            name: x.Application,
            value: x[Object.keys(x).find(k =>
              !['Application', 'logical_cores'].includes(k) && !k.endsWith('_unit')
            )!]
          }));

          this.selectedNumericItem = this.numericData[0];
          this.showResult = true;
        });

      return;
    }

    if (this.selectedGraph.id === 'hexagonal') {
      this.dashboardApiService
        .getMetricNumericData(encodedCategory, this.selectedMetricIds, this.selectedOperation, this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          this.numericData = res.map((x: any) => {
            if (x.linux_availability != null) {
              return {
                name: 'linux_availability',
                value: x.linux_availability,
                downApps: x.downApps,
                totalApps: x.totalApps
              };
            }
            const k = Object.keys(x).find(y => !['Application', 'logical_cores'].includes(y) && !y.endsWith('_unit'));
            return {
              name: x.Application,
              value: x[k!],
              logical_cores: x.logical_cores ? +x.logical_cores : null
            };
          }).filter((x: any) => x.value != null);
          this.showResult = true;
          setTimeout(() => this.renderChart(), 50);
        });

      return;
    }

    if (this.selectedGraph.id === 'table') {
      this.dashboardApiService
        .getMetricTableData(encodedCategory, this.selectedMetricIds, this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          const data: Record<string, Record<string, any>> = {};
          const metricSet = new Set<string>();

          this.hasEntityData = res.some((x: any) => !!x.entity);

          res.forEach((x: any) => {
            const rowKey = x.entity
              ? `${x.applicationName} | ${x.entity}`
              : x.applicationName;

            if (!data[rowKey]) data[rowKey] = {};

            data[rowKey][x.metric] = x;
            metricSet.add(x.metric);
          });

          this.metrics = [...metricSet];
          this.tableData = data;
          this.showResult = true;
        });

      return;
    }

    /* TIME SERIES */

    this.chartDataStore = [];

    this.dashboardApiService
      .getMetricTimeSeriesData(encodedCategory, this.selectedMetricIds, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const response = Array.isArray(data) ? data[0] : data;

        // ── ENDPOINT DETAILS branch ───────────────────────────────────
        if (response?.endpointDetails?.length) {
          const endpointDetails = response.endpointDetails;

          this.chartCategories = endpointDetails.map(
            (x: any) => x.entity
          );

          const keys = Object.keys(endpointDetails[0]).filter(
            key => key !== 'entity'
          );

          this.chartDataStore = keys.map(key => ({
            name: key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase()),
            data: endpointDetails.map((item: any) => Number(item[key]) || 0)
          }));

          this.chartUnit = '';
          this.showResult = true;

          setTimeout(() => this.renderChart(), 50);
          return;
        }

        // ── TRACE COUNT branch ───────────────────────────────────
        if (response?.statusCodeCount && Array.isArray(response.statusCodeCount)) {
          const statusCodeData: any[] = response.statusCodeCount;

          // X-axis = entities
          this.chartCategories = statusCodeData.map(
            (item: any) => item.entity || item.applicationName || ''
          );

          // Collect all unique status code keys
          const statusCodeSet = new Set<string>();
          statusCodeData.forEach((item: any) => {
            Object.keys(item).forEach(k => {
              if (k !== 'applicationName' && k !== 'entity') statusCodeSet.add(k);
            });
          });

          // One series per status code, data = count per entity
          this.chartDataStore = [...statusCodeSet].map(code => ({
            name: code,
            data: statusCodeData.map((item: any) => Number(item[code]) || 0)
          }));

          this.chartUnit = '';
          this.showResult = true;
          setTimeout(() => this.renderChart(), 50);
          return;
        }

        // ── TIME SERIES branch (unchanged) ───────────────────────────────────
        const unit = response?.unit || '';
        const timeseries = response?.timeseries || [];

        const keySet = new Set<string>();
        timeseries.forEach((row: any) => {
          Object.keys(row).forEach(k => { if (k !== 'time_bucket') keySet.add(k); });
        });
        const keys = [...keySet];

        this.chartCategories = timeseries.map((x: any) => {
          const d = this.parseTimeBucket(x.time_bucket);

          switch (x.time_bucket.length) {
            case 8: // yyyyMMdd
              return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

            case 10: // yyyyMMddHH
              return `${String(d.getHours()).padStart(2, '0')}:00`;

            case 12: // yyyyMMddHHmm
              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

            default:
              return x.time_bucket;
          }
        });
        this.chartDataStore = keys.map((key: string) => ({
          name: key,
          data: timeseries.map((x: any) => x[key] ?? null)
        }));

        this.chartUnit = unit;
        this.showResult = true;
        setTimeout(() => this.renderChart(), 50);
      });

  }

  changeGraph(type: any) {
    const previousGraphId = this.selectedGraph?.id;
    const nextGraphId = type?.id;

    this.showGraphDropdown = false;

    const shouldHardReset = ['table', 'numeric', 'hexagonal'].includes(previousGraphId || '') && previousGraphId !== nextGraphId;

    if (shouldHardReset) {
      this.selectedGraph = type;

      this.resetForm();

      this.selectedGraph = type;
      this.selectedNumericItem = null;
      this.numericData = [];

      this.getMetrics();
      this.showResult = false;
      return;
    }

    // normal flow for all other graph switches
    const previousCategory = this.selectedCategory;
    const previousMetric = [...this.selectedMetric];
    const previousMetricName = [...this.selectedMetricName];
    const previousMetricLabel = this.selectedMetricLabel;
    const previousMetricIds = [...this.selectedMetricIds];
    const previousApplication = [...this.selectedApplication];
    const previousEndpoints = [...this.selectedEndpoints];
    const previousProcess = this.selectedProcess;

    this.selectedGraph = type;
    this.getMetrics();

    let newCategories: string[] = [];
    let newMetricsData: Record<string, { id: string, label: string, value: string[], metricTableName: any; }[]> = {};

    if (!this.availableProducts || this.availableProducts.length === 0) {
      newCategories = [];
      newMetricsData = {};
    } else {
      const productSet = new Set(
        this.availableProducts.map(p => this.normalizeProduct(p))
      );

      const source = this.chartsMetricsData || [];
      const filteredData = source.filter(x =>
        productSet.has(this.normalizeProduct(x.appType))
      );

      newCategories = filteredData.map(x => x.type);
      newMetricsData = Object.fromEntries(
        filteredData.map(x => [x.type, x.metrics])
      );
    }

    this.categories = newCategories;
    this.metricsData = newMetricsData;

    if (previousCategory && this.categories.includes(previousCategory)) {
      this.selectedCategory = previousCategory;

      const currentCategoryMetrics = this.metricsData[this.selectedCategory] || [];
      const matchingMetric = currentCategoryMetrics.find(m =>
        m.label === previousMetricLabel ||
        (Array.isArray(m.value) &&
          Array.isArray(previousMetric) &&
          m.value.length === previousMetric.length &&
          m.value.every((v, i) => v === previousMetric[i]))
      );

      if (matchingMetric) {
        this.selectedMetric = matchingMetric.value;
        this.selectedMetricName = matchingMetric.metricTableName;
        this.selectedMetricLabel = matchingMetric.label;
        this.selectedMetricIds = [matchingMetric.id];
        this.selectedApplication = previousApplication;
        this.selectedEndpoints = previousEndpoints;
        this.selectedProcess = previousProcess;
      } else {
        this.selectedMetric = [];
        this.selectedMetricName = [];
        this.selectedMetricLabel = '';
        this.selectedMetricIds = [];
        this.selectedApplication = [];
        this.selectedEndpoints = [];
        this.processList = [];
        this.selectedProcess = '';
        this.showResult = false;
      }
    } else {
      this.selectedCategory = this.categories[0] || '';
      this.selectedMetric = [];
      this.selectedMetricName = [];
      this.selectedMetricLabel = '';
      this.selectedMetricIds = [];
      this.selectedApplication = [];
      this.selectedEndpoints = [];
      this.processList = [];
      this.selectedProcess = '';
      this.showResult = false;

      if (this.selectedCategory) {
        this.getAllAppListByUserID();
      }
    }

    // Only auto-run if we are NOT coming from table/numeric/hexagonal
    if (
      this.showResult &&
      this.selectedMetric?.length &&
      this.selectedApplication?.length
    ) {
      this.runQuery();
    } else if (!this.selectedMetric?.length || !this.selectedApplication?.length) {
      this.showResult = false;
    }
  }

  /* RENDER CHART */
  renderChart() {
    if (this.selectedGraph.id === 'hexagonal') {
      const container = document.getElementById('chartContainer') as HTMLElement;
      if (!container) return;

      const total = this.numericData.length;
      if (total === 0) {
        container.innerHTML = `<div style="color:#aaa;text-align:center;padding:40px;">No data available</div>`;
        return;
      }

      const data = this.numericData
        .map((x: any) => {
          const metricKey = Object.keys(x).find(
            k => typeof x[k] === 'number' && !k.endsWith('_unit')
          );
          if (!metricKey) return null;
          return {
            value: +x[metricKey],
            logical_cores: x.logical_cores ? +x.logical_cores : null,
            name: x.Application ?? x.label ?? x.name ?? ''
          };
        })
        .filter(Boolean) as any[];

      const HEX_GAP = 2;
      const SQRT3 = Math.sqrt(3);
      const tooltipId = `hex-tooltip-${Date.now()}`;

      const computeHexLayout = (cw: number, ch: number, count: number): { R: number; cols: number } => {
        let bestR = 0, bestCols = 1;
        for (let c = 1; c <= count; c++) {
          const r = Math.ceil(count / c);
          const rFromW = (cw - (c + 1) * HEX_GAP) / (c * 1.5 + 0.5);
          const rFromH = (ch - (r + 1) * HEX_GAP) / (r * SQRT3 + SQRT3 / 2);
          const R = Math.min(rFromW, rFromH);
          if (R > bestR) { bestR = R; bestCols = c; }
        }
        return { R: Math.max(bestR, 8), cols: bestCols };
      };

      const buildHexTile = ({ d, cx, cy, R, color, tooltipId }: {
        d: any; cx: number; cy: number; R: number;
        color: string; tooltipId: string;
      }): string => {
        const points = Array.from({ length: 6 }, (_, i) => {
          const angle = (Math.PI / 3) * i;
          return `${cx + (R - HEX_GAP / 2) * Math.cos(angle)},${cy + (R - HEX_GAP / 2) * Math.sin(angle)}`;
        }).join(' ');

        const fontSize = Math.max(7, Math.min(11, R * 0.28));
        const nameFontSize = Math.max(6, Math.min(9, R * 0.22));
        const maxChars = Math.floor(R * 0.55);
        const shortName = d.name.length > maxChars ? d.name.slice(0, maxChars - 1) + '…' : d.name;
        const displayVal = d.logical_cores ? `${d.value}%` : `${d.value}`;
        const tooltipText = d.logical_cores
          ? `${d.name}: ${d.value}% / ${d.logical_cores * 100}%`
          : `${d.name}: ${d.value}`;

        const labels = R > 16
          ? `<text x="${cx}" y="${cy - fontSize * 0.3}" text-anchor="middle" dominant-baseline="middle"
            fill="#fff" font-weight="700" font-size="${fontSize}px" font-family="Inter,sans-serif"
            pointer-events="none" style="text-shadow:0 1px 2px rgba(0,0,0,0.4)">${displayVal}</text>`
          : `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
            fill="#fff" font-weight="700" font-size="${fontSize}px" font-family="Inter,sans-serif"
            pointer-events="none">${d.value}</text>`;

        return `
      <g class="hex-tile" style="cursor:pointer" filter="url(#hex-shadow-${tooltipId})">
        <polygon points="${points}" fill="${color}" stroke="#fff" stroke-width="2"
          style="transition:opacity 0.15s"
          onmouseenter="this.style.opacity='0.82';
            var t=document.getElementById('${tooltipId}');
            if(t){t.textContent='${tooltipText.replace(/'/g, "\\'")}';t.style.display='block';}"
          onmouseleave="this.style.opacity='1';
            var t=document.getElementById('${tooltipId}');
            if(t){t.style.display='none';}"
        />
        ${labels}
      </g>`;
      };

      const render = () => {
        const cw = container.clientWidth || 400;
        const ch = container.clientHeight || 300;

        const { R, cols } = computeHexLayout(cw, ch, data.length);
        const rows = Math.ceil(data.length / cols);
        const gridW = (cols * 1.5 + 0.5) * R + (cols + 1) * HEX_GAP;
        const gridH = (rows * SQRT3 + SQRT3 / 2) * R + (rows + 1) * HEX_GAP;
        const offsetX = (cw - gridW) / 2 + R;
        const offsetY = (ch - gridH) / 2 + R;

        const tiles = data.map((d: any, i: number) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = offsetX + col * (1.5 * R + HEX_GAP);
          const cy = offsetY + row * (SQRT3 * R + HEX_GAP) + (col % 2 === 1 ? (SQRT3 * R + HEX_GAP) / 2 : 0);
          return buildHexTile({ d, cx, cy, R, color: '#388E3C', tooltipId });
        }).join('');

        container.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" style="display:block;overflow:visible">
        <defs>
          <filter id="hex-shadow-${tooltipId}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="rgba(0,0,0,0.25)"/>
          </filter>
        </defs>
        ${tiles}
      </svg>
      <div id="${tooltipId}" style="display:none;position:absolute;bottom:8px;left:50%;
        transform:translateX(-50%);background:rgba(17,24,39,0.92);color:#fff;font-size:11px;
        font-family:Inter,sans-serif;padding:5px 10px;border-radius:6px;pointer-events:none;
        white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:10;"></div>
    `;
      };

      render();
      return;
    }

    if (this.selectedGraph.id === 'table') return;

    // ── Shared legend helper ──────────────────────────────────────────────────
    const legendOptions: Highcharts.LegendOptions = (() => {
      if (!this.legendEnable) return { enabled: false };
      const pos = this.legendAlign || 'bottom';
      return {
        enabled: true,
        align: pos === 'left' ? 'left' : pos === 'right' ? 'right' : 'center',
        verticalAlign: pos === 'left' || pos === 'right' ? 'middle' : 'bottom',
        layout: pos === 'left' || pos === 'right' ? 'vertical' : 'horizontal',
        itemStyle: { fontWeight: '400', fontSize: '10px' },
      };
    })();

    // ── Shared axis helpers ───────────────────────────────────────────────────
    const xAxisTitle = this.xAxisDataLabel
      ? { text: this.xAxisDataLabel }
      : { text: null };

    const yAxisTitle = this.yAxisDataLabel
      ? { text: this.yAxisDataLabel }
      : { text: this.chartUnit ? `Unit : ${this.chartUnit}` : '' };

    const options: Highcharts.Options = {
      chart: { backgroundColor: 'transparent', height: 350, spacing: [5, 5, 5, 5] },
      title: { text: '' },
      tooltip: { shared: true },
      credits: { enabled: false },
      legend: legendOptions,
    };

    if (this.selectedGraph.id === 'stackedColumn' || this.selectedGraph.id === 'stackedArea') {
      options.chart!.type = this.selectedGraph.id === 'stackedColumn' ? 'column' : 'area';
      options.xAxis = {
        categories: this.chartCategories,
        tickPositions: [0, this.chartCategories.length - 1],
        title: xAxisTitle,
      };
      options.yAxis = { min: 0, tickAmount: 6, title: yAxisTitle };
      options.plotOptions = { series: { stacking: 'normal', dataLabels: { enabled: false } } };
      options.series = this.chartDataStore.map(s => ({
        type: options.chart!.type as any, name: s.name, data: s.data
      }));

    } else if (this.selectedGraph.id === 'scatter') {
      options.chart!.type = 'scatter';
      options.xAxis = { title: xAxisTitle };
      options.yAxis = { min: 0, tickAmount: 6, title: yAxisTitle };
      options.series = this.chartDataStore.map(s => ({
        type: 'scatter', name: s.name,
        data: s.data.map((y: number, i: number) => [i, y])
      }));

    } else if (this.selectedGraph.id === 'funnel') {
      options.chart!.type = 'funnel';
      options.series = this.chartDataStore.map(s => ({
        type: 'funnel', name: s.name,
        data: s.data.map((y: number, i: number) => [this.chartCategories[i] ?? '', y])
      }));

    } else {
      // spline / column / bar / area / endpoint / statusCode — all go here
      options.chart!.type = this.selectedGraph.id as any;
      options.xAxis = {
        categories: this.chartCategories,
        tickPositions: (() => {
          const len = this.chartCategories.length;
          if (len <= 1) return [0];
          if (len <= 10) return Array.from({ length: len }, (_, i) => i);
          return [0, Math.round(len / 4), Math.round(len / 2), Math.round((3 * len) / 4), len - 1];
        })(),
        labels: {
          rotation: this.chartCategories.length > 10 ? -35 : 0,
          style: { fontSize: '9px' },
          overflow: 'justify',
        },
        title: xAxisTitle,
      };
      options.yAxis = { min: 0, tickAmount: 6, title: yAxisTitle };
      options.plotOptions = { series: { dataLabels: { enabled: false } } };
      options.series = this.chartDataStore.map(s => ({
        type: this.selectedGraph.id as any, name: s.name, data: s.data
      }));
    }

    Highcharts.chart('chartContainer', options);
  }
  /* PIN */

  togglePinModal() {
    this.showPinModal = !this.showPinModal;
  }

  pinToDashboard() {
    if (!this.selectedMetricIds) { this.showSnack('Please select a metric'); return; }
    if (!this.selectedApplication?.length) { this.showSnack('Please select application'); return; }
    if (!this.selectedGraph || !this.selectedGraph.id) { this.showSnack('Please select a graph type'); return; }
    if (!this.pinTitle || !this.pinTitle.trim()) { this.showSnack('Please enter title'); return; }

    if ((this.isEndpointMetric || this.isEndpointDetailsMetric || this.isTraceCountMetric) && !this.selectedEndpoints?.length) {
      this.showSnack('Please select at least one endpoint');
      return;
    }

    if (this.isProcessMetric && !this.selectedProcess) {
      this.showSnack('Please select a process');
      return;
    }

    let entity: string[];
    let appNames: string[];

    if (this.isProcessMetric) {
      // Store: appName = ipAddress, entity = processName
      const app = this.selectedApplication[0];
      appNames = [app.ipAddress || app.applicationName];
      entity = [this.selectedProcess];

    } else if (this.isEndpointMetric) {
      const app = this.selectedApplication[0];
      const appName = app?.applicationName || app?.ipAddress;
      appNames = [appName];
      entity = this.selectedEndpoints;

      // Endpoint Details
    } else if (this.isEndpointDetailsMetric || this.isTraceCountMetric) {
      const app = this.selectedApplication[0];
      const appName = app?.applicationName || app?.ipAddress;
      appNames = [appName];
      entity = this.selectedEndpoints;

    } else {
      appNames = this.selectedApplication.map((a: any) => a.ipAddress || a.applicationName);
      entity = [];
    }

    let graphType: any;
    if (this.selectedGraph.id === 'numeric') {
      if (!this.selectedOperation) { this.showSnack('Please select operation for numeric graph'); return; }
      graphType = this.selectedGraph.id + '_' + this.selectedOperation;
    } else {
      graphType = this.selectedGraph.id;
    }

    let defaultCols = 12, defaultRows = 8;
    if (graphType.startsWith('numeric')) { defaultCols = 6; defaultRows = 4; }

    this.selectedDashboardId = sessionStorage.getItem('dashboardId');
    const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');

    const payload = {
      dashboardId: this.selectedDashboardId,
      metricNames: this.selectedMetricIds,
      entity: entity?.join(',') ?? '',
      appNames: appNames,
      chartType: graphType,
      chartName: this.pinTitle.trim(),
      x: null,
      y: null,
      gridCols: defaultCols,
      gridRows: defaultRows,
      xAxisDataLabel: this.xAxisDataLabel || null,
      yAxisDataLabel: this.yAxisDataLabel || null,
      legendEnable: this.legendEnable,
      legendAlign: this.legendAlign,
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);

    this.dashboardApiService.pinCustomDashboard(safePayload, safeUserName, updatedOn)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res.serviceStatus === 'Success') {
          this.showPinModal = false;
          this.dashboardRefreshService.refresh();
          this.resetForm();
        } else {
          console.log("Error Occured: ", res.serviceError);
        }
      });
  }

  /* EDIT MODE */

  private _pendingAppNames: string[] = [];
  private _pendingMetricKey = '';
  private _pendingEntity: string[] = [];
  private _pendingAllMetricKeys: string[] = [];

  populateEditMode(widget: any) {
    const baseType = widget.type?.split('_')[0];
    const graphMatch = this.graphTypes.find(g => g.id === baseType);
    if (graphMatch) this.selectedGraph = graphMatch;

    if (baseType === 'numeric') {
      const parts = widget.type.split('_');
      this.selectedOperation = parts[1] || 'avg';
    }

    this.pinTitle = widget.title || '';
    this._pendingAppNames = widget.appNames || [];

    // ── HEXAGONAL ────────────────────────────────────────────────────────────
    if (widget.type === 'hexagonal') {
      this._pendingEntity = [];
      // data is [{ appName, value, logical_cores }] — derive metric from series key if available
      // appNames is already set above; metric key must come from widget.metrics or fallback
      this._pendingMetricKey = widget.metrics?.[0] || '';
      this._pendingAllMetricKeys = widget.metrics || [];

      // Populate numericData so renderChart works immediately
      this.numericData = (widget.data || [])
        .filter((x: any) => x.value != null)
        .map((x: any) => ({
          name: x.appName ?? '',
          value: +x.value,
          logical_cores: x.logical_cores ? +x.logical_cores : null
        }));

      this.chartCategories = [];
      this.chartDataStore = [];
      this.chartUnit = widget.unit || '';
      this.showResult = true;
      this.xAxisDataLabel = widget.xAxisDataLabel ?? '';
      this.yAxisDataLabel = widget.yAxisDataLabel ?? '';
      this.legendEnable = widget.legendEnable === true || String(widget.legendEnable) === 'true';

      this.legendAlign = widget.legendAlign ?? 'bottom';
      setTimeout(() => this.renderChart(), 100);
      this.fetchProductsAndFeatures();
      return;
    }

    // ── ENDPOINT spline (data[] has total_hits/failure_count/success_rate) ──
    const isEndpointWidget = Array.isArray(widget.data)
      && widget.data[0]?.hasOwnProperty('total_hits')
      && !widget.series;

    if (isEndpointWidget) {
      this._pendingEntity = widget.entity
        ? widget.entity.split(',').map((e: string) => e.trim()).filter(Boolean)
        : [];

      // Metric key: endpoint metrics use metricTableName starting with 'endpoint_'
      // Store entity so reconciliation in handleResponse can restore endpoints
      this._pendingMetricKey = 'endpoint_details'; // triggers isEndpointMetricBase
      this._pendingAllMetricKeys = ['endpoint_details'];

      // Rebuild chartDataStore from flat data so preview renders immediately
      this.chartCategories = (widget.data || []).map((e: any) => e.entity || e.applicationName || '');
      const metricKeys = Object.keys(widget.data?.[0] || {}).filter(
        key => !['entity', 'applicationName', 'unit', 'metric'].includes(key)
          && widget.data.some((row: any) => typeof row[key] === 'number')
      );

      this.chartDataStore = metricKeys.map(key => ({
        name: key,
        data: widget.data.map((e: any) => Number(e[key]) || 0)
      }));
      this.chartUnit = widget.unit || '';
      this.showResult = true;
      this.xAxisDataLabel = widget.xAxisDataLabel ?? '';
      this.yAxisDataLabel = widget.yAxisDataLabel ?? '';
      this.legendEnable = widget.legendEnable === true || String(widget.legendEnable) === 'true';

      this.legendAlign = widget.legendAlign ?? 'bottom';
      setTimeout(() => this.renderChart(), 100);
      this.fetchProductsAndFeatures();
      return;
    }

    // ── TRACE STATUS ───────────────────────────────────────────────────────────
    const isTraceStatusWidget =
      Array.isArray(widget.data) &&
      widget.data.length > 0 &&
      widget.data[0]?.hasOwnProperty('entity') &&
      !widget.data[0]?.hasOwnProperty('total_hits'); // distinguish from endpoint_details

    if (isTraceStatusWidget) {
      this._pendingEntity = widget.entity
        ? widget.entity.split(',').map((e: string) => e.trim()).filter(Boolean)
        : [];

      console.log("Entity: ", this._pendingEntity);

      this._pendingMetricKey = 'service_traces_status_code';
      this._pendingAllMetricKeys = ['service_traces_status_code'];

      // Rebuild chart from stored data
      const statusCodeData: any[] = widget.data;

      const statusCodeSet = new Set<string>();
      statusCodeData.forEach((item: any) => {
        Object.keys(item).forEach(k => {
          if (k !== 'applicationName' && k !== 'entity') statusCodeSet.add(k);
        });
      });

      this.chartCategories = statusCodeData.map(
        (item: any) => item.entity || item.applicationName || ''
      );

      this.chartDataStore = [...statusCodeSet].map(code => ({
        name: code,
        data: statusCodeData.map((item: any) => Number(item[code]) || 0)
      }));

      this.chartUnit = widget.unit || '';
      this.showResult = true;
      this.xAxisDataLabel = widget.xAxisDataLabel ?? '';
      this.yAxisDataLabel = widget.yAxisDataLabel ?? '';
      this.legendEnable = widget.legendEnable === true || String(widget.legendEnable) === 'true';
      this.legendAlign = widget.legendAlign ?? 'bottom';
      setTimeout(() => this.renderChart(), 100);
      this.fetchProductsAndFeatures();
      return;
    }

    // ── TABLE ────────────────────────────────────────────────────────────────
    if (widget.type === 'table') {
      this._pendingEntity = [];
      this._pendingMetricKey = widget.metrics?.[0] || '';
      this._pendingAllMetricKeys = widget.metrics || [];
      this.tableData = widget.data || null;
      this.metrics = widget.metrics || [];
      this.hasEntityData = widget.hasEntityData ?? false;
      this.showResult = true;

      this.fetchProductsAndFeatures();
      return;
    }

    // ── TIME-SERIES (spline / column / area etc.) ────────────────────────────
    this._pendingEntity = widget.entity
      ? widget.entity.split(',').map((e: string) => e.trim()).filter(Boolean)
      : [];

    if (widget.series?.length) {
      this._pendingMetricKey = widget.series[0].name.split(' - ').pop()?.trim() || '';
      this._pendingAllMetricKeys = widget.series.map(
        (s: any) => s.name.split(' - ').pop()?.trim()
      ).filter(Boolean);
    }

    this.chartCategories = (widget.categories || []).map((c: string) => {
      const d = this.parseTimeBucket(c);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    this.chartDataStore = widget.series || [];
    this.chartUnit = widget.unit || '';
    this.showResult = true;
    this.xAxisDataLabel = widget.xAxisDataLabel ?? '';   // ← ADD
    this.yAxisDataLabel = widget.yAxisDataLabel ?? '';   // ← ADD
    this.legendEnable = widget.legendEnable === true || String(widget.legendEnable) === 'true';
    this.legendAlign = widget.legendAlign ?? 'bottom'; // ← ADD
    setTimeout(() => this.renderChart(), 100);
    this.fetchProductsAndFeatures();
  }

  saveEdit() {
    if (!this.editWidget?.id) return;
    if (!this.selectedMetricIds?.length) { this.showSnack('Please select a metric'); return; }
    if (!this.selectedApplication?.length) { this.showSnack('Please select application'); return; }
    if (!this.pinTitle?.trim()) { this.showSnack('Please enter title'); return; }

    const appNames = this.selectedApplication.map(
      (a: any) => a.ipAddress || a.applicationName
    );

    const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');

    let entity: string[];

    if (this.isProcessMetric) {
      const app = this.selectedApplication[0];
      entity = [this.selectedProcess];

    } else if (this.isEndpointMetric) {
      const app = this.selectedApplication[0];
      entity = this.selectedEndpoints;

      // Endpoint Details
    } else if (this.isEndpointDetailsMetric || this.isTraceCountMetric) {
      const app = this.selectedApplication[0];
      const appName = app?.applicationName || app?.ipAddress;
      entity = this.selectedEndpoints;

    } else {
      entity = [];
    }

    const payload = {
      id: this.editWidget.id,
      dashboardId: +sessionStorage.getItem('dashboardId')!,
      metricNames: this.selectedMetricIds,
      appNames: appNames,
      metricName: this.selectedMetricIds.join(','),
      appName: appNames?.join?.(',') || '',
      entity: entity?.join(',') ?? '',
      chartType: this.editWidget.type,
      chartName: this.pinTitle.trim(),
      xAxisDataLabel: this.xAxisDataLabel || null,
      yAxisDataLabel: this.yAxisDataLabel || null,
      legendEnable: this.legendEnable,
      legendAlign: this.legendAlign,
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);

    this.dashboardApiService.updateCustomDashboardDetails(safePayload, safeUserName, updatedOn).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.serviceStatus === 'Success') {
            this.showSnack('Widget updated!');
            this.dashboardRefreshService.refresh();
          } else {
            this.showSnack('Update failed: ' + (res?.serviceError || 'unknown error'));
          }
        },
        error: () => this.showSnack('Update failed')
      });
  }

  resetForm() {
    this.editWidget = null;
    this.selectedMetric = [];
    this.selectedMetricLabel = '';
    this.selectedMetricIds = [];
    this.selectedApplication = [];
    this.selectedEndpoints = [];
    this.selectedProcess = '';
    this.endpointNames = [];
    this.processList = [];
    this.pinTitle = 'Chart Name';
    this.showResult = false;
    this._pendingAppNames = [];
    this._pendingMetricKey = '';
    this._pendingEntity = [];
    this._pendingAllMetricKeys = [];
    this.xAxisDataLabel = '';
    this.yAxisDataLabel = '';
    this.legendEnable = false;
  }

  /* OUTSIDE CLICK */

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent) {
    const t = event.target as HTMLElement;

    // Metric panel
    if (!t.closest('.ed-field')) {
      this.showMetricPanel = false;
    }

    // Graph dropdown
    if (!t.closest('.ed-dropdown-wrap')) {
      this.showGraphDropdown = false;
    }

    // Application dropdown
    if (
      !t.closest('.ed-multiselect') &&
      !t.closest('.ed-select-trigger') &&
      !t.closest('.ed-multiselect__dropdown')
    ) {
      this.showApplicationDropdown = false;
    }

    // Endpoint dropdown
    if (
      !t.closest('.ed-multiselect') &&
      !t.closest('.ed-multiselect__dropdown')
    ) {
      this.showEndpointDropdown = false;
    }

    // Process dropdown
    if (!t.closest('.ed-process-select')) {
      this.showProcessDropdown = false;
    }

    // Modals
    if (!t.closest('.ed-popover') && !t.closest('.ed-pin-wrap')) {
      this.showPinModal = false;
    }

  }
}