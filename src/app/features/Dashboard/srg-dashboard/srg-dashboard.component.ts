import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { first, from, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { User } from '../../../models/user';
import { AuthenticationService } from '../../../services/authentication.service';
import { LoggerService } from '../../../services/logger.service';
import { DecoderService } from '../../../services/decoder.service';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { Session } from '../../../models/session';
import { AlertConfig } from '../../../models/AlertConfig';
import { UserService } from '../../../services/user.service';
import { ApplicationService } from '../../../services/application.service';
import { AlertService } from '../../../services/alert.service';
import { browserRefresh } from '../../../app.component';
import { ApplicationMaster } from '../../../models/application-master';
import { AlertDetails } from '../../../models/alertDetails';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SearchPipe } from '../../../pipes/search.pipe';
import { Feature } from '../../../models/feature';

@Component({
    selector: 'app-srg-dashboard',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        SearchPipe,
    ],
    templateUrl: './srg-dashboard.component.html',
    styleUrl: './srg-dashboard.component.css'
})
export class SrgDashboardComponent implements OnInit, OnDestroy {

  appToSubFeatureMap: Map<string, string[]> = new Map();
  showMoreMap: Map<string, boolean> = new Map();


  // START

  private subscription: Subscription = new Subscription();
  charts: any = [];
  nodeCharts: any = [];
  defaultOptions: any;
  counter = 0;
  dateFilter: any;
  subFeatureName: any;
  dateFormat = 'YYYY-MM-DD HH:mm:ss';
  fromDate: any;
  toDate: any;
  param: any;
  modalRef: any;
  refreshTime: any;
  isRefreshChrt: boolean = true;

  user: User = new User();

  featureList!: Feature[];
  tableheader: any[] = [];
  subFeatureList: any;
  applicationList: any = [];
  applicationList1: any = [];
  fullScreenMode: any;
  applicationID: any;
  AllGraphList: any[] = [];
  ipAddressList: any[] = [];
  ipAddress: any;
  isCustomFilter: boolean = false;
  toggle: number = 1;
  chartId: any
  userType: any;
  featureName: any
  customFilter: any;
  customDate: any;
  public max = new Date();

  nodeGraphList: any;
  sessionObject: Session = new Session();
  nodeGraphModalTittle: any;

  bgColor: any;
  fontColor: any;
  editDashboard: any;
  page!: number;
  item: any;
  isError: boolean = false;
  isSuccess: boolean = false;
  isRefreshSuccess: boolean = false;
  alertMessage: any;
  isEditDisabled: boolean = false;
  isSFNotFetched: boolean = false;



  // END

  // pagination
  p: number = 1;
  r: number = 1;
  searchText: any;
  // sorting
  sortDirection = 'asc';
  sortparam: any;
  FeaturesNames: any[] = [];

  currentUser!: User;

  userDetail: any;
  alertDetailsList: any = [];
  alertDetails: any = [];
  returnUrl!: string;
  enableLogin: any;
  browserRefresh: any = false;
  apiStatus: any;
  loginCounter: any;
  bodydetails: any;
  searchText1: any;
  alertMailBodyRows!: any[];
  alertRowsList: any;
  alert: AlertConfig = new AlertConfig();
  appID: any;
  isWarning: boolean = false;
  isCritical: boolean = false;
  isNormal: boolean = false;
  isAgentStatus = false;
  agentStatusMail = "";
  isAlertMailResponseRecieved: boolean = false;
  loaderStatus: boolean = true;

  isSwitchOn = true;
  myDashboardApplicationId: number | null = null;
  myDashBoardFlag!: boolean;
  isSubFeatureSelected!: boolean;
  currentViewingApplication!: string;
  previousViewingSubF: string | null = null;

  searchTextSRG!: string;
  storedTheme: any = sessionStorage.getItem('themeColour');

