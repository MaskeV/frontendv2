import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MrumService } from '../../../../../services/mrum.service';
import { MrumParams } from '../../../../../models/mrum/mrum-params';
import { Subject, takeUntil } from 'rxjs';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';

@Component({
  selector: 'app-screens-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HighchartsChartModule],
  templateUrl: './screens-overview.component.html',
  styleUrls: ['./screens-overview.component.css']
})
export class ScreensOverviewComponent implements OnInit, OnDestroy {
  isLoading = true;
  screens: any[] = [];
  filteredScreens: any[] = [];
  searchText = '';

  // Pagination
  paginatedScreens: any[] = [];
  currentScreenPage = 1;
  screenPageSize = 10;
  totalScreenPages = 1;
  screenPaginationStart = 0;
  screenPaginationEnd = 0;
  screenPaginationPages: number[] = [];

  // KPIs
  totalScreens = 24;
  screenVisits = 13456;
  avgLoadTime = 412;
  avgApdex = 0.91;

  mostErrors = [
    { name: 'Checkout', count: 18, pct: 32.7 },
    { name: 'Payment', count: 14, pct: 25.5 },
    { name: 'Product Details', count: 9, pct: 16.4 },
    { name: 'Cart', count: 6, pct: 10.9 },
    { name: 'Search', count: 4, pct: 7.3 }
  ];

  mostCrashes = [
    { name: 'Checkout', count: 4, pct: 50.0 },
    { name: 'Payment', count: 2, pct: 25.0 },
    { name: 'Product Details', count: 1, pct: 12.5 },
    { name: 'Cart', count: 1, pct: 12.5 },
    { name: 'Home', count: 0, pct: 0.0 }
  ];

  topSlowScreens = [
    { name: 'Checkout', time: '780 ms' },
    { name: 'Payment', time: '620 ms' },
    { name: 'Product Details', time: '590 ms' },
    { name: 'Orders', time: '560 ms' },
    { name: 'Profile', time: '480 ms' }
  ];

  topScreensApdex = [
    { name: 'Home', score: '0.95' },
    { name: 'Product Details', score: '0.93' },
    { name: 'Orders', score: '0.91' },
    { name: 'Profile', score: '0.89' },
    { name: 'Search', score: '0.87' }
  ];

  navigationFlow = [
    { name: 'Home', visits: '3,245', pct: '24.1%', bg: '#eef2ff' },
    { name: 'Products', visits: '2,854', pct: '21.2%', bg: '#f0fdfa' },
    { name: 'Product Details', visits: '2,231', pct: '16.6%', bg: '#f5f3ff' },
    { name: 'Cart', visits: '1,754', pct: '13.0%', bg: '#fef2f2' },
    { name: 'Checkout', visits: '1,245', pct: '9.2%', bg: '#fff7ed' },
    { name: 'Payment', visits: '987', pct: '7.3%', bg: '#f0fdf4' }
  ];

  Highcharts: typeof Highcharts = Highcharts;

