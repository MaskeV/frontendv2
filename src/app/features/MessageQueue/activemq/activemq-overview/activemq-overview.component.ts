import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import * as Highcharts from 'highcharts';
import { SeriesOptionsType } from 'highcharts';
import 'highcharts/modules/no-data-to-display';
import { ShortNumberPipe } from '../../../../pipes/short-number.pipe';
import { NumericDataPipe } from '../../../../pipes/numeric-data.pipe';
import { DateService } from '../../../../services/date.service';
import { ActivemqService } from '../../../../services/activemq.service';
import { filter, Subscription, switchMap, debounceTime } from 'rxjs';
import { ServiceIdService } from '../../../../services/service-id.service';
import { ObjectFilterPipe } from '../../../../pipes/object-filter.pipe';

@Component({
    selector: 'app-activemq-overview',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        MatIconModule,
        MatMenuModule,
        MatTooltipModule,
        ShortNumberPipe,
        NumericDataPipe,
        ObjectFilterPipe
    ],
    templateUrl: './activemq-overview.component.html',
    styleUrl: './activemq-overview.component.css'
})
export class ActivemqOverviewComponent implements OnInit, OnDestroy {

  selectedEntity!: any;
  selectedTab: string = 'overview';
  clusterName: string = 'activemq-cluster';

  getImagePath(): string {
    const tech = sessionStorage.getItem('activemqApplicationTechnology') || '';
    const appType = sessionStorage.getItem('activemqApplicationType') || '';
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    return 'assets/images/' + (t || a || 'activemq') + '.png';
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/img/technologies/UNKNOWN_CLOUD.png';
  }

  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  startTime!: number;
  endTime!: number;

  // KPIs
  clusterKPI = {
    uptimePCT: 99.9,
    totalBrokers: 3,
    memoryUsage: 65,
    storeUsage: 45,
    tempUsage: 10
  };

  // Broker Data
  brokers: any[] = [
    { name: 'BROKER1', id: 'broker-1' }
  ];
  searchTextBroker: string = '';

  // Destination Data
  destinations: any[] = [];
  searchTextDestination: string = '';

  // Topic Consumer Data
  topicConsumers: any[] = [
    { name: 'ActiveMQ.Advisory.MasterBroker', count: 0 },
    { name: 'ActiveMQ.Advisory.Queue', count: 0 }
  ];

  // Chart instances
  avgEnqueueChart!: Highcharts.Chart;
  maxEnqueueChart!: Highcharts.Chart;
  gcYoungCountChart!: Highcharts.Chart;
  gcOldCountChart!: Highcharts.Chart;
  gcYoungTimeChart!: Highcharts.Chart;
  gcOldTimeChart!: Highcharts.Chart;
  enqueueRateChart!: Highcharts.Chart;
  dequeueRateChart!: Highcharts.Chart;
  dispatchRateChart!: Highcharts.Chart;
  expiredRateChart!: Highcharts.Chart;
  systemLoadChart!: Highcharts.Chart;
  threadCountChart!: Highcharts.Chart;
  heapMemoryChart!: Highcharts.Chart;

  // Chart data (Sample)
  timeSeriesData: any[] = [];

  // Heap Memory Metrics
  heapMemoryInit: string | number = '-';
  heapMemoryCommitted: string | number = '-';
  heapMemoryMax: string | number = '-';

