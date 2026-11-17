import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IpAddressConfigurationMaster } from '../../../../models/ip-address-configuration-master';
import { ApplicationMaster } from '../../../../models/application-master';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { ApplicationService } from '../../../../services/application.service';
import { first, from, switchMap } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserTypeCrudMapObject } from '../../../../models/UserTypeCrudMapObject';
import { DecoderService } from '../../../../services/decoder.service';
import { HttpErrorResponse } from '@angular/common/http';
import { indexPattern } from '../../../../models/indexPattern';
import * as bootstrap from 'bootstrap';
import { RoleService } from '../../../../services/role.service';
import { Product } from '../../../../models/Role';
import Swal from 'sweetalert2';

import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../services/sanitization.service';

@Component({
  selector: 'app-application-ip-mapping-new',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SanitizeInputDirective],
  templateUrl: './application-ip-mapping-new.component.html',
  styleUrl: './application-ip-mapping-new.component.css'
})
export class ApplicationIpMappingNewComponent implements OnInit {

  @ViewChild('alertTemplate', { static: true })
  alertTemplate!: TemplateRef<any>;

  @ViewChild('deleteConfirmTemplate', { static: true })
  deleteConfirmTemplate!: TemplateRef<any>;

  techType: string = "";
  node: string[] = [];
  nodeInputValue: string = '';

  ipObjArrayList: IpAddressConfigurationMaster[] = [];
  applicationIPobj = new ApplicationMaster();
  user = new User();
  sessionObject: Session = new Session();
  alertMessage: any;
  isError!: boolean;
  isSuccess!: boolean;
  regexIP: any = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
  userTypeCrudMap = new UserTypeCrudMapObject();
  currentUser = new User();
  showForm = true;
  showSuccessPreview = false;
  allApplications: any[] = [];
  allIPAddressMapping: any;
  tempindexPatternList: any[] = [];
  allIpMappings: any[] = [];
  selectedApplication: any;
  selectedAppIps: any[] = [];
  searchIp = '';
  searchControl = new FormControl('');
  showApplicationsTable = false;
  page = 1;
  pageSize = 10;
  pagedApplications: any[] = [];
  filteredApplications: any[] = [];
  totalPages = 1;
  modalSearchControl = new FormControl('');
  applicationOldName: any;
  isUpdation!: boolean;
  isNotApplicationUpdate!: boolean;
  applicationName: any;
  applicationID: any;
  indexPatternList: indexPattern[] = [];
  applicationType: string = "";
  showUpdateSuccess = false;
  availableProducts: Product[] = [];
  availableFeatures: any[] = [];
  availableTechnologies: any[] = [];
  showTechType: boolean = false;
  sortColumn: string = 'appID';
  sortDirection: 'asc' | 'desc' = 'desc';

  canCreate: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;


  protected Math = Math;
  pendingTechType: string | null = null;

  constructor(private fb: FormBuilder,
    private applicationIPConfigurationServiceService: ApplicationService,
    private modalService: NgbModal,
    private decoderService: DecoderService,
    private roleService: RoleService,
    private sanitizationService: SanitizationService
  ) { }

