import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../../../../services/application.service';
import { ApiUserService } from '../../../../../services/api-user.service';

import { AuthenticationService } from '../../../../../services/authentication.service';
import { RoleService } from '../../../../../services/role.service';
import { DecoderService } from '../../../../../services/decoder.service';
import { SanitizationService } from '../../../../../services/sanitization.service';
import { SanitizeInputDirective } from '../../../../../utility/sanitize-input.directive';


@Component({
  selector: 'app-role-management',
  imports: [CommonModule, FormsModule,SanitizeInputDirective],
  templateUrl: './role-management.component.html',
  styleUrl: './role-management.component.css'
})
export class RoleManagementComponent implements OnInit {

  Math = Math;
  p: number = 1;
  itemsPerPage: number = 10;
  paginatedRoles: any[] = [];
  roles: any[] = [];
  filteredRoles: any[] = [];
  softwareMeteringZones: any[] = [];
  searchText: string = '';
  sortparam: string = '';
  sortDirection: string = 'asc';
  currentUser: any;
  userId: string = '';
  currentTool: string = '';
  modalSearchText: string = '';
  filteredProductsData: any[] = [];
  canCreate: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;


  constructor(
    private router: Router,
    private applicationService: ApplicationService,
    private authService: AuthenticationService,
    private roleService: RoleService,
    private apiUserService: ApiUserService,
    private decoderService: DecoderService,
    private sanitizationService: SanitizationService
  ) {
    console.log('RoleManagementComponent loaded');
  }

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue || this.apiUserService.getCurrentUser();
    this.userId = this.currentUser?.userId || this.authService.getUserName() || '';
    this.currentTool = sessionStorage.getItem('tool') ?? '';

    // ---- CRUD PERMISSIONS ----
    const roleMapping = (this.currentUser as any)?.['crudData']?.['Admin-Config']?.['role'];
    if (roleMapping) {
      this.canCreate = this.decoderService.decryptJson(roleMapping.create) === 'true';
      this.canEdit = this.decoderService.decryptJson(roleMapping.edit) === 'true';
      this.canDelete = this.decoderService.decryptJson(roleMapping.delete) === 'true';
    }

    // ---- DEBUG LOG ----
    // console.log('[RoleManagement] User:', this.userId, '|', this.currentUser?.userType);
    // console.log('[RoleManagement] Permissions → Create:', this.canCreate, '| Edit:', this.canEdit, '| Delete:', this.canDelete);

