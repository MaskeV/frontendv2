import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';

@Component({
  selector: 'app-errors-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MrumBreadcrumbComponent],
  templateUrl: './errors-list.component.html',
  styleUrls: ['./errors-list.component.css']
})
export class ErrorsListComponent implements OnInit {
  serviceId: string = 'ecom-app';
  startTime: string = '';
  endTime: string = '';
  searchText: string = '';
  filterType: string = 'Error';
  actionName: string = '';
  screenName: string = '';

  appVersionFilter: string = '';
  deviceFilter: string = '';
  osVersionFilter: string = '';
  sessionIdFilter: string = '';
  userNameFilter: string = '';
  actionNameFilter: string = '';
  
  breadcrumbData: BreadcrumbItem[] = [];
  
  appVersions: string[] = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
  devices: string[] = ['iPhone 12', 'Samsung Galaxy S21', 'Google Pixel 6', 'Desktop'];
  osVersions: string[] = ['iOS 15', 'iOS 16', 'Android 12', 'Android 13', 'Windows 11'];

  totalErrors: number = 0;
  totalCrashes: number = 0;

  allErrors = [
    { errorId: 'ERR-5002', name: 'java.lang.NullPointerException', message: 'Attempt to invoke virtual method on a null object reference', occurrences: 1248, users: 357, type: 'Crash', lastSeen: '2 mins ago', status: 'Active', appVersion: '2.0.0', device: 'Samsung Galaxy S21', osVersion: 'Android 13' },
    { errorId: 'ERR-4001', name: 'java.net.SocketTimeoutException', message: 'Read timed out', occurrences: 892, users: 245, type: 'Error', lastSeen: '5 mins ago', status: 'Active', appVersion: '1.2.0', device: 'iPhone 12', osVersion: 'iOS 15' },
    { errorId: 'ERR-1033', name: 'android.database.sqlite.SQLiteException', message: 'no such table: user_prefs', occurrences: 456, users: 120, type: 'Crash', lastSeen: '10 mins ago', status: 'Active', appVersion: '1.1.0', device: 'Google Pixel 6', osVersion: 'Android 12' },
    { errorId: 'ERR-2041', name: 'com.ecom.payment.PaymentDeclinedException', message: 'Insufficient funds', occurrences: 342, users: 310, type: 'Error', lastSeen: '12 mins ago', status: 'Active', appVersion: '2.0.0', device: 'Desktop', osVersion: 'Windows 11' },
    { errorId: 'ERR-9012', name: 'java.lang.IndexOutOfBoundsException', message: 'Index: 2, Size: 2', occurrences: 198, users: 85, type: 'Crash', lastSeen: '1 hour ago', status: 'Resolved', appVersion: '1.0.0', device: 'iPhone 12', osVersion: 'iOS 16' },
    { errorId: 'ERR-3055', name: 'java.lang.IllegalStateException', message: 'Fragment not attached to Activity', occurrences: 156, users: 67, type: 'Crash', lastSeen: '2 hours ago', status: 'Active', appVersion: '2.0.0', device: 'Google Pixel 6', osVersion: 'Android 13' },
    { errorId: 'ERR-8022', name: 'retrofit2.HttpException', message: 'HTTP 502 Bad Gateway', occurrences: 89, users: 45, type: 'Error', lastSeen: '5 hours ago', status: 'Active', appVersion: '1.2.0', device: 'Samsung Galaxy S21', osVersion: 'Android 12' },
    { errorId: 'ERR-7011', name: 'java.lang.OutOfMemoryError', message: 'Failed to allocate a 1048588 byte allocation', occurrences: 45, users: 12, type: 'Crash', lastSeen: '1 day ago', status: 'Resolved', appVersion: '1.1.0', device: 'Desktop', osVersion: 'Windows 11' },
  ];
  
  paginatedErrors: any[] = [];
  
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['serviceId']) this.serviceId = params['serviceId'];
      if (params['st']) this.startTime = params['st'];
      if (params['et']) this.endTime = params['et'];
      if (params['actionName']) this.actionName = params['actionName'];
      if (params['screenName']) this.screenName = params['screenName'];
      if (params['type']) this.filterType = params['type'];
      if (params['user']) this.userNameFilter = params['user'];
      this.updateBreadcrumbs();
    });
    
    this.totalErrors = this.allErrors.filter(e => e.type === 'Error').reduce((acc, curr) => acc + curr.occurrences, 0);
    this.totalCrashes = this.allErrors.filter(e => e.type === 'Crash').reduce((acc, curr) => acc + curr.occurrences, 0);

    this.applyFilters();
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

    if (this.userNameFilter) {
      this.breadcrumbData.push(
        {
          label: 'Users',
          url: '/mrum/mrum-overview',
          queryParams: { serviceId: this.serviceId, tab: 'sessions', viewMode: 'users', st: this.startTime, et: this.endTime }
        },
        {
          label: this.userNameFilter,
          url: `/mrum/users/${this.userNameFilter}`,
          queryParams: { serviceId: this.serviceId, st: this.startTime, et: this.endTime }
        }
      );
    } else {
      this.breadcrumbData.push({
        label: 'Errors & Crashes',
        url: '/mrum/mrum-overview',
        queryParams: { serviceId: this.serviceId, tab: 'errors', st: this.startTime, et: this.endTime }
      });
    }

    this.breadcrumbData.push({ label: 'Errors List' });
  }

  applyFilters() {
    let filtered = this.allErrors;
    if (this.searchText) {
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(this.searchText.toLowerCase()) || 
        e.message.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
    if (this.filterType !== 'All Types') {
      filtered = filtered.filter(e => e.type === this.filterType);
    }
    if (this.appVersionFilter) {
      filtered = filtered.filter(e => e.appVersion === this.appVersionFilter);
    }
    if (this.deviceFilter) {
      filtered = filtered.filter(e => e.device === this.deviceFilter);
    }
    if (this.osVersionFilter) {
      filtered = filtered.filter(e => e.osVersion === this.osVersionFilter);
    }
    if (this.sessionIdFilter) {
      filtered = filtered.filter(e => (e as any).sessionId === this.sessionIdFilter);
    }
    if (this.userNameFilter) {
      filtered = filtered.filter(e => (e as any).userName === this.userNameFilter);
    }
    if (this.actionNameFilter) {
      filtered = filtered.filter(e => (e as any).actionName === this.actionNameFilter);
    }
    this.paginatedErrors = filtered;
  }

  viewErrorDetail(error: any) {
    this.router.navigate(['/mrum/mrum-error-crashes', encodeURIComponent(error.name)], {
      queryParamsHandling: 'preserve'
    });
  }
}