  appForm: FormGroup = this.fb.group({
    applicationName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9\s:._-]*$/)]],
    applicationType: ['', Validators.required],
    techType: [''],
    indexPatterns: this.fb.array([this.createIndexPattern()]),
    ipMappings: this.fb.array([this.createIpMapping()])
  });

  // store preview data
  createdApplication!: {
    applicationName: string;
    applicationType: string;
    indexPatterns: string[];
    ipMappings: {
      ipAddress: string;
      ipType: string;
      environment: string;
    }[];
  };


  ngOnInit(): void {

    // ---- USER ----
    const storedUser = sessionStorage.getItem('currentUser');
    this.user = storedUser
      ? this.decoderService.decryptJson(JSON.parse(storedUser)) as User
      : new User();


    // ---- CRUD PERMISSIONS (user ke andar se) ----
    const appIpMapping = (this.user as any)?.['crudData']?.['Admin-Config']?.['applicationIpMapping'];

    if (appIpMapping) {
      this.canCreate = this.decoderService.decryptJson(appIpMapping.create) === 'true';
      this.canEdit = this.decoderService.decryptJson(appIpMapping.edit) === 'true';
      this.canDelete = this.decoderService.decryptJson(appIpMapping.delete) === 'true';
    }

    // console.log('[ApplicationIpMapping] User:', this.user.userId, '|', this.user.userType);
    // console.log('[ApplicationIpMapping] Permissions → Create:', this.canCreate, '| Edit:', this.canEdit, '| Delete:', this.canDelete);



    // ---- SESSION OBJECT (THIS IS THE KEY FIX) ----
    this.sessionObject.featureName = 'Configuration';
    this.sessionObject.menu = 'Admin Config';
    this.sessionObject.configTab = 'Application & IP Mapping';
    this.sessionObject.requestURI = location.pathname;

    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');

    // Browser info (if loggerService exists)
    this.sessionObject.browserName = 'Chrome';
    this.sessionObject.browserVersion = '126';

    this.searchControl.valueChanges.subscribe(() => {
      this.applySearch();
    });
    this.fetchProductsAndFeatures();
    this.getAllApplications();
    this.getAllIPAddressMapping();

    this.appForm.get('applicationType')?.valueChanges.subscribe((value) => {
      if (value) {
        this.fetchTechnologies(value);
      } else {
        this.showTechType = false;
        this.availableTechnologies = [];
        this.appForm.get('techType')?.setValue('');
      }
    });

    // When techType changes and applicationType is Host, auto-set ipType on all IP mappings
    this.appForm.get('techType')?.valueChanges.subscribe((techValue) => {
      const appType = this.appForm.get('applicationType')?.value;
      if (appType === 'Host' && techValue) {
        this.ipMappings.controls.forEach((control) => {
          control.get('ipType')?.setValue(techValue);
        });
      }
    });
  }

  fetchTechnologies(subFeatureName: string) {
    this.applicationIPConfigurationServiceService.getTechnologyBySubFeature(subFeatureName).subscribe({
      next: (response: any) => {
        if (response && response.serviceStatus === 'Success') {
          this.availableTechnologies = response.serviceResponse || [];
          this.showTechType = this.availableTechnologies.length > 0;
          if (this.pendingTechType) {
            setTimeout(() => {
              this.appForm.patchValue({
                techType: this.pendingTechType
              });
              this.pendingTechType = null;
            }, 0);
          }
        } else {
          this.showTechType = false;
          this.availableTechnologies = [];
          this.appForm.get('techType')?.setValue('');
        }
      },
      error: (error) => {
        this.showTechType = false;
        this.availableTechnologies = [];
        this.appForm.get('techType')?.setValue('');
        console.error('Error fetching technologies:', error);
      }
    });
  }

  fetchProductsAndFeatures() {
    if (this.user) {
      const userId = this.user.userId;
      const userType = this.user.userType;

      this.roleService.findProducts(userId, userType).subscribe({
        next: (response: any) => {
          if (response && response.products) {
            this.availableProducts = response.products;
            this.availableFeatures = response.features;
          }
        },
        error: (error) => {
          console.error('Error fetching products and features:', error);
        }
      });
    }
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  applySearch() {
    const search = (this.searchControl.value || '').toLowerCase();

    let data = !search
      ? [...this.allApplications]
      : this.allApplications.filter(app => {
        const name = (app.applicationName || '').toLowerCase();
        const type = (app.applicationType || '').toLowerCase();
        const user = (app.createdByUserName || '').toLowerCase();
        const date = app.createdOn ? new Date(app.createdOn).toLocaleDateString('en-GB') : '';
        const ips = (app.ipAddresses || []).join(',').toLowerCase();

        return name.includes(search) ||
          type.includes(search) ||
          user.includes(search) ||
          date.includes(search) ||
          ips.includes(search);
      });

    if (this.sortColumn) {
      data.sort((a: any, b: any) => {
        let valA = a[this.sortColumn];
        let valB = b[this.sortColumn];

        if (this.sortColumn === 'createdOn') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        } else if (this.sortColumn === 'ipAddresses') {
          valA = (valA || []).join(',').toLowerCase();
          valB = (valB || []).join(',').toLowerCase();
        } else {
          valA = (valA || '').toString().toLowerCase();
          valB = (valB || '').toString().toLowerCase();
        }

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.filteredApplications = data;
    this.page = 1; // reset page on new search (UX win)
    this.updatePagination();
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySearch();
  }

  get ipMappings(): FormArray {
    return this.appForm.get('ipMappings') as FormArray;
  }

  createIpMapping(): FormGroup {
    return this.fb.group({
      ipAddress: ['', Validators.required],
      ipType: ['', Validators.required],
      environment: ['', Validators.required]
    });
  }

  get ipFormGroups(): FormGroup[] {
    return this.ipMappings.controls as FormGroup[];
  }

  get indexFormGroups(): FormGroup[] {
    return this.indexPatterns.controls as FormGroup[];
  }

  showTable(): void {
    this.showApplicationsTable = true;
    // hide form when table is visible
    this.showForm = false;
    this.showSuccessPreview = false;
    this.isUpdation = false;
    this.getAllApplications();
    this.getAllIPAddressMapping();
  }

  resetApplicationForm(): void {
    // reset the form state
    this.appForm.reset();

    // clear FormArrays safely
    this.ipMappings.clear();
    this.indexPatterns.clear();

    // re-initialize with one row each
    this.ipMappings.push(this.createIpMapping());
    this.indexPatterns.push(this.createIndexPattern());

    this.appForm.get('applicationType')?.enable();

    // reset validation state
    this.appForm.markAsPristine();
    this.appForm.markAsUntouched();

    // If discarding an update, return to the "See All" list
    if (this.isUpdation) {
      this.showTable();
    }
  }


  addIpMapping(): void {
    const newRow = this.createIpMapping();
    // Auto-fill ipType for Host applications
    const appType = this.appForm.get('applicationType')?.value;
    const techType = this.appForm.get('techType')?.value;
    if (appType === 'Host' && techType) {
      newRow.get('ipType')?.setValue(techType);
    }
    this.ipMappings.push(newRow);
  }

  removeIpMapping(index: number): void {
    this.ipMappings.removeAt(index);
  }

  get indexPatterns(): FormArray {
    return this.appForm.get('indexPatterns') as FormArray;
  }

  createIndexPattern(): FormGroup {
    return this.fb.group({
      pattern: ['']
    });
  }

  addIndexPattern(): void {
    this.indexPatterns.push(this.createIndexPattern());
  }

  removeIndexPattern(index: number): void {
    this.indexPatterns.removeAt(index);
  }

  createIPAddressMapping(): void {
    this.appForm.markAllAsTouched();
    if (this.appForm.invalid) {
      return;
    }
    const formValue = this.appForm.value;

    const applicationName = formValue.applicationName;
    const applicationType = formValue.applicationType;
    const techType = formValue.techType;
    const ipList = formValue.ipMappings || [];
    const indexList = formValue.indexPatterns || [];

    // Duplicate check
    let duplicateCheck = true;
    ipList.forEach((list: any) => {
      const arr = ipList.filter(
        (val: any) =>
          val.ipAddress === list.ipAddress &&
          val.ipType === list.ipType
      );
      if (arr.length > 1) {
        duplicateCheck = false;
      }
    });

    if (!duplicateCheck) {
      Swal.fire('Duplicate Entry', 'IP Address and IP Type cannot be duplicate !!', 'warning');
      return;
    }

    this.applicationIPobj = new ApplicationMaster();
    this.applicationIPobj.ipAddress = [];
    this.applicationIPobj.indexPatterns = [];

    ipList.forEach((ip: any) => {
      if (ip.ipAddress && ip.ipType && ip.environment) {
        let ipObj = new IpAddressConfigurationMaster();
        ipObj.ipAddrID = '';
        ipObj.ipAddress = ip.ipAddress;
        ipObj.ipType = ip.ipType;
        ipObj.environment = ip.environment;
        ipObj.sessionDTO = {} as Session;
        this.applicationIPobj.ipAddress.push(ipObj);
      }
    });

    indexList.forEach((idx: any) => {
      if (idx.pattern && idx.pattern.trim() !== '') {
        this.applicationIPobj.indexPatterns.push({
          indexPatternName: idx.pattern
        });
      }
    });

    if (this.applicationIPobj.ipAddress.length === 0) {
      Swal.fire('Validation Error', 'Kindly configure atleast one IP with the application !!', 'warning');
      return;
    }

    const trimmedAppName = (applicationName || '').trim();
    if (!this.validateAlphanumericUnderscore(trimmedAppName)) {
      Swal.fire('Format Error', "Application name should include alphabets, numbers, space, ':', '-', '.' and '_' only !! [V2]", 'warning');
      return;
    }

    this.applicationIPobj.createdBy = this.user.userId;
    this.applicationIPobj.applicationName = applicationName;
    if (applicationType === 'APM_APPLICATION') {
      this.applicationIPobj.applicationType = 'APM';
    } else if (applicationType === 'BROWSER_MONITORING') {
      this.applicationIPobj.applicationType = 'BROWSER';
    } else {
      this.applicationIPobj.applicationType = applicationType;
    }
    this.applicationIPobj.techType = techType;

    if (this.showTechType && this.availableTechnologies.length > 0) {
      const selectedTech = this.availableTechnologies.find(t => t.technologyType === techType);
      if (selectedTech) {
        this.applicationIPobj.technologyTypeId = selectedTech.id;
        this.applicationIPobj.technologyType = techType;
      }
    }

    this.applicationIPobj.nodes = applicationType === 'Kubernetes' ? this.node : [];
    this.sessionObject.applicationName = applicationName;
    this.applicationIPobj.sessionDTO = this.sessionObject;

    // Sanitize the entire payload right before sending it to the backend
    const safePayload = this.sanitizationService.sanitizePayload(this.applicationIPobj);

    this.applicationIPConfigurationServiceService
      .createApplicationIPConfiguration(safePayload)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus === 'Success') {
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'Application & IP address configured successfully !!',
            timer: 2000,
            showConfirmButton: false
          });

          // Automatically reset for a fresh page as requested
          this.createAnother();
          this.getAllIPAddressMapping();
        } else {
          Swal.fire('Error', response.serviceResponse, 'error');
        }
      }, (error) => {
        Swal.fire('Error', 'Failed to connect to the server', 'error');
      });
  }

  createAnother(): void {
    this.showSuccessPreview = false;
    this.showForm = true;

    this.appForm.reset();
    this.ipMappings.clear();
    this.indexPatterns.clear();

    this.addIpMapping();
    this.addIndexPattern();
  }

  openAlertMod(alertTemplate: TemplateRef<any>, message: any) {
    this.modalService.open(alertTemplate, { size: 'lg', backdrop: 'static' });
    this.alertMessage = message;
  }

  validateIP(ip: string) {
    if (ip) {
      const re = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
      return re.test(ip);
    }
    else {
      return true;
    }
  }

  validateAlphanumericUnderscore(value: string) {
    if (!value) return true;
    // Allows alphanumeric, spaces, colons, hyphens, dot and underscores
    const re = /^[a-zA-Z0-9\s:._-]*$/;
    return re.test(value);
  }

  checkValidationIPs(aIndex: number, ipAddress: string, ipType: string, ipEnv: string) {
    let isCheckDisabled = true;
    if ((aIndex + 1) == this.ipObjArrayList.length) {
      if (ipAddress && ipType && ipEnv) {
        if (aIndex) {
          for (let i = 0; i < (this.ipObjArrayList.length - 1); i++) {
            if (this.ipObjArrayList[i].ipAddress == ipAddress && this.ipObjArrayList[i].ipType == ipType) {
              isCheckDisabled = true;
              break;
            }
            else {
              isCheckDisabled = false;
            }
          }
        }
        else {
          isCheckDisabled = false;
        }
      }
      else {
        isCheckDisabled = true;
      }
    }
    else {
      isCheckDisabled = true;
    }
    return isCheckDisabled;
  }

  cancelRequest() {
    this.modalService.dismissAll();
  }

  getAllApplications() {
    // We keep this if needed by other logic, but we do NOT overwrite this.allApplications with string arrays
  }

  getAllIPAddressMapping() {
    const tool = sessionStorage.getItem('tool');
    this.applicationIPConfigurationServiceService.getAllApplicationIPConfigurations(this.sessionObject, tool).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      this.allIpMappings = (response.serviceResponse.applicationsList || []).map((item: any) => {
        return {
          ...item,
          createdByUserName: item.createdBy,
          apm: {
            appID: item.appId,
            applicationName: item.applicationName,
            applicationType: item.applicationType,
            createdOn: item.createdOn,
            createdByUserName: item.createdBy,
            technologyType: item.technologyType,
            technologyId: item.technologyId,
            technologyTypeId: item.technologyId,
            techType: item.technologyType
          }
        };
      });
      this.tempindexPatternList = response.serviceResponse.indexes;

      const uniqueApps = new Map();
      if (this.allIpMappings) {
        this.allIpMappings.forEach((ipObj: any) => {
          if (ipObj.apm && ipObj.apm.applicationName) {
            if (!uniqueApps.has(ipObj.apm.applicationName)) {
              let appData = { ...ipObj.apm, ipAddresses: [] };
              if (!appData.createdByUserName && ipObj.createdByUserName) {
                appData.createdByUserName = ipObj.createdByUserName;
              }
              uniqueApps.set(ipObj.apm.applicationName, appData);
            }
            if (ipObj.ipAddress) {
              uniqueApps.get(ipObj.apm.applicationName).ipAddresses.push(ipObj.ipAddress);
            }
          }
        });
      }
      this.allApplications = Array.from(uniqueApps.values()).sort((a: any, b: any) => b.appID - a.appID);
      this.filteredApplications = [...this.allApplications];
      this.page = 1;
      this.updatePagination();
    });
  }

  openIpDetails(app: any, template: TemplateRef<any>) {
    this.selectedApplication = app;

    this.selectedAppIps = this.allIpMappings.filter(
      ip => ip.apm?.appID === app.appID
    );

    this.searchIp = '';
    this.modalService.open(template, { size: 'lg', backdrop: 'static' });
  }

  filteredIps() {
    if (!this.searchIp) {
      return this.selectedAppIps;
    }

    const value = this.searchIp.toLowerCase();

    return this.selectedAppIps.filter(ip =>
      ip.ipAddress.toLowerCase().includes(value) ||
      ip.ipType.toLowerCase().includes(value) ||
      ip.environment.toLowerCase().includes(value)
    );
  }

  updatePagination() {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.pagedApplications = this.filteredApplications.slice(start, end);
    this.totalPages = Math.ceil(this.filteredApplications.length / this.pageSize);
  }


  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.updatePagination();
    }
  }

  openUpdateApplication(aObj: any) {
    // ---------------- UI STATE ----------------
    this.showForm = true;
    this.showApplicationsTable = false;
    this.showSuccessPreview = false;

    this.isUpdation = true;
    this.isNotApplicationUpdate = false;

    // ---------------- BASIC APP INFO ----------------
    this.applicationOldName = aObj.applicationName;
    this.applicationName = aObj.applicationName;

    let mappedAppType = aObj.applicationType;
    if (mappedAppType === 'APM') {
      mappedAppType = 'APM_APPLICATION';
    } else if (mappedAppType === 'BROWSER') {
      mappedAppType = 'BROWSER_MONITORING';
    }
    this.applicationType = mappedAppType;
    this.applicationID = aObj.appID;

    this.pendingTechType = aObj.technologyType || aObj.techType;

    // ---------------- PATCH MAIN FORM ----------------
    this.appForm.patchValue({
      applicationName: aObj.applicationName,
      applicationType: mappedAppType
    });

    if (aObj.technologyType || aObj.technologyTypeId) {
      setTimeout(() => {
        this.appForm.patchValue({
          techType: aObj.technologyType || aObj.techType
        });
      }, 500);
    }

    this.appForm.get('applicationType')?.disable();

    // ---------------- CLEAR FORM ARRAYS ----------------
    this.ipMappings.clear();
    this.indexPatterns.clear();

    // ---------------- IP MAPPINGS ----------------
    // IMPORTANT: use allIpMappings (correct source)
    const appIps = this.allIpMappings.filter(
      ip => ip.apm?.appID === aObj.appID
    );

    if (appIps.length > 0) {
      appIps.forEach(ip => {
        this.ipMappings.push(
          this.fb.group({
            ipAddress: [ip.ipAddress, Validators.required],
            ipType: [ip.ipType, Validators.required],
            environment: [ip.environment, Validators.required]
          })
        );
      });
    } else {
      // always keep at least one row
      this.ipMappings.push(this.createIpMapping());
    }

    // ---------------- INDEX PATTERNS ----------------
    this.indexPatternList = [];

    if (this.tempindexPatternList.length > 0) {
      for (let k = 0; k < this.tempindexPatternList.length; k++) {
        const arr = this.tempindexPatternList[k];
        for (let l = 0; l < arr.length; l++) {
          if (arr[l].applicationID === this.applicationID) {
            const obj = new indexPattern();
            obj.indexPatternName = arr[l].indexPattern;
            this.indexPatternList.push(obj);
          }
        }
      }
    }

    if (this.indexPatternList.length > 0) {
      this.indexPatternList.forEach(idx => {
        this.indexPatterns.push(
          this.fb.group({
            pattern: [idx.indexPatternName]
          })
        );
      });
    } else {
      this.indexPatterns.push(this.createIndexPattern());
    }

    // ---------------- FORM STATE ----------------
    this.appForm.markAsPristine();
    this.appForm.markAsUntouched();
  }

  updateApplicationIPMapping() {
    this.appForm.markAllAsTouched();

    if (this.appForm.invalid) {
      // Find which fields are invalid to help the user
      const invalidFields = [];
      const controls = this.appForm.controls;
      for (const name in controls) {
        if (controls[name].invalid) {
          invalidFields.push(name);
        }
      }

      // Also check FormArrays
      const ipArray = this.appForm.get('ipMappings') as FormArray;
      if (ipArray.invalid) invalidFields.push('IP Mappings');
      const idxArray = this.appForm.get('indexPatterns') as FormArray;
      if (idxArray.invalid) invalidFields.push('Index Patterns');

      Swal.fire('Form Invalid', `Please check the following fields: ${invalidFields.join(', ')}`, 'warning');
      return;
    }

    const formValue = this.appForm.getRawValue();

    // Map IP list
    const ipList = (formValue.ipMappings || []).map((ip: any) => {
      const obj = new IpAddressConfigurationMaster();
      obj.ipAddress = ip.ipAddress;
      obj.ipType = ip.ipType;
      obj.environment = ip.environment;
      return obj;
    });

    // Validation for Application Name (Update Flow)
    const newAppName = (formValue.applicationName || '').trim();
    if (!this.validateAlphanumericUnderscore(newAppName)) {
      Swal.fire('Format Error', "Application name should include alphabets, numbers, space, ':', '-', '.' and '_' only !! [V2]", 'warning');
      return;
    }

    // Manual Validation for Index Patterns (Alphanumeric + Underscore + Colon)
    const indexPatternsFromForm = formValue.indexPatterns || [];
    for (let idx of indexPatternsFromForm) {
      if (idx.pattern && idx.pattern.trim() !== '') {
        if (!this.validateAlphanumericUnderscore(idx.pattern)) {
          Swal.fire('Format Error', `Index pattern "${idx.pattern}" should include alphabets, numbers, space, ':', '.' and '-' and '_' only !! [V2]`, 'warning');
          return;
        }
      }
    }

    // Map Index Patterns list for payload
    const indexList = indexPatternsFromForm
      .filter((idx: any) => idx.pattern && idx.pattern.trim() !== '')
      .map((idx: any) => {
        const obj = new indexPattern();
        obj.indexPatternName = idx.pattern;
        return obj;
      });

    // Fresh Payload
    const updatePayload = new ApplicationMaster();
    updatePayload.appID = this.applicationID;
    updatePayload.applicationID = this.applicationID;
    updatePayload.applicationName = this.applicationOldName;
    updatePayload.applicationNewName = formValue.applicationName;
    updatePayload.updatedBy = this.user.userId;

    let rawType = formValue.applicationType;
    if (rawType === 'APM_APPLICATION') {
      updatePayload.applicationType = 'APM';
    } else if (rawType === 'BROWSER_MONITORING') {
      updatePayload.applicationType = 'BROWSER';
    } else {
      updatePayload.applicationType = rawType;
    }

    updatePayload.techType = formValue.techType;
    if (this.availableTechnologies && this.availableTechnologies.length > 0) {
      const selectedTech = this.availableTechnologies.find(t => t.technologyType === formValue.techType);
      if (selectedTech) {
        updatePayload.technologyTypeId = selectedTech.id;
        updatePayload.technologyType = formValue.techType;
      }
    }
    updatePayload.ipAddress = ipList;
    updatePayload.indexPatterns = indexList;
    updatePayload.sessionDTO = { ...this.sessionObject, applicationName: this.applicationOldName };

    // Sanitize the entire payload right before sending it to the backend
    const safeUpdatePayload = this.sanitizationService.sanitizePayload(updatePayload);

    // CALL THE API - Ensuring no pipe(first()) to avoid edge cases
    this.applicationIPConfigurationServiceService.updateApplicationIPConfiguration(safeUpdatePayload)
      .subscribe({
        next: (response: any) => {
          if (response.serviceStatus === "Success") {
            Swal.fire({
              icon: 'success',
              title: 'Updated Successfully',
              text: 'Application configuration has been updated.',
              timer: 2000,
              showConfirmButton: false
            });

            this.isUpdation = false;
            this.showForm = false;
            this.showApplicationsTable = true;
            this.getAllIPAddressMapping();
          } else {
            Swal.fire('Update Failed', response.serviceResponse || 'Failed to update application.', 'error');
          }
        },
        error: (error) => {
          console.error('Update Error:', error);
          Swal.fire('Error', 'Failed to connect to the update service.', 'error');
        }
      });
  }

  confirmDelete(app: any): void {
    // Prepare payload object first
    this.applicationIPobj = new ApplicationMaster();
    this.applicationIPobj.appID = app.appID;
    this.applicationIPobj.applicationID = app.appID;
    this.applicationIPobj.applicationName = app.applicationName;
    this.applicationIPobj.applicationType = app.applicationType;

    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete "${app.applicationName}". This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete it!',
      cancelButtonText: 'No, Keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteApplication();
      }
    });
  }

  deleteApplication() {
    this.applicationIPobj.updatedBy = this.user.userId;
    this.sessionObject.applicationName = this.applicationIPobj.applicationName;
    this.applicationIPobj.sessionDTO = this.sessionObject;

    this.applicationIPConfigurationServiceService
      .deleteApplication(this.applicationIPobj)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus === "Success") {
          Swal.fire({
            title: 'Deleted!',
            text: 'Application has been deleted successfully.',
            icon: 'success',
            confirmButtonColor: '#3085d6'
          });
          this.getAllIPAddressMapping(); // refresh table
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.serviceResponse || 'Failed to delete application.',
            icon: 'error',
            confirmButtonColor: '#d33'
          });
        }
        this.applicationIPobj = new ApplicationMaster();
      });
  }

  goToCreateForm(): void {
    // UI state
    this.showForm = true;
    this.showApplicationsTable = false;
    this.showSuccessPreview = false;

    // Exit update mode
    this.isUpdation = false;
    this.isNotApplicationUpdate = false;

    // Reset form to clean "Create" state
    this.resetApplicationForm();

    // Clear leftover objects
    this.applicationIPobj = new ApplicationMaster();
    this.ipObjArrayList = [];
    this.applicationID = null;
    this.applicationName = null;
  }

  handleNodeKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addNodeFromInput();
    }
  }


  addNodeFromInput() {
    const value = this.nodeInputValue.trim();

    if (!value) {
      return;
    }


    if (this.node.includes(value)) {
      this.nodeInputValue = '';
      return;
    }

    this.node.push(value);
    this.nodeInputValue = '';
  }

  removeNode(index: number) {
    this.node.splice(index, 1);
  }

}
