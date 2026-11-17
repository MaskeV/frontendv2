import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../../../services/application.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { ResourceMappingService } from '../../../../services/resource-mapping.service';
import Swal from 'sweetalert2';
import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';

interface DbMapping {
  db_type: 'Relational' | 'Non-Relational' | null;
  db_tech_type: string | null;
  db_id: number | null;
  db_sub_tech_type: string | null;
  db_infra_id: number | null;
  db_ip_id?: number | null; // Keep optional for internal use

  // UI helper lists per DB connection
  subTechList?: any[];
  dbAppList?: any[];
  dbHostList?: any[];
  dbIpList?: any[];
  dbIpListData?: any[]; // For automated mapping [NEW]
}

interface MappingRow {
  id?: number;
  app_id: number | null;
  app_tech_type: string | null;  // Mandatory
  app_infra_id: number | null;   // Mandatory (Host/IP)
  app_ip_id?: number | null;      // Optional legacy

  db_mappings: DbMapping[];      // Optional/Repeatable [NEW]

  // UI helper lists for the main application
  appTechList?: any[];
  appHostList?: any[];
  appIpList?: any[];
}

@Component({
    selector: 'app-resource-mapping',
    imports: [CommonModule, FormsModule, SanitizeInputDirective],
    templateUrl: './resource-mapping.component.html',
    styleUrls: ['./resource-mapping.component.css']
})
export class ResourceMappingComponent implements OnInit {

  mappingRows: MappingRow[] = [];
  editRow: MappingRow | null = null;

  // Global dropdown data
  applicationList: any[] = [];
  hostList: any[] = [];
  appTechList: any[] = [];
  hostTechList: any[] = [];
  globalIpList: any[] = []; // Unified IP list for auto-mapping [NEW]

  currentView: 'form' | 'table' | 'update' = 'form';
  tool: string = 'APM';

  // Pagination
  p: number = 1;
  itemsPerPage: number = 10;  // Always keep as number (select returns strings — parse on change)
  Math = Math;

  paginatedMappings: any[] = [];
  groupedMappings: any[] = [];
  allMappings: any[] = [];

  // Search and Sort
  filteredMappings: any[] = [];
  searchText: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  sortParam: string = '';

  // Modal state
  isDbModalOpen: boolean = false;
  selectedDbDetails: any[] = [];
  selectedMappingTitle: string = '';
  selectedMappingGroup: any = null;

