import { Component, OnDestroy, OnInit } from '@angular/core';
import Highcharts from 'highcharts';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../../services/date.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HighchartsChartModule } from 'highcharts-angular';
import { OracleApiService } from '../../../../../services/oracle-api.service';
import { MeteringConfigService } from '../../../../../services/metering-config.service';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-oracle-instance',
  imports: [
    FormsModule,
    CommonModule,
    RouterModule,
    HighchartsChartModule,
    MatTooltip
  ],
  templateUrl: './oracle-instance.component.html',
  styleUrl: './oracle-instance.component.css'
})


export class OracleInstanceComponent implements OnInit, OnDestroy {
  private themeObserver: MutationObserver | undefined;

  Highcharts: typeof Highcharts = Highcharts;

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  thresholdst!: number;
  endTime!: number;

  selectedService!: string;
  selectedService2!: string;
  entityId!: string;
  serviceId!: string;

  combinedData: any;
  upTime: any;
  sinceWhenUptime: any;

  charts: Highcharts.Chart[] = [];
  sessionDetailsCharts: Highcharts.Chart | null = null;
  sessionUtilizationChart: Highcharts.Chart | null = null;
  processDetailsChart: Highcharts.Chart | null = null;
  bufferCacheHitRatioChart: Highcharts.Chart | null = null;
  openCursorChart: Highcharts.Chart | null = null;
  deadlockChart: Highcharts.Chart | null = null;
  userErrorChart: Highcharts.Chart | null = null;
  connectionErrorChart: Highcharts.Chart | null = null;
  currentQpsChart: Highcharts.Chart | null = null;
  slowQueryRateChart: Highcharts.Chart | null = null;
  commandTrendChart: Highcharts.Chart | null = null;
  connectsDetailsChart: Highcharts.Chart | null = null;
  locksDetailsChart: Highcharts.Chart | null = null;
  staleQueriesChart: Highcharts.Chart | null = null;

  sessionUtilizationTimestamps: number[] = [];
  processDetailsTimestamps: number[] = [];
  bufferCacheHitRatioTimestamps: number[] = [];
  openCursorTimestamps: number[] = [];
  deadlockTimestamps: number[] = [];
  userErrorTimestamps: number[] = [];
  connectionErrorTimestamps: number[] = [];
  currentQpsTimestamps: number[] = [];
  slowQueryRateTimestamps: number[] = [];
  staleQueriesTimestamps: number[] = [];

  roundUpto: number = 1000
  avgSessionUtilization: number = 0;
  avgBufferCacheRatio: number = 0;
  avgUserError: number = 0;
  avgConnectionError: number = 0;
  avgDeadlocks: number = 0;
  avgSlowQueryRate: number = 0;
  avgStaleQueries: number = 0;

  tooltips: Record<string, string> = {
    qps: "Queries per second; higher means better throughput.",
    stale: "Long-running or inactive queries consuming resources.",
    slow: "Queries exceeding execution time threshold.",
    bufferCache: "Memory hit ratio; higher reduces disk reads.",
    openCursor: "Open cursors; high values may indicate leaks.",
    process: "Database process usage and distribution.",
    connection: "Active and total DB connections.",
    command: "SQL command execution trend over time.",
    locks: "Locks that may block other operations.",
    sessionDetails: "Active vs inactive session breakdown.",
    sessionUtil: "Session usage vs total capacity.",
    userError: "Errors from invalid queries or operations.",
    connectionError: "Failed DB connection attempts.",
    deadlock: "Sessions blocking each other.",
    procedures: "Stored procedure details.",
    functions: "Database function details.",
    packages: "Database package details.",
    locksType: "Lock distribution by type.",
    procExec: "Stored procedure executions count.",
    procError: "Procedure execution errors."
  };

  chart_criteria: string | null = 'avg';

  pagedContainerId: any;


  constructor(
    private dateService: DateService,
    private oracleApiService: OracleApiService,
    private meteringConfigService: MeteringConfigService
  ) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.selectedService = sessionStorage.getItem('serviceIdForOracle')!;
    this.selectedService2 = sessionStorage.getItem('OracleInstanceServiceId')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForOracle')!;
    this.entityId = sessionStorage.getItem('OracleInstanceEncodedServiceId')!;
    this.dateService.setActiveComponent('OracleInstanceComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'OracleInstanceComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    this.themeObserver?.disconnect();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
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

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1; // 0-based index
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }


