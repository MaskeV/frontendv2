import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthenticationService } from '../../../../services/authentication.service';
import { DashboardApiService } from '../../../../services/dashboard-api.service';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { Subject, takeUntil } from 'rxjs';
import { DecoderService } from '../../../../services/decoder.service';
import { Router } from '@angular/router';
import { LoggerService } from '../../../../services/logger.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../services/sanitization.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

type FilterType = 'all' | 'personal' | 'public';
type SortField = 'name' | 'widgetCount' | 'createdBy' | 'createdOn' | 'updatedOn';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-custom-dashboard-page',
  imports: [CommonModule, FormsModule, SanitizeInputDirective],
  templateUrl: './custom-dashboard-page.component.html',
  styleUrl: './custom-dashboard-page.component.css',
})
export class CustomDashboardPageComponent implements OnInit, OnDestroy {

  user = new User();
  currentUser: User = new User();
  sessionObject: Session = new Session();

  destroy$ = new Subject<void>();

  dashboardDetails: any[] = [];
  filteredDashboards: any[] = [];
  pagedDashboards: any[] = [];

  expandedIndex: number | null = null;
  activeFilter: FilterType = 'all';
  isLoading: boolean = false;

  // ── Search ────────────────────────────────────────────────
  searchQuery: string = '';

  // ── Sort ──────────────────────────────────────────────────
  sortField: SortField | null = null;
  sortDir: SortDir = 'asc';

  // ── Pagination ────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number = 10;
  pageNumbers: number[] = [];