  private destroy$ = new Subject<void>();
  constructor(private authService: AuthenticationService, private userService: UserService,
    private applicationService: ApplicationService, private alertService: AlertService, private loggerService: LoggerService,
    private modalService: NgbModal, private router: Router, private decoderService: DecoderService
  ) {
    this.authService.currentUser.subscribe(x => {
      if (x) {
        this.currentUser = x;
      }
    });
    
    // this.authService.currentUser.subscribe(x => this.currentUser = x);
  }

  ngOnInit(): void {

    this.loaderStatus = false;
    this.browserRefresh = browserRefresh;
    if (!this.browserRefresh) {
      sessionStorage.setItem("onPageNavigateTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
    }
    this.sessionObject.featureName = "Dashboard";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;


    // Define the Map to hold application names and sub-feature lists
    this.appToSubFeatureMap = new Map<string, any[]>();

    this.enableLogin = sessionStorage.getItem('loginEnable');
    this.loginCounter = sessionStorage.getItem('loginCounter');
    if (this.loginCounter == undefined || this.loginCounter == null) {
      this.loginCounter = 0;
    }

    if (this.currentUser['enablePreferredDashboard'] && this.enableLogin != "tfalse" && this.loginCounter < 2) {
      if (this.currentUser['preferMyDashBoard'] == "yes") {
        this.returnUrl = "/dashboard";
        this.changeIcon("dashboard");
        this.router.navigate([this.returnUrl]
          , { queryParams: { appID: 1, subName: "RUAMBOTMYDASHBOARD" } });
        this.loginCounter++;
        sessionStorage.setItem('loginCounter', this.loginCounter);
      }
      else if (this.currentUser.preferredSubfeature) {
        if (this.currentUser.preferredSubfeature.id) {
          if (this.currentUser.preferredSubfeature.featureId == 1) {
            this.returnUrl = "/dashboard";
            this.changeIcon("dashboard");
          }
          else if (this.currentUser.preferredSubfeature.featureId == 2) {
            this.returnUrl = "/trend-dashboard";
            this.changeIcon("Trend");
          }
          this.router.navigate([this.returnUrl]
            , { queryParams: { appID: this.currentUser.preferredSubfeature.applicationID, subName: this.currentUser.preferredSubfeature.subFeatureName } });
          this.loginCounter++;
          sessionStorage.setItem('loginCounter', this.loginCounter);
        }
      }
      else {
        this.getApplicationByUserId();
      }
    }
    else {
      this.getApplicationByUserId();
    }
    sessionStorage.setItem('loginEnable', 'false');
    this.isCritical = false;
    this.isNormal = false;
    this.isWarning = false;

    this.applicationService.getFullApplicationData(this.currentUser.userId, 'SRG', this.sessionObject).subscribe((response: any) => {
      if (response && response.serviceStatus == 'Success') {
        this.applicationList = response.serviceResponse.applications;
        this.applicationList.sort(function (a: { applicationName: string; }, b: { applicationName: string; }) {
          return a.applicationName.toLowerCase().localeCompare(b.applicationName.toLowerCase());
        });
      }
    });
  }

  toggleShowMore(appName: string) {
    const currentValue = this.showMoreMap.get(appName) || false;
    this.showMoreMap.set(appName, !currentValue);
  }

  onSwitchChange() {
    if (this.isSwitchOn) {
      this.router.navigate(['/home']);
    }
    else {
      this.router.navigate(['/service-page']);
    }
  }

  getApplicationByUserId() {
    sessionStorage.setItem('loginEnable', 'tfalse');
    this.applicationService.getFullApplicationData(this.currentUser.userId, 'SRG', this.sessionObject).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.applicationList = response.serviceResponse.applications;
        this.applicationList.sort(function (a: { applicationName: string; }, b: { applicationName: string; }) {
          return a.applicationName.toLowerCase().localeCompare(b.applicationName.toLowerCase());
        });
        
        const appIds = this.applicationList.map((app: any) => app.applicationId || app.appID);
        
        let payload = {
          userId: this.currentUser.userId,
          featureType: "SRG",
          applicationIds: appIds,
          st: moment().subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss'),
          et: moment().format('YYYY-MM-DD HH:mm:ss'),
          sessionDTO: this.sessionObject
        };

        this.applicationService.getFullApplicationDataByAppIds(payload).pipe(takeUntil(this.destroy$)).subscribe((fullDataRes: any) => {
          if (fullDataRes.serviceStatus === 'Success') {
            let fullData = fullDataRes.serviceResponse;

            // Map alert details
            this.applicationList.forEach((element: { applicationName: any; appID: any; applicationId?: any }) => {
              let appID = element.appID || element.applicationId;
              let alertData = fullData.alertStateCounts?.find((a: any) => a.applicationId === appID);
              
              let openCount = alertData ? alertData.openCount : 0;
              let closedCount = alertData ? alertData.closedCount : 0;
              let total = openCount + closedCount;

              let openAlertsPer = total === 0 ? '0%' : ((openCount / total) * 100).toFixed(2) + '%';
              let closedAlertsPer = total === 0 ? '0%' : ((closedCount / total) * 100).toFixed(2) + '%';

              let appDetails = {
                applicationName: element.applicationName,
                appID: appID,
                openAlerts: openCount,
                closedAlerts: closedCount,
                totalAlerts: total,
                openAlertsPer: openAlertsPer,
                closedAlertsPer: closedAlertsPer
              };
              this.alertDetailsList.push(appDetails);
            });

            this.applySearchFilter();

            // Map subfeatures
            if (fullData.subFeatures) {
              this.applicationList.forEach((element: any) => {
                let appID = element.appID || element.applicationId;
                let subF = fullData.subFeatures.filter((sf: any) => sf.applicationId === appID);
                if (subF && subF.length > 0) {
                  let subFeatureNames = subF.map((sf: any) => sf.subFeatureName).sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase()));
                  this.appToSubFeatureMap.set(element.applicationName, subFeatureNames);
                }
              });
            }

            this.isSFNotFetched = false;
          }
        });
      }

      let appName = "";
      // start

      for (let x of this.applicationList) {
        if ((x.appID || x.applicationId) == this.applicationID) {
          appName = x.applicationName;
          break;
        }
      }

      this.myDashboardApplicationId = null;
      this.currentUser.sessionDTO = this.sessionObject;
      this.isSubFeatureSelected = false;
      this.subFeatureList = null;

      let roleId = this.currentUser.userType == 'Super Admin' ? 0 : this.currentUser['userRole'][0].roleId;

      if (this.applicationID == "1") {
        this.myDashBoardFlag = true;
        this.subFeatureName = "RUAMBOTMYDASHBOARD";
        this.getMyDashBoard(this.currentUser.id);
        this.isSFNotFetched = false;
      } else {
        this.myDashBoardFlag = false;
        this.sessionObject.subFeature = null;
        this.sessionObject.applicationName = appName;
        this.currentViewingApplication = appName;
        sessionStorage.setItem("previousViewingApplication", appName);
        this.previousViewingSubF = sessionStorage.getItem("previousViewingSubF");
      }

    });
  }

  getMyDashBoard(userID: any) {
    this.myDashboardApplicationId = 1;
    this.myDashBoardFlag = true;
  }

  getApplicationAlertDetails(appList: any) {
    sessionStorage.setItem('loginEnable', 'tfalse');
    appList.forEach((element: { appID: any; }) => {
      console.log("AppID : " + element.appID);
      let appID = element.appID;
      let application = new ApplicationMaster();
      application.applicationID = element.appID;
      application.sessionDTO = this.sessionObject;

      this.alertService.getApplicationAlertDetails(application).pipe(first()).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {

        if (response.serviceStatus == 'Success') {
          let data = response.serviceResponse;

          this.alertDetailsList.forEach((element: { appID: any; applicationName: string; criticalAlerts: any; normalAlerts: any; totalAlerts: any; warningAlerts: any; criticalAlertsPer: any; normalAlertsPer: any; warningAlertsPer: any; }) => {
            if (element.appID == appID) {

              /* Remove Loader & Show Progress bar */
              let loader = document.getElementById(element.applicationName + "-loader");
              let progress = document.getElementById(element.applicationName + "-progress");

              if (loader && progress) {
                loader.style.visibility = 'hidden';
                progress.style.visibility = 'visible';
              }

              // Initialize percentages
              let criticalAlertsPer: any;
              let normalAlertsPer: any;
              let warningAlertsPer: any;

              if (data.totalAlerts == 0) {
                criticalAlertsPer = '0%';
                normalAlertsPer = '0%';
                warningAlertsPer = '0%';
              } else {
                // Corrected the calculation for percentages
                criticalAlertsPer = ((data.criticalAlerts / data.totalAlerts) * 100).toFixed(2) + '%';
                normalAlertsPer = ((data.normalAlerts / data.totalAlerts) * 100).toFixed(2) + '%';
                warningAlertsPer = ((data.warningAlerts / data.totalAlerts) * 100).toFixed(2) + '%';
              }

              // Update element with calculated values
              element.criticalAlerts = data.criticalAlerts;
              element.normalAlerts = data.normalAlerts;
              element.totalAlerts = data.totalAlerts;
              element.warningAlerts = data.warningAlerts;
              element.criticalAlertsPer = criticalAlertsPer;
              element.normalAlertsPer = normalAlertsPer;
              element.warningAlertsPer = warningAlertsPer;
            }
          });
        } else {
          console.log("No response from service");
        }
      });
    });

    this.loaderStatus = false;
  }

  openAlertDetails(template: TemplateRef<any>) {
    this.modalRef = this.modalService.open(template, { windowClass: 'modal-xl' });
  }

  cancelRequest() {
    this.modalRef.hide();
    this.p = 1;
  }

  getCriticalAlertsDetails(template: TemplateRef<any>, appID: any) {
    this.p = 1;
    this.alertDetails = [];
    this.searchText = "";
    let application = new ApplicationMaster();
    application.applicationID = appID;
    application.sessionDTO = this.sessionObject;
    this.isCritical = true;
    this.isNormal = false;
    this.isWarning = false;
    this.appID = appID;
    this.isAlertMailResponseRecieved = true;
    this.alertService.getCriticalAlertsDetails(application).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.alertDetails = response.serviceResponse;
        this.openAlertDetails(template);
      } else {
        console.log(response.serviceResponse)
      }
    });
  }

  getWarningAlertsDetails(template: TemplateRef<any>, appID: any) {
    this.p = 1;
    this.alertDetails = [];
    this.searchText = "";
    let application = new ApplicationMaster();
    application.applicationID = appID;
    application.sessionDTO = this.sessionObject;
    this.isCritical = false;
    this.isNormal = false;
    this.isWarning = true;
    this.appID = appID;
    this.isAlertMailResponseRecieved = true;
    this.alertService.getWarningAlertsDetails(application).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.alertDetails = response.serviceResponse;
        this.openAlertDetails(template);
      } else {
        console.log(response.serviceResponse)
      }
    });
  }

  getNormalAlertsDetails(template: TemplateRef<any>, appID: any) {
    this.p = 1;
    this.alertDetails = [];
    this.searchText = "";
    let application = new ApplicationMaster();
    application.applicationID = appID;
    application.sessionDTO = this.sessionObject;
    this.isCritical = false;
    this.isNormal = false;
    this.isWarning = true;
    this.appID = appID;
    this.isAlertMailResponseRecieved = true;
    this.alertService.getNormalAlertsDetails(application).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.alertDetails = response.serviceResponse;
        this.openAlertDetails(template);
      } else {
        console.log(response.serviceError)
      }
    });
  }

  // pagination
  search() {
    this.p = 1;
  }

  pageChange($event: number) {
    this.p = $event;
  }

  // sorting 
  sortBy(value: String) {
    this.sortparam = value;
    if (this.sortDirection === 'desc') {
      this.sortDirection = 'asc';
    }
    else {
      this.sortDirection = 'desc';
    }
  }

  changeIcon(value: any) {
    localStorage.setItem('currentmenupage', value);
  }
  ngOnDestroy() {
    sessionStorage.setItem("onPageExitTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
    this.loggerService.logMyInfo(this.sessionObject, '/alert');
    this.destroy$.next();
    this.destroy$.complete();
  }

  getbodyAlertsDetails(currentThresholdBody: any, healthRuleId: any) {
    this.alertRowsList = [];
    this.alertMailBodyRows = [];
    this.searchText1 = ""
    this.agentStatusMail = "";
    this.isAgentStatus = false;
    this.alert.currentThresholdBody = currentThresholdBody;
    this.alert.sessionDTO = this.sessionObject;
    this.alert.healthRuleId = healthRuleId;
    this.isAlertMailResponseRecieved = false;
    this.alertService.getAlertMailBody(this.alert).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.isAlertMailResponseRecieved = true;
        let data = response.serviceResponse;
        // ($('#alertBodyModal') as any).modal({ show: true });
        this.cancelRequest();
        if (Array.isArray(data) && data.length > 0) {
          this.alertRowsList = response.serviceResponse;
          this.isAgentStatus = false;
          for (let x of this.alertRowsList) {
            let alertDet: AlertDetails = new AlertDetails();
            alertDet.applicationName = x[0];
            alertDet.metric = x[1];
            alertDet.label = x[2];
            alertDet.currentValue = x[3];
            alertDet.status = x[4];
            this.alertMailBodyRows.push(alertDet);
          }
        } else {
          this.isAgentStatus = true;
          this.agentStatusMail = response.serviceResponse;
        }
      }
    });
  }

  getPreviousModal(template: TemplateRef<any>) {
    if (this.isCritical) {
      this.getCriticalAlertsDetails(template, this.appID);
    }
    else if (this.isWarning) {
      this.getWarningAlertsDetails(template, this.appID);
    }
    else if (this.isNormal) {
      this.getNormalAlertsDetails(template, this.appID);
    }
  }
  search2() {
    this.r = 1;
  }

  storeAppID(applicationName: string) {
    localStorage.setItem('selectedAppName', applicationName);
  }

  pagedalertDetailsList: any[] = []; // Data for current page
  currentPage: number = 1;
  itemsPerPage: number = 8; // Adjust items per page as needed
  totalPages: number = 0;
  filteredServiceNames!: any[];

  applySearchFilter(): void {
    if (this.searchTextSRG) {
      this.filteredServiceNames = this.alertDetailsList.filter((service: any) =>
        service.applicationName?.toLowerCase().includes(this.searchTextSRG.toLowerCase())
      );
    } else {
      this.filteredServiceNames = [...this.alertDetailsList];
    }
    this.calculatePagination(); 
  } 

  onSearchChange(): void {
    this.currentPage = 1;
    this.applySearchFilter();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredServiceNames.length / this.itemsPerPage);
    this.pagedalertDetailsList = this.filteredServiceNames.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.calculatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.calculatePagination();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.calculatePagination();
  }

  get totalPagesArray(): (number | string)[] {
    const visiblePages = 3; 
    let pages: (number | string)[] = [];
    if (this.totalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    } else {
      if (this.currentPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages];
      } else if (this.currentPage >= this.totalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages];
      }
    }
    return pages;
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }
  
  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.alertDetailsList.length);
  }

  isPageNumber(page: string | number): page is number {
    return typeof page === 'number';
  }  

}
