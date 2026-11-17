import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { first } from 'rxjs/operators';
import { ClientManagementService } from '../../../../../services/client-management.service';
import { ApiUserService } from '../../../../../services/api-user.service';
import { RoleService } from '../../../../../services/role.service';
import { ApplicationService } from '../../../../../services/application.service';
import { AuthenticationService } from '../../../../../services/authentication.service';
import Swal from 'sweetalert2';


import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { UpdateClientAppMappingComponent } from '../update-client-app-mapping/update-client-app-mapping.component';
import { DecoderService } from '../../../../../services/decoder.service';
import { SanitizeInputDirective } from '../../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../../services/sanitization.service';

@Component({
  selector: 'app-client-app-mapping',
  imports: [CommonModule, FormsModule, DragDropModule, UpdateClientAppMappingComponent, SanitizeInputDirective],
  templateUrl: './client-app-mapping.component.html',
  styleUrl: './client-app-mapping.component.css'
})
export class ClientAppMappingComponent implements OnInit {
  private clientService = inject(ClientManagementService);
  private apiUserService = inject(ApiUserService);
  private roleService = inject(RoleService);
  private applicationService = inject(ApplicationService);
  private authService = inject(AuthenticationService);

  private decoderService = inject(DecoderService);
  private sanitizationService = inject(SanitizationService);

  canCreate: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;


  currentUser: any;
  userId: string = '';
  tool: string = 'APM';
  totalMappingCount: number = 0;
  view: 'form' | 'table' | 'update' = 'table';
  isReadOnly: boolean = false;
  categoryDropdownOpen = false;
  editCategoryDropdownOpen = false;

  // Fixed-position styles so dropdown escapes overflow:hidden parent
  dropdownStyle: { top: string; left: string; width: string } = { top: '0px', left: '0px', width: '0px' };

  mappingObj: any = {
    clientName: '',
    selectedLicenseIds: [] as number[],
    selectedApps: [] as string[]
  };

  activeCategoryLicId: number | null = null; // To track which license dropdown is open in Row 2

  // Pagination and Search/Sort
  p: number = 1;
  itemsPerPage: number = 10;
  Math = Math;
  paginatedRecords: any[] = [];
  filteredRecords: any[] = [];
  searchText: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  sortParam: string = '';

  assignedAppMap: Map<number, number> = new Map(); // appId -> licenseId
  availableCategories: any[] = [];
  productState: { [licenseId: number]: { [category: string]: any } } = {};
  collapsedPanels: Set<string> = new Set();
  complexProducts = ['SRG', 'NETWORK', 'HOST', 'Host'];

  // Specific lists from RoleComponent
  srgAvailableAppsList: any[] = [];
  networkAppsList: any[] = [];
  hostTechTypes: any[] = [];

  clientList: any[] = [];
  licenseList: any[] = [];

  // ─── License Remaining Counter ────────────────────────────
  licenseRemaining: { fullstack: number; modules: number; ndu: number; users: number } = {
    fullstack: 0, modules: 0, ndu: 0, users: 0
  };
  licenseTotal: { fullstack: number; modules: number; ndu: number; users: number } = {
    fullstack: 0, modules: 0, ndu: 0, users: 0
  };
  /** Baseline remaining from server — never mutated after fetch */
  serverBaseRemaining: { fullstack: number; modules: number; ndu: number; users: number } = {
    fullstack: 0, modules: 0, ndu: 0, users: 0
  };
  /** Tracks how many units over the limit each license is (0 = within limit) */
  licenseExcess: { [licId: number]: number } = {};
  licenseDetailsLoaded = false;

  expandedClients: { [key: number]: boolean } = {};

  categoryMap: { [key: number]: any[] } = {
    1: [
      { label: 'Service', value: 'SERVICE' },
      { label: 'Host', value: 'HOST' },
      { label: 'Relational Database', value: 'RELATIONAL' },
      { label: 'Non-Relational Database', value: 'NON-RELATIONAL' }
    ],
    3: [
      { label: 'EKS', value: 'EKS' },
      { label: 'Service', value: 'SERVICE' }
    ]
  };

  ngOnInit(): void {
    this.currentUser = this.apiUserService.getCurrentUser();
    this.userId = this.currentUser?.userId || this.currentUser?.userid || this.currentUser?.userName || '';
    this.tool = sessionStorage.getItem('tool') || '';

    // Determine read-only based on crud permissions below, rather than forcing Admin to true.
    const userType = (this.currentUser?.userType || this.currentUser?.usertype || '').toString().trim().toLowerCase();
    // ---- CRUD PERMISSIONS ----
    const clientMapping = (this.currentUser as any)?.['crudData']?.['Admin-Config']?.['client'];
    if (clientMapping) {
      this.canCreate = this.decoderService.decryptJson(clientMapping.create) === 'true';
      this.canEdit = this.decoderService.decryptJson(clientMapping.edit) === 'true';
      this.canDelete = this.decoderService.decryptJson(clientMapping.delete) === 'true';
    }
    // // ---- DEBUG LOG ----
    // console.log('[ClientAppMapping] User:', this.userId, '|', this.currentUser?.userType);
    // console.log('[ClientAppMapping] Permissions → Create:', this.canCreate, '| Edit:', this.canEdit, '| Delete:', this.canDelete);


    this.fetchComplexInitialData();
    this.loadClients();
    this.loadLicenses();
    this.loadMappingRecords();
    this.showTable();
  }