  loadData(): void {
    this.getInstanceCombinedData();
    this.getSessionDetails();
    this.getSessionUtilization();
    this.getProcessDetails();
    this.getBufferCacheHitRatio();
    this.getOpenCursor();
    this.getDeadlock();
    this.getUserError();
    this.getConnectionError();
    this.getCurrentQps();
    this.getSlowQueryRate();
    this.getCommandTrend();
    this.getConnectsDetails();
    this.getLockDetails();
    this.getStaleQueryCount();
  }

  getInstanceCombinedData(): void {
    this.oracleApiService.getInstanceCombinedData(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.combinedData = data;
      if (this.combinedData.uptime) {
        this.upTime = this.formatUptime(data.uptime);
      }
      else {
        this.upTime = null;
      }
    })
  }

  formatUptime(seconds: number | null | undefined): string {
    if (seconds == null || isNaN(seconds)) {
      return `0d 0h <span class="small-time">0m 0s</span>`;
    }

    let days = Math.floor(seconds / 86400);
    let hours = Math.floor((seconds % 86400) / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let secs = Math.floor(seconds % 60);

    const totalDaysFloat = seconds / 86400;

    // Calculate "since when"
    const endStr = this.endTime.toString();

    // Parse components
    const year = Number(endStr.substring(0, 4));
    const month = Number(endStr.substring(4, 6)) - 1; // JS months = 0-11
    const day = Number(endStr.substring(6, 8));
    const hour = Number(endStr.substring(8, 10));
    const minute = Number(endStr.substring(10, 12));

    // Create end-time with seconds = 59
    const endDate = new Date(year, month, day, hour, minute, 59);

    // Now calculate "since when" from uptime
    const sinceWhenDate = new Date(endDate.getTime() - seconds * 1000);

    // Format as needed
    this.sinceWhenUptime = sinceWhenDate.toLocaleString();

    console.log("Since When : ", this.sinceWhenUptime);

    // ----- FORMAT OUTPUT -----

    let formatted = '';

    if (totalDaysFloat < 1) {
      // Less than 1 day
      formatted = `${hours}h <span class="small-time">${minutes}m ${secs}s</span>`;
    } else if (totalDaysFloat < 30) {
      // Less than a month
      formatted = `${days}d ${hours}h`;
    } else if (totalDaysFloat < 365) {
      // Less than a year
      const months = Math.floor(totalDaysFloat / 30);
      const remDays = Math.floor(totalDaysFloat % 30);
      formatted = `${months}mo ${remDays}d`;
    } else {
      // More than or equal to a year
      const years = Math.floor(totalDaysFloat / 365);
      const months = Math.floor((totalDaysFloat % 365) / 30);
      formatted = `${years}y ${months}mo`;
    }

    return formatted;
  }

  thresholds: any = {};
  
  getThreshold() {
    const appId = sessionStorage.getItem('oracleId');
    const payload = {
      appId: appId,
      serviceId: this.entityId,
      st: this.thresholdst,
      et: this.endTime,
      type: "RELATIONAL"
    };
    this.meteringConfigService.getThreshold(payload)
      .subscribe({
        next: (res: any) => {

          if (res && typeof res === 'object' && !Array.isArray(res) && Object.keys(res).length === 0) {
            this.getThresholdsByComponent();
            return;
          }

          if (!res || typeof res !== "object" || Array.isArray(res)) {
            console.error("Invalid threshold response structure:", res);
            return;
          }

          const invalidEntry = Object.values(res).some((item: any) => {
            if (!item || typeof item !== "object") {
              return true;
            }

            const { criticalValue, warningValue, avgBaseline } = item;

            if (
              (typeof criticalValue === "number" && criticalValue < 0) ||
              (typeof warningValue === "number" && warningValue < 0) ||
              (typeof avgBaseline === "number" && avgBaseline < 0)
            ) {
              return true;
            }

            return false;
          });

          if (invalidEntry) {
            console.error("Invalid or negative values found in threshold response. Ignoring response:", res);
            return;
          }

          this.thresholds = res;
        },

        error: (err) => {
          console.error("Failed to load threshold data:", err);
        }
      });
  }

  getThresholdsByComponent(): void {
    this.meteringConfigService.getThresholdsByComponent(this.entityId, "DB")
      .subscribe({
        next: (data) => {
          this.thresholds = data;
        },
        error: (err) => console.error('Error loading thresholds:', err)
      });
  }

  getThresholdDisplay(metric: string, actualValue: number): { value: number, color: string } {
    if (!this.thresholds || !this.thresholds[metric] || actualValue == null) {
      return { value: 0, color: '#3b82f6' };
    }

    const t = this.thresholds[metric];
    const direction = t.goodDirection; // "HIGH" or "LOW"

    let displayValue = t.warningValue;
    let color = '#3A8754'; // green

    if (direction === 'LOW') {
      // lower is better → higher values are bad
      if (actualValue >= t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue >= t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }
    else if (direction === 'HIGH') {
      // higher is better → lower values are bad
      if (actualValue < t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue < t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }

    return { value: displayValue, color };
  }

  getThresholdDisplayChart(metric: string, actualValue: number): { value?: number, color?: string } {
    if (!this.thresholds || !this.thresholds[metric] || actualValue == null) {
      return {}; // <-- no color at all
    }

    const t = this.thresholds[metric];
    const direction = t.goodDirection;

    let displayValue = t.warningValue;
    let color: string | undefined;

    if (direction === 'LOW') {
      if (actualValue >= t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue >= t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    } else if (direction === 'HIGH') {
      if (actualValue < t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue < t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }

    return { value: displayValue, color };
  }

  // SSESSION

  getSessionDetails(): void {
    this.oracleApiService.getInstanceSessionDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.getSessionDetailsCharts(data.serviceResponse);
    })
  }

  getSessionDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.sessionDetailsCharts) {
          this.sessionDetailsCharts.destroy();
        }

        this.sessionDetailsCharts = Highcharts.chart('sessionDetailsChartsContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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

      if (this.sessionDetailsCharts) {
        this.sessionDetailsCharts.destroy();
      }

      this.sessionDetailsCharts = Highcharts.chart('sessionDetailsChartsContainer', {
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
      if (!this.charts.includes(this.sessionDetailsCharts)) {
        this.charts.push(this.sessionDetailsCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getSessionUtilization(): void {
    let consSum = 0;
    this.oracleApiService.getInstanceSessionUtilization(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['_instance_session_utilization'] !== null) {
              consSum += element['_instance_session_utilization']
            }
          });
          this.avgSessionUtilization = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getSessionUtilizationCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getSessionUtilizationCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.sessionUtilizationChart) {
          this.sessionUtilizationChart.destroy();
        }

        this.sessionUtilizationChart = Highcharts.chart('sessionUtilizationChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_session_utilization', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.sessionUtilizationChart) {
        this.sessionUtilizationChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_session_utilization?.avgBaseline || this.avgSessionUtilization;
      this.sessionUtilizationTimestamps = parsedDates.map(date => date.getTime());

      this.sessionUtilizationChart = Highcharts.chart('sessionUtilizationChartContainer', {
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
          tickColor: gridColor,
        },
        yAxis: {
          min: 0,
          max: 100,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.sessionUtilizationChart)) {
        this.charts.push(this.sessionUtilizationChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // PROCESS

  getProcessDetails(): void {
    this.oracleApiService.getInstanceProcessDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.getProcessDetailsCharts(data.serviceResponse);
    })
  }

  getProcessDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.processDetailsChart) {
          this.processDetailsChart.destroy();
        }

        this.processDetailsChart = Highcharts.chart('processDetailsChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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

      if (this.processDetailsChart) {
        this.processDetailsChart.destroy();
      }

      this.processDetailsChart = Highcharts.chart('processDetailsChartContainer', {
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
      if (!this.charts.includes(this.processDetailsChart)) {
        this.charts.push(this.processDetailsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // BUFFER AND CACHE

  getBufferCacheHitRatio(): void {
    let consSum = 0;
    this.oracleApiService.getInstanceBufferCacheHitRatio(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['_instance_buffer_cache_hit_ratio'] !== null) {
              consSum += element['_instance_buffer_cache_hit_ratio']
            }
          });
          this.avgBufferCacheRatio = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getBufferCacheHitRatioCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getBufferCacheHitRatioCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.bufferCacheHitRatioChart) {
          this.bufferCacheHitRatioChart.destroy();
        }

        this.bufferCacheHitRatioChart = Highcharts.chart('bufferCacheHitRatioChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_buffer_cache_hit_ratio', y) : {};
          return {
            y,
            color: threshold.color
          };
        })

      }));

      if (this.bufferCacheHitRatioChart) {
        this.bufferCacheHitRatioChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_buffer_cache_hit_ratio?.avgBaseline || this.avgBufferCacheRatio;
      this.bufferCacheHitRatioTimestamps = parsedDates.map(date => date.getTime());

      this.bufferCacheHitRatioChart = Highcharts.chart('bufferCacheHitRatioChartContainer', {
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
          tickColor: gridColor,
        },
        yAxis: {
          min: 0,
          max: 100,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.bufferCacheHitRatioChart)) {
        this.charts.push(this.bufferCacheHitRatioChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getOpenCursor(): void {
    this.oracleApiService.getInstanceOpenCursor(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.getOpenCursorCharts(data.serviceResponse);
    })
  }

  getOpenCursorCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.openCursorChart) {
          this.openCursorChart.destroy();
        }

        this.openCursorChart = Highcharts.chart('openCursorChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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

      if (this.openCursorChart) {
        this.openCursorChart.destroy();
      }

      this.openCursorChart = Highcharts.chart('openCursorChartContainer', {
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
      if (!this.charts.includes(this.openCursorChart)) {
        this.charts.push(this.openCursorChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // ERROR AND DEADLOCK

  getDeadlock(): void {
    let consSum = 0;
    this.oracleApiService.getInstanceDeadlock(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['_instance_deadlocks'] !== null) {
              consSum += element['_instance_deadlocks']
            }
          });
          this.avgDeadlocks = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getDeadlockCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getDeadlockCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.deadlockChart) {
          this.deadlockChart.destroy();
        }

        this.deadlockChart = Highcharts.chart('deadlockChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_deadlocks', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.deadlockChart) {
        this.deadlockChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_deadlocks?.avgBaseline || this.avgDeadlocks;
      this.deadlockTimestamps = parsedDates.map(date => date.getTime());

      this.deadlockChart = Highcharts.chart('deadlockChartContainer', {
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
          tickColor: gridColor,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.deadlockChart)) {
        this.charts.push(this.deadlockChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getUserError(): void {
    let consSum = 0;
    this.oracleApiService.getInstanceUserError(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['_instance_user_errors'] !== null) {
              consSum += element['_instance_user_errors']
            }
          });
          this.avgUserError = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getUserErrorCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getUserErrorCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.userErrorChart) {
          this.userErrorChart.destroy();
        }

        this.userErrorChart = Highcharts.chart('userErrorChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_user_errors', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.userErrorChart) {
        this.userErrorChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_user_errors?.avgBaseline || this.avgUserError;
      this.userErrorTimestamps = parsedDates.map(date => date.getTime());

      this.userErrorChart = Highcharts.chart('userErrorChartContainer', {
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
          tickColor: gridColor,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.userErrorChart)) {
        this.charts.push(this.userErrorChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getConnectionError(): void {
    let consSum = 0;
    this.oracleApiService.getInstanceConnectionError(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['_instance_connection_errors'] !== null) {
              consSum += element['_instance_connection_errors']
            }
          });
          this.avgConnectionError = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getConnectionErrorCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getConnectionErrorCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.connectionErrorChart) {
          this.connectionErrorChart.destroy();
        }

        this.connectionErrorChart = Highcharts.chart('connectionErrorChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_connection_errors', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.connectionErrorChart) {
        this.connectionErrorChart.destroy();
      }
      const baseline = this.thresholds?.meter_oracle_connection_errors?.avgBaseline || this.avgConnectionError;
      this.connectionErrorTimestamps = parsedDates.map(date => date.getTime());

      this.connectionErrorChart = Highcharts.chart('connectionErrorChartContainer', {
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
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.connectionErrorChart)) {
        this.charts.push(this.connectionErrorChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getCurrentQps(): void {
    this.oracleApiService.getInstanceCurrentQps(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.getCurrentQpsCharts(data.serviceResponse);
    })
  }

  getCurrentQpsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.currentQpsChart) {
          this.currentQpsChart.destroy();
        }

        this.currentQpsChart = Highcharts.chart('currentQpsChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_qps', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.currentQpsChart) {
        this.currentQpsChart.destroy();
      }

      const baseline = this.thresholds?.meter_mysql_qps?.avgBaseline || this.combinedData?.avg_qps;

      this.currentQpsTimestamps = parsedDates.map(date => date.getTime());

      this.currentQpsChart = Highcharts.chart('currentQpsChartContainer', {
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
          tickColor: gridColor,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.currentQpsChart)) {
        this.charts.push(this.currentQpsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getCommandTrend(): void {
    this.oracleApiService.getInstanceCommandTrend(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.getCommandTrendCharts(data.serviceResponse);
    })
  }

  getCommandTrendCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.commandTrendChart) {
          this.commandTrendChart.destroy();
        }

        this.commandTrendChart = Highcharts.chart('commandTrendChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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

      if (this.commandTrendChart) {
        this.commandTrendChart.destroy();
      }

      this.commandTrendChart = Highcharts.chart('commandTrendChartContainer', {
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
      if (!this.charts.includes(this.commandTrendChart)) {
        this.charts.push(this.commandTrendChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getSlowQueryRate(): void {
    let consSum = 0;
    this.oracleApiService.getInstanceSlowQueryRate(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['_instance_connection_errors'] !== null) {
              consSum += element['_instance_connection_errors']
            }
          });
          this.avgSlowQueryRate = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getSlowQueryRateCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getSlowQueryRateCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.slowQueryRateChart) {
          this.slowQueryRateChart.destroy();
        }

        this.slowQueryRateChart = Highcharts.chart('slowQueryRateChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_slow_queries_count', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.slowQueryRateChart) {
        this.slowQueryRateChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_slow_queries_count?.avgBaseline || this.avgSlowQueryRate;
      this.slowQueryRateTimestamps = parsedDates.map(date => date.getTime());

      this.slowQueryRateChart = Highcharts.chart('slowQueryRateChartContainer', {
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
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.slowQueryRateChart)) {
        this.charts.push(this.slowQueryRateChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getConnectsDetails(): void {
    this.oracleApiService.getInstanceConnectsDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.getConnectsDetailsCharts(data.serviceResponse);
    })
  }

  getConnectsDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.connectsDetailsChart) {
          this.connectsDetailsChart.destroy();
        }

        this.connectsDetailsChart = Highcharts.chart('connectsDetailsChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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

      if (this.connectsDetailsChart) {
        this.connectsDetailsChart.destroy();
      }

      this.connectsDetailsChart = Highcharts.chart('connectsDetailsChartContainer', {
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
      if (!this.charts.includes(this.connectsDetailsChart)) {
        this.charts.push(this.connectsDetailsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getLockDetails(): void {
    this.oracleApiService.getInstanceLockDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.getLockDetailsCharts(data.serviceResponse);
    })
  }

  getLockDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.locksDetailsChart) {
          this.locksDetailsChart.destroy();
        }

        this.locksDetailsChart = Highcharts.chart('locksDetailsChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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

      if (this.locksDetailsChart) {
        this.locksDetailsChart.destroy();
      }

      this.locksDetailsChart = Highcharts.chart('locksDetailsChartContainer', {
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
      if (!this.charts.includes(this.locksDetailsChart)) {
        this.charts.push(this.locksDetailsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getStaleQueryCount(): void {
    let consSum = 0;
    this.oracleApiService.getInstanceStaleQueryCount(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['_instance_stale_queries'] !== null) {
              consSum += element['_instance_stale_queries']
            }
          });
          this.avgStaleQueries = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getStaleQueryCountCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getStaleQueryCountCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.staleQueriesChart) {
          this.staleQueriesChart.destroy();
        }

        this.staleQueriesChart = Highcharts.chart('staleQueriesChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
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
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_stale_queries', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.staleQueriesChart) {
        this.staleQueriesChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_stale_queries?.avgBaseline || this.avgStaleQueries;
      this.staleQueriesTimestamps = parsedDates.map(date => date.getTime());

      this.staleQueriesChart = Highcharts.chart('staleQueriesChartContainer', {
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
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.staleQueriesChart)) {
        this.charts.push(this.staleQueriesChart);
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