  constructor(private router: Router, private dateService: DateService, private activemqService: ActivemqService, private serviceIdService: ServiceIdService) { }
  ngOnDestroy(): void {
    if (this.datesubscription) {
      this.datesubscription.unsubscribe();
    }
  }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.selectedEntity = sessionStorage.getItem("encodedActiveMQServiceId");
    this.dateService.setActiveComponent("ActiveMQOverviewComponent");

    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter((activeComponent) => activeComponent === "ActiveMQOverviewComponent"),
        switchMap(() => this.dateService.date$),
        debounceTime(200)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);

        this.fetchHeapMemoryMetrics();
        this.fetchBrokers();
        this.fetchDestinations();
        this.renderCharts();

      });

  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "");
    return parseInt(date);
  }

  goToBroker(broker: any) {

    const brokerId = broker.trim();

    if (brokerId) {
      this.serviceIdService.setServiceId2(brokerId);
      const encodedBrokerId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedBrokerId', encodedBrokerId);
      this.router.navigate(['/activemq/broker']);
    } else {
      console.error('Broker Name is undefined or empty');
    }
    console.log("Navigating to Broker ");


  }

  goToDestination(destination: any) {

    const destinationId = destination.trim();

    if (destinationId) {
      this.serviceIdService.setServiceId2(destinationId);
      const encodedDestinationId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedDestinationId', encodedDestinationId);
      this.router.navigate(['/activemq/destination']);
    } else {
      console.error('Destination Name is undefined or empty');
    }
  }

  goToClusterList() {
    this.router.navigate(['/activemq/']);
  }


  loadData(tab: string) {
    this.selectedTab = tab;
    if (tab === 'overview') {
      setTimeout(() => {
        this.renderCharts();
      }, 100);
    } else if (tab === 'broker') {
      this.fetchBrokers();
    }
  }

  generateSampleData() {
    const now = new Date().getTime();
    const points = 50;
    for (let i = 0; i < points; i++) {
      this.timeSeriesData.push({
        x: now - (points - i) * 60000, // 1 minute intervals
        y: Math.floor(Math.random() * 100)
      });
    }
  }

  renderCharts() {
    this.renderSystemLoadChart();
    this.renderThreadCountChart();
    this.renderHeapMemoryChart();
    this.renderAvgEnqueueChart();
    this.renderMaxEnqueueChart();
    this.renderGCYoungCountChart();
    this.renderGCOldCountChart();
    this.renderGCYoungTimeChart();
    this.renderGCOldTimeChart();
    this.renderEnqueueRateChart();
    this.renderDequeueRateChart();
    this.renderDispatchRateChart();
    this.renderExpiredRateChart();
  }

  renderAvgEnqueueChart() {
    this.activemqService.getAverageEnqueue(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getAreaSplineChartOptions([{ name: 'Avg Enqueue', data: seriesData }] as any, '#6366F1');
          if (document.getElementById('avg-enqueue-chart')) {
            this.avgEnqueueChart = Highcharts.chart('avg-enqueue-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching average enqueue:", error);
      }
    });

  }

  renderMaxEnqueueChart() {
    this.activemqService.getMaxEnqueue(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getAreaSplineChartOptions([{ name: 'Max Enqueue', data: seriesData }] as any, '#F59E0B');
          if (document.getElementById('max-enqueue-chart')) {
            this.maxEnqueueChart = Highcharts.chart('max-enqueue-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching max enqueue:", error);
      }
    });
  }

  renderGCYoungCountChart() {
    this.activemqService.getGcYoungCollectionCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getColumnChartOption([{ name: 'GC Young Count', data: seriesData }] as any, '#3B82F6');
          if (document.getElementById('gc-young-count-chart')) {
            this.gcYoungCountChart = Highcharts.chart('gc-young-count-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching GC Young Count:", error);
      }
    });
  }

  renderGCOldCountChart() {
    this.activemqService.getGcOldCollectionCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getColumnChartOption([{ name: 'GC Old Count', data: seriesData }] as any, '#10B981');
          if (document.getElementById('gc-old-count-chart')) {
            this.gcOldCountChart = Highcharts.chart('gc-old-count-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching GC Old Count:", error);
      }
    });

  }

  renderGCYoungTimeChart() {
    this.activemqService.getGcYoungCollectionTime(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'GC Young Time', data: seriesData }] as any, '#8B5CF6');
          if (document.getElementById('gc-young-time-chart')) {
            this.gcYoungTimeChart = Highcharts.chart('gc-young-time-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching GC Young Time:", error);
      }
    });
  }

  renderGCOldTimeChart() {
    this.activemqService.getGcOldCollectionTime(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'GC Old Time', data: seriesData }] as any, '#F43F5E');
          if (document.getElementById('gc-old-time-chart')) {
            this.gcOldTimeChart = Highcharts.chart('gc-old-time-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching GC Old Time:", error);
      }
    });
  }

  renderEnqueueRateChart() {
    this.activemqService.getEnqueueCountPerSecond(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'Enqueue Rate', data: seriesData }] as any, '#06B6D4');
          if (document.getElementById('enqueue-rate-chart')) {
            this.enqueueRateChart = Highcharts.chart('enqueue-rate-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching enqueue rate:", error);
      }
    });
  }

  renderDequeueRateChart() {
    this.activemqService.getDequeueCountPerSecond(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'Dequeue Rate', data: seriesData }] as any, '#84CC16');
          if (document.getElementById('dequeue-rate-chart')) {
            this.dequeueRateChart = Highcharts.chart('dequeue-rate-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching dequeue rate:", error);
      }
    });
  }

  renderDispatchRateChart() {
    this.activemqService.getDispatchPerSecond(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'Dispatch Rate', data: seriesData }] as any, '#14B8A6');
          if (document.getElementById('dispatch-rate-chart')) {
            this.dispatchRateChart = Highcharts.chart('dispatch-rate-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching dispatch rate:", error);
      }
    });
  }

  renderExpiredRateChart() {
    this.activemqService.getExpirePerSecond(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'Expired Rate', data: seriesData }] as any, '#EC4899');
          if (document.getElementById('expired-rate-chart')) {
            this.expiredRateChart = Highcharts.chart('expired-rate-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching expired rate:", error);
      }
    });
  }

  renderSystemLoadChart() {
    this.activemqService.getSystemLoadAverage(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getColumnChartOption([{ name: 'System Load', data: seriesData }] as any, '#6366F1');
          if (document.getElementById('system-load-chart')) {
            this.systemLoadChart = Highcharts.chart('system-load-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching system load average:", error);
      }
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

  renderThreadCountChart() {
    this.activemqService.getThreadCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'Thread Count', data: seriesData }] as any, '#F59E0B');
          if (document.getElementById('thread-count-chart')) {
            this.threadCountChart = Highcharts.chart('thread-count-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching thread count:", error);
      }
    });
  }

  renderHeapMemoryChart() {
    this.activemqService.getHeapMemoryUsage(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics) {
          const seriesData = data.metrics.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'Heap Memory', data: seriesData }] as any, '#3B82F6');
          if (document.getElementById('heap-memory-chart')) {
            this.heapMemoryChart = Highcharts.chart('heap-memory-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching heap memory usage:", error);
      }
    });
  }

  // Helper definitions
  fetchBrokers() {
    this.activemqService.getBrokerNames(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.broker_names && Array.isArray(data.broker_names)) {
          this.brokers = data.broker_names.map((name: string, index: number) => ({
            name: name,
            id: `broker-${index + 1}`
          }));
        } else {
          this.brokers = [];
        }
      },
      error: (error) => {
        console.error("Error fetching broker names:", error);
        this.brokers = [];
      }
    });
  }

  fetchDestinations() {
    this.activemqService.getDestinationNames(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.destination_endpoints) {
          this.destinations = data.destination_endpoints.map((name: string) => ({ name }));
        }
      },
      error: (error) => console.error("Error fetching destination names:", error)
    });
  }

  fetchHeapMemoryMetrics() {
    this.activemqService.getHeapMemoryInit(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics && data.metrics.length > 0) {
          this.heapMemoryInit = data.metrics[0].value;
        }
      },
      error: (error) => console.error("Error fetching Heap Memory Init:", error)
    });

    this.activemqService.getHeapMemoryCommitted(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics && data.metrics.length > 0) {
          this.heapMemoryCommitted = data.metrics[0].value;
        }
      },
      error: (error) => console.error("Error fetching Heap Memory Committed:", error)
    });

    this.activemqService.getHeapMemoryMax(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.metrics && data.metrics.length > 0) {
          this.heapMemoryMax = data.metrics[0].value;
        }
      },
      error: (error) => console.error("Error fetching Heap Memory Max:", error)
    });
  }

  getCommonChartOptions(seriesData: SeriesOptionsType[], color: string): Highcharts.Options {
    return {
      chart: { backgroundColor: 'white' },
      title: { text: '' },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: 'datetime',
        visible: true,
        labels: { style: { fontSize: '10px' } }
      },
      yAxis: {
        title: { text: '' },
        gridLineColor: '#f3f4f6'
      },
      plotOptions: {
        series: {
          marker: { enabled: false },
          lineWidth: 2,
          color: color
        }
      },
      series: seriesData
    };
  }

  getAreaSplineChartOptions(seriesData: SeriesOptionsType[], color: string): Highcharts.Options {
    const options = this.getCommonChartOptions(seriesData, color);
    options.chart!.type = 'areaspline';
    if (options.plotOptions?.series) {
      (options.plotOptions.series as any).fillColor = {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, color + '55'], // Opacity ~33%
          [1, color + '00']  // Opacity 0%
        ]
      };
    }
    return options;
  }

  getSplineChartOptions(seriesData: SeriesOptionsType[], color: string): Highcharts.Options {
    const options = this.getCommonChartOptions(seriesData, color);
    options.chart!.type = 'spline';
    return options;
  }

  getColumnChartOption(seriesData: SeriesOptionsType[], color: string): Highcharts.Options {
    const options = this.getCommonChartOptions(seriesData, color);
    options.chart!.type = 'column';
    return options;
  }

}
