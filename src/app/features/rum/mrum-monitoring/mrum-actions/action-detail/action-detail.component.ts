import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more.js';
import SolidGauge from 'highcharts/modules/solid-gauge.js';

// Initialize modules
try {
  (HighchartsMore as any).default?.(Highcharts);
  (SolidGauge as any).default?.(Highcharts);
} catch (e) {
  console.warn('Highcharts modules already initialized', e);
}
@Component({
  selector: 'app-action-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HighchartsChartModule, MrumBreadcrumbComponent],
  templateUrl: './action-detail.component.html',
  styleUrls: ['./action-detail.component.css']
})
export class ActionDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  Highcharts: typeof Highcharts = Highcharts;
  
  actionName: string = 'Action Details';
  serviceId: string = '';
  startTime: string = '';
  endTime: string = '';
  sessionId: string = '';
  isSessionContext: boolean = false;
  isFromWaterfall: boolean = false;
  
  breadcrumbData: BreadcrumbItem[] = [];

  // KPI Data
  totalExecutions = '24,562';
  avgDuration = '542 ms';
  p90Duration = '1.18 s';
  p95Duration = '1.62 s';
  errorRate = '1.80%';
  apdex = '0.91';

  // Highcharts Options
  durationChartOptions: Highcharts.Options = {};
  frequencyChartOptions: Highcharts.Options = {};
  successDonutOptions: Highcharts.Options = {};
  apdexOverTimeOptions: Highcharts.Options = {};
  apdexGaugeOptions: Highcharts.Options = {};
  failedExecutionsChartOptions: Highcharts.Options = {};

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.actionName = params['actionName'] || 'Touch Product Details';
    });
    
    this.route.queryParams.subscribe(params => {
      this.serviceId = params['serviceId'] || '';
      this.startTime = params['st'] || '';
      this.endTime = params['et'] || '';
      this.sessionId = params['sessionId'] || '';
      this.isSessionContext = !!this.sessionId;
      this.isFromWaterfall = params['from'] === 'waterfall';
      this.updateBreadcrumbs();
    });
    
    this.initCharts();
  }

  updateBreadcrumbs() {
    this.breadcrumbData = [
      { label: 'MRUM', url: '/mrum' },
      { 
        label: this.serviceId || 'Overview', 
        url: '/mrum/mrum-overview', 
        queryParams: { serviceId: this.serviceId, tab: 'overview', st: this.startTime, et: this.endTime } 
      }
    ];

    if (this.isFromWaterfall) {
      this.breadcrumbData.push(
        { 
          label: `Session Id ${this.sessionId.slice(0, 5)}...`, 
          url: '/mrum/mrum-session',
          queryParams: { serviceId: this.serviceId, sessionId: this.sessionId, st: this.startTime, et: this.endTime }
        },
        {
          label: 'User Action Analysis',
          url: '/mrum/action-waterfall',
          queryParams: { serviceId: this.serviceId, sessionId: this.sessionId, actionName: this.actionName, st: this.startTime, et: this.endTime }
        }
      );
    } else {
      this.breadcrumbData.push({ label: 'Actions', isClickableBack: true });
    }

    this.breadcrumbData.push({ label: this.actionName });
  }

  ngAfterViewInit() {
    this.renderSparklines();
  }

  ngOnDestroy() {}
  
  goBack() {
    if (this.isSessionContext) {
      this.router.navigate(['/mrum/mrum-session'], {
        queryParams: {
          serviceId: this.serviceId,
          st: this.startTime,
          et: this.endTime,
          sessionId: this.sessionId
        },
        queryParamsHandling: 'merge'
      });
    } else {
      this.router.navigate(['/mrum/actions'], {
        queryParams: {
          serviceId: this.serviceId,
          st: this.startTime,
          et: this.endTime
        },
        queryParamsHandling: 'merge'
      });
    }
  }

  viewAllSessions() {
    this.router.navigate(['/mrum/sessions-overview'], {
      queryParams: {
        serviceId: this.serviceId,
        st: this.startTime,
        et: this.endTime,
        viewMode: 'sessions',
        status: 'error',
        actionName: this.actionName
      },
      queryParamsHandling: 'merge'
    });
  }

  viewAllUsers() {
    this.router.navigate(['/mrum/users-overview'], {
      queryParams: {
        serviceId: this.serviceId,
        st: this.startTime,
        et: this.endTime,
        viewMode: 'users',
        actionName: this.actionName
      },
      queryParamsHandling: 'merge'
    });
  }

  viewAllErrors() {
    this.router.navigate(['/mrum/mrum-errors-list'], {
      queryParams: {
        serviceId: this.serviceId,
        st: this.startTime,
        et: this.endTime,
        actionName: this.actionName
      },
      queryParamsHandling: 'merge'
    });
  }

  initCharts() {
    // 1. Duration Chart (3 lines)
    this.durationChartOptions = {
      chart: { type: 'spline', height: 300, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: { categories: ['10:10', '10:15', '10:20', '10:25', '10:30', '10:35'] },
      yAxis: { title: { text: undefined }, labels: { format: '{value} s' }, min: 0 },
      tooltip: { shared: true },
      plotOptions: { spline: { marker: { enabled: false }, lineWidth: 2 } },
      series: [
        { name: 'P95 Duration', data: [1.2, 1.3, 1.1, 1.4, 1.2, 1.5], color: '#ef4444', type: 'spline' },
        { name: 'P90 Duration', data: [0.9, 1.0, 0.8, 1.1, 0.9, 1.0], color: '#f59e0b', type: 'spline' },
        { name: 'Avg Duration', data: [0.5, 0.6, 0.5, 0.5, 0.4, 0.6], color: '#8b5cf6', type: 'spline' }
      ]
    };

    // 2. Frequency Chart (Column)
    this.frequencyChartOptions = {
      chart: { type: 'column', height: 300, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: { categories: ['10:10', '10:15', '10:20', '10:25', '10:30', '10:35'] },
      yAxis: { title: { text: undefined }, labels: { format: '{value}K' } },
      plotOptions: { column: { borderRadius: 3, borderWidth: 0, groupPadding: 0.1 } },
      series: [{ name: 'Frequency', data: [1.2, 1.8, 1.5, 2.1, 1.6, 1.2], color: '#8b5cf6', type: 'column' }]
    };

    // 3. Success vs Failed Donut
    this.successDonutOptions = {
      chart: { type: 'pie', height: 300, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      plotOptions: {
        pie: {
          innerSize: '75%',
          dataLabels: { enabled: false },
          borderWidth: 0
        }
      },
      series: [{
        name: 'Executions',
        data: [
          { name: 'Success', y: 98.2, color: '#10b981' },
          { name: 'Failed', y: 1.8, color: '#ef4444' }
        ],
        type: 'pie'
      }]
    };

    // 4. Apdex Over Time (Stacked Area)
    this.apdexOverTimeOptions = {
      chart: { type: 'area', height: 250, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: { categories: ['10:10', '10:15', '10:20', '10:25', '10:30', '10:35'] },
      yAxis: { max: 1, min: 0, title: { text: undefined } },
      plotOptions: {
        area: { stacking: 'normal', marker: { enabled: false }, lineWidth: 0, fillOpacity: 0.8 }
      },
      series: [
        { name: 'Excellent', data: [0.3, 0.35, 0.32, 0.38, 0.34, 0.3], color: '#10b981', type: 'area' },
        { name: 'Good', data: [0.25, 0.2, 0.25, 0.2, 0.25, 0.28], color: '#3b82f6', type: 'area' },
        { name: 'Fair', data: [0.3, 0.3, 0.28, 0.27, 0.26, 0.25], color: '#f59e0b', type: 'area' },
        { name: 'Poor', data: [0.15, 0.15, 0.15, 0.15, 0.15, 0.17], color: '#ef4444', type: 'area' }
      ]
    };

    // 5. Apdex Gauge
    this.apdexGaugeOptions = {
      chart: { type: 'solidgauge', height: 250, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      pane: {
        center: ['50%', '70%'],
        size: '100%',
        startAngle: -90,
        endAngle: 90,
        background: [{ backgroundColor: '#f1f5f9', innerRadius: '60%', outerRadius: '100%', shape: 'arc', borderWidth: 0 }]
      },
      yAxis: {
        min: 0,
        max: 1,
        stops: [
          [0.1, '#ef4444'], // red
          [0.5, '#f59e0b'], // yellow
          [0.9, '#10b981'] // green
        ],
        lineWidth: 0, tickWidth: 0, minorTickInterval: undefined, tickAmount: 2,
        labels: { y: 16 }
      },
      plotOptions: { solidgauge: { dataLabels: { y: 5, borderWidth: 0, useHTML: true } } },
      series: [{
        name: 'Apdex',
        data: [0.91],
        dataLabels: { format: '<div style="text-align:center"><span style="font-size:25px;font-weight:bold;color:black">{y}</span><br/><span style="font-size:12px;color:gray">Excellent</span></div>' },
        type: 'solidgauge'
      }]
    };

    // 6. Failed Executions Chart
    this.failedExecutionsChartOptions = {
      chart: { type: 'column', height: 250, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: { categories: ['10:10', '10:15', '10:20', '10:25', '10:30', '10:35'] },
      yAxis: { title: { text: undefined } },
      plotOptions: { column: { borderRadius: 2, borderWidth: 0 } },
      series: [{ name: 'Failures', data: [32, 45, 65, 42, 75, 54], color: '#8b5cf6', type: 'column' }]
    };
  }

  renderSparklines() {
    setTimeout(() => {
      this.renderSparkline('execSparkline', 'line', [1, 2, 3, 2, 4, 3, 5], '#8b5cf6');
      this.renderSparkline('durSparkline', 'line', [5, 4, 5, 3, 4, 2, 3], '#10b981');
      this.renderSparkline('p90Sparkline', 'line', [2, 3, 2, 4, 3, 5, 4], '#f59e0b');
      this.renderSparkline('p95Sparkline', 'line', [3, 4, 3, 5, 4, 6, 5], '#ea580c');
      this.renderSparkline('errSparkline', 'line', [2, 1, 2, 1, 3, 2, 1], '#ef4444');
    }, 100);
  }

  renderSparkline(containerId: string, type: 'line', data: number[], color: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.Highcharts.chart(containerId, {
      chart: { type: type, backgroundColor: 'transparent', margin: [0, 0, 0, 0], height: 40, style: { overflow: 'visible' } },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
      legend: { enabled: false },
      tooltip: { enabled: false },
      plotOptions: { series: { enableMouseTracking: false, lineWidth: 2, color: color, marker: { enabled: false } } },
      series: [{ type: type, data: data }] as any
    });
  }
}