  onClientChange(): void {
    const clientId = Number(this.mappingObj.clientName);
    if (clientId) {
      // Reset dependent selections when client changes
      this.mappingObj.selectedLicenseIds = [];
      this.productState = {};
      this.licenseDetailsLoaded = false;
      this.loadLicenses(clientId);
      this.fetchComplexInitialData();
      this.fetchLicenseDetails(clientId);
    }
  }

  fetchLicenseDetails(clientId: number): void {
    this.clientService.getClientLicenseDetails(clientId, this.currentUser?.sessionDTO).subscribe({
      next: (res: any) => {
        const d = res?.clientLicenseDetails;
        if (d) {
          this.licenseTotal = {
            fullstack: d.fullstackTotal ?? 0,
            modules: d.modulesTotal ?? 0,
            ndu: d.nduTotal ?? 0,
            users: d.usersTotal ?? 0
          };
          // Store baseline once — recalculateAvailability subtracts local count from this
          this.serverBaseRemaining = {
            fullstack: d.fullstackRemaining ?? 0,
            modules: d.modulesRemaining ?? 0,
            ndu: d.nduRemaining ?? 0,
            users: d.usersRemaining ?? 0
          };
          this.licenseRemaining = { ...this.serverBaseRemaining };
          this.licenseDetailsLoaded = true;
          // Re-apply any in-progress UI assignments
          this.recalculateAvailability();
        }
      },
      error: () => { this.licenseDetailsLoaded = false; }
    });
  }

  /** Returns the remaining count for the currently active license filter */
  get activeLicenseRemaining(): number {
    const licId = this.mappingObj.selectedLicenseIds?.[0];
    if (licId === 1) return this.licenseRemaining.fullstack;  // Fullstack
    if (licId === 2) return this.licenseRemaining.modules;    // Modules
    if (licId === 3) return this.licenseRemaining.ndu;        // NDU
    return 0;
  }

  get activeLicenseLabel(): string {
    const licId = this.mappingObj.selectedLicenseIds?.[0];
    if (licId === 1) return 'Fullstack';
    if (licId === 2) return 'Modules';
    if (licId === 3) return 'NDU';
    return '';
  }

  /** Context-aware: which container type should show the counter badge? */
  get counterContext(): 'HOST' | 'ALL' | 'EKS' | null {
    const licId = this.mappingObj.selectedLicenseIds?.[0];
    if (licId === 1) return 'HOST';
    if (licId === 2) return 'ALL';
    if (licId === 3) return 'EKS';
    return null;
  }

  /** Returns true if the counter badge should be shown for a given product category */
  shouldShowCounter(product: string): boolean {
    const ctx = this.counterContext;
    if (!ctx || !this.licenseDetailsLoaded) return false;
    const norm = this.normalizeCategory(product);
    if (ctx === 'HOST') return norm === 'HOST';
    if (ctx === 'EKS') return norm === 'EKS';
    if (ctx === 'ALL') return true;
    return false;
  }

  /** Decrement remaining counter when an app/rule is assigned */
  decrementRemaining(): void {
    const licId = this.mappingObj.selectedLicenseIds?.[0];
    if (licId === 1 && this.licenseRemaining.fullstack > 0) this.licenseRemaining.fullstack--;
    else if (licId === 2 && this.licenseRemaining.modules > 0) this.licenseRemaining.modules--;
    else if (licId === 3 && this.licenseRemaining.ndu > 0) this.licenseRemaining.ndu--;
  }

  /** Increment remaining counter when an app/rule is unassigned */
  incrementRemaining(): void {
    const licId = this.mappingObj.selectedLicenseIds?.[0];
    if (licId === 1) this.licenseRemaining.fullstack = Math.min(this.licenseTotal.fullstack, this.licenseRemaining.fullstack + 1);
    else if (licId === 2) this.licenseRemaining.modules = Math.min(this.licenseTotal.modules, this.licenseRemaining.modules + 1);
    else if (licId === 3) this.licenseRemaining.ndu = Math.min(this.licenseTotal.ndu, this.licenseRemaining.ndu + 1);
  }

  /** True if adding more apps is blocked due to license exhaustion */
  isLicenseExhausted(): boolean {
    return this.licenseDetailsLoaded && this.activeLicenseRemaining <= 0;
  }

  /** Maps a license list ID to the key used in licenseRemaining/serverBaseRemaining */
  private licenseTypeKey(licId: number): 'fullstack' | 'modules' | 'ndu' | 'users' | null {
    const label = (this.licenseList.find(l => l.value === licId)?.label ?? '').toLowerCase();
    if (label.includes('fullstack')) return 'fullstack';
    if (label.includes('module')) return 'modules';
    if (label.includes('ndu')) return 'ndu';
    if (label.includes('user')) return 'users';
    return null;
  }

  /** Shows a named SweetAlert warning when a license capacity is exceeded */
  private showLicenseExceedAlert(licId: number): void {
    const licenseName = this.licenseList.find(l => l.value === licId)?.label || 'License';
    Swal.fire({
      icon: 'warning',
      title: 'License Limit Exceeded',
      html: `<b>${licenseName}</b> license units are fully utilized.<br/>
             <span style="color:#64748b;font-size:0.8rem">Remove an existing mapping or upgrade your license to add more.</span>`,
      confirmButtonText: 'Got it',
      confirmButtonColor: '#2563eb'
    });
  }

  /** Returns true if assigning one more app to this license would exceed capacity */
  private wouldExceedCapacity(licId: number): boolean {
    if (!this.licenseDetailsLoaded) return false;
    const key = this.licenseTypeKey(licId);
    if (!key) return false;
    return this.licenseRemaining[key] <= 0;
  }

