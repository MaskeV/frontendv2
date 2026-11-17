import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import * as bootstrap from 'bootstrap';
import Swal from 'sweetalert2';
import {ControlGroup, ControlGroupMapping,AppOption, HostOption,SubFeatureOption,GroupingMode,SubRow,GroupingRow} from '../../../../models/ControlZone';
import { ControlZoneService } from '../../../../services/control-zone.service';
import { User } from '../../../../models/user';
import { UserTypeCrudMapObject } from '../../../../models/UserTypeCrudMapObject';
import { Session } from '../../../../models/session';
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';
import { Router } from '@angular/router';
import { LoggerService } from '../../../../services/logger.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApplicationService } from '../../../../services/application.service';
import { RoleService } from '../../../../services/role.service';
import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../services/sanitization.service';


@Component({
  selector: 'app-control-zone',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SanitizeInputDirective],
  templateUrl: './control-zone.component.html',
  styleUrl: './control-zone.component.css'
})
export class ControlZoneComponent implements OnInit, AfterViewInit {

  isForm: boolean = false;
  infraGroup: ControlGroup = new ControlGroup();
  infraGroupList: ControlGroup[] = [];
  currentUser!: User;
  userTypeCrudMap: UserTypeCrudMapObject = new UserTypeCrudMapObject();
  sessionObject: Session = new Session();
  isUpdation = false;
  isTable: boolean = false;
  isCreation: boolean = false;
  isDeleting: boolean = false;
  showInfraTable = false;
  searchText: string = '';
  page: number = 1;
  pageSize: number = 5;
  totalPages: number = 0;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  filteredInfraGroups: ControlGroup[] = [];
  pagedInfraGroups: ControlGroup[] = [];
  selectedInfraGroup!: ControlGroup;

  groupingRows: GroupingRow[] = [];
  availableApplicationTypes: string[] = [];
  productDataCache: { [productKey: string]: { applications: any[]; ipList: any[] } } = {};

  expandedZones: { [id: number]: boolean } = {};

  private originalZoneSnapshot: { description: string; mappings: any[] } | null = null;

  constructor(
    private controlZoneService: ControlZoneService,
    private router: Router,
    private loggerService: LoggerService,
    private authService: AuthenticationService,
    private modalService: NgbModal,
    private applicationService: ApplicationService,
    private roleService: RoleService,
    private sanitizationService: SanitizationService
  ) { }

