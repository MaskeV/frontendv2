import { AfterViewInit, Component, OnDestroy, OnInit } from "@angular/core";
import { filter, Subject, Subscription, switchMap, takeUntil } from "rxjs";
import { HighchartsChartModule } from "highcharts-angular";
import { CommonModule } from "@angular/common";
import Highcharts from "highcharts";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { DateService } from "../../../services/date.service";
import { RedisService } from "../../../services/redis.service";
import { MeteringConfigService } from "../../../services/metering-config.service";

@Component({
  selector: "app-redis",
  imports: [CommonModule, HighchartsChartModule, RouterModule],
  templateUrl: "./redis.component.html",
  styleUrl: "./redis.component.css"
})
export class RedisComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  selectedEntity!: any;
  entityId!: any;
  redisEncryptedInstance!: any;
  instanceEntityId!: any;
  redisStats: any;
  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  startTime!: number;
  thresholdst!: number;
  endTime!: number;
  Highcharts: typeof Highcharts = Highcharts;

  charts: Highcharts.Chart[] = [];

  memoryUsageChart: Highcharts.Chart | null = null;
  redisUptimeChart: Highcharts.Chart | null = null;
  networkMetricsChart: Highcharts.Chart | null = null;
  dBKeysChart: Highcharts.Chart | null = null;
  clientMetricsChart: Highcharts.Chart | null = null;
  hitRateChart: Highcharts.Chart | null = null;
  totalCommandRateChart: Highcharts.Chart | null = null;
  averageTimeSpentChart: Highcharts.Chart | null = null;

  avgHitRate: number = 0;
  avgMemoryUsage: number = 0;

  memoryUsage: any = {};
  totalSeconds: any;
  redisInstances: any;
  objectKeys = Object.keys;

  constructor(
    private router: Router,
    private dateService: DateService,
    private redisService: RedisService,
    private meteringConfigService: MeteringConfigService
  ) { }

  ngOnInit(): void {
    this.selectedEntity = sessionStorage.getItem("redis");
    this.entityId = btoa(this.selectedEntity) + ".1";
    this.dateService.setActiveComponent("RedisListComponent");
    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter((activeComponent) => activeComponent === "RedisListComponent"),
        switchMap(() => this.dateService.date$)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.loadInitialData();
      });
  }

  loadInitialData(): void {
    this.loadStats();
    this.getMemoryUsage();
    this.getHitRate();
    this.getNetworkMetrics();
    this.getDBKeysMetrics();
    this.getTotalCommandRate();
    this.getClientMetrics();
    this.getRedisUptime();
    this.getAverageTimeSpent();
    this.fetchRedisInstances();
    this.getThreshold();
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "");
    return parseInt(date);
  }

  formatUptime(seconds: number): string {
    if (!seconds || seconds < 0) return "0m";

    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;

    return result.trim();
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

  loadData(tabName: string): void {
    this.destroy$.next();
    switch (tabName) {
      case "overview":
        this.getThresholdsByComponent();
        this.loadStats();
        this.getMemoryUsage();
        this.getHitRate();
        this.getNetworkMetrics();
        this.getDBKeysMetrics();
        this.getTotalCommandRate();
        this.getClientMetrics();
        this.getRedisUptime();
        this.getAverageTimeSpent();
        break;
    }
  }

  gotoRedisDetails() {
    this.router.navigate(["/redis"]);
  }

  gotoRedisInstanceDetails(selectedInstance: string) {
    this.redisEncryptedInstance = btoa(selectedInstance);
    this.instanceEntityId = this.entityId + "_" + this.redisEncryptedInstance;
    sessionStorage.setItem("selectedRedisInstance", this.instanceEntityId);
    sessionStorage.setItem("redisInstance", selectedInstance);
    this.router.navigate(["/redis/instance-details"]);
  }

  thresholds: any = {};
  getThreshold() {
    const appId = sessionStorage.getItem('redisId');
    const payload = {
      appId: appId,
      serviceId: this.entityId,
      st: this.thresholdst,
      et: this.endTime,
      type: "REDIS"
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
    this.meteringConfigService.getThresholdsByComponent(this.entityId, "REDIS")
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

  loadStats(): void {
    this.redisService
      .getLatestRedisStats(
        this.entityId,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (data) => {
          if (data) {
            this.redisStats = data;
          } else {
            this.redisStats = {
              meter_redis_db_keys: 0,
              meter_redis_connected_clients: 0,
              meter_redis_expired_keys_total: 0,
              meter_redis_memory_usage: 0,
              meter_redis_blocked_clients: 0,
              meter_redis_uptime: 0,
              meter_redis_evicted_keys_total: 0,
            };
          }
        },
        error: (err) => {
          console.error('Failed to load Redis stats:', err);
          this.redisStats = {
            meter_redis_db_keys: 0,
            meter_redis_connected_clients: 0,
            meter_redis_expired_keys_total: 0,
            meter_redis_memory_usage: 0,
            meter_redis_blocked_clients: 0,
            meter_redis_uptime: 0,
            meter_redis_evicted_keys_total: 0,
          };
        },
      });
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1;
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }

  getMemoryUsage(): void {
    this.redisService.getMemoryUsage(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.avgMemoryUsage = data.latency;
          this.getMemoryUsageCharts(data.latencyTimeSeries);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getMemoryUsageCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.memoryUsageChart) {
          this.memoryUsageChart.destroy();
        }

        this.memoryUsageChart = Highcharts.chart('memoryUsageChartContainer', {
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
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_redis_memory_usage', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.memoryUsageChart) {
        this.memoryUsageChart.destroy();
      }

      const baseline = this.thresholds?.meter_redis_memory_usage?.avgBaseline || this.avgMemoryUsage;

      this.memoryUsageChart = Highcharts.chart('memoryUsageChartContainer', {
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
      if (!this.charts.includes(this.memoryUsageChart)) {
        this.charts.push(this.memoryUsageChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getHitRate(): void {
    this.redisService.getHitRate(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.avgHitRate = data.latency;
          this.getHitRateCharts(data.latencyTimeSeries);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getHitRateCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.hitRateChart) {
          this.hitRateChart.destroy();
        }

        this.hitRateChart = Highcharts.chart('hitRateChartContainer', {
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
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_redis_hit_rate', y) : {};
          return {
            y,
            color: threshold.color
          };
        })

      }));

      if (this.hitRateChart) {
        this.hitRateChart.destroy();
      }

      const baseline = this.thresholds?.meter_redis_hit_rate?.avgBaseline || this.avgHitRate;

      this.hitRateChart = Highcharts.chart('hitRateChartContainer', {
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
      if (!this.charts.includes(this.hitRateChart)) {
        this.charts.push(this.hitRateChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkMetrics(): void {
    this.redisService.getNetworkMetrics(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getNetworkMetricsCharts(data.bytesTimeSeries);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getNetworkMetricsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.networkMetricsChart) {
          this.networkMetricsChart.destroy();
        }

        this.networkMetricsChart = Highcharts.chart('networkMetricsChartContainer', {
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

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: key,
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.2,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.networkMetricsChart) {
        this.networkMetricsChart.destroy();
      }

      this.networkMetricsChart = Highcharts.chart('networkMetricsChartContainer', {
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
      if (!this.charts.includes(this.networkMetricsChart)) {
        this.charts.push(this.networkMetricsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getDBKeysMetrics(): void {
    this.redisService.getDBKeysMetrics(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getDBKeysMetricsCharts(data.dbKeysMetricsTimeSeries);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getDBKeysMetricsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.dBKeysChart) {
          this.dBKeysChart.destroy();
        }

        this.dBKeysChart = Highcharts.chart('dBKeysChartContainer', {
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

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: key,
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.2,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.dBKeysChart) {
        this.dBKeysChart.destroy();
      }

      this.dBKeysChart = Highcharts.chart('dBKeysChartContainer', {
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
      if (!this.charts.includes(this.dBKeysChart)) {
        this.charts.push(this.dBKeysChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getRedisUptime(): void {
    this.redisService.getRedisUptime(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getRedisUptimeCharts(data.latencyTimeSeries);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getRedisUptimeCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.redisUptimeChart) {
          this.redisUptimeChart.destroy();
        }

        this.redisUptimeChart = Highcharts.chart('redisUptimeChartContainer', {
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

      if (this.redisUptimeChart) {
        this.redisUptimeChart.destroy();
      }

      this.redisUptimeChart = Highcharts.chart('redisUptimeChartContainer', {
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
      if (!this.charts.includes(this.redisUptimeChart)) {
        this.charts.push(this.redisUptimeChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getClientMetrics(): void {
    this.redisService.getClientMetrics(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getClientMetricsCharts(data.clientsTimeSeries);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getClientMetricsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.clientMetricsChart) {
          this.clientMetricsChart.destroy();
        }

        this.clientMetricsChart = Highcharts.chart('clientMetricsChartContainer', {
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

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: key,
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.2,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.clientMetricsChart) {
        this.clientMetricsChart.destroy();
      }

      this.clientMetricsChart = Highcharts.chart('clientMetricsChartContainer', {
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
      if (!this.charts.includes(this.clientMetricsChart)) {
        this.charts.push(this.clientMetricsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getTotalCommandRate(): void {
    this.redisService.getTotalCommandRate(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getTotalCommandRateCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getTotalCommandRateCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.totalCommandRateChart) {
          this.totalCommandRateChart.destroy();
        }

        this.totalCommandRateChart = Highcharts.chart('totalCommandRateChartContainer', {
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

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: key,
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.2,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.totalCommandRateChart) {
        this.totalCommandRateChart.destroy();
      }

      this.totalCommandRateChart = Highcharts.chart('totalCommandRateChartContainer', {
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
      if (!this.charts.includes(this.totalCommandRateChart)) {
        this.charts.push(this.totalCommandRateChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getAverageTimeSpent(): void {
    this.redisService.getAverageTimeSpent(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getAverageTimeSpentCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getAverageTimeSpentCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        if (this.averageTimeSpentChart) {
          this.averageTimeSpentChart.destroy();
        }

        this.averageTimeSpentChart = Highcharts.chart('averageTimeSpentChartContainer', {
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

      if (this.averageTimeSpentChart) {
        this.averageTimeSpentChart.destroy();
      }

      this.averageTimeSpentChart = Highcharts.chart('averageTimeSpentChartContainer', {
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
      if (!this.charts.includes(this.averageTimeSpentChart)) {
        this.charts.push(this.averageTimeSpentChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  fetchRedisInstances(): void {
    this.redisService
      .getRedisInstances(
        this.entityId,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (res) => {
          if (res) {
            this.redisInstances = res;
          } else {
            this.redisInstances = {};
          }
        },
        error: (err) => {
          console.error("Failed to load Redis instances:", err);
          this.redisInstances = {};
        },
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
}