    this.fetchRoles();
    this.fetchSoftwareMeteringZones();
  }

  fetchRoles() {
    const sessionDTO = {
      ...this.currentUser?.sessionDTO,
      featureName: "Configuration",
      menu: "Admin Config",
      configTab: "Role",
      requestURI: "/admin-config/role",
      userId: this.userId,
    };

    const tool = sessionStorage.getItem('tool') ?? '';
    const payload = {
      sessionDTO: sessionDTO,
      tool: tool
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    this.applicationService.getAllCustomRoles(safePayload).subscribe({
      next: (response: any) => {
        if (response && response.serviceStatus === 'Success') {
          this.roles = response.serviceResponse;
          this.search(); // Initialize filteredRoles
        } else {
          console.warn('API returned non-success:', response);
          this.roles = [];
          this.search();
        }
      },
      error: (error: any) => {
        console.error('Error fetching roles:', error);
        this.roles = [];
        this.search();
      }
    });
  }

  search() {
    this.p = 1;
    if (!this.searchText) {
      this.filteredRoles = [...this.roles];
    } else {
      const lower = this.searchText.toLowerCase();
      this.filteredRoles = this.roles.filter((r: any) =>
        (r.roleName && r.roleName.toLowerCase().includes(lower)) ||
        (r.description && r.description.toLowerCase().includes(lower)) ||
        (r.createdBy && r.createdBy.toLowerCase().includes(lower)) ||
        (r.createdOn && r.createdOn.toLowerCase().includes(lower)) ||
        (r.updatedBy && r.updatedBy.toLowerCase().includes(lower)) ||
        (r.updatedOn && r.updatedOn.toLowerCase().includes(lower))
      );
    }
    this.updatePaginatedRoles();
  }

  sortBy(value: string) {
    if (this.sortparam === value) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortDirection = 'asc';
      this.sortparam = value;
    }

    this.filteredRoles.sort((a: any, b: any) => {
      let valA = a[value];
      let valB = b[value];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      } else if (valA > valB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });

    this.updatePaginatedRoles();
  }

  navigateToCreate() {
    this.router.navigate(['/admin-config/role']);
  }

  /* Pagination Logic */
  get totalPages(): number {
    return Math.ceil((this.filteredRoles.length || 0) / Number(this.itemsPerPage));
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.p;

    if (total <= 5) {
      return Array(total).fill(0).map((x, i) => i + 1);
    }

    let start = Math.max(current - 2, 1);
    let end = Math.min(start + 4, total);

    if (end === total) {
      start = Math.max(end - 4, 1);
    }

    return Array.from({ length: (end - start + 1) }, (_, i) => start + i);
  }

  onPageSizeChange(value: any) {
    const newValue = parseInt(value, 10);
    if (!isNaN(newValue) && newValue > 0) {
      this.itemsPerPage = newValue;
      this.p = 1; // Reset to first page
      this.updatePaginatedRoles();
    }
  }

  updatePaginatedRoles() {
    const startIndex = (this.p - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRoles = this.filteredRoles.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.p < this.totalPages) {
      this.p++;
      this.updatePaginatedRoles();
    }
  }

  prevPage() {
    if (this.p > 1) {
      this.p--;
      this.updatePaginatedRoles();
    }
  }

  /* Modal Logic */
  selectedRole: any = null;
  isModalOpen: boolean = false;

  productsData: any[] = [];
  hostNameMap: { [key: number]: any[] } = {};

  resolveHostNames(components: any[]) {
    const networkAppIds = [...new Set(components
      .filter(p => p.category?.toUpperCase() === 'NETWORK' && p.appId)
      .map(p => p.appId))];

    const sessionDTO = {
      featureName: "Configuration",
      userId: this.userId,
      requestURI: "/admin-config/role"
    };

    networkAppIds.forEach(appId => {
      if (!this.hostNameMap[appId]) {
        // Construct valid PortalUserDTO with sessionDTO
        const payload = {
          ...this.currentUser,
          sessionDTO: sessionDTO
        };

        const safePayload = this.sanitizationService.sanitizePayload(payload);
        this.applicationService.getAllNetworkHostByApllicationID(safePayload, appId).subscribe({
          next: (response: any) => {
            if (response && response.serviceStatus?.toLowerCase() === 'success') {
              this.hostNameMap[appId] = response.serviceResponse || [];
              // Trigger change detection by creating a new reference
              this.hostNameMap = { ...this.hostNameMap };
            }
          },
          error: (err) => console.error(`Error fetching hosts for appId ${appId}:`, err)
        });
      }
    });
  }

  getResolvedHostName(appId: any, hostId: any): string {
    if (!appId || !hostId) return hostId || '-';
    const hosts = this.hostNameMap[appId];
    if (hosts) {
      const sHostId = String(hostId).trim();
      const match = hosts.find((h: any) => String(h.hostId).trim() === sHostId);
      return match ? (match.name || match.host || hostId) : hostId;
    }
    return hostId;
  }

  openProductsModal(role: any) {
    this.selectedRole = role;

    if (this.softwareMeteringZones.length === 0) {
      this.fetchSoftwareMeteringZones();
    }

    let allProducts: any[] = [];
    const seenEntries = new Set<string>();
    const specificAppIds = new Set<number>();

    const isVal = (v: any) => v && v !== '-' && v !== 'null';

    const addEntry = (p: any, type: string) => {
      // Basic validation: must have some identifying data
      const hasData = isVal(p.applicationName) || isVal(p.hostName) || isVal(p.ipaddress) ||
        isVal(p.ipRange) || isVal(p.subFeatureName) || isVal(p.zoneId) || isVal(p.teamId);

      if (!hasData) return;

      // Create a unique key to prevent exact row duplication
      const key = `${p.appId || ''}-${p.hostName || ''}-${p.subFeatureName || ''}-${p.ipaddress || p.ipRange || ''}-${p.zoneId || ''}-${p.teamId || ''}-${type}`;
      if (seenEntries.has(key)) return;
      seenEntries.add(key);

      if (p.appId) specificAppIds.add(Number(p.appId));

      const ip = p.ipaddress || p.ipRange || p.ipAddress || '-';

      allProducts.push({
        ...p,
        displayName: isVal(p.applicationName) ? p.applicationName : (isVal(p.hostName) ? p.hostName : (type === 'SOFTWARE METERING' ? 'Software Metering' : '-')),
        category: p.applicationType || type,
        subFeature: p.subFeatureName || '-',
        hostName: p.hostName || '-',
        ipAddress: ip,
        zoneId: p.zoneId || '-',
        teamId: p.teamId || '-'
      });
    };

    // Process specific lists first to mark their appIds
    if (role.host && role.host.length > 0) {
      role.host.forEach((p: any) => addEntry(p, 'HOST'));
    }

    if (role.network && role.network.length > 0) {
      role.network.forEach((p: any) => addEntry(p, 'NETWORK'));
    }

    if (role.srg && role.srg.length > 0) {
      role.srg.forEach((p: any) => addEntry(p, 'SRG'));
    }

    if (role.softwareMeteringList && role.softwareMeteringList.length > 0) {
      role.softwareMeteringList.forEach((p: any) => {
        if (p.zoneId || p.teamId) {
          addEntry(p, 'SOFTWARE METERING');
        }
      });
    }

    // 5. Applications (Generic) - Only add if NOT already captured by specific lists or if it's a different type
    if (role.applications && role.applications.length > 0) {
      role.applications.forEach((p: any) => {
        const type = (p.applicationType || '').toUpperCase();
        const isSpecificType = ['HOST', 'NETWORK', 'SRG', 'SOFTWARE METERING'].includes(type);

        // Skip if this appId was already added via a specific rule, 
        // OR if its applicationType matches a specific list type
        if (!isSpecificType && !specificAppIds.has(Number(p.appId))) {
          addEntry(p, type || 'APPLICATION');
        }
      });
    }

    // Resolve host names for Network components
    this.resolveHostNames(allProducts);

    this.productsData = allProducts;
    this.filteredProductsData = [...this.productsData];
    this.modalSearchText = '';
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  getPlatformClass(type: string): string {
    if (!type) return 'badge-gray';
    const t = type.toUpperCase();
    if (t.includes('LINUX')) return 'badge-orange';
    if (t.includes('WINDOWS')) return 'badge-blue';
    if (t.includes('CONTAINER')) return 'badge-purple';
    return 'badge-gray';
  }

  closeProductsModal() {
    this.isModalOpen = false;
    this.selectedRole = null;
    this.modalSearchText = '';
    this.filteredProductsData = [];
    document.body.style.overflow = 'auto'; // Restore scrolling
  }

  searchModalProducts() {
    if (!this.modalSearchText) {
      this.filteredProductsData = [...this.productsData];
      return;
    }

    const lower = this.modalSearchText.toLowerCase();
    this.filteredProductsData = this.productsData.filter((p: any) => {
      const appId = p.appId;
      const hostName = this.getResolvedHostName(appId, p.hostName);
      const zoneName = this.getZoneName(p.zoneId);
      const teamName = this.getTeamName(p.zoneId, p.teamId);

      const searchFields = [
        p.displayName,
        hostName,
        p.subFeature,
        p.technologyType,
        p.techType,
        p.ipAddress,
        p.ipRange,
        p.category,
        zoneName,
        teamName
      ].filter(f => !!f).map(f => String(f).toLowerCase());

      return searchFields.some(f => f.includes(lower));
    });
  }

  fetchSoftwareMeteringZones() {
    const payload = {
      ...this.currentUser,
      sessionDTO: this.currentUser?.sessionDTO || {}
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    this.applicationService.getSoftwareMeteringZoneAndTeamList(safePayload as any).subscribe({
      next: (response: any) => {
        console.log('Software Metering API Response:', response);
        if (response && response.serviceStatus === 'Success') {
          this.softwareMeteringZones = response.serviceResponse;
          console.log('Loaded Software Metering Zones:', this.softwareMeteringZones);
        }
      },
      error: (err) => console.error('Error fetching Software Metering zones:', err)
    });
  }

  getZoneName(zoneId: any): string {
    if (!zoneId || zoneId === '-') return '-';
    const zone = this.softwareMeteringZones.find(z => String(z.id) === String(zoneId));
    return zone ? zone.name : zoneId;
  }

  getTeamName(zoneId: any, teamId: any): string {
    if (!teamId || teamId === '-') return '-';
    const zone = this.softwareMeteringZones.find(z => String(z.id) === String(zoneId));
    if (zone && zone.groups) {
      const group = zone.groups.find((g: any) => String(g.id) === String(teamId));
      return group ? group.name : teamId;
    }
    return teamId;
  }

  /* Feature List Modal Logic */
  isFeaturesModalOpen: boolean = false;
  selectedFeatureRole: any = null;

  getFeatureIcon(featureName: string): string {
    const iconMap: { [key: string]: string } = {
      'Alert': 'ri-notification-3-line',
      'Alerts': 'ri-notification-3-line',
      'Admin-Config': 'ri-settings-3-line',
      'Admin Config': 'ri-settings-3-line',
      'Cron Jobs': 'ri-time-line',
      'Service': 'ri-speed-up-line',
      'SRG': 'ri-dashboard-line',
      'Host': 'ri-computer-line',
      'Container': 'ri-box-3-line',
      'API Monitoring': 'ri-links-line',
      'Network': 'ri-global-line',
      'Report': 'ri-file-chart-line',
      'Reports': 'ri-file-chart-line',
      'HTML Report': 'ri-file-chart-line',
      'Setting': 'ri-settings-line',
      'Settings': 'ri-settings-line',
      'Metric Configuration': 'ri-dashboard-3-line',
      'Configuration': 'ri-dashboard-3-line',
      'Overview': 'ri-eye-line',
      'Feature Overview': 'ri-eye-line',
      'Dashboard': 'ri-dashboard-line',
      'Software Metering': 'ri-pie-chart-line',
      'Capacity Planner': 'ri-bar-chart-box-line',
      'API Gateway': 'ri-exchange-box-line',
      'Browser Monitoring': 'ri-macbook-line',
      'Database': 'ri-database-2-line',
      'Kafka': 'ri-route-line',
      'Redis': 'ri-database-line',
      'Nginx': 'ri-server-line',
      'ActiveMQ': 'ri-mail-send-line'
    };
    return iconMap[featureName] || 'ri-checkbox-circle-line';
  }

  featuresList: any[] = [];

  openFeaturesModal(role: any) {
    console.log('Opening Features Modal for role:', role);
    this.selectedFeatureRole = role;

    // Use selectedFeatures or fall back to mapping features array if available
    let featureNames: string[] = role.selectedFeatures || [];
    if (featureNames.length === 0 && role.features?.length > 0) {
      featureNames = role.features.map((f: any) => f.subFeatureName);
    }

    // Unconditionally remove all duplicates from the array
    featureNames = [...new Set(featureNames)];

    this.featuresList = featureNames.map((fName: string) => {
      return { name: fName, icon: this.getFeatureIcon(fName) };
    });

    this.isFeaturesModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeFeaturesModal() {
    this.isFeaturesModalOpen = false;
    this.selectedFeatureRole = null;
    document.body.style.overflow = 'auto';
  }

  goToPage(page: number) {
    this.p = page;
    this.updatePaginatedRoles();
  }

  editRole(role: any) {
    this.router.navigate(['/admin-config/role/role-management/role-updation', role.id]);
  }

  deleteRole(role: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete role "${role.roleName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const currentUserName = this.authService.currentUserValue?.userId || this.authService.getUserName() || 'unknown';
        const payload = {
          id: role.id,
          sessionDTO: {
            ...this.authService.currentUserValue?.sessionDTO,
            featureName: "Configuration",
            menu: "Admin Config",
            configTab: "Role",
            requestURI: "/admin-config/role",
            userId: currentUserName,
          }
        };

        this.roleService.deleteRoleById(role.id).subscribe({
          next: (response: any) => {
            if (response && response.serviceStatus === 'Success') {
              Swal.fire(
                'Deleted!',
                'Role has been deleted.',
                'success'
              );
              this.fetchRoles();
            } else {
              Swal.fire(
                'Error!',
                'Error deleting role: ' + (response.serviceError || 'Unknown error'),
                'error'
              );
            }
          },
          error: (error: any) => {
            console.error('Error deleting role:', error);
            Swal.fire(
              'Failed!',
              'Failed to delete role.',
              'error'
            );
          }
        });
      }
    });
  }
}
