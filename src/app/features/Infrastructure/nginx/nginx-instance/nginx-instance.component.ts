import { AfterViewInit, Component, OnDestroy, OnInit } from "@angular/core";
import { filter, Subject, Subscription, switchMap, takeUntil } from "rxjs";
import { HighchartsChartModule } from "highcharts-angular";
import { CommonModule } from "@angular/common";
import Highcharts from "highcharts";
import { Router } from "@angular/router";
import { DateService } from "../../../../services/date.service";
import { NginxService } from "../../../../services/nginx.service";
import 'highcharts/modules/no-data-to-display';
import { SeriesOptionsType } from 'highcharts';
import * as bootstrap from 'bootstrap';

@Component({
    selector: 'app-nginx-instance',
    standalone: true,
    imports: [CommonModule, HighchartsChartModule],
    templateUrl: './nginx-instance.component.html',
    styleUrls: ['./nginx-instance.component.css']
})
export class NginxInstanceComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  selectedEntity!: any;
  selectedInstance!: any;
  nginxEncryptedEntity!: any;
  nginxStats: any;
  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  startTime!: number;
  endTime!: number;
  Highcharts: typeof Highcharts = Highcharts;
  httpRequestChartOptions!: Highcharts.Options;
  httpLatencyChartOptions!: Highcharts.Options;
  httpStatusChartOptions!: Highcharts.Options;
  http4xxChartOptions!: Highcharts.Options;
  http5xxChartOptions!: Highcharts.Options;
  httpConnectionsChartOptions!: Highcharts.Options;
  httpBandwidthChartOptions!: Highcharts.Options;
  totalHttpRequests: any = 'N/A';
  totalBandwidthKB: any = 'N/A';
  avgConnections: any = 'N/A';
  memoryUsage: any = {};
  totalSeconds: any;

  AREA_COLORS = [
    { line: '#EF476F', stops: [[0, 'rgba(239, 71, 111, 0.35)'], [1, 'rgba(239, 71, 111, 0.08)']] },
    { line: '#06D6A0', stops: [[0, 'rgba(6, 214, 160, 0.35)'], [1, 'rgba(6, 214, 160, 0.08)']] },
    { line: '#118AB2', stops: [[0, 'rgba(17, 138, 178, 0.35)'], [1, 'rgba(17, 138, 178, 0.08)']] },
    { line: '#FFD166', stops: [[0, 'rgba(255, 209, 102, 0.35)'], [1, 'rgba(255, 209, 102, 0.08)']] },
    { line: '#073B4C', stops: [[0, 'rgba(7, 59, 76, 0.35)'], [1, 'rgba(7, 59, 76, 0.08)']] },
    { line: '#CDB4DB', stops: [[0, 'rgba(205, 180, 219, 0.35)'], [1, 'rgba(205, 180, 219, 0.08)']] },
    { line: '#FFC8DD', stops: [[0, 'rgba(255, 200, 221, 0.35)'], [1, 'rgba(255, 200, 221, 0.08)']] },
    { line: '#BDE0FE', stops: [[0, 'rgba(189, 224, 254, 0.35)'], [1, 'rgba(189, 224, 254, 0.08)']] },
    { line: '#606C38', stops: [[0, 'rgba(96, 108, 56, 0.35)'], [1, 'rgba(96, 108, 56, 0.08)']] },
    { line: '#DDA15E', stops: [[0, 'rgba(221, 161, 94, 0.35)'], [1, 'rgba(221, 161, 94, 0.08)']] }
  ];

  BAR_COLORS = [
    { line: '#c5d0c3', stops: [[0, '#c5d0c3'], [1, '#E6EBE5']] }, // 1xx
    { line: '#74c69d', stops: [[0, '#74c69d'], [1, '#D9EFE4']] }, // 2xx
    { line: '#f4d35e', stops: [[0, '#f4d35e'], [1, '#FCF5D5']] }, // 3xx
    { line: '#f4845f', stops: [[0, '#f4845f'], [1, '#FCE4DB']] }, // 4xx
    { line: '#f25c54', stops: [[0, '#f25c54'], [1, '#FBD9D7']] }  // 5xx
  ];

  isLoading: boolean = false;

  constructor(
    private router: Router,
    private dateService: DateService,
    private nginxService: NginxService
  ) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.selectedEntity = sessionStorage.getItem("nginx");
    this.selectedInstance = sessionStorage.getItem("nginxInstance");
    this.nginxEncryptedEntity = sessionStorage.getItem("selectedNginxInstance");
    this.dateService.setActiveComponent("NginxListComponent");
    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter((activeComponent) => activeComponent === "NginxListComponent"),
        switchMap(() => this.dateService.date$),
        takeUntil(this.destroy$)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.loadInitialData();
      });
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.loadStats();
    this.initHttpRequestTrendChart();
    this.initHttpConnectionsChart()
    this.initHttpBandwidthChart()
    this.initHttpLatencyChart();
    this.initHttp5xxPercentChart();
    this.initHttp4xxPercentChart();
    this.initHttpStatusChart();
    setTimeout(() => { 
      this.isLoading = false; 
      // Initialize tooltips after the view has been updated (isLoading is false)
      setTimeout(() => this.initializeTooltips(), 0);
    }, 1000);
  }

  ngAfterViewInit(): void {
    // Basic initialization for elements already in DOM
    this.initializeTooltips();
  }

  private initializeTooltips(): void {
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

  loadData(tabName: string): void {
    this.destroy$.next();
    switch (tabName) {
      case "overview":
        this.loadStats();
        this.initHttpRequestTrendChart();
        this.initHttpConnectionsChart()
        this.initHttpBandwidthChart()
        this.initHttpLatencyChart();
        this.initHttp5xxPercentChart();
        this.initHttp4xxPercentChart();
        this.initHttpStatusChart();
        break;
    }
  }

  gotoNginxDetails() {
    this.router.navigate(["/nginx"]);
  }

  gotoNginxService() {
    this.router.navigate(["/nginx/overview"]);
  }

  loadStats(): void {
    this.nginxService
      .getLatestNginxStats(this.nginxEncryptedEntity, this.startTime, this.endTime, "instance")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.nginxStats = data;
          this.totalHttpRequests = data?.http_requests_total ?? data?.totalHttpRequests ?? 0;
          this.totalBandwidthKB = data?.http_bandwidth_total_kb ?? data?.totalBandwidthKB ?? 0;
          this.avgConnections = data?.http_connections_avg ?? data?.avgConnections ?? 0;
          console.log("Nginx Stats Consolidated Data:", data);
        },
        error: (err: any) => console.error('Error fetching stats:', err),
      });
  }



  initHttpRequestTrendChart() {
    this.nginxService.getNginxServiceLoad(this.nginxEncryptedEntity, this.startTime, this.endTime, "instance")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const timeSeries = data?.callsPerMinuteTimeSeries || [];
          const seriesData = this.getSeriesData('areaspline', timeSeries, { 'calls': 'Requests' }, [{ line: '#b388eb', stops: [[0, 'rgba(179, 136, 235, 0.35)'], [1, 'rgba(179, 136, 235, 0.08)']] }]);
          this.httpRequestChartOptions = this.getChartOption(seriesData, '#b388eb');
          if (this.httpRequestChartOptions.yAxis) {
            (this.httpRequestChartOptions.yAxis as any).allowDecimals = false;
          }
        }
      });
  }

  initHttpConnectionsChart() {
    this.nginxService.getNginxHttpConnections(this.nginxEncryptedEntity, this.startTime, this.endTime, "instance")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const timeSeries = data?.httpConnectionsTimeSeries || [];
          const seriesData = this.getSeriesData('areaspline', timeSeries, { 'reading': 'Read', 'writing': 'Write', 'waiting': 'Wait' }, this.AREA_COLORS);
          
          const writeSeries = seriesData.find(s => s.name === 'Write');
          if (writeSeries) {
            writeSeries.color = '#bc8a5f';
            (writeSeries as any).fillColor = {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [[0, 'rgba(188, 138, 95, 0.35)'], [1, 'rgba(188, 138, 95, 0.08)']]
            };
          }

          const readSeries = seriesData.find(s => s.name === 'Read');
          if (readSeries) {
            readSeries.color = '#ef8354';
            (readSeries as any).fillColor = {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [[0, 'rgba(239, 131, 84, 0.35)'], [1, 'rgba(239, 131, 84, 0.08)']]
            };
          }
          
          this.httpConnectionsChartOptions = this.getChartOption(seriesData, '#06D6A0');
          if (this.httpConnectionsChartOptions.yAxis) {
            (this.httpConnectionsChartOptions.yAxis as any).allowDecimals = false;
          }
          if (this.httpConnectionsChartOptions.plotOptions?.areaspline) {
            this.httpConnectionsChartOptions.plotOptions.areaspline.stacking = 'normal';
          }
        }
      });
  }

  initHttpBandwidthChart() {
    this.nginxService.getNginxHttpBandwidth(this.nginxEncryptedEntity, this.startTime, this.endTime, "instance")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const timeSeries = data?.bandwidthTimeSeries || [];
          const seriesData = this.getSeriesData('spline', timeSeries, {
            'request_kb': 'Request',
            'response_kb': 'Response',
            'total_kb': 'Total'
          }, this.AREA_COLORS);
          
          const totalSeries = seriesData.find(s => s.name === 'Total');
          if (totalSeries) {
            totalSeries.type = 'areaspline';
          }
          
          const requestSeries = seriesData.find(s => s.name === 'Request');
          if (requestSeries) {
            requestSeries.color = '#e06d06';
          }

          const responseSeries = seriesData.find(s => s.name === 'Response');
          if (responseSeries) {
            responseSeries.color = '#bc8a5f';
          }
          
          this.httpBandwidthChartOptions = this.getChartOption(seriesData, '#118AB2');
        }
      });
  }

  initHttpLatencyChart() {
    this.nginxService.getNginxLatency(this.nginxEncryptedEntity, this.startTime, this.endTime, "instance")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const timeSeries = data?.latencyTimeSeries || [];
          if (!timeSeries.length) {
            this.httpLatencyChartOptions = this.getChartOption([], '#9ac6c5');
            return;
          }

          const avgData: any[] = [];
          const p50Data: any[] = [];
          const p70Data: any[] = [];
          const p90Data: any[] = [];
          const p99Data: any[] = [];

          timeSeries.forEach((point: any) => {
            const timestamp = this.convertTimebucket(point['time_bucket']);
            const val = (k: string) => {
              let v = point[k];
              if (v === undefined && point['datatable_value']) v = point['datatable_value'][k];
              return (v !== null && v !== undefined) ? Number(v) : null;
            };
            avgData.push({ x: timestamp, y: val('average') });
            p50Data.push({ x: timestamp, y: val('p50') });
            p70Data.push({ x: timestamp, y: val('p70') });
            p90Data.push({ x: timestamp, y: val('p90') });
            p99Data.push({ x: timestamp, y: val('p99') });
          });

          const seriesData: SeriesOptionsType[] = [
            {
              type: 'areaspline',
              name: 'AVG',
              data: avgData,
              color: '#9ac6c5',
              fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [[0, 'rgba(154, 198, 197, 0.35)'], [1, 'rgba(154, 198, 197, 0.08)']]
              }
            },
            { type: 'spline', name: 'P50', data: p50Data, color: '#ff7f51' },
            { type: 'spline', name: 'P70', data: p70Data, color: '#b36a5e' },
            { type: 'spline', name: 'P90', data: p90Data, color: '#6a994e' },
            { type: 'spline', name: 'P99', data: p99Data, color: '#c77dff' }
          ];

          this.httpLatencyChartOptions = this.getChartOption(seriesData, '#9ac6c5');
        }
      });
  }

  initHttp5xxPercentChart(): void {
    this.nginxService.getNginxHttp5xxPercent(this.nginxEncryptedEntity, this.startTime, this.endTime, "instance")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const timeSeries = data?.http5xxPercentTimeSeries || [];
          const seriesData = this.getSeriesData('areaspline', timeSeries, { 'percent': '5xx %' }, [{ line: '#f25c54', stops: [[0, 'rgba(242, 92, 84, 0.35)'], [1, 'rgba(242, 92, 84, 0.08)']] }]);
          this.http5xxChartOptions = this.getChartOption(seriesData, '#f25c54');
        },
      });
  }

  initHttp4xxPercentChart(): void {
    this.nginxService.getNginxHttp4xxPercent(this.nginxEncryptedEntity, this.startTime, this.endTime, "instance")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const timeSeries = data?.http4xxPercentTimeSeries || [];
          const seriesData = this.getSeriesData('areaspline', timeSeries, { '4xx_percent': '4xx %' }, [{ line: '#f4845f', stops: [[0, 'rgba(244, 132, 95, 0.35)'], [1, 'rgba(244, 132, 95, 0.08)']] }]);
          this.http4xxChartOptions = this.getChartOption(seriesData, '#f4845f');
        },
      });
  }

  initHttpStatusChart() {
    this.nginxService.getNginxHttpStatus(this.nginxEncryptedEntity, this.startTime, this.endTime, "instance")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const timeSeries = data?.httpStatusTimeSeries || [];
          const seriesData = this.getSeriesData('column', timeSeries, {
            '1xx': '1xx',
            '2xx': '2xx',
            '3xx': '3xx',
            '4xx': '4xx',
            '5xx': '5xx'
          }, this.BAR_COLORS);
          
          this.httpStatusChartOptions = this.getChartOption(seriesData, '#36b47e');
          if (this.httpStatusChartOptions.xAxis) {
            (this.httpStatusChartOptions.xAxis as any).lineWidth = 0;
            (this.httpStatusChartOptions.xAxis as any).tickWidth = 0;
            (this.httpStatusChartOptions.xAxis as any).tickLength = 0;
          }
          if (this.httpStatusChartOptions.yAxis) {
            (this.httpStatusChartOptions.yAxis as any).allowDecimals = false;
            (this.httpStatusChartOptions.yAxis as any).gridLineDashStyle = 'Dash';
          }
          if (this.httpStatusChartOptions.plotOptions?.column) {
            this.httpStatusChartOptions.plotOptions.column.stacking = 'normal';
            this.httpStatusChartOptions.plotOptions.column.borderRadius = 4;
          }
        }
      });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "").replace(/:/g, "").replace(" ", "");
    return parseInt(date);
  }

  getSuccessRate(stats: any): string {
    if (!stats) return 'N/A';
    const error4xx = stats.http_4xx_percent || 0;
    const error5xx = stats.http_5xx_percent || 0;
    const successRate = 100 - (error4xx + error5xx);
    return successRate.toFixed(2) ;
  }

  convertTimebucket(timebucket: any) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    return new Date(year, month, day, hour, minute).getTime();
  }

  getSeriesData(chartType: string, responseData: any[], keyMap: Record<string, string>, colorCodes: any[] = this.AREA_COLORS) {
    if (!responseData?.length) return [];
    const seriesMap = new Map<string, { x: number; y: number }[]>();
    responseData.forEach(point => {
      const timestamp = this.convertTimebucket(point['time_bucket']);
      Object.entries(keyMap).forEach(([key, label]) => {
        const series = seriesMap.get(label) ?? (() => {
          const arr: { x: number; y: number }[] = [];
          seriesMap.set(label, arr);
          return arr;
        })();
        let value = point[key];
        if (value === undefined && point['datatable_value']) value = point['datatable_value'][key];
        series.push({
          x: timestamp,
          y: (value !== null && value !== undefined) ? Number(value) : (null as any)
        });
      });
    });
    return Array.from(seriesMap.entries(), ([name, data], index) => {
      const color = colorCodes[index % colorCodes.length];
      return {
        type: chartType as any,
        name,
        data,
        color: color.line,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: color.stops
        }
      }
    });
  }

  getChartOption(seriesData: Array<SeriesOptionsType>, chartColor: string): Highcharts.Options {
    return {
      lang: { noData: 'No Data Available' },
      noData: { style: { fontSize: '14px', fontWeight: '500', color: '#9ca3af' } },
      chart: { 
        height: 207,
        backgroundColor: 'transparent', 
        spacing: [5, 5, 5, 5], 
        style: { fontFamily: 'Inter, sans-serif' } 
      },
      title: { text: '' },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },
      colors: [chartColor],
      xAxis: {
        type: 'datetime',
        lineWidth: 1,
        lineColor: '#cbd5e1',
        tickWidth: 1,
        tickColor: '#cbd5e1',
        tickLength: 5,
        gridLineWidth: 0,
        gridLineColor: '#f1f5f9',
        gridLineDashStyle: 'Dash',
        labels: {
          enabled: true,
          style: { color: '#64748b', fontSize: '10px' },
          y: 25
        }
      },
      yAxis: {
        tickAmount: 5,
        allowDecimals: true,
        min: 0,
        gridLineColor: '#e5e7eb',
        title: { text: '' },
        labels: { style: { color: '#6B7280', fontSize: '11px' }, enabled: true }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        style: { color: '#1e293b', fontSize: '11px' },
        shared: true,
        borderRadius: 8,
        shadow: true,
        borderWidth: 0,
        outside: true
      },
      plotOptions: {
        series: {
          marker: { enabled: true, radius: 2, lineWidth: 1, lineColor: 'rgba(0,0,0,0.2)' },
          lineWidth: 2.5,
          states: { hover: { lineWidth: 3 } }
        },
        areaspline: { threshold: 0 },
        area: { threshold: 0 },
        column: { borderRadius: 4, borderWidth: 0, groupPadding: 0.05, pointPadding: 0.1 }
      },
      series: seriesData,
    };
  }
}
