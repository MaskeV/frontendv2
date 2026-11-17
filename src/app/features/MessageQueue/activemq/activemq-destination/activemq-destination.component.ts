import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as Highcharts from 'highcharts';
import { SeriesOptionsType } from 'highcharts';
import 'highcharts/modules/no-data-to-display';
import { DateService } from '../../../../services/date.service';
import { ActivemqService } from '../../../../services/activemq.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { debounceTime, filter, Subscription, switchMap } from 'rxjs';

@Component({
    selector: 'app-activemq-destination',
    imports: [CommonModule, RouterModule, MatTooltipModule],
    templateUrl: './activemq-destination.component.html',
    styleUrl: './activemq-destination.component.css'
})
export class ActivemqDestinationComponent implements OnInit, OnDestroy {

  selectedActiveMQId!: any;
  selectedDestinationId!: any;
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
  destinationName: string = '';

  // Chart Instances
  producerCountChart!: Highcharts.Chart;
  consumerCountChart!: Highcharts.Chart;
  memoryUsageChart!: Highcharts.Chart;
  queueSizeChart!: Highcharts.Chart;
  messageCountChart!: Highcharts.Chart;
  avgEnqueueTimeChart!: Highcharts.Chart;
  maxEnqueueTimeChart!: Highcharts.Chart;

  constructor(private router: Router, private dateService: DateService, private activemqService: ActivemqService, private serviceIdService: ServiceIdService) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.selectedActiveMQId = sessionStorage.getItem("encodedActiveMQServiceId");
    this.selectedDestinationId = sessionStorage.getItem("encodedDestinationId");
    this.selectedEntity = this.selectedActiveMQId + "_" + this.selectedDestinationId;

