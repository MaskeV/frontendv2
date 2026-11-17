import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { Product, FeatureComponent } from '../../../../models/Role';
import { ApplicationService } from '../../../../services/application.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { FeatureService } from '../../../../services/feature-services.service';
import { RoleService } from '../../../../services/role.service';
import Swal from 'sweetalert2';
import { DecoderService } from '../../../../services/decoder.service';
import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../services/sanitization.service';


@Component({
  selector: 'app-role',
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    SanitizeInputDirective
  ],
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.css']
})
export class RoleComponent implements OnInit {
  roleName = '';
  // ... (rest of the properties remain the same until saveRole)
  description = '';

  // Product Selector Logic
  selectedProducts: Product[] = [];
  selectedFeatures: string[] = [];
  availableProducts: Product[] = [];
  availableFeatures: string[] = [];

  // Panel Logic
  complexPanels: Product[] = ['HOST', 'DATABASE', 'Software Metering']; // Optional: keeps complex panels at end
  complexProducts = ['SRG', 'NETWORK', 'Network', 'HOST', 'Host', 'DATABASE', 'Database', 'Software Metering'];
  panelCollapsedState: { [key: string]: boolean } = {};

  // SRG Logic
  srgAvailableAppsList: any[] = [];
  srgMappings: any[] = [];

  // Network Logic
  networkAppsList: any[] = [];
  networkRules: any[] = [];

  // Host Logic
  hostRules: any[] = [];
  hostTechTypes: any[] = [];

  // Database Logic
  dbRules: any[] = [];

  // Software Metering Logic
  softwareMeteringZones: any[] = [];
  smRules: { zoneId: number | null; zoneName: string; groupId: number | null; groupList: any[] }[] = [];

  currentUser: any;
  userId: string = '';
  tool: string = 'APM';

  canCreate: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;

  constructor(
    private applicationService: ApplicationService,
    private authService: AuthenticationService,
    private roleService: RoleService,
    private router: Router,
    private decoderService: DecoderService,
    private sanitizationService: SanitizationService
  ) { }

  toSystemName(p: string): string {
    return p ? p.trim() : p;
  }

  getFeatureIcon(featureName: string): string {
    return 'ri-checkbox-circle-line';
  }

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.userId = this.currentUser?.userId || '';
    this.tool = sessionStorage.getItem('tool') || '';
    // ---- CRUD PERMISSIONS ----
    const roleMapping = (this.currentUser as any)?.['crudData']?.['Admin-Config']?.['role'];
    if (roleMapping) {
      this.canCreate = this.decoderService.decryptJson(roleMapping.create) === 'true';
      this.canEdit = this.decoderService.decryptJson(roleMapping.edit) === 'true';
      this.canDelete = this.decoderService.decryptJson(roleMapping.delete) === 'true';
    }

