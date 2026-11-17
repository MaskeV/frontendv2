import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApplicationService } from '../../../services/application.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { DateService } from '../../../services/date.service';
import { User } from '../../../models/user';
import { switchMap, from, Subscription, Subject } from 'rxjs';
import { DecoderService } from '../../../services/decoder.service';
import { RoleService } from '../../../services/role.service';
import { LoggerService } from '../../../services/logger.service';
import { Session } from '../../../models/session';
import * as Highcharts from 'highcharts';

Highcharts.setOptions({
  time: {
    useUTC: false
  }
} as any);

@Component({
  selector: 'app-all-problems',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './all-problems.component.html',
  styleUrl: './all-problems.component.css'
})
export class AllProblemsComponent implements OnInit, OnDestroy {
  sessionObject: Session = new Session();

  // Filters
  searchText: string = '';
  selectedAppType: string = 'Select';
  selectedTechType: string = 'Select';
  selectedApplication: any = 'Select';

  appTypes: string[] = [];
  techTypes: any[] = [];
  applications: any[] = [];

  problemStatusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' }
  ];
  selectedProblemStatus: string = 'all';

  problemImpactOptions = [
    { label: 'Infrastructure', value: 'Infrastructure' },
    { label: 'Services', value: 'Services' },
    { label: 'Application', value: 'Application' },
    { label: 'Environment', value: 'Environment' }
  ];
  selectedProblemImpacts: string[] = [];

  problemMaintenanceOptions = [
    { label: 'Infrastructure', value: 'Infrastructure' },
    { label: 'Services', value: 'Services' },
    { label: 'Application', value: 'Application' },
    { label: 'Environment', value: 'Environment' }
  ];
  selectedProblemMaintenence: string[] = [];

  openClosedFilter: string[] = ['Open', 'Closed'];
  sideBarOpenApplied = false;
  sideBarClosedApplied = false;

  allProblems: any[] = [];
  allMappedProblems: any[] = [];
  filteredTableData: any[] = [];

  currentPage: number = 1;
  itemsPerPage: number = 5;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTableData.length / this.itemsPerPage));
  }

  get pagedData(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredTableData.slice(startIndex, startIndex + this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: string | number) {
    const pageNum = parseInt(page as string, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= this.totalPages) {
      this.currentPage = pageNum;
    }
  }

  startTime: number = 0;
  endTime: number = 0;
  currentUser: User | null = null;
  private subs = new Subscription();

  openClosedChartRef: any = null;
  preZoomTimeframe: any = null;
  isZooming = false;

  sortKey: string = 'startDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  toggleSort(key: string) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'desc'; // default to newest / highest first
    }
    this.filterProblems();
  }

  constructor(
    private applicationService: ApplicationService,
    private authService: AuthenticationService,
    private dateService: DateService,
    private decoderService: DecoderService,
    private roleService: RoleService,
    private router: Router,
    private loggerService: LoggerService
  ) { }

  ngOnInit() {
    this.subs.add(this.authService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser = user;
        
        this.sessionObject.featureName = 'RUAMBOT';
        this.sessionObject.requestURI = this.router.url.split('?')[0];
        this.sessionObject.userId = this.currentUser.userId;
        this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
        this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
        this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
        this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
        
        this.loadAppTypes();
      }
    }));

    this.subs.add(this.dateService.date$.subscribe((dates: any) => {
      if (dates && dates.startdateTime && dates.enddateTime) {
        this.startTime = this.formatDate(dates.startdateTime);
        this.endTime = this.formatDate(dates.enddateTime);
        
        if (this.isZooming) {
          // If we zoomed in on the chart, filter the loaded problems instantly in the frontend!
          this.filterProblems();
          this.isZooming = false;
        } else {
          // If it is a global date change or reset zoom, reload all data from the backend
          this.preZoomTimeframe = null;
          if (this.currentUser) {
            this.loadProblems();
          }
        }
      }
    }));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.openClosedChartRef) {
      this.openClosedChartRef.destroy();
    }
  }

  resetZoom() {
    if (this.preZoomTimeframe) {
      this.dateService.setDate(this.preZoomTimeframe);
      this.preZoomTimeframe = null;
    }
  }

  formatKey(key: any): string {
    if (!key) return '';
    const map: { [key: string]: string } = {
      'alertId': 'Alert ID',
      'alertName': 'Alert Name',
      'applicationId': 'Application ID',
      'applicationName': 'Application Name',
      'applicationType': 'Application Type',
      'technologyType': 'Technology Type',
      'startTime': 'Start Time',
      'endTime': 'End Time',
      'userId': 'User ID'
    };
    if (map[key]) return map[key];
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .replace(/^\w/, (c: string) => c.toUpperCase());
  }

  loadAppTypes() {
    if (!this.currentUser) return;
    this.roleService.findProducts(this.currentUser.userId, this.currentUser.userType).subscribe({
      next: (res: any) => {
        this.appTypes = res?.products || [];
        this.loadAllTechnologiesAndApplications();
      },
      error: (err) => console.error('Error fetching products:', err)
    });
  }

  onAppTypeChange() {
    this.selectedTechType = 'Select';
    this.selectedApplication = 'Select';
    this.techTypes = [];
    this.applications = [];

    if (this.selectedAppType === 'Select') {
      this.loadAllTechnologiesAndApplications();
    } else {
      this.loadTechnologies();
    }
    this.filterProblems();
  }

  onTechTypeChange() {
    this.selectedApplication = 'Select';
    this.applications = [];
    
    if (this.selectedAppType === 'Select') {
      this.loadAllApplicationsForTech(this.selectedTechType);
    } else {
      this.loadApplications();
    }
    this.filterProblems();
  }

  onApplicationChange() {
    this.filterProblems();
  }

  loadTechnologies() {
    if (this.selectedAppType === 'Select') return;
    this.applicationService.getTechnologyBySubFeature(this.selectedAppType).subscribe({
      next: (res: any) => {
        this.techTypes = res?.serviceResponse || [];
        this.loadApplications();
      }
    });
  }

  loadApplications() {
    if (this.selectedAppType === 'Select') return;
    if (!this.currentUser) return;

    const tech = this.selectedTechType === 'Select' ? '' : this.selectedTechType;
    this.applicationService.getFullApplicationData(this.currentUser.userId, this.selectedAppType, this.currentUser.sessionDTO, tech)
      .pipe(switchMap((data: any) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        this.applications = response?.serviceResponse?.applications || [];
      });
  }

  loadAllTechnologiesAndApplications() {
    if (!this.currentUser || !this.appTypes || this.appTypes.length === 0) return;

    const techObservables = this.appTypes.map(type => 
      this.applicationService.getTechnologyBySubFeature(type)
    );
    
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(techObservables).subscribe({
        next: (responses: any[]) => {
          let allTechs: any[] = [];
          responses.forEach(res => {
            if (res && res.serviceResponse) {
              allTechs = allTechs.concat(res.serviceResponse);
            }
          });
          
          const uniqueTechs = [];
          const seen = new Set();
          for (const tech of allTechs) {
            if (tech && tech.technologyType && !seen.has(tech.technologyType.toLowerCase())) {
              seen.add(tech.technologyType.toLowerCase());
              uniqueTechs.push(tech);
            }
          }
          this.techTypes = uniqueTechs;
        },
        error: (err) => console.error('Error fetching all technologies:', err)
      });
    });

    const appObservables = this.appTypes.map(type => 
      this.applicationService.getFullApplicationData(this.currentUser!.userId, type, this.currentUser!.sessionDTO, '')
        .pipe(switchMap((data: any) => from(this.decoderService.decodeObject(data))))
    );

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(appObservables).subscribe({
        next: (responses: any[]) => {
          let allApps: any[] = [];
          responses.forEach((res: any) => {
            const apps = res?.serviceResponse?.applications || [];
            allApps = allApps.concat(apps);
          });
          
          const uniqueApps = [];
          const seen = new Set();
          for (const app of allApps) {
            const id = app.applicationId || app.appID;
            if (id && !seen.has(id.toString())) {
              seen.add(id.toString());
              uniqueApps.push(app);
            }
          }
          this.applications = uniqueApps;
        },
        error: (err) => console.error('Error fetching all applications:', err)
      });
    });
  }

  loadAllApplicationsForTech(tech: string) {
    if (!this.currentUser || !this.appTypes || this.appTypes.length === 0) return;

    const techFilter = tech === 'Select' ? '' : tech;
    const appObservables = this.appTypes.map(type => 
      this.applicationService.getFullApplicationData(this.currentUser!.userId, type, this.currentUser!.sessionDTO, techFilter)
        .pipe(switchMap((data: any) => from(this.decoderService.decodeObject(data))))
    );

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(appObservables).subscribe({
        next: (responses: any[]) => {
          let allApps: any[] = [];
          responses.forEach((res: any) => {
            const apps = res?.serviceResponse?.applications || [];
            allApps = allApps.concat(apps);
          });
          
          const uniqueApps = [];
          const seen = new Set();
          for (const app of allApps) {
            const id = app.applicationId || app.appID;
            if (id && !seen.has(id.toString())) {
              seen.add(id.toString());
              uniqueApps.push(app);
            }
          }
          this.applications = uniqueApps;
        },
        error: (err) => console.error('Error fetching filtered applications:', err)
      });
    });
  }

  loadProblems() {
    if (!this.currentUser) return;
    this.currentUser.sessionDTO = this.sessionObject;
    const tool = sessionStorage.getItem("tool") ?? 'APM';
    this.applicationService.getAllProblemAlertsByUserID(this.currentUser, this.startTime, this.endTime, tool).subscribe({
      next: (res: any) => {
        if (res && res.serviceResponse) {
          this.allProblems = res.serviceResponse;
          this.allMappedProblems = this.allProblems.map(p => ({
          problem: p.healthRuleName,
          impacted: p.applicationName,
          applicationType: p.applicationType,
          problemStatus: p.problemStatus.toLowerCase(),
          severity: p.status,
          startDate: this.formatDateTime(p.startTime),
          endDate: p.endTime ? this.formatDateTime(p.endTime) : '-',
          duration: this.calculateDuration(
              p.startTime,
              p.endTime,
              p.problemStatus
          ),
          expanded: false,
          details: p
      })).sort((a, b) => {
            const timeA = a.details.startTime ? this.parseToDate(a.details.startTime)?.getTime() || 0 : 0;
            const timeB = b.details.startTime ? this.parseToDate(b.details.startTime)?.getTime() || 0 : 0;
            return timeB - timeA;
          });
          this.filterProblems();
        }
      },
      error: (err) => console.error('Error fetching problems:', err)
    });
  }

  onProblemStatusChange(value: string) {
    this.selectedProblemStatus = value;
    this.filterProblems();
  }

  onProblemImpactChange(value: string, event: any) {
    if (event.target.checked) {
      if (!this.selectedProblemImpacts.includes(value)) {
        this.selectedProblemImpacts.push(value);
      }
    } else {
      this.selectedProblemImpacts = this.selectedProblemImpacts.filter(v => v !== value);
    }
    this.filterProblems();
  }

  onProblemMaintenanceChange(value: string, event: any) {
    if (event.target.checked) {
      if (!this.selectedProblemMaintenence.includes(value)) {
        this.selectedProblemMaintenence.push(value);
      }
    } else {
      this.selectedProblemMaintenence = this.selectedProblemMaintenence.filter(v => v !== value);
    }
    this.filterProblems();
  }

  totalCount: number = 0;
  openCount: number = 0;
  closedCount: number = 0;

  filterProblems() {
    this.filteredTableData = this.allMappedProblems.filter(p => {
      // 1. Application Type Filter
      let matchesType = true;
      if (this.selectedAppType !== 'Select') {
        const selType = this.selectedAppType.toLowerCase();
        const appType = (p.details.applicationType || '').toLowerCase();
        
        if (selType.includes('service')) {
          matchesType = appType === 'service';
        } else if (selType.includes('infra') || selType.includes('host')) {
          matchesType = appType === 'host' || appType === 'infrastructure';
        } else if (selType.includes('database') || selType.includes('db')) {
          matchesType = appType === 'database';
        } else {
          matchesType = appType === selType;
        }
      }

      // 2. Technology Type Filter
      const matchesTech = this.selectedTechType === 'Select' || 
        (p.details.technologyType || '').toLowerCase() === this.selectedTechType.toLowerCase();

      // 3. Application Filter
      const matchesApp = this.selectedApplication === 'Select' ||
        p.details.applicationId == this.selectedApplication ||
        p.details.appID == this.selectedApplication ||
        (p.details.applicationName || '').toLowerCase() === this.selectedApplication.toLowerCase();

      // 4. Status Sidebar filter
      const matchesStatus = this.selectedProblemStatus === 'all' || p.problemStatus === this.selectedProblemStatus;

      // 5. Date Filter (Enforce strictly, but allow open alerts to bypass)
      const pStart = this.parseToDate(p.details.startTime)?.getTime() || 0;
      const startDate = this.parseToDate(this.startTime);
      const endDate = this.parseToDate(this.endTime);
      const matchesDate = !startDate || !endDate || 
        (pStart >= startDate.getTime() && pStart <= endDate.getTime()) ||
        p.problemStatus === 'open';

      // 6. Search Filter
      const search = this.searchText.toLowerCase();
      const matchesSearch = !search ||
        (p.problem || '').toLowerCase().includes(search) ||
        (p.impacted || '').toLowerCase().includes(search) ||
        (p.applicationType || '').toLowerCase().includes(search) ||
        (p.severity || '').toLowerCase().includes(search) ||
        (p.problemStatus || '').toLowerCase().includes(search) ||
        (p.startDate || '').toLowerCase().includes(search) ||
        (p.duration || '').toLowerCase().includes(search) ||
        (p.details?.pid?.toString() || '').includes(search);
      return matchesType && matchesTech && matchesApp && matchesStatus && matchesDate && matchesSearch;
    });

    // Apply Frontend-Only Sorting for Severity, Start Date, and Duration
    this.filteredTableData.sort((a, b) => {
      let comparison = 0;
      if (this.sortKey === 'severity') {
        const getWeight = (s: string) => {
          if (!s) return 0;
          const low = s.toLowerCase();
          if (low.includes('critical')) return 3;
          if (low.includes('warning')) return 2;
          return 1;
        };
        comparison = getWeight(a.severity) - getWeight(b.severity);
      } else if (this.sortKey === 'duration') {
        const getMs = (p: any) => {
          const start = this.parseToDate(p.details.startTime)?.getTime() || 0;
          let end: number;
          if (p.problemStatus === 'open') {
            end = new Date().getTime();
          } else {
            end = p.details.endTime ? (this.parseToDate(p.details.endTime)?.getTime() || start) : start;
          }
          return Math.max(0, end - start);
        };
        comparison = getMs(a) - getMs(b);
      } else {
        // default: sortKey === 'startDate'
        const timeA = this.parseToDate(a.details.startTime)?.getTime() || 0;
        const timeB = this.parseToDate(b.details.startTime)?.getTime() || 0;
        comparison = timeA - timeB;
      }
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.totalCount = this.filteredTableData.length;
    this.openCount = this.filteredTableData.filter(p => p.problemStatus === 'open').length;
    this.closedCount = this.filteredTableData.filter(p => p.problemStatus === 'closed').length;

    // Reset pagination on filter change
    this.currentPage = 1;

    this.renderOpenClosedChart();
  }

  parseToDate(dateInput: any): Date | null {
    if (!dateInput) return null;
    let s = dateInput.toString().trim();
    if (!s || s === '-') return null;

    // If it's a number (like YYYYMMDDHHmm from dateService)
    if (/^\d{8,14}$/.test(s)) {
      if (s.length < 12) return null;
      return new Date(
        parseInt(s.substring(0, 4)),
        parseInt(s.substring(4, 6)) - 1,
        parseInt(s.substring(6, 8)),
        parseInt(s.substring(8, 10)),
        parseInt(s.substring(10, 12))
      );
    }

    // If it's an ISO string, treat any timezone/missing timezone as IST (+05:30)
    if (s.includes('T') || s.includes('-')) {
      s = s.replace(/Z$/, '+05:30')
           .replace(/\+00:?00$/, '+05:30');
      if (!/\+\d{2}:?\d{2}$/.test(s) && !/-\d{2}:?\d{2}$/.test(s)) {
        s = s + '+05:30';
      }
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  renderOpenClosedChart(): void {
    if (!this.filteredTableData || !this.startTime || !this.endTime) return;

    const startDate = this.parseToDate(this.startTime);
    const endDate = this.parseToDate(this.endTime);
    if (!startDate || !endDate) return;

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const durationMs = endMs - startMs;

    let bucketSizeMin: number;
    if (durationMs <= 3600000) bucketSizeMin = 1;
    else if (durationMs <= 21600000) bucketSizeMin = 5;
    else if (durationMs <= 86400000) bucketSizeMin = 30;
    else if (durationMs <= 604800000) bucketSizeMin = 120;
    else bucketSizeMin = 720;

    const bucketSizeMs = bucketSizeMin * 60000;
    const buckets: any[] = [];
    for (let t = startMs; t <= endMs; t += bucketSizeMs) {
      buckets.push({
        start: t,
        end: t + bucketSizeMs,
        problems: []
      });
    }

    // Assign problems to buckets
    this.filteredTableData.forEach(p => {
      if (!p.details || !p.details.startTime) return;
      const pStart = this.parseToDate(p.details.startTime)?.getTime() || 0;
      let bucket = buckets.find(b => pStart >= b.start && pStart < b.end);
      if (!bucket && p.problemStatus === 'open' && pStart < startMs && buckets.length > 0) {
        bucket = buckets[0];
      }
      if (bucket) {
        bucket.problems.push(p);
      }
    });

    const createSeriesData = (status: string) => {
      return buckets.map(b => {
        const filtered = b.problems.filter((p: any) => p.problemStatus === status);
        return {
          x: b.start,
          y: filtered.length,
          status: status
        };
      });
    };

    const openSeriesData = createSeriesData('open');
    const closedSeriesData = createSeriesData('closed');

    const chartOptions: Highcharts.Options = {
      chart: {
        type: 'column',
        height: 250,
        backgroundColor: 'transparent',
        spacingBottom: 40,
        marginTop: 20,
        zooming: {
          type: 'x',
          resetButton: {
            theme: {
              display: 'none'
            }
          }
        },
        events: {
          selection: (event: any) => {
            if (event.xAxis) {
              const minMs = event.xAxis[0].min;
              const maxMs = event.xAxis[0].max;

              if (maxMs - minMs < 60000) {
                return false;
              }

              if (!this.preZoomTimeframe) {
                this.preZoomTimeframe = {
                  startdateTime: this.startTime.toString(),
                  enddateTime: this.endTime.toString(),
                  startTime: null,
                  endTime: null
                };
              }

              const startDate = new Date(minMs);
              const endDate = new Date(maxMs);

              const pad = (n: number) => n.toString().padStart(2, '0');
              const toStr = (d: Date) => {
                const year = d.getFullYear();
                const month = pad(d.getMonth() + 1);
                const day = pad(d.getDate());
                const hours = pad(d.getHours());
                const minutes = pad(d.getMinutes());
                return `${year}${month}${day}${hours}${minutes}`;
              };

              this.isZooming = true;
              this.dateService.setDate({
                startdateTime: toStr(startDate),
                enddateTime: toStr(endDate),
                startTime: null,
                endTime: null
              });

              return false;
            }
            return true;
          }
        }
      },
      title: { text: '' },
      xAxis: {
        type: 'datetime',
        min: startMs,
        max: endMs,
        labels: {
          style: { color: '#64748b', fontSize: '10px', fontWeight: '500' },
          rotation: 0,
          y: 20
        },
        lineColor: '#cbd5e1',
        tickColor: '#cbd5e1',
        crosshair: {
          color: 'rgba(59, 130, 246, 0.08)',
          width: 25
        }
      },
      yAxis: {
        min: 0,
        title: { text: 'ALERTS', style: { fontSize: '9px', fontWeight: '700', color: '#64748b' } },
        allowDecimals: false,
        gridLineDashStyle: 'Dash',
        gridLineColor: '#f1f5f9',
        labels: { style: { fontSize: '10px', color: '#64748b' } }
      },
      legend: { enabled: false },
      credits: { enabled: false },
      plotOptions: {
        column: {
          stacking: 'normal',
          borderWidth: 0,
          pointPadding: 0.08,
          groupPadding: 0.08,
          borderRadius: 4,
          dataLabels: { enabled: false }
        }
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        shadow: true,
        style: {
          fontFamily: "'Inter', sans-serif"
        },
        formatter: function () {
          const points = this.points || [];
          let html = `<div style="padding: 8px; min-width: 180px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                        <div style="font-weight: 700; color: #1e293b; font-size: 11px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                          <i class="fa fa-clock text-primary" style="font-size: 10px;"></i>
                          ${Highcharts.dateFormat('%b %d, %Y • %H:%M', this.x)}
                        </div>`;
          
          let total = 0;
          points.forEach((p: any) => {
            const color = p.series.name === 'Open' ? '#f43f5e' : '#64748b';
            const name = p.series.name;
            const val = p.y;
            total += val;
            html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                       <span style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 5px;">
                         <span style="width: 8px; height: 8px; border-radius: 50%; background-color:${color}; display: inline-block;"></span>
                         ${name}
                       </span>
                       <span style="font-size: 11px; font-weight: 700; color: #1e293b;">${val}</span>
                     </div>`;
          });

          if (points.length > 1) {
            html += `<div style="border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                       <span style="font-size: 11px; font-weight: 600; color: #334155;">Total Alerts</span>
                       <span style="font-size: 11px; font-weight: 800; color: #1e293b;">${total}</span>
                     </div>`;
          }
          
          html += `</div>`;
          return html;
        }
      },
      series: [
        { 
          type: 'column', 
          name: 'Open', 
          data: openSeriesData, 
          color: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, '#f43f5e'],
              [1, '#be123c']
            ]
          } as any
        },
        { 
          type: 'column', 
          name: 'Closed', 
          data: closedSeriesData, 
          color: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, '#94a3b8'],
              [1, '#475569']
            ]
          } as any
        }
      ]
    };

    setTimeout(() => {
      if (this.openClosedChartRef) {
        this.openClosedChartRef.destroy();
      }
      this.openClosedChartRef = Highcharts.chart('problemTimelineChart', chartOptions);
    }, 0);
  }

  calculateDuration(startTime: string, endTime: string, status?: string): string {
    if (!startTime) return '-';
    const start = this.parseToDate(startTime);
    if (!start) return '-';
    let end: Date | null;

    if (status?.toLowerCase() === 'open') {
      end = new Date();
    } else if (endTime) {
      end = this.parseToDate(endTime);
    } else {
      return '-';
    }
    if (!end) return '-';

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return '-';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  formatDate(date: string | number): number {
    if (!date) return 0;
    let dateStr = date.toString();
    dateStr = dateStr.replace(/-/g, "").replace(/:/g, "").replace(" ", "").replace("T", "");
    return parseInt(dateStr);
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '-';
    const date = this.parseToDate(dateStr);
    return date ? date.toLocaleString() : '-';
  }

  getProblemDetailsList(row: any): { key: string, value: any }[] {
    const d = row.details || {};

    return [
      { key: 'Alert ID', value: d.alertId || d.alertID || '-' },
      { key: 'Alert Name', value: d.alertName || '-' },
      { key: 'Application ID', value: d.applicationId || d.appID || '-' },
      { key: 'Application Name', value: d.applicationName || '-' },
      { key: 'Application Type', value: d.applicationType || '-' },
      { key: 'Metric Name', value: d.metricName || row.metricName || '-' },
      { key: 'Status', value: d.status || row.severity || '-' },
      { key: 'Problem Status', value: d.problemStatus || row.problemStatus || '-' },
      { key: 'Start Time', value: this.formatDateTime(d.startTime) },
      { key: 'End Time', value: this.formatDateTime(d.endTime) },
      { key: 'Level 1 Mail Id', value: d.level1MailId || '-' },
      { key: 'Level 2 Mail Id', value: d.level2MailId || d.level2MaidId || '-' },
      { key: 'Level 3 Mail Id', value: d.level3MailId || '-' }
    ];
  }

  navigateToProblemDetail(row: any) {
      const pid = row?.details?.pid;
      if (pid != null) {
          this.router.navigate(['/allProblems', pid]);
      }
  }
}