import { AfterViewInit, Component, OnDestroy, OnInit } from "@angular/core";
import { filter, Subject, Subscription, switchMap } from "rxjs";
import { HighchartsChartModule } from "highcharts-angular";
import { CommonModule } from "@angular/common";
import Highcharts from "highcharts";
import { Router, RouterModule } from "@angular/router";
import { DateService } from "../../../../services/date.service";
import { RedisService } from "../../../../services/redis.service";

@Component({
    selector: "app-redis-instance",
    imports: [CommonModule, HighchartsChartModule, RouterModule],
    templateUrl: "./redis-instance.component.html",
    styleUrl: "./redis-instance.component.css"
})
export class RedisInstanceComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  private destroy$ = new Subject<void>();
  selectedEntity!: any;
  selectedInstance!: any;
  redisEncryptedEntity!: any;
  redisStats: any;
  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  startTime!: number;
  endTime!: number;
  Highcharts: typeof Highcharts = Highcharts;
  chartOptions!: Highcharts.Options;
  lineChartOptions!: Highcharts.Options;
  networkChartOptions!: Highcharts.Options;
  clientChartOptions!: Highcharts.Options;
  keysChartOptions!: Highcharts.Options;
  commandsChartOptions!: Highcharts.Options;
  averageTimeChartOptions!: Highcharts.Options;
  commandDurationChartOptions!: Highcharts.Options;
  uptimeChartOptions!: Highcharts.Options;
  memoryUsage: any = {};
  totalSeconds: any;

  constructor(
    private router: Router,
    private dateService: DateService,
    private redisService: RedisService
  ) {}

  ngOnInit(): void {
    this.selectedEntity = sessionStorage.getItem("redis");
    this.selectedInstance = sessionStorage.getItem("redisInstance");
    this.redisEncryptedEntity = sessionStorage.getItem("selectedRedisInstance");
    this.dateService.setActiveComponent("RedisListComponent");
    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter((activeComponent) => activeComponent === "RedisListComponent"),
        switchMap(() => this.dateService.date$)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.loadInitialData();
      });
  }

  loadInitialData(): void {
    this.loadStats();
    this.initMemoryUsageChart();
    this.initHitRateChart();
    this.initNetworkChart();
    this.initDBKeysChart();
    this.initTotalCommandRateChart();
    this.initConnectedBlockedChart();
    this.initUptimeChart();
    this.initAverageTimeSpentByCommandChart();
    this.initCommandDurationSecondsTotalRateChart();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  loadData(tabName: string): void {
    this.destroy$.next();
    switch (tabName) {
      case "overview":
        this.loadStats();
        this.initMemoryUsageChart();
        this.initHitRateChart();
        this.initNetworkChart();
        this.initDBKeysChart();
        this.initTotalCommandRateChart();
        this.initConnectedBlockedChart();
        this.initUptimeChart();
        this.initAverageTimeSpentByCommandChart();
        this.initCommandDurationSecondsTotalRateChart();
        break;
    }
  }

  gotoRedisDetails() {
    this.router.navigate(["/redis"]);
  }

   gotoRedisService() {
    this.router.navigate(["/redis/details"]);
  }

  loadStats(): void {
  this.redisService
    .getInstanceLatestRedisStats(
      this.redisEncryptedEntity,
      this.startTime,
      this.endTime
    )
    .subscribe({
      next: (data) => {
        if (data) {
          this.redisStats = data;
        } else {
          this.redisStats = {
            meter_redis_instance_db_keys: 0,
            meter_redis_instance_connected_clients: 0,
            meter_redis_instance_expired_keys_total: 0,
            meter_redis_instance_memory_usage: 0,
            meter_redis_instance_redis_blocked_clients: 0,
            meter_redis_instance_uptime: 0,
            meter_redis_instance_evicted_keys_total: 0,
          };
        }
      },
      error: (err) => {
        console.error('Failed to load Redis stats:', err);
        this.redisStats = {
          meter_redis_instance_db_keys: 0,
          meter_redis_instance_connected_clients: 0,
          meter_redis_instance_expired_keys_total: 0,
          meter_redis_instance_memory_usage: 0,
          meter_redis_instance_redis_blocked_clients: 0,
          meter_redis_instance_uptime: 0,
          meter_redis_instance_evicted_keys_total: 0,
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

  private initMemoryUsageChart(): void {
    this.redisService
      .getInstanceMemoryUsage(
        this.redisEncryptedEntity,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (data) => {
          if (!data || !Array.isArray(data.latencyTimeSeries)) {
          console.error("Invalid memory usage response:", data);
          return;
        }

        const hasNegative = data.latencyTimeSeries.some(
          (item: any) => (item.memory_usage ?? 0) < 0
        );
        if (hasNegative) {
          console.error("Memory usage contains negative values. Ignoring response:", data);
          return;
        }
          this.memoryUsage = data;

          const parsedDates = data.latencyTimeSeries.map((item: any) => this.parseTimeBucket(item.time_bucket));
          let format: 'date' | 'time' = 'date';
          if (parsedDates.length > 1) {
            const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
            format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
          }

          const categories = parsedDates.map((date: any) =>
            format === 'date'
              ? date.toLocaleDateString()
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );

          const memoryData = data.latencyTimeSeries.map(
            (item: any) => item.memory_usage
          );

          // ✅ Update chart options dynamically
          this.chartOptions = {
            chart: {
              type: "area",
              backgroundColor: "transparent",
              spacing: [5, 5, 5, 5],
            },
            title: { text: "" },
            credits: { enabled: false },
            legend: { enabled: false },
            xAxis: {
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              categories: categories,
              tickPositions: [0, categories.length - 1],
              labels: { style: { color: "black", fontSize: "9px" }, y: 10 },
              tickColor: "#e0dede",
              lineColor: "#e0dede",
            },
            yAxis: {
              tickAmount: 6,
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              labels: { style: { color: "black", fontSize: "9px" } },
            },
            tooltip: {
              shared: true,
              valueSuffix: " %", // adjust unit if needed
              backgroundColor: "white",
              borderColor: "#444",
              style: { color: "black" },
            },
            plotOptions: {
              area: {
                marker: {
                  enabled: false,
                  symbol: "circle",
                  radius: 3,
                },
                fillOpacity: 0.25,
                lineWidth: 2,
                states: { hover: { lineWidth: 2 } },
              },
            },
            series: [
              {
                name: "Memory Usage",
                type: "area",
                data: memoryData,
                color: "#3b82f6",
              },
            ],
          };
        },
        error: (err) => {
          console.error("Failed to load memory usage:", err);
        },
      });
  }

  private initHitRateChart(): void {
    this.redisService
      .getInstanceHitRate(
        this.redisEncryptedEntity,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (data) => {

          if (!data || !Array.isArray(data.latencyTimeSeries)) {
            console.error("Invalid hit-rate response:", data);
            return;
          }

          const hasNegative = data.latencyTimeSeries.some(
            (item: any) => (item.uptime ?? 0) < 0
          );

          if (hasNegative) {
            console.error("Hit Rate contains negative values. Invalid response:", data);
            return;
          }
          const parsedDates = data.latencyTimeSeries.map((item: any) => this.parseTimeBucket(item.time_bucket));
          let format: 'date' | 'time' = 'date';
          if (parsedDates.length > 1) {
            const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
            format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
          }

          const categories = parsedDates.map((date: any) =>
            format === 'date'
              ? date.toLocaleDateString()
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );

          const values = data.latencyTimeSeries.map((item: any) => item.uptime);

          // Chart configuration
          this.lineChartOptions = {
            chart: {
              type: "line",
              backgroundColor: "transparent",
              spacing: [5, 5, 5, 5],
            },
            title: { text: "" },
            credits: { enabled: false },
            legend: {
              enabled: false,
              itemStyle: { color: "black", fontSize: "9px" },
            },
            xAxis: {
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              categories: categories,
              tickPositions: [0, categories.length - 1],
              labels: { style: { color: "black", fontSize: "9px" }, y: 10 },
              tickColor: "#e0dede",
              lineColor: "#e0dede",
            },
            yAxis: {
              tickAmount: 6,
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              labels: { style: { color: "black", fontSize: "9px" } },
            },
            tooltip: {
              shared: true,
              backgroundColor: "white",
              borderColor: "#444",
              style: { color: "black" },
            },
            plotOptions: {
              line: {
                marker: {
                  enabled: true,
                  radius: 2,
                  symbol: "circle",
                },
                lineWidth: 2,
              },
            },
            series: [
              {
                name: "Hit Rate",
                type: "line",
                data: values,
                color: "#be09b5ff",
              },
            ],
          };
        },
        error: (err) => {
          console.error("Failed to load hit rate:", err);
        },
      });
  }

  private initNetworkChart(): void {
    this.redisService
      .getInstanceNetworkMetrics(
        this.redisEncryptedEntity,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (data) => {

          if (!data || !Array.isArray(data.bytesTimeSeries)) {
          console.error("Invalid network metrics response:", data);
          return;
        }
        const hasNegative = data.bytesTimeSeries.some((item: any) =>
          item.net_input_bytes < 0 || item.net_output_bytes < 0
        );

        if (hasNegative) {
          console.error("Network metrics contain negative values:", data);
          return;
        }
          const parsedDates = data.bytesTimeSeries.map((item: any) => this.parseTimeBucket(item.time_bucket));
          let format: 'date' | 'time' = 'date';
          if (parsedDates.length > 1) {
            const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
            format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
          }

          const categories = parsedDates.map((date: any) =>
            format === 'date'
              ? date.toLocaleDateString()
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );

          const netInput = data.bytesTimeSeries.map(
            (item: any) => item.net_input_bytes
          );
          const netOutput = data.bytesTimeSeries.map(
            (item: any) => item.net_output_bytes
          );

          this.networkChartOptions = {
            chart: {
              type: "area",
              backgroundColor: "transparent",
              spacing: [5, 5, 5, 5],
            },
            title: { text: "" },
            credits: { enabled: false },
            legend: {
              enabled: false,
              itemStyle: { color: "black", fontSize: "9px" },
            },
            xAxis: {
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              categories: categories,
              tickPositions: [0, categories.length - 1],
              labels: { style: { color: "black", fontSize: "9px" }, y: 10 },
              tickColor: "#e0dede",
              lineColor: "#e0dede",
            },
            yAxis: {
              tickAmount: 6,
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              labels: { style: { color: "black", fontSize: "9px" } },
            },
            tooltip: {
              shared: true,
              valueSuffix: " bytes",
              backgroundColor: "white",
              borderColor: "#444",
              style: { color: "black" },
            },
            plotOptions: {
              area: {
                marker: {
                  enabled: false,
                  symbol: "circle",
                  radius: 3,
                },
                fillOpacity: 0.25,
                lineWidth: 2,
                states: { hover: { lineWidth: 2 } },
              },
            },
            series: [
              {
                name: "Net Input Bytes",
                type: "area",
                data: netInput,
                color: "#f5840bff",
              },
              {
                name: "Net Output Bytes",
                type: "area",
                data: netOutput,
                color: "#10b981",
              },
            ],
          };
        },
        error: (err) => {
           console.error("Failed to load network metrics:", err);
        },
      });
  }

  private initDBKeysChart(): void {
    this.redisService
      .getInstanceDBKeysMetrics(
        this.redisEncryptedEntity,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (data) => {
          if (!data || !Array.isArray(data.dbKeysMetricsTimeSeries)) {
          console.error("Invalid DB Keys metrics response:", data);
          return;
        }

          const hasNegative = data.dbKeysMetricsTimeSeries.some(
            (item: any) =>
              item.db_keys < 0 ||
              item.expired_keys_total < 0 ||
              item.evicted_keys_total < 0
          );

          if (hasNegative) {
            console.error(" DB Keys metrics contain negative values:", data);
            return;
          }

          const parsedDates = data.dbKeysMetricsTimeSeries.map((item: any) => this.parseTimeBucket(item.time_bucket));
          let format: 'date' | 'time' = 'date';
          if (parsedDates.length > 1) {
            const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
            format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
          }

          const categories = parsedDates.map((date: any) =>
            format === 'date'
              ? date.toLocaleDateString()
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );

          const dbKeys = data.dbKeysMetricsTimeSeries.map(
            (item: any) => item.db_keys
          );
          const expiredKeys = data.dbKeysMetricsTimeSeries.map(
            (item: any) => item.expired_keys_total
          );
          const evictedKeys = data.dbKeysMetricsTimeSeries.map(
            (item: any) => item.evicted_keys_total
          );

          this.keysChartOptions = {
            chart: {
              type: "area",
              backgroundColor: "transparent",
              spacing: [5, 5, 5, 5],
            },
            title: { text: "" },
            credits: { enabled: false },
            legend: {
              enabled: false,
              itemStyle: { color: "black", fontSize: "9px" },
            },
            xAxis: {
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              categories: categories,
              tickPositions: [0, categories.length - 1],
              labels: { style: { color: "black", fontSize: "9px" }, y: 10 },
              tickColor: "#e0dede",
              lineColor: "#e0dede",
            },
            yAxis: {
              tickAmount: 6,
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              labels: { style: { color: "black", fontSize: "9px" } },
            },
            tooltip: {
              shared: true,
              backgroundColor: "white",
              borderColor: "#444",
              style: { color: "black" },
            },
            plotOptions: {
              area: {
                marker: {
                  enabled: false,
                  symbol: "circle",
                  radius: 3,
                },
                fillOpacity: 0.25,
                lineWidth: 2,
                states: { hover: { lineWidth: 2 } },
              },
            },
            series: [
              {
                name: "DB Keys",
                type: "area",
                data: dbKeys,
                color: "#3b82f6", // blue
              },
              {
                name: "Expired Keys",
                type: "area",
                data: expiredKeys,
                color: "#f59e0b", // orange
              },
              {
                name: "Evicted Keys",
                type: "area",
                data: evictedKeys,
                color: "#ef4444", // red
              },
            ],
          };
        },
        error: (err) => {
          console.error("Failed to load DB Keys metrics:", err);
        },
      });
  }

  private initUptimeChart(): void {
    this.redisService
      .getInstanceRedisUptime(
        this.redisEncryptedEntity,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (res) => {
          if (!res || !Array.isArray(res.latencyTimeSeries)) {
          console.error("Invalid uptime response:", res);
          return;
          }

          const seriesData = res.latencyTimeSeries.map((d: any) => d.uptime);

          if (seriesData.some((v: number) => v < 0)) {
            console.error("Invalid uptime value detected (negative uptime):", seriesData);
            return;
          }
          const parsedDates = res.latencyTimeSeries.map((item: any) => this.parseTimeBucket(item.time_bucket));
          let format: 'date' | 'time' = 'date';
          if (parsedDates.length > 1) {
            const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
            format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
          }

          const categories = parsedDates.map((date: any) =>
            format === 'date'
              ? date.toLocaleDateString()
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );


          const formatSeconds = (totalSeconds: number): string => {
            const days = Math.floor(totalSeconds / (24 * 3600));
            const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            return `${days}d ${hours}h ${minutes}m`;
          };

          this.uptimeChartOptions = {
            chart: {
              type: "line",
              backgroundColor: "transparent",
              spacing: [5, 5, 5, 5],
            },
            title: { text: "" },
            credits: { enabled: false },
            legend: {
              enabled: false,
              itemStyle: { color: "black", fontSize: "9px" },
            },
            xAxis: {
              categories,
              tickPositions: [0, categories.length - 1],
              labels: {
                style: { color: "black", fontSize: "9px" },
                rotation: 0, // straight labels
                step: 5,
                y: 10
              },
              tickColor: "#e0dede",
              lineColor: "#e0dede",
            },
            yAxis: {
              tickAmount: 6,
              title: {
                text: "Uptime",
                style: { color: "black", fontSize: "9px" },
              },
              labels: {
                style: { color: "black", fontSize: "9px" },
                formatter: function () {
                  return formatSeconds(this.value as number); // ✅ works
                },
              },
              min: 0,
            },
            tooltip: {
              shared: true,
              backgroundColor: "white",
              borderColor: "#444",
              style: { color: "black" },
              formatter: function () {
                return `<b>${this.series.name}</b><br/>${formatSeconds(
                  this.y as number
                )}`;
              },
            },
            plotOptions: {
              line: {
                marker: {
                  enabled: true,
                  symbol: "circle",
                  radius: 2,
                },
                lineWidth: 2,
                states: { hover: { lineWidth: 2 } },
              },
            },
            series: [
              {
                name: "Uptime",
                type: "line",
                data: seriesData,
                color: "#09c212ff",
              },
            ],
          };
        },
        error: (err) => {
          console.error("Failed to load uptime metrics:", err);
        },
      });
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

  private initConnectedBlockedChart(): void {
    this.redisService
      .getInstanceClientMetrics(
        this.redisEncryptedEntity,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (data) => {
           if (!data || !Array.isArray(data.clientsTimeSeries)) {
          console.error("Invalid client metrics response:", data);
          return;
        }

        const hasNegative = data.clientsTimeSeries.some(
          (item: any) =>
            item.connected_clients < 0 || item.blocked_clients < 0
        );

        if (hasNegative) {
          console.error(
            "Client metrics contain negative values. Chart will not be rendered.",
            data
          );
          return;
        }
          const parsedDates 
          = data.clientsTimeSeries.map((item: any) => this.parseTimeBucket(item.time_bucket));
          let format: 'date' | 'time' = 'date';
          if (parsedDates.length > 1) {
            const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
            format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
          }

          const categories = parsedDates.map((date: any) =>
            format === 'date'
              ? date.toLocaleDateString()
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );

          const connected = data.clientsTimeSeries.map(
            (item: any) => item.connected_clients
          );
          const blocked = data.clientsTimeSeries.map(
            (item: any) => item.blocked_clients
          );

          this.clientChartOptions = {
            chart: {
              type: "area",
              backgroundColor: "transparent",
              spacing: [5, 5, 5, 5],
            },
            title: { text: "" },
            credits: { enabled: false },
            legend: {
              enabled: false,
              itemStyle: { color: "black", fontSize: "9px" },
            },
            xAxis: {
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              categories: categories,
              tickPositions: [0, categories.length - 1],
              labels: { style: { color: "black", fontSize: "9px" }, y: 10 },
              tickColor: "#e0dede",
              lineColor: "#e0dede",
            },
            yAxis: {
              tickAmount: 6,
              title: { text: undefined, style: { color: "black", fontSize: "9px" } },
              labels: {
                style: { color: "black", fontSize: "9px" },
                rotation: 0,
              },
            },
            tooltip: {
              shared: true,
              backgroundColor: "white",
              borderColor: "#444",
              style: { color: "black" },
            },
            plotOptions: {
              area: {
                marker: {
                  enabled: false,
                  symbol: "circle",
                  radius: 3,
                },
                fillOpacity: 0.25,
                lineWidth: 2,
                states: { hover: { lineWidth: 2 } },
              },
            },
            series: [
              {
                name: "Connected Clients",
                type: "area",
                data: connected,
                color: "#d20bf5ff",
              },
              {
                name: "Blocked Clients",
                type: "area",
                data: blocked,
                color: "#109db9ff",
              },
            ],
          };
        },
        error: (err) => {
          console.error("Failed to load connected/blocked client metrics:", err);
        },
      });
  }

  private initTotalCommandRateChart(): void {
    this.redisService
      .getInstanceTotalCommandRate(
        this.redisEncryptedEntity,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (data: any[]) => {
          if (!data || data.length === 0) {
          console.error("Invalid/empty command rate response:", data);
          return;
        }

         const hasNegative = data.some((row: any) =>
          Object.keys(row).some((k) => {
            const v = row[k];
            return typeof v === "number" && v < 0;
          })
        );
        if (hasNegative) {
          console.error("Command rate response contains negative values; ignoring response.", data);
          return;
        }

          const parsedDates = data.map((item: any) => this.parseTimeBucket(item.time_bucket));
          let format: 'date' | 'time' = 'date';
          if (parsedDates.length > 1) {
            const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
            format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
          }

          const categories = parsedDates.map((date: any) =>
            format === 'date'
              ? date.toLocaleDateString()
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );

          this.commandsChartOptions = {
            chart: {
              type: "area",
              backgroundColor: "transparent",
              spacing: [5, 5, 5, 5],
            },
            title: { text: "" },
            credits: { enabled: false },
            legend: {
              enabled: false,
              itemStyle: { color: "black", fontSize: "9px" },
            },
            xAxis: {
              categories,
              tickPositions: [0, categories.length - 1],
              title: { text: undefined },
              labels: { style: { color: "black", fontSize: "9px" }, y: 10 },
              tickColor: "#e0dede",
              lineColor: "#e0dede",
            },
            yAxis: {
              tickAmount: 6,
              title: { text: undefined },
              labels: { style: { color: "black", fontSize: "9px" } },
            },
            tooltip: {
              shared: true,
              backgroundColor: "white",
              borderColor: "#444",
              style: { color: "black", fontSize: "10px" },
            },
            plotOptions: {
              area: {
                marker: { enabled: false, symbol: "circle", radius: 3 },
                fillOpacity: 0.25,
                lineWidth: 2,
                states: { hover: { lineWidth: 2 } },
              },
            },
            series: [
              {
                name: "set",
                type: "area",
                data: data.map((d) => d.set),
                color: "#10b981",
              },
              {
                name: "ping",
                type: "area",
                data: data.map((d) => d.ping),
                color: "#6366f1",
              },
              {
                name: "keys",
                type: "area",
                data: data.map((d) => d.keys),
                color: "#f59e0b",
              },
              {
                name: "setinfo",
                type: "area",
                data: data.map((d) => d.setinfo),
                color: "#ef4444",
              },
              {
                name: "del",
                type: "area",
                data: data.map((d) => d.del),
                color: "#3b82f6",
              },
              {
                name: "psubscribe",
                type: "area",
                data: data.map((d) => d.psubscribe),
                color: "#8b5cf6",
              },
              {
                name: "list",
                type: "area",
                data: data.map((d) => d.list),
                color: "#ec4899",
              },
              {
                name: "histogram",
                type: "area",
                data: data.map((d) => d.histogram),
                color: "#14b8a6",
              },
              {
                name: "setname",
                type: "area",
                data: data.map((d) => d.setname),
                color: "#f97316",
              },
              {
                name: "docs",
                type: "area",
                data: data.map((d) => d.docs),
                color: "#eab308",
              },
              {
                name: "len",
                type: "area",
                data: data.map((d) => d.len),
                color: "#8b5cf6",
              },
              {
                name: "publish",
                type: "area",
                data: data.map((d) => d.publish),
                color: "#6366f1",
              },
              {
                name: "get",
                type: "area",
                data: data.map((d) => d.get),
                color: "#10b981",
              },
              {
                name: "flushall",
                type: "area",
                data: data.map((d) => d.flushall),
                color: "#f59e0b",
              },
              {
                name: "hello",
                type: "area",
                data: data.map((d) => d.hello),
                color: "#ef4444",
              },
              {
                name: "punsubscribe",
                type: "area",
                data: data.map((d) => d.punsubscribe),
                color: "#3b82f6",
              },
              {
                name: "latest",
                type: "area",
                data: data.map((d) => d.latest),
                color: "#8b5cf6",
              },
              {
                name: "info",
                type: "area",
                data: data.map((d) => d.info),
                color: "#ec4899",
              },
            ],
          };
        },
        error: (err) => console.error("Error fetching command rate:", err),
      });
  }

  private initAverageTimeSpentByCommandChart(): void {
    this.redisService
      .getInstanceAverageTimeSpent(
        this.redisEncryptedEntity,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (data: any[]) => {
           if (!Array.isArray(data) || data.length === 0) {
          console.error("Invalid average time spent response:", data);
          return;
        }

         const hasNegative = data.some(row =>
          Object.values(row).some((v) => typeof v === "number" && v < 0)
        );

        if (hasNegative) {
          console.error("Negative values detected in average time spent response:", data);
          return;
        }

          const parsedDates = data.map((item: any) => this.parseTimeBucket(item.time_bucket));
          let format: 'date' | 'time' = 'date';
          if (parsedDates.length > 1) {
            const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
            format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
          }

          const categories = parsedDates.map((date: any) =>
            format === 'date'
              ? date.toLocaleDateString()
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );

          this.averageTimeChartOptions = {
            chart: {
              type: "area",
              backgroundColor: "transparent",
              spacing: [5, 5, 5, 5],
            },
            title: { text: "" },
            credits: { enabled: false },
            legend: {
              enabled: false,
              itemStyle: { color: "black", fontSize: "9px" },
            },
            xAxis: {
              categories,
              tickPositions: [0, categories.length - 1],
              title: { text: undefined },
              labels: { style: { color: "black", fontSize: "9px" }, y: 10 },
              tickColor: "#e0dede",
              lineColor: "#e0dede",
            },
            yAxis: {
              tickAmount: 6,
              title: { text: undefined },
              labels: { style: { color: "black", fontSize: "9px" } },
            },
            tooltip: {
              shared: true,
              backgroundColor: "white",
              borderColor: "#444",
              style: { color: "black", fontSize: "10px" },
            },
            plotOptions: {
              area: {
                marker: { enabled: false, symbol: "circle", radius: 3 },
                fillOpacity: 0.25,
                lineWidth: 2,
                states: { hover: { lineWidth: 2 } },
              },
            },
            series: [
              {
                name: "set",
                type: "area",
                data: data.map((d) => d.set),
                color: "#10b981",
              },
              {
                name: "ping",
                type: "area",
                data: data.map((d) => d.ping),
                color: "#6366f1",
              },
              {
                name: "keys",
                type: "area",
                data: data.map((d) => d.keys),
                color: "#f59e0b",
              },
              {
                name: "setinfo",
                type: "area",
                data: data.map((d) => d.setinfo),
                color: "#ef4444",
              },
              {
                name: "del",
                type: "area",
                data: data.map((d) => d.del),
                color: "#3b82f6",
              },
              {
                name: "psubscribe",
                type: "area",
                data: data.map((d) => d.psubscribe),
                color: "#8b5cf6",
              },
              {
                name: "list",
                type: "area",
                data: data.map((d) => d.list),
                color: "#ec4899",
              },
              {
                name: "histogram",
                type: "area",
                data: data.map((d) => d.histogram),
                color: "#14b8a6",
              },
              {
                name: "setname",
                type: "area",
                data: data.map((d) => d.setname),
                color: "#f97316",
              },
              {
                name: "docs",
                type: "area",
                data: data.map((d) => d.docs),
                color: "#eab308",
              },
              {
                name: "len",
                type: "area",
                data: data.map((d) => d.len),
                color: "#8b5cf6",
              },
              {
                name: "publish",
                type: "area",
                data: data.map((d) => d.publish),
                color: "#6366f1",
              },
              {
                name: "get",
                type: "area",
                data: data.map((d) => d.get),
                color: "#10b981",
              },
              {
                name: "flushall",
                type: "area",
                data: data.map((d) => d.flushall),
                color: "#f59e0b",
              },
              {
                name: "hello",
                type: "area",
                data: data.map((d) => d.hello),
                color: "#ef4444",
              },
              {
                name: "punsubscribe",
                type: "area",
                data: data.map((d) => d.punsubscribe),
                color: "#3b82f6",
              },
              {
                name: "latest",
                type: "area",
                data: data.map((d) => d.latest),
                color: "#8b5cf6",
              },
              {
                name: "info",
                type: "area",
                data: data.map((d) => d.info),
                color: "#ec4899",
              },
            ],
          };
        },
        error: (err) => console.error("Error fetching command rate:", err),
      });
  }

  private initCommandDurationSecondsTotalRateChart(): void {
    this.redisService
      .getInstanceCommandDurationSeconds(
        this.redisEncryptedEntity,
        this.startTime,
        this.endTime
      )
      .subscribe({
        next: (data: any[]) => {
          if (!data || data.length === 0) return;

          const parsedDates = data.map((item: any) => this.parseTimeBucket(item.time_bucket));
          let format: 'date' | 'time' = 'date';
          if (parsedDates.length > 1) {
            const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
            format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
          }

          const categories = parsedDates.map((date: any) =>
            format === 'date'
              ? date.toLocaleDateString()
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );

          this.commandDurationChartOptions = {
            chart: {
              type: "line",
              backgroundColor: "transparent",
              spacing: [5, 5, 5, 5],
            },
            title: { text: "" },
            credits: { enabled: false },
            legend: {
              enabled: false,
              itemStyle: { color: "black", fontSize: "9px" },
            },
            xAxis: {
              categories,
              tickPositions: [0, categories.length - 1],
              title: { text: undefined },
              labels: { style: { color: "black", fontSize: "9px" }, y: 10 },
              tickColor: "#e0dede",
              lineColor: "#e0dede",
            },
            yAxis: {
              tickAmount: 6,
              title: { text: undefined },
              labels: { style: { color: "black", fontSize: "9px" } },
            },
            tooltip: {
              shared: true,
              backgroundColor: "white",
              borderColor: "#444",
              style: { color: "black", fontSize: "10px" },
            },
            plotOptions: {
              line: {
                marker: { enabled: false, symbol: "circle", radius: 2 },
                lineWidth: 1,
              },
            },
            series: [
              {
                name: "set",
                type: "line",
                data: data.map((d) => d.set),
                color: "#10b981",
              },
              {
                name: "ping",
                type: "line",
                data: data.map((d) => d.ping),
                color: "#6366f1",
              },
              {
                name: "keys",
                type: "line",
                data: data.map((d) => d.keys),
                color: "#f59e0b",
              },
              {
                name: "setinfo",
                type: "line",
                data: data.map((d) => d.setinfo),
                color: "#ef4444",
              },
              {
                name: "del",
                type: "line",
                data: data.map((d) => d.del),
                color: "#3b82f6",
              },
              {
                name: "psubscribe",
                type: "line",
                data: data.map((d) => d.psubscribe),
                color: "#8b5cf6",
              },
              {
                name: "list",
                type: "line",
                data: data.map((d) => d.list),
                color: "#ec4899",
              },
              {
                name: "histogram",
                type: "line",
                data: data.map((d) => d.histogram),
                color: "#14b8a6",
              },
              {
                name: "setname",
                type: "line",
                data: data.map((d) => d.setname),
                color: "#f97316",
              },
              {
                name: "docs",
                type: "line",
                data: data.map((d) => d.docs),
                color: "#eab308",
              },
              {
                name: "len",
                type: "line",
                data: data.map((d) => d.len),
                color: "#8b5cf6",
              },
              {
                name: "publish",
                type: "line",
                data: data.map((d) => d.publish),
                color: "#6366f1",
              },
              {
                name: "get",
                type: "line",
                data: data.map((d) => d.get),
                color: "#10b981",
              },
              {
                name: "flushall",
                type: "line",
                data: data.map((d) => d.flushall),
                color: "#f59e0b",
              },
              {
                name: "hello",
                type: "line",
                data: data.map((d) => d.hello),
                color: "#ef4444",
              },
              {
                name: "punsubscribe",
                type: "line",
                data: data.map((d) => d.punsubscribe),
                color: "#3b82f6",
              },
              {
                name: "latest",
                type: "line",
                data: data.map((d) => d.latest),
                color: "#8b5cf6",
              },
              {
                name: "info",
                type: "line",
                data: data.map((d) => d.info),
                color: "#ec4899",
              },
            ],
          };
        },
        error: (err) => console.error("Error fetching command rate:", err),
      });
  }
}
