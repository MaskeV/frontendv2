import { Component, HostListener, OnInit, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ClientManagementService } from '../../../../../services/client-management.service';
import { ApiUserService } from '../../../../../services/api-user.service';
import { RoleService } from '../../../../../services/role.service';
import { ApplicationService } from '../../../../../services/application.service';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';
import { DecoderService } from '../../../../../services/decoder.service';
import { SanitizeInputDirective } from '../../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../../services/sanitization.service';

@Component({
  selector: 'app-update-client-app-mapping',
  imports: [CommonModule, FormsModule, DragDropModule, SanitizeInputDirective],
  templateUrl: './update-client-app-mapping.component.html',
  styleUrl: './update-client-app-mapping.component.css'
})
export class UpdateClientAppMappingComponent implements OnInit {
  private clientService = inject(ClientManagementService);
  private apiUserService = inject(ApiUserService);
  private roleService = inject(RoleService);
  private applicationService = inject(ApplicationService);
  private decoderService = inject(DecoderService);
  private sanitizationService = inject(SanitizationService);

  @Input() editClientId: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();


  canEdit: boolean = false;
  currentUser: any;
  userId: string = '';
  tool: string = 'APM';

  mappingObj: any = {
    clientName: '',
    selectedLicenseIds: [] as number[],
    selectedApps: []
  };

  activeCategoryLicId: number | null = null; // To track which license dropdown is open in Row 2

  assignedAppMap: Map<number, number> = new Map(); // appId -> licenseId
  allApps: any[] = []; // Global pool for total awareness
  allLicenseData: any[] = []; // Cache for raw API response to allow license switching without re-fetch

  clientList: any[] = [];
  licenseList: any[] = [];
  availableCategories: any[] = [
    { label: 'Service', value: 'SERVICE' },
    { label: 'Host', value: 'HOST' },
    { label: 'Relational Database', value: 'RELATIONAL' },
    { label: 'Non-Relational Database', value: 'NON-RELATIONAL' },
    { label: 'Network', value: 'NETWORK' },
    { label: 'SRG', value: 'SRG' }
  ];

  categoryDropdownOpen = false;

  productState: { [licenseId: number]: { [category: string]: any } } = {};
  collapsedPanels: Set<string> = new Set(); // Global UI state (could also be nested if needed)
  complexProducts = ['SRG', 'NETWORK', 'HOST', 'Host'];

  srgAvailableAppsList: any[] = [];
  networkAppsList: any[] = [];
  hostTechTypes: any[] = [];

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

