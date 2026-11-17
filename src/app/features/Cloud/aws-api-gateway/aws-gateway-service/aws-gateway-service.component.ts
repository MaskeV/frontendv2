import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import * as bootstrap from 'bootstrap';
import Highcharts from 'highcharts';
import { Subscription, Subject, filter, switchMap, takeUntil, catchError, forkJoin, map, of } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AwsApiService } from '../../../../services/aws-api.service';
import { ServiceIdService } from '../../../../services/service-id.service';

@Component({
    selector: 'app-aws-gateway-service',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
    ],
    templateUrl: './aws-gateway-service.component.html',
    styleUrls: ['./aws-gateway-service.component.css']
})
export class AwsGatewayServiceComponent implements OnInit, OnDestroy, AfterViewInit {

  private themeObserver: MutationObserver | undefined;

  Highcharts: typeof Highcharts = Highcharts;

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;

  selectedService!: string;
  serviceId!: string;

  charts: Highcharts.Chart[] = [];
  serviceCountChart: Highcharts.Chart | null = null;
  serviceCount4xxChart: Highcharts.Chart | null = null;
  serviceCount5xxChart: Highcharts.Chart | null = null;
  reqAvgLatencyChart: Highcharts.Chart | null = null;
  reqAvgIntLatencyChart: Highcharts.Chart | null = null;
  dataProcessCountChart: Highcharts.Chart | null = null;

  constructor(
    private router: Router,
    private dateService: DateService,
    private awsApiService: AwsApiService,
    private serviceIdService: ServiceIdService
  ) { }

  ngOnInit(): void {
    this.selectedService = sessionStorage.getItem('serviceIdForAws')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForAws')!;
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
    const month = +bucket.slice(4, 6) - 1; // 0-based index
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }

  loadData(): void {
    this.getServiceCount();
    this.getServiceCount4xx();
    this.getServiceCount5xx();
    this.getReqAvgLatency();
    this.getReqAvgIntLatency();
    this.getDataProcessCount();
    this.getEndpointNames();
  }

