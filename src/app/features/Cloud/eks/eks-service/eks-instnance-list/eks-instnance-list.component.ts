import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import * as bootstrap from 'bootstrap';
import Highcharts from 'highcharts';
import { Subscription, Subject, filter, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../../services/date.service';
import { EksApiService } from '../../../../../services/eks-api.service';

@Component({
    selector: 'app-eks-instnance-list',
    imports: [RouterModule],
    templateUrl: './eks-instnance-list.component.html',
    styleUrls: ['./eks-instnance-list.component.css']
})
export class EksInstnanceListComponent implements OnInit, OnDestroy, AfterViewInit {

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

  selectedInstance!: string;
  instanceId!: string;

  entityId!: string;

  charts: Highcharts.Chart[] = [];
  podCountChart: Highcharts.Chart | null = null;
  cpuUtilizationChart: Highcharts.Chart | null = null;
  memoryUtilizationChart: Highcharts.Chart | null = null;
  networkRxChart: Highcharts.Chart | null = null;
  networkRxErrorCountChart: Highcharts.Chart | null = null;
  networkTxChart: Highcharts.Chart | null = null;
  networkTxErrorCountChart: Highcharts.Chart | null = null;
  fsUtilizationChart: Highcharts.Chart | null = null;
  diskIOReadChart: Highcharts.Chart | null = null;
  diskIOWriteChart: Highcharts.Chart | null = null;


  cpuUtilizationChartPod: Highcharts.Chart | null = null;
  memoryUtilizationChartPod: Highcharts.Chart | null = null;
  networkTxChartPod: Highcharts.Chart | null = null;
  networkTxErrorChartPod: Highcharts.Chart | null = null;
  networkRxChartPod: Highcharts.Chart | null = null;
  networkRxErrorChartPod: Highcharts.Chart | null = null;

  constructor(
    private dateService: DateService,
    private eksApiService: EksApiService,
  ) { }

  ngOnInit(): void {
    this.selectedService = sessionStorage.getItem('serviceIdForEks')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForEks')!;
    this.selectedInstance = sessionStorage.getItem('instanceIdForEks')!;
    this.instanceId = sessionStorage.getItem('encodedInstanceIdForEks')!;
    this.entityId = this.serviceId + '_' + this.instanceId;
    this.dateService.setActiveComponent('EksInstnanceListComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'EksInstnanceListComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        const activeTab = document.querySelector('#service-nav .nav-link.active') as HTMLElement;
        if (activeTab) {
          const tabName = activeTab.getAttribute('href')?.replace('#', '');
          if (tabName) {
            this.loadData(tabName);
          }
        }
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

  loadData(tabName: string): void {
    this.destroy$.next();
    switch (tabName) {
      case 'node':
        this.getPodCount();
        this.getCpuUtilizationInstance();
        this.getMemoryUtilizationInstance();
        this.getNetworkRxInstance();
        this.getNetworkTxInstance();
        this.getNetworkRxErrorCount();
        this.getNetworkTxErrorCount();
        this.getFsUtilization();
        this.getDiskIORead();
        this.getDiskIOWrite();
        break;
      case 'pod':

        this.getCpuUtilizationPod();
        this.getMemoryUtilizationPod();
        this.getNetworkTxPod();
        this.getNetworkTxErrorPod();
        this.getNetworkRxPod();
        this.getNetworkRxErrorPod();
        break;
    }
  }

  // NODE

  getPodCount(): void {
    this.eksApiService.getPodCount(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getPodCountCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getPodCountCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.podCountChart) {
          this.podCountChart.destroy();
        }

        this.podCountChart = Highcharts.chart('podCountChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.podCountChart) {
        this.podCountChart.destroy();
      }

      this.podCountChart = Highcharts.chart('podCountChartContainer', {
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
      if (!this.charts.includes(this.podCountChart)) {
        this.charts.push(this.podCountChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getCpuUtilizationInstance(): void {
    this.eksApiService.getCpuUtilizationInstance(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getCpuUtilizationInstanceCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getCpuUtilizationInstanceCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.cpuUtilizationChart) {
          this.cpuUtilizationChart.destroy();
        }

        this.cpuUtilizationChart = Highcharts.chart('cpuUtilizationChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.cpuUtilizationChart) {
        this.cpuUtilizationChart.destroy();
      }

      this.cpuUtilizationChart = Highcharts.chart('cpuUtilizationChartContainer', {
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
      if (!this.charts.includes(this.cpuUtilizationChart)) {
        this.charts.push(this.cpuUtilizationChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getMemoryUtilizationInstance(): void {
    this.eksApiService.getMemoryUtilizationInstance(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getMemoryUtilizationInstanceCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getMemoryUtilizationInstanceCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.memoryUtilizationChart) {
          this.memoryUtilizationChart.destroy();
        }

        this.memoryUtilizationChart = Highcharts.chart('memoryUtilizationChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.memoryUtilizationChart) {
        this.memoryUtilizationChart.destroy();
      }

      this.memoryUtilizationChart = Highcharts.chart('memoryUtilizationChartContainer', {
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
      if (!this.charts.includes(this.memoryUtilizationChart)) {
        this.charts.push(this.memoryUtilizationChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkRxInstance(): void {
    this.eksApiService.getNetworkRxInstance(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getNetworkRxInstanceCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getNetworkRxInstanceCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.networkRxChart) {
          this.networkRxChart.destroy();
        }

        this.networkRxChart = Highcharts.chart('networkRxChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.networkRxChart) {
        this.networkRxChart.destroy();
      }

      this.networkRxChart = Highcharts.chart('networkRxChartContainer', {
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
      if (!this.charts.includes(this.networkRxChart)) {
        this.charts.push(this.networkRxChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkRxErrorCount(): void {
    this.eksApiService.getNetworkRxErrorCount(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getNetworkRxErrorCountCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getNetworkRxErrorCountCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.networkRxErrorCountChart) {
          this.networkRxErrorCountChart.destroy();
        }

        this.networkRxErrorCountChart = Highcharts.chart('networkRxErrorCountChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.networkRxErrorCountChart) {
        this.networkRxErrorCountChart.destroy();
      }

      this.networkRxErrorCountChart = Highcharts.chart('networkRxErrorCountChartContainer', {
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
      if (!this.charts.includes(this.networkRxErrorCountChart)) {
        this.charts.push(this.networkRxErrorCountChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkTxInstance(): void {
    this.eksApiService.getNetworkTxInstance(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getnetworkTxCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getnetworkTxCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.networkTxChart) {
          this.networkTxChart.destroy();
        }

        this.networkTxChart = Highcharts.chart('networkTxChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.networkTxChart) {
        this.networkTxChart.destroy();
      }

      this.networkTxChart = Highcharts.chart('networkTxChartContainer', {
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
      if (!this.charts.includes(this.networkTxChart)) {
        this.charts.push(this.networkTxChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkTxErrorCount(): void {
    this.eksApiService.getNetworkTxErrorCount(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getNetworkTxErrorCountCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getNetworkTxErrorCountCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.networkTxErrorCountChart) {
          this.networkTxErrorCountChart.destroy();
        }

        this.networkTxErrorCountChart = Highcharts.chart('networkTxErrorCountChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.networkTxErrorCountChart) {
        this.networkTxErrorCountChart.destroy();
      }

      this.networkTxErrorCountChart = Highcharts.chart('networkTxErrorCountChartContainer', {
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
      if (!this.charts.includes(this.networkTxErrorCountChart)) {
        this.charts.push(this.networkTxErrorCountChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getFsUtilization(): void {
    this.eksApiService.getFsUtilization(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getFsUtilizationCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getFsUtilizationCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.fsUtilizationChart) {
          this.fsUtilizationChart.destroy();
        }

        this.fsUtilizationChart = Highcharts.chart('fsUtilizationChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.fsUtilizationChart) {
        this.fsUtilizationChart.destroy();
      }

      this.fsUtilizationChart = Highcharts.chart('fsUtilizationChartContainer', {
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
      if (!this.charts.includes(this.fsUtilizationChart)) {
        this.charts.push(this.fsUtilizationChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getDiskIORead(): void {
    this.eksApiService.getDiskIORead(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getDiskIOReadCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getDiskIOReadCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.diskIOReadChart) {
          this.diskIOReadChart.destroy();
        }

        this.diskIOReadChart = Highcharts.chart('diskIOReadChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.diskIOReadChart) {
        this.diskIOReadChart.destroy();
      }

      this.diskIOReadChart = Highcharts.chart('diskIOReadChartContainer', {
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
      if (!this.charts.includes(this.diskIOReadChart)) {
        this.charts.push(this.diskIOReadChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getDiskIOWrite(): void {
    this.eksApiService.getDiskIOWrite(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getDiskIOWriteCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getDiskIOWriteCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.diskIOWriteChart) {
          this.diskIOWriteChart.destroy();
        }

        this.diskIOWriteChart = Highcharts.chart('diskIOWriteChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.diskIOWriteChart) {
        this.diskIOWriteChart.destroy();
      }

      this.diskIOWriteChart = Highcharts.chart('diskIOWriteChartContainer', {
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
      if (!this.charts.includes(this.diskIOWriteChart)) {
        this.charts.push(this.diskIOWriteChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }





  // POD

  getCpuUtilizationPod(): void {
    this.eksApiService.getCpuUtilizationPod(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {

          this.getCpuUtilizationPodCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getCpuUtilizationPodCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.cpuUtilizationChartPod) {
          this.cpuUtilizationChartPod.destroy();
        }

        this.cpuUtilizationChartPod = Highcharts.chart('cpuUtilizationChartPodContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.cpuUtilizationChartPod) {
        this.cpuUtilizationChartPod.destroy();
      }

      this.cpuUtilizationChartPod = Highcharts.chart('cpuUtilizationChartPodContainer', {
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
      if (!this.charts.includes(this.cpuUtilizationChartPod)) {
        this.charts.push(this.cpuUtilizationChartPod);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getMemoryUtilizationPod(): void {
    this.eksApiService.getMemoryUtilizationPod(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getMemoryUtilizationPodCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getMemoryUtilizationPodCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.memoryUtilizationChartPod) {
          this.memoryUtilizationChartPod.destroy();
        }

        this.memoryUtilizationChartPod = Highcharts.chart('memoryUtilizationChartPodContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.memoryUtilizationChartPod) {
        this.memoryUtilizationChartPod.destroy();
      }

      this.memoryUtilizationChartPod = Highcharts.chart('memoryUtilizationChartPodContainer', {
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
      if (!this.charts.includes(this.memoryUtilizationChartPod)) {
        this.charts.push(this.memoryUtilizationChartPod);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkTxPod(): void {
    this.eksApiService.getNetworkTxPod(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getNetworkTxPodCharts(data.data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getNetworkTxPodCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.networkTxChartPod) {
          this.networkTxChartPod.destroy();
        }

        this.networkTxChartPod = Highcharts.chart('networkTxChartPodContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.networkTxChartPod) {
        this.networkTxChartPod.destroy();
      }

      this.networkTxChartPod = Highcharts.chart('networkTxChartPodContainer', {
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
      if (!this.charts.includes(this.networkTxChartPod)) {
        this.charts.push(this.networkTxChartPod);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkTxErrorPod(): void {
    this.eksApiService.getNetworkTxErrorPod(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getNetworkTxErrorPodCharts(data.data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getNetworkTxErrorPodCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.networkTxErrorChartPod) {
          this.networkTxErrorChartPod.destroy();
        }

        this.networkTxErrorChartPod = Highcharts.chart('networkTxErrorChartPodContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.networkTxErrorChartPod) {
        this.networkTxErrorChartPod.destroy();
      }

      this.networkTxErrorChartPod = Highcharts.chart('networkTxErrorChartPodContainer', {
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
      if (!this.charts.includes(this.networkTxErrorChartPod)) {
        this.charts.push(this.networkTxErrorChartPod);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkRxPod(): void {
    this.eksApiService.getNetworkRxPod(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getNetworkRxPodCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getNetworkRxPodCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.networkRxChartPod) {
          this.networkRxChartPod.destroy();
        }

        this.networkRxChartPod = Highcharts.chart('networkRxChartPodContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.networkRxChartPod) {
        this.networkRxChartPod.destroy();
      }

      this.networkRxChartPod = Highcharts.chart('networkRxChartPodContainer', {
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
      if (!this.charts.includes(this.networkRxChartPod)) {
        this.charts.push(this.networkRxChartPod);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkRxErrorPod(): void {
    this.eksApiService.getNetworkRxErrorPod(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getNetworkRxErrorPodCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getNetworkRxErrorPodCharts(data: { time: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.networkRxErrorChartPod) {
          this.networkRxErrorChartPod.destroy();
        }

        this.networkRxErrorChartPod = Highcharts.chart('networkRxErrorChartPodContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time));

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

      if (this.networkRxErrorChartPod) {
        this.networkRxErrorChartPod.destroy();
      }

      this.networkRxErrorChartPod = Highcharts.chart('networkRxErrorChartPodContainer', {
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
      if (!this.charts.includes(this.networkRxErrorChartPod)) {
        this.charts.push(this.networkRxErrorChartPod);
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