  /** Called when a TECH_TYPE or DATABASE app dropdown value changes — checks capacity and reverts if exceeded */
  onTechAppSelected(licId: number, product: string, _index: number, rule: any): void {
    if (!rule.appId) return;
    this.recalculateAvailability();
    if ((this.licenseExcess[licId] ?? 0) > 0) {
      this.showLicenseExceedAlert(licId);
      setTimeout(() => { rule.appId = null; this.recalculateAvailability(); });
    } else {
      this.checkDuplicateTechRule(licId, product, _index);
    }
  }

  toggleClient(clientId: number): void {
    this.expandedClients[clientId] = !this.expandedClients[clientId];
  }

  editRecord(client: any): void {
    if (this.isReadOnly) return;
    this.editClientId = client.clientId;
    this.view = 'update';
  }

  editClientId: number | null = null;
  showUpdateModal: boolean = false;

  loadMappingRecords(): void {
    const userRole = this.currentUser?.userType || this.currentUser?.usertype || '';
    const userTypeLower = userRole.toString().trim().toLowerCase();
    if (userTypeLower === 'admin') {
      // For Admin: authService.getClientId() is now the single source of truth
      const clientId = Number(this.authService.getClientId() || 0);

      console.log('Admin detected, calling clientMappedDataByClientId for user:', this.userId);
      this.clientService.getClientMappedDataByClientId(clientId, this.userId, userRole, this.currentUser?.sessionDTO).subscribe({
        next: (res: any) => {
          const status = res.serviceStatus || res.status || '';
          if (status === '200' || status === 'Success') {
            this.mappingRecords = res.data || [];
            this.filteredRecords = [...this.mappingRecords];
            this.updatePaginatedRecords();
            // Auto-expand for read-only view
            if (this.mappingRecords.length > 0) {
              this.expandedClients[this.mappingRecords[0].clientId] = true;
            }
          }
        },
        error: (err) => {
          console.error('Error loading admin mapping records:', err);
        }
      });
    } else {
      // For Super Admin: load all mappings
      this.clientService.getClientMappedData(this.userId, this.currentUser?.sessionDTO).subscribe({
        next: (res: any) => {
          const status = res.serviceStatus || res.status || '';
          if (status === '200' || status === 'Success') {
            this.mappingRecords = res.data || [];
            this.filteredRecords = [...this.mappingRecords];
            this.updatePaginatedRecords();
          }
        },
        error: (err) => {
          console.error('Error loading super-admin mapping records:', err);
        }
      });
    }
  }

  fetchComplexInitialData() {
    this.applicationService.getFullApplicationData(this.userId, 'SRG', this.currentUser.sessionDTO).subscribe((res: any) => this.srgAvailableAppsList = res?.serviceResponse?.applications || []);
    this.applicationService.getFullApplicationData(this.userId, 'Network', this.currentUser.sessionDTO).subscribe((res: any) => this.networkAppsList = res?.serviceResponse?.applications || []);
    this.applicationService.getTechnologyBySubFeature('Host').subscribe((res: any) => this.hostTechTypes = res?.serviceResponse || []);
    // Database complex types are often hardcoded or fetched via specific methods
  }

  loadClients(): void {
    // Both Admin and SuperAdmin need to load clients to display in the dropdown
    this.clientService.getAllClients(this.userId).pipe(first()).subscribe({
      next: (res: any) => {
        const rawData = res.data || res.serviceResponse || [];
        const status = res.serviceStatus || res.status || '';
        if (status === '200' || status === 'OK' || status === 'Success') {
          this.clientList = rawData.map((c: any) => {
            if (Array.isArray(c)) {
              return {
                id: c[0],
                name: c[1] || 'Unknown'
              };
            } else {
              return {
                id: c.client_id || c.id || 0,
                name: c.client_name || c.name || 'Unknown'
              };
            }
          });
        }
      },
      error: (err) => {
        console.error('Error loading clients:', err);
      }
    });
  }

  loadLicenses(clientId?: number): void {
    this.clientService.getAllLicenseTypes(this.userId, clientId, this.currentUser?.sessionDTO).pipe(first()).subscribe({
      next: (res: any) => {
        const rawData = res.data || res.serviceResponse || [];
        const status = res.serviceStatus || res.status || '';
        if (status === '200' || status === 'OK' || status === 'Success' || status === '204') {
          this.licenseList = rawData.map((l: any) => ({
            value: Number(l.license_type_id || l.id || 0),
            label: l.license_type || l.name || 'Unknown'
          }));
        }
      }
    });
  }


