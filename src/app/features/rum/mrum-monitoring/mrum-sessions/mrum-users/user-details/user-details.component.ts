import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';
import { Subject, takeUntil } from 'rxjs';
import * as Highcharts from 'highcharts';
import { DateService } from '../../../../../../services/date.service';
import { MrumService } from '../../../../../../services/mrum.service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MrumBreadcrumbComponent],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css']
})
export class UserDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  
  userId: string = '';
  selectedService: string = '';
  startTime: string = '';
  endTime: string = '';
  
  breadcrumbData: BreadcrumbItem[] = [];

  // Mock User Data
  userDetails: any = {
    name: 'Rahul Sharma',
    status: 'Active User',
    id: 'usr_8f13a7cde1bc4e67aa',
    lastSeen: 'Jul 16, 2026 11:47 AM',
    lastSeenTimeAgo: '1 min ago',
    totalActiveTime: '7h 42m 16s',
    platform: 'Android',
    osVersion: 'Android 14',
    appVersion: '2.3.1 (Build 231)',
    device: 'Samsung Galaxy S24',
    screenResolution: '2340 × 1080',
    network: 'Wi-Fi',
    carrier: 'Jio SG',
    city: 'Bengaluru',
    country: 'India'
  };

  kpis: any = {
    sessions: 28,
    sessionsTrend: '+ 21.7% vs prev 30m',
    avgSessionDuration: '16m 32s',
    avgSessionDurationTrend: '+ 12.4% vs prev 30m',
    avgLoadTime: '1.24 s',
    avgLoadTimeTrend: '- 10.2% vs prev 30m',
    errorRate: '1.32%',
    errorRateTrend: '- 0.6 pp vs prev 30m',
    crashRate: '0.18%',
    crashRateTrend: '- 0.2 pp vs prev 30m',
    apdexScore: 0.91,
    apdexTrend: '+ 4.5% vs prev 30m'
  };

  allSessions: any[] = [
    { id: 'b2a8c7f9dd664efb0c1a12f', startTime: 'Jul 16, 11:22 AM', duration: '18m 42s', pages: 12, actions: 85, errors: 0, crashes: 0, apdex: 0.98, loadTime: '1.02 s', network: 'Wi-Fi', location: 'Bengaluru, India' },
    { id: 'c1de3f6e7b2c60bter12a3b', startTime: 'Jul 16, 10:35 AM', duration: '11m 08s', pages: 8, actions: 42, errors: 1, crashes: 0, apdex: 0.86, loadTime: '1.28 s', network: 'Wi-Fi', location: 'Bengaluru, India' },
    { id: 'd6e072db8c01be7f0a56dc', startTime: 'Jul 16, 09:12 AM', duration: '22m 14s', pages: 15, actions: 103, errors: 0, crashes: 1, apdex: 0.71, loadTime: '1.65 s', network: 'Wi-Fi', location: 'Bengaluru, India' },
    { id: 'e5f7d8e9c0de12f3ab856c6d', startTime: 'Jul 16, 08:50 AM', duration: '10m 21s', pages: 7, actions: 38, errors: 0, crashes: 0, apdex: 0.90, loadTime: '0.98 s', network: '5G', location: 'Bengaluru, India' },
    { id: 'f6ad8bc0d1ef273bbc5c6e7e', startTime: 'Jul 15, 07:35 PM', duration: '15m 03s', pages: 10, actions: 61, errors: 2, crashes: 0, apdex: 0.72, loadTime: '1.72 s', network: 'Wi-Fi', location: 'Bengaluru, India' }
  ];

  paginatedSessions: any[] = [];
  currentSessionsPage: number = 1;
  sessionPageSize: number = 10;
  totalSessionsPages: number = 1;
  paginationPages: any[] = [];


  topErrors: any[] = [
    { error: 'HTTP 500 Internal Server Error', count: 18, lastSeen: 'Jul 16, 11:12 AM' },
    { error: 'Network Timeout', count: 7, lastSeen: 'Jul 16, 10:12 AM' },
    { error: 'JSON Parse Exception', count: 5, lastSeen: 'Jul 16, 09:35 AM' },
    { error: 'HTTP 403 Forbidden', count: 3, lastSeen: 'Jul 16, 09:18 AM' },
    { error: 'Connection Reset', count: 2, lastSeen: 'Jul 16, 08:55 AM' }
  ];

  topCrashes: any[] = [
    { type: 'NullPointerException', count: 4, lastSeen: 'Jul 16, 09:12 AM' },
    { type: 'OutOfMemoryError', count: 1, lastSeen: 'Jul 16, 08:50 AM' },
    { type: 'ANR (Application Not Responding)', count: 0, lastSeen: '-' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dateService: DateService,
    private mrumService: MrumService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['userId']) {
        this.userId = params['userId'];
        // dynamically updating mock data for exact user
        this.userDetails.name = this.userId.includes('@') ? this.userId.split('@')[0] : this.userId;
        if(this.userDetails.name === 'Rahul Sharma') {} // fallback
      }
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.selectedService = params['serviceId'] || '';
      this.startTime = params['st'] || '';
      this.endTime = params['et'] || '';
      this.updateBreadcrumbs();
    });

    this.updateSessionPagination();
  }

  updateBreadcrumbs() {
    this.breadcrumbData = [
      { label: 'MRUM', url: '/mrum' },
      { 
        label: this.selectedService || 'ecom-app', 
        url: '/mrum/mrum-overview', 
        queryParams: { serviceId: this.selectedService, tab: 'overview', st: this.startTime, et: this.endTime } 
      },
      { 
        label: 'Users', 
        url: '/mrum/mrum-overview',
        queryParams: { serviceId: this.selectedService, tab: 'sessions', viewMode: 'users', st: this.startTime, et: this.endTime } 
      },
      { label: this.userDetails?.name || this.userDetails?.id || 'User Details' }
    ];
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderSessionTrendChart();
      this.renderSessionsOutcomeChart();
      this.renderApdexOverTimeChart();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getApdexColor(score: number): string {
    return this.mrumService.getApdexColor(score);
  }

  get paginationDisplayRange(): string {
    if (this.allSessions.length === 0) return '0-0';
    const start = (this.currentSessionsPage - 1) * this.sessionPageSize + 1;
    let end = this.currentSessionsPage * this.sessionPageSize;
    if (end > this.allSessions.length) {
      end = this.allSessions.length;
    }
    return `${start}-${end}`;
  }

  updateSessionPagination() {
    this.totalSessionsPages = Math.ceil(this.allSessions.length / this.sessionPageSize) || 1;
    if (this.currentSessionsPage > this.totalSessionsPages) {
      this.currentSessionsPage = this.totalSessionsPages;
    }
    
    const startIndex = (this.currentSessionsPage - 1) * this.sessionPageSize;
    const endIndex = startIndex + this.sessionPageSize;
    this.paginatedSessions = this.allSessions.slice(startIndex, endIndex);

    this.paginationPages = this.mrumService.calculatePaginationWindow(this.currentSessionsPage, this.totalSessionsPages).pages;
  }

  changeSessionsPage(page: number | string) {
    if (page === '...') return;
    const pageNum = Number(page);
    if (pageNum >= 1 && pageNum <= this.totalSessionsPages) {
      this.currentSessionsPage = pageNum;
      this.updateSessionPagination();
    }
  }

  onSessionPageSizeChange() {
    this.currentSessionsPage = 1;
    this.updateSessionPagination();
  }

  renderSessionTrendChart(): void {
    Highcharts.chart('sessionTrendChart', {
      chart: { type: 'line', height: 250, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories: ['10 Jun', '11 Jun', '12 Jun', '13 Jun', '14 Jun', '15 Jun', '16 Jun'],
        tickLength: 0,
        lineWidth: 0,
        labels: { style: { color: '#64748b', fontSize: '11px', fontWeight: '500' } }
      },
      yAxis: [{
        title: { text: undefined },
        gridLineColor: '#f1f5f9',
        labels: { style: { color: '#64748b', fontSize: '11px' } }
      }, {
        title: { text: undefined },
        opposite: true,
        gridLineWidth: 0,
        labels: { style: { color: '#64748b', fontSize: '11px' } }
      }],
      legend: { enabled: false },
      tooltip: { shared: true },
      series: [{
        name: 'Sessions',
        type: 'line',
        data: [18, 16, 35, 12, 28, 15, 20, 10, 25, 12],
        color: '#8b5cf6',
        marker: { symbol: 'diamond', radius: 4 },
        yAxis: 0
      }, {
        name: 'Avg. Load Time (s)',
        type: 'line',
        data: [1.2, 1.1, 2.3, 0.8, 1.5, 0.9, 1.3, 0.7, 1.6, 1.0],
        color: '#0ea5e9',
        marker: { symbol: 'circle', radius: 4 },
        yAxis: 1
      }]
    } as any);
  }

  renderSessionsOutcomeChart(): void {
    Highcharts.chart('sessionsOutcomeChart', {
      chart: { type: 'pie', height: 250, backgroundColor: 'transparent' },
      title: { 
        text: '<div style="text-align: center;"><span style="font-size: 24px; font-weight: 700; color: #1e293b;">28</span><br/><span style="font-size: 11px; color: #64748b;">Total Sessions</span></div>',
        align: 'center',
        verticalAlign: 'middle',
        y: 10,
        useHTML: true
      },
      credits: { enabled: false },
      plotOptions: {
        pie: {
          innerSize: '75%',
          dataLabels: { enabled: false },
          borderWidth: 0,
          startAngle: 90
        }
      },
      series: [{
        name: 'Sessions',
        type: 'pie',
        data: [
          { name: 'Successful', y: 24, color: '#10b981' },
          { name: 'Errored', y: 3, color: '#f59e0b' },
          { name: 'Crashed', y: 1, color: '#ef4444' }
        ]
      }]
    } as any);
  }

  renderApdexOverTimeChart(): void {
    Highcharts.chart('apdexOverTimeChart', {
      chart: { type: 'line', height: 250, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories: ['10:50', '11:00', '11:10', '11:20', '11:30', '11:40'],
        tickLength: 0,
        lineWidth: 0,
        labels: { style: { color: '#64748b', fontSize: '11px', fontWeight: '500' } }
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: '#f1f5f9',
        min: 0,
        max: 1.5,
        tickInterval: 0.5,
        labels: { style: { color: '#64748b', fontSize: '11px' } }
      },
      legend: { enabled: false },
      tooltip: { shared: true },
      series: [{
        name: 'Apdex',
        type: 'line',
        data: [0.85, 0.95, 0.88, 0.92, 1.0, 0.95, 0.85, 0.98, 0.9, 0.92, 0.98, 0.88, 1.05, 0.85],
        color: '#22c55e',
        marker: { symbol: 'circle', radius: 4 }
      }]
    } as any);
  }

}
