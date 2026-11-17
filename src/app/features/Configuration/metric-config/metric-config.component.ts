import { Component, OnInit, TemplateRef } from '@angular/core';
import { User } from '../../../models/user';
import { Session } from '../../../models/session';
import { AlertDetails } from '../../../models/alertDetails';
import { ApplicationService } from '../../../services/application.service';
import { DecoderService } from '../../../services/decoder.service';
import { Router } from '@angular/router';
import { LoggerService } from '../../../services/logger.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { AlertService, HealthRule } from '../../../services/alert.service';
import { filter, first, from, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { FormGroup, FormBuilder, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IDropdownSettings, NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { CommonModule } from '@angular/common';
import { Threshold } from '../../../models/Threshold';
import { RuambotAlert } from '../../../models/ruambotAlert';
import { ThresholdService } from '../../../services/threshold.service';
import { UserTypeCrudMapObject } from '../../../models/UserTypeCrudMapObject';
import { AppComponent } from '../../../app.component';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { GrdFilterPipe } from '../../../grd-filter.pipe';
import { SortPipe } from '../../../sort.pipe';
import { GlobalMetricThreshold, MeteringConfigService } from '../../../services/metering-config.service';
import { DateService } from '../../../services/date.service';
import $ from 'jquery';
import { HealthScoreMetricConfigComponent } from './health-score-metric-config/health-score-metric-config.component';
import { RoleService } from '../../../services/role.service';
import Swal from 'sweetalert2';
import { SanitizeInputDirective } from '../../../utility/sanitize-input.directive';
@Component({
  selector: 'app-metric-config',
  imports: [
    FormsModule,
    NgbModule,
    CommonModule,
    NgbDropdownModule,
    NgMultiSelectDropDownModule,
    GrdFilterPipe,
    SortPipe,
    ReactiveFormsModule,
    HealthScoreMetricConfigComponent,
    SanitizeInputDirective
  ],
  templateUrl: './metric-config.component.html',
  styleUrls: ['./metric-config.component.css'],
  providers: [BsModalService]
})

export class MetricConfigComponent implements OnInit {

  alert: AlertDetails = new AlertDetails();
  srgApp="SRG"
  filteredMetricList: string[] = [];
  selectedMetrics: { id: number; metricName: string }[] = [];
  dropdownSettings: IDropdownSettings = {};
  thresholdObj: Threshold = new Threshold();
  viewthresholdObj: Threshold = new Threshold();
  customAlertList!: RuambotAlert[];
  alertDetailsList: any;
  thresholdMsg: string = '';
  calcTypeMsg: string = '';
  productList: string[] = [];
  calculationTypeDisabled: boolean = false;
  user = new User();
  currentUser!: User;
  technologyList: { technologyType: string; id: number }[] = [];
  technology: any = ""
  sessionObject: Session = new Session();
  modalRef!: BsModalRef;
  applicationList: any[] = [];
  selectedAppType = '';
  allApplications: any;
  healthRules: HealthRule[] = [];
  appName: any;

  baselineValue: any;
  healthRuleTypeList: any;
  showBaselineInput: boolean = false;
  showThresholdMode: boolean = false;
  metricWarningErrorMsg!: string;
  metricCriticalErrorMsg!: string;
  regexPercentage = /^(100|[1-9][0-9]?)$/;
  regexNumber = /^([1-9][0-9]*)$/;

  p: number = 1;
  searchText: any;
  isTable!: boolean;
  isForm!: boolean
  isUpdation!: boolean;
  thresholdList: any[] = [];
  sortDirection: 'asc' | 'desc' = 'asc';
  sortparam: any;
  selectedAppType2 = 'Select';

  isError: boolean = false;
  isSuccess: boolean = false;
  alertMessage: any;
  // Pagination variables
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  userTypeCrudMap = new UserTypeCrudMapObject();
  isCreation!: boolean;

  alertcurrentPage: number = 1;
  alertitemsPerPage: number = 10;
  alerttotalPages: number = 1;
  paginatedAlerts: any[] = [];
  kubernetesList: any[] = [];
  isResultFail!: boolean
  resultSuccess!: String
  resultFail!: String
  userTypeCrudMapList: any = null;
  componentTypeList: any[] = [];

  metricList: string[] = []

  filteredCalculationTypeList: string[] = [
    'Value',
    'Percentage'
  ].map(v => v.toLowerCase());

  thresholdSourceList: string[] = ['baseline', 'global', 'max'].map(v => v.toLowerCase());

  activeTab: string = '';
  thresholdForm!: FormGroup;
  configureMetricsForm!: FormGroup;
  globalThresholdList: GlobalMetricThreshold[] = [];
  isEditMode = false;
  editId: number | null = null;
  showTableSection = false;
  showValueFields: boolean = true;
  startTime!: number;
  private dateSubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();
  datemodel: any;
  endTime!: number;
  tool: string = 'APM';
  searchText2: string = '';
  constructor(
    private applicationService: ApplicationService,
    private decoderService: DecoderService,
    private router: Router,
    private loggerService: LoggerService,
    private authService: AuthenticationService,
    private alertService: AlertService,
    private thresholdService: ThresholdService,
    public appComponenet: AppComponent,
    private modalService: BsModalService,
    private fb: FormBuilder,
    private meteringConfigService: MeteringConfigService,
    private dateService: DateService,
    private roleService: RoleService
  ) {
    this.authService.currentUser.subscribe((x: any) => {
      if (x) {
        this.currentUser = x;
      }
    });
  }

  ngOnInit(): void {
    this.tool = sessionStorage.getItem('tool') || '';
    this.loadHealthRules();
    this.loadProducts();
    this.thresholdObj['normalColor'] = '#04f62c';
    this.thresholdObj['warningColor'] = '#fbff05';
    this.thresholdObj['criticalColor'] = '#f20707';
    this.user = this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) as User;
    this.currentUser = this.currentUser ?? {} as User;

    this.user.sessionDTO = this.sessionObject;

    this.sessionObject.featureName = 'RUAMBOT';
    this.sessionObject.menu = "Alert";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.currentUser.sessionDTO = this.sessionObject;
    this.isCreation = true;
    this.isUpdation = false;

    this.dropdownSettings = {
      singleSelection: true,
      idField: 'metricName',
      textField: 'metricName',
      selectAllText: 'Select All',
      unSelectAllText: 'UnSelect All',
      itemsShowLimit: 0,
      allowSearchFilter: true
    };

    this.dateService.setActiveComponent('MetricConfigComponent');
    this.dateSubscription = this.dateService.activeComponent$.pipe(
      takeUntil(this.destroy$),
      filter((activeComponent: any) => activeComponent === 'MetricConfigComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe((dates: any) => {
      this.datemodel = dates;
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);
      const activeHref = $('#metricConfig-nav .nav-link.active').attr('href')?.replace('#', '');

      if (activeHref) {
        this.activeTab = activeHref;
        this.loadData(this.activeTab);
      }
    });

    this.isForm = true;
    this.isTable = false;

    this.thresholdForm = this.fb.group({
      metric: ['', Validators.required],
      warning: [0],
      critical: [0],
      metricUnit: [''],
      thresholdSource: ['', Validators.required],
      calculationType: ['', Validators.required],
      createdBy: [''],
      metricAdjustment: ['ADD'],
      goodDirection: ['', Validators.required],
      appType: [''],      
      techType: ['']
    });

    this.configureMetricsForm = this.fb.group({
      appType: ['', Validators.required],
      techType: [null],
      applicationId: ['', Validators.required],
      healthRuleTypeId: [''],
      metricName: ['', Validators.required],
      thresholdMode: ['NORMAL_UNIT', Validators.required],
      dataUnit: ['', Validators.required],
      warningPercentage: ['', [Validators.required]],
      criticalPercentage: ['', [Validators.required]]
    });



    this.loadThresholds();
    if (this.user.userType == 'Super Admin' || this.user.userType == 'Admin') {
      this.loadApplications();
      this.getAllHealthRuleTypes();
    }
    else {
      this.loadApplications();
      // this.getAllThresholds();
    }

    this.getUserTypeCrudMapping();
    this.updateAlertPaginatedData();

    this.thresholdForm.get('thresholdSource')?.valueChanges.subscribe((source: string) => {
      this.onThresholdSourceChange(source);
    });

    this.thresholdForm.get('calculationType')?.valueChanges.subscribe((calc: string) => {
      this.onCalculationTypeChange(calc);
    });
  }


  saveAlert() {
    console.log("Save Alert");
  }

  setAppType(event: Event): void {

    const selectedValue = (event.target as HTMLSelectElement).value;
    this.selectedAppType = selectedValue;

    if (!selectedValue) return;
    this.loadApplications();
    this.loadTechnology(selectedValue);
  }

  onAppTypeChange(): void {
    const selectedValue = this.configureMetricsForm.get('appType')?.value;
    this.technology = ''
    this.selectedAppType = selectedValue;
    this.alert.applicationType = selectedValue;
    this.loadApplications();

    if (selectedValue) {
      this.loadTechnology(selectedValue);
    }
  }








  getCustomAlertList(Type: any, healthRuleTypeID: any): void {
    this.alertService.getCustomMetrics(this.sessionObject, Type, this.thresholdObj.applicationID, healthRuleTypeID, this.technology).pipe(first()).subscribe((data: any) => {
      if (data.serviceStatus == "Fail") {
        this.customAlertList = [];
      }
      else {
        this.customAlertList = data.serviceResponse;
        if (this.isUpdation) {
          this.syncMetricMetadata();
        }
      }
    });
  }

  syncMetricMetadata() {
    const metricName = this.configureMetricsForm.get('metricName')?.value;
    if (!metricName) return;

    const selectedMetric = this.customAlertList.find((item: any) => item.metricName === metricName);
    if (selectedMetric) {
      this.thresholdObj.displayUnit = selectedMetric.displayUnit;
      this.thresholdObj.baseline = selectedMetric.baseline;

      this.showThresholdMode = true;

      // Ensure form values are synced
      const currentMode = this.configureMetricsForm.get('thresholdMode')?.value;
      if (!currentMode) {
        this.configureMetricsForm.patchValue({ thresholdMode: 'NORMAL_UNIT' }, { emitEvent: false });
      }

      this.onThresholdModeChange();
    }
  }

  getAllHealthRuleTypes() {
    this.thresholdObj.healthRuleTypeID = "";
    this.alertService.getAllHealthRuleTypesForMetric(this.sessionObject).pipe(switchMap((data: any) => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.healthRuleTypeList = response.serviceResponse
      }
    });
  }

  validateMetricNumber() {
    this.metricWarningErrorMsg = "";
    this.metricCriticalErrorMsg = "";

    const { dataUnit, warningPercentage, criticalPercentage } = this.thresholdObj;

    const validate = (value: any, regex: RegExp, errorMsg: string) => {
      return value && !regex.test(value) ? errorMsg : "";
    };

    if (dataUnit === "Percentage") {
      this.metricWarningErrorMsg = validate(warningPercentage, this.regexPercentage, "Please provide value within 1-100");
      this.metricCriticalErrorMsg = validate(criticalPercentage, this.regexPercentage, "Please provide value within 1-100");

    } else if (dataUnit === "Value") {
      this.metricWarningErrorMsg = validate(warningPercentage, this.regexNumber, "Please provide value in numbers only");
      this.metricCriticalErrorMsg = validate(criticalPercentage, this.regexNumber, "Please provide value in numbers only");

    } else if (dataUnit === "Text") {
    }

    if (this.thresholdObj.thresholdMode === 'BASELINE_PERCENTAGE') {
      this.metricWarningErrorMsg = validate(warningPercentage, this.regexPercentage, "Please provide percentage within 1-100");
      this.metricCriticalErrorMsg = validate(criticalPercentage, this.regexPercentage, "Please provide percentage within 1-100");
    }

    if (dataUnit === 'Percentage' && this.selectedAppType != this.srgApp) {
      this.showBaselineInput = !!this.baselineValue;
    }
    else {
      this.showBaselineInput = false
    }

  }

  toast = {
    visible: false,
    message: '',
    type: ''
  };

  showToast(message: string, type: 'success' | 'error') {
    this.toast.message = message;
    this.toast.type = type;
    this.toast.visible = true;
    setTimeout(() => this.toast.visible = false, 3000);
  }

  saveThreshold() {
    if (this.configureMetricsForm.invalid) {
      this.configureMetricsForm.markAllAsTouched();
      Swal.fire('Validation Error', 'Please provide all required fields correctly.', 'warning');
      return;
    }

    const formValues = this.configureMetricsForm.value;
    this.thresholdObj = {
      ...this.thresholdObj,
      applicationID: formValues.applicationId,
      healthRuleTypeID: this.selectedAppType !== this.srgApp ? (() => {
        const ruleType = this.getRuleType(this.technology, this.selectedAppType);
        let healthRuleId = this.getHealthRuleId(ruleType);
        if (this.tool === 'APM' && !healthRuleId) {
          healthRuleId = 2;
        }
        if (this.tool === 'ORC' && this.selectedAppType === 'Network' && !healthRuleId) {
          healthRuleId = 2;
        }
        return healthRuleId;
      })() : formValues.healthRuleTypeId,
      module: formValues.metricName,
      thresholdMode: formValues.thresholdMode,
      dataUnit: this.selectedAppType === this.srgApp ? formValues.dataUnit : (this.thresholdObj.dataUnit || this.getDisplayedUnit()),
      warningPercentage: formValues.warningPercentage,
      criticalPercentage: formValues.criticalPercentage,
      createdBy: this.user.userId
    };

    // Ensure healthRuleTypeID is set if missing
    if (!this.thresholdObj.healthRuleTypeID) {
      Swal.fire('Validation Error', 'Please provide Metric Type.', 'warning');
      return;
    }

    if (this.selectedAppType !== this.srgApp) {
      if (!this.thresholdObj.module) {
        Swal.fire('Validation Error', 'Please provide Metric Name.', 'warning');
        return;
      }
    } else {
      if (!this.thresholdObj.module) {
        Swal.fire('Validation Error', 'Please provide Metric Name.', 'warning');
        return;
      } else if (!(/^[a-zA-Z0-9_]*$/.test(this.thresholdObj.module))) {
        Swal.fire('Validation Error', 'Metric Name can be Alphanumeric and underscore only.', 'warning');
        return;
      }
    }

    if (!this.thresholdObj.dataUnit) {
      Swal.fire('Validation Error', 'Please provide Data Unit.', 'warning');
      return;
    }

    const validateValue = (val: any) => val !== undefined && val !== null && val.toString().trim() !== "";

    if (this.thresholdObj.dataUnit === "Percentage") {
      if (!this.regexPercentage.test(this.thresholdObj['warningPercentage'])) {
        Swal.fire('Validation Error', 'Please provide Warning Percentage (1-100).', 'warning');
        return;
      }
      if (!this.regexPercentage.test(this.thresholdObj['criticalPercentage'])) {
        Swal.fire('Validation Error', 'Please provide Critical Percentage (1-100).', 'warning');
        return;
      }
    } else if (this.thresholdObj.dataUnit === "Value") {
      if (!this.regexNumber.test(this.thresholdObj['warningPercentage'])) {
        Swal.fire('Validation Error', 'Please provide Warning Value in numbers.', 'warning');
        return;
      }
      if (!this.regexNumber.test(this.thresholdObj['criticalPercentage'])) {
        Swal.fire('Validation Error', 'Please provide Critical Value in numbers.', 'warning');
        return;
      }
    } else if (this.thresholdObj.dataUnit === "Text") {
      if (!validateValue(this.thresholdObj['warningPercentage'])) {
        Swal.fire('Validation Error', 'Please provide Warning Text Value.', 'warning');
        return;
      }
      if (!validateValue(this.thresholdObj['criticalPercentage'])) {
        Swal.fire('Validation Error', 'Please provide Critical Text Value.', 'warning');
        return;
      }
    }


    this.thresholdObj.sessionDTO = this.sessionObject;
    if (this.thresholdObj.applicationID) {
      this.thresholdObj.applicationID = Number(this.thresholdObj.applicationID);
    }
    console.log('Payload Sent to API:', JSON.stringify(this.thresholdObj));

    console.log('Final thresholdObj to save:', JSON.stringify(this.thresholdObj));
    this.thresholdService.createThreshold(this.thresholdObj).subscribe({
      next: (response: any) => {
        if (response.serviceStatus === 'Success') {
          this.showToast('Alert saved successfully!', 'success');
          this.clearMetricForm()
        }
        else if (response.serviceStatus === 'Success_1') {
          this.alertDetailsList = response.serviceResponse;
          ($('#alertListDetailsModal') as any).modal({ show: true });
        }
        else if (response.serviceStatus === 'Fail' && response.serviceResponse) {
          this.showToast(response.serviceResponse, 'error');
        }
        else {
          this.showToast('Failed to save Alert.', 'error');
        }
      },

      error: (err) => {
        console.log('API error:', err);

        if (err.status === 400 && err.error?.serviceResponse) {
          this.showToast(err.error.serviceResponse, 'error');

        } else {
          this.showToast('Server error while saving alert', 'error');
        }
      }
    });
  }

  getbaselineMetric(selectedMetric: any) {
    this.showBaselineInput = false;
    this.showThresholdMode = false; // Reset until baseline check completes

    const selectedApp = this.applicationList.find(app => app.applicationId === +this.thresholdObj.applicationID);
    this.appName = selectedApp ? selectedApp.applicationName : '';

    if (this.selectedAppType !== this.srgApp) {
      this.thresholdService
        .getMetricBaseline(this.appName, selectedMetric, this.selectedAppType)
        .subscribe({
          next: (data: any) => {
            console.log('Baseline Metric:', data);
            this.baselineValue = data?.avgBaselineLast1Day;

            if (this.baselineValue !== null && this.baselineValue !== undefined) {
              // Baseline exists → show Threshold Mode dropdown
              this.showBaselineInput = true;
              this.showThresholdMode = true;

              if (!this.configureMetricsForm.get('thresholdMode')?.value) {
                this.configureMetricsForm.patchValue({ thresholdMode: 'NORMAL_UNIT' });
              }
            } else {
              // No baseline → hide dropdown, force NORMAL_UNIT
              this.showBaselineInput = false;
              this.showThresholdMode = false;
              this.configureMetricsForm.patchValue({ thresholdMode: 'NORMAL_UNIT' }, { emitEvent: false });
            }

            this.onThresholdModeChange();
          },
          error: (err: any) => {
            console.error('Error fetching baseline metric:', err);
            this.showBaselineInput = false;
            this.showThresholdMode = false;
            this.configureMetricsForm.patchValue({ thresholdMode: 'NORMAL_UNIT' }, { emitEvent: false });
            this.onThresholdModeChange();
          }
        });
    }
  }


  // Return the proper list based on selectedAppType
  getAppList() {

    return this.applicationList || [];

  }


  onAppChange() {
    const selectedAppID = this.configureMetricsForm.get('applicationId')?.value;
    this.thresholdObj.applicationID = selectedAppID;
    console.log('Selected Application ID:', this.thresholdObj.applicationID);
    this.showBaselineInput = false;

    const selectedApp = this.applicationList.find(app => app.applicationId == selectedAppID);
    if (selectedApp) {
      this.technology = selectedApp.applicationTechnology || '';
      if (this.technology) {
        this.configureMetricsForm.patchValue({ techType: this.technology });
      }
    }

    const ruleType = this.getRuleType(this.technology, this.selectedAppType);
    let healthRuleId = this.getHealthRuleId(ruleType);

    if (this.tool === 'APM' && !healthRuleId) {
      healthRuleId = 2;
    }
    if (this.tool === 'ORC' && this.selectedAppType === 'Network' && !healthRuleId) {
      healthRuleId = 2;
    }

    this.getCustomAlertList(
      this.selectedAppType,
      healthRuleId
    );
  }


  showTable() {
    this.p = 1;
    this.searchText = "";
    //this.showModal = true;
    this.isTable = true;
    this.isForm = false;
    this.selectedAppType2 = this.isUpdation ? this.selectedAppType2 : "Select";
    this.isUpdation = false;
    this.viewthresholdObj.applicationID = "";
    this.thresholdList = [];
    //this.getAllThresholds();
    this.setAppType2();
    console.log("isTable || (userTypeCrudMap.view && !userTypeCrudMap.create && !isUpdation) ", this.isTable || (this.userTypeCrudMap.view && !this.userTypeCrudMap.create && !this.isUpdation));

  }

  getAllThresholds() {
    this.thresholdService.getAllThresholds(this.sessionObject).pipe(first()).subscribe((response: any) => {
      // console.log(response.serviceResponse);
      this.thresholdList = response.serviceResponse;
      this.calculateTotalPages();
      console.log(this.thresholdList);
    });
  }

  setAppType2(): void {
    this.technology = ''
    this.viewthresholdObj.applicationID = "";

    if (!this.selectedAppType2 || this.selectedAppType2 === 'Select') {
      this.allApplications = [];
      return;
    }

    const request$ = this.technology
      ? this.applicationService.getFullApplicationData(
        this.currentUser.id,
        this.selectedAppType2,
        this.sessionObject,
        this.technology
      )
      : this.applicationService.getFullApplicationData(
        this.currentUser.id,
        this.selectedAppType2,
        this.sessionObject
      );

    request$
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {

        this.allApplications =
          response?.serviceResponse?.applications ||
          response?.serviceResponse ||
          [];

      });


    this.loadTechnology(this.selectedAppType2);
  }



  getApplicationByUserId() {
    this.currentUser.sessionDTO = this.sessionObject;
    this.applicationService.getAllApplicationsByUserID(this.currentUser).pipe(switchMap((data: any) => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.allApplications = response.serviceResponse;
        this.allApplications.sort(function (a: any, b: any) {
          return a.applicationName.toLowerCase().localeCompare(b.applicationName.toLowerCase());
        });
      }
      else {
        this.allApplications = [];
      }
    });
  }




  calculateTotalPages() {
    if (!this.thresholdList || this.thresholdList.length === 0) {
      this.totalPages = 1;
      this.currentPage = 1;
      return;
    }

    this.totalPages = Math.ceil(this.thresholdList.length / this.itemsPerPage);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPage(page: number) {
    const pageNumber = Number(page);

    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.currentPage = pageNumber;
    }
  }

  openDeleteThreshold(template: TemplateRef<any>, threshold: any) {
    this.modalRef = this.modalService.show(template, { class: 'modal-sm' });
    this.thresholdObj = threshold;
  }

  showForm() {
    //this.showModal = true;
    this.isForm = true;
    this.isTable = false;
    this.isUpdation = false;
    this.isCreation = true;
    this.thresholdObj = new Threshold();
    this.thresholdObj["normalColor"] = "#04f62c";
    this.thresholdObj["warningColor"] = "#fbff05";
    this.thresholdObj["criticalColor"] = "#f20707";
    this.viewthresholdObj.applicationID = "";
    // this.getApplicationByUserId();
    this.selectedAppType = "Select";
    this.allApplications = [];

  }
  getAllthresholdByApplication(applicationID: any) {
    this.p = 1;
    this.thresholdList = [];
    let applicationName = "";
    this.viewthresholdObj.applicationID = applicationID;

    const ruleType = this.getRuleType(this.technology, this.selectedAppType2)
    this.viewthresholdObj.healthRuleTypeID = this.getHealthRuleId(ruleType);
    for (let x of this.allApplications) {
      if (x.appID == this.viewthresholdObj.applicationID) {
        applicationName = x.applicationName;
      }
    }
    this.sessionObject.applicationName = applicationName;
    this.viewthresholdObj.sessionDTO = this.sessionObject;
    this.thresholdService.getAllthresholdByApplication(this.viewthresholdObj).pipe(switchMap((data: any) => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.thresholdList = response.serviceResponse;
        this.calculateTotalPages();
      }
    });
  }

  sortBy(value: String) {
    this.sortparam = value;
    if (this.sortDirection === 'desc') {
      this.sortDirection = 'asc';
    }
    else {
      this.sortDirection = 'desc';
    }
  }

  openUpdateThreshold(threshold: Threshold) {

    this.showForm();
    this.isCreation = false;
    this.isUpdation = true;

    this.thresholdObj = { ...threshold };
    if (!this.thresholdObj.thresholdMode) {
      this.thresholdObj.thresholdMode = 'NORMAL_UNIT';
    }

    // Save the original dataUnit before any method resets it
    const originalDataUnit = this.thresholdObj.dataUnit || '';

    // Restore component-level variables for Application Type
    this.selectedAppType = this.productList.find(
      (app: any) => app.toLowerCase() === (threshold.applicationType || '').toLowerCase()
    ) ?? threshold.applicationType ?? '';

    // Sync to form
    this.configureMetricsForm.patchValue({
      appType: this.thresholdObj.applicationType,
      techType: '',
      applicationId: this.thresholdObj.applicationID,
      healthRuleTypeId: this.thresholdObj.healthRuleTypeID,
      metricName: this.thresholdObj.metricLabel || this.thresholdObj.module,
      thresholdMode: this.thresholdObj.thresholdMode,
      dataUnit: originalDataUnit,
      warningPercentage: this.thresholdObj.warningPercentage,
      criticalPercentage: this.thresholdObj.criticalPercentage
    });

    // Set units/displayUnit from saved dataUnit BEFORE calling onThresholdModeChange
    if (originalDataUnit && originalDataUnit !== 'Value') {
      this.thresholdObj.units = originalDataUnit;
      this.thresholdObj.displayUnit = originalDataUnit;
    }

    this.onThresholdModeChange();

    // Restore displayUnit after onThresholdModeChange (it may have overwritten it)
    if (originalDataUnit && originalDataUnit !== 'Value') {
      this.thresholdObj.displayUnit = originalDataUnit;
      this.thresholdObj.units = originalDataUnit;
      this.thresholdObj.dataUnit = originalDataUnit;
    }

    console.log("thresholdObj ---- ", this.thresholdObj);

    if (!this.thresholdObj.applicationType) return;

    // Load technology list for app type, then load applications to derive technologyType
    if (this.selectedAppType) {
      this.loadTechnology(this.selectedAppType, () => {
        // Load applications and derive technology from the loaded app list
        this.loadApplications(() => {
          const matchedApp = this.applicationList.find(
            (app: any) => +app.applicationId === +this.thresholdObj.applicationID
          );
          if (matchedApp && (matchedApp.techType || matchedApp.technologyType || matchedApp.applicationTechnology)) {
            this.technology = matchedApp.applicationTechnology || matchedApp.techType || matchedApp.technologyType || '';
          }
          this.configureMetricsForm.patchValue({ techType: this.technology });
        });
      });
    } else {
      this.loadApplications();
    }

    setTimeout(() => {
      const appSelect = document.getElementById('appName');
      if (appSelect) appSelect.classList.add('input-select');
    }, 10);
  }

  updateThreshold(template: TemplateRef<any>) {
    if (this.configureMetricsForm.invalid) {
      this.configureMetricsForm.markAllAsTouched();
      Swal.fire('Validation Error', 'Please provide all required fields correctly.', 'warning');
      return false;
    }

    const formValues = this.configureMetricsForm.value;
    this.thresholdObj = {
      ...this.thresholdObj,
      thresholdMode: formValues.thresholdMode,
      dataUnit: formValues.dataUnit,
      warningPercentage: formValues.warningPercentage,
      criticalPercentage: formValues.criticalPercentage,
      editedBy: this.user.userId
    };

    if (this.thresholdObj.module && this.thresholdObj["warningPercentage"] && this.thresholdObj["criticalPercentage"]) {
      let id = "";
      for (let x of this.thresholdList) {
        if (x.module == this.thresholdObj.module) {
          id = x.id;
        }
      }
      this.thresholdObj["id"] = id;
      this.thresholdObj["editedBy"] = this.user.userId;
      this.thresholdObj["createdOn"] = null;
      this.thresholdObj["editedOn"] = null;
      this.thresholdObj.sessionDTO = this.sessionObject;
      if (this.thresholdObj.applicationID) {
        this.thresholdObj.applicationID = Number(this.thresholdObj.applicationID);
      }
      console.log('Updating Threshold payload:', JSON.stringify(this.thresholdObj));
      this.thresholdService.updateThreshold(this.thresholdObj).subscribe((response: any) => {
        console.log(response.serviceResponse);

        if (response.serviceStatus == 'Success') {
          // this.showModalUpdate = false;
          // this.isResultSuccess = true;
          this.isError = false;
          this.isSuccess = true;
          this.openValidationErrModal(template, response.serviceResponse);
          // this.getAllThresholds();
          this.showTable();
          this.viewthresholdObj.applicationID = this.thresholdObj.applicationID;
          this.getAllthresholdByApplication(this.viewthresholdObj.applicationID);
          this.clearMetricUpdateForm()
          // this.resetClientJob();
          //this.showCronJobs();
          // this.resultSuccess = response.serviceResponse;

          // this.thresholdService.getAllThresholds().pipe(first()).subscribe((response: any) => {
          //   //console.log(response.serviceResponse);
          //   this.thresholdList = response.serviceResponse;
          //   setTimeout(() => {
          //     this.isResultSuccess = false;
          //   }, 3000);

          // });

          // this.editThresholdValue = null;
          // this.editModuleType = null;
          // this.thresholdObj = new Threshold();
          // this.thresholdObj.normalColor = "#04f62c";
          // this.thresholdObj.warningColor = "#fbff05";
          // this.thresholdObj.criticalColor = "#f20707";

        }
        else if (response.serviceStatus == "Success_1") {
          this.alertDetailsList = response.serviceResponse;
          const appType = this.alertDetailsList[0].applicationType;

          this.selectedAppType2 = appType;

          this.viewthresholdObj.applicationID = this.alertDetailsList[0].applicationID;
          ($('#alertListDetailsModal') as any).modal({ show: true });
        }
        else {
          this.isError = true;
          this.isSuccess = false;
          this.openValidationErrModal(template, response.serviceResponse);
          // this.showModalUpdate = false;
          // this.isResultFail = true;
          // this.resultFail = response.serviceResponse;
          // setTimeout(() => {
          //   this.isResultFail = false;
          // }, 3000);

        }


      });
    }
    else {
      if (!this.thresholdObj.module) {
        Swal.fire('Validation Error', 'Please provide Metric Name.', 'warning');
      } else if (!(/^[a-zA-Z0-9_]*$/.test(this.thresholdObj.module))) {
        Swal.fire('Validation Error', 'Metric Name can be Alphanumeric and underscore only.', 'warning');
      } else if (!this.thresholdObj['warningPercentage']) {
        Swal.fire('Validation Error', 'Please provide Warning Level.', 'warning');
      } else if (!this.thresholdObj['criticalPercentage']) {
        Swal.fire('Validation Error', 'Please provide Critical Level.', 'warning');
      }

      if (this.thresholdObj.dataUnit === "Percentage") {
        if (!this.regexPercentage.test(this.thresholdObj['warningPercentage'])) {
          Swal.fire('Validation Error', 'Please provide Warning Percentage (1-100).', 'warning');
          return false;
        }
        if (!this.regexPercentage.test(this.thresholdObj['criticalPercentage'])) {
          Swal.fire('Validation Error', 'Please provide Critical Percentage (1-100).', 'warning');
          return false;
        }
      } else if (this.thresholdObj.dataUnit === "Value") {
        if (!this.regexNumber.test(this.thresholdObj['warningPercentage'])) {
          Swal.fire('Validation Error', 'Please provide Warning Value in numbers.', 'warning');
          return false;
        }
        if (!this.regexNumber.test(this.thresholdObj['criticalPercentage'])) {
          Swal.fire('Validation Error', 'Please provide Critical Value in numbers.', 'warning');
          return false;
        }
      }
    }
    return null

  }




  search() {
    this.p = 1;
    this.currentPage = 1;
    this.calculateTotalPages();
  }

  cancelRequest() {
    this.modalRef.hide();
  }

  deleteThreshold(template: TemplateRef<any>) {
    this.thresholdObj["deletedBy"] = this.user.userId;
    this.thresholdObj["createdOn"] = "";
    this.thresholdObj["editedOn"] = "";
    this.toggleDeleteTemplateButtons('disable');
    this.thresholdObj.sessionDTO = this.sessionObject;
    this.thresholdService.deleteThreshold(this.thresholdObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        this.isError = false;
        this.isSuccess = true;
        this.toggleDeleteTemplateButtons('enable');
        this.cancelRequest();
        this.openValidationErrModal(template, "Metric Deleted Successfully");
      }
      else {
        // alert(response.serviceResponse);
        this.isError = true;
        this.isSuccess = false;
        this.toggleDeleteTemplateButtons('enable');
        this.cancelRequest();
        this.openValidationErrModal(template, response.serviceResponse);
      }
      this.getAllthresholdByApplication(this.viewthresholdObj.applicationID);
      // this.getAllThresholds();
      this.cancelRequest();
      this.thresholdObj = new Threshold();
    });
  }

  openValidationErrModal(template: TemplateRef<any>, message: any) {
    this.modalRef = this.modalService.show(template, { class: 'modal-sm' });
    this.alertMessage = message;

  }

  toggleDeleteTemplateButtons(status: string) {
    let divElement = document.getElementById('metricDeleteDiv');
    if (status === 'enable') {
      divElement!.style.pointerEvents = 'auto';
      divElement!.style.opacity = "1";
      return;
    }
    if (status === 'disable') {
      divElement!.style.pointerEvents = 'none';
      divElement!.style.opacity = "0.5";
      return;
    }
  }


  updateAlertPaginatedData() {
    if (!this.alertDetailsList) return;
    this.alerttotalPages = Math.ceil(this.alertDetailsList.length / this.alertitemsPerPage);
    const start = (this.alertcurrentPage - 1) * this.alertitemsPerPage;
    const end = start + this.alertitemsPerPage;
    this.paginatedAlerts = this.alertDetailsList.slice(start, end);
  }

  // Pagination Controls
  previousAlertPage() {
    if (this.alertcurrentPage > 1) {
      this.alertcurrentPage--;
      this.updateAlertPaginatedData();
    }
  }

  nextAlertPage() {
    if (this.alertcurrentPage < this.alerttotalPages) {
      this.alertcurrentPage++;
      this.updateAlertPaginatedData();
    }
  }

  goToAlertPage(page: number) {
    if (page >= 1 && page <= this.alerttotalPages) {
      this.alertcurrentPage = page;
      this.updateAlertPaginatedData();
    }
  }

  callBaselineMetric(value: any) {
    const selectedMetric = this.customAlertList.find((item: any) => item.metricName === value);
    if (selectedMetric) {
      this.thresholdObj.displayUnit = selectedMetric.displayUnit;
      this.thresholdObj.baseline = selectedMetric.baseline;

      // Reset — getbaselineMetric will set showThresholdMode=true only if baseline exists
      this.showThresholdMode = false;

      this.configureMetricsForm.patchValue({
        metricName: value,
        thresholdMode: 'NORMAL_UNIT'
      }, { emitEvent: false });

      // Check baseline service — this decides if Threshold Mode dropdown appears
      this.getbaselineMetric(value);

      this.onThresholdModeChange();
    }
  }

  getDisplayedUnit() {
    const mode = this.configureMetricsForm.get('thresholdMode')?.value;
    if (mode === 'BASELINE_PERCENTAGE') {
      return 'Percentage';
    }
    // Fallback chain: displayUnit → units → dataUnit (saved value) → 'Value'
    return this.thresholdObj.displayUnit
      || (this.thresholdObj.units === '%' ? 'Percentage' : this.thresholdObj.units)
      || (this.thresholdObj.dataUnit && this.thresholdObj.dataUnit !== 'Value' ? this.thresholdObj.dataUnit : null)
      || 'Value';
  }

  getThresholdPlaceholder(type: string) {
    const mode = this.configureMetricsForm.get('thresholdMode')?.value;
    const unit = this.getThresholdSuffix();
    if (mode === 'BASELINE_PERCENTAGE') {
      return `Enter ${type} percentage (0-100)`;
    }
    return `Enter ${type} value ${unit ? 'in ' + unit : ''}`;
  }

  getThresholdSuffix() {
    const mode = this.configureMetricsForm.get('thresholdMode')?.value;
    if (mode === 'BASELINE_PERCENTAGE') {
      return '%';
    }
    return this.thresholdObj.units || '';
  }

  onThresholdModeChange() {
    const mode = this.configureMetricsForm.get('thresholdMode')?.value;
    const warnControl = this.configureMetricsForm.get('warningPercentage');
    const critControl = this.configureMetricsForm.get('criticalPercentage');

    if (mode === 'BASELINE_PERCENTAGE') {
      warnControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100), Validators.pattern(/^-?\d*\.?\d+$/)]);
      critControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100), Validators.pattern(/^-?\d*\.?\d+$/)]);
      this.thresholdObj.dataUnit = 'Percentage';
      this.configureMetricsForm.patchValue({ dataUnit: 'Percentage' });
    } else {
      warnControl?.setValidators([Validators.required, Validators.pattern(/^-?\d*\.?\d+$/)]);
      critControl?.setValidators([Validators.required, Validators.pattern(/^-?\d*\.?\d+$/)]);

      // In update mode, preserve the saved dataUnit; only set displayUnit-based unit for new metrics
      const savedUnit = this.thresholdObj.displayUnit || this.thresholdObj.dataUnit;
      this.thresholdObj.dataUnit = savedUnit && savedUnit !== 'Value' ? savedUnit : (this.thresholdObj.displayUnit || 'Value');
      this.configureMetricsForm.patchValue({ dataUnit: this.thresholdObj.dataUnit });
    }
    warnControl?.updateValueAndValidity();
    critControl?.updateValueAndValidity();
  }


  loadData(tabName: string): void {
    this.activeTab = tabName;
    switch (tabName) {
      case 'configureMetrics':
        this.showTableSection = false;
        break;
      case 'manage':
        this.isTable = false
        this.getGlobalMetricTabledata()
        this.loadMetrics()
        this.loadComponentTypes()
        break;

    }
  }

  //   getUserTypeCrudMapping() {
  //     if (!this.user) return;
  // console.log("----userTypeCrudMapList.configureMetrics.view ",this.userTypeCrudMapList.configureMetrics.create)
  // console.log("----userTypeCrudMapList.configureMetrics.view ",this.userTypeCrudMapList.configureMetrics.edit)
  //     this.userTypeCrudMapList = this.user["crudData"]["Alert"];
  //     if (this.userTypeCrudMapList?.configureMetrics?.tabVisibility === 'true') {
  //       this.activeTab = 'configure';
  //     }
  //      else if (this.userTypeCrudMapList?.manageGlobalMetrics?.tabVisibility === 'true') {
  //       this.activeTab = 'manage';
  //     }
  //     else if (this.userTypeCrudMapList?.configureHealthScoreMetrics?.tabVisibility === 'true'){
  //  this.activeTab = 'configHealthScore';
  //     }
  //     sessionStorage.setItem("userTypeCrudMapList", JSON.stringify(this.userTypeCrudMapList));
  //   }

  getUserTypeCrudMapping() {
    if (!this.user["crudData"]["Alert"]) return;

    this.userTypeCrudMapList = this.user["crudData"]["Alert"];

    Object.keys(this.userTypeCrudMapList).forEach(key => {
      const item = this.userTypeCrudMapList[key];
      item.create = item.create === 'true';
      item.edit = item.edit === 'true';
      item.delete = item.delete === 'true';
      item.view = item.view === 'true';
    });


    if (this.userTypeCrudMapList.configureMetrics.tabVisibility === 'true') {
      this.activeTab = 'configureMetrics';
    }
    else if (this.userTypeCrudMapList?.manageGlobalMetrics?.tabVisibility === 'true') {
      this.activeTab = 'manage';
    }
    else if (this.userTypeCrudMapList?.configureHealthScoreMetrics?.tabVisibility === 'true') {
      this.activeTab = 'configHealthScore';
    }
    sessionStorage.setItem("userTypeCrudMapList", JSON.stringify(this.userTypeCrudMapList));
  }

  loadThresholds() {
    // this.http.get('/api/global-thresholds').subscribe((res: any) => {
    //   this.globalThresholdList = res;
    // });
  }


  showGlobalMetricTable() {
    this.showTableSection = true;
    this.technology = ""
    this.getGlobalMetricTabledata()
  }


  hideGlobalMetricTable() {
    this.resetForm()
    this.technology = ""
    this.showTableSection = false;
  }



  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dateSubscription.unsubscribe();
  }

  onSubmit() {
    const appType = this.thresholdForm.get('appType')?.value;
    const techType = this.thresholdForm.get('techType')?.value;

    if (this.thresholdForm.invalid) return;

    const payload: any = {
      metric: this.thresholdForm.getRawValue().metric,
      thresholdSource: this.thresholdForm.value.thresholdSource,
      calculationType: this.thresholdForm.value.calculationType,
      warning: this.thresholdForm.value.warning,
      critical: this.thresholdForm.value.critical,
      metricUnit: this.thresholdForm.value.metricUnit,
      metricAdjustment: this.thresholdForm.value.metricAdjustment,
      applicationType: appType,         
      technologyTypeId: techType
        ? this.technologyList.find(t => t.technologyType === techType)?.id ?? null
        : null,
      goodDirection: this.thresholdForm.value.goodDirection,
      createdBy: this.user.id
    };

    if (this.isEditMode && this.editId) {
      payload.id = this.editId;
      this.meteringConfigService.updateGlobalMetric(payload.id, payload)
        .subscribe({
          next: () => {
            Swal.fire('Success', 'Metric updated successfully!', 'success');
            this.resetForm();
            this.showTableSection = true;
            this.getGlobalMetricTabledata();
          },
          error: (err: any) => console.error('Update error:', err)
        });
      return;
    }

    this.meteringConfigService.addGlobalMetric(payload)
      .subscribe({
        next: () => {
          Swal.fire('Success', 'Metric added successfully!', 'success');
          this.resetForm();
          this.showTableSection = true;
          this.getGlobalMetricTabledata();
        },
        error: (err: any) => console.error('Add error:', err)
      });
  }


  deleteGlobalThreshold(id: number) {
    if (confirm('Are you sure you want to delete this record?')) {
      this.meteringConfigService.deleteGlobalMetric(id).subscribe({
        next: () => {
          Swal.fire('Deleted', 'Deleted successfully!', 'success');
          this.getGlobalMetricTabledata();
        },
        error: (err: any) => console.error('Delete error:', err)
      });
    }
  }


  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  onThresholdSourceChange(source: string) {
    source = source.toUpperCase();
    const calcCtrl = this.thresholdForm.get('calculationType');

    // Filter dropdown based on source
    if (source === 'BASELINE') {
      this.filteredCalculationTypeList = ['Value', 'Percentage'].map(v => v.toLowerCase());
      if (!this.filteredCalculationTypeList.includes(calcCtrl?.value)) calcCtrl?.setValue('value');
    } else if (source === 'MAX') {
      this.filteredCalculationTypeList = ['Percentage'].map(v => v.toLowerCase());
      calcCtrl?.setValue('percentage');
    } else if (source === 'GLOBAL') {
      this.filteredCalculationTypeList = ['Value'].map(v => v.toLowerCase());
      calcCtrl?.setValue('value');
    }

    // Trigger calculation type change to handle fields visibility and validation
    this.onCalculationTypeChange(calcCtrl?.value || '');
  }

  updateMessages(calcType: string, source: string) {
    this.calcTypeMsg = '';
    this.thresholdMsg = '';

    // GLOBAL + Percentage
    if (source === 'BASELINE' && calcType === 'Percentage') {
      this.calcTypeMsg = 'Baseline percentage threshold will be applied.';
      return;
    }

    // GLOBAL + Value
    if (source === 'GLOBAL' && calcType === 'Value') {
      this.calcTypeMsg = 'Direct warning/critical values for the global metric.';
      return;
    }

    // MAX always → Percentage
    if (source === 'MAX') {
      this.calcTypeMsg = 'Only Percentage allowed, e.g. 80% of MAX value.';
      return;
    }

    // BASELINE → Value
    if (source === 'BASELINE'  && calcType === 'Value') {
      this.calcTypeMsg = 'Direct warning/critical values from baseline logic.';
      return;
    }
  }

  onCalculationTypeChange(calcType: string) {
    if (!calcType) return;
    const source = this.thresholdForm.get('thresholdSource')?.value?.toUpperCase();
    this.updateMessages(calcType, source);

    const warningCtrl = this.thresholdForm.get('warning');
    const criticalCtrl = this.thresholdForm.get('critical');
    const adjustCtrl = this.thresholdForm.get('metricAdjustment');
    const calcCtrl = this.thresholdForm.get('calculationType');

    if (source === 'BASELINE' && calcType.toLowerCase() === 'value') {
      this.showValueFields = false;
      this.calculationTypeDisabled = false;
      warningCtrl?.clearValidators();
      criticalCtrl?.clearValidators();
      adjustCtrl?.clearValidators();
    } else {
      this.showValueFields = true;
      this.calculationTypeDisabled = false;
      warningCtrl?.setValidators([Validators.required]);
      criticalCtrl?.setValidators([Validators.required]);
    }

    warningCtrl?.updateValueAndValidity();
    criticalCtrl?.updateValueAndValidity();
    adjustCtrl?.updateValueAndValidity();
    calcCtrl?.updateValueAndValidity();
  }

  loadMetrics() {
    this.meteringConfigService.getAllMetrics().subscribe({
      next: (data: string[]) => {
        this.metricList = data;
        this.filterMetricList();
      },
      error: (err: any) => console.error('Error fetching metrics', err)
    });
  }


  filterMetricList() {
    if (!this.globalThresholdList) return;

    const existingMetrics = new Set(this.globalThresholdList.map((m: GlobalMetricThreshold) => m.metric));

    if (!this.isEditMode) {
      this.filteredMetricList = this.metricList.filter(m => !existingMetrics.has(m));
    } else {
      this.filteredMetricList = this.metricList;
    }
  }

  loadComponentTypes() {
    this.meteringConfigService.getComponentTypes().subscribe({
      next: (res: any) => {
        this.componentTypeList = res;
      },
      error: (err: any) => console.error('Error loading component types', err)
    });
  }

  getGlobalMetricTabledata() {
    this.meteringConfigService.getGlobalMetricData().subscribe({
      next: (data: GlobalMetricThreshold[]) => {
        this.globalThresholdList = data;
        this.filterMetricList();
      },
      error: (err: any) => console.error('Error fetching global metric thresholds', err)
    });
  }

  getTechnologyNameById(technologyTypeId: number, technologyTypeName?: string): string {
    if (technologyTypeName) return technologyTypeName;
    if (!technologyTypeId) return '-';
    const found = this.technologyList.find(t => t.id === technologyTypeId);
    return found ? found.technologyType : '-';
  }

  editThreshold(row: GlobalMetricThreshold) {
    this.isEditMode = true;
    this.editId = row.id;
    this.showTableSection = false;

    this.thresholdForm.patchValue({
      metric: row.metric,
      warning: row.warning,
      critical: row.critical,
      metricUnit: row.metricUnit,
      thresholdSource: row.thresholdSource?.toLowerCase(),
      calculationType: row.calculationType?.toLowerCase(),
      metricAdjustment: row.metricAdjustment,
      appType: row.applicationType,
      goodDirection: row.goodDirection,
      createdBy: this.currentUser?.userId,
      techType: ''
    });

    this.thresholdForm.get('metric')?.disable();
    this.onThresholdSourceChange(row.thresholdSource || '');
    this.filterMetricList();

    if (row.applicationType) {
      this.loadTechnology(row.applicationType, () => {
        let matchedTech: { technologyType: string; id: number } | undefined;

        if (row.technologyTypeName) {
          matchedTech = this.technologyList.find(
            t => t.technologyType === row.technologyTypeName
          );
        }

        if (!matchedTech && row.technologyTypeId) {
          matchedTech = this.technologyList.find(
            t => t.id === row.technologyTypeId
          );
        }
        if (!matchedTech && row.technologyTypeId) {
          matchedTech = this.technologyList.find(
            t => t.technologyType === String(row.technologyTypeId)
          );
        }

        this.thresholdForm.patchValue({
          techType: matchedTech ? matchedTech.technologyType : ''
        });
      });
    }
  }

  resetForm(): void {
    this.thresholdForm.reset({
      metric: '',
      warning: null,
      critical: null,
      metricUnit: '',
      thresholdSource: '',
      calculationType: '',
      metricAdjustment: 'ADD',
      goodDirection: '',
      appType: '',
      techType: ''
    });

    this.isEditMode = false;
    this.editId = null;
    this.technologyList = [];
    this.showValueFields = true;
    this.calculationTypeDisabled = false;
    this.thresholdMsg = '';
    this.calcTypeMsg = '';

    this.thresholdForm.get('metric')?.enable();
    this.filterMetricList();
  }


  validateAlphaNumericUnderscore(value: any, template: TemplateRef<any>) {
    const regex = /^[a-zA-Z0-9_]*$/;
    if (!regex.test(value)) {
      this.openAlertMod(template, "Only Alphanumeric and underscore allowed !!");
      this.isError = true;
      this.isSuccess = false;
      return false;
    }
    return true;
  }

  openAlertMod(template: TemplateRef<any>, message: any) {
    this.modalRef = this.modalService.show(template, { class: 'modal-sm' });
    this.alertMessage = message;
  }


  onTechTypeChange(): void {
    const selectedValue = this.configureMetricsForm.get('techType')?.value;
    this.technology = selectedValue;
    this.loadApplications();
  }

  onTechChange(selectedValue: string): void {

    this.technology = selectedValue;

    // SRG does not use technology
    if (this.selectedAppType2 === this.srgApp) {
      return;
    }

    this.applicationService
      .getFullApplicationData(
        this.currentUser.userId,
        this.selectedAppType2,
        this.sessionObject,
        selectedValue
      )
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.allApplications = response?.serviceResponse?.applications || [];
      });

  }


  getHealthRuleId(ruleName: string): number {
    const rule = this.healthRules.find(
      (r: any) =>
        r.healthRuleName?.toLowerCase() === ruleName?.toLowerCase()
    );
    let healthRuleId = rule ? rule.id : 0;
    if (this.tool === 'APM' && !healthRuleId) {
      healthRuleId = 2;
    }
    if (this.tool === 'ORC' && ruleName === 'Network' && !healthRuleId) {
      healthRuleId = 2;
    }
    return healthRuleId;
  }

  loadHealthRules(): void {
    this.alertService.getAllHealthRules().subscribe({
      next: (data: any) => {
        this.healthRules = data;
      },
      error: (err: any) => {
        console.error('Failed to load health rules', err);
      }
    });
  }

  loadProducts(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      const userId = user.userId;
      const userType = user.userType;
      const tool = sessionStorage.getItem('tool') || 'APM'; // Default to APM if not set

      this.roleService.findAppType(userId, userType, tool).subscribe({
        next: (res: any) => {
          this.productList = res.products || [];
        },
        error: () => {
          this.productList = [];
        }
      });
    }
  }

  loadTechnology(appType: string, onLoaded?: () => void): void {
    this.applicationService.getTechnologyBySubFeature(appType).subscribe({
      next: (res: any) => {
        this.technologyList = res?.serviceResponse || [];
        if (onLoaded) onLoaded();  
      },
      error: () => {
        this.technologyList = [];
        if (onLoaded) onLoaded();
      }
    });
  }


  loadApplications(onLoaded?: () => void): void {

    if (!this.selectedAppType) return;

    const request$ = this.technology
      ? this.applicationService.getFullApplicationData(
        this.currentUser.id,
        this.selectedAppType,
        this.sessionObject,
        this.technology
      )
      : this.applicationService.getFullApplicationData(
        this.currentUser.id,
        this.selectedAppType,
        this.sessionObject
      );

    request$
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {

        this.applicationList =
          response?.serviceResponse?.applications || [];
        console.log('Loaded applicationList:', this.applicationList);
        if (onLoaded) onLoaded();
      });
  }
  getRuleType(tech: string, AppType: string): string {
    return tech ? tech : AppType;
  }

  clearMetricForm() {
    this.selectedAppType = "";
    this.technology = "";
    this.thresholdObj = new Threshold()
    this.selectedMetrics = [];
    this.thresholdObj['normalColor'] = "#04f62c";
    this.thresholdObj['warningColor'] = "#fbff05";
    this.thresholdObj['criticalColor'] = "#f20707";
    this.showThresholdMode = false;
  }

  clearMetricUpdateForm() {

    this.thresholdObj = new Threshold()
    this.selectedMetrics = [];
    this.thresholdObj['normalColor'] = "#04f62c";
    this.thresholdObj['warningColor'] = "#fbff05";
    this.thresholdObj['criticalColor'] = "#f20707";
  }

  changeGlobAppType(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.loadTechnology(selectedValue)
  }

  preventNegative(event: any) {
    if (event.key === '-' || event.key === 'e' || event.key === '+') {
      event.preventDefault();
    }
  }


}