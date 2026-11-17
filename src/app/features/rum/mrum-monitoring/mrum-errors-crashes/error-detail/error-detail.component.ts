import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';

@Component({
  selector: 'app-error-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MrumBreadcrumbComponent],
  templateUrl: './error-detail.component.html',
  styleUrls: ['./error-detail.component.css']
})
export class ErrorDetailComponent implements OnInit {

  errorId: string = 'ERR-8f3a2e7c';
  errorName: string = 'java.lang.NullPointerException';
  isSessionContext: boolean = false;
  sessionId: string = '';
  serviceId: string = 'Service';
  startTime: string = '';
  endTime: string = '';
  
  breadcrumbData: BreadcrumbItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      if (params.get('errorId')) {
        const paramId = params.get('errorId')!;
        if (paramId.startsWith('ERR-')) {
          this.errorId = paramId;
        } else {
          this.errorName = decodeURIComponent(paramId);
        }
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['sessionId'] || params['sId'] || params['sid']) {
        this.isSessionContext = true;
        this.sessionId = params['sessionId'] || params['sId'] || params['sid'];
      }
      if (params['serviceId']) {
        this.serviceId = params['serviceId'];
      }
      if (params['st']) this.startTime = params['st'];
      if (params['et']) this.endTime = params['et'];
      this.updateBreadcrumbs();
    });
  }

  updateBreadcrumbs() {
    this.breadcrumbData = [
      { label: 'MRUM', url: '/mrum' },
      { 
        label: this.serviceId || 'Overview', 
        url: '/mrum/mrum-overview', 
        queryParams: { serviceId: this.serviceId, tab: 'overview', st: this.startTime, et: this.endTime } 
      },
      { label: 'Errors & Crashes', isClickableBack: true },
      { label: this.errorName }
    ];
  }

  goBack() {
    if (this.isSessionContext) {
      this.router.navigate(['/mrum/mrum-session'], {
        queryParams: { sessionId: this.sessionId },
        queryParamsHandling: 'merge'
      });
    } else {
      this.router.navigate(['/mrum/mrum-overview'], {
        queryParams: { tab: 'errors' },
        queryParamsHandling: 'merge'
      });
    }
  }

  viewAllSessions() {
    this.router.navigate(['/mrum/sessions-overview'], {
      queryParams: {
        viewMode: 'sessions',
        status: 'error',
        errorId: this.errorId
      },
      queryParamsHandling: 'merge'
    });
  }

  viewAllUsers() {
    this.router.navigate(['/mrum/users-overview'], {
      queryParams: {
        viewMode: 'users',
        errorId: this.errorId
      },
      queryParamsHandling: 'merge'
    });
  }
}