  protected readonly Math = Math;

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.initializeInfraGroup();
      }
    });
  }

  initializeInfraGroup() {
    try {
      const adminConfig = (this.currentUser as any)?.['crudData']?.['Admin-Config'];
      const crudMapping = adminConfig?.['controlZone'] ?? adminConfig?.['infraGroup'];
      if (crudMapping) {
        this.userTypeCrudMap = new UserTypeCrudMapObject();
        this.userTypeCrudMap.create = crudMapping.create === 'true' || crudMapping.create === true;
        this.userTypeCrudMap.edit   = crudMapping.edit   === 'true' || crudMapping.edit   === true;
        this.userTypeCrudMap.delete = crudMapping.delete === 'true' || crudMapping.delete === true;
      } else {
        this.userTypeCrudMap = new UserTypeCrudMapObject();
        if (this.currentUser?.userType === 'Super Admin') {
          this.userTypeCrudMap.create = true;
          this.userTypeCrudMap.edit = true;
          this.userTypeCrudMap.delete = true;
        }
      }
    } catch {
      this.userTypeCrudMap = new UserTypeCrudMapObject();
    }

    this.isForm = true;
    this.isTable = false;
    this.isCreation = true;
    this.isUpdation = false;
    this.currentUser.sessionDTO = this.sessionObject;
    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config";
    this.sessionObject.configTab = "ControlZone";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.loadApplicationTypes();
    this.addGroupingRow();
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => { new bootstrap.Tooltip(el); });
  }

  showErrorBanner(message: string) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: message, confirmButtonColor: '#3b82f6' });
  }
  showSuccessBanner(message = 'Control Zone created successfully') {
    Swal.fire({ icon: 'success', title: 'Success!', text: message, confirmButtonColor: '#3b82f6' });
  }
  showUpdateBanner(message = 'Control Zone updated successfully') {
    Swal.fire({ icon: 'success', title: 'Update Successful!', text: message, confirmButtonColor: '#3b82f6' });
  }
  showDeleteBanner(message = 'Control Zone deleted successfully') {
    Swal.fire({ icon: 'success', title: 'Deleted!', text: message, confirmButtonColor: '#3b82f6' });
  }

  loadApplicationTypes() {
    this.roleService.findProducts(this.currentUser.userId, this.currentUser.userType)
      .subscribe({
        next: (response: { products: any[]; features: any[] }) => {
          const products = (response?.products || []).map((p: any) => {
            if (typeof p === 'string') return p;
            return p?.name || p?.productName || p?.label || String(p);
          });
          this.availableApplicationTypes = Array.from(new Set(products)).sort();
        },
        error: () => { this.availableApplicationTypes = []; }
      });
  }

  private isHost(t: string): boolean { return t?.toLowerCase() === 'host'; }
  private isNetwork(t: string): boolean { return t?.toLowerCase() === 'network'; }
  private isSrg(t: string): boolean { return t?.toLowerCase() === 'srg'; }

  private fetchByApplicationType(applicationType: string, onDone: (data: { applications: any[]; ipList: any[] }) => void) {
    this.applicationService.getFullApplicationData(
      this.currentUser.userId, applicationType, this.sessionObject, ''
    ).subscribe({
      next: (response: any) => {
        let data = { applications: [], ipList: [] };
        if (response && response.serviceStatus === ServiceStatus.SUCCESS) {
          const resData = response.serviceResponse || {};
          data = { applications: resData.applications || [], ipList: resData.ipList || [] };
        }
        this.productDataCache[applicationType] = data;
        onDone(data);
      },
      error: () => {
        const empty = { applications: [], ipList: [] };
        this.productDataCache[applicationType] = empty;
        onDone(empty);
      }
    });
  }

  private fetchByApplicationAndTechnology(
    applicationType: string, technologyType: string,
    onDone: (data: { applications: any[]; ipList: any[] }) => void
  ) {
    this.applicationService.getFullApplicationData(
      this.currentUser.userId, applicationType, this.sessionObject, technologyType
    ).subscribe({
      next: (response: any) => {
        let data = { applications: [], ipList: [] };
        if (response && response.serviceStatus === ServiceStatus.SUCCESS) {
          const resData = response.serviceResponse || {};
          data = { applications: resData.applications || [], ipList: resData.ipList || [] };
        }
        onDone(data);
      },
      error: () => { onDone({ applications: [], ipList: [] }); }
    });
  }

  addGroupingRow() {
    this.groupingRows.push(this.emptyRow());
  }

  removeGroupingRow(index: number) {
    if (this.groupingRows.length > 1) {
      this.groupingRows.splice(index, 1);
    }
  }

  private emptyRow(): GroupingRow {
    return {
      applicationType: '',
      applicationTechnologies: [],
      showAppDropdown: false,
      showTechDropdown: false,
      appSearchText: '',
      techSearchText: '',
      mode: 'GENERIC',
      technologyDisabled: false,
      loadingApps: false,
      availableTechnologies: [],
      availableApplications: [],
      selectedApplications: [],
      subRows: []
    };
  }

  private emptySubRow(): SubRow {
    return {
      appId: null, appName: '',
      selectedAppIpKey: '', ipId: null, ipAddress: '',
      hostId: null, hostName: '', hostList: [],
      subFeatureID: null, subFeatureName: '', subFeatureList: []
    };
  }

  onAppTypeChange(row: GroupingRow) {
    row.applicationTechnologies = [];
    row.selectedApplications = [];
    row.availableTechnologies = [];
    row.availableApplications = [];
    row.technologyDisabled = false;
    row.subRows = [];

    if (!row.applicationType) {
      row.mode = 'GENERIC';
      return;
    }

    if (this.isHost(row.applicationType)) {
      row.mode = 'HOST';
      this.initHostMode(row);
    } else if (this.isNetwork(row.applicationType)) {
      row.mode = 'NETWORK';
      this.initNetworkMode(row);
    } else if (this.isSrg(row.applicationType)) {
      row.mode = 'SRG';
      this.initSrgMode(row);
    } else {
      this.initGenericMode(row);
    }
  }

  private initHostMode(row: GroupingRow) {
    row.loadingApps = true;
    this.fetchByApplicationType(row.applicationType, (data) => {
      row.loadingApps = false;
      const apps = data.applications || [];
      const techSet = new Set<string>();
      apps.forEach((app: any) => {
        if (app.applicationTechnology) techSet.add(app.applicationTechnology);
      });
      const techs = Array.from(techSet).sort();
      row.availableTechnologies = techs.length > 0 ? techs : ['LINUX', 'WINDOWS'];
      row.technologyDisabled = false;
      row.availableApplications = [];
      row.selectedApplications = [];
      row.subRows = [];
    });
  }

  onTechnologiesChange(row: GroupingRow) {
    row.selectedApplications = [];
    row.availableApplications = [];

    const techs = row.applicationTechnologies || [];
    if (techs.length === 0) return;

    row.loadingApps = true;
    const tasks = techs.map(tech => new Promise<{ applications: any[]; ipList: any[]; tech: string }>((resolve) => {
      this.fetchByApplicationAndTechnology(row.applicationType, tech, (data) => {
        resolve({ ...data, tech });
      });
    }));

    Promise.all(tasks).then((results) => {
      row.loadingApps = false;
      const merged: AppOption[] = [];
      const seenKeys = new Set<string>();

      if (row.mode === 'HOST') {
        for (const r of results) {
          const apps = r.applications || [];
          const ips = r.ipList || [];
          const appMap = new Map<number, string>();
          apps.forEach((a: any) => appMap.set(a.applicationId, a.applicationName));
          ips.forEach((ip: any) => {
            const appName = appMap.get(ip.applicationId);
            if (!appName || !ip.ipAddress) return;
            const label = `${appName} (${ip.ipAddress})`;
            const key = `${ip.applicationId}-${ip.ipAddressId}`;
            if (seenKeys.has(key)) return;
            seenKeys.add(key);
            merged.push({
              applicationId: ip.applicationId,
              applicationName: label,
              ipAddressId: ip.ipAddressId,
              ipAddress: ip.ipAddress,
              label: label,
              technologyType: r.tech
            });
          });
        }
        row.availableApplications = merged.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
      } else {
        for (const r of results) {
          for (const app of (r.applications || [])) {
            const key = `${app.applicationId}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);
            merged.push({
              applicationId: app.applicationId,
              applicationName: app.applicationName,
              ipAddressId: this.findIpAddressId(row.applicationType, app.applicationId),
              technologyType: r.tech
            });
          }
        }
        row.availableApplications = merged.sort((a, b) => a.applicationName.localeCompare(b.applicationName));
      }
    });
  }

  private initNetworkMode(row: GroupingRow) {
    row.loadingApps = true;
    this.fetchByApplicationType(row.applicationType, (data) => {
      row.loadingApps = false;
      row.availableApplications = (data.applications || []).map((a: any) => ({
        applicationId: a.applicationId,
        applicationName: a.applicationName
      }));
      row.technologyDisabled = true;
      row.subRows = [this.emptySubRow()];
    });
  }

  onNetworkAppChange(row: GroupingRow, sub: SubRow) {
    sub.hostId = null;
    sub.hostName = '';
    sub.hostList = [];

    if (!sub.appId) return;

    const selected = row.availableApplications.find(a => a.applicationId === Number(sub.appId));
    if (selected) sub.appName = selected.applicationName;

    this.applicationService.getAllNetworkHostByApllicationID(this.currentUser, sub.appId as any).subscribe({
      next: (response: any) => {
        const status = (response?.serviceStatus || '').toString().toLowerCase();
        if (status === 'success' && response.serviceResponse) {
          sub.hostList = (response.serviceResponse || []).map((h: any) => ({
            hostId: h.hostId ?? h.id ?? h.ipAddressId,
            hostName: h.hostName ?? h.name ?? h.ipAddress
          }));
        } else {
          sub.hostList = [];
        }
      },
      error: () => { sub.hostList = []; }
    });
  }

  private initSrgMode(row: GroupingRow) {
    row.loadingApps = true;
    this.fetchByApplicationType(row.applicationType, (data) => {
      row.loadingApps = false;
      row.availableApplications = (data.applications || []).map((a: any) => ({
        applicationId: a.applicationId,
        applicationName: a.applicationName
      }));
      row.technologyDisabled = true;
      row.subRows = [this.emptySubRow()];
    });
  }

  onSrgAppChange(row: GroupingRow, sub: SubRow) {
    sub.subFeatureID = null;
    sub.subFeatureName = '';
    sub.subFeatureList = [];

    if (!sub.appId) return;

    const selected = row.availableApplications.find(a => a.applicationId === Number(sub.appId));
    if (selected) sub.appName = selected.applicationName;

    this.applicationService.getFullApplicationData(
      this.currentUser.userId, 'SRG', this.sessionObject, undefined as any, sub.appId as any
    ).subscribe({
      next: (response: any) => {
        if (response?.serviceStatus === ServiceStatus.SUCCESS && response.serviceResponse?.subFeatures) {
          sub.subFeatureList = (response.serviceResponse.subFeatures || []).map((sf: any) => ({
            subFeatureID: sf.subFeatureID ?? sf.id,
            subFeatureName: sf.subFeatureName ?? sf.name
          }));
        } else {
          sub.subFeatureList = [];
        }
      },
      error: () => { sub.subFeatureList = []; }
    });
  }

  private initGenericMode(row: GroupingRow) {
    row.loadingApps = true;
    this.fetchByApplicationType(row.applicationType, (data) => {
      row.loadingApps = false;
      const apps = data.applications || [];
      const techSet = new Set<string>();
      let hasNonNullTech = false;
      apps.forEach((app: any) => {
        if (app.applicationTechnology) {
          techSet.add(app.applicationTechnology);
          hasNonNullTech = true;
        }
      });
      row.availableTechnologies = Array.from(techSet).sort();

      if (!hasNonNullTech) {
        row.mode = 'GENERIC';
        row.technologyDisabled = true;
        row.availableApplications = apps.map((app: any) => ({
          applicationId: app.applicationId,
          applicationName: app.applicationName,
          ipAddressId: this.findIpAddressId(row.applicationType, app.applicationId)
        }));
      } else {
        row.mode = 'TECH_TYPE';
        row.technologyDisabled = false;
        row.availableApplications = [];
      }
    });
  }

  private findIpAddressId(applicationType: string, applicationId: number): number | null {
    const data = this.productDataCache[applicationType];
    if (!data) return null;
    const match = (data.ipList || []).find((ip: any) => ip.applicationId === applicationId);
    return match?.ipAddressId ?? null;
  }

  toggleAppDropdown(event: MouseEvent, row: GroupingRow) {
    event.stopPropagation();
    this.groupingRows.forEach(r => {
      if (r !== row) {
        r.showAppDropdown = false;
        r.showTechDropdown = false;
        r.appSearchText = '';
        r.techSearchText = '';
      }
    });
    row.showTechDropdown = false;
    row.techSearchText = '';
    row.showAppDropdown = !row.showAppDropdown;
    if (!row.showAppDropdown) row.appSearchText = '';
  }

  toggleTechDropdown(event: MouseEvent, row: GroupingRow) {
    event.stopPropagation();
    this.groupingRows.forEach(r => {
      if (r !== row) {
        r.showAppDropdown = false;
        r.showTechDropdown = false;
        r.appSearchText = '';
        r.techSearchText = '';
      }
    });
    row.showAppDropdown = false;
    row.appSearchText = '';
    row.showTechDropdown = !row.showTechDropdown;
    if (!row.showTechDropdown) row.techSearchText = '';
  }

  toggleAppSelection(row: GroupingRow, appName: string) {
    const index = row.selectedApplications.indexOf(appName);
    if (index === -1) row.selectedApplications.push(appName);
    else row.selectedApplications.splice(index, 1);
  }

  toggleTechSelection(row: GroupingRow, tech: string) {
    const index = row.applicationTechnologies.indexOf(tech);
    if (index === -1) row.applicationTechnologies.push(tech);
    else row.applicationTechnologies.splice(index, 1);
    this.onTechnologiesChange(row);
  }

  filteredApplications(row: GroupingRow): AppOption[] {
    const apps = row.availableApplications || [];
    const q = (row.appSearchText || '').trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(a => {
      const display = (a.label || a.applicationName || '').toLowerCase();
      return display.includes(q);
    });
  }

  filteredTechnologies(row: GroupingRow): string[] {
    const techs = row.availableTechnologies || [];
    const q = (row.techSearchText || '').trim().toLowerCase();
    if (!q) return techs;
    return techs.filter(t => t.toLowerCase().includes(q));
  }

  techDisplayLabel(row: GroupingRow): string {
    const techs = row.applicationTechnologies || [];
    if (techs.length === 0) return '';
    if (techs.length === 1) return techs[0];
    return `${techs.length} selected`;
  }

  addSubRow(row: GroupingRow) {
    row.subRows.push(this.emptySubRow());
  }

  removeSubRow(row: GroupingRow, idx: number) {
    if (row.subRows.length > 1) row.subRows.splice(idx, 1);
  }

  getAllInfraGroups() {
    this.controlZoneService.getAllInfraGroups(this.currentUser).subscribe((response: any) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.infraGroupList = response.serviceResponse;
        this.applyFilterAndPagination();
      } else { this.infraGroupList = []; }
    }, () => { this.infraGroupList = []; });
  }

  openInfraTable() { this.isForm = false; this.showInfraTable = true; this.getAllInfraGroups(); }

  openCreateForm() {
    this.showInfraTable = false;
    this.isForm = true;
    this.isUpdation = false;
    this.isCreation = true;
    this.originalZoneSnapshot = null;
    this.infraGroup = new ControlGroup();
    this.groupingRows = [];
    this.addGroupingRow();
  }

  applyFilterAndPagination() {
    let data = [...this.infraGroupList];
    if (this.searchText) {
      const txt = this.searchText.toLowerCase();
      data = data.filter(g =>
        String(g.groupName ?? '').toLowerCase().includes(txt) ||
        String(g.description ?? '').toLowerCase().includes(txt) ||
        String(g.createdBy ?? '').toLowerCase().includes(txt) ||
        String(g.createdOn ?? '').toLowerCase().includes(txt)
      );
    }
    if (this.sortColumn) {
      data.sort((a: any, b: any) => {
        const valA = a[this.sortColumn] ?? '';
        const valB = b[this.sortColumn] ?? '';
        return this.sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    this.filteredInfraGroups = data;
    this.totalPages = Math.ceil(data.length / this.pageSize);
    const start = (this.page - 1) * this.pageSize;
    this.pagedInfraGroups = data.slice(start, start + this.pageSize);
  }

  sortBy(column: string) {
    if (this.sortColumn === column) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = column; this.sortDirection = 'asc'; }
    this.applyFilterAndPagination();
  }

  nextPage() { if (this.page < this.totalPages) { this.page++; this.applyFilterAndPagination(); } }
  prevPage() { if (this.page > 1) { this.page--; this.applyFilterAndPagination(); } }

  resetForm() {
    if (this.isUpdation && this.originalZoneSnapshot) {
      this.infraGroup.description = this.originalZoneSnapshot.description;
      this.infraGroup.mappings = JSON.parse(JSON.stringify(this.originalZoneSnapshot.mappings));
      this.groupingRows = [];
      this.rebuildGroupingRowsFromMappings(this.infraGroup.mappings as any[]);
      return;
    }

    this.infraGroup = new ControlGroup();
    this.groupingRows = [];
    this.addGroupingRow();
    this.isUpdation = false;
    this.isCreation = true;
  }

  private buildMappings(): ControlGroupMapping[] | null {
    if (this.groupingRows.length === 0) {
      this.showErrorBanner('Please add at least one grouping component');
      return null;
    }

    const mappings: ControlGroupMapping[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < this.groupingRows.length; i++) {
      const row = this.groupingRows[i];

      if (!row.applicationType) {
        this.showErrorBanner(`Please select Component Type for row ${i + 1}`);
        return null;
      }

      if (row.mode === 'HOST') {
        if (row.applicationTechnologies.length === 0) {
          this.showErrorBanner(`Please select OS Type for row ${i + 1}`);
          return null;
        }
        if (row.selectedApplications.length === 0) {
          this.showErrorBanner(`Please select at least one application for row ${i + 1}`);
          return null;
        }
        for (const label of row.selectedApplications) {
          const opt = row.availableApplications.find(o => o.label === label || o.applicationName === label);
          if (!opt) continue;
          const key = `H-${opt.applicationId}-${opt.ipAddressId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          mappings.push({
            appId: opt.applicationId,
            networkId: null,
            ipAddId: opt.ipAddressId ?? null,
          });
        }
      } else if (row.mode === 'NETWORK') {
        if (row.subRows.length === 0) {
          this.showErrorBanner(`Please add at least one application for row ${i + 1}`);
          return null;
        }
        for (const sub of row.subRows) {
          if (!sub.appId || !sub.hostId) {
            this.showErrorBanner(`Please complete Application and Host for all entries in row ${i + 1}`);
            return null;
          }
          const key = `N-${sub.appId}-${sub.hostId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          mappings.push({ appId: sub.appId, networkId: null, ipAddId: sub.hostId });
        }
      } else if (row.mode === 'SRG') {
        if (row.subRows.length === 0) {
          this.showErrorBanner(`Please add at least one application for row ${i + 1}`);
          return null;
        }
        for (const sub of row.subRows) {
          if (!sub.appId || !sub.subFeatureID) {
            this.showErrorBanner(`Please complete Application and Sub Feature for all entries in row ${i + 1}`);
            return null;
          }
          const key = `S-${sub.appId}-${sub.subFeatureID}`;
          if (seen.has(key)) continue;
          seen.add(key);
          mappings.push({ appId: sub.appId, networkId: sub.subFeatureID, ipAddId: null });
        }
      } else {
        if (row.mode === 'TECH_TYPE' && row.applicationTechnologies.length === 0) {
          this.showErrorBanner(`Please select Technology Type for row ${i + 1}`);
          return null;
        }
        if (row.selectedApplications.length === 0) {
          this.showErrorBanner(`Please select at least one application for row ${i + 1}`);
          return null;
        }
        for (const name of row.selectedApplications) {
          const opt = row.availableApplications.find(a => a.applicationName === name);
          if (!opt) continue;
          const key = `G-${opt.applicationId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          mappings.push({
            appId: opt.applicationId,
            networkId: null,
            ipAddId: opt.ipAddressId ?? null,
          });
        }
      }
    }

    if (mappings.length === 0) {
      this.showErrorBanner('No valid applications selected');
      return null;
    }
    return mappings;
  }

  createHostGroup() {
    this.infraGroup.sessionDTO = this.sessionObject;
    this.infraGroup.createdBy = this.currentUser.userId;

    if (!this.infraGroup.groupName || this.infraGroup.groupName.trim() === '') {
      this.showErrorBanner('Kindly provide Group name'); return;
    }

    const mappings = this.buildMappings();
    if (!mappings) return;
    this.infraGroup.mappings = mappings;

    const safePayload = this.sanitizationService.sanitizePayload(this.infraGroup);

    this.controlZoneService.createHostGroup(safePayload).subscribe({
      next: (response: any) => {
        if (response.serviceStatus === ServiceStatus.SUCCESS) {
          this.showSuccessBanner('Control Zone created successfully');
          this.resetForm();
          this.getAllInfraGroups();
        } else {
          this.showErrorBanner(response.serviceResponse || 'Creation failed');
        }
      },
      error: () => { this.showErrorBanner('Something went wrong'); }
    });
  }

  openUpdateGroup(group: ControlGroup) {
    this.isForm = true;
    this.showInfraTable = false;
    this.isUpdation = true;
    this.isCreation = false;

    this.infraGroup = new ControlGroup();
    this.infraGroup.id = group.id;
    this.infraGroup.groupName = group.groupName;
    this.infraGroup.description = group.description;
    this.infraGroup.sessionDTO = this.sessionObject;
    this.infraGroup.createdBy = this.currentUser.userId;
    this.groupingRows = [];
    this.originalZoneSnapshot = null;

    this.controlZoneService.getControlZoneById(group.id, this.currentUser).subscribe({
      next: (response: any) => {
        if (response.serviceStatus === ServiceStatus.SUCCESS && response.serviceResponse) {
          const full: ControlGroup = response.serviceResponse;
          this.infraGroup.description = full.description;
          this.infraGroup.mappings = full.mappings || [];

          this.originalZoneSnapshot = {
            description: full.description,
            mappings: JSON.parse(JSON.stringify(full.mappings || []))
          };

          this.rebuildGroupingRowsFromMappings(full.mappings as any[] || []);
        } else {
          this.showErrorBanner(response.serviceResponse || 'Could not load Control Zone');
          this.addGroupingRow();
        }
      },
      error: () => {
        this.showErrorBanner('Could not load Control Zone details');
        this.addGroupingRow();
      }
    });
  }

  private rebuildGroupingRowsFromMappings(mappings: any[]) {
    if (!mappings || mappings.length === 0) {
      this.addGroupingRow();
      return;
    }

    const grouped = new Map<string, { applicationType: string; technologies: Set<string>; items: any[]; seenAppIds: Set<number> }>();
    for (const m of mappings) {
      const appType = (m.applicationType || '').trim();
      const techType = (m.technologyType || '').trim();
      const key = appType.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, { applicationType: appType, technologies: new Set<string>(), items: [], seenAppIds: new Set<number>() });
      }
      const bucket = grouped.get(key)!;
      if (techType) bucket.technologies.add(techType);
      if (m.appId != null && bucket.seenAppIds.has(m.appId)) continue;
      if (m.appId != null) bucket.seenAppIds.add(m.appId);
      bucket.items.push(m);
    }

    for (const grp of grouped.values()) {
      this.buildRowFromGroup(grp.applicationType, Array.from(grp.technologies), grp.items);
    }

    if (this.groupingRows.length === 0) {
      this.addGroupingRow();
    }
  }

  private buildRowFromGroup(applicationType: string, technologies: string[], items: any[]) {
    const resolvedType = this.resolveApplicationType(applicationType);

    const row = this.emptyRow();
    row.applicationType = resolvedType;
    this.groupingRows.push(row);

    if (this.isHost(resolvedType)) {
      row.mode = 'HOST';
      this.hydrateHostRow(row, technologies, items);
    } else if (this.isNetwork(resolvedType)) {
      row.mode = 'NETWORK';
      this.hydrateNetworkRow(row, items);
    } else if (this.isSrg(resolvedType)) {
      row.mode = 'SRG';
      this.hydrateSrgRow(row, items);
    } else {
      row.applicationTechnologies = technologies;
      this.hydrateGenericRow(row, technologies, items);
    }
  }

  private resolveApplicationType(savedType: string): string {
    if (!savedType) return '';
    const target = savedType.trim().toLowerCase();
    const match = this.availableApplicationTypes.find(t => t.trim().toLowerCase() === target);
    if (match) return match;
    this.availableApplicationTypes = [...this.availableApplicationTypes, savedType].sort();
    return savedType;
  }

  private hydrateHostRow(row: GroupingRow, technologies: string[], items: any[]) {
    row.loadingApps = true;
    this.fetchByApplicationType(row.applicationType, (data) => {
      const techSet = new Set<string>();
      (data.applications || []).forEach((app: any) => {
        if (app.applicationTechnology) techSet.add(app.applicationTechnology);
      });
      const techs = Array.from(techSet).sort();
      row.availableTechnologies = techs.length > 0 ? techs : ['LINUX', 'WINDOWS'];
      row.applicationTechnologies = technologies;

      const tasks = technologies.map(tech => new Promise<{ applications: any[]; ipList: any[]; tech: string }>((resolve) => {
        this.fetchByApplicationAndTechnology(row.applicationType, tech, (techData) => {
          resolve({ ...techData, tech });
        });
      }));

      Promise.all(tasks).then((results) => {
        row.loadingApps = false;
        const merged: AppOption[] = [];
        const seenKeys = new Set<string>();
        for (const r of results) {
          const apps = r.applications || [];
          const ips = r.ipList || [];
          const appMap = new Map<number, string>();
          apps.forEach((a: any) => appMap.set(a.applicationId, a.applicationName));
          ips.forEach((ip: any) => {
            const appName = appMap.get(ip.applicationId);
            if (!appName || !ip.ipAddress) return;
            const label = `${appName} (${ip.ipAddress})`;
            const key = `${ip.applicationId}-${ip.ipAddressId}`;
            if (seenKeys.has(key)) return;
            seenKeys.add(key);
            merged.push({
              applicationId: ip.applicationId,
              applicationName: label,
              ipAddressId: ip.ipAddressId,
              ipAddress: ip.ipAddress,
              label: label,
              technologyType: r.tech
            });
          });
        }
        row.availableApplications = merged.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

        const savedLabels = new Set(
          items.map(it => it.ipAddress ? `${it.applicationName} (${it.ipAddress})` : it.applicationName)
        );
        row.selectedApplications = merged
          .filter(o => savedLabels.has(o.label!))
          .map(o => o.label!);
      });
    });
  }

  private hydrateGenericRow(row: GroupingRow, technologies: string[], items: any[]) {
    row.loadingApps = true;
    this.fetchByApplicationType(row.applicationType, (data) => {
      const apps = data.applications || [];
      const techSet = new Set<string>();
      let hasNonNullTech = false;
      apps.forEach((app: any) => {
        if (app.applicationTechnology) {
          techSet.add(app.applicationTechnology);
          hasNonNullTech = true;
        }
      });
      row.availableTechnologies = Array.from(techSet).sort();

      if (!hasNonNullTech) {
        row.mode = 'GENERIC';
        row.technologyDisabled = true;
        row.availableApplications = apps.map((app: any) => ({
          applicationId: app.applicationId,
          applicationName: app.applicationName,
          ipAddressId: this.findIpAddressId(row.applicationType, app.applicationId)
        }));
        const savedNames = new Set(items.map(it => it.applicationName));
        row.selectedApplications = row.availableApplications
          .filter(a => savedNames.has(a.applicationName))
          .map(a => a.applicationName);
        row.loadingApps = false;
      } else {
        row.mode = 'TECH_TYPE';
        row.applicationTechnologies = technologies;

        const tasks = technologies.map(tech => new Promise<{ applications: any[]; ipList: any[]; tech: string }>((resolve) => {
          this.fetchByApplicationAndTechnology(row.applicationType, tech, (techData) => {
            resolve({ ...techData, tech });
          });
        }));

        Promise.all(tasks).then((results) => {
          row.loadingApps = false;
          const merged: AppOption[] = [];
          const seenKeys = new Set<string>();
          for (const r of results) {
            for (const app of (r.applications || [])) {
              const key = `${app.applicationId}`;
              if (seenKeys.has(key)) continue;
              seenKeys.add(key);
              merged.push({
                applicationId: app.applicationId,
                applicationName: app.applicationName,
                ipAddressId: this.findIpAddressId(row.applicationType, app.applicationId),
                technologyType: r.tech
              });
            }
          }
          row.availableApplications = merged.sort((a, b) => a.applicationName.localeCompare(b.applicationName));
          const savedNames = new Set(items.map(it => it.applicationName));
          row.selectedApplications = merged
            .filter(a => savedNames.has(a.applicationName))
            .map(a => a.applicationName);
        });
      }
    });
  }

  private hydrateNetworkRow(row: GroupingRow, items: any[]) {
    row.loadingApps = true;
    this.fetchByApplicationType(row.applicationType, (data) => {
      row.loadingApps = false;
      row.availableApplications = (data.applications || []).map((a: any) => ({
        applicationId: a.applicationId,
        applicationName: a.applicationName
      }));
      row.technologyDisabled = true;

      row.subRows = items.map(it => {
        const sub = this.emptySubRow();
        sub.appId = it.appId;
        sub.appName = it.applicationName;
        sub.hostId = it.ipAddId;
        sub.hostName = it.ipAddress || '';
        if (sub.appId) {
          this.applicationService.getAllNetworkHostByApllicationID(this.currentUser, sub.appId as any).subscribe({
            next: (resp: any) => {
              const status = (resp?.serviceStatus || '').toString().toLowerCase();
              if (status === 'success' && resp.serviceResponse) {
                sub.hostList = (resp.serviceResponse || []).map((h: any) => ({
                  hostId: h.hostId ?? h.id ?? h.ipAddressId,
                  hostName: h.hostName ?? h.name ?? h.ipAddress
                }));
              }
            }
          });
        }
        return sub;
      });

      if (row.subRows.length === 0) row.subRows = [this.emptySubRow()];
    });
  }

  private hydrateSrgRow(row: GroupingRow, items: any[]) {
    row.loadingApps = true;
    this.fetchByApplicationType(row.applicationType, (data) => {
      row.loadingApps = false;
      row.availableApplications = (data.applications || []).map((a: any) => ({
        applicationId: a.applicationId,
        applicationName: a.applicationName
      }));
      row.technologyDisabled = true;

      row.subRows = items.map(it => {
        const sub = this.emptySubRow();
        sub.appId = it.appId;
        sub.appName = it.applicationName;
        sub.subFeatureID = it.networkId;
        if (sub.appId) {
          this.applicationService.getFullApplicationData(
            this.currentUser.userId, 'SRG', this.sessionObject, undefined as any, sub.appId as any
          ).subscribe({
            next: (resp: any) => {
              if (resp?.serviceStatus === ServiceStatus.SUCCESS && resp.serviceResponse?.subFeatures) {
                sub.subFeatureList = (resp.serviceResponse.subFeatures || []).map((sf: any) => ({
                  subFeatureID: sf.subFeatureID ?? sf.id,
                  subFeatureName: sf.subFeatureName ?? sf.name
                }));
              }
            }
          });
        }
        return sub;
      });

      if (row.subRows.length === 0) row.subRows = [this.emptySubRow()];
    });
  }

  updateHostGroup() {
    if (!this.infraGroup.groupName || this.infraGroup.groupName.trim() === '') {
      this.showErrorBanner('Kindly provide Group name'); return;
    }

    const mappings = this.buildMappings();
    if (!mappings) return;

    this.infraGroup.mappings = mappings;
    this.infraGroup.sessionDTO = this.sessionObject;
    this.infraGroup.createdBy = this.currentUser.userId;

    const safePayload = this.sanitizationService.sanitizePayload(this.infraGroup);

    this.controlZoneService.updateHostGroup(safePayload).subscribe({
      next: (response: any) => {
        if (response.serviceStatus === ServiceStatus.SUCCESS) {
          this.showUpdateBanner('Control Zone updated successfully');
          this.resetForm();
          this.isForm = false;
          this.showInfraTable = true;
          this.getAllInfraGroups();
        } else {
          this.showErrorBanner(response.serviceResponse || 'Update failed');
        }
      },
      error: () => { this.showErrorBanner('Something went wrong'); }
    });
  }

  openDeleteConfirm(group: ControlGroup) {
    this.selectedInfraGroup = group;
    Swal.fire({
      title: 'Are you sure?', text: "You won't be able to revert this!", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => { if (result.isConfirmed) this.deleteInfraGroup(); });
  }

  deleteInfraGroup() {
    if (!this.selectedInfraGroup) return;
    this.isDeleting = true;
    this.selectedInfraGroup.sessionDTO = this.sessionObject;
    this.selectedInfraGroup.createdBy = this.currentUser.userId;
    this.controlZoneService.deleteHostGroup(this.selectedInfraGroup).subscribe({
      next: (response: any) => {
        this.isDeleting = false;
        if (response.serviceStatus === ServiceStatus.SUCCESS) {
          this.showDeleteBanner('Control Zone deleted successfully');
          this.getAllInfraGroups();
        } else {
          this.showErrorBanner(response.serviceResponse || 'Delete failed');
        }
      },
      error: () => { this.isDeleting = false; this.showErrorBanner('Something went wrong'); }
    });
  }

  closeDeleteModal() { this.modalService.dismissAll(); }

  toggleZone(zoneId: number) {
    this.expandedZones[zoneId] = !this.expandedZones[zoneId];
  }

  isZoneExpanded(zoneId: number): boolean {
    return !!this.expandedZones[zoneId];
  }

  getGroupedMappings(zone: ControlGroup): Array<{ applicationType: string; technologies: Array<{ technologyType: string; mappings: any[] }> }> {
    if (!zone || !zone.mappings || zone.mappings.length === 0) return [];

    const byType = new Map<string, { applicationType: string; techMap: Map<string, { technologyType: string; mappings: any[]; seen: Set<number> }> }>();

    for (const m of zone.mappings as any[]) {
      const appType = (m.applicationType || 'Other').trim();
      const techType = (m.technologyType || '-').trim();
      const typeKey = appType.toLowerCase();
      const techKey = techType.toLowerCase();

      if (!byType.has(typeKey)) {
        byType.set(typeKey, { applicationType: appType, techMap: new Map() });
      }
      const bucket = byType.get(typeKey)!;
      if (!bucket.techMap.has(techKey)) {
        bucket.techMap.set(techKey, { technologyType: techType, mappings: [], seen: new Set<number>() });
      }
      const techBucket = bucket.techMap.get(techKey)!;
      if (m.appId != null && techBucket.seen.has(m.appId)) continue;
      if (m.appId != null) techBucket.seen.add(m.appId);
      techBucket.mappings.push(m);
    }

    const result: Array<{ applicationType: string; technologies: Array<{ technologyType: string; mappings: any[] }> }> = [];
    for (const v of byType.values()) {
      const techs = Array.from(v.techMap.values())
        .map(t => ({ technologyType: t.technologyType, mappings: t.mappings }))
        .sort((a, b) => a.technologyType.localeCompare(b.technologyType));
      result.push({ applicationType: v.applicationType, technologies: techs });
    }
    return result.sort((a, b) => a.applicationType.localeCompare(b.applicationType));
  }

  formatMappingDisplay(m: any): string {
    const name = m?.applicationName || '—';
    return m?.ipAddress ? `${name} (${m.ipAddress})` : name;
  }

  getAppTypeBadgeStyle(appType: string): { background: string } {
    const palette = [
      '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899',
      '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
      '#84cc16', '#ef4444', '#3b82f6', '#d946ef',
    ];
    const key = (appType || 'default').toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return { background: palette[hash % palette.length] };
  }

  countTotalMappings(grp: { technologies: Array<{ mappings: any[] }> }): number {
    return grp.technologies.reduce((sum, t) => sum + (t.mappings?.length || 0), 0);
  }

  @HostListener('document:click')
  closeDropdown() {
    this.groupingRows.forEach(r => {
      r.showAppDropdown = false;
      r.showTechDropdown = false;
      r.appSearchText = '';
      r.techSearchText = '';
    });
  }
}