  // Hierarchy Icons
  techIconMap: { [key: string]: string } = {
    'LINUX': 'ri-linux-line',
    'WINDOWS': 'ri-microsoft-line',
    'JAVA': 'ri-cup-line',
    'PYTHON': 'ri-terminal-box-line',
    'NODEJS': 'ri-nodejs-line',
    'DATABASE': 'ri-database-2-line',
    'HOST': 'ri-server-line'
  };

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.category-dropdown-wrapper')) {
      this.categoryDropdownOpen = false;
      this.activeCategoryLicId = null;
    }
  }

  ngOnInit(): void {
    this.currentUser = this.apiUserService.getCurrentUser();
    this.userId = this.currentUser?.userId || '';
    this.tool = sessionStorage.getItem('tool') || '';
    // ---- CRUD PERMISSIONS ----
    const clientMapping = (this.currentUser as any)?.['crudData']?.['Admin-Config']?.['client'];
    if (clientMapping) {
      this.canEdit = this.decoderService.decryptJson(clientMapping.edit) === 'true';
    }

    // // ---- DEBUG LOG ----
    // console.log('[UpdateClientAppMapping] User:', this.userId, '|', this.currentUser?.userType);
    // console.log('[UpdateClientAppMapping] Permissions → Edit:', this.canEdit);
    this.fetchComplexInitialData();
    this.loadClients();
    this.loadLicenses();

    if (this.editClientId) {
      this.mappingObj.clientName = this.editClientId.toString();
      this.loadExistingMapping();
    }
  }

  fetchComplexInitialData() {
    this.applicationService.getFullApplicationData(this.userId, 'SRG', this.currentUser.sessionDTO).subscribe((res: any) => this.srgAvailableAppsList = res?.serviceResponse?.applications || []);
    this.applicationService.getFullApplicationData(this.userId, 'Network', this.currentUser.sessionDTO).subscribe((res: any) => this.networkAppsList = res?.serviceResponse?.applications || []);
    this.applicationService.getTechnologyBySubFeature('Host').subscribe((res: any) => this.hostTechTypes = res?.serviceResponse || []);
  }

  // ─── Helpers ──────────────────────────────────────────────
  toSystemName(p: string): string {
    if (!p) return p;
    const upP = p.toUpperCase().trim();
    if (upP === 'SRG') return 'SRG';
    if (upP === 'EKS') return 'EKS';
    if (upP === 'NETWORK') return 'Network';
    if (upP === 'HOST') return 'Host';
    if (upP === 'DATABASE') return 'Database';
    if (upP === 'SERVICE') return 'Service';
    if (upP === 'BROWSER_MONITORING' || upP === 'BROWSER') return 'Browser Monitoring';
    if (upP === 'RELATIONAL') return 'Relational';
    if (upP === 'NON-RELATIONAL' || upP === 'NON_RELATIONAL') return 'Non-Relational';

    const lowP = p.toLowerCase().trim();
    return lowP.charAt(0).toUpperCase() + lowP.slice(1);
  }

  normalizeCategory(value: string): string {
    if (!value) return '';
    const v = value.toUpperCase().replace(/[\s\-]/g, '_').trim();
    if (v === 'NONRELATIONAL') return 'NON-RELATIONAL';
    if (v === 'NON_RELATIONAL') return 'NON-RELATIONAL';
    return v;
  }

  getProductIcon(product: string): string {
    const p = this.normalizeCategory(product);
    const predefinedIcons: { [key: string]: string } = {
      'SERVICE': 'ri-pulse-line',
      'SRG': 'ri-shield-keyhole-line',
      'NETWORK': 'ri-node-tree',
      'HOST': 'ri-server-line',
      'DATABASE': 'ri-database-2-line',
      'RELATIONAL': 'ri-database-2-line',
      'NON-RELATIONAL': 'ri-database-2-fill',
      'EKS': 'ri-bubble-chart-line',
      'AKS': 'ri-microsoft-line',
      'REDIS': 'ri-database-2-fill',
      'KAFKA': 'ri-flow-chart',
      'NGINX': 'ri-server-fill',
      'ACTIVEMQ': 'ri-message-3-line',
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
    const upP = product.toUpperCase();
    if (upP === 'SRG') return 'Service Request Gateway (SRG)';
    if (upP === 'NETWORK') return 'Network Infrastructure';
    if (upP === 'HOST') return 'Host & Server Monitoring';
    if (upP === 'DATABASE' || upP === 'RELATIONAL') return 'Relational Database (SQL)';
    if (upP === 'NON-RELATIONAL' || upP === 'NON_RELATIONAL_DATABASE') return 'Non-Relational Database (NoSQL)';
    if (upP === 'EKS') return 'Kubernetes (EKS)';
    if (upP === 'SERVICE') return 'Application Services';
    return product.replace(/_/g, ' ');
  }

  getPanelDescription(product: string): string {
    const upP = product.toUpperCase();
    if (upP === 'SRG') return 'Manage API gateways and service request mapping.';
    if (upP === 'NETWORK') return 'Monitor network devices, traffic, and connectivity.';
    if (upP === 'HOST') return 'Track CPU, Memory, and Disk health across hosts.';
    if (upP === 'DATABASE' || upP === 'RELATIONAL') return 'Deep visibility into SQL performance and queries.';
    if (upP === 'NON-RELATIONAL' || upP === 'NON_RELATIONAL_DATABASE') return 'Monitor document and key-value store performance.';
    if (upP === 'EKS') return 'Orchestration monitoring for containerized workloads.';
    if (upP === 'SERVICE') return 'Generic application service health monitoring.';
    return 'Configure advanced monitoring parameters.';
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

  getSelectedCategories(licId: number): string[] {
    const cats = this.productState[licId]?.['selectedCategories'] || [];
    return cats.map((c: string) => this.normalizeCategory(c));
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

  // ─── Dropdown logic ───────────────────────────────────────
  toggleCategoryDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  trackByLicense(index: number, licId: number) { return licId; }
  trackByCategory(index: number, item: any) { return item.value; }
  getLicenseName(licId: number): string { return this.licenseList.find(l => l.value === licId)?.label || 'License'; }

  initLicenseState(licId: number) {
    if (!this.productState[licId]) {
      this.productState[licId] = {
        'selectedCategories': [],
        'modularCategoriesPool': []
      };
    }
  }

  getFilteredCategories(licId: number): any[] {
    if (licId === 1 || licId === 3) {
      return this.categoryMap[licId];
    } else if (licId === 2) {
      return this.productState[licId]?.['modularCategoriesPool'] || [];
    }
    return [];
  }

  isAppAssignedElsewhere(appId: any, licId: number): boolean {
    const assignedLic = this.assignedAppMap.get(Number(appId));
    return assignedLic !== undefined && assignedLic !== licId;
  }

  recalculateAvailability() {
    this.assignedAppMap.clear();
    const selected = new Set<string>();

    // 1. Map all currently assigned apps across all licenses
    this.mappingObj.selectedLicenseIds.forEach((licId: number) => {
      const licenseState = this.productState[licId];
      if (!licenseState) return;
      Object.keys(licenseState).forEach(cat => {
        if (cat === 'selectedCategories' || cat === 'modularCategoriesPool') return;
        const state = licenseState[cat];
        if (state && state.mode === 'GENERIC') {
          state.assigned.forEach((a: any) => {
            this.assignedAppMap.set(Number(a.value), licId);
            selected.add(a.value.toString());
          });
        } else if (state && state.rules) {
          state.rules.forEach((r: any) => {
            if (r.appId) {
              this.assignedAppMap.set(Number(r.appId), licId);
              selected.add(r.appId.toString());
            }
          });
        }
      });
    });
    this.mappingObj.selectedApps = Array.from(selected);
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

  getSelectedCategoryLabel(licId: number): string {
    const cats = this.productState[licId]?.['selectedCategories'] || [];
    if (cats.length === 0) return 'No selection';
    return cats.join(', ');
  }

  // ─── Initialization Logic (Same as Creation) ──────────────
  initializeProduct(licId: number, product: string, apps: any[] = []) {
    const normalized = this.normalizeCategory(product);
    const sysName = this.toSystemName(normalized);
    this.initLicenseState(licId);

    if (this.complexProducts.map(p => this.normalizeCategory(p)).includes(normalized)) {
      this.productState[licId][normalized] = { mode: 'COMPLEX_TYPE', rules: [], techTypes: [] };
      const complexWithTech = ['HOST', 'DATABASE', 'RELATIONAL', 'NON-RELATIONAL'];
      if (complexWithTech.includes(normalized)) {
        this.applicationService.getTechnologyBySubFeature(sysName).subscribe((res: any) => {
          this.productState[licId][normalized].techTypes = res?.serviceResponse || [];
          if (apps.length > 0) {
            this.productState[licId][normalized].rules = apps.map(a => ({
              appId: a.appId,
              osType: a.technologyType || '',
              techType: a.technologyType || '',
              hostPattern: a.applicationName,
              appList: [{ applicationId: a.appId, applicationName: a.applicationName }]
            }));

            // Populate full list for each rule if osType is set
            this.productState[licId][normalized].rules.forEach((rule: any) => {
              if (rule.osType && normalized === 'HOST') {
                this.applicationService.getFullApplicationData(this.userId, 'Host', this.currentUser.sessionDTO, rule.osType.toUpperCase()).subscribe((res: any) => {
                  rule.appList = res?.serviceResponse?.applications || rule.appList;
                  this.productState = { ...this.productState };
                });
              } else if (rule.techType && ['DATABASE', 'RELATIONAL', 'NON-RELATIONAL'].includes(normalized)) {
                this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO, rule.techType).subscribe((res: any) => {
                  rule.appsList = res?.serviceResponse?.applications || rule.appsList;
                  this.productState = { ...this.productState };
                });
              }
            });
          } else {
            this.addRule(licId, normalized);
          }
          this.productState = { ...this.productState };
        });
      } else {
        if (apps.length > 0) {
          this.productState[licId][normalized].rules = apps.map(a => ({ appId: a.appId, subFeatureID: null, subFeatureList: [] }));
        } else {
          this.addRule(licId, normalized);
        }
      }
      return;
    }
    this.detectTechnologyMode(licId, normalized, apps);
  }

  detectTechnologyMode(licId: number, product: string, apps: any[] = []) {
    const sysName = this.toSystemName(product);
    this.applicationService.getTechnologyBySubFeature(sysName).subscribe({
      next: (response: any) => {
        const techList = response?.serviceResponse || [];
        if (techList.length > 0) {
          this.productState[licId][product] = { mode: 'TECH_TYPE', techTypes: techList, rules: [] };
          if (apps.length > 0) {
            this.productState[licId][product].rules = apps.map(a => ({
              techType: a.technologyType,
              appId: a.appId,
              appsList: [{ applicationId: a.appId, applicationName: a.applicationName }]
            }));
            // Populate full list for each rule
            this.productState[licId][product].rules.forEach((rule: any) => {
              if (rule.techType) {
                this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO, rule.techType).subscribe((res: any) => {
                  rule.appsList = res?.serviceResponse?.applications || rule.appsList;
                  this.productState = { ...this.productState };
                });
              }
            });
          } else {
            this.addRule(licId, product);
          }
          this.productState = { ...this.productState };
        } else {
          this.loadGenericApplications(licId, product, apps);
        }
      },
      error: () => this.loadGenericApplications(licId, product, apps)
    });
  }

  loadGenericApplications(licId: number, product: string, assignedApps: any[] = []) {
    const sysName = this.toSystemName(product);
    this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO).subscribe({
      next: (response: any) => {
        const apps = response?.serviceResponse?.applications || [];
        const assignedIds = new Set(assignedApps.map(a => a.appId));
        this.productState[licId][product] = {
          mode: 'GENERIC',
          appsList: apps,
          available: apps.filter((a: any) => !assignedIds.has(a.applicationId)).map((a: any) => ({ value: a.applicationId, label: a.applicationName })),
          assigned: assignedApps.map(a => ({ value: a.appId, label: a.applicationName })),
          searchAvail: '',
          searchAssigned: ''
        };
        this.recalculateAvailability();
        this.productState = { ...this.productState };
      }
    });
  }

  // ─── Rule Management ──────────────────────────────────────
  addRule(licId: number, product: string) {
    const state = this.productState[licId]?.[product];
    if (!state) return;
    if (state.mode === 'TECH_TYPE') {
      state.rules.push({ techType: '', appId: null, appsList: [] });
    } else if (product === 'SRG') {
      state.rules.push({ appId: null, subFeatureID: null, subFeatureList: [] });
    } else if (product === 'NETWORK' || product === 'Network') {
      state.rules.push({ appId: null, hostId: null, hostList: [] });
    } else if (product === 'HOST' || product === 'Host') {
      state.rules.push({ osType: 'LINUX', appId: null, hostPattern: '', appList: [] });
      this.onHostOsChange(licId, state.rules.length - 1);
    } else if (product === 'DATABASE' || product === 'Database' || product === 'Relational' || product === 'Non-Relational') {
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
  }

  onHostOsChange(licId: number, index: number) {
    const productKey = this.productState[licId]['Host'] ? 'Host' : 'HOST';
    const rule = this.productState[licId][productKey]?.rules[index];
    if (!rule) return;
    this.applicationService.getFullApplicationData(this.userId, 'Host', this.currentUser.sessionDTO, rule.osType.toUpperCase()).subscribe((res: any) => {
      rule.appList = res?.serviceResponse?.applications || [];
      rule.appId = null;
    });
  }

  onHostAppChange(licId: number, index: number) {
    const productKey = this.productState[licId]['Host'] ? 'Host' : 'HOST';
    const rule = this.productState[licId][productKey].rules[index];
    const selectedApp = rule.appList.find((app: any) => app.applicationId === Number(rule.appId));
    if (selectedApp) rule.hostPattern = selectedApp.applicationName;
    this.recalculateAvailability();
  }

  genericDrop(event: CdkDragDrop<any[]>, licId: number, product: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
    this.recalculateAvailability();
  }

  onRightClick(event: MouseEvent, licId: number, product: string, item: any) {
    event.preventDefault();
    if (!this.isAppAssignedElsewhere(item.value, licId)) {
      this.assignService(licId, product, item);
    }
  }

  assignService(licId: number, product: string, item: any) {
    const state = this.productState[licId]?.[product];
    if (state) {
      state.available = state.available.filter((i: any) => i.value !== item.value);
      state.assigned.push(item);
      this.recalculateAvailability();
    }
  }

  unassignService(licId: number, product: string, item: any) {
    const state = this.productState[licId]?.[product];
    if (state) {
      state.assigned = state.assigned.filter((i: any) => i.value !== item.value);
      state.available.push(item);
      this.recalculateAvailability();
    }
  }

  get sortedSelectedCategories(): string[] { return this.mappingObj.selectedCategories; }
  isFullWidth(licId: number, product: string): boolean {
    const list = this.getSelectedCategories(licId);
    return list.length % 2 !== 0 && list[list.length - 1] === product;
  }

  loadClients(): void {
    this.clientService.getAllClients(this.userId).subscribe((res: any) => {
      const rawData = res.data || res.serviceResponse || [];
      const status = res.serviceStatus || res.status || '';
      if (status === '200' || status === 'OK' || status === 'Success') {
        this.clientList = rawData.map((c: any) => {
          if (Array.isArray(c)) {
            return {
              client_id: c[0],
              client_name: c[1] || 'Unknown'
            };
          } else {
            return {
              client_id: c.client_id || c.id || 0,
              client_name: c.client_name || c.name || 'Unknown'
            };
          }
        });
      }
    });
  }

  loadLicenses(): void {
    this.clientService.getAllLicenseTypes(this.userId).subscribe((res: any) => {
      const rawData = res.data || res.serviceResponse || [];
      const status = res.serviceStatus || res.status || '';
      if (status === '200' || status === 'OK' || status === 'Success' || status === '204') {
        this.licenseList = rawData.map((l: any) => ({
          value: l.license_type_id || l.id || 0,
          label: l.license_type || l.name || 'Unknown'
        }));
      }
    });
  }

  loadExistingMapping(): void {
    if (!this.editClientId) return;
    const userRole = this.currentUser?.userType || this.currentUser?.usertype || '';
    this.clientService.getClientMappedDataByClientId(this.editClientId, this.userId, userRole).subscribe({
      next: (res: any) => {
        const status = res.serviceStatus || res.status || '';
        if ((status === '200' || status === 'Success') && res.data && res.data.length > 0) {
          const clientData: any = res.data[0];
          this.mappingObj.clientName = clientData.clientId?.toString() || this.editClientId?.toString();
          this.allLicenseData = clientData.licenseTypes || [];

          if (this.allLicenseData.length > 0) {
            // Find the first mapped license and select it
            const firstLic = this.allLicenseData[0];
            const internalLic = this.licenseList.find(l => l.label.toLowerCase() === firstLic.licenseType.toLowerCase());
            if (internalLic) {
              this.onLicenseSelect(internalLic.value);
            }
          }
        }
      }
    });
  }

  onLicenseSelect(licId: number): void {
    this.mappingObj.selectedLicenseIds = [licId];
    this.productState = {}; // Reset state to ensure isolation
    this.activeCategoryLicId = null;

    const licLabel = this.licenseList.find(l => l.value === licId)?.label.toLowerCase();
    const mappedLic = this.allLicenseData.find(l => l.licenseType.toLowerCase() === licLabel);

    if (mappedLic) {
      if (!this.productState[licId]) {
        this.productState[licId] = { 'selectedCategories': [], 'modularCategoriesPool': [] };
      }

      if (licId === 2) { // Modular
        this.roleService.findProducts(this.userId, this.currentUser.userType).subscribe((res: any) => {
          if (res && res.products) {
            this.productState[licId]['modularCategoriesPool'] = res.products.map((p: string) => ({
              value: p,
              label: p.replace(/_/g, ' ')
            }));
          }
        });
      }

      const licCats = Array.from(new Set(mappedLic.applications.map((a: any) => this.normalizeCategory(a.applicationType))));
      licCats.forEach((cat: any) => {
        const normCat = this.normalizeCategory(cat);
        if (!this.productState[licId]['selectedCategories'].includes(normCat)) {
          this.productState[licId]['selectedCategories'].push(normCat);
        }
        const appsForCat = mappedLic.applications.filter((a: any) => this.normalizeCategory(a.applicationType) === normCat);
        this.initializeProduct(licId, normCat, appsForCat);
      });
    } else {
      // New license selection (not in cached mapped data)
      this.initLicenseState(licId);
      if (licId === 2) { // Modular
        this.roleService.findProducts(this.userId, this.currentUser.userType).subscribe((res: any) => {
          if (res && res.products) {
            this.productState[licId]['modularCategoriesPool'] = res.products.map((p: string) => ({
              value: p,
              label: p.replace(/_/g, ' ')
            }));
          }
        });
      }
    }
    this.recalculateAvailability();
  }

  // UI Helpers (simplified for now)

  onUpdate(): void {
    const clientId = this.editClientId;
    if (!clientId || this.mappingObj.selectedLicenseIds.length === 0) {
      Swal.fire('Error', 'Invalid client or no license selected', 'error');
      return;
    }

    const payloads: any[] = [];
    this.mappingObj.selectedLicenseIds.forEach((licId: number) => {
      const licenseTypeName = this.licenseList.find(l => l.value === licId)?.label || 'Unknown License';
      const licenseState = this.productState[licId];
      if (!licenseState) return;

      Object.keys(licenseState).forEach(cat => {
        if (cat === 'selectedCategories' || cat === 'modularCategoriesPool') return;
        const state = licenseState[cat];
        if (state && state.mode === 'GENERIC') {
          state.assigned.forEach((item: any) => {
            payloads.push({ clientId, appId: Number(item.value), appName: item.label, licenseTypeId: licId, licenseTypeName: licenseTypeName });
          });
        } else if (state && state.rules) {
          state.rules.forEach((r: any) => {
            if (r.appId) {
              const fullAppList = r.appsList || r.appList || state.appsList || state.appList || [];
              const appName = fullAppList.find((a: any) => (a.applicationId || a.id) === Number(r.appId))?.applicationName || 'Unknown App';
              payloads.push({ clientId, appId: Number(r.appId), appName: appName, licenseTypeId: licId, licenseTypeName: licenseTypeName });
            }
          });
        }
      });
    });

    if (payloads.length === 0) {
      Swal.fire('Warning', 'No applications selected for any license', 'warning');
      return;
    }

    const safePayloads = this.sanitizationService.sanitizePayload(payloads);

    this.clientService.saveClientAppLicenseMapping(this.userId, safePayloads).subscribe({
      next: (res: any) => {
        if (res.serviceStatus === '201' || res.serviceStatus === '200') {
          Swal.fire('Updated!', 'Mappings updated successfully', 'success');
          this.updated.emit();
          this.close.emit();
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
          Swal.fire('Error', res.message || 'Failed to update mapping', 'error');
        }
      },
      error: (err: HttpErrorResponse) => {
        const errorMsg = err.error?.message || err.message || 'An unexpected error occurred while updating the mapping';
        Swal.fire('Error', errorMsg, 'error');
      }
    });
  }

  private getLicenseId(type: string): number {
    const lic = this.licenseList.find(l => l.value === type);
    return lic ? lic.id : 0;
  }

  cancel(): void { this.close.emit(); }
}