    this.destinationName = this.selectedDestinationId ? atob(this.selectedDestinationId) : '';
    this.dateService.setActiveComponent("ActivemqDestinationComponent");

    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter((activeComponent) => activeComponent === "ActivemqDestinationComponent"),
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
    this.renderProducerCountChart();
    this.renderConsumerCountChart();
    this.renderMemoryUsageChart();
    this.renderQueueSizeChart();
    this.renderMessageCountChart();
    this.renderAvgEnqueueTimeChart();
    this.renderMaxEnqueueTimeChart();
  }

  renderProducerCountChart() {
    this.activemqService.getDestinationProducerCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.producerCount) {
          const seriesData = data.producerCount.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const producerOptions = this.getSplineChartOptions([{ name: 'Producer Count', data: seriesData }] as any, '#4BC0C0');
          if (document.getElementById('producer-count-chart')) {
            this.producerCountChart = Highcharts.chart('producer-count-chart', producerOptions);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching destination producer count:", error);
      }
    });
  }

  renderConsumerCountChart() {
    this.activemqService.getDestinationConsumerCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.consumerCount) {
          const seriesData = data.consumerCount.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const consumerOptions = this.getSplineChartOptions([{ name: 'Consumer Count', data: seriesData }] as any, '#FF6384');
          if (document.getElementById('consumer-count-chart')) {
            this.consumerCountChart = Highcharts.chart('consumer-count-chart', consumerOptions);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching destination consumer count:", error);
      }
    });
  }

  renderMemoryUsageChart() {
    this.activemqService.getDestinationMemoryUsage(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.memoryUsage) {
          const seriesData = data.memoryUsage.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const memoryOptions = this.getSplineChartOptions([{ name: 'Memory Usage', data: seriesData }] as any, '#36A2EB');
          if (document.getElementById('memory-usage-chart')) {
            this.memoryUsageChart = Highcharts.chart('memory-usage-chart', memoryOptions);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching destination memory usage:", error);
      }
    });
  }

  renderQueueSizeChart() {
    this.activemqService.getDestinationQueueSize(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.queueSize) {
          const seriesData = data.queueSize.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const queueOptions = this.getAreaSplineChartOptions([{ name: 'Queue Size', data: seriesData }] as any, '#FF9F40');
          if (document.getElementById('queue-size-chart')) {
            this.queueSizeChart = Highcharts.chart('queue-size-chart', queueOptions);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching destination queue size:", error);
      }
    });
  }

  renderMessageCountChart() {
    this.activemqService.getDestinationMessageCount(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data) {
          const series: any[] = [];
          if (data.enqueueCount) {
            series.push({
              name: 'Enqueue Count',
              data: data.enqueueCount.map((item: any) => ({ x: this.parseTimeBucket(item.time.toString()).getTime(), y: item.value }))
            });
          }
          if (data.dequeueCount) {
            series.push({
              name: 'Dequeue Count',
              data: data.dequeueCount.map((item: any) => ({ x: this.parseTimeBucket(item.time.toString()).getTime(), y: item.value }))
            });
          }
          if (data.dispatchCount) {
            series.push({
              name: 'Dispatch Count',
              data: data.dispatchCount.map((item: any) => ({ x: this.parseTimeBucket(item.time.toString()).getTime(), y: item.value }))
            });
          }
          if (data.inflightCount) {
            series.push({
              name: 'Inflight Count',
              data: data.inflightCount.map((item: any) => ({ x: this.parseTimeBucket(item.time.toString()).getTime(), y: item.value }))
            });
          }
          if (data.expiredCount) {
            series.push({
              name: 'Expired Count',
              data: data.expiredCount.map((item: any) => ({ x: this.parseTimeBucket(item.time.toString()).getTime(), y: item.value }))
            });
          }

          if (series.length > 0) {
            const messageOptions = this.getAreaSplineChartOptions(series as any, '#9966FF');

            // Allow multiple colors for different series since AreaSpline logic hardcodes one color otherwise
            delete messageOptions.plotOptions?.series?.color;
            if (messageOptions.chart) messageOptions.chart.type = 'spline'; // Convert to spline for easier multi-series distinction without messy gradients

            if (document.getElementById('message-count-chart')) {
              this.messageCountChart = Highcharts.chart('message-count-chart', messageOptions);
            }
          }
        }
      },
      error: (error) => {
        console.error("Error fetching destination message count:", error);
      }
    });
  }

  renderAvgEnqueueTimeChart() {
    this.activemqService.getDestinationAvgEnqueueTime(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.avgEnqueueTime) {
          const seriesData = data.avgEnqueueTime.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const avgOptions = this.getSplineChartOptions([{ name: 'Avg Enqueue Time', data: seriesData }] as any, '#FFCD56');
          if (document.getElementById('avg-enqueue-time-chart')) {
            this.avgEnqueueTimeChart = Highcharts.chart('avg-enqueue-time-chart', avgOptions);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching destination avg enqueue time:", error);
      }
    });
  }

  renderMaxEnqueueTimeChart() {
    this.activemqService.getDestinationMaxEnqueueTime(this.selectedEntity, this.startTime, this.endTime).subscribe({
      next: (data) => {
        if (data && data.maxEnqueueTime) {
          const seriesData = data.maxEnqueueTime.map((item: any) => ({
            x: this.parseTimeBucket(item.time.toString()).getTime(),
            y: item.value
          }));

          const maxOptions = this.getSplineChartOptions([{ name: 'Max Enqueue Time', data: seriesData }] as any, '#C9CBCF');
          if (document.getElementById('max-enqueue-time-chart')) {
            this.maxEnqueueTimeChart = Highcharts.chart('max-enqueue-time-chart', maxOptions);
          }
        }
      },
      error: (error) => {
        console.error("Error fetching destination max enqueue time:", error);
      }
    });
  }

  getCommonChartOptions(seriesData: SeriesOptionsType[], color: string): Highcharts.Options {
    return {
      chart: {
        backgroundColor: 'white',
        reflow: true
      },
      title: { text: '' },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: 'datetime',
        visible: true,
        labels: { style: { fontSize: '10px' }, format: '{value:%H:%M}' },
        tickPixelInterval: 50
      },
      yAxis: {
        title: { text: '' },
        gridLineColor: '#f3f4f6',
        labels: { style: { fontSize: '10px' } }
      },
      plotOptions: {
        series: {
          marker: { enabled: true, radius: 2 },
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
      name: 'Data', // Generic name
      data: data
    }];
  }
}
