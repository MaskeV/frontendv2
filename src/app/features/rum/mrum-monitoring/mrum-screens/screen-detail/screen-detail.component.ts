import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';

try {
  const HighchartsMore = require('highcharts/highcharts-more.js');
  const SolidGauge = require('highcharts/modules/solid-gauge.js');
  HighchartsMore?.default?.(Highcharts) || HighchartsMore?.(Highcharts);
  SolidGauge?.default?.(Highcharts) || SolidGauge?.(Highcharts);
} catch(e) {}

@Component({
  selector: 'app-screen-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HighchartsChartModule, MrumBreadcrumbComponent],
  templateUrl: './screen-detail.component.html',
  styleUrls: ['./screen-detail.component.css']
})
export class ScreenDetailComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;
  
  screenName: string = 'Product Details';
  serviceId: string = '';
  
  breadcrumbData: BreadcrumbItem[] = [];

  // KPI Data
  screenViews = '2,849';
  avgLoadTime = '1.24 s';
  p50LoadTime = '820 ms';
  p90LoadTime = '1.98 s';
  p95LoadTime = '2.87 s';
  p99LoadTime = '4.82 s';

  apdex = '0.91';
  errorRate = '1.80%';
  crashRate = '0.20%';
  bounceRate = '12.4%';
  apdexImpacted = '132';
  sessionsImpacted = '245';

  // Highcharts Options (Mock data for the UI)
  loadTimeOverTimeOptions: Highcharts.Options = {};
  loadTimeDistributionOptions: Highcharts.Options = {};
  apdexOverTimeOptions: Highcharts.Options = {};
  apdexBreakdownOptions: Highcharts.Options = {};
  ttfbOptions: Highcharts.Options = {};
  errorRateOverTimeOptions: Highcharts.Options = {};
  crashRateOverTimeOptions: Highcharts.Options = {};
  errorsByTypeOptions: Highcharts.Options = {};
  crashesByDeviceOptions: Highcharts.Options = {};
  crashesByOSOptions: Highcharts.Options = {};
  crashFreeUsersOptions: Highcharts.Options = {};
  networkTypeDistributionOptions: Highcharts.Options = {};

  constructor(private route: ActivatedRoute, private router: Router, private location: Location) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.screenName = params['screenId'] || 'Product Details';
    });
    this.route.queryParams.subscribe(params => {
      this.serviceId = params['serviceId'] || '';
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
        queryParams: { serviceId: this.serviceId, tab: 'screens' },
        queryParamsHandling: 'merge'
      },
      { label: 'Screens', isClickableBack: true },
      { label: this.screenName }
    ];
  }

  goBack() {
    this.location.back();
  }

  initCharts() {
    this.loadTimeOverTimeOptions = {
      chart: { type: 'spline', backgroundColor: 'transparent', height: 220, spacing: [10, 0, 0, 0] },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: { categories: ['11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10', '12:15'], lineWidth: 1, tickWidth: 0 },
      yAxis: { title: { text: '' }, gridLineColor: '#f0f0f0', labels: { format: '{value} s' } },
      legend: { enabled: false },
      tooltip: { shared: true },
      series: [
        { type: 'spline', name: 'Avg. Load Time', data: [1.2, 1.3, 1.1, 1.4, 1.2, 1.3, 1.1, 1.2], color: '#6366f1', marker: { enabled: false } },
        { type: 'spline', name: 'P50', data: [0.8, 0.9, 0.7, 0.8, 0.9, 0.8, 0.7, 0.8], color: '#10b981', marker: { enabled: false } },
        { type: 'spline', name: 'P90', data: [1.9, 2.0, 1.8, 2.1, 1.9, 2.0, 1.8, 1.9], color: '#f59e0b', marker: { enabled: false } },
        { type: 'spline', name: 'P95', data: [2.8, 3.0, 2.7, 2.9, 2.8, 3.0, 2.7, 2.8], color: '#f97316', marker: { enabled: false } },
        { type: 'spline', name: 'P99', data: [4.8, 5.0, 4.6, 4.9, 4.8, 5.0, 4.6, 4.8], color: '#3b82f6', marker: { enabled: false } }
      ]
    };

    this.loadTimeDistributionOptions = {
      chart: { type: 'column', backgroundColor: 'transparent', height: 220, spacing: [10, 0, 0, 0] },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: { categories: ['0-500ms', '500ms-1s', '1s-1.5s', '1.5s-2s', '2s-3s', '3s-5s', '5s+'], lineWidth: 1, tickWidth: 0 },
      yAxis: { title: { text: '' }, gridLineColor: '#f0f0f0' },
      legend: { enabled: false },
      series: [
        { type: 'column', name: 'Sessions', data: [580, 820, 600, 300, 200, 100, 50], color: '#a855f7', borderRadius: 2 }
      ]
    };

    this.apdexOverTimeOptions = {
      chart: { type: 'area', backgroundColor: 'transparent', height: 180, spacing: [10, 0, 0, 0] },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: { categories: ['11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10', '12:15'], lineWidth: 1, tickWidth: 0 },
      yAxis: { title: { text: '' }, gridLineColor: '#f0f0f0' },
      legend: { enabled: false },
      plotOptions: { area: { stacking: 'normal', marker: { enabled: false } } },
      series: [
        { type: 'area', name: 'Poor', data: [0.05, 0.04, 0.06, 0.05, 0.04, 0.05, 0.04, 0.05], color: '#ef4444' },
        { type: 'area', name: 'Fair', data: [0.12, 0.15, 0.10, 0.13, 0.12, 0.14, 0.12, 0.12], color: '#f59e0b' },
        { type: 'area', name: 'Good', data: [0.24, 0.23, 0.26, 0.25, 0.24, 0.25, 0.26, 0.24], color: '#3b82f6' },
        { type: 'area', name: 'Excellent', data: [0.59, 0.58, 0.58, 0.57, 0.60, 0.56, 0.58, 0.59], color: '#10b981' }
      ]
    };

    this.apdexBreakdownOptions = {
      chart: { type: 'pie', backgroundColor: 'transparent', height: 180, spacing: [0, 0, 0, 0] },
      title: { text: '<div style="text-align:center"><span style="font-size:18px;font-weight:bold;color:#333;">0.91</span><br><span style="font-size:9px;color:#666;">Apdex Score</span></div>', align: 'center', verticalAlign: 'middle', y: 15, useHTML: true },
      credits: { enabled: false },
      plotOptions: { pie: { innerSize: '75%', dataLabels: { enabled: false }, borderWidth: 0 } },
      series: [{ type: 'pie', name: 'Sessions', data: [ { name: 'Excellent', y: 58.3, color: '#10b981' }, { name: 'Good', y: 24.6, color: '#3b82f6' }, { name: 'Fair', y: 12.5, color: '#f59e0b' }, { name: 'Poor', y: 4.6, color: '#ef4444' } ] }]
    };

    this.ttfbOptions = {
      chart: { type: 'area', backgroundColor: 'transparent', height: 100, spacing: [0, 0, 0, 0], margin: [0,0,0,0] },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
      legend: { enabled: false },
      plotOptions: { area: { marker: { enabled: false }, fillOpacity: 0.1, lineWidth: 2 } },
      series: [{ type: 'area', name: 'TTFB', data: [310, 325, 315, 340, 320, 310, 330, 320], color: '#8b5cf6' }]
    };

    this.errorRateOverTimeOptions = {
      chart: { type: 'spline', backgroundColor: 'transparent', height: 180, spacing: [10, 0, 0, 0] },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: { categories: ['11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10', '12:15'], lineWidth: 1, tickWidth: 0 },
      yAxis: { title: { text: '' }, gridLineColor: '#f0f0f0', labels: { format: '{value}%' } },
      legend: { enabled: false },
      series: [{ type: 'spline', name: 'Error Rate', data: [1.5, 1.8, 1.2, 2.5, 3.2, 1.8, 1.5, 2.0], color: '#ef4444', marker: { enabled: false } }]
    };

    this.crashRateOverTimeOptions = {
      chart: { type: 'spline', backgroundColor: 'transparent', height: 180, spacing: [10, 0, 0, 0] },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: { categories: ['11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10', '12:15'], lineWidth: 1, tickWidth: 0 },
      yAxis: { title: { text: '' }, gridLineColor: '#f0f0f0', labels: { format: '{value}%' } },
      legend: { enabled: false },
      series: [{ type: 'spline', name: 'Crash Rate', data: [0.1, 0.2, 0.15, 0.3, 0.4, 0.2, 0.1, 0.2], color: '#f97316', marker: { enabled: false } }]
    };

    this.errorsByTypeOptions = {
      chart: { type: 'pie', backgroundColor: 'transparent', height: 160, spacing: [0, 0, 0, 0] },
      title: { text: '<div style="text-align:center"><span style="font-size:16px;font-weight:bold;color:#333;">652</span><br><span style="font-size:8px;color:#666;">Total Errors</span></div>', align: 'center', verticalAlign: 'middle', y: 15, useHTML: true },
      credits: { enabled: false },
      plotOptions: { pie: { innerSize: '75%', dataLabels: { enabled: false }, borderWidth: 0 } },
      series: [{ type: 'pie', name: 'Errors', data: [ { name: 'HTTP Errors', y: 55.4, color: '#ef4444' }, { name: 'Network Errors', y: 18.6, color: '#f97316' }, { name: 'Client Errors', y: 15.3, color: '#facc15' }, { name: 'Parse Errors', y: 9.7, color: '#8b5cf6' }, { name: 'Other Errors', y: 1.0, color: '#3b82f6' } ] }]
    };

    this.crashesByDeviceOptions = {
      chart: { type: 'pie', backgroundColor: 'transparent', height: 140, spacing: [0, 0, 0, 0] },
      title: { text: '<div style="text-align:center"><span style="font-size:14px;font-weight:bold;color:#333;">81</span><br><span style="font-size:8px;color:#666;">Total Crashes</span></div>', align: 'center', verticalAlign: 'middle', y: 10, useHTML: true },
      credits: { enabled: false },
      plotOptions: { pie: { innerSize: '75%', dataLabels: { enabled: false }, borderWidth: 0 } },
      series: [{ type: 'pie', name: 'Crashes', data: [ { name: 'Samsung Galaxy', y: 32.1, color: '#3b82f6' }, { name: 'Google Pixel', y: 25.0, color: '#f59e0b' }, { name: 'OnePlus', y: 17.3, color: '#10b981' }, { name: 'iPhone', y: 11.0, color: '#8b5cf6' }, { name: 'Other', y: 14.6, color: '#6366f1' } ] }]
    };
    
    this.crashesByOSOptions = {
      chart: { type: 'pie', backgroundColor: 'transparent', height: 140, spacing: [0, 0, 0, 0] },
      title: { text: '<div style="text-align:center"><span style="font-size:14px;font-weight:bold;color:#333;">81</span><br><span style="font-size:8px;color:#666;">Total Crashes</span></div>', align: 'center', verticalAlign: 'middle', y: 10, useHTML: true },
      credits: { enabled: false },
      plotOptions: { pie: { innerSize: '75%', dataLabels: { enabled: false }, borderWidth: 0 } },
      series: [{ type: 'pie', name: 'Crashes', data: [ { name: 'Android 14', y: 64.2, color: '#3b82f6' }, { name: 'Android 13', y: 23.5, color: '#6366f1' }, { name: 'iOS 17', y: 10.5, color: '#f59e0b' }, { name: 'iOS 16', y: 1.8, color: '#ef4444' } ] }]
    };
    
    this.crashFreeUsersOptions = {
      chart: { type: 'pie', backgroundColor: 'transparent', height: 140, spacing: [0, 0, 0, 0] },
      title: { text: '<div style="text-align:center"><span style="font-size:14px;font-weight:bold;color:#333;">99.10%</span><br><span style="font-size:8px;color:#666;">Crash-free Users</span></div>', align: 'center', verticalAlign: 'middle', y: 10, useHTML: true },
      credits: { enabled: false },
      plotOptions: { pie: { innerSize: '75%', dataLabels: { enabled: false }, borderWidth: 0 } },
      series: [{ type: 'pie', name: 'Users', data: [ { name: 'Crash Free', y: 99.1, color: '#10b981' }, { name: 'Crashed', y: 0.9, color: '#ef4444' } ] }]
    };
    
    this.networkTypeDistributionOptions = {
      chart: { type: 'pie', backgroundColor: 'transparent', height: 140, spacing: [0, 0, 0, 0] },
      title: { text: '<div style="text-align:center"><span style="font-size:14px;font-weight:bold;color:#333;">2,849</span><br><span style="font-size:8px;color:#666;">Total Sessions</span></div>', align: 'center', verticalAlign: 'middle', y: 10, useHTML: true },
      credits: { enabled: false },
      plotOptions: { pie: { innerSize: '75%', dataLabels: { enabled: false }, borderWidth: 0 } },
      series: [{ type: 'pie', name: 'Sessions', data: [ { name: 'Wi-Fi', y: 54.1, color: '#3b82f6' }, { name: '4G', y: 34.6, color: '#f59e0b' }, { name: '5G', y: 9.1, color: '#10b981' }, { name: '3G', y: 2.2, color: '#ef4444' } ] }]
    };
  }

  viewAllErrors(event: Event) {
    event.preventDefault();
    this.router.navigate(['/mrum/mrum-errors-list'], {
      queryParams: {
        serviceId: this.serviceId,
        screenName: this.screenName
      },
      queryParamsHandling: 'merge'
    });
  }
}
