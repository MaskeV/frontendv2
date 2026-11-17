import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SearchPipe } from '../../../../../pipes/search.pipe';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-version-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SearchPipe, HighchartsChartModule],
  templateUrl: './version-overview.component.html',
  styleUrls: ['./version-overview.component.css']
})
export class VersionOverviewComponent implements OnInit {
  @Input() context: any;
  Highcharts: typeof Highcharts = Highcharts;
  
  usersByVersionOptions: Highcharts.Options = {};
  crashErrorTrendOptions: Highcharts.Options = {};
  
  activeTab = 'version-details';

  versionDetails = [
    { version: 'v5.2.0 (231)', isCurrent: true, activeUsers: 53128, usersPct: '42.5%', sessions: 182450, sessionsPerUser: 3.43, crashRate: 0.12, crashRateTrend: 'down', crashRateTrendVal: '22%', errorRate: 1.01, errorRateTrend: 'down', errorRateTrendVal: '10%', apdex: 0.94, avgSessionDuration: '17m 24s', releaseDate: 'Jul 10, 2025', status: 'Live' },
    { version: 'v5.1.0 (228)', isCurrent: false, activeUsers: 35512, usersPct: '28.4%', sessions: 121030, sessionsPerUser: 3.41, crashRate: 0.16, crashRateTrend: 'down', crashRateTrendVal: '12%', errorRate: 1.28, errorRateTrend: 'down', errorRateTrendVal: '6%', apdex: 0.90, avgSessionDuration: '16m 52s', releaseDate: 'Jun 25, 2025', status: 'Live' },
    { version: 'v5.0.5 (225)', isCurrent: false, activeUsers: 17742, usersPct: '14.2%', sessions: 59210, sessionsPerUser: 3.34, crashRate: 0.22, crashRateTrend: 'down', crashRateTrendVal: '8%', errorRate: 1.56, errorRateTrend: 'down', errorRateTrendVal: '4%', apdex: 0.87, avgSessionDuration: '15m 48s', releaseDate: 'Jun 10, 2025', status: 'Live' },
    { version: 'v5.0.0 (220)', isCurrent: false, activeUsers: 9864, usersPct: '7.9%', sessions: 32450, sessionsPerUser: 3.29, crashRate: 0.28, crashRateTrend: 'down', crashRateTrendVal: '5%', errorRate: 1.82, errorRateTrend: 'down', errorRateTrendVal: '3%', apdex: 0.84, avgSessionDuration: '14m 36s', releaseDate: 'May 20, 2025', status: 'Live' },
    { version: 'v4.9.8 (219)', isCurrent: false, activeUsers: 4321, usersPct: '3.5%', sessions: 14120, sessionsPerUser: 3.27, crashRate: 0.34, crashRateTrend: 'down', crashRateTrendVal: '2%', errorRate: 2.14, errorRateTrend: 'down', errorRateTrendVal: '1%', apdex: 0.80, avgSessionDuration: '13m 58s', releaseDate: 'May 05, 2025', status: 'Deprecated' },
    { version: 'Others (3 versions)', isCurrent: false, activeUsers: 4298, usersPct: '3.5%', sessions: 12850, sessionsPerUser: 2.99, crashRate: 0.41, crashRateTrend: 'up', crashRateTrendVal: '3%', errorRate: 2.48, errorRateTrend: 'up', errorRateTrendVal: '5%', apdex: 0.78, avgSessionDuration: '12m 40s', releaseDate: '-', status: 'Deprecated' }
  ];

  osVersionDetails = [
    { os: 'Android 14', isAndroid: true, activeUsers: 48152, usersPct: '38.6%', sessions: 152934, sessionsPerUser: 3.18, crashRate: 0.12, crashRateTrend: 'down', crashRateTrendVal: '25%', errorRate: 1.01, errorRateTrend: 'down', errorRateTrendVal: '12%', apdex: 0.94, avgSessionDuration: '17m 32s', status: 'Active', sparklineData: [2,4,3,5,4], sparklineColor: '#10b981' },
    { os: 'Android 13', isAndroid: true, activeUsers: 32934, usersPct: '26.4%', sessions: 98451, sessionsPerUser: 2.99, crashRate: 0.16, crashRateTrend: 'down', crashRateTrendVal: '8%', errorRate: 1.28, errorRateTrend: 'down', errorRateTrendVal: '6%', apdex: 0.92, avgSessionDuration: '16m 18s', status: 'Active', sparklineData: [2,3,2,4,3], sparklineColor: '#10b981' },
    { os: 'Android 12', isAndroid: true, activeUsers: 23242, usersPct: '18.7%', sessions: 67845, sessionsPerUser: 2.92, crashRate: 0.22, crashRateTrend: 'down', crashRateTrendVal: '4%', errorRate: 1.56, errorRateTrend: 'down', errorRateTrendVal: '3%', apdex: 0.88, avgSessionDuration: '15m 04s', status: 'Active', sparklineData: [4,3,4,3,4], sparklineColor: '#f59e0b' },
    { os: 'iOS 17', isAndroid: false, activeUsers: 11852, usersPct: '9.5%', sessions: 33482, sessionsPerUser: 2.82, crashRate: 0.31, crashRateTrend: 'down', crashRateTrendVal: '2%', errorRate: 1.82, errorRateTrend: 'down', errorRateTrendVal: '1%', apdex: 0.82, avgSessionDuration: '13m 36s', status: 'Active', sparklineData: [3,4,3,5,4], sparklineColor: '#3b82f6' },
    { os: 'iOS 16 & below', isAndroid: false, activeUsers: 8525, usersPct: '6.8%', sessions: 29738, sessionsPerUser: 2.67, crashRate: 0.38, crashRateTrend: 'up', crashRateTrendVal: '3%', errorRate: 2.48, errorRateTrend: 'up', errorRateTrendVal: '5%', apdex: 0.78, avgSessionDuration: '11m 44s', status: 'Deprecated', sparklineData: [2,4,3,5,2], sparklineColor: '#8b5cf6' }
  ];