  getServiceCount(): void {
    this.awsApiService.getServiceCount(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getServiceCountCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getServiceCountCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        this.renderEmptyState('serviceCountChartContainer');
        this.serviceCountChart = null;
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

      if (this.serviceCountChart) {
        this.serviceCountChart.destroy();
      }

      this.serviceCountChart = Highcharts.chart('serviceCountChartContainer', {
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
      if (!this.charts.includes(this.serviceCountChart)) {
        this.charts.push(this.serviceCountChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getServiceCount4xx(): void {
    this.awsApiService.getServiceCount4xx(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getServiceCount4xxCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getServiceCount4xxCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        this.renderEmptyState('serviceCount4xxChartContainer');
        this.serviceCount4xxChart = null;
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

      if (this.serviceCount4xxChart) {
        this.serviceCount4xxChart.destroy();
      }

      this.serviceCount4xxChart = Highcharts.chart('serviceCount4xxChartContainer', {
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
      if (!this.charts.includes(this.serviceCount4xxChart)) {
        this.charts.push(this.serviceCount4xxChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getServiceCount5xx(): void {
    this.awsApiService.getServiceCount5xx(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getServiceCount5xxCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getServiceCount5xxCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        this.renderEmptyState('serviceCount5xxChartContainer');
        this.serviceCount5xxChart = null;
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

      if (this.serviceCount5xxChart) {
        this.serviceCount5xxChart.destroy();
      }

      this.serviceCount5xxChart = Highcharts.chart('serviceCount5xxChartContainer', {
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
      if (!this.charts.includes(this.serviceCount5xxChart)) {
        this.charts.push(this.serviceCount5xxChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getReqAvgLatency(): void {
    this.awsApiService.getReqAvgLatency(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getReqAvgLatencyCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getReqAvgLatencyCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        this.renderEmptyState('reqAvgLatencyChartContainer');
        this.reqAvgLatencyChart = null;
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

      if (this.reqAvgLatencyChart) {
        this.reqAvgLatencyChart.destroy();
      }

      this.reqAvgLatencyChart = Highcharts.chart('reqAvgLatencyChartContainer', {
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
      if (!this.charts.includes(this.reqAvgLatencyChart)) {
        this.charts.push(this.reqAvgLatencyChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getReqAvgIntLatency(): void {
    this.awsApiService.getReqAvgIntLatency(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getReqAvgIntLatencyCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getReqAvgIntLatencyCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        this.renderEmptyState('reqAvgIntLatencyChartContainer');
        this.reqAvgIntLatencyChart = null;
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

      if (this.reqAvgIntLatencyChart) {
        this.reqAvgIntLatencyChart.destroy();
      }

      this.reqAvgIntLatencyChart = Highcharts.chart('reqAvgIntLatencyChartContainer', {
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
      if (!this.charts.includes(this.reqAvgIntLatencyChart)) {
        this.charts.push(this.reqAvgIntLatencyChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getDataProcessCount(): void {
    this.awsApiService.getDataProcessCount(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getDataProcessCountCharts(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getDataProcessCountCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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
        this.renderEmptyState('dataProcessCountChartContainer');
        this.dataProcessCountChart = null;
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

      if (this.dataProcessCountChart) {
        this.dataProcessCountChart.destroy();
      }

      this.dataProcessCountChart = Highcharts.chart('dataProcessCountChartContainer', {
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
      if (!this.charts.includes(this.dataProcessCountChart)) {
        this.charts.push(this.dataProcessCountChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  endpointNames: any;
  endpointPage: number = 1;
  endpointSize: number = 20;
  endpointSearch: string = '';
  totalHits: number = 0;
  entityEndpointId: string = '';

  getEndpointNames(): void {
    this.awsApiService.getEndpointNames(
      this.serviceId,
      this.startTime,
      this.endTime,
      this.endpointSize,
      this.endpointPage,
      this.endpointSearch
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          console.log("Endpoint Names Called", data);
          let endpointNames = data;

          this.endpointNames = [];
          this.totalHits = data.total_hits || 0;

          for (const key in data) {
            if (data.hasOwnProperty(key) && key !== 'total_hits') {
              this.endpointNames = this.endpointNames.concat(endpointNames[key]);
            }
          }
          this.endpointNames = Array.from(new Set(this.endpointNames));
          // this.getCombinedData();
          this.calculatePagination();
        },
        error: (err) => {
          console.error("API Error:", err);
        }
      });
  }

    pagedServiceName: string[] = []; // Data for current page
  currentPages: number = 1;
  itemsPerPage: number = 6; // Adjust items per page as needed
  totalPage: number = 0;

  calculatePagination(): void {
    this.totalPage = Math.ceil(this.endpointNames.length / this.itemsPerPage);
    this.pagedServiceName = this.endpointNames.slice(
      (this.currentPages - 1) * this.itemsPerPage,
      this.currentPages * this.itemsPerPage
    );
  }

  previousPage(): void {
    if (this.currentPages > 1) {
      this.currentPages--;
      this.calculatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPages < this.totalPage) {
      this.currentPages++;
      this.calculatePagination();
    }
  }

  goToPage(page: number): void {
    this.currentPages = page;
    this.calculatePagination();
  }

  get totalPagesArray(): number[] {
    const visiblePages = 5;
    let start = Math.max(1, this.currentPages - Math.floor(visiblePages / 2));
    let end = Math.min(this.totalPage, start + visiblePages - 1);
    start = Math.max(1, end - visiblePages + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  setServiceId(event: MouseEvent): void {
    event.preventDefault();
    const aElement = event.target as HTMLElement;
    const serviceId = aElement.textContent?.trim();

    if (serviceId) {
      this.serviceIdService.setServiceId(serviceId);
      const encodedId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedEndpointIdForAws', encodedId);
      sessionStorage.setItem('endpointIdForAws', serviceId);
      this.router.navigate(['/aws-gateway/aws-service/aws-endpoint']);
    } else {
      console.error('Service ID is undefined or empty');
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

  private renderEmptyState(containerId: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="chart-empty-state d-flex justify-content-center align-items-center h-100 w-100">
          <p class="empty-title mb-0">No Data Available</p>
        </div>`;
    }
  }
}
