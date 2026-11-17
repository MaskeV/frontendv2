import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as Highcharts from 'highcharts';
import { SeriesOptionsType } from 'highcharts';
import 'highcharts/modules/no-data-to-display';
import { ActivemqService } from '../../../../services/activemq.service';
import { DateService } from '../../../../services/date.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { debounceTime, filter, Subscription, switchMap } from 'rxjs';

@Component({
    selector: 'app-activemq-broker',
    imports: [CommonModule, RouterModule, MatTooltipModule],
    templateUrl: './activemq-broker.component.html',
    styleUrl: './activemq-broker.component.css'
})
export class ActivemqBrokerComponent implements OnInit, OnDestroy {

  selectedActiveMQId!: any;
  selectedBrokerId!: any;
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

  brokerName: string = '';

  // Mock Data for Tables
  slaveBroker: number | string = 0;

  // Mock Data for KPIs
  uptime: number | string = 0;
  producerCount = 0;
  consumerCount = 0;

  // Chart instances
  connectionsChart!: Highcharts.Chart;
  incProducerChart!: Highcharts.Chart;
  incConsumerChart!: Highcharts.Chart;
  enqDeqCountChart!: Highcharts.Chart;
  enqDeqRateChart!: Highcharts.Chart;
  memoryUsageChart!: Highcharts.Chart;
  usageLimitChart!: Highcharts.Chart;
  messageSizeChart!: Highcharts.Chart;

