import { Component, Input, TemplateRef } from '@angular/core';
import { IpAddressConfigurationMaster } from '../../../../models/ip-address-configuration-master';
import { User } from '../../../../models/user';
import { ApplicationMaster } from '../../../../models/application-master';
import { UserTypeCrudMapObject } from '../../../../models/UserTypeCrudMapObject';
import { Session } from '../../../../models/session';
import { indexPattern } from '../../../../models/indexPattern';
import { AppComponent, browserRefresh } from '../../../../app.component';
import moment from 'moment';
import { catchError, first, forkJoin, from, map, of, switchMap } from 'rxjs';
import { ApplicationService } from '../../../../services/application.service';
import { DecoderService } from '../../../../services/decoder.service';
import { ExcelService } from '../../../../services/excel.service';
import { Router } from '@angular/router';
import { LoaderService } from '../../../../services/loader.service';
import { SessionService } from '../../../../services/session.service';
import { LoggerService } from '../../../../services/logger.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role, Product, FeatureComponent } from '../../../../models/Role';
import { RoleService } from '../../../../services/role.service';
import { NgxPaginationModule } from 'ngx-pagination';
import { GrdFilterPipe } from '../../../../grd-filter.pipe';
import { SortPipe } from '../../../../sort.pipe';
import { NgbModalModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';

@Component({
  selector: 'app-application-ip-mapping',
  imports: [CommonModule,
    FormsModule,
    NgxPaginationModule,
    GrdFilterPipe,
    SortPipe,
    NgbModalModule,
    SanitizeInputDirective
  ],
  templateUrl: './application-ip-mapping.component.html',
  styleUrls: ['./application-ip-mapping.component.css']
})

export class ApplicationIpMappingComponent {
  displayedColumns: string[] = ["Application Name", "Created On", "Created By", "IP Address", "Type Name", "Environment Type"];
  p: number = 1;
  searchText: any;
  searchText1: any;
  ap: number = 1;
  isForm!: boolean;
  isTable!: boolean;
  isCreation!: boolean;
  isUpdation!: boolean;
  isNotApplicationUpdate!: boolean;
  ipO!: IpAddressConfigurationMaster;
  ipObjArrayList: IpAddressConfigurationMaster[] = [];
  applicationName: any;
  applicationType: string = "";
  node: string[] = [];
  nodeInputValue: string = '';
  user = new User();
  applicationIPobj = new ApplicationMaster();
  alertMessage: any;
  allIPAddressMapping: any;
  allApplications: any;
  allApplicationsUnique: any[] = [];
  applicationID: any;
  isIPProper: boolean = false;
  recordsSize = 10;
  ipAddressMappingDataList: any;
  isError!: boolean;
  isSuccess!: boolean;
  sortDirection: 'asc' | 'desc' = 'asc';
  sortparam: any;
  userTypeCrudMap = new UserTypeCrudMapObject();
  excelJsonData: any;

  regexIP: any = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
  sessionObject: Session = new Session();
  allApplicationExcelList: any;
  applicationOldName: any;
  currentUser = new User();
  browserRefresh: any = false;
  indexPatternList: indexPattern[] = [];
  tempindexPatternList: [] = [];
  availableProducts: Product[] = [];
  availableFeatures: FeatureComponent[] = [];

  constructor(
    private applicationIPConfigurationServiceService: ApplicationService,
    private decoderService: DecoderService,
    public appComponenet: AppComponent,
    private excelService: ExcelService,
    private sessionService: SessionService,
    private loaderService: LoaderService,
    private router: Router,
    private loggerService: LoggerService,
    private modalService: NgbModal,
    private roleService: RoleService
  ) { }

  ngOnInit(): void {
    this.indexPatternList.push(new indexPattern());
    this.browserRefresh = browserRefresh;
    if (!this.browserRefresh) {
      sessionStorage.setItem("onPageNavigateTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
    }
    this.isForm = true;
    this.isTable = false;
    this.isCreation = true;
    this.isUpdation = false;
    this.isNotApplicationUpdate = true;

    this.ipObjArrayList.push(new IpAddressConfigurationMaster());
    const storedUser = sessionStorage.getItem('currentUser');
    this.user = storedUser
      ? this.decoderService.decryptJson(JSON.parse(storedUser)) as User
      : new User();
    this.currentUser.userId = this.user.userId;
    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config";
    this.sessionObject.configTab = "Application & IP Mapping"
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    const storedCrudMap = sessionStorage.getItem("userTypeCrudMapList");
    this.userTypeCrudMap = storedCrudMap
      ? new UserTypeCrudMapObject(JSON.parse(storedCrudMap).user)
      : new UserTypeCrudMapObject();
    console.log("THIS.CRUDMAP: ", this.userTypeCrudMap);
    console.log("THIS.CRUDMAP: ", this.userTypeCrudMap.create);
    console.log("THIS.CRUDMAP: ", typeof (this.userTypeCrudMap.create));
    console.log("THIS.CRUDMAP: ", typeof (this.userTypeCrudMap.edit));
    console.log("THIS.CRUDMAP: ", typeof (this.userTypeCrudMap.delete));

    if (this.userTypeCrudMap.view && !this.userTypeCrudMap.create) {
      this.getAllApplications();
      this.getAllIPAddressMapping();
    }
    this.showMyTable();
    this.fetchProductsAndFeatures();
  }

  fetchProductsAndFeatures() {
    // We can use the currentUser from auth service or session storage
    // The component already extracts user from session storage in ngOnInit
    if (this.user) {
      const userId = this.user.userId;
      const userType = this.user.userType;
      // 'tool' is not on the User model in the file I read earlier, but I saw it in the RoleComponent usage.
      // I'll check if User model has 'tool', otherwise default to 'APM'. 
      // Re-reading User model: it HAS 'tool: string = 'APM';'

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

  showForm() {
    this.isForm = true;
    this.isTable = false;
    this.isCreation = true;
    this.isUpdation = false;
    this.isNotApplicationUpdate = true;
    this.applicationName = null;
    this.applicationType = "";
    this.indexPatternList = [];
    this.indexPatternList.push(new indexPattern());
    this.ipObjArrayList = [new IpAddressConfigurationMaster()];
  }

  showTable() {
    this.searchText = "";
    this.isTable = true;
    this.isForm = false;
    this.isUpdation = false;
    console.log(this.indexPatternList, "indexPatternList");

    this.getAllIPAddressMapping();
    this.getAllApplications();
  }

  showMyTable() {
    this.getAllIPAddressMapping();
    this.getAllApplications();
  }

  hide() {

    this.isForm = true;
  }

  addIPAddrInputField() {
    this.ipObjArrayList.push(new IpAddressConfigurationMaster());
  }

  addIndexInputField() {
    this.indexPatternList.push(new indexPattern());
  }

  removeInputField(alertTemplate: TemplateRef<any>, ipObjArray: any) {
    this.ipObjArrayList.forEach((value, index) => {
      if (value == ipObjArray) {
        this.ipObjArrayList.splice(index, 1);
      }
    });
  }

  removeIndexField(alertTemplate: TemplateRef<any>, indexpobj: any) {
    this.indexPatternList.forEach((value, index) => {
      if (value == indexpobj) {
        this.indexPatternList.splice(index, 1);
      }
    });
  }

  openAlertMod(alertTemplate: TemplateRef<any>, message: any) {
    this.modalService.open(alertTemplate, { size: 'lg', backdrop: 'static' });
    this.alertMessage = message;
  }

  cancelRequest() {
    this.modalService.dismissAll();
  }

  hasDuplicateDesc(collection: any) {
    var groups = collection.reduce((acc: any, cur: any) => {
      acc[cur.ipAddress] = (acc[cur.ipAddress] || 0) + 1;
      return acc;
    }, {});

    return Object.values(groups).some((num: any) => num > 1);
  }

  createIPAddressMapping(alertTemplate: TemplateRef<any>) {
    let duplicateCheck = true;

    this.ipObjArrayList.forEach(list => {

      let arr = [];
      arr = this.ipObjArrayList.filter((val) => val.ipAddress === list.ipAddress && val.ipType === list.ipType);
      if (arr.length > 1) {
        duplicateCheck = false;
      }
      return duplicateCheck;
    });

    this.applicationIPobj.ipAddress = [];
    this.applicationIPobj.indexPatterns = [];
    this.ipObjArrayList.forEach((ipObj: IpAddressConfigurationMaster) => {
      if (ipObj.ipAddress && ipObj.ipType && ipObj.environment) {
        this.applicationIPobj.ipAddress.push(ipObj);
      }
    });
    for (let i = 0; i < this.indexPatternList.length; i++) {
      this.applicationIPobj.indexPatterns.push(this.indexPatternList[i]);
    }

    if (this.applicationName == null || this.applicationName == "" || this.applicationName == undefined) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(alertTemplate, "Kindly provide Application Name !!");
      return;
    }
    else if (this.applicationType == null || this.applicationType == "" || this.applicationType == undefined) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(alertTemplate, "Kindly provide Application Type !!");
      return;
    }
    const trimmedAppName = (this.applicationName || '').trim();
    if (!this.validateAlphanumericUnderscore(trimmedAppName)) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(alertTemplate, "Application name should include alphabets, numbers, space, ':', '-' and '_' only !! [V2]");
      return;
    }
    else if (this.ipObjArrayList.length > 0) {

      for (let item of this.ipObjArrayList) {
        if (!this.validateIP(item.ipAddress)) {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(alertTemplate, "Kindly Provide Valid IP Address !!");
          return;
        }
      }

    }

    let flag: Boolean = true;
    if (this.applicationIPobj.ipAddress.length == 0) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(alertTemplate, "Kindly configure atleast one IP with the application !!");
      return;
    }
    else {
      this.ipObjArrayList.forEach(element => {
        if (element.ipAddress == "" || element.ipAddress == undefined || element.ipType == "" ||
          element.ipType == undefined || element.environment == "" || element.environment == undefined) {
          flag = false;
        }
        else if (!this.regexIP.test(element.ipAddress)) {
          this.isError = true;
          this.isSuccess = false;
          flag = false;
          this.openAlertMod(alertTemplate, "Kindly Provide Valid IP Address !!");
          return;
        }
      });
    }

    if (!duplicateCheck) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(alertTemplate, "IP Address and IP Type can not be duplicate !!");
      return;
    }

    if (flag) {

      this.applicationIPobj.createdBy = this.user.userId;
      this.applicationIPobj.applicationName = this.applicationName;
      this.applicationIPobj.applicationType = this.applicationType;
      this.applicationIPobj.nodes = this.applicationType === 'AKS' ? this.node : []
      console.log(this.applicationIPobj);
      this.sessionObject.applicationName = this.applicationName;
      this.applicationIPobj.sessionDTO = this.sessionObject;
      this.applicationIPConfigurationServiceService.createApplicationIPConfiguration(this.applicationIPobj).pipe(first()).subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          if (this.ipObjArrayList.length == 1 && this.ipObjArrayList[0].environment == "" &&
            this.ipObjArrayList[0].ipAddress == "" && this.ipObjArrayList[0].ipType == "") {
            this.isError = false;
            this.isSuccess = true;
            this.openAlertMod(alertTemplate, "Application Created Successfully");
          }
          else {
            this.isError = false;
            this.isSuccess = true;
            this.openAlertMod(alertTemplate, "Application - IP Address Configured Successfully");
          }

        }
        else {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(alertTemplate, response.serviceResponse);
        }
        this.showTable();
      });

    } else {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(alertTemplate, "All Mandatory(*) Fields Are Required");
      return;
    }

  }

  getAllIPAddressMapping() {
    const tool = sessionStorage.getItem("tool");
    this.applicationIPConfigurationServiceService.getAllApplicationIPConfigurations(this.sessionObject, tool).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      this.allIPAddressMapping = (response.serviceResponse.applicationsList || []).map((item: any) => {
        return {
          ...item,
          createdByUserName: item.createdBy,
          apm: {
            appID: item.appId,
            applicationName: item.applicationName,
            applicationType: item.applicationType,
            createdOn: item.createdOn,
            createdByUserName: item.createdBy
          }
        };
      });
      this.tempindexPatternList = response.serviceResponse.indexes;

      const uniqueApps = new Map();
      if (this.allIPAddressMapping) {
        this.allIPAddressMapping.forEach((ipObj: any) => {
          if (ipObj.apm && ipObj.apm.applicationName) {
            if (!uniqueApps.has(ipObj.apm.applicationName)) {
              uniqueApps.set(ipObj.apm.applicationName, ipObj.apm);
            }
          }
        });
      }
      this.allApplicationsUnique = Array.from(uniqueApps.values());
    });
  }

  getAllApplications() {
    if (this.user.userType === "Super Admin") {
      this.applicationIPConfigurationServiceService.getAllApplications(this.sessionObject).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
        this.allApplications = response.serviceResponse;
      });
    }
    else {
      this.currentUser.sessionDTO = this.sessionObject;
      this.applicationIPConfigurationServiceService.getAllApplicationsByUserID(this.currentUser).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
        this.allApplications = response.serviceResponse;
      }, (error: HttpErrorResponse) => {
        throw error;
      });
    }
  }

  openDeleteApplicationIPMapping(template: TemplateRef<any>, iaObj: IpAddressConfigurationMaster) {
    this.modalService.open(template, { size: 'lg', backdrop: 'static' });
    this.ipO = iaObj;
    this.ipO.applicationID = iaObj.apm.appID;
  }

  openDeleteApplication(template: TemplateRef<any>, aObj: any) {
    this.modalService.open(template, { size: 'lg', backdrop: 'static' });
    this.applicationIPobj = aObj;
    this.applicationIPobj.applicationID = aObj.appID;
  }

  openIpAddressTemplateModal(template: TemplateRef<any>, applicationName: any) {
    this.applicationName = applicationName;
    var arr: any[] = [];
    this.allIPAddressMapping.forEach((element: any) => {
      if (element.apm.applicationName == applicationName) {
        arr.push(element);
      }
    });
    this.ipAddressMappingDataList = arr;
    this.modalService.open(template, { size: 'lg', backdrop: 'static' });

  }

  deleteApplication(alertTemplate: TemplateRef<any>) {
    this.applicationIPobj.updatedBy = this.user.userId;
    this.toggleDeleteTemplateButtons('disable');
    this.sessionObject.applicationName = this.applicationIPobj.applicationName;
    this.applicationIPobj.sessionDTO = this.sessionObject;
    this.applicationIPConfigurationServiceService.deleteApplication(this.applicationIPobj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        this.isError = false;
        this.isSuccess = true;
        this.toggleDeleteTemplateButtons('enable');
        this.cancelRequest();
        this.openAlertMod(alertTemplate, "Application Deleted Successfully ...");
      }
      else {
        this.isError = true;
        this.isSuccess = false;
        this.toggleDeleteTemplateButtons('enable');
        this.cancelRequest();
        this.openAlertMod(alertTemplate, response.serviceResponse);
      }
      this.showTable();
      this.cancelRequest();
      this.applicationIPobj = new ApplicationMaster();
    });
  }

  deleteApplicationIPMapping(alertTemplate: TemplateRef<any>, ipObj: IpAddressConfigurationMaster) {
    ipObj.updatedBy = this.user.userId;
    ipObj.sessionDTO = this.sessionObject;
    this.applicationIPConfigurationServiceService.deleteApplicationIPConfiguration(ipObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        this.isError = false;
        this.isSuccess = true;
        this.cancelRequest();
        this.openAlertMod(alertTemplate, "IP Deleted Successfully ...");
      }
      else {
        this.isError = true;
        this.isSuccess = false;
        this.cancelRequest();
        this.openAlertMod(alertTemplate, response.serviceResponse);
      }
    });
  }

  openUpdateApplicationIPMapping(iaObj: IpAddressConfigurationMaster) {
    this.isForm = true;
    this.isTable = false;
    this.isCreation = false;
    this.isUpdation = true;
    this.isNotApplicationUpdate = true;
    this.applicationOldName = iaObj.apm.applicationName;
    this.applicationName = iaObj.apm.applicationName;
    this.applicationID = iaObj.apm.appID;
    const newIAObj = new IpAddressConfigurationMaster();
    newIAObj.ipAddress = iaObj.ipAddress;
    newIAObj.ipType = iaObj.ipType;
    newIAObj.environment = iaObj.environment;
    newIAObj.ipAddrID = iaObj.ipAddrID;
    newIAObj.applicationID = iaObj.apm.appID;
    this.ipObjArrayList = [newIAObj];
  }

  openUpdateApplication(aObj: any) {
    console.log(aObj);
    this.isForm = true;
    this.isTable = false;
    this.isCreation = false;
    this.isUpdation = true;
    this.applicationOldName = aObj.applicationName;
    this.applicationName = aObj.applicationName;
    this.applicationType = aObj.applicationType;
    this.applicationID = aObj.appID;
    this.isNotApplicationUpdate = false;

    var arr: any[] = [];
    this.allIPAddressMapping.forEach((element: any) => {
      if (element.apm.applicationName == aObj.applicationName) {
        arr.push(element);
      }
    });
    if (this.tempindexPatternList.length > 0) {
      this.indexPatternList = [];
      for (let k = 0; k < this.tempindexPatternList.length; k++) {
        let a: any = this.tempindexPatternList[k];
        for (let l = 0; l < a.length; l++) {
          if (a[l].applicationID == this.applicationID) {
            let obj = new indexPattern();
            obj.indexPatternName = a[l].indexPattern;
            if (!this.indexPatternList.includes(obj)) {
              this.indexPatternList.push(obj)
            }
          }
        }
      }
    }
    if (this.indexPatternList.length == 0) {
      this.indexPatternList.push(new indexPattern());
    }
    this.ipObjArrayList = arr;
  }

  updateApplicationIPMapping(alertTemplate: TemplateRef<any>) {
    let duplicateCheck = true;

    this.ipObjArrayList.forEach(list => {
      let arr = [];
      arr = this.ipObjArrayList.filter((val) => val.ipAddress === list.ipAddress && val.ipType === list.ipType);
      if (arr.length > 1) {
        duplicateCheck = false;
      }
      return duplicateCheck;
    });

    if (this.ipObjArrayList.length > 0) {

      for (let item of this.ipObjArrayList) {
        if (!this.validateIP(item.ipAddress)) {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(alertTemplate, "Kindly Provide Valid IP Address !!");
          return;
        }
      }

    }

    let flag: Boolean = true;
    this.ipObjArrayList.forEach(element => {
      if (element.ipAddress == "" || element.ipAddress == undefined || element.ipType == "" ||
        element.ipType == undefined || element.environment == "" || element.environment == undefined) {
        flag = false;
      }
      else if (!this.regexIP.test(element.ipAddress)) {
        this.isError = true;
        this.isSuccess = false;
        this.openAlertMod(alertTemplate, "Kindly Provide Valid IP Address !!");
        return;
      }
    });

    if (!duplicateCheck) {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(alertTemplate, "IP Address and IP Type can not be duplicate !!");
      return;
    }

    if (flag) {
      this.applicationIPobj.updatedBy = this.user.userId;
      this.applicationIPobj.applicationName = this.applicationOldName;
      this.applicationIPobj.applicationNewName = this.applicationName;
      this.applicationIPobj.appID = this.applicationID;
      this.applicationIPobj.applicationID = this.applicationID;
      this.applicationIPobj.ipAddress = this.ipObjArrayList;
      this.applicationIPobj.indexPatterns = this.indexPatternList;
      console.log(this.applicationIPobj);
      this.sessionObject.applicationName = this.applicationOldName;
      this.applicationIPobj.sessionDTO = this.sessionObject;
      this.applicationIPConfigurationServiceService.updateApplicationIPConfiguration(this.applicationIPobj).pipe(first()).subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.isError = false;
          this.isSuccess = true;
          this.openAlertMod(alertTemplate, "Application Name and/or IP Address(s) Updated Successfully..");
          this.cancelRequest();
          this.applicationName = null;
          this.applicationID = null;
          this.ipObjArrayList = [new IpAddressConfigurationMaster()];
          this.applicationIPobj = new ApplicationMaster();
          this.isUpdation = false;
          this.showTable();
        }
        else {
          this.isError = true;
          this.isSuccess = false;
          this.openAlertMod(alertTemplate, response.serviceResponse);
        }
      });
    } else {
      this.isError = true;
      this.isSuccess = false;
      this.openAlertMod(alertTemplate, "All Mandatory(*) Fields Are Required");
      return;
    }

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
    // Allows alphanumeric, spaces, colons, hyphens, and underscores
    const re = /^[a-zA-Z0-9\s:_-]*$/;
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

  search() {
    this.p = 1;
  }

  pageChange($event: any) {
    this.p = $event;
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

  exportAsXLSX(): void {

    let role;
    if (this.user.userType === "Super Admin") {
      role = new Role();
      role.roleName = "Super Admin";
      role.sessionDTO = this.sessionObject;
      this.applicationIPConfigurationServiceService.getAllApplicationList(role).pipe(first()).subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          response.serviceResponse.unshift(this.displayedColumns);
          this.excelService.exportAsExcelFile(response.serviceResponse, "Applications_List");
        }
      });
    }
    else {
      role = new Role();
      role.roleName = "";
      role.id = this.user['userRole'][0].roleId;
      role.sessionDTO = this.sessionObject;
      this.applicationIPConfigurationServiceService.getAllApplicationList(role).pipe(first()).subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          response.serviceResponse.unshift(this.displayedColumns);
          this.excelService.exportAsExcelFile(response.serviceResponse, "Applications_List");
        }
      });
    }
  }

  toggleDeleteTemplateButtons(status: string) {
    let divElement = document.getElementById('applicationDeleteDiv');
    if (!divElement) return;
    if (status === 'enable') {
      divElement.style.pointerEvents = 'auto';
      divElement.style.opacity = "1";
      return;
    }
    if (status === 'disable') {
      divElement.style.pointerEvents = 'none';
      divElement.style.opacity = "0.5";
      return;
    }
  }

  ngOnDestroy() {
    if (!this.browserRefresh) {
      sessionStorage.setItem("onPageExitTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
      this.loggerService.logMyInfo(this.sessionObject, '/application');
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


  handleNodeKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addNodeFromInput();
    }
  }

}
