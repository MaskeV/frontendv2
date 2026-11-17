import { AfterViewInit, Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { User } from '../../../../../models/user';
import { Session } from '../../../../../models/session';
import { HighchartsChartModule } from 'highcharts-angular';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../../services/date.service';
import { InfraService } from '../../../../../services/infra.service';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { AuthenticationService } from '../../../../../services/authentication.service';
import Highcharts from 'highcharts';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MatDialogModule } from '@angular/material/dialog';
import * as bootstrap from 'bootstrap';
export let browserRefresh = false;

@Component({
    selector: 'app-container-dashboard',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        HighchartsChartModule,
        MatDialogModule
    ],
    templateUrl: './container-dashboard.component.html',
    styleUrl: './container-dashboard.component.css'
})
export class ContainerDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private themeObserver: MutationObserver | undefined;

  Highcharts: typeof Highcharts = Highcharts;

  user: User = new User();
  currentUser: User | null = null;

  sessionObject: Session = new Session();

  // subscription!: Subscription;
  private subscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  selectedServiceId!: string;
  selectedServiceName!: string;
  serviceId!: string;
  containerDetailsPair!: any;
  containerDetailsText!: string[];

  datemodel: any;
  startTime!: number;
  endTime!: number;

  charts: Highcharts.Chart[] = [];
  containerDetailsCharts: Highcharts.Chart | null = null;
  containerCpuUsageCharts: Highcharts.Chart | null = null;
  containerMemoryUsageCharts: Highcharts.Chart | null = null;
  containerNetworkTransmitCharts: Highcharts.Chart | null = null;
  containerNetworkReceivedCharts: Highcharts.Chart | null = null;
  selectedService!: string;

  constructor(
    private router: Router,
    private dateService: DateService,
    private infraService: InfraService,
    private authService: AuthenticationService,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.selectedServiceId = sessionStorage.getItem('serviceIdForContainer')!;
    this.selectedServiceName = sessionStorage.getItem('serviceIdForContainerName')!;
    this.selectedService = sessionStorage.getItem('serviceIdForInfra')!;
    console.log("this.selectedServiceName -------------- ", this.selectedServiceName);

    this.serviceId = sessionStorage.getItem('encodedServiceIdForInfra')!;
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        browserRefresh = !this.router.navigated;
      }
    });
    this.dateService.setActiveComponent('ContainerDashboardComponent');
    this.observeThemeChange();
    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ContainerDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.loadData();
        this.getContainerStatus();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
    this.themeObserver?.disconnect();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1;
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }

  loadData(): void {
    this.getContainerDetails();
    this.getContainerCPUUsage();
    this.getContainersMemoryUsage();
    // this.getContainerNetworkReceivedRate();
    this.getContainerNetworkTransmitRate();
  }

  observeThemeChange() {
    this.themeObserver = new MutationObserver(() => {
      this.getContainerDetails();
      this.getContainerCPUUsage();
      this.getContainersMemoryUsage();
      // this.getContainerNetworkReceivedRate();
      this.getContainerNetworkTransmitRate();
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  getContainerStatus(): void {
    this.infraService
      .getContainerStatus(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== 'object') {
            console.error("Invalid container status response:", data);
            this.containerDetailsText = [];
            return;
          }
          const hasNegative = Object.values(data).some((metricGroup: any) => {
            if (!metricGroup || typeof metricGroup !== 'object') return false;
            return Object.values(metricGroup).some(
              value => typeof value === 'number' && value < 0
            );
          });
          if (hasNegative) {
            console.error("Negative values found in container status. Ignoring response:", data);
            this.containerDetailsText = [];
            return;
          }
          const containerNames = new Set<string>();
          Object.values(data).forEach((metricGroup: any) => {
            if (metricGroup && typeof metricGroup === 'object') {
              Object.keys(metricGroup).forEach(containerName => {
                containerNames.add(containerName);
              });
            }
          });
          this.containerDetailsText = Array.from(containerNames);
        },
        error: (err: any) => {
          console.error("Failed to load container status:", err);
          this.containerDetailsText = [];
        }
      });
  }




  setContainerName(): void {
    sessionStorage.setItem('serviceIdForContainerName', this.selectedServiceName);
    this.loadData();
  }

  getContainerDetails(): void {
    this.infraService
      .getContainerDetails(
        this.serviceId,
        this.startTime,
        this.endTime,
        this.selectedServiceName
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!Array.isArray(data)) {
            console.error("Invalid container details response:", data);
            return;
          }
          const hasNegative = data.some((item: any) =>
            Object.values(item).some(
              (val) => typeof val === "number" && val < 0
            )
          );
          if (hasNegative) {
            console.error("Negative values found in container details. Ignoring response:", data);
            return;
          }
          this.getcontainerDetailsCharts(data);
        },
        error: (err) => {
          console.error("Failed to load container details:", err);
        }
      });
  }


  getcontainerDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.containerDetailsCharts) {
          this.containerDetailsCharts.destroy();
        }

        this.containerDetailsCharts = Highcharts.chart('containerDetailsChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
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
          return { y };
        })
      }));

      if (this.containerDetailsCharts) {
        this.containerDetailsCharts.destroy();
      }

      this.containerDetailsCharts = Highcharts.chart('containerDetailsChartsContainer', {
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
      if (!this.charts.includes(this.containerDetailsCharts)) {
        this.charts.push(this.containerDetailsCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getContainerCPUUsage(): void {
    this.infraService
      .getContainerCPUUsage(
        this.serviceId,
        this.startTime,
        this.endTime,
        this.selectedServiceName
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!Array.isArray(data)) {
            console.error("Invalid CPU usage response:", data);
            return;
          }
          const hasNegative = data.some((item: any) =>
            Object.values(item).some(
              (val) => typeof val === "number" && val < 0
            )
          );
          if (hasNegative) {
            console.error("Negative values found in CPU usage. Ignoring response:", data);
            return;
          }
          this.getContainerCPUUsageCharts(data);
        },
        error: (err) => {
          console.error("Failed to load container CPU usage:", err);
        }
      });
  }


  getContainerCPUUsageCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.containerCpuUsageCharts) {
          this.containerCpuUsageCharts.destroy();
        }

        this.containerCpuUsageCharts = Highcharts.chart('containerCpuUsageChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
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
          return { y };
        })
      }));

      if (this.containerCpuUsageCharts) {
        this.containerCpuUsageCharts.destroy();
      }

      this.containerCpuUsageCharts = Highcharts.chart('containerCpuUsageChartsContainer', {
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
      if (!this.charts.includes(this.containerCpuUsageCharts)) {
        this.charts.push(this.containerCpuUsageCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getContainersMemoryUsage(): void {
    this.infraService
      .getContainersMemoryUsage(
        this.serviceId,
        this.startTime,
        this.endTime,
        this.selectedServiceName
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!Array.isArray(data)) {
            console.error("Invalid memory usage response:", data);
            return;
          }
          const hasNegative = data.some((item: any) =>
            Object.values(item).some(
              (val) => typeof val === "number" && val < 0
            )
          );
          if (hasNegative) {
            console.error("Negative values found in memory usage. Ignoring response:", data);
            return;
          }
          this.getContainersMemoryUsageCharts(data);
        },
        error: (err) => {
          console.error("Failed to load containers memory usage:", err);
        }
      });
  }


  getContainersMemoryUsageCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.containerMemoryUsageCharts) {
          this.containerMemoryUsageCharts.destroy();
        }

        this.containerMemoryUsageCharts = Highcharts.chart('containerMemoryUsageChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
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
          return { y };
        })
      }));

      if (this.containerMemoryUsageCharts) {
        this.containerMemoryUsageCharts.destroy();
      }

      this.containerMemoryUsageCharts = Highcharts.chart('containerMemoryUsageChartsContainer', {
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
      if (!this.charts.includes(this.containerMemoryUsageCharts)) {
        this.charts.push(this.containerMemoryUsageCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getContainerNetworkReceivedRate(Tdata: any): void {
    this.infraService
      .getContainerNetworkReceivedRate(
        this.serviceId,
        this.startTime,
        this.endTime,
        this.selectedServiceName
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (Rdata: any) => {
          if (!Array.isArray(Rdata)) {
            console.error("Invalid received network rate response:", Rdata);
            return;
          }
          const hasNegative = Rdata.some((item: any) =>
            Object.values(item).some(
              val => typeof val === "number" && val < 0
            )
          );
          if (hasNegative) {
            console.error("Negative values found in received rate. Ignoring response:", Rdata);
            return;
          }
          this.getContainerNetworkNetworkRateCharts(Rdata, Tdata);
        },
        error: (err) => {
          console.error("Failed to load container network received rate:", err);
        }
      });
  }


  getContainerNetworkReceivedRateCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.containerNetworkReceivedCharts) {
          this.containerNetworkReceivedCharts.destroy();
        }

        this.containerNetworkReceivedCharts = Highcharts.chart('containerNetworkReceivedChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
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
          return { y };
        })
      }));

      if (this.containerNetworkReceivedCharts) {
        this.containerNetworkReceivedCharts.destroy();
      }

      this.containerNetworkReceivedCharts = Highcharts.chart('containerNetworkReceivedChartsContainer', {
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
      if (!this.charts.includes(this.containerNetworkReceivedCharts)) {
        this.charts.push(this.containerNetworkReceivedCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getContainerNetworkNetworkRateCharts(
    receivedData: { time_bucket: string;[key: string]: any }[],
    transmitData: { time_bucket: string;[key: string]: any }[]
  ): void {
    try {
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (!receivedData.length && !transmitData.length) {
        Highcharts.chart('containerNetworkCombinedChartsContainer', {
          chart: { type: 'areaspline', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', style: { color: noDataColor } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      // Parse dates (assuming time_bucket is the same for both datasets)
      const parsedDates = (receivedData.length ? receivedData : transmitData).map(item =>
        this.parseTimeBucket(item.time_bucket)
      );

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

      // Extract values
      const receivedSeriesData = receivedData.map(d => Number(Object.values(d).find(v => typeof v === 'number')));
      const transmitSeriesData = transmitData.map(d => Number(Object.values(d).find(v => typeof v === 'number')));

      // Consolidated = Received + Transmit
      const consolidatedData = receivedSeriesData.map((v, i) => v + (transmitSeriesData[i] || 0));

      const series: Highcharts.SeriesOptionsType[] = [
        {
          name: 'Received',
          type: 'spline',
          color: '#1f77b4', // blue
          data: receivedSeriesData,
          marker: { radius: 2 }
        },
        {
          name: 'Transmit',
          type: 'spline',
          color: '#ff7f0e', // orange
          data: transmitSeriesData,
          marker: { radius: 2 }
        },
        {
          name: 'Consolidated',
          type: 'areaspline', // area spline for consolidated
          color: '#2ca02c', // green
          fillOpacity: 0.3,
          data: consolidatedData,
          marker: { radius: 2 }
        }
      ];

      Highcharts.chart('containerNetworkCombinedChartsContainer', {
        chart: {
          type: 'spline',
          backgroundColor: 'transparent'
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          labels: { style: { color: labelColor, fontSize: '9px' }, y: 10 },
          tickLength: 0,
          tickWidth: 0,
          gridLineColor: gridColor,
          lineColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" }, // removes Y-axis label name
          labels: { style: { color: labelColor ,fontSize: '9px'},x: -7 },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor }
        },
        legend: {
          enabled: true,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            color: '#4b4b4b',
            fontWeight: 'bold',
            fontFamily: 'system-ui',
            fontSize: '9px',
            cursor: 'pointer',
            userSelect: 'none'
          },
          symbolHeight: 1,
          symbolWidth: 10,
          symbolRadius: 0,
          itemMarginTop: 0,
          itemMarginBottom: 0,
          itemDistance: 4,
          padding: 0
        },
        series: series,
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    } catch (e) {
      console.error("Error Occurred", e);
    }
  }




  getContainerNetworkTransmitRate(): void {
    this.infraService
      .getContainerNetworkTransmitRate(
        this.serviceId,
        this.startTime,
        this.endTime,
        this.selectedServiceName
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (Tdata: any) => {
          if (!Array.isArray(Tdata)) {
            console.error("Invalid transmit rate response:", Tdata);
            return;
          }
          const hasNegative = Tdata.some((item: any) =>
            Object.values(item).some(
              val => typeof val === "number" && val < 0
            )
          );
          if (hasNegative) {
            console.error("Negative values found in transmit rate. Ignoring response:", Tdata);
            return;
          }
          this.getContainerNetworkReceivedRate(Tdata);
        },
        error: (err) => {
          console.error("Failed to load container network transmit rate:", err);
        }
      });
  }


  getContainerNetworkTransmitRateCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.containerNetworkTransmitCharts) {
          this.containerNetworkTransmitCharts.destroy();
        }

        this.containerNetworkTransmitCharts = Highcharts.chart('containerNetworkTransmitChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
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
          return { y };
        })
      }));

      if (this.containerNetworkTransmitCharts) {
        this.containerNetworkTransmitCharts.destroy();
      }

      this.containerNetworkTransmitCharts = Highcharts.chart('containerNetworkTransmitChartsContainer', {
        chart: {
          type: 'spline',
          backgroundColor: 'transparent',
          spacingBottom: 0,
          spacingTop: 10,
          spacingLeft: 5,
          spacingRight: 5

        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          tickLength: 0,
          tickWidth: 0,
          labels: {
            style: { color: labelColor, fontSize: '6px' },
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
          labels: { style: { color: labelColor, fontSize: '5px' }, x: -7 },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor,
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '8px' },
        },
        legend: {
          enabled: true,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            color: '#4b4b4b',
            fontWeight: 'bold',
            fontFamily: 'system-ui',
            fontSize: '8px',
            cursor: 'pointer',
            userSelect: 'none'
          },
          symbolHeight: 1,
          symbolWidth: 10,
          symbolRadius: 0,
          itemMarginTop: 0,
          itemMarginBottom: 0,
          itemDistance: 4,
          padding: 0
        },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.containerNetworkTransmitCharts)) {
        this.charts.push(this.containerNetworkTransmitCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  openModal(template: TemplateRef<any>) {
    this.modalService.open(template, {
      backdrop: 'static',
      centered: false,
      keyboard: true,
    });
    this.getContainerProperties();
  }

  properties: any;
  getContainerProperties(): void {
    this.infraService
      .getContainerProperties(
        this.serviceId,
        this.startTime,
        this.endTime,
        this.selectedServiceName
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid container properties response:", data);
            this.properties = null;
            return;
          }
          const hasNegative = Object.values(data).some(
            val => typeof val === "number" && val < 0
          );
          if (hasNegative) {
            console.error("Negative values found in container properties. Ignoring response:", data);
            this.properties = null;
            return;
          }
          this.properties = data;
        },
        error: (err) => {
          console.error("Failed to load container properties:", err);
          this.properties = null;
        }
      });
  }


  syncCharts(charts: (Highcharts.Chart | undefined)[]) {
    let lastXValue: number | null = null;

    // Throttle function (using requestAnimationFrame for smoother updates)
    const throttleRAF = (func: Function) => {
      let ticking = false;
      return (...args: any[]) => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(() => {
            func(...args);
            ticking = false;
          });
        }
      };
    };

    const updateChartsForX = (xValue: number, event: Highcharts.PointerEventObject) => {
      charts.forEach((chart) => {
        if (!chart) return;

        const tooltipPoints: Highcharts.Point[] = [];

        chart.series?.forEach((s) => {
          const point = s.searchPoint(event, true);
          if (point) {
            const pTyped = point as Highcharts.Point & { state?: string };
            if (pTyped.state !== 'hover') pTyped.setState('hover');
            tooltipPoints.push(pTyped);
          }
        });

        if (tooltipPoints.length) {
          chart.tooltip?.refresh(tooltipPoints);

          chart.xAxis?.forEach((axis) => {
            const axisPoint = tooltipPoints.find((p) => p.series?.xAxis === axis);
            if (axisPoint) axis.drawCrosshair(event, axisPoint);
          });
        }
      });
    };

    const handleMouseMove = (e: MouseEvent, chart: Highcharts.Chart) => {
      if (!chart?.pointer) return;

      const event = chart.pointer.normalize(e);
      const points = chart.series
        ?.map((s) => s.searchPoint(event, true))
        ?.filter((p): p is Highcharts.Point => !!p) ?? [];

      if (!points.length) return;

      const xValue = points[0].x;
      if (xValue === lastXValue) return;
      lastXValue = xValue;

      updateChartsForX(xValue, event);
    };

    const throttledHandleMouseMove = throttleRAF(handleMouseMove);

    charts.forEach((chart) => {
      if (!chart?.container) return;

      // Hover
      chart.container.addEventListener(
        'mousemove',
        (e) => throttledHandleMouseMove(e as MouseEvent, chart),
        { passive: true }
      );

      // Click → show all tooltips for clicked x
      chart.container.addEventListener('click', (e) => {
        if (!chart?.pointer) return;
        const event = chart.pointer.normalize(e as MouseEvent);
        const points = chart.series
          ?.map((s) => s.searchPoint(event, true))
          ?.filter((p): p is Highcharts.Point => !!p) ?? [];
        if (!points.length) return;

        const xValue = points[0].x;
        updateChartsForX(xValue, event);
      });

      // Mouse leave
      chart.container.addEventListener(
        'mouseleave',
        () => {
          lastXValue = null;
          window.requestAnimationFrame(() => {
            charts.forEach((c) => {
              if (!c) return;

              // Hide tooltip and crosshair
              c.tooltip?.hide();
              c.xAxis?.forEach((axis) => axis.hideCrosshair());

              // Batch clear hover state
              c.series?.forEach((s) => {
                s.points?.forEach((p) => {
                  const pTyped = p as Highcharts.Point & { state?: string };
                  if (pTyped.state) {
                    // Using requestAnimationFrame to prevent forced reflow
                    window.requestAnimationFrame(() => pTyped.setState());
                  }
                });
              });
            });
          });
        },
        { passive: true }
      );
    });
  }

  ngAfterViewInit(): void {

    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

}