  constructor(private router: Router, private dateService: DateService, private activemqService: ActivemqService, private serviceIdService: ServiceIdService) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });       
    const encodedBrokerId = sessionStorage.getItem("encodedBrokerId") || '';
    this.brokerName = encodedBrokerId ? atob(encodedBrokerId) : '';
    this.selectedActiveMQId = sessionStorage.getItem("encodedActiveMQServiceId");
    this.selectedBrokerId = sessionStorage.getItem("encodedBrokerId");
    this.selectedEntity = this.selectedActiveMQId + "_" + this.selectedBrokerId;

    this.dateService.setActiveComponent("ActivemqBrokerComponent");

    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter((activeComponent) => activeComponent === "ActivemqBrokerComponent"),
        switchMap(() => this.dateService.date$),
        debounceTime(200)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);

        setTimeout(() => {
          this.renderCharts();
        }, 100);

      });

  }

  ngOnDestroy(): void {
    if (this.datesubscription) {
      this.datesubscription.unsubscribe();
    }
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "");
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

  renderCharts() {
    this.fetchUptime();
    this.fetchSlaveBroker();
    this.fetchProducerConsumerCount();
    this.renderConnectionsChart();
    this.renderIncProducerChart();
    this.renderIncConsumerChart();
    this.renderEnqDeqCountChart();
    this.renderEnqDeqRateChart();
    this.renderMemoryUsageChart();
    this.renderUsageLimitChart();
    this.renderMessageSizeChart();
  }

  fetchUptime() {
    this.activemqService.getBrokerUptime(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && typeof data.BrokerUptime === 'number') {
          this.uptime = data.BrokerUptime;
        }
      },
      error: (error) => console.error("Error fetching broker uptime:", error)
    });
  }

  formatUptime(days: number | string): string {
    const d = parseFloat(days as string);
    if (isNaN(d) || d < 0) return "0";

    const fullDays = Math.floor(d);
    const remainderHours = (d - fullDays) * 24;
    const fullHours = Math.floor(remainderHours);
    const remainderMinutes = (remainderHours - fullHours) * 60;
    const fullMinutes = Math.floor(remainderMinutes);

    let result = "";
    if (fullDays > 0) result += `${fullDays}d `;
    if (fullHours > 0 || fullDays > 0) result += `${fullHours}h `;
    result += `${fullMinutes}m`;

    return result.trim();
  }

  fetchSlaveBroker() {
    this.activemqService.getBrokerSlave(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.BrokerSlave !== undefined) {
          this.slaveBroker = data.BrokerSlave;
        }
      },
      error: (error) => console.error("Error fetching slave broker:", error)
    });
  }

  fetchProducerConsumerCount() {
    this.activemqService.getCurrentProducerCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && typeof data.CurrentProducerCount === 'number') {
          this.producerCount = data.CurrentProducerCount;
        } else if (data && data.CurrentProducerCount && typeof data.CurrentProducerCount[0] === 'number') {
          this.producerCount = data.CurrentProducerCount[0];
        }
      },
      error: (error) => console.error("Error fetching current producer count:", error)
    });

    this.activemqService.getCurrentConsumerCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && typeof data.CurrentConsumerCount === 'number') {
          this.consumerCount = data.CurrentConsumerCount;
        } else if (data && data.CurrentConsumerCount && typeof data.CurrentConsumerCount[0] === 'number') {
          this.consumerCount = data.CurrentConsumerCount[0];
        }
      },
      error: (error) => console.error("Error fetching current consumer count:", error)
    });
  }

  renderConnectionsChart() {
    this.activemqService.getBrokerConnections(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.currentConnections) {
          const seriesData = data.currentConnections.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'Connections', data: seriesData }] as any, '#3B82F6');
          if (document.getElementById('connections-chart')) {
            this.connectionsChart = Highcharts.chart('connections-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching connections count:", error);
      }
    });
  }

  renderIncProducerChart() {
    this.activemqService.getIncreasedProducerCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.brokerProducerCount) {
          const seriesData = data.brokerProducerCount.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getColumnChartOption([{ name: 'Increased Producer Count', data: seriesData }] as any, '#10B981');
          console.log('--- rendering inc-producer-chart ---');
          console.log('seriesData mapped:', seriesData);
          if (document.getElementById('inc-producer-chart')) {
            this.incProducerChart = Highcharts.chart('inc-producer-chart', options);
            console.log('inc-producer-chart rendered successfully!');
          } else {
            console.warn('DOM Element inc-producer-chart was not found!');
          }
        }
      },
      error: (error) => {
        console.error("Error fetching increased producer count:", error);
      }
    });
  }

  renderIncConsumerChart() {
    this.activemqService.getIncreasedConsumerCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.brokerConsumerCount) {
          const seriesData = data.brokerConsumerCount.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getColumnChartOption([{ name: 'Increased Consumer Count', data: seriesData }] as any, '#6366F1');
          if (document.getElementById('inc-consumer-chart')) {
            this.incConsumerChart = Highcharts.chart('inc-consumer-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching increased consumer count:", error);
      }
    });
  }

  renderEnqDeqCountChart() {
    this.activemqService.getEnqueueDequeueCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data) {
          const enqueueSeriesData = data.EnqueueCount ? data.EnqueueCount.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          })) : [];

          const dequeueSeriesData = data.brokerDequeueCount ? data.brokerDequeueCount.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          })) : [];

          const series = [
            { name: 'Enqueue', data: enqueueSeriesData, color: '#3B82F6' },
            { name: 'Dequeue', data: dequeueSeriesData, color: '#8B5CF6' }
          ] as SeriesOptionsType[];

          const options = this.getSplineChartOptions(series, '');
          options.legend = { enabled: true, align: 'left', verticalAlign: 'top' };
          if (document.getElementById('enq-deq-count-chart')) {
            this.enqDeqCountChart = Highcharts.chart('enq-deq-count-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching enqueue/dequeue count:", error);
      }
    });
  }

  renderEnqDeqRateChart() {
    this.activemqService.getEnqueueDequeueRate(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data) {
          const enqueueSeriesData = data.EnqueueRate ? data.EnqueueRate.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          })) : [];

          const dequeueSeriesData = data.DequeueRate ? data.DequeueRate.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          })) : [];

          const series = [
            { name: 'Enqueue', data: enqueueSeriesData, color: '#3B82F6' },
            { name: 'Dequeue', data: dequeueSeriesData, color: '#8B5CF6' }
          ] as SeriesOptionsType[];

          const options = this.getSplineChartOptions(series, '');
          options.legend = { enabled: true, align: 'left', verticalAlign: 'top' };
          if (document.getElementById('enq-deq-rate-chart')) {
            this.enqDeqRateChart = Highcharts.chart('enq-deq-rate-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching enqueue/dequeue rate:", error);
      }
    });
  }

  renderMemoryUsageChart() {
    this.activemqService.getMemoryUsage(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.memoryUsage) {
          const seriesData = data.memoryUsage.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const options = this.getSplineChartOptions([{ name: 'Memory Usage', data: seriesData }] as any, '#3B82F6');
          if (document.getElementById('memory-usage-chart')) {
            this.memoryUsageChart = Highcharts.chart('memory-usage-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching memory usage:", error);
      }
    });
  }

  renderUsageLimitChart() {
    this.activemqService.getUsageLimit(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data) {
          const memorySeriesData = data.memoryLimit ? data.memoryLimit.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          })) : [];

          const storeSeriesData = data.storeLimit ? data.storeLimit.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          })) : [];

          const tempSeriesData = data.tempLimit ? data.tempLimit.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          })) : [];

          const series = [
            { name: 'Memory Usage Limit', data: memorySeriesData, color: '#3B82F6' },
            { name: 'Store Usage Limit', data: storeSeriesData, color: '#8B5CF6' },
            { name: 'Temp Usage Limit', data: tempSeriesData, color: '#14B8A6' }
          ] as SeriesOptionsType[];

          const options = this.getAreaSplineChartOptions(series, '');
          options.legend = { enabled: true, align: 'left', verticalAlign: 'top' };

          if (document.getElementById('usage-limit-chart')) {
            this.usageLimitChart = Highcharts.chart('usage-limit-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching usage limit:", error);
      }
    });
  }

  renderMessageSizeChart() {
    this.activemqService.getMessageSize(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data) {
          const avgSizeSeriesData = data.averageMessageSize ? data.averageMessageSize.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          })) : [];

          const maxSizeSeriesData = data.maxMessageSize ? data.maxMessageSize.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          })) : [];

          const series = [
            { name: 'Average Message Size', data: avgSizeSeriesData, color: '#3B82F6' },
            { name: 'Max Message Size', data: maxSizeSeriesData, color: '#8B5CF6' }
          ] as SeriesOptionsType[];

          const options = this.getAreaSplineChartOptions(series, '');
          options.legend = { enabled: true, align: 'left', verticalAlign: 'top' };

          if (document.getElementById('message-size-chart')) {
            this.messageSizeChart = Highcharts.chart('message-size-chart', options);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching message size:", error);
      }
    });
  }


  // --- Helpers (Copied/Adapted from Overview) ---

  generateSeriesData(min: number, max: number): any[] {
    const now = new Date().getTime();
    const points = 20;
    const data = [];
    for (let i = 0; i < points; i++) {
      data.push({
        x: now - (points - i) * 60000,
        y: Math.floor(Math.random() * (max - min + 1)) + min
      });
    }
    return [{
      name: 'Sample Data',
      data: data
    }];
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
        gridLineColor: '#f3f4f6',
        min: 0
      },
      plotOptions: {
        series: {
          marker: { enabled: false }, // matching likely default or explicitly set
          lineWidth: 2,
          color: color
        }
      },
      series: seriesData
    };
  }

  getSplineChartOptions(seriesData: SeriesOptionsType[], color: string): Highcharts.Options {
    const options = this.getCommonChartOptions(seriesData, color);
    options.chart!.type = 'spline';
    return options;
  }

  getAreaSplineChartOptions(seriesData: SeriesOptionsType[], color: string): Highcharts.Options {
    const options = this.getCommonChartOptions(seriesData, color);
    options.chart!.type = 'areaspline';
    if (color && options.plotOptions?.series) {
      (options.plotOptions.series as any).fillColor = {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, color + '55'],
          [1, color + '00']
        ]
      };
    }
    return options;
  }

  getColumnChartOption(seriesData: SeriesOptionsType[], color: string): Highcharts.Options {
    const options = this.getCommonChartOptions(seriesData, color);
    options.chart!.type = 'column';
    options.plotOptions = {
      ...options.plotOptions,
      column: {
        minPointLength: 2, // Ensure 0 values show a minimum 2px bar
        pointPadding: 0.2,
        groupPadding: 0.1,
        borderWidth: 0
      }
    };
    return options;
  }

}