  chartVisitsOptions: Highcharts.Options = {
    chart: { type: 'line', height: 220, backgroundColor: 'transparent' },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: { categories: ['11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10'], labels: { style: { color: '#4c1d95' } } },
    yAxis: { title: { text: '' }, gridLineColor: 'rgba(76, 29, 149, 0.15)', labels: { style: { color: '#4c1d95' } } },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: '#f5f3ff',
      borderColor: '#a78bfa',
      borderRadius: 8,
      style: { fontSize: '11px', fontFamily: 'Inter', color: '#4c1d95', fontWeight: 'bold' }
    },
    plotOptions: { line: { marker: { enabled: true, radius: 3 } } },
    series: [
      { type: 'line', name: 'Visits', data: [750, 680, 800, 780, 850, 750, 820, 780, 700], color: '#6d28d9' },
      { type: 'line', name: 'Sessions', data: [350, 400, 380, 360, 350, 420, 350, 380, 320], color: '#059669' }
    ]
  };

  chartLoadTimeOptions: Highcharts.Options = {
    chart: { type: 'area', height: 220, backgroundColor: 'transparent' },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: { categories: ['11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10'], labels: { style: { color: '#4c1d95' } } },
    yAxis: { title: { text: '' }, gridLineColor: 'rgba(76, 29, 149, 0.15)', labels: { format: '{value}ms', style: { color: '#4c1d95' } } },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: '#f5f3ff',
      borderColor: '#a78bfa',
      borderRadius: 8,
      style: { fontSize: '11px', fontFamily: 'Inter', color: '#4c1d95', fontWeight: 'bold' }
    },
    plotOptions: {
      area: {
        marker: { enabled: true, radius: 3 },
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [[0, 'rgba(168, 85, 247, 0.4)'], [1, 'rgba(168, 85, 247, 0.05)']]
        }
      }
    },
    series: [{ type: 'area', name: 'Load Time', data: [450, 480, 420, 460, 430, 470, 490, 450, 440], color: '#a855f7' }]
  };

  chartHealthOptions: Highcharts.Options = {
    chart: { type: 'pie', height: 160, backgroundColor: 'transparent', margin: [0, 0, 0, 0], spacing: [0, 0, 0, 0] },
    title: {
      text: '<div style="text-align: center;"><span style="font-size: 24px; font-weight: 800; color: #14532d; font-family: Inter;">92</span><br><span style="font-size: 10px; color: #15803d; opacity: 0.8; font-weight: 600; text-transform: uppercase;">Score</span></div>',
      align: 'center',
      verticalAlign: 'middle',
      y: 12,
      useHTML: true
    },
    credits: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: '75%',
        borderWidth: 0,
        dataLabels: { enabled: false },
        states: { hover: { halo: { size: 0 } } }
      }
    },
    tooltip: {
      backgroundColor: '#f0fdf4',
      borderColor: '#4ade80',
      borderRadius: 8,
      style: { fontSize: '11px', fontFamily: 'Inter', color: '#14532d', fontWeight: 'bold' }
    },
    series: [{
      type: 'pie',
      name: 'Health',
      data: [
        { name: 'Excellent', y: 58.3, color: '#22c55e' },
        { name: 'Good', y: 24.6, color: '#f59e0b' },
        { name: 'Fair', y: 12.5, color: '#f97316' },
        { name: 'Poor', y: 4.6, color: '#ef4444' }
      ]
    }]
  };

  chartDeviceOptions: Highcharts.Options = {
    chart: { type: 'pie', height: 160, backgroundColor: 'transparent', margin: [0, 0, 0, 0], spacing: [0, 0, 0, 0] },
    title: {
      text: '<div style="text-align: center;"><span style="font-size: 24px; font-weight: 800; color: #115e59; font-family: Inter;">100</span><span style="font-size: 14px; font-weight: 800; color: #115e59;">%</span><br><span style="font-size: 10px; color: #0f766e; opacity: 0.8; font-weight: 600; text-transform: uppercase;">Total</span></div>',
      align: 'center',
      verticalAlign: 'middle',
      y: 12,
      useHTML: true
    },
    credits: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: '75%',
        borderWidth: 0,
        dataLabels: { enabled: false },
        states: { hover: { halo: { size: 0 } } }
      }
    },
    tooltip: {
      backgroundColor: '#f0fdfa',
      borderColor: '#2dd4bf',
      borderRadius: 8,
      style: { fontSize: '11px', fontFamily: 'Inter', color: '#115e59', fontWeight: 'bold' }
    },
    series: [{
      type: 'pie',
      name: 'Devices',
      data: [
        { name: 'Android', y: 60, color: '#2563eb' },
        { name: 'iOS', y: 30, color: '#8b5cf6' },
        { name: 'Other', y: 10, color: '#ec4899' }
      ]
    }]
  };

  private destroy$ = new Subject<void>();
  
  selectedService: string = 'ecom-app';
  startTime: string = '';
  endTime: string = '';

  constructor(
    private mrumService: MrumService, 
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['serviceId']) {
        this.selectedService = params['serviceId'];
      }
      if (params['st']) {
        this.startTime = params['st'];
      }
      if (params['et']) {
        this.endTime = params['et'];
      }
    });
    this.loadScreens();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.renderSparkline('totalScreensSparkline', 'column', [12, 15, 14, 18, 20, 22, 24], '#6d28d9');
      this.renderSparkline('screenVisitsSparkline', 'column', [750, 680, 800, 780, 850, 750, 820], '#2563eb');
      this.renderSparkline('avgLoadTimeSparkline', 'line', [450, 480, 420, 460, 430, 470, 412], '#ea580c');
    }, 100);
  }

  renderSparkline(containerId: string, type: 'line' | 'column', data: number[], color: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.Highcharts.chart(containerId, {
      chart: {
        type: type,
        backgroundColor: 'transparent',
        margin: [2, 2, 2, 2],
        height: 50,
        style: { overflow: 'visible' }
      },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
      legend: { enabled: false },
      tooltip: { enabled: false },
      plotOptions: {
        series: {
          enableMouseTracking: false,
          lineWidth: type === 'line' ? 2 : 1,
          color: color,
          marker: { enabled: false }
        },
        column: { pointWidth: 4, borderWidth: 0 }
      },
      series: [{ type: type, data: data }] as any
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadScreens() {
    this.isLoading = true;
    const params: MrumParams = {};

    // Fallback Mock Data matching the design perfectly
    const mockScreens = [
      { name: 'Home', visits: '3,245 (24.1%)', sessions: '1,854 (22.3%)', avgDuration: '1m 12s', avgLoadTime: '320 ms', errors: '2 (0.06%)', crashes: '0 (0.00%)', apdex: 0.95, bounceRate: '12.4%', lastSeen: 'a few seconds ago' },
      { name: 'Products', visits: '2,854 (21.2%)', sessions: '1,523 (18.3%)', avgDuration: '58s', avgLoadTime: '280 ms', errors: '3 (0.11%)', crashes: '0 (0.00%)', apdex: 0.93, bounceRate: '10.2%', lastSeen: 'a few seconds ago' },
      { name: 'Product Details', visits: '2,231 (16.6%)', sessions: '1,204 (14.5%)', avgDuration: '45s', avgLoadTime: '260 ms', errors: '2 (0.09%)', crashes: '0 (0.00%)', apdex: 0.94, bounceRate: '8.7%', lastSeen: 'a few seconds ago' },
      { name: 'Cart', visits: '1,754 (13.0%)', sessions: '980 (11.8%)', avgDuration: '1m 05s', avgLoadTime: '310 ms', errors: '1 (0.05%)', crashes: '1 (0.02%)', apdex: 0.90, bounceRate: '15.1%', lastSeen: 'a few seconds ago' },
    ];

    this.mrumService.getScreens(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success' && res.serviceResponse?.screens?.length > 0) {
          this.screens = res.serviceResponse.screens;
        } else {
          this.screens = mockScreens;
        }
        this.filteredScreens = [...this.screens];
        this.updateScreenPagination();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.screens = mockScreens;
        this.filteredScreens = [...this.screens];
        this.updateScreenPagination();
      }
    });
  }

  applySearchFilter() {
    if (!this.searchText) {
      this.filteredScreens = [...this.screens];
    } else {
      const term = this.searchText.toLowerCase();
      this.filteredScreens = this.screens.filter(s =>
        s.name?.toLowerCase().includes(term)
      );
    }
    this.currentScreenPage = 1;
    this.updateScreenPagination();
  }

  updateScreenPagination() {
    this.totalScreenPages = Math.ceil(this.filteredScreens.length / this.screenPageSize) || 1;
    if (this.currentScreenPage > this.totalScreenPages) this.currentScreenPage = this.totalScreenPages;
    if (this.currentScreenPage < 1) this.currentScreenPage = 1;

    this.screenPaginationStart = (this.currentScreenPage - 1) * this.screenPageSize + 1;
    this.screenPaginationEnd = Math.min(this.currentScreenPage * this.screenPageSize, this.filteredScreens.length);

    if (this.filteredScreens.length === 0) {
      this.screenPaginationStart = 0;
      this.screenPaginationEnd = 0;
    }

    this.paginatedScreens = this.filteredScreens.slice(
      (this.currentScreenPage - 1) * this.screenPageSize,
      this.currentScreenPage * this.screenPageSize
    );

    let startPage = Math.max(1, this.currentScreenPage - 2);
    let endPage = Math.min(this.totalScreenPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    this.screenPaginationPages = [];
    for (let i = startPage; i <= endPage; i++) {
      this.screenPaginationPages.push(i);
    }
  }

  changeScreenPage(page: number, event?: Event) {
    if (event) event.preventDefault();
    if (page >= 1 && page <= this.totalScreenPages) {
      this.currentScreenPage = page;
      this.updateScreenPagination();
    }
  }

  viewScreenDetails(screen: any) {
    this.router.navigate(['/mrum/screens', screen.name], {
      queryParamsHandling: 'preserve'
    });
  }
}