  mappingRecords: any[] = [];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.category-dropdown-wrapper')) {
      this.categoryDropdownOpen = false;
      this.activeCategoryLicId = null;
    }
    if (!target.closest('.edit-category-dropdown-wrapper')) this.editCategoryDropdownOpen = false;
  }

  // ─── Helpers ──────────────────────────────────────────────

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  showTable(): void {
    this.view = 'table';
    this.searchText = '';
    this.p = 1;
    this.filteredRecords = [...this.mappingRecords];
    this.updatePaginatedRecords();
    this.resetFormState();
  }

  showForm(): void {
    this.view = 'form';
    this.resetFormState();
  }

  onPageSizeChange(value: any) {
    this.itemsPerPage = parseInt(value, 10);
    this.p = 1;
    this.updatePaginatedRecords();
  }

  updatePaginatedRecords() {
    const startIndex = (this.p - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRecords = this.filteredRecords.slice(startIndex, endIndex);
  }

  search() {
    const term = this.searchText.toLowerCase().trim();
    if (!term) {
      this.filteredRecords = [...this.mappingRecords];
    } else {
      this.filteredRecords = this.mappingRecords.filter(r =>
        (r.clientName?.toLowerCase().includes(term)) ||
        (r.clientId?.toString().includes(term))
      );
    }
    this.p = 1;
    this.updatePaginatedRecords();
  }

  sortBy(column: string) {
    if (this.sortParam === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortParam = column;
      this.sortDirection = 'asc';
    }

    this.filteredRecords.sort((a: any, b: any) => {
      let valA = a[column];
      let valB = b[column];

      if (valA == null) valA = '';
      if (valB == null) valB = '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.p = 1;
    this.updatePaginatedRecords();
  }

  nextPage() {
    if (this.p < this.totalPages) {
      this.p++;
      this.updatePaginatedRecords();
    }
  }

  prevPage() {
    if (this.p > 1) {
      this.p--;
      this.updatePaginatedRecords();
    }
  }

  goToPage(page: number) {
    this.p = page;
    this.updatePaginatedRecords();
  }

  get totalPages(): number {
    return Math.ceil((this.filteredRecords?.length || 0) / Number(this.itemsPerPage));
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.p;
    if (total <= 5) return Array(total).fill(0).map((x, i) => i + 1);
    let start = Math.max(current - 2, 1);
    let end = Math.min(start + 4, total);
    if (end === total) start = Math.max(end - 4, 1);
    return Array.from({ length: (end - start + 1) }, (_, i) => start + i);
  }

  resetFormState(): void {
    this.mappingObj = {
      clientName: '',
      selectedLicenseIds: [] as number[],
      selectedApps: [] as string[]
    };
    this.productState = {};
    this.activeCategoryLicId = null;
    this.recalculateAvailability();
  }

  getLicenseLabel(value: any): string {
    return this.licenseList.find(l => l.value === Number(value))?.label ?? value;
  }

  getFilteredCategories(licId: number): any[] {
    if (licId === 1 || licId === 3) {
      return this.categoryMap[licId];
    } else if (licId === 2) {
      return this.productState[licId]?.['modularCategoriesPool'] || [];
    }
    return [];
  }

  normalizeCategory(value: string): string {
    if (!value) return '';
    const v = value.toUpperCase().replace(/[\s\-]/g, '_').trim();
    if (v === 'NONRELATIONAL') return 'NON-RELATIONAL';
    if (v === 'NON_RELATIONAL') return 'NON-RELATIONAL';
    return v;
  }

  isCategorySelected(licId: number, value: string): boolean {
    const cats = this.productState[licId]?.['selectedCategories'] || [];
    const normalizedValue = this.normalizeCategory(value);

    return cats.some((c: string) => this.normalizeCategory(c) === normalizedValue);
  }

  onCategoryToggle(licId: number, value: string, event: any): void {
    this.initLicenseState(licId);
    const checked = event?.target ? event.target.checked : !!event;
    const normalizedValue = this.normalizeCategory(value);

    let cats = this.productState[licId]?.['selectedCategories'] || [];
    cats = cats.map((c: string) => this.normalizeCategory(c));

    if (checked) {
      if (!cats.includes(normalizedValue)) {
        cats.push(normalizedValue);
        this.initializeProduct(licId, normalizedValue);
      }
    } else {
      cats = cats.filter((c: string) => c !== normalizedValue);
      // Remove ALL variants safely
      if (this.productState[licId]) {
        Object.keys(this.productState[licId]).forEach(key => {
          if (this.normalizeCategory(key) === normalizedValue) {
            delete this.productState[licId][key];
          }
        });
      }
    }

    this.productState[licId] = {
      ...this.productState[licId],
      selectedCategories: [...cats]
    };
    this.productState = { ...this.productState };

    this.recalculateAvailability();
  }

  // Removed unused getAppsByCategory and isAppInCategoryByName logic.


  toSystemName(p: string): string {
    if (!p) return p;
    const upP = p.toUpperCase().trim();
    if (upP === 'SRG') return 'SRG';
    if (upP === 'EKS') return 'EKS';
    if (upP === 'NETWORK') return 'Network';
    if (upP === 'HOST') return 'Host';
    if (upP === 'DATABASE') return 'Database';
    if (upP === 'SERVICE') return 'Service';
    if (upP === 'RELATIONAL') return 'Relational';
    if (upP === 'NON-RELATIONAL' || upP === 'NON_RELATIONAL') return 'Non-Relational';

    const lowP = p.toLowerCase().trim();
    return lowP.charAt(0).toUpperCase() + lowP.slice(1);
  }

  getProductIcon(product: string): string {
    const p = this.normalizeCategory(product);
    const predefinedIcons: { [key: string]: string } = {
      'SERVICE': 'ri-pulse-line',
      'SRG': 'ri-shield-keyhole-line',
      'NETWORK': 'ri-node-tree',
      'HOST': 'ri-server-line',
      'DATABASE': 'ri-database-2-line',
      'BROWSER_MONITORING': 'ri-window-line',
      'API_GATEWAY': 'ri-global-line',
      'EKS': 'ri-bubble-chart-line',
      'AKS': 'ri-microsoft-line',
      'REDIS': 'ri-database-2-fill',
      'KAFKA': 'ri-flow-chart',
      'NGINX': 'ri-server-fill',
      'ACTIVEMQ': 'ri-message-3-line',
      'RELATIONAL': 'ri-database-2-line',
      'NON-RELATIONAL': 'ri-database-2-fill',
      'APACHE': 'ri-server-fill',
      'LINUX': 'ri-linux-line',
      'WINDOWS': 'ri-microsoft-line',
      'MSSQL': 'ri-database-2-line',
      'MYSQL': 'ri-database-2-line',
      'POSTGRESQL': 'ri-database-2-line',
      'ORACLE': 'ri-database-2-line',
      'MONGODB': 'ri-database-2-fill',
      'BRUM': 'ri-window-line'
    };
    return predefinedIcons[p] || 'ri-server-line';
  }

  getPanelTitle(product: string): string {
    return this.normalizeCategory(product).replace(/_/g, ' ');
  }

  getPanelDescription(product: string): string {
    const p = this.normalizeCategory(product);
    switch (p) {
      case 'SERVICE': return 'Define microservice accessibility';
      case 'SRG': return 'Security Group mapping for applications';
      case 'NETWORK': return 'Map applications to specific network hosts and endpoints';
      case 'HOST': return 'Configure host-level server permissions';
      case 'DATABASE': return 'Configure database level permissions';
      case 'BROWSER_MONITORING': return 'Define browser application accessibility';
      case 'API_GATEWAY': return 'Define API Gateway service accessibility';
      case 'EKS': return 'Manage EKS cluster permissions';
      case 'AKS': return 'Manage AKS cluster permissions';
      case 'REDIS': return 'Configure Redis access controls';
      case 'KAFKA': return 'Configure Kafka topic access';
      case 'NGINX': return 'Configure Nginx server blocks';
      case 'ACTIVEMQ': return 'Configure ActiveMQ queues and topics';
      case 'RELATIONAL': return 'Configure relational database access rules';
      case 'NON-RELATIONAL': return 'Configure non-relational database access rules';
      default: return '';
    }
  }

  // ─── UI Helpers (Sync with Role) ────────────────────────
  togglePanelCollapse(product: string) {
    if (this.collapsedPanels.has(product)) this.collapsedPanels.delete(product);
    else this.collapsedPanels.add(product);
  }
  isPanelCollapsed(product: string): boolean { return this.collapsedPanels.has(product); }

  getAccessCount(licId: number, product: string): number {
    const state = this.productState[licId]?.[product];
    if (!state) return 0;
    if (state.mode === 'GENERIC') return state.assigned?.length || 0;
    return state.rules?.filter((r: any) => r.appId).length || 0;
  }

  getFilteredAvail(licId: number, product: string): any[] {
    const state = this.productState[licId]?.[product];
    if (!state || !state.available) return [];
    if (!state.searchAvail) return state.available;
    const term = state.searchAvail.toLowerCase();
    return state.available.filter((item: any) => item.label.toLowerCase().includes(term));
  }

  getFilteredAssigned(licId: number, product: string): any[] {
    const state = this.productState[licId]?.[product];
    if (!state || !state.assigned) return [];
    if (!state.searchAssigned) return state.assigned;
    const term = state.searchAssigned.toLowerCase();
    return state.assigned.filter((item: any) => item.label.toLowerCase().includes(term));
  }

  initLicenseState(licId: number) {
    if (!this.productState[licId]) {
      this.productState[licId] = {
        'selectedCategories': [],
        'modularCategoriesPool': []
      };
    }
  }

  getSelectedCategories(licId: number): string[] {
    const cats = this.productState[licId]?.['selectedCategories'] || [];
    return cats.map((c: string) => this.normalizeCategory(c));
  }

  getLicenseName(licId: number): string {
    return this.licenseList.find(l => l.value === licId)?.label || 'License';
  }

  trackByLicense(index: number, licId: number) { return licId; }
  trackByCategory(index: number, item: any) { return item.value; }

  isAppAssignedElsewhere(appId: any, licId: number): boolean {
    const assignedLic = this.assignedAppMap.get(Number(appId));
    return assignedLic !== undefined && assignedLic !== licId;
  }

  recalculateAvailability() {
    this.assignedAppMap.clear();
    let count = 0;

    // Per-license local assignment count (for all modes: GENERIC, TECH_TYPE, COMPLEX_TYPE)
    const localCount: { [licId: number]: number } = {};

    this.mappingObj.selectedLicenseIds.forEach((licId: number) => {
      const licenseState = this.productState[licId];
      localCount[licId] = 0;
      if (!licenseState) return;
      const cats = licenseState['selectedCategories'] || [];
      cats.forEach((cat: string) => {
        const state = licenseState[cat];
        if (!state) return;
        if (state.mode === 'GENERIC') {
          state.assigned.forEach((a: any) => {
            this.assignedAppMap.set(Number(a.value), licId);
            count++;
            localCount[licId]++;
          });
        } else {
          // Covers TECH_TYPE (dropdown per row) and COMPLEX_TYPE (HOST/SRG/NETWORK/RELATIONAL)
          state.rules.forEach((r: any) => {
            if (r.appId) {
              this.assignedAppMap.set(Number(r.appId), licId);
              count++;
              localCount[licId]++;
            }
          });
        }
      });
    });

    this.totalMappingCount = count;

    // Update remaining counters for all selected licenses from server baseline
    if (this.licenseDetailsLoaded) {
      this.mappingObj.selectedLicenseIds.forEach((licId: number) => {
        const key = this.licenseTypeKey(licId);
        if (key) {
          const raw = this.serverBaseRemaining[key] - (localCount[licId] ?? 0);
          this.licenseRemaining[key] = Math.max(0, raw);
          // Track excess separately (raw < 0 means over capacity)
          this.licenseExcess[licId] = raw < 0 ? Math.abs(raw) : 0;
        }
      });
    }
  }

  // ─── Initialization & License ─────────────────────────────

  onLicenseSelect(licId: number): void {
    this.mappingObj.selectedLicenseIds = [licId];

    // Reset productState to ensure only one license's configuration exists
    this.productState = {};
    this.productState[licId] = {
      'selectedCategories': [],
      'modularCategoriesPool': []
    };

    if (licId === 2) { // Modular
      this.roleService.findProducts(this.userId, this.currentUser.userType).subscribe((res: any) => {
        if (res && res.products) {
          this.productState[licId]['modularCategoriesPool'] = res.products.map((p: string) => ({
            value: p,
            label: p.replace(/_/g, ' ')
          }));
          this.productState = { ...this.productState };
        }
      });
    } else {
      // Ensure state is initialized for other license types (e.g., Fullstack, NDU)
      this.initLicenseState(licId);
    }

    this.activeCategoryLicId = null;
    this.recalculateAvailability();
  }

  onLicenseChange(): void {
    // Keep for potential legacy use or single selection scenarios
    if (!this.mappingObj.licenseType) return;
    const licId = Number(this.mappingObj.licenseType);
    this.mappingObj.selectedLicenseIds = [licId];

    this.initLicenseState(licId);
    this.productState[licId]['selectedCategories'] = [];
    this.productState = { ...this.productState };

    if (licId === 2) { // Modular
      const user = this.currentUser;
      if (user) {
        this.roleService.findProducts(user.userId, user.userType).subscribe({
          next: (res: any) => {
            if (res && res.products) {
              this.availableCategories = res.products.map((p: string) => ({ value: p, label: p }));
            }
          }
        });
      }
    }
  }

  // onLicenseToggle implementation above handles this.

  initializeProduct(licId: number, product: string) {
    const normalized = this.normalizeCategory(product);
    const sysName = this.toSystemName(normalized);
    this.initLicenseState(licId);

    if (this.complexProducts.map(p => this.normalizeCategory(p)).includes(normalized)) {
      this.productState[licId][normalized] = { mode: 'COMPLEX_TYPE', rules: [], techTypes: [] };

      const complexWithTech = ['HOST', 'DATABASE', 'RELATIONAL', 'NON-RELATIONAL'];
      if (complexWithTech.includes(normalized)) {
        this.applicationService.getTechnologyBySubFeature(sysName).subscribe((res: any) => {
          this.productState[licId][normalized].techTypes = res?.serviceResponse || [];
          if (normalized === 'HOST') this.hostTechTypes = res?.serviceResponse || [];
          this.productState = { ...this.productState };
        });
      }

      this.addRule(licId, normalized);
      return;
    }
    this.detectTechnologyMode(licId, normalized);
  }

  detectTechnologyMode(licId: number, product: string) {
    const sysName = this.toSystemName(product);
    this.applicationService.getTechnologyBySubFeature(sysName).subscribe({
      next: (response: any) => {
        const techList = response?.serviceResponse || [];
        if (techList.length > 0) {
          this.productState[licId][product] = { mode: 'TECH_TYPE', techTypes: techList, rules: [] };
          this.addRule(licId, product);
          this.productState = { ...this.productState };
        } else {
          this.loadGenericApplications(licId, product);
        }
      },
      error: () => this.loadGenericApplications(licId, product)
    });
  }

  loadGenericApplications(licId: number, product: string) {
    const sysName = this.toSystemName(product);
    this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO).subscribe({
      next: (response: any) => {
        const apps = response?.serviceResponse?.applications || [];
        this.productState[licId][product] = {
          mode: 'GENERIC',
          appsList: apps,
          available: apps.map((a: any) => ({ value: a.applicationId, label: a.applicationName })),
          assigned: [],
          searchAvail: '',
          searchAssigned: ''
        };
        this.recalculateAvailability();
        this.productState = { ...this.productState };
      }
    });
  }

  loadComplexData(product: string) {
    const sysName = this.toSystemName(product);
    if (sysName === 'SRG') {
      this.applicationService.getFullApplicationData(this.userId, 'SRG', this.currentUser.sessionDTO).subscribe((res: any) => this.srgAvailableAppsList = res?.serviceResponse?.applications || []);
    } else if (sysName === 'Network' || sysName === 'NETWORK') {
      this.applicationService.getFullApplicationData(this.userId, 'Network', this.currentUser.sessionDTO).subscribe((res: any) => this.networkAppsList = res?.serviceResponse?.applications || []);
    } else if (sysName === 'Host' || sysName === 'HOST') {
      this.applicationService.getTechnologyBySubFeature('Host').subscribe((res: any) => this.hostTechTypes = res?.serviceResponse || []);
    }
  }

  // ─── Form: Category dropdown (fixed position) ─────────────

  toggleCategoryDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.categoryDropdownOpen) {
      const trigger = event.currentTarget as HTMLElement;
      const rect = trigger.getBoundingClientRect();
      this.dropdownStyle = {
        top: `${rect.bottom + window.scrollY + 4}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`
      };
    }
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  getSelectedCategoryLabel(licId: number): string {
    const cats = this.productState[licId]?.['selectedCategories'] || [];
    if (cats.length === 0) return 'No selection';
    return cats.join(', ');
  }



  addRule(licId: number, product: string) {
    const state = this.productState[licId]?.[product];
    if (!state) return;
    if (state.mode === 'TECH_TYPE') {
      state.rules.push({ techType: '', appId: null, appsList: [] });
    } else if (product === 'SRG') {
      state.rules.push({ appId: null, subFeatureID: null, subFeatureList: [] });
    } else if (product === 'NETWORK') {
      state.rules.push({ appId: null, hostId: null, hostList: [] });
    } else if (product === 'HOST') {
      state.rules.push({ osType: '', appId: null, hostPattern: '', appList: [] });
    } else if (product === 'DATABASE' || product === 'RELATIONAL' || product === 'NON-RELATIONAL') {
      state.rules.push({ techType: '', appId: null, appsList: [] });
    }
    this.productState = { ...this.productState };
  }


  removeRule(licId: number, product: string, index: number) {
    this.productState[licId][product].rules.splice(index, 1);
    this.recalculateAvailability();
    this.productState = { ...this.productState };
  }

  onTechTypeChange(licId: number, product: string, index: number) {
    const rule = this.productState[licId][product].rules[index];
    this.applicationService.getFullApplicationData(this.userId, this.toSystemName(product), this.currentUser.sessionDTO, rule.techType).subscribe((res: any) => {
      rule.appsList = res?.serviceResponse?.applications || [];
      rule.appId = null;
    });
  }

  onComplexAppChange(licId: number, product: string, index: number) {
    const rule = this.productState[licId][product].rules[index];
    const sysName = this.toSystemName(product);
    if (sysName === 'SRG') {
      this.applicationService.getFullApplicationData(this.userId, 'SRG', this.currentUser.sessionDTO, undefined, rule.appId).subscribe((res: any) => {
        rule.subFeatureList = res?.serviceResponse?.subFeatures || [];
        rule.subFeatureID = null;
      });
    } else if (sysName === 'Network' || sysName === 'NETWORK') {
      this.applicationService.getAllNetworkHostByApllicationID(this.currentUser, rule.appId).subscribe((res: any) => {
        rule.hostList = res?.serviceResponse || [];
        rule.hostId = '';
      });
    }
    this.recalculateAvailability();
    // Guard: revert selection if over capacity
    if ((this.licenseExcess[licId] ?? 0) > 0) {
      this.showLicenseExceedAlert(licId);
      setTimeout(() => { rule.appId = null; this.recalculateAvailability(); });
    }
  }

  onHostOsChange(licId: number, index: number) {
    const rule = this.productState[licId]['HOST'].rules[index];
    this.applicationService.getFullApplicationData(this.userId, 'Host', this.currentUser.sessionDTO, rule.osType.toUpperCase()).subscribe((res: any) => {
      rule.appList = res?.serviceResponse?.applications || [];
      rule.appId = null;
    });
  }

  onHostAppChange(licId: number, index: number) {
    const rule = this.productState[licId]['HOST'].rules[index];
    const selectedApp = rule.appList.find((app: any) => app.applicationId === Number(rule.appId));
    if (selectedApp) rule.hostPattern = selectedApp.applicationName;
    this.recalculateAvailability();
    // Guard: revert selection if over capacity
    if ((this.licenseExcess[licId] ?? 0) > 0) {
      this.showLicenseExceedAlert(licId);
      setTimeout(() => { rule.appId = null; rule.hostPattern = ''; this.recalculateAvailability(); });
      return;
    }
    this.checkDuplicateHost(licId, index);
  }

  checkDuplicateHost(licId: number, index: number) {
    const state = this.productState[licId]['HOST'];
    const current = state.rules[index];
    if (!current.osType || !current.appId) return;
    const isDuplicate = state.rules.some((r: any, i: number) => i !== index && r.osType === current.osType && r.appId == current.appId);
    if (isDuplicate) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Host Mapping found for the same OS and Application.' });
      setTimeout(() => current.appId = null, 0);
    }
  }

  checkDuplicateTechRule(licId: number, product: string, index: number) {
    const state = this.productState[licId][product];
    const current = state.rules[index];
    if (!current.techType || !current.appId) return;
    const isDuplicate = state.rules.some((r: any, i: number) => i !== index && r.techType === current.techType && r.appId == current.appId);
    if (isDuplicate) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: `Duplicate rule found for ${product} with the same Tech and Application.` });
      setTimeout(() => current.appId = null, 0);
    }
  }

  checkDuplicateSrg(licId: number, index: number) {
    const state = this.productState[licId]['SRG'];
    const current = state.rules[index];
    if (!current.appId || !current.subFeatureID) return;
    const isDuplicate = state.rules.some((r: any, i: number) => i !== index && r.appId == current.appId && r.subFeatureID == current.subFeatureID);
    if (isDuplicate) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate SRG Mapping found for the same Application and Sub Feature.' });
      setTimeout(() => current.subFeatureID = null, 0);
    }
  }

  genericDrop(event: CdkDragDrop<any[]>, licId: number, product: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Determine direction: available -> assigned (decrement) vs assigned -> available (increment)
      const movingToAssigned = event.container.id.includes('AssignedList');
      if (movingToAssigned && this.wouldExceedCapacity(licId)) {
        this.showLicenseExceedAlert(licId);
        return; // Block the drop
      }
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
    this.recalculateAvailability();
    this.productState = { ...this.productState };
  }

  onRightClick(event: MouseEvent, licId: number, product: string, item: any) {
    event.preventDefault();
    if (!this.isAppAssignedElsewhere(item.value, licId)) {
      this.assignService(licId, product, item);
    }
  }

  assignService(licId: number, product: string, item: any) {
    // Block assignment if license is already exhausted
    if (this.wouldExceedCapacity(licId)) {
      this.showLicenseExceedAlert(licId);
      return;
    }
    const state = this.productState[licId]?.[product];
    if (state) {
      state.available = state.available.filter((i: any) => i.value !== item.value);
      state.assigned.push(item);
      this.recalculateAvailability();
      this.productState = { ...this.productState };
    }
  }

  unassignService(licId: number, product: string, item: any) {
    const state = this.productState[licId]?.[product];
    if (state) {
      state.assigned = state.assigned.filter((i: any) => i.value !== item.value);
      state.available.push(item);
      this.recalculateAvailability();
      this.productState = { ...this.productState };
    }
  }



  // ─── Save & Delete ────────────────────────────────────────

  saveMapping(): void {
    if (this.isReadOnly) return;
    const clientId = Number(this.mappingObj.clientName);
    if (!clientId || this.mappingObj.selectedLicenseIds.length === 0) {
      Swal.fire('Error', 'Please select a client and at least one license type', 'error');
      return;
    }

    // Final capacity guard before submitting
    if (this.licenseDetailsLoaded) {
      const violations: string[] = [];
      this.mappingObj.selectedLicenseIds.forEach((licId: number) => {
        if ((this.licenseExcess[licId] ?? 0) > 0) {
          const name = this.licenseList.find(l => l.value === licId)?.label || 'License';
          const key = this.licenseTypeKey(licId);
          violations.push(`<b>${name}</b>: ${this.licenseExcess[licId]} unit(s) over the limit of <b>${key ? this.licenseTotal[key] : '?'}</b>`);
        }
      });
      if (violations.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Cannot Save — License Limits Exceeded',
          html: violations.join('<br/>') + '<br/><br/><span style="font-size:0.8rem;color:#64748b">Remove assignments to stay within your allocated units.</span>',
          confirmButtonText: 'Review',
          confirmButtonColor: '#dc2626'
        });
        return;
      }
    }

    const payloads: any[] = [];
    this.mappingObj.selectedLicenseIds.forEach((licId: number) => {
      const licenseState = this.productState[licId];
      if (!licenseState) return;
      const licenseTypeName = this.licenseList.find(l => l.value === licId)?.label || 'Unknown License';

      const cats = licenseState['selectedCategories'] || [];
      cats.forEach((cat: string) => {
        const state = licenseState[cat];
        if (!state) return;
        if (state.mode === 'GENERIC') {
          state.assigned.forEach((item: any) => {
            payloads.push({ clientId, appId: Number(item.value), appName: item.label, licenseTypeId: licId, licenseTypeName: licenseTypeName });
          });
        } else {
          state.rules.forEach((r: any) => {
            if (r.appId) {
              const appName = state.appList?.find((a: any) => a.applicationId === Number(r.appId))?.applicationName || 'Unknown App';
              payloads.push({ clientId, appId: Number(r.appId), appName: appName, licenseTypeId: licId, licenseTypeName: licenseTypeName });
            }
          });
        }
      });
    });

    if (payloads.length === 0) {
      Swal.fire('Error', 'Please select at least one application', 'error');
      return;
    }

    const safePayloads = this.sanitizationService.sanitizePayload(payloads);

    this.clientService.saveClientAppLicenseMapping(this.userId, safePayloads).subscribe({
      next: (res: any) => {
        const status = res.serviceStatus || res.status || '';
        if (status === '201' || status === '200' || status === 'Success') {
          Swal.fire('Success', 'Mapping saved successfully', 'success');
          this.mappingObj = { clientName: '', selectedLicenseIds: [], selectedApps: [] };
          this.productState = {};
          this.loadMappingRecords();
          this.showTable();
        } else if (res.serviceError === 'LICENSE_LIMIT_EXCEEDED') {
          const licenseLabels: any = {
            FULLSTACK: 'Fullstack license limit exceeded',
            MODULES: 'Module license limit exceeded',
            NDU: 'NDU license limit exceeded',
            USERS: 'User license limit exceeded'
          };
          const violations: any[] = Array.isArray(res.serviceResponse) ? res.serviceResponse : [];
          const message = violations.map((v: any) =>
            `${licenseLabels[v.licenseType] || v.licenseType} (Remaining: ${v.remaining})`
          ).join('\n');
          Swal.fire('License Limit Exceeded', message || 'License limit exceeded', 'warning');
        } else {
          Swal.fire('Error', res.message || 'Failed to save mapping', 'error');
        }
      },
      error: (err: HttpErrorResponse) => {
        const errorMsg = err.error?.message || err.message || 'An unexpected error occurred while saving the mapping';
        Swal.fire('Error', errorMsg, 'error');
      }
    });
  }

  deleteRecord(id: number): void {
    if (this.isReadOnly) return;
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete all app license mappings for this client.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        this.clientService.deleteClientAppLicenseByClientId(id, this.userId).subscribe({
          next: (res: any) => {
            const status = res.serviceStatus || res.status || '';
            if (status === '200' || status === 'Success') {
              Swal.fire('Deleted!', 'Mappings deleted successfully.', 'success');
              this.loadMappingRecords();
            } else {
              Swal.fire('Error', res.message || 'Failed to delete', 'error');
            }
          },
          error: (err) => {
            console.error('Error deleting:', err);
            Swal.fire('Error', 'An error occurred', 'error');
          }
        });
      }
    });
  }
  // Removed unused isAppInCategory logic.

  getTotalSelectedCategories(): number {
    let count = 0;
    this.mappingObj.selectedLicenseIds.forEach((licId: number) => {
      count += (this.productState[licId]?.['selectedCategories'] || []).length;
    });
    return count;
  }

  isFullWidth(licId: number, product: string): boolean {
    const list = this.getSelectedCategories(licId);
    return list.length % 2 !== 0 && list[list.length - 1] === product;
  }
}
