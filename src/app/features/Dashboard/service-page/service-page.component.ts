import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApmApiService } from '../../../services/apm-api.service';
import { SubFeature, User } from '../../../models/user';
import { catchError, filter, forkJoin, from, map, of, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { AuthenticationService } from '../../../services/authentication.service';
import { Router, NavigationStart, RouterModule } from '@angular/router';
import { DateService } from '../../../services/date.service';
import { Session } from '../../../models/session';
import { LoggerService } from '../../../services/logger.service';
import Highcharts from 'highcharts'
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
export let browserRefresh = false;
import { SharedService } from '../../../services/shared.service';
import { ApplicationService } from '../../../services/application.service';

@Component({
  selector: 'app-service-page',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, RouterModule],
  templateUrl: './service-page.component.html',
  styleUrl: './service-page.component.css'
})
export class ServicePageComponent implements OnInit, OnDestroy {
  @ViewChild('popupContainerForLoad') popupContainerLoadRef!: ElementRef;
  @ViewChild('popupContainerForSuccessRate') popupContainerSuccessRateRef!: ElementRef;
  @ViewChild('popupContainerForLatency') popupContainerLatencyRef!: ElementRef;
  @ViewChild('popupContainerForApdex') popupContainerApdexRef!: ElementRef;
  private globalClickUnlistener: (() => void) | null = null;

  user: User = new User();
  currentUser: User | null = null;

  sessionObject: Session = new Session();

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;

  searchQuery = '';

  currentPage = 1;
  itemsPerPage = 15;
  totalPages = 0;

  isLoading: boolean = false;
  serviceNames: any[] = [];
  serviceTableData: any = {};
  filteredServiceId: any[] = [];
  pagedServiceId: any[] = [];


  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  featureType: string = 'SERVICE';

  loadPopupX!: number;
  loadPopupY!: number;
  showLoadPopup!: boolean;
  serviceLoadTimeValueChart: Highcharts.Chart | null = null;

  successRatePopupX!: number;
  successRatePopupY!: number;
  showSuccessRatePopup!: boolean;
  successRateTimeValueChart: Highcharts.Chart | null = null;

  latencyPopupX!: number;
  latencyPopupY!: number;
  showLatencyPopup!: boolean;
  latencyTimeValueChart: Highcharts.Chart | null = null;

  apdexPopupX!: number;
  apdexPopupY!: number;
  showApdexPopup!: boolean;
  apdexTimeValueChart: Highcharts.Chart | null = null;

