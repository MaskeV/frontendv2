import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { DateService } from '../../../../services/date.service';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { IisMonitoringApiService } from '../../../../services/iis-monitoring-api.service';
import Highcharts from 'highcharts';
import { Router, RouterModule } from '@angular/router';
import * as bootstrap from 'bootstrap';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-iis-service',
    imports: [
        CommonModule,
        RouterModule
    ],
    templateUrl: './iis-service.component.html',
    styleUrl: './iis-service.component.css'
})

export class IisServiceComponent implements OnInit, OnDestroy, AfterViewInit {
  Highcharts: typeof Highcharts = Highcharts;

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;

  selectedService!: string;
  serviceId!: string;

  combinedData: any;
  versionData: any;

  charts: Highcharts.Chart[] = [];
  appPoolStateChart: Highcharts.Chart | null = null;
  appPoolStartChart: Highcharts.Chart | null = null;
  workerProcessStateChart: Highcharts.Chart | null = null;
  httpRequestChart: Highcharts.Chart | null = null;
  serverCacheOpsChart: Highcharts.Chart | null = null;
  fileCacheItemsChart: Highcharts.Chart | null = null;
  fileCacheHitsChart: Highcharts.Chart | null = null;
  fileCacheMemsChart: Highcharts.Chart | null = null;
  metadataCacheItemCharts: Highcharts.Chart | null = null;
  metadataCacheHitsCharts: Highcharts.Chart | null = null;
  outputCacheCharts: Highcharts.Chart | null = null;
  uriCacheEfficiencyCharts: Highcharts.Chart | null = null;
  uriCacheUsageCharts: Highcharts.Chart | null = null;
  uriCacheMaintenanceCharts: Highcharts.Chart | null = null;
  appPoolMetricsCharts: Highcharts.Chart | null = null;
  workerProcessStabilityCharts: Highcharts.Chart | null = null;
  workerProcessFailureCharts: Highcharts.Chart | null = null;
  workerProcessCreationCharts: Highcharts.Chart | null = null;
  
  constructor(
    private router: Router,
    private dateService: DateService,
    private iisMonitoringApiService: IisMonitoringApiService,
  ) { }

  ngOnInit(): void {
    this.selectedService = sessionStorage.getItem('serviceIdForIis') || '_blank';
    this.serviceId = sessionStorage.getItem('encodedServiceIdForIis') || 'X2JsYW5r.1';
    this.dateService.setActiveComponent('IisServiceComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'IisServiceComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.loadData();
      });
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  loadData(): void {
    this.getIisVersionInfo();
    this.getCombinedData();
    this.getWorkerProcessState();
    this.getHttpRequestMetrics();
    this.getServerCacheOps();
    this.getFileCacheHits();
    this.getFileCacheItems();
    this.getFileCacheMem();
    this.getMetadataCacheItems();
    this.getMetadataCacheHits();
    this.getOutputCacheMetrics();
    this.getUriCacheEfficiency();
    this.getUriCacheUsage();
    this.getUriCacheMaintenance()
    this.getAppPoolMetrics();
    this.getWorkerProcessStability();
    this.getWorkerProcessFailure();
    this.getWorkerProcessCreation();
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1;
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }

