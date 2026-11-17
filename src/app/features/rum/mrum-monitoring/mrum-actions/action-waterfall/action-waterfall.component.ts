import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-action-waterfall',
  standalone: true,
  imports: [CommonModule, RouterModule, MrumBreadcrumbComponent],
  templateUrl: './action-waterfall.component.html',
  styleUrls: ['./action-waterfall.component.css'],
})
export class ActionWaterfallComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  serviceId: string = '';
  actionName: string = 'Loading OfflineWebViewActivity';
  startTime: string = '';
  endTime: string = '';
  userFilter: string = '';
  sessionId: string = 'usr_8f13a7cde1bc4e67aa'; // Mock
  
  breadcrumbData: BreadcrumbItem[] = [];

  userInfo = {
    name: 'Rahul Sharma',
    id: 'usr_8f13a7cde1bc4e67aa',
    status: 'Active User',
    duration: '0.53 s',
    apdex: 'Satisfied',
    device: 'Samsung Galaxy Tab S9',
    os: 'Android 14',
    location: 'United States',
    battery: '45 %',
    memory: '3.83 % / 32 MB',
    connection: 'WiFi',
    orientation: 'Portrait',
    networkTech: '4G',
    carrier: 'AT&T',
    cpu: 'Snapdragon 8 Gen 1 (2.3 GHz)',
    ip: '144.46.11.154',
    isp: '-',
    resolution: '2650 x 1600',
    language: 'en_US',
    rooted: 'No',
    agentVersion: '8.217.20300'
  };

  waterfallItems = [
    { type: 'user_action', name: 'Loading OfflineWebViewActivity', durationStr: '526 ms', startMs: 0, durationMs: 526, color: '#10b981', children: [
      { type: 'user_action', name: 'Display OfflineWebViewActivity', durationStr: '191 ms', startMs: 250, durationMs: 191, color: '#34d399' }
    ]},
    { type: 'network_group', name: 'Network Requests', durationStr: '306 ms', startMs: 0, durationMs: 0, color: 'transparent', children: [
      { type: 'network_request', name: '/api/user/profile', durationStr: '124 ms', startMs: 150, durationMs: 124, color: '#f59e0b' },
      { type: 'network_request', name: '/api/config', durationStr: '182 ms', startMs: 150, durationMs: 182, color: '#f59e0b' },
      { type: 'network_error', name: '/api/analytics', durationStr: '282 ms', startMs: 310, durationMs: 282, color: '#ef4444' }
    ]}
  ];

  maxTimeMs = 1200; // 1.2s

  webRequestErrors = [
    { time: '815 ms', response: '400 - Bad Request', provider: 'api.ecom-app.com', url: 'https://api.ecom-app.com/api/analytics', duration: '282 ms' }
  ];

  namedEvents = [
    { time: '762 ms', event: 'LoginSuccessful', duration: '54 ms' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.serviceId = params['serviceId'] || '';
      this.actionName = params['actionName'] || 'Loading OfflineWebViewActivity';
      this.startTime = params['st'] || '';
      this.endTime = params['et'] || '';
      this.userFilter = params['user'] || '';
      if (params['sessionId']) {
        this.sessionId = params['sessionId'];
      }
      this.updateBreadcrumbs();
    });
  }

  updateBreadcrumbs() {
    this.breadcrumbData = [
      { label: 'MRUM', url: '/mrum' },
      { 
        label: 'Users & Sessions', 
        url: '/mrum/sessions-overview', 
        queryParams: { serviceId: this.serviceId, st: this.startTime, et: this.endTime } 
      },
      { 
        label: `Session Id ${this.sessionId.slice(0, 5)}...`, 
        url: '/mrum/mrum-session',
        queryParams: { serviceId: this.serviceId, sessionId: this.sessionId, st: this.startTime, et: this.endTime, user: this.userFilter } 
      },
      { 
        label: 'User Action Analysis' 
      }
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getLeftPct(startMs: number): string {
    return ((startMs / this.maxTimeMs) * 100) + '%';
  }

  getWidthPct(durationMs: number): string {
    return ((durationMs / this.maxTimeMs) * 100) + '%';
  }
}

