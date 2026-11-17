import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { NgbDropdownModule, NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { CommonModule } from "@angular/common";
import { UserTypeCrudMapObject } from "../../../models/UserTypeCrudMapObject";
import moment from "moment";
import { AlertService, HealthRule } from "../../../services/alert.service";
import { ApplicationService } from "../../../services/application.service";
import { NetworkService } from "../../../services/network.service";
import { AuthenticationService } from "../../../services/authentication.service";
import { AppComponent } from "../../../app.component";
import { ThresholdService } from "../../../services/threshold.service";
import { SessionService } from "../../../services/session.service";
import { DecoderService } from "../../../services/decoder.service";
import { Router } from "@angular/router";
import { LoggerService } from "../../../services/logger.service";
import { FormBuilder } from "@angular/forms";
import { User } from "../../../models/user";
import { AlertDetails } from "../../../models/alertDetails";
import { AlertConfig } from "../../../models/AlertConfig";
import { BsModalRef } from "ngx-bootstrap/modal";
import { ApplicationMaster } from "../../../models/application-master";
import { Session } from "../../../models/session";
import { first, from, switchMap } from "rxjs";
import { Threshold } from "../../../models/Threshold";
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import * as CryptoJS from 'crypto-js';
import { SearchPipe } from "../../../pipes/search.pipe";
import { SearchTablePipe } from "../../../pipes/search-table.pipe";
import { SortPipe } from "../../../pipes/sort.pipe";
import { PaginatePipe } from "../../../pipes/paginate.pipe";
import { HotToastService } from "@ngxpert/hot-toast";
import { MetricConfigComponent } from "../../Configuration/metric-config/metric-config.component";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { RoleService } from "../../../services/role.service";
import { SanitizeInputDirective } from "../../../utility/sanitize-input.directive";


@Component({
  selector: "app-alert",
  imports: [
    FormsModule,
    NgbModule,
    CommonModule,
    NgbDropdownModule,
    ReactiveFormsModule,
    NgMultiSelectDropDownModule,
    SearchTablePipe,
    SortPipe,
    PaginatePipe,
    MetricConfigComponent,
    SanitizeInputDirective
  ],
  templateUrl: "./alert.component.html",
  styleUrl: "./alert.component.css"
})
export class AlertComponent implements OnInit {
  applicationNames: any[] = [];
  srgApp = "SRG"
  networkApp = "Network"
  hostApp = "Host"
  selectedPort = ""
  showPort: boolean = false;
  showItem: boolean = false;

  @ViewChild('alert_template') alertTemplate?: TemplateRef<any>;
  // For role
  userTypeCrudMapList: any = {
    alertHistory: new UserTypeCrudMapObject(),
    healthRule: new UserTypeCrudMapObject(),
    setAlert: new UserTypeCrudMapObject(),
    metricConfiguration: new UserTypeCrudMapObject(),
  };
  activeTab: string = '';
  // For AlterModule
  isForm?: boolean;
  showPassword: boolean = false;

  // For Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  inputPage: number = 1;

  // Pagination variables
  alertListcurrentPage: number = 1;
  alertListpageSize: number = 10;
  alertListtotalPages: number = 1;
  alertListtotalItems: number = 0;


  // alerthistory

  setAlertCurrentPage: number = 1;
  setAlertPageSize: number = 10;
  setAlertTotalPages: number = 1;
  setAlertTotalItems: number = 0;

  // setalerts
  alertconfListcurrentPage: number = 1;
  alertconfListpageSize: number = 10;
  alertconfListtotalPages: number = 1;
  alertconfListtotalItems: number = 0;

  technologyList: { technologyType: string; id: number }[] = [];
  technology: any = "";
  isDatabase3: boolean = false;
  isDatabase1: boolean = false;
  productList: string[] = [];
  tool: any = "";
  constructor(
    private alertService: AlertService,
    private applicationIPConfigurationServiceService: ApplicationService,
    private networkService: NetworkService,
    private authService: AuthenticationService,
    public appComponenet: AppComponent,
    private thresholdService: ThresholdService,
    private decoderService: DecoderService,
    private router: Router,
    private loggerService: LoggerService,
    private fb: FormBuilder,
    private toast: HotToastService,
    private roleService: RoleService
  ) {
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.dynamicConfigForm = this.fb.group({});
  }

  ngOnInit(): void {
    console.log("--------CrudData-------", this.currentUser);

    this.checkflagforHealthruleType = true;
    this.userType = this.currentUser?.userType;
    this.isSuccess = false;
    this.isError = false;
    this.viewAlertTable = false;
    this.isForm = true;
    this.isTable = false;
    this.viewUpdateCard = false;
    this.tool = sessionStorage.getItem("tool");
    this.alert.applicationId = "Select";
    this.alert.healthRuleId = "Select";
    this.alert.serviceTypeId = "Select";
    this.alert.ipAddressId = "Select";
    this.alert.dataSource = "Select";
    this.alert.isMetricColumnAggregated = true;

    this.alertConfig.dataFromLast = "";
    this.alertConfig.triggerInterval = "";
    this.alertConfig.alertDurationId = "";
    this.alertConfig.alertId = "";
    this.alertConfig.emailAction = true;
    this.alertConfig.smsAction = false;
    this.alertConfig.isAlertEnable = true;
    this.alertConfig.jiraAction = false;
    this.applicationID = "Select";
    this.alertByApplicationId = "Select";
    this.technology = "Select";
    this.user = this.currentUser;
    this.isCreation = true;
    this.alertConfig.ruambotAgent = "Select";
    this.alertConfig.ruambotJob = "Select";
    this.alertConfig.jiraToolId = "";
    this.alertConfig.assigneeId = "";
    this.alertConfig.assigneeName = "";
    this.alertConfig.issueType = "Task";
    this.sessionObject.featureName = "Alerts";
    this.sessionObject.requestURI = this.router.url.split("?")[0];
    this.sessionObject.userId = this.currentUser?.userId;
    this.sessionObject.loginTime = sessionStorage.getItem("loginTime");
    this.sessionObject.sessionId = sessionStorage.getItem("sessionId");
    this.sessionObject.browserName =
      this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion =
      this.loggerService.getBrowserNameAndVersion().version;
    this.currentUser = this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) as User;
    this.loadProducts();
    this.getAllApplicationsByUserID();
    this.getUserTypeCrudMapping();
    // this.getAllAlerts("");
    this.getAllHealthRuleTypes();
    this.getAllAlertDurations();
    // this.getservicenames();
    // this.getInfraNames();
    this.myrole = this.currentUser?.userType;
    this.loadHealthRules();
    this.getJiraTools();

  }

  // For Threshold Tab

  // For Jira integration (Chandan)
  jiraToolList?: any[];
  jiraAssigneeList?: any[];
  issueTypes?: any[];
  // For custom alert by Chandan
  customAlertTemplate: boolean = false;
  // customAlertList:RuambotAlert[];
  dynamicConfigForm: FormGroup;
  dynamicConfigData: { [key: string]: any[] } = {};
  metricName: any;

  ServiceNames: any = [];
  infraList: any[] = [];
  selectedAppType = "Select";
  selectedAppType1 = "Select";
  selectedAppType2 = "Select";
  selectedAppType3 = "Select";
  selectedAppType4 = "Select";
  isSRG: boolean = false;
  isAPM: boolean = false;
  isInfra: boolean = false;
  isDatabase: boolean = false;
  isSRG1: boolean = false;
  isAPM1: boolean = false;
  isInfra1: boolean = false;
  isSRG2: boolean = false;
  isAPM2: boolean = false;
  isInfra2: boolean = false;
  iskubernetes2: boolean = false;
  isSRG3: boolean = false;
  isAPM3: boolean = false;
  isInfra3: boolean = false;
  iskubernetes3: boolean = false;
  isSRG4: boolean = false;
  isAPM4: boolean = false;
  isInfra4: boolean = false;
  isDatabase4: boolean = false;
  iskubernetes4: boolean = false;
  p: Number = 1;
  q: Number = 1;
  r: Number = 1;
  checkApplication: Number = -1;
  currentUser: any;
  user?: User | null = new User();
  alert: AlertDetails | any = new AlertDetails();
  alertConfig: AlertConfig = new AlertConfig();
  alertObj: AlertDetails = new AlertDetails();
  deleteUser?: AlertDetails;
  deleteAlertObj: AlertDetails | any;
  deleteAlertConfig: AlertConfig | any;

  isError?: boolean;
  isSuccess?: boolean;
  viewAlertTable?: boolean;
  viewAlertHistoryTable?: boolean;
  viewUpdateCard?: boolean;
  isTable?: boolean;
  isCreation?: boolean;
  isUpdation?: boolean;
  isUpdateForm?: boolean;

  userType: any;
  applicationID: any;
  alertTechnology: any;
  alertByApplicationId: any;


  myrole: any;
  searchText1: any;
  searchAlert: any;
  searchHistory: any;
  searchText: any;

  viewHistoryApplicationList: any;
  applicationList: any;
  alertMessage: any;
  updateAlertObj: AlertDetails | any = new AlertDetails();
  metricList: any;
  ipAddressList: any;
  message: any;
  healthRuleTypeList: any;
  alertHistoryList: any[] = [];
  fromDate: any;
  toDate: any;
  startTime: any;
  endTime: any;
  allSetAlertList: any;
  healthRuleList: any;
  allAlertDurationsList: any;
  agentList: any;
  jobList: any;
  numberOfAlerts: any = 0;

  alertByApplicationIdList?: any[] | any;
  deleteButton?: boolean;
  modalRef?: BsModalRef;

  checkflagforHealthruleType: boolean = true;
  currentSFID?: number;
  range = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

  sortDirection = "asc";
  sortparam: any;
  applicationName: any;
  applicationMaster: ApplicationMaster = new ApplicationMaster();
  regexMobile = /^\d{10}$/;

  sessionObject: Session = new Session();
  public max = new Date();
  allMetrices: any;

  browserRefresh: any = false;

  testConnectStatus?: string;

  alertConfigObj: AlertConfig = new AlertConfig();
  buttonDisable?: boolean = false;

  // for validating metrics
  metricCriticalErrorMsg?: string;
  metricWarningErrorMsg?: string;
  regexPercentage = /^(100|[1-9][0-9]?)$/;
  regexNumber = /^([1-9][0-9]*)$/;

  dropdownSettings = {
    singleSelection: false, // Multiple selection allowed
    idField: "id", // Optional: Field to use as a unique key (if objects are used in `field.value`)
    textField: "name", // Optional: Field to display in the dropdown (if objects are used in `field.value`)
    selectAllText: "Select All",
    unSelectAllText: "Unselect All",
    itemsShowLimit: 3,
    allowSearchFilter: true, // Enable search filter
  };
  healthRules: HealthRule[] = [];
  isNetwork?: boolean;
  iskubernetes?: boolean;
  networkList: any;
  databaseList: any;
  kubernetesList: any[] = [];
  hostList: any;
  portList: any;
  selectedHost: any;
  selectedItemName: any;
  itemList: any;
  isNetwork1?: boolean;
  iskubernetes1: boolean = false;
  isNetwork2?: boolean;
  isDatabase2?: boolean;
  isNetwork4?: boolean;
  isNetwork3?: boolean;

  // Email Chip Logic - TO/CC/BCC for all 3 levels
  level1TOInput: string = '';
  level1CCInput: string = '';
  level1BCCInput: string = '';
  level2TOInput: string = '';
  level2CCInput: string = '';
  level2BCCInput: string = '';
  level3TOInput: string = '';
  level3CCInput: string = '';
  level3BCCInput: string = '';

  level1TOList: string[] = [];
  level1CCList: string[] = [];
  level1BCCList: string[] = [];
  level2TOList: string[] = [];
  level2CCList: string[] = [];
  level2BCCList: string[] = [];
  level3TOList: string[] = [];
  level3CCList: string[] = [];
  level3BCCList: string[] = [];

  // Add email to appropriate list
  addEmail(level: number, type: string) {
    let input = '';
    let list: string[] = [];

    // Get the appropriate input and list
    if (level === 1) {
      if (type === 'TO') { input = this.level1TOInput; list = this.level1TOList; }
      else if (type === 'CC') { input = this.level1CCInput; list = this.level1CCList; }
      else if (type === 'BCC') { input = this.level1BCCInput; list = this.level1BCCList; }
    } else if (level === 2) {
      if (type === 'TO') { input = this.level2TOInput; list = this.level2TOList; }
      else if (type === 'CC') { input = this.level2CCInput; list = this.level2CCList; }
      else if (type === 'BCC') { input = this.level2BCCInput; list = this.level2BCCList; }
    } else if (level === 3) {
      if (type === 'TO') { input = this.level3TOInput; list = this.level3TOList; }
      else if (type === 'CC') { input = this.level3CCInput; list = this.level3CCList; }
      else if (type === 'BCC') { input = this.level3BCCInput; list = this.level3BCCList; }
    }

    // Validate and add email
    if (input && this.ValidetEmail1(input)) {
      if (!list.includes(input)) {
        list.push(input);
      }
      // Clear input after adding
      if (level === 1) {
        if (type === 'TO') this.level1TOInput = '';
        else if (type === 'CC') this.level1CCInput = '';
        else if (type === 'BCC') this.level1BCCInput = '';
      } else if (level === 2) {
        if (type === 'TO') this.level2TOInput = '';
        else if (type === 'CC') this.level2CCInput = '';
        else if (type === 'BCC') this.level2BCCInput = '';
      } else if (level === 3) {
        if (type === 'TO') this.level3TOInput = '';
        else if (type === 'CC') this.level3CCInput = '';
        else if (type === 'BCC') this.level3BCCInput = '';
      }
    } else if (input) {
      this.showToast("Invalid Email Address", 'error');
    }
  }

  // Remove email from list
  removeEmail(level: number, type: string, index: number) {
    if (level === 1) {
      if (type === 'TO') this.level1TOList.splice(index, 1);
      else if (type === 'CC') this.level1CCList.splice(index, 1);
      else if (type === 'BCC') this.level1BCCList.splice(index, 1);
    } else if (level === 2) {
      if (type === 'TO') this.level2TOList.splice(index, 1);
      else if (type === 'CC') this.level2CCList.splice(index, 1);
      else if (type === 'BCC') this.level2BCCList.splice(index, 1);
    } else if (level === 3) {
      if (type === 'TO') this.level3TOList.splice(index, 1);
      else if (type === 'CC') this.level3CCList.splice(index, 1);
      else if (type === 'BCC') this.level3BCCList.splice(index, 1);
    }
  }

  // Sync lists to config using comma-separated strings
  syncEmailListsToConfig() {
    this.alertConfig.level1MailId = this.level1TOList.length > 0 ? this.level1TOList.join(',') : undefined;
    this.alertConfig.level1MailCc = this.level1CCList.length > 0 ? this.level1CCList.join(',') : undefined;
    this.alertConfig.level1MailBcc = this.level1BCCList.length > 0 ? this.level1BCCList.join(',') : undefined;
    this.alertConfig.level2MailId = this.level2TOList.length > 0 ? this.level2TOList.join(',') : undefined;
    this.alertConfig.level2MailCc = this.level2CCList.length > 0 ? this.level2CCList.join(',') : undefined;
    this.alertConfig.level2MailBcc = this.level2BCCList.length > 0 ? this.level2BCCList.join(',') : undefined;
    this.alertConfig.level3MailId = this.level3TOList.length > 0 ? this.level3TOList.join(',') : undefined;
    this.alertConfig.level3MailCc = this.level3CCList.length > 0 ? this.level3CCList.join(',') : undefined;
    this.alertConfig.level3MailBcc = this.level3BCCList.length > 0 ? this.level3BCCList.join(',') : undefined;
  }

  // Sync config to lists (parse JSON with fallback)
  syncConfigToEmailLists() {
    this.level1TOList = this.parseEmailList(this.alertConfig.level1MailTo) || this.parseEmailList(this.alertConfig.level1MailId);
    this.level1CCList = this.parseEmailList(this.alertConfig.level1MailCc);
    this.level1BCCList = this.parseEmailList(this.alertConfig.level1MailBcc);
    this.level2TOList = this.parseEmailList(this.alertConfig.level2MailTo) || this.parseEmailList(this.alertConfig.level2MailId);
    this.level2CCList = this.parseEmailList(this.alertConfig.level2MailCc);
    this.level2BCCList = this.parseEmailList(this.alertConfig.level2MailBcc);
    this.level3TOList = this.parseEmailList(this.alertConfig.level3MailTo) || this.parseEmailList(this.alertConfig.level3MailId);
    this.level3CCList = this.parseEmailList(this.alertConfig.level3MailCc);
    this.level3BCCList = this.parseEmailList(this.alertConfig.level3MailBcc);
  }

  // Parse email list from JSON or comma-separated string
  private parseEmailList(value?: string): string[] {
    if (!value) return [];
    try {
      // Try to parse as JSON array first
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((e: string) => e && e.trim()) : [];
    } catch (e) {
      // Fallback: comma-separated string (backward compatibility)
      return value.split(',').map(e => e.trim()).filter(e => e.length > 0);
    }
  }

  // Adjust Escalation Time (Level 2 & 3)
  adjustEscalationTime(level: number, amount: number) {
    if (level === 2) {
      const currentValue = this.alertConfig.level2ElapsedTime || 0;
      const newValue = currentValue + amount;
      if (newValue >= 0) {
        this.alertConfig.level2ElapsedTime = newValue;
      }
    } else if (level === 3) {
      const currentValue = this.alertConfig.level3ElapsedTime || 0;
      const newValue = currentValue + amount;
      if (newValue >= 0) {
        this.alertConfig.level3ElapsedTime = newValue;
      }
    }
  }

  getCustomConfiguration(template: TemplateRef<any>): void {
    this.dynamicConfigForm = this.fb.group({});
    this.dynamicConfigData = {};
    this.metricName = this.metricList.find(
      (data: any) => data.id == this.alert.serviceTypeId
    ).module;
    var enityId = "";
    console.log("enityId ", enityId)
    if (this.alert.applicationType == this.hostApp) {
      enityId = this.ipAddressList.find(
        (data: any) => data.ipAddrID == this.alert.ipAddressId
      ).ipAddress;
    }

    else {
      enityId = this.applicationNames.find(
        (data: any) => data.applicationId == this.alert.applicationId
      )["applicationName"];
    }
    if (!enityId) {
      return;
    }
    console.log("enityId ", enityId)
    this.alertService
      .getAdditionalConfig(this.metricName, enityId)
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((data: any) => {
        if (data.serviceStatus != "Fail") {
          this.dynamicConfigData = data.serviceResponse;
          Object.keys(this.dynamicConfigData).forEach((field) => {
            this.dynamicConfigForm.addControl(field, new FormControl(""));
          });
        } else {
          this.alert.serviceTypeId = "Select";
          this.isSuccess = false;
          this.isError = true;
          this.message = "Something went wrong !!";
          this.showToast(this.message, 'error');
        }
      });
  }

  getUpdateCustomConfiguration(template: TemplateRef<any>): void {
    this.dynamicConfigForm = this.fb.group({});
    this.dynamicConfigData = {};
    this.metricName = this.metricList.find(
      (data: any) => data.id == this.updateAlertObj.serviceTypeId
    ).module;
    var enityId = "";
    if (this.updateAlertObj.applicationType == this.hostApp) {
      enityId = this.ipAddressList.find(
        (data: any) => data.ipAddrID == this.updateAlertObj.ipAddressId
      ).ipAddress;
    } else {
      enityId = this.applicationNames.find(
        (data: any) => data.applicationId == this.updateAlertObj.applicationId
      )["applicationName"];
    }
    if (!enityId) {
      return;
    }
    this.alertService
      .getAdditionalConfig(this.metricName, enityId)

      .subscribe((data: any) => {
        if (data.serviceStatus == "Success") {
          this.dynamicConfigData = data.serviceResponse;
          Object.keys(this.dynamicConfigData).forEach((field) => {
            this.dynamicConfigForm.addControl(field, new FormControl(""));
          });
        } else {
          this.updateAlertObj.serviceTypeId = "Select";
          this.isSuccess = false;
          this.isError = true;
          this.message = "Something went wrong !!";
          this.showToast(this.message, 'error');
        }
      });
  }
  resetCustomConfiguration(): void {
    this.metricList = [];
    this.dynamicConfigData = {};
    this.dynamicConfigForm = this.fb.group({});
  }

  showForm() {
    let currentUrl = this.router.url;
    this.router.onSameUrlNavigation = "reload";
    this.router.navigate([currentUrl]);
    this.isTable = false;
    this.isForm = true;
    this.alert.alertName = "";
    this.alert.applicationId = "Select";
    this.alert.healthRuleId = "Select";
    this.alert.serviceTypeId = "Select";
    this.alert.ipAddressId = "Select";
    this.alert.dataSource = "Select";
    this.alert.isMetricColumnAggregated = true;
    this.alert.query = "";
    this.alert.ipAddress = "";
    this.alert.port = "";
    this.alert.dbName = "";
    this.alert.dbUsername = "";
    this.alert.dbPassword = "";
    this.alert.dbType = "Select";
    this.alert.requestBody = "";
    this.isUpdateForm = false;
    this.searchText1 = "";
    this.alertByApplicationId = "Select";
    this.ipAddressList = null;
    this.selectedAppType = "Select";
    this.customAlertTemplate = false;
    this.isAPM = false;
    this.isInfra = false;
    this.isSRG = false;
    this.dynamicConfigData = {};
    this.metricList = [];
    this.technology = null
    this.clearDataForpagination();
  }

  showTable() {
    this.isTable = true;
    this.isForm = false;
    this.isUpdateForm = false;
    this.alertByApplicationIdList = [];
    // this.getAllAlerts("");
    this.alertByApplicationId = "Select";
    this.isAPM3 = false;
    this.isInfra3 = false;
    this.iskubernetes3 = false;
    this.isSRG3 = false;
    this.isDatabase3 = false;
    this.selectedAppType3 = "Select";
    this.technology = null
  }

  setAppType(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue !== "Select") {
      this.alert.applicationType = selectedValue;
      this.alert.applicationId = "Select";
      this.alert.serviceTypeId = "Select";
      this.alert.ipAddressId = "Select";
      this.alert.dataSource = "Select";
      this.ipAddressList = null;
      this.technology = null;
      this.technologyList = [];

      if (!selectedValue || selectedValue === 'Select') {
        this.applicationList = [];
        return;
      }

      if (selectedValue === this.srgApp) {
        this.customAlertTemplate = false;
        // this.isSRG = true;
        // this.isAPM = false;
        // this.isInfra = false;
        // this.isNetwork = false;
        // this.isDatabase = false;
        this.getAllApplicationsByUserID();
      }
      // else if (selectedValue === "ApMoSys APM") {
      //   this.customAlertTemplate = true;
      //   this.isAPM = true;
      //   this.isSRG = false;
      //   this.isInfra = false;
      //   this.isNetwork = false;
      //   this.isDatabase = false;
      //   this.getservicenames(selectedValue);
      // } else if (selectedValue === "Host") {
      //   this.customAlertTemplate = true;
      //   this.isInfra = true;
      //   this.isAPM = false;
      //   this.isSRG = false;
      //   this.isNetwork = false;
      //   this.isDatabase = false;

      //   // this.getInfraNames();
      // } else if (selectedValue === "Network") {
      //   this.customAlertTemplate = true;
      //   this.isInfra = false;
      //   this.isAPM = false;
      //   this.isSRG = false;
      //   this.isNetwork = true;
      //   this.isDatabase = false;
      //   this.getNetworkNames();
      // }
      // else if (selectedValue === "Relational") {
      //   this.customAlertTemplate = true;
      //   this.isInfra = false;
      //   this.isAPM = false;
      //   this.isDatabase = true;
      //   this.isSRG = false;
      //   this.isNetwork = false;
      //   // this.getDatabaseNames();
      // }
      // else if (selectedValue === "kubernetes") {
      //   this.customAlertTemplate = true;
      //   this.isInfra = false;
      //   this.isAPM = false;
      //   this.isDatabase = false;
      //   this.isSRG = false;
      //   this.isNetwork = false;
      //   this.iskubernetes = true;
      //   // this.getDatabaseNames();
      // }
      this.customAlertTemplate = true;
      if (selectedValue) {
        this.loadTechnology(selectedValue)
      }

    }
  }

  setAppType1(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.applicationID = "Select";
    if (selectedValue !== "Select") {
      if (selectedValue === this.srgApp) {
        // this.isSRG1 = true;
        // this.isAPM1 = false;
        // this.isInfra1 = false;
        // this.isNetwork1 = false;
        // this.isDatabase1 = false;
        this.getAllApplicationsByUserID();
      }
      // } else if (selectedValue === "ApMoSys APM") {
      //   this.isAPM1 = true;
      //   this.isSRG1 = false;
      //   this.isInfra1 = false;
      //   this.isNetwork1 = false;
      //   this.isDatabase1 = false;
      //   this.getservicenames(selectedValue);
      // } else if (selectedValue === "Host") {
      //   this.isInfra1 = true;
      //   this.isAPM1 = false;
      //   this.isSRG1 = false;
      //   this.isNetwork1 = false;
      //   this.isDatabase1 = false;
      //   // this.getInfraNames();
      // } else if (selectedValue === "Network") {
      //   this.isInfra1 = false;
      //   this.isAPM1 = false;
      //   this.isSRG1 = false;
      //   this.isNetwork1 = true;
      //   this.isDatabase1 = false;
      //   this.getNetworkNames();

      // }
      // else if (selectedValue === "Relational") {
      //   // this.customAlertTemplate=true;
      //   this.isInfra1 = false;
      //   this.isAPM1 = false;
      //   this.isSRG1 = false;
      //   this.isDatabase1 = true;
      //   this.isNetwork1 = false;
      //   // this.getDatabaseNames(this.technology);
      // }

      // else if (selectedValue === "kubernetes") {
      //   // this.customAlertTemplate=true;
      //   this.isInfra1 = false;
      //   this.isAPM1 = false;
      //   this.isSRG1 = false;
      //   this.isDatabase1 = false;
      //   this.isNetwork1 = false;
      //   this.iskubernetes1 = true;
      //   // this.getDatabaseNames(this.technology);
      // }

      if (selectedValue) {
        this.loadTechnology(selectedValue)
      }
    }
  }

  setAppType2(event: Event): void {
    this.alertConfigObj.applicationId = "Select";
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue !== "Select") {
      if (selectedValue === this.srgApp) {
        // this.isSRG2 = true;
        // this.isAPM2 = false;
        // this.isInfra2 = false;
        // this.iskubernetes2 = false;
        // this.isNetwork2 = false;
        // this.isDatabase2 = false;

        this.getAllApplicationsByUserID();
      }
      //  else if (selectedValue === "ApMoSys APM") {
      //   this.isAPM2 = true;
      //   this.isSRG2 = false;
      //   this.isInfra2 = false;
      //   this.iskubernetes2 = false;
      //   this.isNetwork2 = false;
      //   this.isDatabase2 = false;
      //   this.getservicenames(selectedValue);
      // } else if (selectedValue === "Host") {
      //   this.isInfra2 = true;
      //   this.iskubernetes2 = false;
      //   this.isAPM2 = false;
      //   this.isSRG2 = false;
      //   this.isNetwork2 = false;
      //   this.isDatabase2 = false;
      //   // this.getInfraNames();
      // } else if (selectedValue === "Network") {
      //   this.isInfra2 = false;
      //   this.iskubernetes2 = false;
      //   this.isAPM2 = false;
      //   this.isSRG2 = false;
      //   this.isNetwork2 = true;
      //   this.isDatabase2 = false;
      //   this.getNetworkNames();

      // }
      // else if (selectedValue === "Relational") {
      //   this.isInfra2 = false;
      //   this.iskubernetes2 = false;
      //   this.isAPM2 = false;
      //   this.isSRG2 = false;
      //   this.isNetwork2 = false;
      //   this.isDatabase2 = true;
      //   // this.getDatabaseNames(this.technology);
      // }
      // else if (selectedValue === "Kubernetes") {
      //   this.isInfra2 = false;
      //   this.iskubernetes2 = true;
      //   this.isAPM2 = false;
      //   this.isSRG2 = false;
      //   this.isNetwork2 = false;
      //   this.isDatabase2 = false;
      //   // this.getkubernetesNames(this.technology);
      // }

    }

    if (selectedValue) {
      this.loadTechnology(selectedValue)
    }
  }

  setAppType3(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue !== "Select") {
      // this.alert.applicationType=selectedValue;
      this.alertByApplicationId = "Select";
      this.selectedAppType3 = selectedValue;
      this.applicationNames = [];
      this.technology = null;
      // this.alert.serviceTypeId='Select';
      // this.alert.ipAddressId='Select';
      // this.alert.dataSource='Select';
      // this.ipAddressList=null;
      if (selectedValue === this.srgApp) {
        this.customAlertTemplate = false;
        // this.isSRG3 = true;
        // this.isAPM3 = false;
        // this.isInfra3 = false;
        // this.iskubernetes3 = false;
        // this.isNetwork3 = false;
        // this.isDatabase3 = false;
        this.getAllApplicationsByUserID();
      }
      else {
        this.customAlertTemplate = true;
        this.loadTechnology(selectedValue);



      }
      // else if (selectedValue === "ApMoSys APM") {
      //   // this.customAlertTemplate=true;
      //   this.isAPM3 = true;
      //   this.isSRG3 = false;
      //   this.isInfra3 = false;
      //   this.iskubernetes3 = false;
      //   this.isNetwork3 = false;
      //   this.isDatabase3 = false;
      //   this.getservicenames(selectedValue);
      // } else if (selectedValue === "Host") {
      //   // this.customAlertTemplate=true;
      //   this.isInfra3 = true;
      //   this.isAPM3 = false;
      //   this.isSRG3 = false;
      //   this.isNetwork3 = false;
      //   this.iskubernetes3 = false;
      //   this.isDatabase3 = false;
      //   // this.getInfraNames();
      // } else if (selectedValue === "Network") {
      //   // this.customAlertTemplate=true;
      //   this.isInfra3 = false;
      //   this.isAPM3 = false;
      //   this.isSRG3 = false;
      //   this.isDatabase3 = false;
      //   this.iskubernetes3 = false;
      //   this.isNetwork3 = true;
      //   this.getNetworkNames();

      // } else if (selectedValue === "Relational") {
      //   // this.customAlertTemplate=true;
      //   this.isInfra3 = false;
      //   this.isAPM3 = false;
      //   this.isSRG3 = false;
      //   this.isDatabase3 = true;
      //   this.iskubernetes3 = false;
      //   this.isNetwork3 = false;
      //   // this.getDatabaseNames(this.technology);
      // }

      // else if (selectedValue === "Kubernetes") {
      //   // this.customAlertTemplate=true;
      //   this.isInfra3 = false;
      //   this.iskubernetes3 = true;
      //   this.isAPM3 = false;
      //   this.isSRG3 = false;
      //   this.isDatabase3 = false;
      //   this.isNetwork3 = false;

      // }

      // if (selectedValue) {
      //   this.loadTechnology(selectedValue)
      // }
    }
  }

  setAppType4(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.alertObj.applicationId = "Select";
    // this.isSRG4 = false;
    // this.isAPM4 = false;
    // this.isInfra4 = false;
    // this.isDatabase4 = false;
    // this.iskubernetes4 = false;
    if (selectedValue !== "Select") {
      if (selectedValue === this.srgApp) {
        // this.isSRG4 = true;
        this.getAllApplicationsByUserID();
      }
      // else if (selectedValue === "ApMoSys APM") {
      //   this.isAPM4 = true;
      //   this.getservicenames(selectedValue);
      // } else if (selectedValue === "Host") {
      //   this.isInfra4 = true;
      //   // this.getInfraNames();
      // } else if (selectedValue === "Network") {
      //   this.isNetwork4 = true;
      //   this.getNetworkNames();

      // } else if (selectedValue === "Relational") {
      //   this.isDatabase4 = true;


      // } else if (selectedValue === "Kubernetes") {
      //   this.iskubernetes4 = true;

      // }
    }

    if (selectedValue) {
      this.loadTechnology(selectedValue)
    }
  }

  onSetAlertTechTypeChange(tech: any) {
    this.technology = tech.technologyType;
    if (this.isInfra1) {
      this.getInfraNames(tech);
    }
    else if (this.isDatabase1) {
      this.getDatabaseNames(tech);
    }
    else if (this.iskubernetes1) {
      this.getkubernetesNames(tech);
    }
  }

  // onAlertTechChange(tech: any) {
  //   this.technology = tech.technologyType;
  //   if (this.isInfra3) {
  //     this.getInfraNames(tech);
  //   }
  //   if (this.isDatabase3) {
  //     this.getDatabaseNames(tech);
  //   }
  //   if (this.iskubernetes3) {
  //     this.getkubernetesNames(tech);
  //   }
  // }



  onTechTypeChange(appType: string, tech: string) {


    // if (this.isInfra || this.isInfra2 || this.isInfra4) {
    //   this.getInfraNames(tech);
    // }
    // else if (this.isDatabase || this.isDatabase2 || this.isDatabase4) {
    //   this.getDatabaseNames(tech);
    // }
    // else if (this.iskubernetes || this.iskubernetes2 || this.iskubernetes4) {
    //   this.getkubernetesNames(tech);
    // }
    this.applicationList = []
    this.loadApplications(tech, appType);
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
    return healthRuleId;
  }

  getHealthruleID(appType: string, technology: string): any {
    const ruleType = technology ? technology : appType;
    const rule = this.healthRules.find(
      (r: any) =>
        r.healthRuleName?.toLowerCase() === ruleType?.toLowerCase()
    );

    let healthRuleId = rule ? rule.id : 2;
    if (this.tool === 'APM' && !healthRuleId) {
      healthRuleId = 2;
    }
    return healthRuleId;
  }


  loadHealthRules(): void {
    this.alertService.getAllHealthRules().subscribe({
      next: (data) => {
        this.healthRules = data;
      },
      error: (err) => {
        console.error('Failed to load health rules', err);
      }
    });
  }

  getservicenames(type: any): void {
    const featureType1 = type;


    this.applicationIPConfigurationServiceService.getFullApplicationData(this.user?.userId, featureType1, this.sessionObject)
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.ServiceNames = response.serviceResponse.applications;

      });
  }

  getInfraNames(type: any): void {
    const featureType1 = "Host";


    this.applicationIPConfigurationServiceService.getFullApplicationData(this.user?.userId, featureType1, this.sessionObject, type)
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.infraList = response.serviceResponse.applications;

      });
  }



  getUserTypeCrudMapping() {
    if (!this.currentUser["crudData"]["Alert"]) return;

    this.userTypeCrudMapList = this.currentUser["crudData"]["Alert"];

    Object.keys(this.userTypeCrudMapList).forEach(key => {
      const item = this.userTypeCrudMapList[key];
      item.create = item.create === 'true';
      item.edit = item.edit === 'true';
      item.delete = item.delete === 'true';
      item.view = item.view === 'true';
    });

    if (this.userTypeCrudMapList.metricConfiguration.tabVisibility === 'true') {
      this.activeTab = 'metricConfiguration';
    }
    else if (this.userTypeCrudMapList.healthRule.tabVisibility === 'true') {
      this.activeTab = 'healthRule';
    }
    else if (this.userTypeCrudMapList.setAlert.tabVisibility === 'true') {
      this.activeTab = 'setAlert';
    }

    else if (this.userTypeCrudMapList.alertHistory.tabVisibility === 'true') {
      this.activeTab = 'alertHistory';
    }

  }

  // ---------------------Health rule(start)---------------------
  getAllHealthRuleTypes() {
    this.alertService
      .getAllHealthRuleTypes(this.sessionObject)
      .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.healthRuleTypeList = response.serviceResponse;
        }
      });
  }

  getAllIpAddressByAppId(applicationId: any, callTime: any) {
    this.alert.ipAddressId = "Select";
    if (callTime != "viewUpdate" && this.updateAlertObj) {
      if (this.updateAlertObj.healthRuleId == 6 || 7 || 8) {
        this.updateAlertObj.serviceTypeId = null;
      } else {
        this.updateAlertObj.serviceTypeId = "Select";
      }
      this.updateAlertObj.healthRuleId = "Select";
      // this.updateAlertObj.serviceTypeId = "Select";
      this.updateAlertObj.ipAddressId = "Select";
    }
    if (this.alert) {
      this.alert.healthRuleId = "Select";
      this.alert.serviceTypeId = "Select";
    }
    this.metricList = [];
    this.ipAddressList = null;

    let application = new ApplicationMaster();
    let applicationName = null;
    if (this.applicationList) {
      for (let x of this.applicationList) {
        if (x.appID == applicationId) {
          applicationName = x.applicationName;
          break;
        }
      }
    }
    this.sessionObject.applicationName = applicationName;
    application.applicationID = applicationId;
    application.sessionDTO = this.sessionObject;

    this.alertService
      .getAllIpAddressByAppId(application)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.ipAddressList = response.serviceResponse;
        }
      });

    // Check context and call appropriate API
    // If in Health Rule creation tab
    if (this.alert.healthRuleId != 'Select' && this.alert.healthRuleId != undefined) {
      this.getMetricName(this.alert.healthRuleId, applicationId);
    }
    // If in Set Alert tab (using applicationID property usually)
    else if (this.applicationID && this.applicationID != 'Select' && this.applicationID == applicationId) {
      this.getHealthByAppId();
    }
  }

  resetSelectedFields() {
    this.alert.ipAddressId = "Select";
    this.alert.dataSource = "Select";
    this.alert.query = null;
    this.alert.ipAddress = null;
    this.alert.port = null;
    this.alert.dbName = null;
    this.alert.dbUsername = null;
    this.alert.dbPassword = null;
    this.alert.dbType = "Select";
    this.alert.requestBody = null;
    this.updateAlertObj.ipAddressId = "Select";
    this.updateAlertObj.dataSource = "Select";
    this.updateAlertObj.query = null;
    this.updateAlertObj.requestBody = null;
    this.customAlertTemplate = false;
    this.dynamicConfigData = {};
    this.metricList = [];
  }

  getMetricName(
    healthRuleTypeID: any,
    applicationID: any,
    template?: TemplateRef<any>
  ) {
    console.log("applicationID ", applicationID)
    this.alert.serviceTypeId = "Select";
    if (
      healthRuleTypeID == 6 ||
      healthRuleTypeID == 7 ||
      healthRuleTypeID == 8
    ) {

      this.resetSelectedFields();
    }
    if (applicationID == "Select" && healthRuleTypeID != 8) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Kindly provide Application Name";
      // this.openAlertMod(template, this.message);

      return false;
    } else {
      this.metricList = [];

      if (healthRuleTypeID && applicationID) {

        const thres = new Threshold();
        thres.healthRuleTypeID = healthRuleTypeID;
        thres.applicationID = applicationID;
        thres.sessionDTO = this.sessionObject;
        console.log("healthRuleTypeID ", healthRuleTypeID)
        this.thresholdService
          .getThresholdByHealthRuleTypeAndApplication(thres)
          .pipe(
            switchMap((data) => from(this.decoderService.decodeObject(data)))
          )
          .subscribe((response: any) => {
            if (response.serviceStatus == "Success") {
              this.metricList = response.serviceResponse;
            }
          });

        if (healthRuleTypeID == 8) {

          this.alert.applicationId = 0;
          this.updateAlertObj.applicationId = 0;
          this.applicationMaster.applicationID = 0;
        }
      }
    }
    return true;
  }

  refreshDatasource() {
    this.alert.query = "";
    this.alert.ipAddress = null;
    this.alert.port = null;
    this.alert.dbName = null;
    this.alert.dbUsername = null;
    this.alert.dbPassword = null;
    this.alert.requestBody = "";
    if (this.viewUpdateCard) {
      this.updateAlertObj.query = "";
      this.updateAlertObj.requestBody = "";
    }
  }

  createAlert() {

    const regex = /^[a-zA-Z0-9_ ]*$/;

    if (!regex.test(this.alert.alertName)) {
      this.message = "Name can be Alphanumeric and underscore only";
      this.showToast(this.message, "error");
      return false;
    }


    if (this.alert.alertName == null || this.alert.alertName == "") {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Kindly provide Health Rule Name";
      this.showToast(this.message, "error");
      return false;
    }
    if (
      !this.selectedAppType
    ) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Kindly select any Application Type";
      this.showToast(this.message, "error");
      return false;
    }
    if (
      this.alert.applicationId == "Select" ||
      this.alert.applicationId == null
    ) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Kindly provide Application Name";
      this.showToast(this.message, "error");
      return false;
    }
    if (
      !this.customAlertTemplate &&
      (this.alert.healthRuleId == "Select" || this.alert.healthRuleId == null)
    ) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Kindly provide Health Rule Type";
      this.showToast(this.message, "error");
      return false;
    }
    if (![6, 7, 8].includes(Number(this.alert.healthRuleId))) {
      if (
        this.alert.serviceTypeId == "Select" ||
        this.alert.serviceTypeId == null
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide Metric Name";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.hostApp == this.selectedAppType &&
        (this.alert.ipAddressId == "Select" || !this.alert.ipAddressId)
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide Ip Address";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        !this.customAlertTemplate &&
        (this.alert.dataSource == "Select" || this.alert.dataSource == null)
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide Data Source";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.alert.dataSource == "Database" &&
        (this.alert.dbType == "Select" || !this.alert.dbType)
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly Select database type";
        this.showToast(this.message, "error");
        return false;
      }
      if (this.alert.dataSource == "Database" && !this.alert.ipAddress) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide DB IP Address";
        this.showToast(this.message, "error");
        return false;
      }
      if (this.alert.dataSource == "Database" && !this.alert.port) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide DB Port";
        this.showToast(this.message, "error");
        return false;
      }
      if (this.alert.dataSource == "Database" && !this.alert.dbName) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide DB Name";
        this.showToast(this.message, "error");
        return false;
      }
      if (this.alert.dataSource == "Database" && !this.alert.dbUsername) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide DB Username";
        this.showToast(this.message, "error");
        return false;
      }
      if (this.alert.dataSource == "Database" && !this.alert.dbPassword) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide DB Password";
        this.showToast(this.message, "error");
        return false;
      }
      if (this.alert.dataSource == "Database" && !this.alert.query) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide DB Query";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.alert.dataSource == "Elastic Search" &&
        this.alert.query == "" &&
        this.alert.applicationType == this.srgApp
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide API";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.alert.dataSource == "Elastic Search" &&
        this.alert.requestBody == "" &&
        this.alert.applicationType == this.srgApp
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide Request Body";
        this.showToast(this.message, "error");
        return false;
      }
    } else {
      this.alert.serviceTypeId = 0;
      this.alert.ipAddressId = 0;
    }
    if (this.alert.dbPassword) {
      this.alert.dbPassword = this.setEncryption(this.alert.dbPassword);
    }
    if (this.customAlertTemplate) {
      this.alert.ipAddressId =
        this.alert.ipAddressId && this.alert.ipAddressId != "Select"
          ? this.alert.ipAddressId
          : "1";
      this.alert.dataSource = "Elastic Search";
      this.alert.isMetricColumnAggregated = true;
      this.alert.customAlertName = this.metricName;
      this.alert.params = this.dynamicConfigForm.value;
      const additionalData: object = this.dynamicConfigForm.value;
      for (let [key, value] of Object.entries(additionalData)) {
        if (key == "PROCESS_LIST" || key === "SERVICE_LIST") {
          if (value.length == this.dynamicConfigData[key].length) {
            this.alert.params[key] = "ALL";
          } else {
            var concatData = value.join(",");
            this.alert.params[key] = concatData;
          }
        }
      }

      const ruleType = this.getRuleType(this.technology, this.selectedAppType)
      this.alert.healthRuleId = this.getHealthRuleId(ruleType);


      if (this.selectedAppType === this.networkApp) {
        this.setNetworkParams(this.alert.params);
      }

      for (let [key, value] of Object.entries(this.alert.params)) {
        if (!value || value == "" || value == "Select") {
          this.isSuccess = false;
          this.isError = true;
          this.message = `Kindly provide ${key}`;
          this.showToast(this.message, "error");
          return false;
        }
      }
    }
    this.alert.createdBy = this.currentUser.userId;
    this.alert.sessionDTO = this.sessionObject;
    this.alertService
      .createAlert(this.alert)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.isSuccess = true;
          this.isError = false;
          this.message = response.serviceResponse;
          this.showToast(this.message, "success");
          this.showTable();
        } else if (response.serviceStatus == "Fail") {
          this.isError = true;
          this.isSuccess = false;
          this.message = response.serviceResponse;
          this.showToast(this.message, "error");
        }
        if (this.customAlertTemplate) {
          this.alert.healthRuleId = "Select";
          this.alert.dataSource = "Select";
        }
      });
    return true;
  }



  getAllAlerts(callParam: any, applicationId: any) {


    if (applicationId === "Select") return;


    if (applicationId == 0) {
      applicationId = null;
    }

    this.alertService
      .getAllAlerts(this.sessionObject, applicationId)
      .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {

          this.alertByApplicationIdList = response.serviceResponse;

          this.setAlertCurrentPage = 1;

          this.setAlertTotalItems = this.alertByApplicationIdList.length;

          this.setAlertTotalPages = Math.ceil(
            this.setAlertTotalItems / this.setAlertPageSize
          );
        }
      });

    if (callParam != "crud") this.alertByApplicationId = null;
  }

  // getAlertsByApplication(applicationId: number) {
  //   this.setAlertCurrentPage = 1;

  //   this.alertByApplicationIdList = [];

  //   this.alertByApplicationIdList = this.allAlertList.filter((element: any) => {
  //     return element.applicationId == applicationId;
  //   });

  //   this.setAlertTotalItems = this.alertByApplicationIdList.length;

  //   this.setAlertTotalPages = Math.ceil(
  //     this.setAlertTotalItems / this.setAlertPageSize
  //   );



  //   // this.resetPagination(this.alertByApplicationIdList)
  // }

  getAllApplicationsByUserID() {
    this.currentUser.sessionDTO = this.sessionObject;
    this.applicationIPConfigurationServiceService
      .getAllApplicationsByUserID(this.currentUser)
      .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        if (response.serviceStatus === "Success") {
          const mappedResponse = response.serviceResponse.map((app: any) => ({
            ...app,
            applicationId: app.appID || app.applicationId
          }));
          
          this.viewHistoryApplicationList = mappedResponse;
          this.applicationList = mappedResponse;
          this.applicationNames = mappedResponse;

          this.applicationList.sort((a: any, b: any) => {
            return a.applicationName
              .toLowerCase()
              .localeCompare(b.applicationName.toLowerCase());
          });
          this.viewHistoryApplicationList.sort((a: any, b: any) => {
            return a.applicationName
              .toLowerCase()
              .localeCompare(b.applicationName.toLowerCase());
          });
        } else {
          this.applicationList = [];
          this.viewHistoryApplicationList = [];
          this.applicationNames = [];
        }
      });
  }

  updateAlert() {
    const regex = /^[a-zA-Z0-9_]*$/;
    if (!regex.test(this.updateAlertObj.alertName)) {
      this.message = "Name can be Alphanumeric and underscore only";
      this.showToast(this.message, "error");
      return false;
    }
    if (
      this.updateAlertObj.alertName == null ||
      this.updateAlertObj.alertName == ""
    ) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Kindly provide Health Rule Name";
      this.showToast(this.message, "error");
      return false;
    }
    if (
      this.updateAlertObj.applicationId == "Select" ||
      this.updateAlertObj.applicationId == null ||
      this.updateAlertObj.applicationId == undefined
    ) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Kindly provide Application Name";
      this.showToast(this.message, "error");
      return false;
    }
    if (
      this.updateAlertObj.healthRuleId == "Select" ||
      this.updateAlertObj.healthRuleId == null ||
      this.updateAlertObj.healthRuleId == undefined
    ) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Kindly provide Health Rule Type";
      this.showToast(this.message, "error");
      return false;
    }
    // if (this.updateAlertObj.healthRuleId == "") {
    //   this.isSuccess = false;
    //   this.isError = true;
    //   this.message = "Kindly provide Health Rule Type";
    //   this.openAlertMod(template, this.message);
    //   return false;
    // }

    if (
      this.updateAlertObj.healthRuleId != "8" &&
      this.updateAlertObj.healthRuleId != "7" &&
      this.updateAlertObj.healthRuleId != "6"
    ) {
      if (
        this.updateAlertObj.serviceTypeId == "Select" ||
        this.updateAlertObj.serviceTypeId == null ||
        this.updateAlertObj.serviceTypeId == ""
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide Metric Name";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.updateAlertObj.ipAddressId == "Select" ||
        this.updateAlertObj.ipAddressId == null
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide Ip Address";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.updateAlertObj.dataSource == "Select" ||
        this.updateAlertObj.dataSource == null
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide Data Source";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.updateAlertObj.dataSource == "Relational" &&
        !this.updateAlertObj.query
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide Sql Query";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.updateAlertObj.dataSource == "Elastic Search" &&
        !this.updateAlertObj.query
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide API";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.updateAlertObj.dataSource == "Elastic Search" &&
        !this.updateAlertObj.requestBody
      ) {
        this.isSuccess = false;
        this.isError = true;
        this.message = "Kindly provide Request Body";
        this.showToast(this.message, "error");
        return false;
      }
      if (
        this.updateAlertObj.applicationType == "SERVICE" ||
        this.updateAlertObj.applicationType == "Host"
      ) {
        this.updateAlertObj.params = this.dynamicConfigForm.value;
        const additionalData: object = this.dynamicConfigForm.value;
        for (let [key, value] of Object.entries(additionalData)) {
          if (key == "PROCESS_LIST" || key === "SERVICE_LIST") {
            if (value.length == this.dynamicConfigData[key].length) {
              this.updateAlertObj.params[key] = "ALL";
            } else {
              var concatData = value.join(",");
              this.updateAlertObj.params[key] = concatData;
            }
          }
        }
        for (let [key, value] of Object.entries(this.updateAlertObj.params)) {
          if (!value || value == "" || value == "Select") {
            this.isSuccess = false;
            this.isError = true;
            this.message = `Kindly provide ${key}`;
            this.showToast(this.message, "error");
            return false;
          }
        }
        this.updateAlertObj.customAlertName = this.metricName;
      }
    } else {
      this.updateAlertObj.ipAddressId = 1;
    }
    let applicationName = null;
    if (this.updateAlertObj.applicationType == this.srgApp) {
      for (let x of this.applicationList) {
        if (x.appID == this.updateAlertObj.applicationId) {
          applicationName = x.applicationName;
        }
      }
    } else if (this.updateAlertObj.applicationType == "SERVICE") {
      let appName: any = this.ServiceNames.find(
        (data: any) => data.appID == this.updateAlertObj.applicationId
      );
      if (appName) {
        applicationName = appName.applicationName;
      }
    } else if (this.updateAlertObj.applicationType == "Host") {
      let appName: any = this.infraList.find(
        (data: any) => data.appID == this.updateAlertObj.applicationId
      );
      if (appName) {
        applicationName = appName.applicationName;
      }
    }
    this.sessionObject.applicationName = applicationName;
    this.updateAlertObj.editedBy = this.currentUser.userId;
    this.updateAlertObj.sessionDTO = this.sessionObject;
    this.alertService
      .updateAlert(this.updateAlertObj)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          // this.alertByApplicationId = this.updateAlertObj.applicationId;
          // this.getAllAlerts('crud');
          this.isSuccess = true;
          this.isError = false;
          this.message = response.serviceResponse;
          this.showToast(this.message, "success");
          this.showTable();
        } else if (response.serviceStatus == "Fail") {
          this.isError = true;
          this.isSuccess = false;
          this.message = response.serviceResponse;
          this.showToast(this.message, "error");
        }
      });
    return true;
  }

  viewUpdate(alertobj: AlertDetails, template: TemplateRef<any>) {
    this.updateAlertObj = null;
    this.updateAlertObj = alertobj;
    this.isTable = false;
    this.viewUpdateCard = true;
    this.isUpdateForm = true;
    this.isForm = false;
    this.isTable = false;
    this.resetCustomConfiguration();

    const params = this.updateAlertObj.additionalParams || {};

    Object.keys(params).forEach(field => {

      const value = params[field];

      // convert string values to empty array so input condition works
      if (typeof value === 'string') {
        this.dynamicConfigData[field] = [];
      } else {
        this.dynamicConfigData[field] = value;
      }

      this.dynamicConfigForm.addControl(
        field,
        new FormControl(value) // keep actual value in form
      );

    });
    this.getAllIpAddressByAppId(alertobj.applicationId, "viewUpdate");
    this.getMetricName(alertobj.healthRuleId, alertobj.applicationId, template);
    this.isAPM = this.isSRG = this.isInfra = this.isNetwork = this.isDatabase = false;
    this.technology = null;

    if (this.selectedAppType3) {
      if (this.selectedAppType3 == this.srgApp) {
        this.getAllApplicationsByUserID();
      } else {
        // Load technology list first, then set technology and load applications inside callback
        this.loadTechnology(this.selectedAppType3, () => {
          // Derive technology from healthRuleName after technologyList is populated
          if (this.technologyList && this.technologyList.length > 0) {
            const matchedTech = this.technologyList.find(
              (t: any) => t.technologyType?.toLowerCase() === alertobj.healthRuleName?.toLowerCase()
            );
            this.technology = matchedTech ? matchedTech.technologyType : this.updateAlertObj.healthRuleName;
          } else {
            this.technology = this.updateAlertObj.healthRuleName;
          }
          // Now load applications with the resolved technology
          if (this.technology) {
            this.loadApplications(this.technology, this.selectedAppType3);
          }
        });
      }
    }

    // disable down arrow for Application Select Menu
    setTimeout(() => {
      const appSelect = document.getElementById('appName');
      if (appSelect) appSelect.classList.add('input-select');
    }, 10);

  }

  openDeleteUser(template: TemplateRef<any>, alertobj: AlertDetails) {
    this.showTemplateToast(template)
    this.deleteAlertObj = alertobj;
  }

  deleteAlert() {
    this.buttonDisable = true;
    let applicationName = null;
    if (this.applicationList) {
      for (let x of this.applicationList) {
        if (x.appID == this.deleteAlertObj.applicationId) {
          applicationName = x.applicationName;
          break;
        }
      }
    }
    this.sessionObject.applicationName = applicationName;
    this.deleteAlertObj.editedBy = this.currentUser.userId;
    this.deleteAlertObj.sessionDTO = this.sessionObject;
    this.alertService
      .deleteAlert(this.deleteAlertObj)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.isSuccess = true;
          this.isError = false;
          this.cancelRequest();
          this.showToast("Health Rule Deleted Successfully.", 'success');
          this.alertByApplicationIdList = [];
          this.alertByApplicationId = this.deleteAlertObj.applicationId;
          this.getAllAlerts("crud", this.alertByApplicationId);
        } else {
          // alert(response.serviceError);
          this.cancelRequest();
          this.showToast(response.serviceError, 'error');
        }
        this.buttonDisable = false;
        // this.getAllActiveUsers();
        this.cancelRequest();
      });
  }

  getAllAlertDurations() {
    this.alertService
      .getAllAlertDurations(this.sessionObject)
      .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.allAlertDurationsList = response.serviceResponse;
        }
      });
  }
  // ---------------------Health rule(end)---------------------

  // ---------------------Set Alert(start)---------------------

  showSetAlert() {
    // this.getAllAlertDurations();
    this.setViewMode('create');
    this.checkflagforHealthruleType = true;
    this.isCreation = true;
    this.isUpdation = false;
    this.isTable = false;
    this.viewAlertTable = false;
    this.resetCreateSetAlertForm();
  }

  showViewAlertsInSetAlert() {
    this.setViewMode('table');
    this.isTable = true;
    this.isCreation = false;
    this.isUpdation = false;
    this.viewAlertTable = true;
    this.selectedAppType2 = "Select";
    this.alertConfigObj.applicationId = "Select";
    this.allSetAlertList = [];
    this.isSRG2 = false;
    this.isAPM2 = false;
    this.isInfra2 = false;
    this.iskubernetes2 = false;
    this.isDatabase2 = false;
    this.isNetwork2 = false;
  }

  getMetricDetailsByHealthRuleServiceTypeID() {
    const thres = new Threshold();
    thres.applicationID = this.applicationID;
    if (this.isUpdation) {
      thres["healthRuleName"] = this.alertConfig.alertName;
    } else {
      for (let a of this.healthRuleList) {
        if (a.id == parseInt(this.alertConfig.alertId)) {
          thres["healthRuleName"] = a.alertName;
          break;
        }
      }
    }
    this.alertConfig.sessionDTO = this.sessionObject;
    this.alertService
      .getMetricIdfromAlertId(this.alertConfig)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          let healthid = response.serviceResponse;
          this.alertObj.healthRuleId = healthid;
          if (healthid == 6 || healthid == 7 || healthid == 8) {
            this.checkflagforHealthruleType = false;
          } else {
            this.checkflagforHealthruleType = true;
          }
        }

        if (this.checkflagforHealthruleType) {
          thres.sessionDTO = this.sessionObject;
          this.thresholdService
            .getThresholdByHealthRuleNameAndApplicationID(thres)
            .pipe(first())
            .subscribe((response: any) => {
              if (response.serviceStatus == "Success") {
                let metricUsed = response.serviceResponse;
                this.alertConfig.thresholdDataUnit =
                  metricUsed.dataUnit == "Value"
                    ? "Number"
                    : metricUsed.dataUnit;
                if (this.selectedAppType1 && this.selectedAppType1 != "Select") {
                  this.alertConfig.thresholdWarningValue =
                    metricUsed.warningPercentage;
                  this.alertConfig.thresholdCriticalValue =
                    metricUsed.criticalPercentage;
                } else if (
                  !this.alertConfig.thresholdWarningValue &&
                  !this.alertConfig.thresholdCriticalValue
                ) {
                  this.alertConfig.thresholdWarningValue =
                    metricUsed.warningPercentage;
                  this.alertConfig.thresholdCriticalValue =
                    metricUsed.criticalPercentage;
                }
              } else {
                this.message =
                  "Kindly provide proper Metric for Health Rule !!";
                this.isError = true;
                this.isSuccess = false;
                this.showToast(this.message, 'error');
              }
            });
        } else {
          if (this.alertObj.healthRuleId == 6 && this.isCreation) {
            this.alertConfig.ruambotAgent = "Select";
            let application = new ApplicationMaster();
            application.applicationID = this.applicationID;
            application.sessionDTO = this.sessionObject;
            this.alertService
              .getRuambotAgentListByapplication(application)
              .pipe(first())
              .subscribe((response: any) => {
                if (response.serviceStatus == "Success") {
                  this.agentList = response.serviceResponse;
                  if (this.agentList.length < 1) {
                    this.message =
                      "No Ruambot Agent configured for the selected application";
                    this.isError = true;
                    this.isSuccess = false;
                    // this.openAlertMod(this.alertTemplate, this.message);
                  }
                } else {
                  this.message =
                    "No Ruambot Agent configured for the selected application";
                  this.isError = true;
                  this.isSuccess = false;
                  // this.openAlertMod(this.alertTemplate, this.message);
                }
              });
          } else if (
            (this.alertObj.healthRuleId == 7 && this.isCreation) ||
            (this.alertObj.healthRuleId == 8 && this.isCreation)
          ) {
            this.alertConfig.ruambotJob = "Select";
            let application = new ApplicationMaster();
            application.sessionDTO = this.sessionObject;
            application.applicationID = this.applicationID;
            this.alertService
              .getRuambotJobListByapplication(application)
              .pipe(first())
              .subscribe((response: any) => {
                if (response.serviceStatus == "Success") {
                  this.jobList = response.serviceResponse;
                  if (this.jobList.length < 1) {
                    this.message =
                      "No Jobs configured for the selected application";
                    this.isError = true;
                    this.isSuccess = false;
                    // this.openAlertMod(this.alertTemplate, this.message);
                  }
                } else {
                  this.message =
                    "No Jobs configured for the selected application";
                  this.isError = true;
                  this.isSuccess = false;
                  // this.openAlertMod(this.alertTemplate, this.message);
                }
              });
          }
        }
      });
  }

  configureAlert() {
    // Sync email chips to config fields before validation
    this.syncEmailListsToConfig();
    this.alertConfig.applicationId = this.applicationID;
    this.alertConfig.sessionDTO = this.sessionObject;
    if (this.alertConfig.evaluationType != 'IMMEDIATE') {
      this.alertConfig.triggerInterval = 1
    }
    this.alertService
      .getMetricIdfromAlertId(this.alertConfig)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          let healthid = response.serviceResponse;
          this.alertObj.healthRuleId = healthid;
          if (healthid == 6 || healthid == 7 || healthid == 8) {
            this.checkflagforHealthruleType = false;
          } else {
            this.checkflagforHealthruleType = true;
          }
        }
      });
    if (!this.checkflagforHealthruleType) {
      this.alertConfig.dataFromLast = 0;
    }

    if (
      this.isAPM1 == false &&
      this.isInfra1 == false &&
      this.isSRG1 == false &&
      this.isNetwork1 == false &&
      this.isDatabase1 == false &&
      this.iskubernetes1 == false
    ) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Kindly select any Application Type";
      this.showToast(this.message, 'error');
      return false;
    }
    if (
      this.applicationID == "Select" ||
      this.applicationID == "" ||
      this.applicationID == null
    ) {
      this.message = "Kindly provide Application Name !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    } else if (
      this.alertConfig.alertId == "Select" ||
      this.alertConfig.alertId == "" ||
      this.alertConfig.alertId == null
    ) {
      this.message = "Kindly provide Health Rule Name !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    } else if (
      this.alertConfig.alertDurationId == "Select" ||
      this.alertConfig.alertDurationId == "" ||
      this.alertConfig.alertDurationId == null
    ) {
      this.message = "Kindly provide Duration !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');

      return;
    } else if (
      this.alertConfig.triggerInterval == "Select" ||
      this.alertConfig.triggerInterval == "" ||
      this.alertConfig.triggerInterval == null
    ) {
      this.message = "Kindly provide Trigger Interval !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');

      return;
    } else if (this.checkflagforHealthruleType) {
      if (
        this.alertConfig.dataFromLast == "Select" ||
        this.alertConfig.dataFromLast == "" ||
        this.alertConfig.dataFromLast == null
      ) {
        this.message = "Kindly provide Use Data From Last !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      } else if (
        !this.alertConfig.thresholdWarningValue &&
        !this.alertConfig.thresholdCriticalValue &&
        !this.alertConfig.thresholdDataUnit
      ) {
        this.message = "Kindly provide proper Metric for Health Rule !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }
    }
    if (!this.validateMetricNumber()) {
      this.message = "Kindly provide proper threshhold for Health Rule !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.emailAction == false &&
      this.alertConfig.smsAction == false
    ) {
      this.message = "Atleast provide email or sms";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    // Validating Level 1 Emails
    if (this.alertConfig.emailAction == true) {
      const hasLevel1 = (this.level1TOList && this.level1TOList.length > 0) ||
        (this.alertConfig.level1MailId && this.alertConfig.level1MailId.length > 0);

      if (!hasLevel1) {
        this.message = "Kindly provide Level 1 Email IDs !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }

      const hasLevel2 = (this.level2TOList && this.level2TOList.length > 0) ||
        (this.alertConfig.level2MailId && this.alertConfig.level2MailId.length > 0);

      if (!hasLevel2) {
        this.message = "Kindly provide Level 2 Email IDs !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }

      const hasLevel3 = (this.level3TOList && this.level3TOList.length > 0) ||
        (this.alertConfig.level3MailId && this.alertConfig.level3MailId.length > 0);

      if (!hasLevel3) {
        this.message = "Kindly provide Level 3 Email IDs !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }
    }
    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level1MobileNumber)
    ) {
      //this.alertConfig.level1MailId =="" && this.alertConfig.level1MailId == null;
      this.message = "Kindly provide valid Level1 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level1MobileNumber)
    ) {
      this.message = "Kindly provide valid Level1 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level1MobileNumber)
    ) {
      this.message = "Kindly provide valid Level1 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level2MobileNumber)
    ) {
      this.message = "Kindly provide valid Level2 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level3MobileNumber)
    ) {
      this.message = "Kindly provide valid Level3 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.emailAction == true &&
      this.alertConfig.smsAction == false
    ) {
      this.alertConfig.level1MobileNumber = null;
      this.alertConfig.level2MobileNumber = null;
      this.alertConfig.level3MobileNumber = null;
    }
    if (
      this.alertConfig.emailAction == false &&
      this.alertConfig.smsAction == true
    ) {
      this.alertConfig.level1MailId = null;
      this.alertConfig.level2MailId = null;
      this.alertConfig.level3MailId = null;
    }
    if (this.alertConfig.jiraAction == true && !this.alertConfig.jiraToolId) {
      this.message = "Kindly provide Jira ID !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.level2ElapsedTime == "" ||
      this.alertConfig.level2ElapsedTime == null
    ) {
      this.message = "Kindly provide level 2 Elapsed Time!!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    let checkElapsedTimeLevel2 = this.checkNumNoDecimal(
      this.alertConfig.level2ElapsedTime,
      "Level 2 Elapsed Time"
    );
    if (!checkElapsedTimeLevel2.bol) {
      this.message = checkElapsedTimeLevel2.msg;
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (this.alertConfig.level2ElapsedTime <= 0) {
      // alert("Level 2 Elapsed Time Should be Greater Than 0");
      this.message = "Level 2 Elapsed Time Should be Greater Than 0";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.level3ElapsedTime == "" ||
      this.alertConfig.level3ElapsedTime == null
    ) {
      this.message = "Kindly provide level 3  Elapsed Time!!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    let checkElapsedTimeLevel3 = this.checkNumNoDecimal(
      this.alertConfig.level3ElapsedTime,
      "Level 3 Elapsed Time"
    );
    if (!checkElapsedTimeLevel3.bol) {
      this.message = checkElapsedTimeLevel3.msg;
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (this.alertConfig.level3ElapsedTime <= 0) {
      // alert("Level 3 Elapsed Time Should be Greater Than 0");
      this.message = "Level 3 Elapsed Time Should be Greater Than 0";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (this.alertConfig.jiraAction && this.alertConfig.assigneeId) {
      this.alertConfig.assigneeName = this.getJiraAssigneeName(
        this.alertConfig.assigneeId
      );
    } else {
      this.alertConfig.assigneeId = null;
      this.alertConfig.assigneeName = null;
    }
    if (!this.alertConfig.jiraAction) {
      this.alertConfig.issueType = null;
      this.alertConfig.jiraToolId = null;
    }
    this.alertConfig.createdBy = this.currentUser.userId;
    this.alertConfig.sessionDTO = this.sessionObject;

    this.alertService
      .setConfiguredAlerts(this.alertConfig)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.isSuccess = true;
          this.isError = false;
          this.resetCreateAlertForm();
          this.resetCreateSetAlertForm();
          this.message = response.serviceResponse;
          this.showToast(this.message, 'success');
        } else if (response.serviceStatus == "Fail") {
          this.isError = true;
          this.isSuccess = false;
          this.message = response.serviceResponse;
          this.showToast(this.message, 'error');
        }
      });
    return true;
  }

  UpdateSetAlert() {
    // Sync email chips to config fields before validation
    this.syncEmailListsToConfig();
    this.alertConfig.applicationId = this.applicationID;

    if (
      this.applicationID == "Select" ||
      this.applicationID == "" ||
      this.applicationID == null
    ) {
      if (this.applicationID != 0) {
        this.message = "Kindly provide Application Name !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }
    } else if (
      this.alertConfig.alertId == "Select" ||
      this.alertConfig.alertId == "" ||
      this.alertConfig.alertId == null
    ) {
      this.message = "Kindly provide Health Rule Name !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    } else if (
      this.alertConfig.alertDurationId == "Select" ||
      this.alertConfig.alertDurationId == "" ||
      this.alertConfig.alertDurationId == null
    ) {
      this.message = "Kindly provide Duration !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    } else if (
      this.alertConfig.triggerInterval == "Select" ||
      this.alertConfig.triggerInterval == "" ||
      this.alertConfig.triggerInterval == null
    ) {
      this.message = "Kindly provide Trigger Interval !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    } else if (
      this.alertConfig.dataFromLast == "Select" ||
      this.alertConfig.dataFromLast == "" ||
      this.alertConfig.dataFromLast == null
    ) {
      this.message = "Kindly provide Use Data From Last !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    } else if (
      !this.alertConfig.thresholdWarningValue &&
      !this.alertConfig.thresholdCriticalValue &&
      !this.alertConfig.thresholdDataUnit
    ) {
      if (this.checkflagforHealthruleType) {
        this.message = "Kindly provide proper Metric for Health Rule !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }
    }
    if (!this.validateMetricNumber()) {
      this.message = "Kindly provide proper threshhold for Health Rule !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.emailAction == false &&
      this.alertConfig.smsAction == false
    ) {
      this.message = "Atleast provide email or sms";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    // Validating Level 1 Emails
    if (this.alertConfig.emailAction == true) {
      const hasLevel1 = (this.level1TOList && this.level1TOList.length > 0) ||
        (this.alertConfig.level1MailId && this.alertConfig.level1MailId.length > 0);

      if (!hasLevel1) {
        this.message = "Kindly provide Level 1 Email IDs !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }

      const hasLevel2 = (this.level2TOList && this.level2TOList.length > 0) ||
        (this.alertConfig.level2MailId && this.alertConfig.level2MailId.length > 0);

      if (!hasLevel2) {
        this.message = "Kindly provide Level 2 Email IDs !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }

      const hasLevel3 = (this.level3TOList && this.level3TOList.length > 0) ||
        (this.alertConfig.level3MailId && this.alertConfig.level3MailId.length > 0);

      if (!hasLevel3) {
        this.message = "Kindly provide Level 3 Email IDs !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }
    }

    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level1MobileNumber)
    ) {
      //this.alertConfig.level1MailId =="" && this.alertConfig.level1MailId == null;
      this.message = "Kindly provide valid Level1 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level1MobileNumber)
    ) {
      this.message = "Kindly provide valid Level1 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level1MobileNumber)
    ) {
      this.message = "Kindly provide valid Level1 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level2MobileNumber)
    ) {
      this.message = "Kindly provide valid Level2 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.smsAction == true &&
      !this.regexMobile.test(this.alertConfig.level3MobileNumber)
    ) {
      this.message = "Kindly provide valid Level3 Mobile Number !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.emailAction == true &&
      this.alertConfig.smsAction == false
    ) {
      this.alertConfig.level1MobileNumber = null;
      this.alertConfig.level2MobileNumber = null;
      this.alertConfig.level3MobileNumber = null;
    }
    if (
      this.alertConfig.emailAction == false &&
      this.alertConfig.smsAction == true
    ) {
      this.alertConfig.level1MailId = null;
      this.alertConfig.level2MailId = null;
      this.alertConfig.level3MailId = null;
    }
    if (this.alertConfig.jiraAction == true && !this.alertConfig.jiraToolId) {
      this.message = "Kindly provide Jira ID !!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.level2ElapsedTime == "" ||
      this.alertConfig.level2ElapsedTime == null
    ) {
      this.message = "Kindly provide Level 2  Elapsed time!!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    let checkElapsedTimeLevel2 = this.checkNumNoDecimal(
      this.alertConfig.level2ElapsedTime,
      "Level 2 Elapsed Time"
    );
    if (!checkElapsedTimeLevel2.bol) {
      this.message = checkElapsedTimeLevel2.msg;
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (this.alertConfig.level2ElapsedTime <= 0) {
      // alert("Level 2 Elapsed Time Should be Greater Than 0");
      this.message = "Level 2 Elapsed Time Should be Greater Than 0";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (
      this.alertConfig.level3ElapsedTime == "" ||
      this.alertConfig.level3ElapsedTime == null
    ) {
      this.message = "Kindly provide Level 3 Elapsed time!!";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    let checkElapsedTimeLevel3 = this.checkNumNoDecimal(
      this.alertConfig.level3ElapsedTime,
      "Level 3 Elapsed Time"
    );
    if (!checkElapsedTimeLevel3.bol) {
      this.message = checkElapsedTimeLevel3.msg;
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (this.alertConfig.level3ElapsedTime <= 0) {
      // alert("Level 3 Elapsed Time Should be Greater Than 0");
      this.message = "Level 3 Elapsed Time Should be Greater Than 0";
      this.isError = true;
      this.isSuccess = false;
      this.showToast(this.message, 'error');
      return;
    }
    if (this.alertObj.healthRuleId == 6) {
      if (
        this.alertConfig.ruambotAgent == "Select" ||
        this.alertConfig.ruambotAgent == "" ||
        this.alertConfig.ruambotAgent == null
      ) {
        this.message = "Kindly provide Agent Name !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }
    }
    if (this.alertObj.healthRuleId == 7 || this.alertObj.healthRuleId == 8) {
      if (
        this.alertConfig.ruambotJob == "Select" ||
        this.alertConfig.ruambotJob == "" ||
        this.alertConfig.ruambotJob == null
      ) {
        this.message = "Kindly provide Job Name !!";
        this.isError = true;
        this.isSuccess = false;
        this.showToast(this.message, 'error');
        return;
      }
    }
    if (this.alertConfig.jiraAction && this.alertConfig.assigneeId) {
      this.alertConfig.assigneeName = this.getJiraAssigneeName(
        this.alertConfig.assigneeId
      );
    } else {
      this.alertConfig.assigneeId = null;
      this.alertConfig.assigneeName = null;
    }
    if (!this.alertConfig.jiraAction) {
      this.alertConfig.issueType = null;
      this.alertConfig.jiraToolId = null;
    }

    if (this.alertConfig.evaluationType == "SAMPLING") {
      this.alertConfig.conBreachDuration = null
    }
    else if (this.alertConfig.evaluationType == "CONTINUOUS_DURATION") {
      this.alertConfig.samplingWindowSize = null
      this.alertConfig.samplingBreachCount = null

    }
    else {
      this.alertConfig.conBreachDuration = null
      this.alertConfig.samplingWindowSize = null
      this.alertConfig.samplingBreachCount = null
    }
    this.alertConfig.sessionDTO = this.sessionObject;
    this.alertService
      .updateConfiguredAlerts(this.alertConfig)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.isSuccess = true;
          this.isError = false;
          this.message = response.serviceResponse;
          this.isCreation = true;
          this.isUpdation = false;
          this.checkflagforHealthruleType = true;
          this.resetCreateAlertForm();
          this.resetCreateSetAlertForm();
          this.showToast(this.message, 'success');
        } else if (response.serviceStatus == "Fail") {
          this.isError = true;
          this.isSuccess = false;
          this.message = response.serviceResponse;
          this.showToast(this.message, 'error');
        }
      });
  }

  toggleAlertEnable(data: any) {
    let updatePayload = new AlertConfig();
    Object.assign(updatePayload, data);
    updatePayload.sessionDTO = this.sessionObject;
    updatePayload.isAlertEnable = data.isAlertEnable;

    // Fix backend mapping issues
    if (data.applicationID) {
      updatePayload.applicationId = data.applicationID;
    }
    
    // Remove fields that cause date parsing issues or are unnecessary
    delete updatePayload.createdOn;
    delete updatePayload.updatedOn;
    delete (updatePayload as any).applicationID; // DTO expects applicationId

    this.alertService
      .updateConfiguredAlerts(updatePayload)
      .pipe(first())
      .subscribe({
        next: (response: any) => {
          if (response.serviceStatus === "Success") {
            this.showToast("Alert enable status updated successfully", "success");
          } else {
            this.showToast(response.serviceResponse || "Failed to update alert status", "error");
            data.isAlertEnable = !data.isAlertEnable;
          }
        },
        error: (err) => {
          this.showToast("Failed to update alert status", "error");
          data.isAlertEnable = !data.isAlertEnable;
        }
      });
  }

  getHealthByAppId() {

    this.isError = false;
    this.isSuccess = false;
    this.alertConfig.alertId = "Select";
    if (this.isCreation) {
      this.alertObj.healthRuleId = null;
      this.alertConfig.alertId = "Select";
      this.alertConfig.ruambotAgent = "Select";
      this.alertConfig.ruambotJob = "Select";
    }
    let application = new ApplicationMaster();
    let applicationName = null;
    if (this.applicationList) {
      for (let x of this.applicationList) {
        if (x.appID == this.applicationID) {
          applicationName = x.applicationName;
          break;
        }
      }
    }
    this.sessionObject.applicationName = applicationName;
    application.sessionDTO = this.sessionObject;
    application.applicationID = this.applicationID;
    this.alertService
      .getHealthByAppId(application)
      // .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.healthRuleList = response.serviceResponse;
        } else if (
          response.serviceStatus == "Fail" &&
          response.serviceResponse == "Data Not Found"
        ) {
          this.healthRuleList = null;
          this.isError = true;
          this.isSuccess = false;
          this.message = "No Health Rule Set For Selected Application";
          // this.openAlertMod(template, this.message);
          this.showToast(this.message, 'error');
        } else {
          this.healthRuleList = null;
          this.isError = true;
          this.isSuccess = false;
          this.message = "Something went wrong !!";
          this.showToast(this.message, 'error');
        }
      });
  }
  // ---------------------Set Alert(end)---------------------

  // ---------------------View Alert(start)---------------------
  // @HostListener('window:scroll', ['$event'])
  // scrollHandler(event) {
  //   if ($(".content-header").scrollTop() < 20) {
  //     $('.noVerticalScroll').show();
  //   }
  //   else {
  //     $('.noVerticalScroll').hide();
  //   }
  // }

  // getAllSetAlerts() {
  //   this.clearDataForpagination();

  //   this.resetCreateSetAlertForm();
  //   this.isUpdateForm = false;
  //   this.searchText = "";
  //   // this.allSetAlertList = null;
  //   this.alertService
  //     .getAllSetAlerts(this.sessionObject)
  //     .pipe(first())
  //     .subscribe((response: any) => {
  //       if (response.serviceStatus == "Success") {
  //         this.allSetAlertList = null;
  //         this.allSetAlertList = response.serviceResponse;
  //         // this.resetPagination(this.allSetAlertList);
  //       }
  //     });
  // }

  setViewMode(mode: 'create' | 'update' | 'table') {
    this.isCreation = mode === 'create';
    this.isUpdation = mode === 'update';
    this.isTable = mode === 'table';
    this.viewAlertTable = mode === 'table';
  }

  backToSetAlertForm() {
    // Switch view FIRST
    this.setViewMode('create');

    // Fully reset the form
    this.resetCreateSetAlertForm();

    // Reset secondary (table-side) state
    this.selectedAppType2 = 'Select';
    this.alertConfigObj.applicationId = 'Select';
    this.allSetAlertList = [];

    this.isSRG2 = false;
    this.isAPM2 = false;
    this.isInfra2 = false;
    this.iskubernetes2 = false;
    this.isNetwork2 = false;
    this.isDatabase2 = false;

    // Optional: reset pagination/search
    this.searchAlert = '';
    this.alertListcurrentPage = 1;
  }


  resetCreateSetAlertForm() {
    this.q = 1;
    this.viewAlertTable = false;
    this.viewAlertHistoryTable = false;
    this.searchAlert = "";
    this.isCreation = true;
    this.alertTechnology = ""
    // this.showSetAlert();
    this.alertConfig.alertDurationId = "";
    this.alertConfig.triggerInterval = "";
    this.alertConfig.dataFromLast = "";
    this.alertConfig.thresholdDataUnit = null;
    this.alertConfig.thresholdWarningValue = null;
    this.alertConfig.thresholdCriticalValue = null;
    this.alertConfig.emailAction = false;
    this.alertConfig.smsAction = false;
    this.alertConfig.jiraAction = false;
    this.alertConfig.level1MailId = null;
    this.alertConfig.level2MailId = null;
    this.alertConfig.level3MailId = null;
    this.alertConfig.level1MobileNumber = null;
    this.alertConfig.level2MobileNumber = null;
    this.alertConfig.level3MobileNumber = null;
    this.alertConfig.level2ElapsedTime = null;
    this.alertConfig.level3ElapsedTime = null;
    this.alertConfig.jiraToolId = "";
    this.alertConfig.assigneeId = "";
    this.alertConfig.assigneeName = "";
    this.alertConfig.issueType = "Task";
    this.alertConfig.alertId = "Select";
    this.jiraAssigneeList = [];
    this.issueTypes = ['Task'];
    this.applicationID = "Select";
    this.alertConfig.ruambotAgent = "Select";
    this.alertConfig.ruambotJob = "Select";
    this.alertConfig.emailAction = true;
    this.alert.healthRuleId = null;
    this.alertObj.healthRuleId = null;
    this.isAPM1 = false;
    this.isSRG1 = false;
    this.isInfra1 = false;
    this.selectedAppType1 = "Select";
    this.metricCriticalErrorMsg = "";
    this.metricWarningErrorMsg = "";
    this.level1TOList = []
    this.level1CCList = []
    this.level1BCCList = []

    this.level2TOList = []
    this.level2CCList = []
    this.level2BCCList = []

    this.level3TOList = []
    this.level3CCList = []
    this.level3BCCList = []
  }

  viewSetUpdate(alertconfig: any) {
    this.setViewMode('update');
    this.isCreation = false;
    this.isUpdation = true;
    this.isTable = false;
    this.selectedAppType1 = alertconfig.applicationType;
    // this.isSRG1 = false;
    // this.isAPM1 = false;
    // this.isInfra1 = false;
    // this.isNetwork1 = false;
    // this.isDatabase1 = false;
    // if (alertconfig.applicationType == this.srgApp) {
    //   this.isSRG1 = true;
    // } else if (alertconfig.applicationType == "ApMoSys APM") {
    //   this.isAPM1 = true;
    // }
    // else if (alertconfig.applicationType.toLowerCase() == "host") {
    //   this.isInfra1 = true;
    // }
    // else if (alertconfig.applicationType.toLowerCase() == "relational") {
    //   this.isDatabase1 = true;
    // }
    // else if (alertconfig.applicationType.toLowerCase() == "network") {
    //   this.isNetwork1 = true;
    // }
    // let seeAlertTab = document.querySelector(".seeAlerts-tab");
    // let seeAlertsHistory = document.querySelector(".seeAlertsHistory-tab");
    // let notificationTab = document.querySelector(".notification-tab");

    // seeAlertTab?.classList.remove("active");
    // notificationTab?.classList.add("active");

    this.alertConfig = new AlertConfig();
    this.applicationID = alertconfig.applicationID;
    this.alertConfig.alertDurationId = alertconfig.alertDurationId;
    this.alertConfig.applicationType = alertconfig.applicationType;
    this.alertConfig.evaluationType = alertconfig.evaluationType;
    this.alertConfig.conBreachDuration = alertconfig.conBreachDuration;
    this.alertConfig.samplingWindowSize = alertconfig.samplingWindowSize;
    this.alertConfig.samplingBreachCount = alertconfig.samplingBreachCount;
    this.alertConfig.id = alertconfig.id;
    this.selectedAppType1 = this.selectedAppType2
    this.alertTechnology = this.technology
    this.alertConfig.level1MailId = alertconfig.level1MailId;
    this.level1TOList = alertconfig.level1MailId
      ? alertconfig.level1MailId.split(',').map((e: string) => e.trim())
      : [];
    this.alertConfig.level2MailId = alertconfig.level2MailId;
    this.level2TOList = alertconfig.level2MailId
      ? alertconfig.level2MailId.split(',').map((e: string) => e.trim())
      : [];

    this.alertConfig.level3MailId = alertconfig.level3MailId;
    this.level3TOList = alertconfig.level3MailId
      ? alertconfig.level3MailId.split(',').map((e: string) => e.trim())
      : [];
    this.alertConfig.level2ElapsedTime = alertconfig.level2ElapsedTime;
    this.alertConfig.level3ElapsedTime = alertconfig.level3ElapsedTime;
    this.alertConfig.level1MobileNumber = alertconfig.level1MobileNumber;
    this.alertConfig.level2MobileNumber = alertconfig.level2MobileNumber;
    this.alertConfig.level3MobileNumber = alertconfig.level3MobileNumber;
    this.alertConfig.jiraToolId = alertconfig.jiraToolId
      ? alertconfig.jiraToolId
      : "";
    this.alertConfig.assigneeId = alertconfig.assigneeId
      ? alertconfig.assigneeId
      : "";
    this.alertConfig.assigneeName = alertconfig.assigneeName;
    this.alertConfig.issueType = alertconfig.issueType
      ? alertconfig.issueType
      : "Task";
    this.alertConfig.thresholdDataUnit = alertconfig.thresholdDataUnit;
    this.alertConfig.thresholdCriticalValue =
      alertconfig.thresholdCriticalValue;
    this.alertConfig.thresholdWarningValue = alertconfig.thresholdWarningValue;
    this.alertConfig.isAlertEnable = alertconfig.isAlertEnable;
    this.alertConfig.emailAction = alertconfig.emailAction;
    this.alertConfig.smsAction = alertconfig.smsAction;
    this.alertConfig.jiraAction = alertconfig.jiraAction;
    this.alertConfig.triggerInterval = alertconfig.triggerInterval;
    this.alertConfig.dataFromLast = alertconfig.dataFromLast;
    this.alertConfig.alertName = alertconfig.alertName;
    this.alertConfig.alertId = alertconfig.alertId;
    this.alertConfig.ruambotAgent = alertconfig.ruambotAgent;
    this.alertConfig.ruambotJob = alertconfig.ruambotJob;
    if (this.alertConfig.jiraAction) {
      this.getAssigneeListForView(this.alertConfig.jiraToolId);
      this.getIssueTypes(this.alertConfig.jiraToolId);
    }
    this.getHealthRuleByAppId(alertconfig.alertId);
    this.getMetricDetailsByHealthRuleServiceTypeID();
  }

  getHealthRuleByAppId(alertId: any) {
    this.isError = false;
    this.isSuccess = false;
    if (this.checkApplication == -1) {
      this.checkApplication = this.applicationID;
    }
    let application = new ApplicationMaster();
    application.applicationID = this.applicationID;
    application.sessionDTO = this.sessionObject;
    this.alertService
      .getHealthRuleByAppId(application)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          if (
            this.checkApplication != this.applicationID ||
            this.healthRuleList == undefined
          ) {
            this.healthRuleList = response.serviceResponse;
            this.checkApplication = this.applicationID;
          }

          if (this.isUpdation) {
            this.alertConfig.alertId = alertId;
          }
        } else if (
          response.serviceStatus == "Fail" &&
          response.serviceResponse == "Data Not Found"
        ) {
          this.healthRuleList = null;
          this.isError = true;
          this.isSuccess = false;
          this.message = "No Health Rule Set For Selected Application";
          this.showToast(this.message, 'error');
        } else if (response.serviceStatus == "Fail") {
          this.healthRuleList = null;
          this.isError = true;
          this.isSuccess = false;
          this.showToast(response.serviceResponse, 'error');
        }
      });
  }

  openDeleteSetAlert(template: TemplateRef<any>, alertConfig: AlertConfig) {
    this.showTemplateToast(template);
    this.deleteAlertConfig = alertConfig;
  }

  deleteSetAlert() {
    this.buttonDisable = true;
    // this.deleteSetAlert.editedBy = this.currentUser.userId;
    let applicationName = null;
    if (this.applicationList) {


      for (let x of this.applicationList) {
        if (x.appID == this.deleteAlertConfig?.applicationId) {
          applicationName = x.applicationName;
        }
      }
    }
    this.sessionObject.applicationName = applicationName;
    this.deleteAlertConfig.sessionDTO = this.sessionObject;
    this.alertService
      .deleteSetAlert(this.deleteAlertConfig)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.isSuccess = true;
          this.isError = false;
          this.cancelRequest();
          this.showToast("Alert Deleted Successfully.", 'success');
          this.getViewAlertByAppId();
          this.buttonDisable = false;
        } else {
          this.cancelRequest();
          this.showToast(response.serviceResponse, 'error');
        }
        this.cancelRequest();
      });
  }
  // ---------------------View Alert(end)---------------------

  // ---------------------View Alert History(start)---------------------
  refreshAlertHistory() {
    this.clearDataForpagination();

    this.viewAlertTable = false;
    this.viewAlertHistoryTable = true;
    this.alertObj.applicationId = "Select";
    this.alertHistoryList = [];
    this.fromDate = undefined;
    this.toDate = undefined;
    this.selectedAppType4 = "Select";
    this.isSRG4 = false;
    this.isAPM4 = false;
    this.isInfra4 = false;
    this.iskubernetes4 = false;
    this.isDatabase4 = false;
  }

  getAlertHistory(value: any) {
    this.r = 1;
    let applicationName = null;
    if (this.applicationList) {
      for (let x of this.applicationList) {
        if (x.appID == value) {
          applicationName = x.applicationName;
          break;
        }
      }
    }
    // this.sessionObject.applicationName = appName;
    // this.sessionService.setSessionProperty(this.sessionObject).pipe(first()).subscribe((response: any) => {

    // });
    let application = new ApplicationMaster();
    application.applicationID = value;
    this.sessionObject.applicationName = applicationName;
    application.sessionDTO = this.sessionObject;
    this.alertService
      .getAlertHistory(application)
      .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.alertHistoryList = response.serviceResponse;
          this.numberOfAlerts = this.alertHistoryList.length;
          this.resetPaginationForVA(this.alertHistoryList);
        }
      });
  }

  downloadAlertHistoryExcel(): void {
    if (!this.alertHistoryList || !this.alertHistoryList.length) {
      return;
    }

    const excelData: any[] = [];

    this.alertHistoryList.forEach((alert: any) => {

      const htmlTable = alert.currentThresholdValue;

      if (!htmlTable) {
        return;
      }

      const rows = this.parseHtmlTable(htmlTable);

      rows.forEach(row => {
        excelData.push({
          'Health Rule Name': alert.alertName || '',
          'Level': alert.level || '',
          'Health Rule Type': alert.healthRuleType || '',
          'Alert Time': alert.createdOn || '',
          'Email': alert.email || '',

          'Application': row.application || '',
          'Metric Name': row.metricName || '',
          'Metric Type': row.metricType || '',
          'Mail Health Rule Name': row.healthRuleName || '',
          'Threshold Value': row.thresholdValue || '',
          'Breached Value': row.breachedValue || '',
          'IP Address': row.ipAddress || '',
          'Initiation Time': row.initiationTime || '',
          'Status': row.status || '',
          'Mail Level': row.level || ''
        });
      });
    });

    if (!excelData.length) {
      console.warn('Excel data is empty after parsing');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Alert History': worksheet },
      SheetNames: ['Alert History']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    this.saveExcelFile(excelBuffer, 'Alert_History');
  }

  private parseHtmlTable(html: string): any[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const tableRows = doc.querySelectorAll('tr');
    const result: any[] = [];

    // Skip header row → start from index 1
    for (let i = 1; i < tableRows.length; i++) {
      const cols = tableRows[i].querySelectorAll('td');

      if (!cols.length) {
        continue;
      }

      result.push({
        application: cols[0]?.innerText.trim(),
        metricName: cols[1]?.innerText.trim(),
        metricType: cols[2]?.innerText.trim(),
        healthRuleName: cols[3]?.innerText.trim(),
        thresholdValue: cols[4]?.innerText.trim(),
        breachedValue: cols[5]?.innerText.trim(),
        ipAddress: cols[6]?.innerText.trim(),
        initiationTime: cols[7]?.innerText.trim(),
        status: cols[8]?.innerText.trim(),
        level: cols[9]?.innerText.trim()
      });
    }

    return result;
  }


  private saveExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    saveAs(data, `${fileName}_${new Date().getTime()}.xlsx`);
  }



  getAlertHistoryByDateTimeRange(template: TemplateRef<any>) {
    this.r = 1;
    if (!this.selectedAppType4 || this.selectedAppType4 == "Select") {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Please select Application Type !!";
      this.showToast(this.message, 'error');
      return false;
    }
    if (
      this.alertObj.applicationId == "Select" ||
      this.alertObj.applicationId == undefined
    ) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Please select an Application Name !!";
      this.showToast(this.message, 'error');
      return false;
    }
    if (this.fromDate == undefined) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Please select Start date.";
      this.showToast(this.message, 'error');
      return false;
    }
    if (this.toDate == undefined) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Please select End date .";
      this.showToast(this.message, 'error');
      return false;
    }
    if (this.fromDate > this.toDate) {
      this.isSuccess = false;
      this.isError = true;
      this.message = "Start Date Should not be greater than End Date";
      this.showToast(this.message, 'error');
      return false;
    }
    this.numberOfAlerts = 0;

    let d = new Date();
    let dateFormat = "yyyy-MM-DD HH:mm:ss";
    let startDate = moment(this.fromDate).format(dateFormat);
    let endDate = moment(this.toDate).format(dateFormat);

    this.alertHistoryList = [];
    let data = {
      applicationID: this.alertObj.applicationId,
      startDate: startDate,
      endDate: endDate,
      sessionDTO: this.sessionObject,
    };
    this.alertService
      .getAlertHistoryByDateRange(data)
      .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        if (response.serviceStatus === "Success") {
          this.alertHistoryList = response.serviceResponse;
          this.numberOfAlerts = this.alertHistoryList.length;
        } else {
          this.numberOfAlerts = 0;
          this.isError = true;
          this.isSuccess = false;
          this.message = response.serviceResponse;
          this.showToast(this.message, 'error');
        }
      });
    return true;
  }
  // ---------------------View Alert History(end)---------------------

  validateAlphaNumericUnderscore(value: any) {
    const cleanedValue = value.trim(); // remove extra spaces at ends
    const regex = /^[a-zA-Z0-9_ ]*$/;

    if (!regex.test(cleanedValue)) {
      this.showToast("Only Alphanumeric, underscore, and spaces allowed!", "error");
      this.isError = true;
      this.isSuccess = false;
      return false;
    }

    this.isError = false;
    return true;
  }

  warningValueRegex: any;
  isWarningRegex = false;
  validateWarningPercentage(value: any) {
    // var expr = /^[1-9][0-9]?$|^99$/;
    if (value) {
      if (value < 0 || value > 2147483647) {
        this.warningValueRegex =
          "Warning Value should be Integer and between 1-2147483647 Only";
        this.isWarningRegex = true;
      } else {
        this.warningValueRegex = null;
        this.isWarningRegex = false;
      }
    } else {
      return true;
    }
    return false;
  }

  criticalValueRegex: any;
  isCriticalRegex = false;
  validateCriticalPercentage(value: any) {
    //var expr = /^[1-9][0-9]?$|^99$/;
    if (value) {
      if (value < 0 || value > 2147483647) {
        this.criticalValueRegex =
          "Critical Value should be Integer and between 1-2147483647 Only";
        this.isCriticalRegex = true;
      } else {
        this.criticalValueRegex = null;
        this.isCriticalRegex = false;
      }
    } else {
      return true;
    }
    return false;
  }

  level2ElapseTimeRegex: any;
  isLevel2ElapseTimeRegex = false;
  validateLevel2ElapseTime(value: any) {
    this.isLevel2ElapseTimeRegex = false;

    var expr = /^([1-9][0-9]{0,2}|10000)$/;
    if (value) {
      let check = this.checkNumNoDecimal(value, "Level 2 Elapsed Time");
      // if (!expr.test(value)) {
      if (!check.bol) {
        // this.level2ElapseTimeRegex = "Level 2 Elapse Time Should Be Greater Than 0 and no decimals allowed !!";
        this.isLevel2ElapseTimeRegex = true;
        this.level2ElapseTimeRegex = check.msg;
      } else {
        this.level2ElapseTimeRegex = null;
        this.isLevel2ElapseTimeRegex = false;
      }
    } else {
      return true;
    }
    return false;
  }

  level3ElapseTimeRegex: any;
  isLevel3ElapseTimeRegex = false;
  validateLevel3ElapseTime(value: any) {
    this.isLevel3ElapseTimeRegex = false;

    var expr = /^([1-9][0-9]{0,2}|10000)$/;
    if (value) {
      let check = this.checkNumNoDecimal(value, "Level 3 Elapsed Time");
      // if (!expr.test(value)) {
      if (!check.bol) {
        // this.level3ElapseTimeRegex = "Level 3 Elapse Time Should Be Greater Than 0 and no decimals allowed ";
        this.level3ElapseTimeRegex = check.msg;
        this.isLevel3ElapseTimeRegex = true;
      } else {
        this.level3ElapseTimeRegex = null;
        this.isLevel3ElapseTimeRegex = false;
      }
    } else {
      return true;
    }
    return false;
  }

  checkNumNoDecimal(num: any, mod: any) {
    let result = {
      bol: true,
      msg: "",
    };
    if (isNaN(+num)) {
      result.bol = false;
      result.msg = "Kindly provide in Number only for " + mod + " !!";
    } else {
      if (Number.isInteger(+num)) {
        var decimalRegex = /\.\d*/;
        if (decimalRegex.test(num)) {
          result.bol = false;
          result.msg =
            "Kindly provide Integer value only, greater than 0 for " +
            mod +
            " !!";
        } else {
          if (+num > 0) {
            result.bol = true;
          } else {
            result.bol = false;
            result.msg =
              "Kindly provide Integer value greater than 0 for " + mod + " !!";
          }
        }
      } else {
        result.bol = false;
        result.msg = "Kindly provide Integer value only for " + mod + " !!";
      }
    }
    return result;
  }

  getcommacount(email: string) {
    var count: any = {};
    email.split(",").forEach(function (s) {
      count[s] ? count[s]++ : (count[s] = 1);
    });
    return count;
  }
  getdotcount(email: string) {
    var count: any = {};
    email.split(".").forEach(function (s) {
      count[s] ? count[s]++ : (count[s] = 1);
    });
    return count;
  }

  worngEmailText1: string | any;
  worngEmailText2?: string | any;
  worngEmailText3?: string | any;
  ValidetEmail1(email: any) {
    var expr =
      /^(([a-z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)(\s*(,)\s*|\s*$))*$/;
    if (email) {
      if (expr.test(email)) {
        this.worngEmailText1 = null;
        return true;
      } else {
        this.worngEmailText1 = "Enter Valid Email";
        return false;
      }
    } else {
      return true;
    }
  }

  ValidetmultiEmail1(email: any) {
    //     var commacount=this.getcommacount(email);
    //     var dotcount=this.getdotcount(email);
    //     console.log("dotcount=="+dotcount);
    //     if (email) {
    //       if(commacount>dotcount){
    //         this.worngEmailText1 = "Enter Valid Email"
    //       }else{
    //         this.worngEmailText1 = null;
    //       }
    //     }else {
    //       return true;
    //     }
    // */
  }

  ValidetmultiEmail2(email: any) {
    /* var commacount=this.getcommacount(email);
     var dotcount=this.getdotcount(email);
     if (email) {
       if(commacount>dotcount){
         this.worngEmailText2 = "Enter Valid Email"
       }else{
         this.worngEmailText2 = null;
       }
     }else {
       return true;
     }
 */
  }

  ValidetmultiEmail3(email: any) {
    /*var commacount=this.getcommacount(email);
    var dotcount=this.getdotcount(email);
    if (email) {
      if(commacount>dotcount){
        this.worngEmailText3 = "Enter Valid Email"
      }else{
        this.worngEmailText3 = null;
      }
    }else {
      return true;
    }
*/
  }

  ValidetEmail(email: any) {
    // var expr = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
    var expr =
      /^(([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)(\s*(,)\s*|\s*$))*$/;
    if (email) {
      if (!expr.test(email)) {
        return true;
      }
      // } else {
      //   this.worngEmailText1 = "Enter Valid Email"
      // }
    } else {
      return false;
    }
    return false;
  }

  ValidetEmail2(email: any) {
    var expr =
      /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
    //var expr = /^(([a-z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)(\s*(,)\s*|\s*$))*$/;
    if (email) {
      if (expr.test(email)) {
        this.worngEmailText2 = null;
      } else {
        this.worngEmailText2 = "Enter Valid Email";
      }
    } else {
      return true;
    }
    return false;
  }

  ValidetEmail3(email: any) {
    var expr =
      /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
    //var expr = /^(([a-z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)(\s*(,)\s*|\s*$))*$/;
    if (email) {
      if (expr.test(email)) {
        this.worngEmailText3 = null;
      } else {
        this.worngEmailText3 = "Enter Valid Email";
      }
    } else {
      return true;
    }
    return false;
  }

  isLevel1MobileNumber = false;
  validateLevel1MobileNumber(value: any) {
    if (value != null || value != "") {
      // var expr = /^[1-9][0-9]{9}$/
      var expr = this.regexMobile;

      if (!expr.test(value)) {
        this.isLevel1MobileNumber = true;
      } else {
        this.isLevel1MobileNumber = false;
      }
    } else {
      this.isLevel1MobileNumber = false;
      return true;
    }
    return false;
  }

  isLevel2MobileNumber = false;
  validateLevel2MobileNumber(value: any) {
    if (value != null || value != "") {
      // var expr = /^[1-9][0-9]{9}$/
      var expr = this.regexMobile;
      if (!expr.test(value)) {
        this.isLevel2MobileNumber = true;
      } else {
        this.isLevel2MobileNumber = false;
      }
    } else {
      this.isLevel2MobileNumber = false;
      return true;
    }
    return false;
  }

  isLevel3MobileNumber = false;
  validateLevel3MobileNumber(value: any) {
    if (value != null || value != "") {
      // var expr = /^[1-9][0-9]{9}$/
      var expr = this.regexMobile;
      if (!expr.test(value)) {
        this.isLevel3MobileNumber = true;
      } else {
        this.isLevel3MobileNumber = false;
      }
    } else {
      this.isLevel3MobileNumber = false;
      return true;
    }
    return false;
  }

  searchHealthRule() {
    this.setAlertCurrentPage = 1;
  }

  pageChangeHealthRule($event: any) {
    this.p = $event;
  }

  searchViewAlerts() {
    this.alertconfListcurrentPage = 1;
    this.currentPage = 1;
  }

  pageChangeViewAlerts($event: any) {
    this.q = $event;
  }

  searchAlertHistory() {
    this.alertListcurrentPage = 1;
  }

  pageChangeAlertHistory($event: any) {
    this.r = $event;
  }

  sortBy(value: String) {
    this.sortparam = value;
    if (this.sortDirection === "desc") {
      this.sortDirection = "asc";
    } else {
      this.sortDirection = "desc";
    }
  }

  dateRange() {
    //this.getAlertHistoryByDateRange();
    // alert(this.range.value);
  }

  openDateModal(template: TemplateRef<any>) {
    // this.modalRef = this.modalService.show(template, { class: 'modal-md' });
  }

  validateEndDate(value: any) {
    const re = /^[+-e]*$/;
    if (!re.test(value)) {
      // this.openValidationErrModal(template, "Kindly provide valid Start day !!");
      return re.test(value);
    } else {
      return true;
    }
  }
  validateStartDate(value: any) {
    //alert();
    const re = /^[+-]?\d+(?:\.\d*(?:[eE][+-]?\d+)?)?$/;
    if (re.test(value)) {
      // this.openValidationErrModal(template, "Kindly provide valid Start day !!");
      return re.test(value);
      console.log("false");
    } else {
      return true;
    }
  }

  cancelDateModel() {
    // this.modalRef.hide();
  }

  openAlertMod(template: TemplateRef<any>, message: any) {
    // this.modalRef = this.modalService.show(template, { class: 'modal-sm' });
    this.alertMessage = message;
  }

  cancelRequest() {
    // this.modalRef.hide();
  }

  ClosedAlertModal() {
    // this.modalRef.hide();
    this.isCreation = true;
    this.isUpdation = false;
    this.resetCreateAlertForm();
    this.resetCreateSetAlertForm();
  }

  ClosedAlertModal2() {
    // this.modalRef.hide();
    this.isCreation = true;
    this.isUpdation = false;
    // this.resetCreateAlertForm();
    // this.resetCreateSetAlertForm();
  }

  resetCreateAlertForm() {
    this.checkflagforHealthruleType = true;
    this.alert.alertName = null;
    this.alert.applicationId = null;
    this.alert.healthRuleId = null;
    this.alert.serviceTypeId = null;
    this.alert.ipAddressId = null;
    this.alert.dataSource = null;
    this.alert.query = null;
    this.alert.ipAddress = null;
    this.alert.port = null;
    this.alert.dbName = null;
    this.alert.dbUsername = null;
    this.alert.dbPassword = null;
    this.alert.dbType = null;
    this.alert.requestBody = null;
    this.alertTechnology = ''
    this.resetCustomConfiguration();
  }

  clearDataForpagination() {
    this.p = 1;
    this.q = 1;
    this.r = 1;

    // this.allSetAlertList=[];
    this.alertByApplicationIdList = [];
    this.alertHistoryList = [];
    this.numberOfAlerts = 0;

    // this.changeDetectorRef.markForCheck();
  }

  getViewAlertByAppId() {
    let applicationName = "";
    for (let x of this.viewHistoryApplicationList) {
      if (x.appID == this.alertConfigObj.applicationId) {
        applicationName = x.applicationName;
        break;
      }
    }
    this.sessionObject.applicationName = applicationName;
    this.alertConfigObj.sessionDTO = this.sessionObject;
    this.alertService
      .getViewAlertByAppId(this.alertConfigObj)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.allSetAlertList = response.serviceResponse;
          this.alertconfListcurrentPage = 1;
          this.alertconfListtotalItems = this.allSetAlertList.length;
          this.alertconfListtotalPages = Math.ceil(
            this.alertconfListtotalItems / this.alertconfListpageSize
          );

        }
      });
  }

  goToAlertConfPage(page: number) {

    if (!page || page < 1) {
      this.alertconfListcurrentPage = 1;
    }
    else if (page > this.alertconfListtotalPages) {
      this.alertconfListcurrentPage = this.alertconfListtotalPages;
    }
    else {
      this.alertconfListcurrentPage = page;
    }

  }

  showViewAlertTable() {
    this.alertConfigObj.applicationId = "Select";
    this.selectedAppType2 = "Select";
    this.allSetAlertList = [];
    this.healthRuleList = undefined;
    this.isAPM2 = false;
    this.isInfra2 = false;
    this.iskubernetes2 = false;
    this.isSRG2 = false;
    this.isDatabase2 = false;
  }

  resetCreateHealthRule() {
    this.alert = new AlertDetails();
    this.alert.alertName = null;
    this.alert.applicationId = "Select";
    this.alert.healthRuleId = "Select";
    this.alert.serviceTypeId = "Select";
    this.alert.ipAddressId = "Select";
    this.alert.dataSource = "Select";
    this.alert.query = null;
    this.alert.ipAddress = null;
    this.alert.port = null;
    this.alert.dbName = null;
    this.alert.dbUsername = null;
    this.alert.dbPassword = null;
    this.alert.dbType = "Select";
    this.alert.requestBody = null;
    this.isAPM = false;
    this.isInfra = false;
    this.isSRG = false;
    this.selectedAppType = "Select";
  }

  omit_special_char_pwd(event: any) {
    var pattern = new RegExp(/[^\)/!%,(~`"%'{}:;><\[\]]+/);
    var result = pattern.test(event.key);
    return result;
  }

  omit_special_char_mail(event: any) {
    var pattern = new RegExp(/[^\)/!%(~`"'{}:;><#\[\]]+/);
    var result = pattern.test(event.key);
    return result;
  }
  // omit_special_char(event) {

  //   var k;
  //   k = event.charCode;  //        k = event.keyCode;  (Both can be used)
  //   if ((k == 44) || (k == 47) || (k == 33) || (k == 40) || (k == 41) || (k == 37) || (k == 126) || (k == 96) || (k == 34) || (k == 39) || (k == 123) || (k == 125) || (k == 91) || (k == 92) || (k == 58) || (k == 93) || (k == 59) || (k == 60) || (k == 62) || (k == 35)) {
  //     return (false);
  //   }
  //   else {
  //     return (true);
  //   }
  //   //return ((k > 64 && k < 91) || (k > 96 && k < 123) || k == 8 || (k >= 48 && k <= 57));
  // }

  // onPaste(e) {
  //   e.preventDefault();
  //   return false;
  // }

  omit_special_char(event: any) {
    var pattern = new RegExp(/[^\)/!%,(~`"%'{}:;><#\[\]]+/);
    var result = pattern.test(event.key);
    return result;
  }

  onPaste(event: any) {
    //this.otpError = "";
    let pastedText = "";
    pastedText = event.clipboardData.getData("text");
    let count = 0;
    let b = pastedText.split("");
    for (let i = 0; i < pastedText.length; i++) {
      let a = b[i];
      var pattern = new RegExp(/[^\)/%(~`"%'{}:;><#\[\]]+/);
      var result = pattern.test(a);
      if (result == true) {
        count++;
      }
    }
    if (count == pastedText.length) {
      //this.otpError = "";
      return true;
    } else {
      //this.otpError = "Please Enter Valid UserID or Password!!";
      event.preventDefault();
      return false;
    }
  }

  ngOnDestroy() {
    if (!this.browserRefresh) {
      sessionStorage.setItem(
        "onPageExitTime",
        moment(new Date()).format("DD-MM-YYYY HH:mm:ss")
      );
      this.loggerService.logMyInfo(this.sessionObject, "/alert");
    }
  }

  setDecryption(value: any) {
    var key = CryptoJS.enc.Utf8.parse("IjfgGhpOiLjbrtJf");
    var iv = CryptoJS.enc.Utf8.parse("pOiJlKmmHgFvdStf");
    var decrypted = CryptoJS.AES.decrypt(value, key, {
      keySize: 128 / 8,
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  setEncryption(value: any) {
    var key = CryptoJS.enc.Utf8.parse("IjfgGhpOiLjbrtJf");
    var iv = CryptoJS.enc.Utf8.parse("pOiJlKmmHgFvdStf");
    var encrypted = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(value.toString()),
      key,
      {
        keySize: 128 / 8,
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    return encrypted.toString();
  }

  validateIP1(ip: string) {
    if (!ip) return false;
    const re = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    return re.test(ip);
  }

  validateNumber(num: string) {
    if (num) {
      const re = /^[0-9]{1,5}$/;
      return re.test(num);
    } else {
      return false;
    }
  }

  validatePort(num: any) {
    if (num != undefined && num != "") {
      num = num.replace(/ /g, "");
      if (num.trim != undefined && num != "") {
        if (num > 0 && num <= 65535) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    }
    return false;
  }

  testConnection() {
    this.testConnectStatus = "";
    if (!this.alert.ipAddress) {
      this.isError = true;
      this.isSuccess = false;
      this.showToast("Kindly provide IP Address !!", "error");
      return false;
    }
    if (
      this.alert.dbType == "MySql" &&
      !this.validateIP1(this.alert.ipAddress)
    ) {
      this.isError = true;
      this.isSuccess = false;
      this.showToast("Kindly provide Valid IP Address!!", "error");
      return false;
    }
    if (!this.validateNumber(this.alert.port) ||
      !this.validatePort(this.alert.port)) {
      this.isError = true;
      this.isSuccess = false;
      this.showToast("Kindly provide Valid Port !!", "error");
      return false;
    }
    if (!this.alert.dbName) {
      this.isError = true;
      this.isSuccess = false;
      this.showToast("Kindly provide Database Name !!", "error");
      return false;
    }
    if (
      this.alert.dbType == "Select" ||
      this.alert.dbType == null ||
      this.alert.dbType == undefined
    ) {
      this.isError = true;
      this.isSuccess = false;
      this.showToast("Kindly select Database Type !!", "error");
      return false;
    }
    if (!this.alert.dbUsername) {
      this.isError = true;
      this.isSuccess = false;
      this.showToast("Kindly provide UserName !!", "error");
      return false;
    }
    if (!this.alert.dbPassword) {
      this.isError = true;
      this.isSuccess = false;
      this.showToast("Kindly provide Password !!", "error");
      return false;
    }
    this.alert.dbPassword = this.setEncryption(this.alert.dbPassword);
    this.alert.sessionDTO = this.sessionObject;
    this.alertService
      .testConnection(this.alert)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.isError = false;
          this.isSuccess = true;
          this.testConnectStatus = "Connected successfully";
          this.testConnectStatus = response.serviceResponse;
          this.showToast("Connected successfully", "success");
        } else {
          this.testConnectStatus = response.serviceResponse;
          if (this.testConnectStatus === "Database Connected") {
            this.isError = false;
            this.isSuccess = true;
          } else {
            this.isError = true;
            this.isSuccess = false;
          }
          this.showToast("Connection unsuccessful !!", "error");
        }
      });
    this.alert.dbPassword = this.setDecryption(this.alert.dbPassword);
    return;
  }

  // for calidation of metric
  validateMetricNumber() {
    this.metricWarningErrorMsg = "";
    this.metricCriticalErrorMsg = "";
    let success = true;
    if (this.alertConfig.thresholdDataUnit == "Percentage") {
      if (this.alertConfig.thresholdWarningValue) {
        if (
          !this.regexPercentage.test(this.alertConfig.thresholdWarningValue)
        ) {
          this.metricWarningErrorMsg = "Please provide value within 1-100";
          success = success && false;
        }
      }
      if (this.alertConfig.thresholdCriticalValue) {
        if (
          !this.regexPercentage.test(this.alertConfig.thresholdCriticalValue)
        ) {
          this.metricCriticalErrorMsg = "Please provide value within 1-100";
          success = success && false;
        }
      }
    } else if (this.alertConfig.thresholdDataUnit == "Number") {
      if (this.alertConfig.thresholdWarningValue) {
        if (!this.regexNumber.test(this.alertConfig.thresholdWarningValue)) {
          this.metricWarningErrorMsg = "Please provide value in numbers only";
          success = success && false;
        }
      }
      if (this.alertConfig.thresholdCriticalValue) {
        if (!this.regexNumber.test(this.alertConfig.thresholdCriticalValue)) {
          this.metricCriticalErrorMsg = "Please provide value in numbers only";
          success = success && false;
        }
      }
    }
    return success;
  }

  getJiraTools() {
    this.jiraToolList = [];
    this.alertService.getJiraTools().subscribe((serviceResponse: any) => {
      if (serviceResponse.serviceStatus == "Success") {
        this.jiraToolList = serviceResponse.serviceResponse;
      } else {
        console.log("Jira Api Failed");
      }
    });
  }

  getJiraToolName(jiraToolId: any) {
    let toolName = this.jiraToolList?.find(
      (data) => data.interConfigID == jiraToolId
    );
    return toolName ? toolName.jiraId : "";
  }

  getJiraAssigneeName(assigneeId: any) {
    let assignee = this.jiraAssigneeList?.find(
      (data) => data.assigneeId == assigneeId
    );
    return assignee ? assignee.assigneeName : "";
  }

  getAssigneeList(toolId: any) {
    this.jiraAssigneeList = [];
    this.alertConfig.assigneeId = "";
    this.alertConfig.assigneeName = "";
    this.alertService
      .getAssigneeList(toolId)
      .subscribe((serviceResponse: any) => {
        if (serviceResponse.serviceStatus == "Success") {
          this.jiraAssigneeList = serviceResponse.serviceResponse;
        } else {
          console.log("Jira Assignee API Failed");
        }
      });
  }

  getIssueTypes(toolId: any) {
    this.issueTypes = [];
    this.alertService
      .getIssueTypes(toolId)
      .subscribe((serviceResponse: any) => {
        if (serviceResponse.serviceStatus == "Success") {
          this.issueTypes = serviceResponse.serviceResponse;
        } else {
          this.issueTypes?.push("Task");
          console.log("Jira issue API Failed");
        }
      });
  }
  getAssigneeListForView(toolId: any) {
    this.jiraAssigneeList = [];
    this.alertService
      .getAssigneeList(toolId)
      .subscribe((serviceResponse: any) => {
        if (serviceResponse.serviceStatus == "Success") {
          this.jiraAssigneeList = serviceResponse.serviceResponse;
        } else {
          console.log("Jira Assignee API Failed");
        }
      });
  }

  getNetworkNames(): void {
    const featureType1 = "network";
    this.applicationIPConfigurationServiceService
      .getFullApplicationData(this.user?.userId, featureType1, this.sessionObject)
      .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        this.networkList = response.serviceResponse.applications;
        console.log("Network RESPONSE:", this.networkList);
      });
  }
  getDatabaseNames(type: any): void {
    const featureType1 = "Relational";

    this.applicationIPConfigurationServiceService
      .getFullApplicationData(this.user?.userId, featureType1, this.sessionObject, type)
      .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        this.databaseList = response.serviceResponse.applications;
        console.log("database RESPONSE:", this.databaseList);
      });
  }
  getkubernetesNames(type: any): void {
    const featureType1 = "kubernetes";
    this.applicationIPConfigurationServiceService
      .getFullApplicationData(this.user?.userId, featureType1, this.sessionObject, type)
      .pipe(switchMap((data) => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        this.kubernetesList = response.serviceResponse.applications;
      });
  }

  getNetworkNames2(): void {
    this.applicationIPConfigurationServiceService.getAllNetworkHostByApllicationID(this.currentUser, this.alert.applicationId).subscribe(
      (response: any) => {
        this.hostList = response.serviceResponse || [];
      },
      (err: any) => {
        console.error("Error fetching hosts:", err);
        this.hostList = [];
      }
    );
  }

  getPortList() {
    this.selectedPort = '';
    this.itemList = []
    this.networkService
      .getGraphItemsByHost(this.selectedHost)
      .subscribe((data: any) => {
        this.portList = data.serviceResponse;
      });
  }


  getItemList(selectedTagName: any) {
    const selectedPort = this.portList.find(
      (port: any) => port.tagName === selectedTagName
    );
    this.itemList = selectedPort?.graphData || [];
  }

  // Util functions

  showToast(message: string, type: "success" | "error") {
    if (type === 'error') {
      this.toast.error(message, {
        dismissible: true,
        duration: 2500
      });
    } else if (type === 'success') {
      this.toast.success(message, {
        dismissible: true,
        duration: 2500,
        iconTheme: {
          primary: 'var(--sideBar-bg-color1)',
          secondary: '#FFFAEE',
        }
      });
    }
  }
  showTemplateToast(template: TemplateRef<any>) {
    this.toast.show(template, {
      id: 'unique',
      duration: 7000,
      dismissible: false,
      autoClose: true,
      style: {
        padding: '1rem none',
        background: 'var(--toast-bg-color)',
        color: 'var(--toast-color)',
        borderRadius: '5px',
      }
    });
  }

  goToPage() {
    let page = Number(this.inputPage);
    if (isNaN(page) || page < 1) page = 1;
    else if (page > this.totalPages) page = this.totalPages;

    this.currentPage = page;
    this.inputPage = page;
  }

  resetPagination(resultArray: any[]) {
    this.currentPage = 1;
    this.inputPage = 1;
    if (resultArray && resultArray.length > 0 && this.pageSize > 0) {
      this.totalPages = Math.ceil(resultArray.length / this.pageSize);
    } else {
      this.totalPages = 1;
    }
  }

  resetPaginationForVA(resultArray: any[]) {
    this.alertListcurrentPage = 1;

    if (resultArray && resultArray.length > 0 && this.alertListpageSize > 0) {
      this.alertListtotalItems = resultArray.length;
      this.alertListtotalPages = Math.ceil(
        this.alertListtotalItems / this.alertListpageSize
      );
    } else {
      this.alertListtotalItems = 0;
      this.alertListtotalPages = 1;
    }
  }


  getApplicationList() {
    if (this.isSRG2) return this.applicationList;
    if (this.isAPM2) return this.ServiceNames;
    if (this.isInfra2) return this.infraList;
    if (this.iskubernetes2) return this.kubernetesList;
    if (this.isNetwork2) return this.networkList;
    if (this.isDatabase2) return this.databaseList;
    return [];
  }



  // Update total pages whenever alert list changes
  updatePagination() {
    if (this.allSetAlertList && this.allSetAlertList.length > 0) {
      this.alertListtotalItems = this.allSetAlertList.length;
      this.alertListtotalPages = Math.ceil(this.alertListtotalItems / this.alertListpageSize);
    } else {
      this.alertListtotalItems = 0;
      this.alertListtotalPages = 1;
      this.alertListcurrentPage = 1;
    }
  }

  // Go to a specific page (when user types a number)


  goToAlertPage(page: number) {
    if (!page || page < 1) {
      this.alertListcurrentPage = 1;
    } else if (page > this.alertListtotalPages) {
      this.alertListcurrentPage = this.alertListtotalPages;
    } else {
      this.alertListcurrentPage = page;
    }
  }

  goToSetAlertPage(page: number) {
    if (!page || page < 1) {
      this.setAlertCurrentPage = 1;
    } else if (page > this.setAlertTotalPages) {
      this.setAlertCurrentPage = this.setAlertTotalPages;
    } else {
      this.setAlertCurrentPage = page;
    }
  }





  // Increment elapsed time with validation
  incrementTime(level: string) {
    if (level === 'level2') {
      const currentValue = this.alertConfig.level2ElapsedTime || 0;
      this.alertConfig.level2ElapsedTime = Number(currentValue) + 1;
    } else if (level === 'level3') {
      const currentValue = this.alertConfig.level3ElapsedTime || 0;
      this.alertConfig.level3ElapsedTime = Number(currentValue) + 1;
    }
  }

  // Decrement elapsed time with minimum value of 0
  decrementTime(level: string) {
    if (level === 'level2') {
      const currentValue = this.alertConfig.level2ElapsedTime || 0;
      this.alertConfig.level2ElapsedTime = Math.max(0, Number(currentValue) - 1);
    } else if (level === 'level3') {
      const currentValue = this.alertConfig.level3ElapsedTime || 0;
      this.alertConfig.level3ElapsedTime = Math.max(0, Number(currentValue) - 1);
    }
  }

  loadProducts(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      const userId = user.userId;
      const userType = user.userType;
      const tool = sessionStorage.getItem('tool') || 'APM';

      this.roleService.findAppType(userId, userType, tool).subscribe({
        next: (res) => {
          this.productList = res.products || [];
        },
        error: () => {
          this.productList = [];
        }
      });
    }
  }

  loadTechnology(subFeatureName: string, onLoaded?: () => void): void {
    this.applicationIPConfigurationServiceService.getTechnologyBySubFeature(subFeatureName).subscribe({
      next: (res: any) => {
        this.technologyList = res?.serviceResponse || [];
        if (!this.technologyList || this.technologyList.length === 0) {
          this.loadApplications("", subFeatureName);
        }
        if (onLoaded) onLoaded();
      },
      error: () => {
        this.technologyList = [];
        this.loadApplications("", subFeatureName);
        if (onLoaded) onLoaded();
      }
    });

  }

  // new code

  getRuleType(tech: string, AppType: string): string {
    return tech ? tech : AppType;
  }

  loadApplications(tech: string, apptype: any): void {

    const type = this.getRuleType(tech, apptype);
    const request$ = tech
      ? this.applicationIPConfigurationServiceService.getFullApplicationData(
        this.currentUser.userId,
        apptype,
        this.sessionObject,
        tech
      )
      : this.applicationIPConfigurationServiceService.getFullApplicationData(
        this.currentUser.userId,
        apptype,
        this.sessionObject
      );

    request$
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {

        this.applicationNames =
          response?.serviceResponse?.applications || [];

      });

  }

  isSystemRule(alert: any): boolean {
    // console.log(alert, "alert");
    // console.log("customalert",this.customAlertTemplate)
    return [6, 7, 8].includes(Number(alert.healthRuleId));
  }

  srgDropDown(customAlertTemplate: any): boolean {
    if (customAlertTemplate && this.alert.applicationType.toLowerCase() === 'srg') {
      return false;
    }
    return true
  }

  onMetricChange() {
    const metric = this.metricList.find((x: any) => x.id == this.alert.serviceTypeId).module;
    this.showPort = false;
    this.showItem = false;
    this.portList = []
    console.log("metric  ... ", metric)
    if (metric === 'network_interface_metric') {
      this.showPort = true;
      this.showItem = true;
      this.getPortList();
    }

    else if (metric === 'network_additional_metric') {
      this.showItem = true;

      this.getAdditionalItemList();
    }

  }




  getAdditionalItemList() {
    this.itemList = []
    this.networkService
      .getGraphAdditionalItemsByHost(this.selectedHost)
      .subscribe((data: any) => {

        this.itemList = data.serviceResponse || [];

      });

  }

  setNetworkParams(params: any) {

    params["hostName"] = this.selectedHost;

    if (this.selectedPort) {
      params["portName"] = this.selectedPort;
    }

    const selectedItem = this.itemList.find(
      (item: any) => item.itemId == this.alert.itemId
    );

    if (selectedItem) {
      params["itemValue"] = selectedItem.itemName;
    }

  }

  setItemName(event: any) {

    const selectedItem = this.itemList.find(
      (item: any) => item.itemId == this.alert.itemId
    );

    this.selectedItemName = selectedItem?.itemName;

  }

  // SAMPLING LOGIC 
  onEvaluationTypeChange() {

    if (this.alertConfig.evaluationType !== 'SAMPLING') {

      this.alertConfig.samplingWindowSize = null;
      this.alertConfig.samplingBreachCount = null;

    }

  }



}
