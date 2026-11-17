import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import * as bootstrap from 'bootstrap';
import Highcharts from 'highcharts';
import { Subscription, Subject, filter, switchMap, takeUntil } from 'rxjs';
import { AwsApiService } from '../../../../services/aws-api.service';
import { DateService } from '../../../../services/date.service';

@Component({
    selector: 'app-aws-gateway-endpoint',
    imports: [RouterModule],
    templateUrl: './aws-gateway-endpoint.component.html',
    styleUrls: ['./aws-gateway-endpoint.component.css']
})
export class AwsGatewayEndpointComponent implements OnInit, OnDestroy, AfterViewInit {

  private themeObserver: MutationObserver | undefined;

  Highcharts: typeof Highcharts = Highcharts;

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;

  selectedService!: string;
  selectedEndpoint!: string;
  serviceId!: string;
  endpointId!: string;
  entityId!: string;

  charts: Highcharts.Chart[] = [];
  endpointCountChart: Highcharts.Chart | null = null;
  endpointCount4xxChart: Highcharts.Chart | null = null;
  endpointCount5xxChart: Highcharts.Chart | null = null;
  endpointReqAvgLatencyChart: Highcharts.Chart | null = null;
  endpointReqAvgIntLatencyChart: Highcharts.Chart | null = null;
  endpointDataProcessCountChart: Highcharts.Chart | null = null;

  constructor(
    private dateService: DateService,
    private awsApiService: AwsApiService,
  ) { }

  ngOnInit(): void {
    this.selectedService = sessionStorage.getItem('serviceIdForAws')!;
    this.selectedEndpoint = sessionStorage.getItem('endpointIdForAws')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForAws')!;
    this.endpointId = sessionStorage.getItem('encodedEndpointIdForAws')!;
    this.entityId = this.serviceId + '_' + this.endpointId;
    this.dateService.setActiveComponent('AwsGatewayServiceComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'AwsGatewayServiceComponent'),
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
    this.getEndpointCount();
    this.getEndpointCount4xx();
    this.getEndpointCount5xx();
    this.getEndpointReqAvgLatency();
    this.getEndpointReqAvgIntLatency();
    this.getEndpointDataProcessCount();
  }

  getEndpointCount(): void {
    this.awsApiService.getEndpointCount(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getEndpointCountCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getEndpointCountCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        this.renderEmptyState('endpointCountChartContainer');
        this.endpointCountChart = null;
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
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]) || 0;
          return { y };
        })
      }));

      if (this.endpointCountChart) {
        this.endpointCountChart.destroy();
      }

      this.endpointCountChart = Highcharts.chart('endpointCountChartContainer', {
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
      if (!this.charts.includes(this.endpointCountChart)) {
        this.charts.push(this.endpointCountChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getEndpointCount4xx(): void {
    this.awsApiService.getEndpointCount4xx(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getEndpointCount4xxCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getEndpointCount4xxCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        this.renderEmptyState('endpointCount4xxChartContainer');
        this.endpointCount4xxChart = null;
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
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]) || 0;
          return { y };
        })
      }));

      if (this.endpointCount4xxChart) {
        this.endpointCount4xxChart.destroy();
      }

      this.endpointCount4xxChart = Highcharts.chart('endpointCount4xxChartContainer', {
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
      if (!this.charts.includes(this.endpointCount4xxChart)) {
        this.charts.push(this.endpointCount4xxChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getEndpointCount5xx(): void {
    this.awsApiService.getEndpointCount5xx(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getEndpointCount5xxCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getEndpointCount5xxCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        this.renderEmptyState('endpointCount5xxChartContainer');
        this.endpointCount5xxChart = null;
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
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]) || 0;
          return { y };
        })
      }));

      if (this.endpointCount5xxChart) {
        this.endpointCount5xxChart.destroy();
      }

      this.endpointCount5xxChart = Highcharts.chart('endpointCount5xxChartContainer', {
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
      if (!this.charts.includes(this.endpointCount5xxChart)) {
        this.charts.push(this.endpointCount5xxChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getEndpointReqAvgLatency(): void {
    this.awsApiService.getEndpointReqAvgLatency(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getEndpointReqAvgLatencyCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getEndpointReqAvgLatencyCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        this.renderEmptyState('endpointReqAvgLatencyChartContainer');
        this.endpointReqAvgLatencyChart = null;
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
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]) || 0;
          return { y };
        })
      }));

      if (this.endpointReqAvgLatencyChart) {
        this.endpointReqAvgLatencyChart.destroy();
      }

      this.endpointReqAvgLatencyChart = Highcharts.chart('endpointReqAvgLatencyChartContainer', {
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
      if (!this.charts.includes(this.endpointReqAvgLatencyChart)) {
        this.charts.push(this.endpointReqAvgLatencyChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getEndpointReqAvgIntLatency(): void {
    this.awsApiService.getEndpointReqAvgIntLatency(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getEndpointReqAvgIntLatencyCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getEndpointReqAvgIntLatencyCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        this.renderEmptyState('endpointReqAvgIntLatencyChartContainer');
        this.endpointReqAvgIntLatencyChart = null;
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
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]) || 0;
          return { y };
        })
      }));

      if (this.endpointReqAvgIntLatencyChart) {
        this.endpointReqAvgIntLatencyChart.destroy();
      }

      this.endpointReqAvgIntLatencyChart = Highcharts.chart('endpointReqAvgIntLatencyChartContainer', {
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
      if (!this.charts.includes(this.endpointReqAvgIntLatencyChart)) {
        this.charts.push(this.endpointReqAvgIntLatencyChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getEndpointDataProcessCount(): void {
    this.awsApiService.getEndpointDataProcessCount(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getEndpointDataProcessCountCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getEndpointDataProcessCountCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        this.renderEmptyState('endpointDataProcessCountChartContainer');
        this.endpointDataProcessCountChart = null;
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
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]) || 0;
          return { y };
        })
      }));

      if (this.endpointDataProcessCountChart) {
        this.endpointDataProcessCountChart.destroy();
      }

      this.endpointDataProcessCountChart = Highcharts.chart('endpointDataProcessCountChartContainer', {
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
      if (!this.charts.includes(this.endpointDataProcessCountChart)) {
        this.charts.push(this.endpointDataProcessCountChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  private renderEmptyState(containerId: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="chart-empty-state d-flex justify-content-center align-items-center h-100 w-100">
          <p class="empty-title mb-0">No Data Available</p>
        </div>`;
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