  topCrashes = [
    { version: 'v5.2.0', crashType: 'NullPointerException', count: 412, crashRate: '0.12%' },
    { version: 'v5.0.5', crashType: 'OutOfMemoryError', count: 287, crashRate: '0.22%' },
    { version: 'v5.0.0', crashType: 'ANR (App Not Responding)', count: 203, crashRate: '0.28%' },
    { version: 'v4.9.8', crashType: 'IllegalStateException', count: 164, crashRate: '0.34%' },
    { version: 'v5.1.0', crashType: 'SQLiteException', count: 133, crashRate: '0.16%' }
  ];

  topErrors = [
    { version: 'v5.2.0', errorMsg: 'HTTP 500 Internal Server Error', count: 1842, errorRate: '1.01%' },
    { version: 'v5.1.0', errorMsg: 'Network Timeout', count: 1551, errorRate: '1.28%' },
    { version: 'v5.0.5', errorMsg: 'JSON Parse Exception', count: 1102, errorRate: '1.56%' },
    { version: 'v5.0.0', errorMsg: 'HTTP 403 Forbidden', count: 843, errorRate: '1.82%' },
    { version: 'v4.9.8', errorMsg: 'Socket Timeout', count: 612, errorRate: '2.14%' }
  ];

  ngOnInit() {
    this.initCharts();
  }
  
  initCharts() {
    this.usersByVersionOptions = {
      chart: { type: 'pie', height: 200, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      plotOptions: {
        pie: { innerSize: '75%', dataLabels: { enabled: false }, borderWidth: 0 }
      },
      series: [{
        name: 'Users',
        data: [
          { name: 'v5.2.0', y: 42.5, color: '#10b981' },
          { name: 'v5.1.0', y: 28.4, color: '#3b82f6' },
          { name: 'v5.0.5', y: 14.2, color: '#f59e0b' },
          { name: 'Others', y: 14.9, color: '#94a3b8' }
        ],
        type: 'pie'
      }]
    };

    this.crashErrorTrendOptions = {
      chart: { type: 'spline', height: 200, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: { categories: ['10 Jul', '11 Jul', '12 Jul', '13 Jul', '14 Jul', '15 Jul', '16 Jul'], lineWidth: 0, tickWidth: 0 },
      yAxis: { title: { text: undefined }, labels: { format: '{value}%' }, min: 0, max: 2.0, gridLineColor: '#f1f5f9' },
      tooltip: { shared: true },
      legend: { enabled: false },
      plotOptions: { spline: { marker: { enabled: false }, lineWidth: 2 } },
      series: [
        { name: 'Crash Rate', data: [0.6, 0.5, 0.8, 0.6, 0.7, 0.9, 0.5], color: '#ef4444', type: 'spline' },
        { name: 'Error Rate', data: [1.2, 1.4, 1.8, 1.3, 1.5, 2.0, 1.1], color: '#f59e0b', type: 'spline' }
      ]
    };
  }

  getApdexColor(score: number): string {
    if (score >= 0.9) return '#10b981';
    if (score >= 0.7) return '#f59e0b';
    return '#ef4444';
  }

  getApdexBgColor(score: number): string {
    if (score >= 0.9) return '#ecfdf5';
    if (score >= 0.7) return '#fffbeb';
    return '#fef2f2';
  }

  getSparklinePath(data: number[]): string {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 15;
    const stepX = width / (data.length - 1);
    
    let path = '';
    data.forEach((val, i) => {
      const x = i * stepX;
      // y=0 is top, y=15 is bottom.
      const y = height - ((val - min) / range) * (height - 4) - 2; 
      path += (i === 0 ? 'M' : 'L') + `${x} ${y} `;
    });
    return path;
  }

  // Legacy bindings
  get versionList() { return this.context?.versionList; }
  set versionList(val) { if (this.context) this.context.versionList = val; }
  get searchText() { return this.context?.searchText; }
  set searchText(val) { if (this.context) this.context.searchText = val; }
  get selectedService() { return this.context?.selectedService; }
  set selectedService(val) { if (this.context) this.context.selectedService = val; }
  get startTime() { return this.context?.startTime; }
  set startTime(val) { if (this.context) this.context.startTime = val; }
  get endTime() { return this.context?.endTime; }
  set endTime(val) { if (this.context) this.context.endTime = val; }
  get versionData() { return this.context?.versionData; }
  set versionData(val) { if (this.context) this.context.versionData = val; }
}