  convertSeconds(sec: number): string {
    if (sec == null || isNaN(sec)) return 'N/A';

    const days = Math.floor(sec / 86400);          // 24 * 60 * 60
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours} hr`;
    }

    return `${hours} hr ${minutes} min`;
  }

  getIisVersionInfo(): void {
    this.iisMonitoringApiService.getIisVersionInfo(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.versionData = data;
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getCombinedData(): void {
    this.iisMonitoringApiService.getCombinedData(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.combinedData = data;
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getWorkerProcessState(): void {
    this.iisMonitoringApiService.getWorkerProcessState(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getWorkerProcessStateChart(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getWorkerProcessStateChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const pools = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k =>
              k !== 'time_bucket' &&
              k !== 'total' &&
              typeof item[k] === 'object'
            )
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (pools.length === 0) {
        if (this.workerProcessStateChart) {
          this.workerProcessStateChart.destroy();
        }

        this.workerProcessStateChart = Highcharts.chart('workerProcessStateChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px'}},
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 86400000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const innerKeys = Array.from(
        new Set(
          data.flatMap(d =>
            pools.flatMap(pool =>
              d[pool] ? Object.keys(d[pool]) : []
            )
          )
        )
      );

      const series: Highcharts.SeriesSplineOptions[] = [];

      pools.forEach(pool => {
        innerKeys.forEach(innerKey => {
          series.push({
            name: `${pool} - ${innerKey}`,
            data: data.map(d => {
              const poolObj = d[pool];
              if (!poolObj || poolObj[innerKey] == null) {
                return null;
              }
              const v = Number(poolObj[innerKey]);
              return isNaN(v) ? null : v;
            }),
            type: 'spline',
            marker: { radius: 2 },
            lineWidth: 1,
          });
        });
      });

      if (this.workerProcessStateChart) {
        this.workerProcessStateChart.destroy();
      }

      this.workerProcessStateChart = Highcharts.chart('workerProcessStateChartContainer', {
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
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });

      if (!this.charts.includes(this.workerProcessStateChart)) {
        this.charts.push(this.workerProcessStateChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getHttpRequestMetrics(): void {
    this.iisMonitoringApiService.getHttpRequestMetrics(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getHttpRequestChart(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getHttpRequestChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const pools = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k =>
              k !== 'time_bucket' &&
              k !== 'total' &&
              typeof item[k] === 'object'
            )
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (pools.length === 0) {
        if (this.httpRequestChart) {
          this.httpRequestChart.destroy();
        }

        this.httpRequestChart = Highcharts.chart('httpRequestChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px'}},
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 86400000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const innerKeys = Array.from(
        new Set(
          data.flatMap(d =>
            pools.flatMap(pool =>
              d[pool] ? Object.keys(d[pool]) : []
            )
          )
        )
      );

      const series: Highcharts.SeriesSplineOptions[] = [];

      pools.forEach(pool => {
        innerKeys.forEach(innerKey => {
          series.push({
            name: `${pool} - ${innerKey}`,
            data: data.map(d => {
              const poolObj = d[pool];
              if (!poolObj || poolObj[innerKey] == null) {
                return null;
              }
              const v = Number(poolObj[innerKey]);
              return isNaN(v) ? null : v;
            }),
            type: 'spline',
            marker: { radius: 2 },
            lineWidth: 1,
          });
        });
      });

      if (this.httpRequestChart) {
        this.httpRequestChart.destroy();
      }

      this.httpRequestChart = Highcharts.chart('httpRequestChartContainer', {
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
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });

      if (!this.charts.includes(this.httpRequestChart)) {
        this.charts.push(this.httpRequestChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getServerCacheOps(): void {
    this.iisMonitoringApiService.getServerCacheOps(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getServerCacheOpsChart(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getServerCacheOpsChart(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.serverCacheOpsChart) {
          this.serverCacheOpsChart.destroy();
        }

        this.serverCacheOpsChart = Highcharts.chart('serverCacheOpsChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px'}},
          noData: { style: { display: 'none' } },
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
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.serverCacheOpsChart) {
        this.serverCacheOpsChart.destroy();
      }

      this.serverCacheOpsChart = Highcharts.chart('serverCacheOpsChartContainer', {
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
      if (!this.charts.includes(this.serverCacheOpsChart)) {
        this.charts.push(this.serverCacheOpsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getFileCacheItems(): void {
    this.iisMonitoringApiService.getFileCacheItems(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getFileCacheItemsChart(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getFileCacheItemsChart(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.fileCacheItemsChart) {
          this.fileCacheItemsChart.destroy();
        }

        this.fileCacheItemsChart = Highcharts.chart('fileCacheItemsChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          noData: { style: { display: 'none' } },
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
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.fileCacheItemsChart) {
        this.fileCacheItemsChart.destroy();
      }

      this.fileCacheItemsChart = Highcharts.chart('fileCacheItemsChartContainer', {
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
      if (!this.charts.includes(this.fileCacheItemsChart)) {
        this.charts.push(this.fileCacheItemsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getFileCacheHits(): void {
    this.iisMonitoringApiService.getFileCacheHits(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getFileCacheHitsChart(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getFileCacheHitsChart(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.fileCacheHitsChart) {
          this.fileCacheHitsChart.destroy();
        }

        this.fileCacheHitsChart = Highcharts.chart('fileCacheHitsChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
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
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.fileCacheHitsChart) {
        this.fileCacheHitsChart.destroy();
      }

      this.fileCacheHitsChart = Highcharts.chart('fileCacheHitsChartContainer', {
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
      if (!this.charts.includes(this.fileCacheHitsChart)) {
        this.charts.push(this.fileCacheHitsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getFileCacheMem(): void {
    this.iisMonitoringApiService.getFileCacheMem(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getFileCacheMemsChart(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getFileCacheMemsChart(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.fileCacheMemsChart) {
          this.fileCacheMemsChart.destroy();
        }

        this.fileCacheMemsChart = Highcharts.chart('fileCacheMemsChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
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
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.fileCacheMemsChart) {
        this.fileCacheMemsChart.destroy();
      }

      this.fileCacheMemsChart = Highcharts.chart('fileCacheMemsChartContainer', {
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
      if (!this.charts.includes(this.fileCacheMemsChart)) {
        this.charts.push(this.fileCacheMemsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getMetadataCacheItems(): void {
    this.iisMonitoringApiService.getMetadataCacheItems(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getMetadataCacheItemCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getMetadataCacheItemCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.metadataCacheItemCharts) {
          this.metadataCacheItemCharts.destroy();
        }

        this.metadataCacheItemCharts = Highcharts.chart('metadataCacheItemChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
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
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.metadataCacheItemCharts) {
        this.metadataCacheItemCharts.destroy();
      }

      this.metadataCacheItemCharts = Highcharts.chart('metadataCacheItemChartsContainer', {
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
      if (!this.charts.includes(this.metadataCacheItemCharts)) {
        this.charts.push(this.metadataCacheItemCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getMetadataCacheHits(): void {
    this.iisMonitoringApiService.getMetadataCacheHits(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getMetadataCacheHitsCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getMetadataCacheHitsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.metadataCacheHitsCharts) {
          this.metadataCacheHitsCharts.destroy();
        }

        this.metadataCacheHitsCharts = Highcharts.chart('metadataCacheHitsChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
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
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.metadataCacheHitsCharts) {
        this.metadataCacheHitsCharts.destroy();
      }

      this.metadataCacheHitsCharts = Highcharts.chart('metadataCacheHitsChartsContainer', {
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
      if (!this.charts.includes(this.metadataCacheHitsCharts)) {
        this.charts.push(this.metadataCacheHitsCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getOutputCacheMetrics(): void {
    this.iisMonitoringApiService.getOutputCacheMetrics(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getOutputCacheCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getOutputCacheCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.outputCacheCharts) {
          this.outputCacheCharts.destroy();
        }

        this.outputCacheCharts = Highcharts.chart('outputCacheChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
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
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.outputCacheCharts) {
        this.outputCacheCharts.destroy();
      }

      this.outputCacheCharts = Highcharts.chart('outputCacheChartsContainer', {
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
      if (!this.charts.includes(this.outputCacheCharts)) {
        this.charts.push(this.outputCacheCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getUriCacheEfficiency(): void {
    this.iisMonitoringApiService.getUriCacheEfficiency(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getUriCacheEfficiencyCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getUriCacheEfficiencyCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const pools = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k =>
              k !== 'time_bucket' &&
              k !== 'total' &&
              typeof item[k] === 'object'
            )
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (pools.length === 0) {
        if (this.uriCacheEfficiencyCharts) {
          this.uriCacheEfficiencyCharts.destroy();
        }

        this.uriCacheEfficiencyCharts = Highcharts.chart('uriCacheEfficiencyChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 86400000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const innerKeys = Array.from(
        new Set(
          data.flatMap(d =>
            pools.flatMap(pool =>
              d[pool] ? Object.keys(d[pool]) : []
            )
          )
        )
      );

      const series: Highcharts.SeriesSplineOptions[] = [];

      pools.forEach(pool => {
        innerKeys.forEach(innerKey => {
          series.push({
            name: `${pool} - ${innerKey}`,
            data: data.map(d => {
              const poolObj = d[pool];
              if (!poolObj || poolObj[innerKey] == null) {
                return null;
              }
              const v = Number(poolObj[innerKey]);
              return isNaN(v) ? null : v;
            }),
            type: 'spline',
            marker: { radius: 2 },
            lineWidth: 1,
          });
        });
      });

      if (this.uriCacheEfficiencyCharts) {
        this.uriCacheEfficiencyCharts.destroy();
      }

      this.uriCacheEfficiencyCharts = Highcharts.chart('uriCacheEfficiencyChartsContainer', {
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
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });

      if (!this.charts.includes(this.uriCacheEfficiencyCharts)) {
        this.charts.push(this.uriCacheEfficiencyCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getUriCacheUsage(): void {
    this.iisMonitoringApiService.getUriCacheUsage(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getUriCacheUsageCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getUriCacheUsageCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const pools = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k =>
              k !== 'time_bucket' &&
              k !== 'total' &&
              typeof item[k] === 'object'
            )
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (pools.length === 0) {
        if (this.uriCacheUsageCharts) {
          this.uriCacheUsageCharts.destroy();
        }

        this.uriCacheUsageCharts = Highcharts.chart('uriCacheUsageChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 86400000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const innerKeys = Array.from(
        new Set(
          data.flatMap(d =>
            pools.flatMap(pool =>
              d[pool] ? Object.keys(d[pool]) : []
            )
          )
        )
      );

      const series: Highcharts.SeriesSplineOptions[] = [];

      pools.forEach(pool => {
        innerKeys.forEach(innerKey => {
          series.push({
            name: `${pool} - ${innerKey}`,
            data: data.map(d => {
              const poolObj = d[pool];
              if (!poolObj || poolObj[innerKey] == null) {
                return null;
              }
              const v = Number(poolObj[innerKey]);
              return isNaN(v) ? null : v;
            }),
            type: 'spline',
            marker: { radius: 2 },
            lineWidth: 1,
          });
        });
      });

      if (this.uriCacheUsageCharts) {
        this.uriCacheUsageCharts.destroy();
      }

      this.uriCacheUsageCharts = Highcharts.chart('uriCacheUsageChartsContainer', {
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
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });

      if (!this.charts.includes(this.uriCacheUsageCharts)) {
        this.charts.push(this.uriCacheUsageCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getUriCacheMaintenance(): void {
    this.iisMonitoringApiService.getUriCacheMaintenance(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getUriCacheMaintenanceCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getUriCacheMaintenanceCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const pools = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k =>
              k !== 'time_bucket' &&
              k !== 'total' &&
              typeof item[k] === 'object'
            )
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (pools.length === 0) {
        if (this.uriCacheMaintenanceCharts) {
          this.uriCacheMaintenanceCharts.destroy();
        }

        this.uriCacheMaintenanceCharts = Highcharts.chart('uriCacheMaintenanceChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 86400000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const innerKeys = Array.from(
        new Set(
          data.flatMap(d =>
            pools.flatMap(pool =>
              d[pool] ? Object.keys(d[pool]) : []
            )
          )
        )
      );

      const series: Highcharts.SeriesSplineOptions[] = [];

      pools.forEach(pool => {
        innerKeys.forEach(innerKey => {
          series.push({
            name: `${pool} - ${innerKey}`,
            data: data.map(d => {
              const poolObj = d[pool];
              if (!poolObj || poolObj[innerKey] == null) {
                return null;
              }
              const v = Number(poolObj[innerKey]);
              return isNaN(v) ? null : v;
            }),
            type: 'spline',
            marker: { radius: 2 },
            lineWidth: 1,
          });
        });
      });

      if (this.uriCacheMaintenanceCharts) {
        this.uriCacheMaintenanceCharts.destroy();
      }

      this.uriCacheMaintenanceCharts = Highcharts.chart('uriCacheMaintenanceChartsContainer', {
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
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });

      if (!this.charts.includes(this.uriCacheMaintenanceCharts)) {
        this.charts.push(this.uriCacheMaintenanceCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getAppPoolMetrics(): void {
    this.iisMonitoringApiService.getAppPoolMetrics(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getAppPoolMetricsCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getAppPoolMetricsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const pools = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k =>
              k !== 'time_bucket' &&
              k !== 'total' &&
              typeof item[k] === 'object'
            )
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (pools.length === 0) {
        if (this.appPoolMetricsCharts) {
          this.appPoolMetricsCharts.destroy();
        }

        this.appPoolMetricsCharts = Highcharts.chart('appPoolMetricsChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 86400000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const innerKeys = Array.from(
        new Set(
          data.flatMap(d =>
            pools.flatMap(pool =>
              d[pool] ? Object.keys(d[pool]) : []
            )
          )
        )
      );

      const series: Highcharts.SeriesSplineOptions[] = [];

      pools.forEach(pool => {
        innerKeys.forEach(innerKey => {
          series.push({
            name: `${pool} - ${innerKey}`,
            data: data.map(d => {
              const poolObj = d[pool];
              if (!poolObj || poolObj[innerKey] == null) {
                return null;
              }
              const v = Number(poolObj[innerKey]);
              return isNaN(v) ? null : v;
            }),
            type: 'spline',
            marker: { radius: 2 },
            lineWidth: 1,
          });
        });
      });

      if (this.appPoolMetricsCharts) {
        this.appPoolMetricsCharts.destroy();
      }

      this.appPoolMetricsCharts = Highcharts.chart('appPoolMetricsChartsContainer', {
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
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });

      if (!this.charts.includes(this.appPoolMetricsCharts)) {
        this.charts.push(this.appPoolMetricsCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getWorkerProcessStability(): void {
    this.iisMonitoringApiService.getWorkerProcessStability(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getWorkerProcessStabilityCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getWorkerProcessStabilityCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const pools = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k =>
              k !== 'time_bucket' &&
              k !== 'total' &&
              typeof item[k] === 'object'
            )
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (pools.length === 0) {
        if (this.workerProcessStabilityCharts) {
          this.workerProcessStabilityCharts.destroy();
        }

        this.workerProcessStabilityCharts = Highcharts.chart('workerProcessStabilityChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 86400000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const innerKeys = Array.from(
        new Set(
          data.flatMap(d =>
            pools.flatMap(pool =>
              d[pool] ? Object.keys(d[pool]) : []
            )
          )
        )
      );

      const series: Highcharts.SeriesSplineOptions[] = [];

      pools.forEach(pool => {
        innerKeys.forEach(innerKey => {
          series.push({
            name: `${pool} - ${innerKey}`,
            data: data.map(d => {
              const poolObj = d[pool];
              if (!poolObj || poolObj[innerKey] == null) {
                return null;
              }
              const v = Number(poolObj[innerKey]);
              return isNaN(v) ? null : v;
            }),
            type: 'spline',
            marker: { radius: 2 },
            lineWidth: 1,
          });
        });
      });

      if (this.workerProcessStabilityCharts) {
        this.workerProcessStabilityCharts.destroy();
      }

      this.workerProcessStabilityCharts = Highcharts.chart('workerProcessStabilityChartsContainer', {
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
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });

      if (!this.charts.includes(this.workerProcessStabilityCharts)) {
        this.charts.push(this.workerProcessStabilityCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getWorkerProcessFailure(): void {
    this.iisMonitoringApiService.getWorkerProcessFailure(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getWorkerProcessFailureCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getWorkerProcessFailureCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const pools = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k =>
              k !== 'time_bucket' &&
              k !== 'total' &&
              typeof item[k] === 'object'
            )
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (pools.length === 0) {
        if (this.workerProcessFailureCharts) {
          this.workerProcessFailureCharts.destroy();
        }

        this.workerProcessFailureCharts = Highcharts.chart('workerProcessFailureChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 86400000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const innerKeys = Array.from(
        new Set(
          data.flatMap(d =>
            pools.flatMap(pool =>
              d[pool] ? Object.keys(d[pool]) : []
            )
          )
        )
      );

      const series: Highcharts.SeriesSplineOptions[] = [];

      pools.forEach(pool => {
        innerKeys.forEach(innerKey => {
          series.push({
            name: `${pool} - ${innerKey}`,
            data: data.map(d => {
              const poolObj = d[pool];
              if (!poolObj || poolObj[innerKey] == null) {
                return null;
              }
              const v = Number(poolObj[innerKey]);
              return isNaN(v) ? null : v;
            }),
            type: 'spline',
            marker: { radius: 2 },
            lineWidth: 1,
          });
        });
      });

      if (this.workerProcessFailureCharts) {
        this.workerProcessFailureCharts.destroy();
      }

      this.workerProcessFailureCharts = Highcharts.chart('workerProcessFailureChartsContainer', {
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
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });

      if (!this.charts.includes(this.workerProcessFailureCharts)) {
        this.charts.push(this.workerProcessFailureCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getWorkerProcessCreation(): void {
    this.iisMonitoringApiService.getWorkerProcessCreation(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getWorkerProcessCreationCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getWorkerProcessCreationCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const pools = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k =>
              k !== 'time_bucket' &&
              k !== 'total' &&
              typeof item[k] === 'object'
            )
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (pools.length === 0) {
        if (this.workerProcessCreationCharts) {
          this.workerProcessCreationCharts.destroy();
        }

        this.workerProcessCreationCharts = Highcharts.chart('workerProcessCreationChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          noData: { style: { display: 'none' } },
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 86400000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const innerKeys = Array.from(
        new Set(
          data.flatMap(d =>
            pools.flatMap(pool =>
              d[pool] ? Object.keys(d[pool]) : []
            )
          )
        )
      );

      const series: Highcharts.SeriesSplineOptions[] = [];

      pools.forEach(pool => {
        innerKeys.forEach(innerKey => {
          series.push({
            name: `${pool} - ${innerKey}`,
            data: data.map(d => {
              const poolObj = d[pool];
              if (!poolObj || poolObj[innerKey] == null) {
                return null;
              }
              const v = Number(poolObj[innerKey]);
              return isNaN(v) ? null : v;
            }),
            type: 'spline',
            marker: { radius: 2 },
            lineWidth: 1,
          });
        });
      });

      if (this.workerProcessCreationCharts) {
        this.workerProcessCreationCharts.destroy();
      }

      this.workerProcessCreationCharts = Highcharts.chart('workerProcessCreationChartsContainer', {
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
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });

      if (!this.charts.includes(this.workerProcessCreationCharts)) {
        this.charts.push(this.workerProcessCreationCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
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


}