    // ---- DEBUG LOG ----
    // console.log('[Role] User:', this.userId, '|', this.currentUser?.userType);
    // console.log('[Role] Permissions → Create:', this.canCreate, '| Edit:', this.canEdit, '| Delete:', this.canDelete);
    this.fetchProductsAndFeatures();
  }

  loadTechnologyTypes() {
    // Load Host Tech Types
    this.applicationService.getTechnologyBySubFeature('Host').subscribe({
      next: (response: any) => {
        if (response && response.serviceStatus === 'Success') {
          this.hostTechTypes = response.serviceResponse;
        }
      },
      error: (err) => console.error('Error fetching host tech types:', err)
    });
  }

  fetchProductsAndFeatures() {
    const user = this.authService.currentUserValue;
    if (user) {
      const userId = user.userId;
      const userType: any = user.userType;

      this.roleService.findProducts(userId, userType).subscribe({
        next: (response: any) => {
          if (response && response.products && response.features) {
            this.availableProducts = response.products;
            this.availableFeatures = [...new Set<string>(response.features)];
          } else {
            console.warn('Invalid response format from findProducts API');
            // Fallback or error handling
          }
        },
        error: (error) => {
          console.error('Error fetching products and features:', error);
          // Fallback to static lists if needed, or show error
        }
      });
    }
  }



  onNetworkAppChange(index: number) {
    const rule = this.networkRules[index];
    if (rule.appId) {
      const selectedApp = this.networkAppsList.find((app: any) => app.applicationId === parseInt(rule.appId));
      if (selectedApp) {
        rule.appName = selectedApp.applicationName;
      }
      this.applicationService.getAllNetworkHostByApllicationID(this.authService.currentUserValue!, rule.appId).subscribe({
        next: (response: any) => {
          if (response && response.serviceStatus === 'success' && response.serviceResponse) {
            rule.hostList = response.serviceResponse;
            rule.hostId = ''; // Reset selection
          }
        },
        error: (error) => {
          console.error('Error fetching Network hosts:', error);
        }
      });
    }
  }

  onSrgAppChange(index: number) {
    const mapping = this.srgMappings[index];

    if (mapping.appId) {

      this.applicationService
        .getFullApplicationData(this.userId, 'SRG', this.currentUser.sessionDTO, undefined, mapping.appId)
        .subscribe({
          next: (response: any) => {

            console.log("SRG FULL RESPONSE:", response);

            if (
              response &&
              response.serviceStatus === 'Success' &&
              response.serviceResponse &&
              response.serviceResponse.subFeatures
            ) {
              mapping.subFeatureList = response.serviceResponse.subFeatures;
              mapping.subFeatureID = null;
            } else {
              mapping.subFeatureList = [];
            }
          },
          error: (err) => {
            console.error("SRG subfeature error:", err);
          }
        });
    }
  }


  onHostOsChange(index: number) {
    const rule = this.hostRules[index];
    if (rule.osType) {
      const techType = rule.osType.toUpperCase();
      this.applicationService.getFullApplicationData(this.userId, 'Host', this.currentUser.sessionDTO, techType).subscribe({
        next: (response: any) => {
          if (response && response.serviceStatus === 'Success' && response.serviceResponse && response.serviceResponse.applications) {
            rule.appList = response.serviceResponse.applications;
            rule.appId = null;
            rule.hostPattern = ''; // Reset selection
            rule.ipRange = ''; // Reset selection
            rule.ipList = []; // Reset list
          }
        },
        error: (error) => {
          console.error('Error fetching HOST applications:', error);
        }
      });
    }
  }

  onHostAppChange(index: number) {
    const rule = this.hostRules[index];
    if (rule.appId) {
      // Update hostPattern with the selected application's name
      const selectedApp = rule.appList.find((app: any) => app.applicationId === parseInt(rule.appId));
      if (selectedApp) {
        rule.hostPattern = selectedApp.applicationName;
      }

      this.applicationService.getFullApplicationData(this.userId, 'INFRA', this.currentUser.sessionDTO, undefined, rule.appId).subscribe({
        next: (response: any) => {
          if (response && response.serviceStatus === 'Success' && response.serviceResponse && response.serviceResponse.ipList) {
            rule.ipList = response.serviceResponse.ipList;
            rule.ipRange = '';
          }
        },
        error: (error) => {
          console.error('Error fetching IP list:', error);
        }
      });
    }
  }

  // --- Methods ---

  // Product Selection
  productState: any = {};

  toggleProduct(product: Product) {
    if (this.selectedProducts.includes(product)) {
      this.selectedProducts = this.selectedProducts.filter(p => p !== product);
      delete this.productState[product];
      // Clean up complex rules if toggled off
      const sysName = this.toSystemName(product);
      if (sysName === 'SRG') this.srgMappings = [];
      if (sysName === 'Network') this.networkRules = [];
      if (sysName === 'Host') this.hostRules = [];
      if (sysName === 'DATABASE') this.dbRules = [];
    } else {
      this.selectedProducts.push(product);
      if (!this.productState[product]) {
        this.initializeProduct(product);
      }
    }
  }
  initializeProduct(product: string) {
    const sysName = this.toSystemName(product);
    if (this.complexProducts.includes(product)) {
      this.productState[product] = {
        mode: 'COMPLEX_TYPE',
        techTypes: []
      };

      // Always fetch technology types for complex products
      this.applicationService.getTechnologyBySubFeature(sysName).subscribe({
        next: (response: any) => {
          if (response?.serviceResponse) {
            this.productState[product].techTypes = response.serviceResponse;
            if (sysName === 'Host') {
              this.hostTechTypes = response.serviceResponse;
            }
          }
        }
      });

      // Load specific apps if needed
      if (sysName === 'SRG' && this.srgAvailableAppsList.length === 0) {
        this.applicationService.getFullApplicationData(this.userId, 'SRG', this.currentUser.sessionDTO).subscribe((response: any) => {
          this.srgAvailableAppsList = response?.serviceResponse?.applications || [];
        });
      } else if (sysName === 'Network' && this.networkAppsList.length === 0) {
        this.applicationService.getFullApplicationData(this.userId, 'Network', this.currentUser.sessionDTO).subscribe((response: any) => {
          this.networkAppsList = response?.serviceResponse?.applications || [];
        });
      }
      return;
    }

    this.detectTechnologyMode(product);
  }

  getProductIcon(product: string): string {
    return 'ri-app-store-line';
  }

  detectTechnologyMode(product: string) {
    const sysName = this.toSystemName(product);
    this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO).subscribe({
      next: (response: any) => {
        let apps = response?.serviceResponse?.applications || [];

        // Use applications list directly (no intersection with ipList) and deduplicate by name
        const uniqueApps = [];
        const seenNames = new Set();
        for (const app of apps) {
          const name = app.applicationName || app.appName || app.name || 'Unknown';
          if (!seenNames.has(name)) {
            seenNames.add(name);
            // Extract any technology field dynamically
            app.normalizedTechType = (app.technologyType || app.applicationTechnology || app.techType || '').trim();
            uniqueApps.push(app);
          }
        }

        const hasTechType = uniqueApps.some(app => app.normalizedTechType !== '');

        if (!this.productState[product]) this.productState[product] = {};

        if (hasTechType) {
          const techNames = [...new Set(uniqueApps.map(app => app.normalizedTechType).filter(Boolean))];
          const techList = techNames.map(tech => ({ technologyType: tech }));

          this.productState[product] = {
            ...this.productState[product],
            mode: 'TECH_TYPE',
            techTypes: techList,
            selectedTech: this.productState[product].selectedTech || null,
            applications: this.productState[product].applications || [],
            rules: this.productState[product].rules || []
          };
        } else {
          const currentState = this.productState[product] || {};
          const assigned = currentState.assigned || [];

          this.productState[product] = {
            ...currentState,
            mode: 'GENERIC',
            appsList: uniqueApps,
            available: uniqueApps.map((a: any) => a.applicationName || a.appName || a.name || 'Unknown').filter((a: string) => !assigned.includes(a)),
            assigned,
            searchAvail: currentState.searchAvail || '',
            searchAssigned: currentState.searchAssigned || ''
          };
        }
      },
      error: (err) => {
        console.error(`Error loading apps in detectTechnologyMode for ${product}:`, err);
        if (!this.productState[product]) this.productState[product] = {};
        this.productState[product].mode = 'GENERIC';
        this.productState[product].available = [];
        this.productState[product].assigned = [];
      }
    });
  }

  onTechnologyChange(product: string) {
    const sysName = this.toSystemName(product);
    const tech = this.productState[product].selectedTech;
    this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO, tech).subscribe((response: any) => {
      this.productState[product].applications = response?.serviceResponse?.applications || [];
    });
  }


  toggleFeature(f: string) {
    if (this.selectedFeatures.includes(f)) {
      this.selectedFeatures = this.selectedFeatures.filter(x => x !== f);
      if (f === 'Software Metering') {
        this.smRules = [];
        this.selectedProducts = this.selectedProducts.filter(p => p !== 'Software Metering');
      }
    } else {
      this.selectedFeatures.push(f);
      if (f === 'Software Metering') {
        if (this.softwareMeteringZones.length === 0) {
          this.fetchSoftwareMeteringZones();
        }
        if (!this.selectedProducts.includes('Software Metering')) {
          this.selectedProducts.push('Software Metering');
        }
      }
    }
  }

  // Software Metering Methods
  fetchSoftwareMeteringZones() {
    const user = this.authService.currentUserValue;
    if (user) {
      const payload = {
        ...user,
        sessionDTO: user.sessionDTO || {}
      };
      const safePayload = this.sanitizationService.sanitizePayload(payload);
      this.applicationService.getSoftwareMeteringZoneAndTeamList(safePayload as any).subscribe({
        next: (response: any) => {
          if (response && response.serviceStatus === 'Success' && response.serviceResponse) {
            this.softwareMeteringZones = response.serviceResponse;
          }
        },
        error: (err) => console.error('Error fetching software metering zones:', err)
      });
    }
  }

  smAddRule() {
    this.smRules.push({ zoneId: null, zoneName: '', groupId: null, groupList: [] });
  }

  smRemoveRule(index: number) {
    this.smRules.splice(index, 1);
  }

  onSmZoneChange(index: number) {
    const rule = this.smRules[index];
    rule.groupId = null;
    rule.groupList = [];
    if (rule.zoneId) {
      const zone = this.softwareMeteringZones.find(z => z.id == rule.zoneId);
      if (zone) {
        rule.zoneName = zone.name;
        rule.groupList = zone.groups || [];
      }
    }
  }

  // Panel Management
  get sortedProducts(): Product[] {
    const list = [...this.selectedProducts];
    const isOdd = list.length % 2 !== 0;

    if (isOdd) {
      const complexIndex = list.findIndex(p => this.complexPanels.includes(p));
      if (complexIndex !== -1) {
        const [complexItem] = list.splice(complexIndex, 1);
        list.push(complexItem);
      }
    }
    return list;
  }

  isFullWidth(product: Product): boolean {
    const list = this.selectedProducts;
    return list.length % 2 !== 0 && this.sortedProducts[this.sortedProducts.length - 1] === product;
  }

  togglePanelCollapse(product: string) {
    this.panelCollapsedState[product] = !this.panelCollapsedState[product];
  }

  isPanelCollapsed(product: string): boolean {
    return !!this.panelCollapsedState[product];
  }

  getPanelTitle(product: Product): string {
    return (product as string).replace(/_/g, ' ');
  }

  getPanelDescription(product: Product): string {
    return product ? `Configure ${product} access controls` : '';
  }

  getAccessCount(product: string): number {
    const state = this.productState[product];
    if (state) {
      if (state.mode === 'GENERIC' || state.mode === 'DRAG_DROP') {
        return state.assigned?.length || 0;
      }
      if (state.mode === 'TECH_TYPE') {
        return state.rules?.length || 0;
      }
    }
    // Complex types
    switch (product) {
      case 'SRG': return this.srgMappings.length;
      case 'NETWORK':
      case 'Network': return this.networkRules.length;
      case 'HOST':
      case 'Host': return this.hostRules.length;
      case 'Software Metering': return this.smRules.length;
      default: return 0;
    }
  }

  // Generic Drag-Drop Methods
  getFilteredAvail(product: string) {
    const state = this.productState[product];
    if (!state || !state.available) return [];
    return state.available.filter((s: string) => s.toLowerCase().includes((state.searchAvail || '').toLowerCase()));
  }

  getFilteredAssigned(product: string) {
    const state = this.productState[product];
    if (!state || !state.assigned) return [];
    return state.assigned.filter((s: string) => s.toLowerCase().includes((state.searchAssigned || '').toLowerCase()));
  }

  unassignService(product: string, item: string) {
    const state = this.productState[product];
    if (state) {
      state.assigned = state.assigned.filter((i: string) => i !== item);
      state.available.push(item);
    }
  }

  assignService(product: string, item: string) {
    const state = this.productState[product];
    if (state) {
      state.available = state.available.filter((i: string) => i !== item);
      state.assigned.push(item);
    }
  }

  onRightClick(event: MouseEvent, product: string, item: string) {
    event.preventDefault();
    this.assignService(product, item);
  }

  genericDrop(event: CdkDragDrop<string[]>, product: string) {
    const state = this.productState[product];
    if (!state) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  // SRG Logic Methods
  srgAddMapping() {
    this.srgMappings.push({
      appId: null,
      subFeatureID: null,
      subFeatureList: []
    });
  }

  srgRemoveMapping(index: number) { this.srgMappings.splice(index, 1); }

  // Network Logic Methods
  networkAddRule() { this.networkRules.push({ appId: null, appName: '', hostName: '', feature: '', ipList: [] }); }
  networkRemoveRule(index: number) { this.networkRules.splice(index, 1); }

  // Host Logic Methods
  hostAddRule() { this.hostRules.push({ osType: '', appId: null, hostPattern: '', ipRange: '', appList: [], ipList: [] }); }
  hostRemoveRule(index: number) { this.hostRules.splice(index, 1); }

  // Database Logic Methods
  dbAddRule() { this.dbRules.push({ dbType: 'PostgreSQL', connectionId: '', privilege: 'Read Only' }); }
  dbRemoveRule(index: number) { this.dbRules.splice(index, 1); }



  checkDuplicateSrg(index: number) {
    const current = this.srgMappings[index];
    if (!current.appId || !current.subFeatureID) return;
    const isDuplicate = this.srgMappings.some((m, i) => i !== index && m.appId == current.appId && m.subFeatureID == current.subFeatureID);
    if (isDuplicate) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate SRG Mapping found for the same Application and Sub Feature. Please select differently.' });
      setTimeout(() => current.subFeatureID = null, 0);
    }
  }





  saveRole() {
    // Validation: Role Name
    if (!this.roleName || this.roleName.trim() === '') {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Role Name is required'
      });
      return;
    }

    // Validation: Role Description
    if (!this.description || this.description.trim() === '') {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Role Description is required'
      });
      return;
    }

    // Validation: At least one product selected
    if (this.selectedProducts.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'At least one product must be selected'
      });
      return;
    }

    // Validation: All selected products must be configured
    for (const product of this.selectedProducts) {
      let isConfigured = false;
      const state = this.productState[product];

      if (state) {
        if (state.mode === 'GENERIC' || state.mode === 'DRAG_DROP') {
          isConfigured = (state.assigned?.length || 0) > 0;
        } else if (state.mode === 'TECH_TYPE') {
          isConfigured = (state.rules?.length || 0) > 0;
        } else if ((product as any) === 'MRUM' || (product as any) === 'BRUM' || (product as any) === 'Mobile Monitoring' || (product as any) === 'Browser Monitoring' || (product as any) === 'BROWSER_MONITORING') {
          isConfigured = (state.assigned?.length || 0) > 0;
        } else if (state.mode === 'COMPLEX_TYPE') {
          switch (product) {
            case 'SRG': isConfigured = this.srgMappings.length > 0; break;
            case 'NETWORK': isConfigured = this.networkRules.length > 0; break;
            case 'HOST': isConfigured = this.hostRules.length > 0; break;
            case 'DATABASE': isConfigured = this.dbRules.length > 0; break;
            default: isConfigured = true;
          }
        } else {
          isConfigured = true;
        }
      } else {
        isConfigured = true; // Fallback
      }

      if (!isConfigured) {
        Swal.fire({
          icon: 'error',
          title: 'Configuration Error',
          text: `Product ${product} is selected but not configured. Please assign at least one item or add a rule.`
        });
        return;
      }
    }

    // Validation: Check for duplicate SRG mappings
    if (this.selectedProducts.includes('SRG')) {
      const srgSet = new Set();
      for (const mapping of this.srgMappings) {
        if (!mapping.appId || !mapping.subFeatureID) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please complete all SRG Mapping fields or remove incomplete rows' });
          return;
        }
        const key = `${mapping.appId}-${mapping.subFeatureID}`;
        if (srgSet.has(key)) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate SRG Mapping found for the same Application and Sub Feature. Please select differently or remove the duplicate row.' });
          return;
        }
        srgSet.add(key);
      }
    }

    // Validation: Check for duplicate Network rules
    if (this.selectedProducts.includes('NETWORK') || this.selectedProducts.includes('Network')) {
      const networkSet = new Set();
      for (const rule of this.networkRules) {
        if (!rule.appId || !rule.hostId) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please complete all Network Mapping fields or remove incomplete rows' });
          return;
        }
        const key = `${rule.appId}-${rule.hostId}`;
        if (networkSet.has(key)) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Network Mapping found for the same Application Name and Host Name. Please select differently or remove the duplicate row.' });
          return;
        }
        networkSet.add(key);
      }
    }

    // Validation: Check for duplicate Host rules
    if (this.selectedProducts.includes('HOST') || this.selectedProducts.includes('Host')) {
      const hostSet = new Set();
      for (const rule of this.hostRules) {
        if (!rule.osType || !rule.appId || !rule.ipRange) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please complete all Host Access Table fields or remove incomplete rows' });
          return;
        }
        const key = `${rule.osType}-${rule.appId}-${rule.ipRange}`;
        if (hostSet.has(key)) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Host Access rule found for the same OS, Application, and IP Range. Please select differently or remove the duplicate row.' });
          return;
        }
        hostSet.add(key);
      }
    }

    // Validation: Check for duplicate Database rules
    if (this.selectedProducts.includes('DATABASE') || this.selectedProducts.includes('Database')) {
      const dbSet = new Set();
      for (const rule of this.dbRules) {
        if (!rule.dbType || !rule.connectionId || !rule.privilege) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please complete all Database Access Table fields or remove incomplete rows' });
          return;
        }
        const key = `${rule.dbType}-${rule.connectionId}-${rule.privilege}`;
        if (dbSet.has(key)) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Database Access rule found for the same DB Type, Connection, and Privilege. Please select differently or remove the duplicate row.' });
          return;
        }
        dbSet.add(key);
      }
    }

    // Validation for TECH_TYPE rules (Relational, Non-Relational, etc.)
    for (const product of this.selectedProducts) {
      const state = this.productState[product];
      if (state && state.mode === 'TECH_TYPE') {
        const rules = state.rules || [];
        if (rules.length === 0) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: `Please add at least one configuration for ${product}. Both Technology Type and Application must be selected.` });
          return;
        }
        const techSet = new Set();
        for (const rule of rules) {
          if (!rule.techType || !rule.appId) {
            Swal.fire({ icon: 'error', title: 'Validation Error', text: `Please complete all fields for ${product}. Two fields must not be null and must be selected at least one each.` });
            return;
          }
          const key = `${rule.techType}-${rule.appId}`;
          if (techSet.has(key)) {
            Swal.fire({ icon: 'error', title: 'Validation Error', text: `Duplicate rule found for ${product} with the same Technology Type and Application. Please select differently or remove the duplicate row.` });
            return;
          }
          techSet.add(key);
        }
      }
    }

    const currentUserName = this.authService.currentUserValue?.userId || this.authService.getUserName() || 'unknown';

    // Format to IST string: YYYY-MM-DDTHH:mm:ss.sssZ (but with actual IST numbers)
    // Using sv-SE locale as it gives YYYY-MM-DD HH:mm:ss format
    const istDateString = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()).replace(' ', 'T') + '.000Z';

    const roleData: any = {
      roleName: this.roleName,
      roleDescription: this.description,
      productCount: this.selectedProducts.length,
      featureCount: this.selectedFeatures.length,
      createdOn: istDateString,
      createdBy: currentUserName,
      updatedOn: null,
      updatedBy: null,
      selectedProducts: this.selectedProducts,
      selectedFeatures: this.selectedFeatures,
      tool: this.tool,

      ...(() => {
        const appIds: number[] = [];
        this.selectedProducts.forEach(p => {
          if (['Host', 'Network', 'SRG', 'Software Metering'].includes(p)) return; // Skip complex types

          const state = this.productState[p];
          if (!state) return;

          // Extract from TECH_TYPE mode (rules array)
          if (state.rules && state.rules.length > 0) {
            state.rules.forEach((r: any) => {
              if (r.appId) appIds.push(Number(r.appId));
            });
          }

          // Extract from GENERIC mode (assigned strings array)
          if (state.assigned && state.assigned.length > 0 && state.appsList) {
            state.assigned.forEach((name: string) => {
              const app = state.appsList.find((a: any) =>
                a.applicationName === name || a.appName === name || a.name === name || a.hostName === name
              );
              if (app && (app.applicationId || app.appId)) {
                appIds.push(Number(app.applicationId || app.appId));
              }
            });
          }
        });
        return { appIds };
      })(),

      // ✅ COMPLEX TYPES
      srgMappings: this.srgMappings.map(r => ({
        appId: r.appId ? Number(r.appId) : null,
        subFeatureID: r.subFeatureID ? Number(r.subFeatureID) : null
      })),

      networkRules: this.networkRules.map(r => ({
        appId: r.appId ? Number(r.appId) : null,
        hostId: r.hostId ? Number(r.hostId) : null
      })),

      hostRules: this.hostRules.map(r => {
        const selectedIp = r.ipList?.find((ip: any) => ip.ipAddress === r.ipRange);
        return {
          appId: r.appId ? Number(r.appId) : null,
          ipId: selectedIp ? Number(selectedIp.ipId) : null
        };
      }),

      softwareMeteringAssigned: this.smRules.map(r => ({
        zoneId: r.zoneId ? Number(r.zoneId) : null,
        teamId: r.groupId ? Number(r.groupId) : null
      })),

      sessionDTO: {
        ...this.authService.currentUserValue?.sessionDTO,
        featureName: "Configuration",
        menu: "Admin Config",
        configTab: "Role",
        requestURI: "/admin-config/role",
        userId: currentUserName,
      }
    };

    // Only delete cross-tool fields if they are actually empty to allow persistent visibility
    if (this.tool === 'ORC') {
      if (!roleData.apmAssigned?.length) delete roleData.apmAssigned;
      if (!roleData.brumAssigned?.length) delete roleData.brumAssigned;
      if (!roleData.mrumAssigned?.length) delete roleData.mrumAssigned;
      if (!roleData.apiGatewayAssigned?.length) delete roleData.apiGatewayAssigned;
      if (!roleData.redisAssigned?.length) delete roleData.redisAssigned;
      if (!roleData.kafkaAssigned?.length) delete roleData.kafkaAssigned;
      if (!roleData.nginxAssigned?.length) delete roleData.nginxAssigned;
      if (!roleData.eksAssigned?.length) delete roleData.eksAssigned;
      if (!roleData.aksAssigned?.length) delete roleData.aksAssigned;
      if (!roleData.activeMqAssigned?.length) delete roleData.activeMqAssigned;
      if (!roleData.rdsAssigned?.length) delete roleData.rdsAssigned;
      if (!roleData.iisAssigned?.length) delete roleData.iisAssigned;
    } else {
      // In APM mode, we keep infrastructure rules if they have data to ensure syncing
      if (!roleData.srgMappings?.length) delete roleData.srgMappings;
      if (!roleData.networkRules?.length) delete roleData.networkRules;
      if (!roleData.softwareMeteringAssigned?.length) delete roleData.softwareMeteringAssigned;
    }

    // Defensive Sanitization: Features must not contain Products
    roleData.selectedFeatures = roleData.selectedFeatures.filter((f: string) => !roleData.selectedProducts.includes(f));

    delete roleData.dbRules;
    const safePayload = this.sanitizationService.sanitizePayload(roleData);
    this.applicationService.createCustomRole(safePayload).subscribe({
      next: (response: any) => {
        if (response && response.serviceStatus === 'Success') {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Role Configuration Saved Successfully!'
          });
          this.resetForm();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error saving role: ' + (response.serviceError || 'Unknown error')
          });
        }
      },
      error: (error: any) => {
        console.error('Error in saveRole:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to save Role Configuration. Please check the console for details.'
        });
      }
    });
  }

  resetForm() {
    this.roleName = '';
    this.description = '';
    this.selectedProducts = [];
    this.selectedFeatures = [];

    // Reset mapping arrays
    this.srgMappings = [];
    this.networkRules = [];
    this.hostRules = [];
    this.dbRules = [];
    this.smRules = [];

    // Clear dynamic ProductState mapping
    this.productState = {};

    this.srgAvailableAppsList = [];
    this.networkAppsList = [];
  }

  // Tech Type Logic Methods
  addTechRule(product: string) {
    if (!this.productState[product].rules) {
      this.productState[product].rules = [];
    }
    this.productState[product].rules.push({ techType: '', appId: null, appsList: [] });
  }

  removeTechRule(product: string, index: number) {
    this.productState[product].rules.splice(index, 1);
  }

  onRuleTechnologyChange(product: string, index: number) {
    const sysName = this.toSystemName(product);
    const rule = this.productState[product].rules[index];
    rule.appId = null; // reset app selection on tech change
    if (rule.techType) {
      this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO, rule.techType).subscribe((response: any) => {
        rule.appsList = response?.serviceResponse?.applications || [];
      });
    }
  }

  checkDuplicateTechRule(product: string, index: number) {
    const rules = this.productState[product].rules;
    const current = rules[index];
    if (!current.techType || !current.appId) return;
    const isDup = rules.some((r: any, i: number) => i !== index && r.techType === current.techType && r.appId == current.appId);
    if (isDup) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate rule found for the same Technology Type and Application. Please select differently.' });
      setTimeout(() => current.appId = null, 0);
    }
  }

  checkDuplicateNetwork(index: number) {
    const current = this.networkRules[index];
    if (!current.appId || !current.hostId) return;
    const isDuplicate = this.networkRules.some((r, i) => i !== index && r.appId == current.appId && r.hostId == current.hostId);
    if (isDuplicate) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Network Mapping found for the same Application Name and Host Name. Please select differently.' });
      setTimeout(() => current.hostId = '', 0);
    }
  }

  checkDuplicateHost(index: number) {
    const current = this.hostRules[index];
    if (!current.osType || !current.appId || !current.ipRange) return;
    const isDuplicate = this.hostRules.some((r, i) => i !== index && r.osType === current.osType && r.appId == current.appId && r.ipRange === current.ipRange);
    if (isDuplicate) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Host Access rule found for the same OS, Application, and IP Range. Please select differently.' });
      setTimeout(() => current.ipRange = '', 0);
    }
  }

  checkDuplicateDb(index: number) {
    const current = this.dbRules[index];
    if (!current.dbType || !current.connectionId || !current.privilege) return;
    const isDuplicate = this.dbRules.some((r, i) => i !== index && r.dbType === current.dbType && r.connectionId === current.connectionId && r.privilege === current.privilege);
    if (isDuplicate) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Database Access rule found for the same DB Type, Connection, and Privilege. Please select differently.' });
      setTimeout(() => current.privilege = 'Read Only', 0);
    }
  }

  navigateToManagement() {
    this.router.navigate(['/admin-config/role/role-management']);
  }

  normalizeProductName(name: string): Product {
    return name ? name.trim() as Product : name as Product;
  }
}
