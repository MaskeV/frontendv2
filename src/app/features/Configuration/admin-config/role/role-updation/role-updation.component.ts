import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { Product } from '../../../../../models/Role';
import { ApplicationService } from '../../../../../services/application.service';
import { AuthenticationService } from '../../../../../services/authentication.service';
import { RoleService } from '../../../../../services/role.service';
import { DecoderService } from '../../../../../services/decoder.service';
import { SanitizeInputDirective } from '../../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../../services/sanitization.service';

@Component({
  selector: 'app-role-updation',
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    RouterModule,
    SanitizeInputDirective
  ],
  templateUrl: './role-updation.component.html',
  styleUrls: ['./role-updation.component.css']
})
export class RoleUpdationComponent implements OnInit {
  roleName = '';
  description = '';
  roleId: number | null = null;
  isEditMode = false;

  selectedProducts: Product[] = [];
  selectedFeatures: string[] = [];
  availableProducts: Product[] = [];
  availableFeatures: string[] = [];

  complexPanels: string[] = ['HOST', 'Host', 'DATABASE', 'Database', 'Software Metering'];
  complexProducts = ['SRG', 'NETWORK', 'Network', 'HOST', 'Host', 'DATABASE', 'Database', 'Software Metering'];
  productState: any = {};
  panelCollapsedState: { [key: string]: boolean } = {};


  getFeatureIcon(featureName: string): string {
    return 'ri-checkbox-circle-line';
  }

  srgAvailableAppsList: any[] = [];
  srgMappings: any[] = [];

  networkAppsList: any[] = [];
  networkRules: any[] = [];

  hostRules: any[] = [];