  constructor(
    private router: Router,
    private dateService: DateService,
    private loggerService: LoggerService,
    private sharedService: SharedService,
    private authService: AuthenticationService,
    private applicationService: ApplicationService,
    private apmApiService: ApmApiService,
    private renderer: Renderer2,
    private apmService: ApmApiService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        browserRefresh = !this.router.navigated;
      }
    });
    this.dateService.setActiveComponent('ServiceDashboardComponent');
    sessionStorage.setItem('featureType', this.featureType);
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ServiceDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.getServiceName();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
    }
    sessionStorage.removeItem('featureType');
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  setServiceId(item: any): void {
    if (item) {
      this.sharedService.setServiceId(item.applicationName);
      sessionStorage.setItem('ApplicationId', item.applicationId);
      // sessionStorage.setItem('logoPath', item.logo_path);
      sessionStorage.setItem('logoPath', item.logo_path ?? '');
      this.router.navigate(['/service-page/general-service']);
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredServiceId = [...this.serviceNames];
      this.currentPage = 1;
      this.calculatePagination();
      return;
    }
    this.filteredServiceId = this.serviceNames.filter(service =>
      service.applicationName?.toLowerCase().includes(query)
    );
    this.calculatePagination();
  }

  getServiceName(): void {
    if (this.currentUser) {
      this.user = this.currentUser;
    }
    let featureType = sessionStorage.getItem('featureType');

    if (!featureType && this.currentUser?.subFeatures?.length) {
      const dashboardFeature = this.currentUser.subFeatures.find(f => f.name === 'Dashboard');
      if (dashboardFeature?.subFeature?.length) {
        featureType = dashboardFeature.subFeature[0].name;
        sessionStorage.setItem('featureType', featureType);
      } else if (dashboardFeature) {
        featureType = dashboardFeature.name;
        sessionStorage.setItem('featureType', featureType);
      }
    }

    featureType = featureType ?? '';

    this.user.sessionDTO = this.sessionObject;

    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
    this.applicationService.getFullApplicationData(this.currentUser?.userId, featureType, this.currentUser!.sessionDTO).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.serviceNames = data.serviceResponse.applications;
      this.filteredServiceId = this.serviceNames?.length ? [...this.serviceNames] : [];
      this.pagedServiceId = [...this.filteredServiceId];

      this.getServiceTableData();

      this.calculatePagination();
    });
  }

  getServiceTableData(): void {
    this.isLoading = true;

    if (!Array.isArray(this.serviceNames) || this.serviceNames.length === 0) {
      this.isLoading = false;
      return;
    }

    const encodedServiceIds = this.serviceNames.map((service: any) =>
      btoa(service.applicationName) + '.1'
    );

    this.apmApiService
      .getServiceTableData(encodedServiceIds, this.startTime, this.endTime)
      .pipe(
        map((response: any[]) => {

          const dataMap = new Map(
            response.map(item => [item.entityId, item])
          );

          return this.serviceNames.map((service: any) => {
            const encodedId = btoa(service.applicationName) + '.1';
            const data = dataMap.get(encodedId) || {};

            return {  
              ...service,
              
              logo_path: this.resolveLogoPath(service),
              ...data,
              total_count: data.total_alert_count !== undefined ? data.total_alert_count : data.total_count,
              openalertcount: data.openalertcount !== undefined ? data.openalertcount : (data.open_alert_count !== undefined ? data.open_alert_count : 0)
            };
          });
        }),
        catchError(() =>
          of(
            this.serviceNames.map((service: any) => ({
              ...service,
              logo_path: this.resolveLogoPath(service),
              service_load: null,
              success_rate: null,
              latency: null,
              service_apdex: null,
              infra_ip: null,
              total_alert_count: null
            }))
          )
        )
      )
      .subscribe(results => {
        this.isLoading = false;
        this.pagedServiceId = results;
        this.filteredServiceId = results;
        this.serviceNames = results;
        this.calculatePagination();
      });
  }

  private resolveLogoPath(service: any): string | null {
    console.log("Calling images");
    const tech = service?.applicationTechnology ? service.applicationTechnology.trim().toLowerCase() : '';
    const appType = service?.applicationType ? service.applicationType.trim().toLowerCase() : '';
    return (tech || appType || 'undefined') + '.png';
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredServiceId.length / this.itemsPerPage);
    this.pagedServiceId = this.filteredServiceId.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.calculatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.calculatePagination();
    }
  }

  goToPage(page: any): void {
    this.currentPage = page;
    this.calculatePagination();
  }

  get totalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    } else {
      if (this.currentPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages];
      } else if (this.currentPage >= this.totalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages];
      }
    }
    return pages;
  }

  get startIndex(): number {
    return ((this.currentPage - 1) * this.itemsPerPage) + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredServiceId.length);
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredServiceId.sort((a, b) => {
      const valA = a[column];
      const valB = b[column];

      const isEmptyA = valA === null || valA === undefined || valA === '';
      const isEmptyB = valB === null || valB === undefined || valB === '';

      if (isEmptyA && isEmptyB) return 0;

      if (isEmptyA) return 1;
      if (isEmptyB) return -1;

      const compare = this.alphanumericCompare(
        valA.toString(),
        valB.toString()
      );

      return this.sortDirection === 'asc' ? compare : -compare;
    });

    this.currentPage = 1;
    this.calculatePagination();
  }

  alphanumericCompare(a: string, b: string): number {
    const re = /(\d+|\D+)/g;
    const aParts = a.match(re) || [];
    const bParts = b.match(re) || [];

    const len = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < len; i++) {
      const aPart = aParts[i];
      const bPart = bParts[i];

      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);

      const bothNumeric = !isNaN(aNum) && !isNaN(bNum);
      if (bothNumeric) {
        if (aNum !== bNum) return aNum - bNum;
      } else {
        const cmp = aPart.localeCompare(bPart, undefined, { sensitivity: 'base' });
        if (cmp !== 0) return cmp;
      }
    }

    return aParts.length - bParts.length;
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1;
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }

  openLoadPopup(event: MouseEvent, serviceName: string): void {
    const popupWidth = 320;
    const popupHeight = 300;

    let x = event.clientX;
    let y = event.clientY;

    if (x + popupWidth > window.innerWidth) {
      x = window.innerWidth - popupWidth - 10;
    }

    if (y + popupHeight > window.innerHeight) {
      y = window.innerHeight - popupHeight - 10;
    }

    this.loadPopupX = x;
    this.loadPopupY = y;
    this.showLoadPopup = true;

    setTimeout(() => {
      this.globalClickUnlistener = this.renderer.listen('document', 'click', (e: MouseEvent) => {
        const popupEl = this.popupContainerLoadRef?.nativeElement;
        if (this.showLoadPopup && popupEl && !popupEl.contains(e.target)) {
          this.closeLoadPopup();
        }
      });
    });

    this.apmService.getServiceLoadTimeValue(btoa(serviceName) + '.1', this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const seriesData = data?.loadTimeSeries || [];
          this.renderLoadChart(seriesData);
        },
        error: (err) => console.error('Error fetching service load:', err)
      });
  }

  closeLoadPopup(): void {
    this.showLoadPopup = false;
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
      this.globalClickUnlistener = null;
    }
  }

  renderLoadChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.serviceLoadTimeValueChart) {
          this.serviceLoadTimeValueChart.destroy();
        }

        this.serviceLoadTimeValueChart = Highcharts.chart('serviceLoadTimeValue', {
          chart: { type: 'spline', backgroundColor: 'transparent' },
          title: { text: undefined, align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          lang: { noData: 'No Data Available' },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]);
          return {
            y,
          };
        })
      }));

      if (this.serviceLoadTimeValueChart) {
        this.serviceLoadTimeValueChart.destroy();
      }


      this.serviceLoadTimeValueChart = Highcharts.chart('serviceLoadTimeValue', {
        chart: {
          type: 'spline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  openSuccessRatePopup(event: MouseEvent, serviceName: string): void {
    const popupWidth = 320;
    const popupHeight = 300;

    let x = event.clientX;
    let y = event.clientY;

    if (x + popupWidth > window.innerWidth) {
      x = window.innerWidth - popupWidth - 10;
    }

    if (y + popupHeight > window.innerHeight) {
      y = window.innerHeight - popupHeight - 10;
    }

    this.successRatePopupX = x;
    this.successRatePopupY = y;
    this.showSuccessRatePopup = true;

    setTimeout(() => {
      this.globalClickUnlistener = this.renderer.listen('document', 'click', (e: MouseEvent) => {
        const popupEl = this.popupContainerSuccessRateRef?.nativeElement;
        if (this.showSuccessRatePopup && popupEl && !popupEl.contains(e.target)) {
          this.closeLoadPopup();
        }
      });
    });

    this.apmService.getSuccessRateTimeValue(btoa(serviceName) + '.1', this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const seriesData = data?.successRateTimeSeries || [];
          this.renderSuccessRateChart(seriesData);
        },
        error: (err) => console.error('Error fetching success rate:', err)
      });
  }

  closeSuccessRatePopup(): void {
    this.showSuccessRatePopup = false;
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
      this.globalClickUnlistener = null;
    }
  }

  renderSuccessRateChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.successRateTimeValueChart) {
          this.successRateTimeValueChart.destroy();
        }

        this.successRateTimeValueChart = Highcharts.chart('successRateTimeValue', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: undefined, align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          lang: { noData: 'No Data Available' },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const series: Highcharts.SeriesColumnOptions[] = keys.map(key => ({
        name: key,
        type: 'column',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]);
          return {
            y,
            color: Number(d[key]) === 100 ? '#4CAF50' : '#F44336'
          };
        })
        // data: data.map(d => ({
        //   y: Number(d[key]),
        //   color: Number(d[key]) === 100 ? '#4CAF50' : '#F44336' // Green or Red
        // }))
      }));

      if (this.successRateTimeValueChart) {
        this.successRateTimeValueChart.destroy();
      }


      this.successRateTimeValueChart = Highcharts.chart('successRateTimeValue', {
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          max: 100,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  openLatencyPopup(event: MouseEvent, serviceName: string): void {
    const popupWidth = 320;
    const popupHeight = 300;

    let x = event.clientX;
    let y = event.clientY;

    if (x + popupWidth > window.innerWidth) {
      x = window.innerWidth - popupWidth - 10;
    }

    if (y + popupHeight > window.innerHeight) {
      y = window.innerHeight - popupHeight - 10;
    }

    this.latencyPopupX = x;
    this.latencyPopupY = y;
    this.showLatencyPopup = true;

    setTimeout(() => {
      this.globalClickUnlistener = this.renderer.listen('document', 'click', (e: MouseEvent) => {
        const popupEl = this.popupContainerLatencyRef?.nativeElement;
        if (this.showLatencyPopup && popupEl && !popupEl.contains(e.target)) {
          this.closeLatencyPopup();
        }
      });
    });

    this.apmService.getServiceAvgResponseTime(btoa(serviceName) + '.1', this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const seriesData = data?.latencyTimeSeries || [];
          this.renderLatencyChart(seriesData);
        },
        error: (err) => console.error('Error fetching service latency:', err)
      });
  }

  closeLatencyPopup(): void {
    this.showLatencyPopup = false;
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
      this.globalClickUnlistener = null;
    }
  }

  renderLatencyChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.latencyTimeValueChart) {
          this.latencyTimeValueChart.destroy();
        }

        this.latencyTimeValueChart = Highcharts.chart('latencyTimeValue', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: undefined, align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          lang: { noData: 'No Data Available' },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]);
          return {
            y,
          };
        })
      }));

      if (this.latencyTimeValueChart) {
        this.latencyTimeValueChart.destroy();
      }


      this.latencyTimeValueChart = Highcharts.chart('latencyTimeValue', {
        chart: {
          type: 'spline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  openApdexPopup(event: MouseEvent, serviceName: string): void {
    const popupWidth = 320;
    const popupHeight = 300;

    let x = event.clientX;
    let y = event.clientY;

    if (x + popupWidth > window.innerWidth) {
      x = window.innerWidth - popupWidth - 10;
    }

    if (y + popupHeight > window.innerHeight) {
      y = window.innerHeight - popupHeight - 10;
    }

    this.apdexPopupX = x;
    this.apdexPopupY = y;
    this.showApdexPopup = true;

    setTimeout(() => {
      this.globalClickUnlistener = this.renderer.listen('document', 'click', (e: MouseEvent) => {
        const popupEl = this.popupContainerApdexRef?.nativeElement;
        if (this.showApdexPopup && popupEl && !popupEl.contains(e.target)) {
          this.closeApdexPopup();
        }
      });
    });

    this.apmService.getServiceApdexTimeValue(btoa(serviceName) + '.1', this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const seriesData = data?.apdexTimeSeries || [];
          this.renderApdexChart(seriesData);
        },
        error: (err) => console.error('Error fetching service apdex:', err)
      });
  }

  closeApdexPopup(): void {
    this.showApdexPopup = false;
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
      this.globalClickUnlistener = null;
    }
  }

  renderApdexChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.apdexTimeValueChart) {
          this.apdexTimeValueChart.destroy();
        }

        this.apdexTimeValueChart = Highcharts.chart('apdexTimeValue', {
          chart: { type: 'areaspline', backgroundColor: 'transparent' },
          title: { text: undefined, align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          lang: { noData: 'No Data Available' },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: key,
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => {
          const y = Number(d[key]);
          return {
            y,
          };
        })
      }));

      if (this.apdexTimeValueChart) {
        this.apdexTimeValueChart.destroy();
      }


      this.apdexTimeValueChart = Highcharts.chart('apdexTimeValue', {
        chart: {
          type: 'areaspline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          max: 1,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

}