  get totalPages(): number {
    const perPage = +this.itemsPerPage || 10;
    const total = this.filteredMappings?.length || 0;
    return total === 0 ? 1 : Math.ceil(total / perPage);
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

  constructor(
    private applicationService: ApplicationService,
    private authService: AuthenticationService,
    private resourceMappingService: ResourceMappingService
  ) { }

  ngOnInit(): void {
    this.groupMappings();
    this.tool = sessionStorage.getItem('tool') || '';
    this.fetchInitialData();
    this.getAllResourceMappings();
    // Start with one empty row if none exist
    if (this.mappingRows.length === 0) {
      this.addNewRow();
    }
  }

  fetchInitialData() {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;

    // Fetch Applications (Service)
    this.applicationService.getFullApplicationData(currentUser.userId, 'Service', currentUser.sessionDTO).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          this.applicationList = res.serviceResponse.applications || [];
          this.globalIpList = res.serviceResponse.ipList || []; // Store for mapping
        }
      },
      error: (err) => console.error('Error fetching applications:', err)
    });

    // Fetch Application Technologies
    this.applicationService.getTechnologyBySubFeature('Service').subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          this.appTechList = res.serviceResponse || [];
        }
      },
      error: (err) => console.error('Error fetching app technologies:', err)
    });

    // Fetch Host Technologies
    this.applicationService.getTechnologyBySubFeature('Host').subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          this.hostTechList = res.serviceResponse || [];
        }
      },
      error: (err) => console.error('Error fetching host technologies:', err)
    });
  }

  addNewRow() {
    this.mappingRows = [{
      app_id: null,
      app_tech_type: 'LINUX',
      app_infra_id: null,
      app_ip_id: null,
      db_mappings: [{
        db_type: 'Relational',
        db_tech_type: null,
        db_id: null,
        db_sub_tech_type: 'LINUX',
        db_infra_id: null,
        db_ip_id: null,
        subTechList: [],
        dbAppList: [],
        dbHostList: [],
        dbIpList: []
      }],
      appTechList: [],
      appHostList: [],
      appIpList: []
    }];
    this.onAppTechChange(0);
    this.onDbTypeChange(0, 0);
    this.onDbHostTechChange(0, 0);
  }

  addDbMapping(rowIndex: number = 0) {
    const target = this.currentView === 'update' ? this.editRow : this.mappingRows[rowIndex];
    if (!target) return;

    target.db_mappings.push({
      db_type: 'Relational',
      db_tech_type: null,
      db_id: null,
      db_sub_tech_type: 'LINUX',
      db_infra_id: null,
      db_ip_id: null,
      subTechList: [],
      dbAppList: [],
      dbHostList: [],
      dbIpList: []
    });
    const newIndex = target.db_mappings.length - 1;
    if (this.currentView === 'update') {
      this.onEditDbTypeChange(newIndex);
      this.onEditDbHostTechChange(newIndex);
    } else {
      this.onDbTypeChange(rowIndex, newIndex);
      this.onDbHostTechChange(rowIndex, newIndex);
    }
  }

  removeDbMapping(dbIndex: number, rowIndex: number = 0) {
    const target = this.currentView === 'update' ? this.editRow : this.mappingRows[rowIndex];
    if (target) {
      target.db_mappings.splice(dbIndex, 1);
    }
  }

  getDbFeatureType(dbType: string | null): string {
    if (!dbType) return 'DataBase';
    const normalized = dbType.toLowerCase();
    if (normalized === 'relational') return 'Relational';
    if (normalized === 'non-relational' || normalized === 'non_relational') return 'Non Relational';
    return 'DataBase';
  }

  onDbTypeChange(rowIndex: number, dbIndex: number) {
    const db = this.mappingRows[rowIndex]?.db_mappings[dbIndex];
    if (!db) return;
    db.db_tech_type = null;
    db.db_id = null;
    db.subTechList = [];
    db.dbAppList = [];
    if (db.db_type) {
      this.applicationService.getTechnologyBySubFeature(db.db_type).subscribe({
        next: (res: any) => db.subTechList = res.serviceResponse || []
      });
    }
  }

  onTechTypeChange(rowIndex: number, dbIndex: number) {
    const db = this.mappingRows[rowIndex]?.db_mappings[dbIndex];
    if (!db) return;
    db.db_id = null;
    db.dbAppList = [];
    if (db.db_tech_type) {
      const featureType = this.getDbFeatureType(db.db_type);
      const currentUser = this.authService.currentUserValue;
      if (currentUser) {
        this.applicationService.getFullApplicationData(currentUser.userId, featureType, currentUser.sessionDTO, db.db_tech_type || undefined).subscribe({
          next: (res: any) => {
            db.dbAppList = res.serviceResponse.applications || [];
            db.dbIpListData = res.serviceResponse.ipList || [];
          }
        });
      }
    }
  }

  onAppChange(index: number) {
    const row = this.mappingRows?.[index];
    if (!row || !row.app_id) return;

    // Find in globalIpList
    const ipData = this.globalIpList?.find(ip => ip.applicationId == row.app_id);
    if (ipData && ipData.ipType === 'Application') {
      const ipId = ipData.ipId || ipData.ipAddressId;
      row.app_infra_id = ipId;
      row.app_ip_id = ipId; // Pre-select IP [NEW]
      // Fetch details for the auto-selected host
      this.onAppHostChange(index);
    }
  }

  onDbChange(rowIndex: number, dbIndex: number) {
    const db = this.mappingRows?.[rowIndex]?.db_mappings?.[dbIndex];
    if (!db || !db.db_id) return;

    // Find in dbIpListData
    const ipData = db.dbIpListData?.find((ip: any) => ip.applicationId == db.db_id);
    if (ipData && ipData.ipType === 'DB') {
      const ipId = ipData.ipId || ipData.ipAddressId;
      db.db_infra_id = ipId;
      db.db_ip_id = ipId; // Pre-select IP [NEW]
      // Fetch details for the auto-selected host
      this.onDbHostChange(rowIndex, dbIndex);
    }
  }

  onAppTechChange(index: number) {
    const row = this.mappingRows[index];
    if (!row) return;
    row.app_infra_id = null;
    row.appHostList = [];

    if (row.app_tech_type) {
      const currentUser = this.authService.currentUserValue;
      if (!currentUser) return;
      this.applicationService.getFullApplicationData(currentUser.userId, 'Host', currentUser.sessionDTO, row.app_tech_type || undefined).subscribe({
        next: (res: any) => {
          row.appHostList = res.serviceResponse.applications || res.serviceResponse.ipList || [];
          row.app_infra_id = null;
          row.app_ip_id = null;
          row.appIpList = [];
        },
        error: () => row.appHostList = []
      });
    }
  }

  onAppHostChange(index: number) {
    const row = this.mappingRows[index];
    if (!row) return;
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;
    this.applicationService.getFullApplicationData(currentUser.userId, 'Host', currentUser.sessionDTO, row.app_tech_type || undefined, row.app_infra_id || undefined).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          const ipList = res.serviceResponse.ipList || [];
          row.appIpList = ipList;
          // Auto-select IP if available (requested mapping)
          if (ipList.length > 0) {
            const firstIp = ipList[0];
            row.app_ip_id = firstIp.ipId || firstIp.ipAddressId;
          }
        }
      },
      error: () => row.appIpList = []
    });
  }

  onDbHostTechChange(rowIndex: number, dbIndex: number) {
    const db = this.mappingRows[rowIndex]?.db_mappings[dbIndex];
    if (!db) return;
    db.dbHostList = [];
    if (db.db_sub_tech_type) {
      const currentUser = this.authService.currentUserValue;
      if (!currentUser) return;
      this.applicationService.getFullApplicationData(currentUser.userId, 'Host', currentUser.sessionDTO, db.db_sub_tech_type || undefined).subscribe({
        next: (res: any) => {
          db.dbHostList = res.serviceResponse.applications || res.serviceResponse.ipList || [];
          db.db_infra_id = null;
          db.db_ip_id = null;
          db.dbIpList = [];
        },
        error: () => db.dbHostList = []
      });
    }
  }

  onDbHostChange(rowIndex: number, dbIndex: number) {
    const db = this.mappingRows[rowIndex]?.db_mappings[dbIndex];
    if (!db) return;
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || !db.db_infra_id) return;

    this.applicationService.getFullApplicationData(currentUser.userId, 'Host', currentUser.sessionDTO, db.db_sub_tech_type || undefined, db.db_infra_id || undefined).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          db.dbIpList = res.serviceResponse.ipList || [];
          // Auto-select IP if available (requested mapping)
          if (db.dbIpList && db.dbIpList.length > 0) {
            const firstIp = db.dbIpList[0];
            db.db_ip_id = firstIp.ipId || firstIp.ipAddressId;
          }
          if (!db.db_ip_id) db.db_ip_id = null;
        }
      },
      error: () => db.dbIpList = []
    });
  }

  checkDuplicate(index: number) {
    const current = this.mappingRows[index];
    if (!current || !current.app_id || !current.app_infra_id) return;

    const isDuplicate = this.mappingRows.some((row, i) => {
      return i !== index &&
        row.app_id === current.app_id &&
        row.app_infra_id === current.app_infra_id;
    });

    if (isDuplicate) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'This application mapping already exists in another row.'
      });
    }
  }

  seeAllMappings() {
    this.showTable();
  }

  showTable() {
    this.currentView = 'table';
    this.p = 1;
    this.searchText = '';
    this.filteredMappings = [...this.groupedMappings];
    this.updatePaginatedMappings();
  }

  showForm() {
    this.currentView = 'form';
    this.addNewRow(); // Reset to fresh row for creation
  }

  openEdit(m: any, dbEntry?: any) {
    this.currentView = 'update';
    if (this.isDbModalOpen) this.closeDbModal();

    const mappingId = dbEntry ? dbEntry.id : (m.dbDetails && m.dbDetails.length > 0 ? m.dbDetails[0].id : null);

    if (mappingId) {
      const currentUser = this.authService.currentUserValue;
      if (!currentUser) return;

      const payload = {
        id: mappingId,
        portalUserDTO: currentUser,
        sessionDTO: currentUser.sessionDTO || {}
      };

      this.resourceMappingService.getAppDbInfraMapById(payload).subscribe({
        next: (res: any) => {
          if (res?.serviceStatus === 'Success') {
            this.populateEditFormFromRecord(res.serviceResponse);
          } else {
            // Fallback to local data if API fails
            this.populateEditFormLocally(m, dbEntry);
          }
        },
        error: () => this.populateEditFormLocally(m, dbEntry)
      });
    } else {
      this.populateEditFormLocally(m, dbEntry);
    }
  }

  populateEditFormFromRecord(data: any) {
    console.log('Populating form from record(s):', data);
    
    // Handle both single record and list of records (Group)
    const records = Array.isArray(data) ? data : [data];
    if (records.length === 0) return;
    
    // Use the first record for Application and Host info (they share these)
    const first = records[0];
    
    // Normalize Section 2 Tech Type from Host info
    const hostTech = (first.appInfra?.apm?.applicationDetails?.techstack || first.appInfra?.ipType || 'LINUX').toUpperCase();

    this.editRow = {
      id: first.id, // Primary ID for the group/first record
      app_id: first.application?.appID,
      app_tech_type: hostTech,
      app_infra_id: first.appInfra?.apm?.appID || null,
      app_ip_id: first.appInfra?.ipAddrID || null,
      db_mappings: records.map(record => {
        // Normalize Section 3 (DB) Host Tech Type
        let dbHostTechRaw = record.dbInfra?.apm?.applicationDetails?.techstack || record.dbInfra?.ipType || (record.dbInfra?.ipAddress ? 'LINUX' : 'Internal');
        let dbHostTechNormalized = dbHostTechRaw.toUpperCase() === 'INTERNAL' ? 'Internal' : dbHostTechRaw.toUpperCase();

        // Normalize DB Type
        let rawDbType = record.database?.applicationType || 'Relational';
        let normalizedDbType: 'Relational' | 'Non-Relational' = 'Relational';
        if (rawDbType.toUpperCase().includes('NON')) normalizedDbType = 'Non-Relational';

        return {
          id: record.id,
          db_type: normalizedDbType,
          db_tech_type: record.database?.technologyTypeId?.toString() || null, 
          db_id: record.database?.appID,
          db_sub_tech_type: dbHostTechNormalized,
          db_infra_id: record.dbInfra?.apm?.appID || null,
          db_ip_id: record.dbInfra?.ipAddrID || null,
          subTechList: [],
          dbAppList: [],
          dbHostList: [],
          dbIpList: []
        };
      }),
      appTechList: [],
      appHostList: [],
      appIpList: []
    };

    this.populateEditLists();
  }

  populateEditFormLocally(m: any, dbEntry?: any) {
    this.editRow = {
      id: dbEntry ? dbEntry.id : null,
      app_id: m.app_id,
      app_tech_type: m.app_tech_type || 'LINUX',
      app_infra_id: m.app_infra_id,
      app_ip_id: m.app_ip_id || null,
      db_mappings: dbEntry ? [
        {
          db_type: dbEntry.db_type || 'Relational',
          db_tech_type: dbEntry.db_tech_type || null,
          db_id: dbEntry.db_id,
          db_sub_tech_type: dbEntry.db_sub_tech_type || 'LINUX',
          db_infra_id: dbEntry.db_infra_id,
          db_ip_id: dbEntry.db_ip_id || null,
          subTechList: [],
          dbAppList: [],
          dbHostList: [],
          dbIpList: []
        }
      ] : (m.dbDetails || []).map((db: any) => ({
        db_type: db.db_type || 'Relational',
        db_tech_type: db.db_tech_type || null,
        db_id: db.db_id,
        db_sub_tech_type: db.db_sub_tech_type || 'LINUX',
        db_infra_id: db.db_infra_id,
        db_ip_id: db.db_ip_id || null,
        subTechList: [],
        dbAppList: [],
        dbHostList: [],
        dbIpList: []
      })),
      appTechList: [],
      appHostList: [],
      appIpList: []
    };
    this.populateEditLists();
  }

  populateEditLists() {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || !this.editRow) return;

    // 1. App Level Population
    if (this.editRow.app_tech_type) {
      this.onEditAppTechChange();
    }

    // 2. Database Level Population
    this.editRow.db_mappings.forEach((db, idx) => {
      if (db.db_type) {
        this.applicationService.getTechnologyBySubFeature(db.db_type.toUpperCase()).subscribe({
          next: (res: any) => {
            if (res?.serviceStatus === 'Success' && this.editRow) {
              db.subTechList = res.serviceResponse || [];
              
              // Resolve tech name from ID if needed
              if (db.db_tech_type && !isNaN(Number(db.db_tech_type)) && db.subTechList) {
                const found = db.subTechList.find((t: any) => t.id == db.db_tech_type);
                if (found) {
                  db.db_tech_type = found.technologyType;
                }
              }

              if (db.db_tech_type) {
                this.onEditDbTechChange(idx);
              }
            }
          }
        });
      }
    });
  }

  onEditAppTechChange() {
    if (!this.editRow || !this.editRow.app_tech_type) return;
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;
    this.applicationService.getFullApplicationData(currentUser.userId, 'Host', currentUser.sessionDTO, this.editRow.app_tech_type || undefined).subscribe({
      next: (res: any) => {
        if (this.editRow && res?.serviceStatus === 'Success') {
          this.editRow.appHostList = res.serviceResponse.applications || res.serviceResponse.ipList || [];
          if (this.editRow.app_infra_id) {
            this.onEditAppHostChange();
          }
        }
      }
    });
  }

  onEditAppHostChange() {
    if (!this.editRow || !this.editRow.app_infra_id) return;
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;
    this.applicationService.getFullApplicationData(currentUser.userId, 'Host', currentUser.sessionDTO, this.editRow.app_tech_type || undefined, this.editRow.app_infra_id || undefined).subscribe({
      next: (res: any) => {
        if (this.editRow && res?.serviceStatus === 'Success') {
          this.editRow.appIpList = res.serviceResponse.ipList || [];
          // Pre-populate IP if available and matching selected IP
          if (this.editRow.appIpList && this.editRow.appIpList.length > 0 && !this.editRow.app_ip_id) {
            const firstIp = this.editRow.appIpList[0];
            this.editRow.app_ip_id = firstIp.ipId || firstIp.ipAddressId;
          }
        }
      }
    });
  }

  onEditDbTypeChange(dbIndex: number) {
    if (!this.editRow) return;
    const db = this.editRow.db_mappings[dbIndex];
    if (!db) return;
    db.db_tech_type = null;
    db.db_id = null;
    db.subTechList = [];
    db.dbAppList = [];
    if (db.db_type) {
      this.applicationService.getTechnologyBySubFeature(db.db_type).subscribe({
        next: (res: any) => {
          if (res?.serviceStatus === 'Success') db.subTechList = res.serviceResponse || [];
        }
      });
    }
  }

  onEditDbChange(dbIndex: number) {
    if (!this.editRow) return;
    const db = this.editRow.db_mappings[dbIndex];
    if (!db || !db.db_id) return;

    // Check if we can auto-select Host/IP for this DB (matching onDbChange logic)
    // We already have dbAppList from onEditDbTechChange, but we might need the IP/Host association
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
       this.applicationService.getFullApplicationData(currentUser.userId, this.getDbFeatureType(db.db_type), currentUser.sessionDTO, db.db_tech_type || undefined).subscribe({
         next: (res: any) => {
           const apps = res.serviceResponse.applications || [];
           const selectedApp = apps.find((a: any) => a.applicationId == db.db_id);
           // In this specific UI, we usually wait for user to select Host Tech Type
           // but if the app is already mapped to a host, we could pre-fetch it.
           // For now, just ensuring the lists are ready.
         }
       });
    }
  }

  onEditDbTechChange(dbIndex: number) {
    if (!this.editRow) return;
    const db = this.editRow.db_mappings[dbIndex];
    if (!db || !db.db_tech_type) return;
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;

    // Use getDbFeatureType to match creation flow and ensure list matches
    const featureType = this.getDbFeatureType(db.db_type);
    this.applicationService.getFullApplicationData(currentUser.userId, featureType, currentUser.sessionDTO, db.db_tech_type || undefined).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          db.dbAppList = res.serviceResponse.applications || res.serviceResponse.ipList || [];
          if (db.db_id) {
            this.onEditDbHostTechChange(dbIndex);
          }
        }
      }
    });
  }

  onEditDbHostTechChange(dbIndex: number) {
    if (!this.editRow) return;
    const db = this.editRow.db_mappings[dbIndex];
    if (!db || !db.db_sub_tech_type) return;
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;

    this.applicationService.getFullApplicationData(currentUser.userId, 'Host', currentUser.sessionDTO, db.db_sub_tech_type || undefined).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          db.dbHostList = res.serviceResponse.applications || res.serviceResponse.ipList || [];
          if (db.db_infra_id) {
            this.onEditDbHostChange(dbIndex);
          }
        }
      }
    });
  }

  onEditDbHostChange(dbIndex: number) {
    if (!this.editRow) return;
    const db = this.editRow.db_mappings[dbIndex];
    if (!db || !db.db_infra_id) return;
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;

    this.applicationService.getFullApplicationData(currentUser.userId, 'Host', currentUser.sessionDTO, db.db_sub_tech_type || undefined, db.db_infra_id || undefined).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          db.dbIpList = res.serviceResponse.ipList || [];
          if (db.dbIpList && db.dbIpList.length > 0 && !db.db_ip_id) {
            const firstIp = db.dbIpList[0];
            db.db_ip_id = firstIp.ipId || firstIp.ipAddressId;
          }
        }
      }
    });
  }

  updateConfiguration() {
    if (!this.editRow) return;

    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;

    // Section 1 & 2 Validation
    if (!this.editRow.app_id || !this.editRow.app_tech_type || !this.editRow.app_infra_id || !this.editRow.app_ip_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Fields Missing',
        text: 'Please fill all mandatory fields in Section 1 and Section 2 (Primary Application & Infrastructure).',
        confirmButtonColor: '#f26321'
      });
      return;
    }

    const payload = {
      id: this.editRow.id,
      appId: this.editRow.app_id,
      appInfraId: this.editRow.app_ip_id || this.editRow.app_infra_id,
      dbMap: this.editRow.db_mappings.map((db: any) => ({
        dbId: db.db_id,
        dbInfraId: db.db_ip_id || db.db_infra_id
      })),
      portalUserDTO: currentUser,
      sessionDTO: currentUser.sessionDTO || {}
    };

    Swal.fire({
      title: 'Updating...',
      didOpen: () => Swal.showLoading()
    });

    this.resourceMappingService.updateAppDbInfraMap(payload).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          Swal.fire({
            icon: 'success',
            title: 'Update Successful',
            text: 'The resource mapping has been updated successfully!',
            confirmButtonColor: '#f26321'
          }).then(() => {
            this.showTable();
            this.getAllResourceMappings();
          });
        } else {
          Swal.fire('Error', res?.serviceResponse || 'Failed to update mapping', 'error');
        }
      },
      error: (err: any) => {
        Swal.fire('Error', 'An error occurred while updating', 'error');
        console.error(err);
      }
    });
  }

  onPageSizeChange(event: any) {
    // event may be the old value (from template binding) or a DOM Event — handle both
    const raw = event?.target?.value ?? event;
    const parsed = parseInt(raw, 10);
    this.itemsPerPage = isNaN(parsed) || parsed < 1 ? 10 : parsed;
    this.p = 1;
    this.updatePaginatedMappings();
  }

  updatePaginatedMappings() {
    const startIndex = (this.p - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedMappings = this.filteredMappings.slice(startIndex, endIndex);
  }

  search() {
    const term = this.searchText.toLowerCase().trim();
    if (!term) {
      this.filteredMappings = [...this.groupedMappings];
    } else {
      this.filteredMappings = this.groupedMappings.filter(m =>
        (m.applicationName?.toLowerCase().includes(term)) ||
        (m.hostName?.toLowerCase().includes(term))
      );
    }
    this.p = 1;
    this.updatePaginatedMappings();
  }

  nextPage() {
    if (this.p < this.totalPages) {
      this.p++;
      this.updatePaginatedMappings();
    }
  }

  prevPage() {
    if (this.p > 1) {
      this.p--;
      this.updatePaginatedMappings();
    }
  }

  goToPage(page: number) {
    this.p = page;
    this.updatePaginatedMappings();
  }

  sortBy(column: string) {
    if (this.sortParam === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortParam = column;
      this.sortDirection = 'asc';
    }

    this.filteredMappings.sort((a: any, b: any) => {
      let valA = a[column];
      let valB = b[column];

      // Handle null/undefined
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
    this.updatePaginatedMappings();
  }

  getInitials(name: string): string {
    if (!name) return 'RM';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  saveConfiguration() {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || !this.mappingRows?.[0]) return;

    const firstRow = this.mappingRows[0];
    
    // Section 1 & 2 Validation
    if (!firstRow.app_id || !firstRow.app_tech_type || !firstRow.app_infra_id || !firstRow.app_ip_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Fields Missing',
        text: 'Please fill all mandatory fields in Section 1 and Section 2 (Primary Application & Infrastructure).',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    const payload = {
      appId: firstRow.app_id,
      appInfraId: firstRow.app_ip_id || firstRow.app_infra_id,
      dbMap: (firstRow.db_mappings || []).map(db => ({
        dbId: db.db_id,
        dbInfraId: db.db_ip_id || db.db_infra_id
      })),
      portalUserDTO: currentUser,
      sessionDTO: currentUser.sessionDTO || {}
    };

    this.resourceMappingService.addAppDbInfraMap(payload).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Configuration saved successfully!',
            confirmButtonColor: '#2563eb' // Blue for Save
          }).then(() => {
            this.showTable();
            this.getAllResourceMappings();
          });
        } else {
          Swal.fire('Error', res?.serviceResponse || 'Failed to save configuration', 'error');
        }
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to save mappings', 'error');
        console.error(err);
      }
    });
  }

  getAllResourceMappings() {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;

    const payload = {
      portalUserDTO: currentUser,
      sessionDTO: currentUser.sessionDTO || {}
    };

    this.resourceMappingService.getAllAppDbInfraMap(payload).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          this.allMappings = res.serviceResponse || [];
          this.groupMappings();
        }
      },
      error: (err: any) => console.error('Error fetching mappings:', err)
    });
  }

  groupMappings() {
    const groups: { [key: string]: any } = {};
    this.allMappings.forEach(m => {
      const appName = m.application?.applicationName || 'N/A';
      const hostName = (m.appInfra?.apm?.applicationName || m.appInfra?.ipAddress) || 'Internal/None';
      const key = `${appName}_${hostName}`;

      if (!groups[key]) {
        groups[key] = {
          applicationName: appName,
          hostName: hostName,
          app_id: m.application?.appID,
          app_infra_id: m.appInfra?.ipAddrID,
          app_tech_type: m.application?.technologyTypeId || 'LINUX',
          app_ip_id: m.appInfra?.ipAddrID,
          dbDetails: []
        };
      }

      groups[key].dbDetails.push({
        id: m.id, // Unique mapping ID
        db_id: m.database?.appID,
        db_infra_id: m.dbInfra?.ipAddrID,
        db_type: m.database?.applicationType || 'Relational',
        db_tech_type: m.database?.technologyTypeId,
        db_sub_tech_type: m.dbInfra?.ipAddress ? 'LINUX' : 'Internal',
        dbName: m.database?.applicationName || 'N/A',
        dbHost: (m.dbInfra?.apm?.applicationName || m.dbInfra?.ipAddress) || 'Internal/None'
      });
    });

    this.groupedMappings = Object.values(groups);
    this.filteredMappings = [...this.groupedMappings];
    this.updatePaginatedMappings();
  }


  openDbModal(m: any) {
    this.selectedMappingTitle = `${m.applicationName} (${m.hostName})`;
    // Pass the whole group for reference in edit/delete
    this.selectedMappingGroup = m; 
    this.selectedDbDetails = m.dbDetails;
    this.isDbModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeDbModal() {
    this.isDbModalOpen = false;
    this.selectedDbDetails = [];
    document.body.style.overflow = 'auto';
  }

  deleteMapping(m: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb', // Blue for Delete
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const currentUser = this.authService.currentUserValue;
        if (!currentUser) return;

        const payload = {
          id: m.id,
          appId: m.app_id,
          appInfraId: m.app_infra_id,
          portalUserDTO: currentUser,
          sessionDTO: currentUser.sessionDTO || {}
        };

        this.resourceMappingService.deleteAppDbInfraMap(payload).subscribe({
          next: (res: any) => {
            if (res?.serviceStatus === 'Success') {
              Swal.fire('Deleted!', 'Mapping has been deleted.', 'success');
              this.getAllResourceMappings();
            } else {
              Swal.fire('Error', res?.serviceResponse || 'Failed to delete', 'error');
            }
          }
        });
      }
    });
  }
}