  get pageStart(): number {
    return this.filteredDashboards.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }
  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredDashboards.length);
  }

  // ── Modal flags ───────────────────────────────────────────
  showCreateDashboardModal: boolean = false;
  createDashboardError = '';
  newDashboardName = '';
  isPublicDashboard: boolean = false;

  showUpdateDashboardModal: boolean = false;
  editDashboardError = '';
  editDashboardName = '';
  editIsPublicDashboard: boolean = false;
  editDashboardId: number | null = null;

  deleteDashboardHandlerModal: boolean = false;
  dashboardIdToDelete: number | null = null;

  deleteChartHandlerModal: boolean = false;
  chartIdToDelete: number | null = null;

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private decoderService: DecoderService,
    private loggerService: LoggerService,
    private dashboardApiService: DashboardApiService,
    private snackBar: MatSnackBar,
    private sanitizationService: SanitizationService,
    private domSanitizer: DomSanitizer,
  ) {
    this.authService.currentUser.subscribe(x => this.currentUser = x || new User());
  }

  ngOnInit() {
    this.user = this.decoderService.decryptJson(
      JSON.parse(sessionStorage.getItem('currentUser')!)
    ) as User;

    this.sessionObject.featureName = 'Custom Dashboard';
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');

    const browser = this.loggerService.getBrowserNameAndVersion();
    this.sessionObject.browserName = browser.name;
    this.sessionObject.browserVersion = browser.version;
    this.currentUser.sessionDTO = this.sessionObject;

    this.getAllDashboardsDetails();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Filter ────────────────────────────────────────────────

  setFilter(filter: FilterType) {
    if (this.activeFilter === filter) return;
    this.activeFilter = filter;
    this.expandedIndex = null;
    this.getAllDashboardsDetails();
  }

  private getIsPublicParam(): string | undefined {
    if (this.activeFilter === 'personal') return 'false';
    if (this.activeFilter === 'public') return 'true';
    return undefined;
  }

  getAllDashboardsDetails() {
    this.isLoading = true;
    const isPublic = this.getIsPublicParam();
    const roleName = this.currentUser?.['userRole']?.length
      ? this.currentUser['userRole'][0].roleId
      : 'Super Admin';

    this.dashboardApiService
      .getAllDashboardsDetails(this.currentUser.userId, roleName, isPublic)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.dashboardDetails = res.serviceStatus === 'Success' ? res.serviceResponse : [];
          this.isLoading = false;
          this.applySearchSortPage();
        },
        error: () => {
          this.dashboardDetails = [];
          this.isLoading = false;
          this.applySearchSortPage();
        }
      });
  }

  // ── Search ────────────────────────────────────────────────

  onSearchChange() {
    this.currentPage = 1;
    this.applySearchSortPage();
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentPage = 1;
    this.applySearchSortPage();
  }

  /** Returns a SafeHtml string with the search term highlighted. */
  highlight(value: string | undefined | null): SafeHtml {
    if (!value) return '';
    const q = this.searchQuery.trim();
    if (!q) return value;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const html = value.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark class="cdp-highlight">$1</mark>'
    );
    return this.domSanitizer.bypassSecurityTrustHtml(html);
  }

  // ── Sort ──────────────────────────────────────────────────

  sort(field: SortField) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.currentPage = 1;
    this.applySearchSortPage();
  }

  getSortIcon(field: SortField): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  private sortData(data: any[]): any[] {
    if (!this.sortField) return data;
    const field = this.sortField;
    const dir = this.sortDir === 'asc' ? 1 : -1;

    return [...data].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (field === 'widgetCount') {
        valA = a.widgets?.length ?? 0;
        valB = b.widgets?.length ?? 0;
      } else if (field === 'createdOn' || field === 'updatedOn') {
        valA = a[field] ? new Date(a[field].replace(' ', 'T')).getTime() : 0;
        valB = b[field] ? new Date(b[field].replace(' ', 'T')).getTime() : 0;
      } else {
        valA = (a[field] ?? '').toString().toLowerCase();
        valB = (b[field] ?? '').toString().toLowerCase();
      }

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }

  // ── Pagination ────────────────────────────────────────────

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.expandedIndex = null;
    this.updatePage();
  }

  onPageSizeChange() {
    this.pageSize = +this.pageSize;
    this.currentPage = 1;
    this.applySearchSortPage();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDashboards.length / +this.pageSize));
  }

  private updatePage() {
    const size = +this.pageSize;
    const start = (this.currentPage - 1) * size;
    this.pagedDashboards = this.filteredDashboards.slice(start, start + size);
  }

  /** Maps page-local row index to a stable global index for expand/collapse. */
  getGlobalIndex(localIndex: number): number {
    return (this.currentPage - 1) * this.pageSize + localIndex;
  }

  // ── Master pipeline: search → sort → paginate ─────────────

  private applySearchSortPage() {
    const q = this.searchQuery.trim().toLowerCase();

    // 1. Search
    let result = q
      ? this.dashboardDetails.filter(d =>
          (d.name ?? '').toLowerCase().includes(q) ||
          (d.createdBy ?? '').toString().toLowerCase().includes(q) ||
          (d.updatedBy ?? '').toString().toLowerCase().includes(q)
        )
      : [...this.dashboardDetails];

    // 2. Sort
    result = this.sortData(result);

    this.filteredDashboards = result;

    // 3. Paginate
    // this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    this.updatePage();
  }

  // ── Row expand/collapse ───────────────────────────────────

  toggleDashboard(index: number) {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  // ── Navigation ────────────────────────────────────────────

  navigateToDashboard(dashboardId: number) {
    sessionStorage.setItem('dashboardId', String(dashboardId));
    this.router.navigate(['/dynamic-dashboard']);
  }

  // ── Edit ──────────────────────────────────────────────────

  editDashboardHandler(data: any) {
    this.editDashboardId = data.dashboard_id;
    this.editDashboardName = data.name;
    this.editIsPublicDashboard = data.isPublicDashboard;
    this.showUpdateDashboardModal = true;
  }

  updateCustomDashboard() {
    if (!this.editDashboardId) { this.editDashboardError = 'Dashboard Id not found!'; return; }
    if (!this.editDashboardName.trim()) { this.editDashboardError = 'Enter dashboard name'; return; }
    this.editDashboardError = '';

    const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');
    const safeDashboardId = this.sanitizationService.sanitizePayload(this.editDashboardId);
    const safeDashboardName = this.sanitizationService.sanitizePayload(this.editDashboardName);
    const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);

    this.dashboardApiService
      .updateCustomDashboard(safeDashboardId, safeDashboardName, this.editIsPublicDashboard, safeUserName, updatedOn)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res.serviceStatus === 'Success') {
            this.showSnack('Dashboard updated successfully');
            this.showUpdateDashboardModal = false;
            this.editDashboardName = '';
            this.editDashboardError = '';
            this.getAllDashboardsDetails();
          } else {
            this.editDashboardError = res.serviceError || 'Something went wrong';
          }
        },
        error: (e) => {
          this.editDashboardError = 'Something went wrong';
          console.error('Error updating dashboard:', e);
        }
      });
  }

  // ── Delete Dashboard ──────────────────────────────────────

  deleteDashboardHandler() {
    if (!this.dashboardIdToDelete) return;
    this.dashboardApiService.deleteDashboard(this.dashboardIdToDelete)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.deleteDashboardHandlerModal = false;
        this.getAllDashboardsDetails();
      });
  }

  // ── Delete Chart ──────────────────────────────────────────

  deleteChartHandler() {
    this.dashboardApiService.deleteCharts([this.chartIdToDelete])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.deleteChartHandlerModal = false;
        this.getAllDashboardsDetails();
      });
  }

  // ── Create Dashboard ──────────────────────────────────────

  openCreateDashboardModal() {
    this.newDashboardName = '';
    this.isPublicDashboard = false;
    this.createDashboardError = '';
    this.showCreateDashboardModal = true;
  }

  createDashboard() {
    if (!this.newDashboardName.trim()) { this.createDashboardError = 'Enter dashboard name'; return; }
    this.createDashboardError = '';

    const createdOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');
    const roleName = this.currentUser?.['userRole']?.length
      ? this.currentUser['userRole'][0].roleId
      : 'Super Admin';

    const payload = {
      name: this.newDashboardName,
      createdBy: this.currentUser.userId,
      createdOn,
      isPublicDashboard: this.isPublicDashboard,
      roleName,
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);

    this.dashboardApiService.createCustomDashboard(safePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res.serviceStatus === 'Success') {
            this.showSnack('Dashboard created successfully');
            this.showCreateDashboardModal = false;
            this.newDashboardName = '';
            this.createDashboardError = '';
            this.getAllDashboardsDetails();
          } else {
            this.createDashboardError = res.serviceError || 'Something went wrong';
          }
        },
        error: () => { this.createDashboardError = 'Something went wrong'; }
      });
  }

  // ── Helpers ───────────────────────────────────────────────

  showSnack(message: string) {
    this.snackBar.open(message, '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  formatDate(raw: string | null): string {
    if (!raw) return '—';
    try {
      const d = new Date(raw.replace(' ', 'T'));
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch {
      return raw;
    }
  }
}