  dbRules: any[] = [];
  relationalAppsFullList: any[] = [];
  nonRelationalAppsFullList: any[] = [];
  hostTechTypes: any[] = [];
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
    private router: Router,
    private route: ActivatedRoute,
    private roleService: RoleService,
    private decoderService: DecoderService,
    private sanitizationService: SanitizationService
  ) { }

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
    // console.log('[RoleUpdation] User:', this.userId, '|', this.currentUser?.userType);
    // console.log('[RoleUpdation] Permissions → Create:', this.canCreate, '| Edit:', this.canEdit, '| Delete:', this.canDelete);

    this.fetchProductsAndFeatures();
    this.loadTechnologyTypes();
    this.fetchSoftwareMeteringZones();

    // Fetch SRG and Network apps list on load so they are populated when role config is loaded
    this.applicationService.getFullApplicationData(this.userId, 'SRG', this.currentUser.sessionDTO).subscribe((response: any) => {
      this.srgAvailableAppsList = response?.serviceResponse?.applications || [];
      if (this.productState['SRG']) this.productState['SRG'].appsList = this.srgAvailableAppsList;
    });
    this.applicationService.getFullApplicationData(this.userId, 'Network', this.currentUser.sessionDTO).subscribe((response: any) => {
      this.networkAppsList = response?.serviceResponse?.applications || [];
      if (this.productState['Network']) this.productState['Network'].appsList = this.networkAppsList;
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.roleId = +id;
        this.isEditMode = true;
        this.loadRoleData(this.roleId);
      }
    });
  }

  private get sessionDTO(): any {
    const session = { ...(this.currentUser?.sessionDTO || {}) };
    if (this.userId) (session as any)['userId'] = this.userId;
    return session;
  }

  loadTechnologyTypes() {
    this.applicationService.getTechnologyBySubFeature('HOST').subscribe({
      next: (response: any) => {
        if (response && response.serviceStatus === 'Success') {
          this.hostTechTypes = response.serviceResponse;
        }
      },
      error: (err) => console.error('Error fetching host tech types:', err)
    });
  }

  loadRoleData(roleId: number) {
    const tool = sessionStorage.getItem("tool") ?? '';
    this.applicationService.getCustomRoleById(roleId, tool, this.currentUser?.sessionDTO).subscribe({
      next: (response: any) => {
        if (response && response.serviceStatus === 'Success') {
          this.populateForm(response.serviceResponse);
        }
      },
      error: (err) => console.error('Error loading role:', err)
    });
  }

  populateForm(role: any) {
    this.roleName = role.roleName;
    this.description = role.roleDescription || role.description;

    this.selectedProducts = [];
    this.selectedFeatures = [];

    const normalizeFeatureName = (val: string): string => {
      if (!val) return val;
      val = val.trim();
      const featureNameMap: { [key: string]: string } = {
        'admin-config': 'Admin-Config',
        'setting': 'Setting',
        'settings': 'Setting',
        'brum': 'BRUM',
        'host': 'Host',
        'kafka': 'Kafka',
        'nginx': 'Nginx',
        'non-relational': 'Non-Relational',
        'relational': 'Relational',
        'rds': 'RDS',
        'service': 'Service',
        'srg': 'SRG',
        'network': 'Network',
        'redis': 'Redis',
        'api gateway': 'API Gateway',
        'browser monitoring': 'Browser Monitoring',
        'eks': 'EKS',
        'aks': 'AKS',
        'activemq': 'ActiveMQ',
        'database': 'Database',
        'alert': 'Alert',
        'alerts': 'Alert',
        'report': 'Report',
        'reports': 'Report',
        'iis': 'IIS',
        'software metering': 'Software Metering',
        'software-metering': 'Software Metering'
      };
      const key = val.toLowerCase();
      return featureNameMap[key] || (val.charAt(0).toUpperCase() + val.slice(1));
    };

    const productSet = new Set<Product>();
    if (role.products && role.products.length > 0) {
      role.products.forEach((p: any) => {
        const product = this.normalizeProductName(p.subFeatureName);
        if (product) productSet.add(product);
      });
    }
    this.selectedProducts = Array.from(productSet);

    const featureSet = new Set<string>();
    if (role.features && role.features.length > 0) {
      role.features.forEach((f: any) => {
        const feature = normalizeFeatureName(f.subFeatureName);
        if (feature) featureSet.add(feature);
      });
    }
    this.selectedFeatures = Array.from(featureSet);

    // Force Software Metering into selectedProducts/Features if data exists in response
    if (role.softwareMeteringList && role.softwareMeteringList.length > 0) {
      if (!this.selectedFeatures.includes('Software Metering')) {
        this.selectedFeatures.push('Software Metering');
      }
      if (!this.selectedProducts.includes('Software Metering')) {
        this.selectedProducts.push('Software Metering');
      }
    } else if (this.selectedFeatures.includes('Software Metering') && !this.selectedProducts.includes('Software Metering')) {
      // Also force into products if it was selected as a feature to ensure grid visibility
      this.selectedProducts.push('Software Metering');
    }

    // Populate Software Metering rules early
    if (this.selectedFeatures.includes('Software Metering') || this.selectedProducts.includes('Software Metering')) {
      if (!this.productState['Software Metering']) this.productState['Software Metering'] = {};

      const rawSmRules = role.softwareMeteringList || [];
      // Filter out entries where both zone and team are null/empty
      this.smRules = rawSmRules
        .filter((r: any) => r.zoneId != null || r.teamId != null)
        .map((r: any) => ({
          zoneId: r.zoneId ? Number(r.zoneId) : null,
          zoneName: '',
          groupId: (r.teamId || r.groupId) ? Number(r.teamId || r.groupId) : null,
          groupList: []
        }));

      this.smRules.forEach((_, i) => {
        this.onSmZoneChange(i, true);
      });
    }

    this.selectedProducts.forEach(p => {
      if (!this.productState[p]) {
        this.productState[p] = {};
      }

      if (['Host', 'SRG', 'Network', 'Software Metering'].includes(p)) {
        if (p === 'Host') {
          const rules = role.host || [];
          this.hostRules = rules.map((r: any) => ({
            osType: r.technologyType || '',
            appId: r.appId != null ? String(r.appId) : null,
            hostPattern: r.applicationName || '',
            ipRange: r.ipaddress || '',
            ipId: r.ipaddressId,
            appList: [],
            ipList: []
          }));
          this.hostRules.forEach((_, i) => {
            this.onHostOsChange(i, true);
          });
        } else if (p === 'SRG') {
          if (!this.productState['SRG']) this.productState['SRG'] = {};
          this.productState['SRG'].appsList = this.srgAvailableAppsList;
          this.srgMappings = (role.srg || []).map((r: any) => ({
            appId: r.appId != null ? String(r.appId) : null,
            subFeatureID: r.subFeatureId,
            subFeatureList: []
          }));
          this.srgMappings.forEach((_, i) => {
            this.onSrgAppChange(i, true);
          });
        } else if (p === 'Network') {
          if (!this.productState['Network']) this.productState['Network'] = {};
          this.productState['Network'].appsList = this.networkAppsList;
          this.networkRules = (role.network || []).map((r: any) => ({
            ...r,
            appId: r.appId != null ? String(r.appId) : null,
            hostId: r.hostId != null ? String(r.hostId) : null,
            appList: [],
            hostList: []
          }));
          this.networkRules.forEach((_, i) => {
            this.onNetworkAppChange(i, true);
          });
        }
      } else {
        const sysName = this.toSystemName(p);
        const sysNameUpper = sysName.toUpperCase();
        const assigned = (role.applications || []).filter((c: any) => {
          const appType = (c.applicationType || '').toUpperCase().trim();
          const sysNameUpper = sysName.toUpperCase().trim();
          if (sysNameUpper === appType) return true;
          const normAppType = appType.replace(/[-_ ]/g, '');
          const normSysName = sysNameUpper.replace(/[-_ ]/g, '');
          return normAppType === normSysName;
        });

        this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO).subscribe({
          next: (appRes: any) => {
            const apps = appRes?.serviceResponse?.applications || [];
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

            if (hasTechType) {
              const techNames = [...new Set(uniqueApps.map(app => app.normalizedTechType).filter(Boolean))];
              const techList = techNames.map(tech => ({ technologyType: tech }));

              this.productState[p] = {
                mode: 'TECH_TYPE',
                techTypes: techList,
                rules: assigned.map((r: any) => ({
                  techType: r.technologyType || r.applicationTechnology || r.techType || '',
                  appId: r.appId ? Number(r.appId) : null,
                  appsList: []
                }))
              };

              this.productState[p].rules.forEach((r: any, idx: number) => {
                const matched = techList.find((t: any) => t.technologyType?.toUpperCase() === r.techType?.toUpperCase());
                if (matched) r.techType = matched.technologyType;
                this.onRuleTechnologyChange(p, idx, true);
              });
            } else {
              const assignedNames = assigned.map((a: any) => a.applicationName || a.appName || a.hostName || a.name || a);
              this.productState[p] = {
                mode: 'GENERIC',
                appsList: uniqueApps,
                assigned: assignedNames,
                available: uniqueApps.map((a: any) => a.applicationName || a.appName || a.name || 'Unknown').filter((name: string) => !assignedNames.includes(name)),
                searchAvail: '',
                searchAssigned: ''
              };
            }
          },
          error: (err) => {
            console.error(`Error loading applications in populateForm for product ${p}:`, err);
            const assignedNames = assigned.map((a: any) => a.applicationName || a.appName || a.hostName || a.name || a);
            this.productState[p] = {
              mode: 'GENERIC',
              appsList: [],
              assigned: assignedNames,
              available: [],
              searchAvail: '',
              searchAssigned: ''
            };
          }
        });
      }
    });
  }

  toSystemName(p: string): string {
    return p ? p.trim() : p;
  }

  addTechRule(product: string) {
    if (!this.productState[product]) this.productState[product] = { mode: 'TECH_TYPE', rules: [], techTypes: [] };
    if (!this.productState[product].rules) this.productState[product].rules = [];
    this.productState[product].rules.push({ techType: '', appId: null, appsList: [] });
  }

  removeTechRule(product: string, index: number) {
    if (this.productState[product]?.rules) {
      this.productState[product].rules.splice(index, 1);
    }
  }

  onRuleTechnologyChange(product: string, index: number, skipReset: boolean = false) {
    const sysName = this.toSystemName(product);
    const state = this.productState[product];
    if (!state || !state.rules) return;
    const rule = state.rules[index];
    if (!skipReset) {
      rule.appId = null;
    }
    if (rule.techType) {
      this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO, rule.techType).subscribe((response: any) => {
        rule.appsList = response?.serviceResponse?.applications || [];
      });
    }
  }

  checkDuplicateTechRule(product: string, index: number) {
    const state = this.productState[product];
    if (!state || !state.rules) return;
    const rules = state.rules;
    const current = rules[index];
    if (!current.techType || !current.appId) return;
    const isDup = rules.some((r: any, i: number) => i !== index && r.techType === current.techType && r.appId == current.appId);
    if (isDup) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate rule found for the same Technology Type and Application.' });
      setTimeout(() => current.appId = null, 0);
    }
  }

  normalizeProductName(name: string): Product {
    return name ? name.trim() as Product : name as Product;
  }

  syncProductState(product: string, apps: any[], available: string[]) {
    // Find all keys that match the system name of the product
    const targetSysName = this.toSystemName(product);
    Object.keys(this.productState).forEach(key => {
      if (this.toSystemName(key) === targetSysName) {
        this.productState[key].appsList = apps;
        const assigned = this.productState[key].assigned || [];
        this.productState[key].available = available.filter((a: any) => !assigned.includes(a));
      }
    });
  }

  checkDuplicateSrg(index: number) {
    const current = this.srgMappings[index];
    if (!current.appId || !current.subFeatureID) return;
    const isDuplicate = this.srgMappings.some((m, i) => i !== index && m.appId == current.appId && m.subFeatureID == current.subFeatureID);
    if (isDuplicate) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate SRG Mapping found for the same Application and Sub Feature. Please select differently.' });
      setTimeout(() => current.subFeatureID = null, 0);
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

  onNetworkAppChange(index: number, isInitialLoad = false) {
    const rule = this.networkRules[index];
    if (rule.appId) {
      const selectedApp = this.networkAppsList.find((app: any) => app.applicationId === parseInt(rule.appId));
      if (selectedApp) rule.appName = selectedApp.applicationName;
      this.applicationService.getAllNetworkHostByApllicationID(this.authService.currentUserValue!, rule.appId).subscribe({
        next: (response: any) => {
          if ((response?.serviceStatus === 'Success' || response?.serviceStatus === 'success') && response?.serviceResponse) {
            rule.hostList = response.serviceResponse.map((h: any) => ({
              ...h,
              hostId: h.hostId != null ? String(h.hostId) : h.hostId
            }));
            if (!isInitialLoad) rule.hostId = '';
          }
        },
        error: (error) => console.error('Error fetching Network hosts:', error)
      });
    }
  }

  onSrgAppChange(index: number, isInitialLoad = false) {
    const mapping = this.srgMappings[index];
    if (mapping.appId) {
      this.applicationService.getFullApplicationData(this.userId, 'SRG', this.currentUser.sessionDTO, undefined, Number(mapping.appId)).subscribe({
        next: (response: any) => {
          if (response?.serviceStatus === 'Success' && response?.serviceResponse?.subFeatures) {
            mapping.subFeatureList = response.serviceResponse.subFeatures;
            if (!isInitialLoad) mapping.subFeatureID = null;
          } else {
            mapping.subFeatureList = [];
          }
        },
        error: (err) => console.error('SRG subfeature error:', err)
      });
    }
  }

  onHostOsChange(index: number, isInitialLoad: boolean = false) {
    const rule = this.hostRules[index];
    if (rule.osType) {
      this.applicationService.getFullApplicationData(this.userId, 'Host', this.currentUser.sessionDTO, rule.osType).subscribe({
        next: (response: any) => {
          if (response?.serviceStatus === 'Success' && response?.serviceResponse?.applications) {
            rule.appList = response.serviceResponse.applications;
            if (isInitialLoad) {
              this.onHostAppChange(index, true);
            }
          }
          if (!isInitialLoad) {
            rule.appId = null;
            rule.hostPattern = '';
            rule.ipRange = '';
            rule.ipList = [];
          }
        },
        error: (error) => console.error('Error fetching HOST applications:', error)
      });
    }
  }

  onHostAppChange(index: number, isInitialLoad = false) {
    const rule = this.hostRules[index];
    if (rule.appId) {
      const selectedApp = rule.appList.find((app: any) => Number(app.applicationId) === Number(rule.appId));
      if (selectedApp) rule.hostPattern = selectedApp.applicationName;

      this.applicationService.getFullApplicationData(this.userId, 'Host', this.currentUser.sessionDTO, undefined, rule.appId).subscribe({
        next: (response: any) => {
          if (response?.serviceStatus === 'Success' && response?.serviceResponse) {
            const ipData = response.serviceResponse;
            rule.ipList = Array.isArray(ipData) ? ipData : (ipData.ipList || ipData.ips || []);
            if (isInitialLoad) {
              const savedIpAddress = rule.ipRange || rule.ipAddress || '';
              if (savedIpAddress) {
                const ipItem = rule.ipList.find((ip: any) => ip.ipAddress === savedIpAddress);
                rule.ipRange = ipItem ? ipItem.ipAddress : savedIpAddress;
              }
            } else {
              rule.ipRange = '';
            }
          }
        },
        error: (error) => console.error('Error fetching IP list:', error)
      });
    }
  }

  toggleProduct(p: Product) {
    if (this.selectedProducts.includes(p)) {
      this.selectedProducts = this.selectedProducts.filter(x => x !== p);
      delete this.productState[p];
      if (p === 'SRG') this.srgMappings = [];
      if (p === 'Network') this.networkRules = [];
      if (p === 'Host') this.hostRules = [];
      if (p === 'Database') this.dbRules = [];
    } else {
      this.selectedProducts.push(p);
      if (!this.productState[p]) {
        this.initializeProduct(p);
      }
    }
  }

  initializeProduct(product: string) {
    if (this.complexProducts.includes(product)) {
      this.productState[product] = { mode: 'COMPLEX_TYPE', techTypes: [] };
      this.applicationService.getTechnologyBySubFeature(product).subscribe({
        next: (response: any) => {
          if (response?.serviceResponse) {
            this.productState[product].techTypes = response.serviceResponse;
            if (product === 'HOST' || product === 'Host') {
              this.hostTechTypes = response.serviceResponse;
            }
          }
        }
      });
      if (product === 'SRG') {
        if (this.srgAvailableAppsList.length > 0) {
          this.productState['SRG'].appsList = this.srgAvailableAppsList;
        } else {
          this.applicationService.getFullApplicationData(this.userId, 'SRG', this.currentUser.sessionDTO).subscribe((response: any) => {
            this.srgAvailableAppsList = response?.serviceResponse?.applications || [];
            if (this.productState['SRG']) this.productState['SRG'].appsList = this.srgAvailableAppsList;
          });
        }
      } else if (product === 'Network') {
        if (this.networkAppsList.length > 0) {
          this.productState['Network'].appsList = this.networkAppsList;
        } else {
          this.applicationService.getFullApplicationData(this.userId, 'Network', this.currentUser.sessionDTO).subscribe((response: any) => {
            this.networkAppsList = response?.serviceResponse?.applications || [];
            if (this.productState['Network']) this.productState['Network'].appsList = this.networkAppsList;
          });
        }
      } else if (product === 'Software Metering') {
        this.fetchSoftwareMeteringZones();
      }
      return;
    }
    this.detectTechnologyMode(product);
  }

  detectTechnologyMode(product: string) {
    const sysName = this.toSystemName(product);
    this.applicationService.getFullApplicationData(this.userId, sysName, this.currentUser.sessionDTO).subscribe({
      next: (response: any) => {
        const apps = response?.serviceResponse?.applications || [];
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
    const tech = this.productState[product].selectedTech;
    this.applicationService.getFullApplicationData(this.userId, product, this.currentUser.sessionDTO, tech).subscribe((response: any) => {
      this.productState[product].applications = response?.serviceResponse?.applications || [];
    });
  }

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
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
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
        if (this.smRules.length === 0) {
          this.smAddRule();
        }
      }
    }
  }

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
    return (list.length % 2 !== 0 && this.sortedProducts[this.sortedProducts.length - 1] === product);
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

  getAccessCount(product: Product): number {
    const state = this.productState[product];
    if (state) {
      if (state.mode === 'GENERIC') return state.assigned?.length || 0;
      if (state.mode === 'TECH_TYPE') return state.rules?.length || 0;
      if (state.mode === 'COMPLEX_TYPE') {
        if (product === 'SRG') return this.srgMappings.length;
        if (product === 'Network') return this.networkRules.length;
        if (product === 'Host') return this.hostRules.length;
        if (product === 'Database') return this.dbRules.length;
        if (product === 'Software Metering') return this.smRules.length;
      }
    }
    return 0;
  }

  getProductIcon(product: string): string {
    return 'ri-app-store-line';
  }



  srgAddMapping() { this.srgMappings.push({ appId: null, subFeatureID: null, subFeatureList: [] }); }
  srgRemoveMapping(index: number) { this.srgMappings.splice(index, 1); }

  networkAddRule() { this.networkRules.push({ appId: null, appName: '', hostName: '', feature: '', hostList: [] }); }
  networkRemoveRule(index: number) { this.networkRules.splice(index, 1); }

  hostAddRule() { this.hostRules.push({ osType: '', appId: null, hostPattern: '', ipRange: '', appList: [], ipList: [] }); }
  hostRemoveRule(index: number) { this.hostRules.splice(index, 1); }

  dbAddRule() { this.dbRules.push({ dbType: 'PostgreSQL', connectionId: '', privilege: 'Read Only' }); }
  dbRemoveRule(index: number) { this.dbRules.splice(index, 1); }



  saveRole() {
    if (!this.roleName || this.roleName.trim() === '') {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Role Name is required' });
      return;
    }

    if (!this.description || this.description.trim() === '') {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Role Description is required' });
      return;
    }

    if (this.selectedProducts.length === 0) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'At least one product must be selected' });
      return;
    }

    for (const product of this.selectedProducts) {
      let isConfigured = false;
      const state = this.productState[product];

      if (state) {
        if (state.mode === 'GENERIC') {
          isConfigured = (state.assigned?.length || 0) > 0;
        } else if (state.mode === 'TECH_TYPE') {
          isConfigured = (state.rules?.length || 0) > 0;
        } else if (state.mode === 'COMPLEX_TYPE') {
          switch (product) {
            case 'SRG': isConfigured = this.srgMappings.length > 0; break;
            case 'Network': isConfigured = this.networkRules.length > 0; break;
            case 'Host': isConfigured = this.hostRules.length > 0; break;
            case 'Database': isConfigured = this.dbRules.length > 0; break;
            default: isConfigured = true;
          }
        } else {
          isConfigured = true;
        }
      } else {
        isConfigured = true;
      }

      if (!isConfigured) {
        Swal.fire({ icon: 'error', title: 'Configuration Error', text: `Product "${product}" is selected but not configured. Please assign at least one item or remove the product.` });
        return;
      }
    }

    if (this.selectedProducts.includes('SRG')) {
      const srgSet = new Set();
      for (const mapping of this.srgMappings) {
        if (!mapping.appId || !mapping.subFeatureID) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please complete all SRG Mapping fields or remove incomplete rows' });
          return;
        }
        const key = `${mapping.appId}-${mapping.subFeatureID}`;
        if (srgSet.has(key)) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate SRG Mapping found. Please select differently or remove the duplicate row.' });
          return;
        }
        srgSet.add(key);
      }
    }

    if (this.selectedProducts.includes('Network')) {
      const networkSet = new Set();
      for (const rule of this.networkRules) {
        if (!rule.appId || !rule.hostId) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please complete all Network Mapping fields or remove incomplete rows' });
          return;
        }
        const key = `${rule.appId}-${rule.hostId}`;
        if (networkSet.has(key)) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Network Mapping found. Please select differently or remove the duplicate row.' });
          return;
        }
        networkSet.add(key);
      }
    }

    if (this.selectedProducts.includes('Host')) {
      const hostSet = new Set();
      for (const rule of this.hostRules) {
        if (!rule.osType || !rule.appId || !rule.ipRange) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please complete all Host Access Table fields or remove incomplete rows' });
          return;
        }
        const key = `${rule.osType}-${rule.appId}-${rule.ipRange}`;
        if (hostSet.has(key)) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Host Access rule found. Please select differently or remove the duplicate row.' });
          return;
        }
        hostSet.add(key);
      }
    }

    if (this.selectedProducts.includes('Database')) {
      const dbSet = new Set();
      for (const rule of this.dbRules) {
        if (!rule.dbType || !rule.connectionId || !rule.privilege) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please complete all Database Access Table fields or remove incomplete rows' });
          return;
        }
        const key = `${rule.dbType}-${rule.connectionId}-${rule.privilege}`;
        if (dbSet.has(key)) {
          Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Duplicate Database Access rule found. Please select differently or remove the duplicate row.' });
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

    const istDateString = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date()).replace(' ', 'T') + '.000Z';

    const roleData: any = {
      roleName: this.roleName,
      roleDescription: this.description,
      productCount: this.selectedProducts.length,
      featureCount: this.selectedFeatures.length,
      createdOn: null,
      createdBy: null,
      updatedOn: istDateString,
      updatedBy: currentUserName,
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
      dbRules: this.dbRules,
      softwareMeteringAssigned: this.smRules.map(r => ({
        zoneId: r.zoneId ? Number(r.zoneId) : null,
        teamId: r.groupId ? Number(r.groupId) : null
      })),
      sessionDTO: {
        ...this.authService.currentUserValue?.sessionDTO,
        featureName: 'Configuration',
        menu: 'Admin Config',
        configTab: 'Role',
        requestURI: '/admin-config/role',
        userId: currentUserName,
      }
    };

    // In APM mode, we keep infrastructure rules if they have data to ensure syncing
    if (this.tool !== 'ORC') {
      if (!roleData.srgMappings?.length) delete roleData.srgMappings;
      if (!roleData.networkRules?.length) delete roleData.networkRules;
      if (!roleData.softwareMeteringAssigned?.length) delete roleData.softwareMeteringAssigned;
    }

    // Defensive Sanitization: Features must not contain Products
    roleData.selectedFeatures = roleData.selectedFeatures.filter((f: string) => !roleData.selectedProducts.includes(f));

    delete roleData.dbRules;

    const safePayload = this.sanitizationService.sanitizePayload(roleData);
    if (this.isEditMode && this.roleId) {
      safePayload.roleId = this.roleId;
      safePayload.id = this.roleId;
      this.applicationService.updateCustomRole(safePayload).subscribe({
        next: (response: any) => {
          if (response?.serviceStatus === 'Success') {
            Swal.fire({ icon: 'success', title: 'Success', text: 'Role Updated Successfully!' });
            this.navigateToManagement();
          } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error updating role: ' + (response.serviceError || 'Unknown error') });
          }
        },
        error: (error: any) => {
          console.error('Error in updateCustomRole:', error);
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update Role.' });
        }
      });
    } else {
      this.applicationService.createCustomRole(safePayload).subscribe({
        next: (response: any) => {
          if (response?.serviceStatus === 'Success') {
            Swal.fire({ icon: 'success', title: 'Success', text: 'Role Configuration Saved Successfully!' });
            this.navigateToManagement();
          } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error saving role: ' + (response.serviceError || 'Unknown error') });
          }
        },
        error: (error: any) => {
          console.error('Error in createCustomRole:', error);
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save Role Configuration.' });
        }
      });
    }
  }

  navigateToManagement() {
    this.router.navigate(['/admin-config/role/role-management']);
  }

  fetchSoftwareMeteringZones() {
    const payload = {
      ...this.currentUser,
      sessionDTO: this.currentUser?.sessionDTO || {}
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    this.applicationService.getSoftwareMeteringZoneAndTeamList(safePayload as any).subscribe({
      next: (response: any) => {
        if (response && response.serviceStatus === 'Success' && response.serviceResponse) {
          this.softwareMeteringZones = response.serviceResponse;
          console.log('Software Metering Zones loaded:', this.softwareMeteringZones);
          // Force resolution of any existing rules now that zones are available
          this.smRules.forEach((_, i) => this.onSmZoneChange(i, true));
        }
      },
      error: (err) => console.error('Error fetching Software Metering zones:', err)
    });
  }

  smAddRule() {
    this.smRules.push({ zoneId: null, zoneName: '', groupId: null, groupList: [] });
  }

  smRemoveRule(index: number) {
    this.smRules.splice(index, 1);
  }

  onSmZoneChange(index: number, skipReset: boolean = false) {
    const rule = this.smRules[index];
    if (!skipReset) {
      rule.groupId = null;
    }

    if (rule.zoneId) {
      // API response uses 'id' and 'name'
      const selectedZone = this.softwareMeteringZones.find(z => Number(z.id) === Number(rule.zoneId));
      if (selectedZone) {
        rule.zoneName = selectedZone.name;
        rule.groupList = selectedZone.groups || [];
      } else {
        rule.groupList = [];
      }
    } else {
      rule.groupList = [];
    }
  }

  checkDuplicateSm(index: number) {
    const current = this.smRules[index];
    if (!current.zoneId || !current.groupId) return;
    const isDup = this.smRules.some((r, i) => i !== index && Number(r.zoneId) === Number(current.zoneId) && Number(r.groupId) === Number(current.groupId));
    if (isDup) {
      Swal.fire({ icon: 'error', title: 'Duplicate Rule', text: 'This Zone and Group mapping already exists.' });
      setTimeout(() => current.groupId = null, 0);
    }
  }


  fetchProductsAndFeatures() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.roleService.findProducts(user.userId, user.userType).subscribe({
        next: (response: any) => {
          if (response?.products && response?.features) {
            this.availableProducts = response.products;
            this.availableFeatures = [...new Set<string>(response.features)];
          } else {
            console.warn('Invalid response format from findProducts API');
          }
        },
        error: (error: any) => console.error('Error fetching products and features:', error)
      });
    }
  }
}
