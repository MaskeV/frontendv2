import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';
import { MrumService } from '../../../../../services/mrum.service';
import { MrumParams } from '../../../../../models/mrum/mrum-params';
import { Subject, takeUntil } from 'rxjs';

import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-actions-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HighchartsChartModule, MrumBreadcrumbComponent],
  templateUrl: './actions-overview.component.html',
  styleUrls: ['./actions-overview.component.css']
})
export class ActionsOverviewComponent implements OnInit, OnDestroy {
  isLoading = true;
  actions: any[] = [];
  filteredActions: any[] = [];
  searchText = '';
  
  // KPIs
  totalActions = 0;
  avgDuration = 0;
  p90Duration = 0;
  errorRate = 0;

  Highcharts: typeof Highcharts = Highcharts;

  // Pagination
  paginatedActions: any[] = [];
  currentActionPage = 1;
  actionPageSize = 10;
  totalActionPages = 1;
  actionPaginationStart = 0;
  actionPaginationEnd = 0;
  actionPaginationPages: number[] = [];

  serviceId: string = 'ecom-app';
  startTime: string = '';
  // startTime: string = ''; // Removed duplicate
  endTime: string = '';

  breadcrumbData: BreadcrumbItem[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private mrumService: MrumService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['serviceId']) {
        this.serviceId = params['serviceId'];
      }
      if (params['st']) {
        this.startTime = params['st'];
      }
      if (params['et']) {
        this.endTime = params['et'];
      }
      this.updateBreadcrumbs();
    });
    this.loadActions();
  }

  updateBreadcrumbs() {
    this.breadcrumbData = [
      { label: 'MRUM', url: '/mrum' },
      { 
        label: this.serviceId || 'Overview', 
        url: '/mrum/mrum-overview', 
        queryParams: { serviceId: this.serviceId, tab: 'overview', st: this.startTime, et: this.endTime } 
      },
      { label: 'Actions' }
    ];
  }

  ngAfterViewInit() {
    this.updateSparklines();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActions() {
    this.isLoading = true;
    const mockActions = [
      { actionName: 'Touch Product Details', iconClass: 'bi-file-text', iconBg: '#ffedd5', iconColor: '#ea580c', type: 'Tap', typeClass: 'bg-purple-subtle text-purple', totalExecutions: 24562, uniqueUsers: 5284, avgDuration: '542 ms', p90Duration: '1.18 s', errorRate: '1.80%', apdex: 0.91, trendData: [2, 4, 3, 5, 4, 6, 5], lastSeen: '2 mins ago' },
      { actionName: 'Add to Cart', iconClass: 'bi-cart', iconBg: '#dbeafe', iconColor: '#2563eb', type: 'Tap', typeClass: 'bg-purple-subtle text-purple', totalExecutions: 18452, uniqueUsers: 4105, avgDuration: '412 ms', p90Duration: '920 ms', errorRate: '1.24%', apdex: 0.93, trendData: [3, 4, 3, 4, 5, 4, 5], lastSeen: '1 min ago' },
      { actionName: 'Search Product', iconClass: 'bi-search', iconBg: '#e0f2fe', iconColor: '#0284c7', type: 'Input', typeClass: 'bg-primary-subtle text-primary', totalExecutions: 16231, uniqueUsers: 3980, avgDuration: '678 ms', p90Duration: '1.42 s', errorRate: '2.10%', apdex: 0.88, trendData: [5, 4, 5, 4, 3, 4, 3], lastSeen: '30 sec ago' },
      { actionName: 'Checkout', iconClass: 'bi-bag-check', iconBg: '#dcfce7', iconColor: '#16a34a', type: 'Tap', typeClass: 'bg-purple-subtle text-purple', totalExecutions: 12450, uniqueUsers: 3210, avgDuration: '812 ms', p90Duration: '1.75 s', errorRate: '2.35%', apdex: 0.85, trendData: [4, 5, 4, 3, 4, 3, 4], lastSeen: '3 mins ago' },
      { actionName: 'Payment', iconClass: 'bi-credit-card', iconBg: '#f3e8ff', iconColor: '#9333ea', type: 'Tap', typeClass: 'bg-purple-subtle text-purple', totalExecutions: 9231, uniqueUsers: 2412, avgDuration: '932 ms', p90Duration: '2.01 s', errorRate: '2.80%', apdex: 0.80, trendData: [3, 2, 3, 4, 3, 2, 3], lastSeen: '2 mins ago' },
      { actionName: 'Apply Coupon', iconClass: 'bi-ticket-perforated', iconBg: '#f1f5f9', iconColor: '#475569', type: 'Tap', typeClass: 'bg-purple-subtle text-purple', totalExecutions: 7562, uniqueUsers: 2001, avgDuration: '388 ms', p90Duration: '870 ms', errorRate: '1.05%', apdex: 0.95, trendData: [5, 4, 5, 6, 5, 4, 5], lastSeen: '4 mins ago' },
      { actionName: 'Remove from Cart', iconClass: 'bi-cart-x', iconBg: '#fce7f3', iconColor: '#db2777', type: 'Tap', typeClass: 'bg-purple-subtle text-purple', totalExecutions: 6843, uniqueUsers: 1875, avgDuration: '365 ms', p90Duration: '780 ms', errorRate: '0.98%', apdex: 0.96, trendData: [4, 5, 4, 3, 4, 5, 4], lastSeen: '5 mins ago' },
      { actionName: 'Filter Product', iconClass: 'bi-funnel', iconBg: '#dcfce7', iconColor: '#16a34a', type: 'Tap', typeClass: 'bg-purple-subtle text-purple', totalExecutions: 5421, uniqueUsers: 1645, avgDuration: '594 ms', p90Duration: '1.28 s', errorRate: '1.60%', apdex: 0.90, trendData: [3, 4, 3, 4, 3, 4, 3], lastSeen: '1 min ago' },
      { actionName: 'View Cart', iconClass: 'bi-cart', iconBg: '#dcfce7', iconColor: '#16a34a', type: 'Tap', typeClass: 'bg-purple-subtle text-purple', totalExecutions: 4987, uniqueUsers: 1532, avgDuration: '455 ms', p90Duration: '990 ms', errorRate: '1.15%', apdex: 0.92, trendData: [4, 3, 4, 5, 4, 3, 4], lastSeen: '2 mins ago' },
      { actionName: 'Sign Up', iconClass: 'bi-person-plus', iconBg: '#fee2e2', iconColor: '#ef4444', type: 'Tap', typeClass: 'bg-purple-subtle text-purple', totalExecutions: 3456, uniqueUsers: 1102, avgDuration: '1.02 s', p90Duration: '2.30 s', errorRate: '3.20%', apdex: 0.72, trendData: [2, 3, 2, 1, 2, 3, 2], lastSeen: '6 mins ago' }
    ];

    const params: MrumParams = {};
    this.mrumService.getActions(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success' && res.serviceResponse?.actions?.length > 0) {
          this.actions = res.serviceResponse.actions;
        } else {
          this.actions = mockActions;
        }
        this.filteredActions = [...this.actions];
        this.updatePagination();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.actions = mockActions;
        this.filteredActions = [...this.actions];
        this.updatePagination();
      }
    });
  }

  updatePagination() {
    this.totalActionPages = Math.ceil(this.filteredActions.length / this.actionPageSize);
    if (this.currentActionPage > this.totalActionPages) this.currentActionPage = this.totalActionPages;
    if (this.currentActionPage < 1) this.currentActionPage = 1;
    
    this.actionPaginationStart = (this.currentActionPage - 1) * this.actionPageSize;
    this.actionPaginationEnd = Math.min(this.actionPaginationStart + this.actionPageSize, this.filteredActions.length);
    
    this.paginatedActions = this.filteredActions.slice(this.actionPaginationStart, this.actionPaginationEnd);
    
    // Generate page numbers
    this.actionPaginationPages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentActionPage - 2);
    let endPage = Math.min(this.totalActionPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      this.actionPaginationPages.push(i);
    }

    this.updateSparklines();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalActionPages) {
      this.currentActionPage = page;
      this.updatePagination();
    }
  }

  updateSparklines() {
    setTimeout(() => {
      this.renderSparkline('totalActionsSparkline', 'line', [3,4,5,4,6,5,7,6,8,7,9,8,10], '#7c3aed', 60);
      this.paginatedActions.forEach((action, index) => {
        this.renderSparkline(`trendSparkline_${index}`, 'line', action.trendData, '#8b5cf6', 30);
      });
    }, 100);
  }

  renderSparkline(containerId: string, type: 'line' | 'column', data: number[], color: string, height: number): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.Highcharts.chart(containerId, {
      chart: {
        type: type,
        backgroundColor: 'transparent',
        margin: [2, 2, 2, 2],
        height: height,
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
          lineWidth: 2,
          color: color,
          marker: { enabled: false }
        }
      },
      series: [{ type: type, data: data }] as any
    });
  }

  applySearchFilter() {
    if (!this.searchText) {
      this.filteredActions = [...this.actions];
    } else {
      const term = this.searchText.toLowerCase();
      this.filteredActions = this.actions.filter(a => 
        a.actionName?.toLowerCase().includes(term)
      );
    }
    this.currentActionPage = 1;
    this.updatePagination();
  }

  viewActionDetails(action: any) {
    this.router.navigate(['/mrum/actions', action.id || action.actionName], {
      queryParamsHandling: 'preserve'
    });
  }
}
