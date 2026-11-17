import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, TemplateRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InterfaceConfigurationMaster } from '../../../../models/interface-configuration-master';
import { User } from '../../../../models/user';
import { UserTypeCrudMapObject } from '../../../../models/UserTypeCrudMapObject';
import { Session } from '../../../../models/session';
import { first, from, switchMap } from 'rxjs';
import { DecoderService } from '../../../../services/decoder.service';
import { ApplicationService } from '../../../../services/application.service';
import { Router } from '@angular/router';
import { LoaderService } from '../../../../services/loader.service';
import { LoggerService } from '../../../../services/logger.service';
import { InterfaceConfigurationService } from '../../../../services/interface-configuration.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as bootstrap from 'bootstrap';
import Swal from 'sweetalert2';

import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../services/sanitization.service';

@Component({
  selector: 'app-interface-config',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SanitizeInputDirective],
  templateUrl: './interface-config.component.html',
  styleUrl: './interface-config.component.css'
})
export class InterfaceConfigComponent implements OnInit, AfterViewInit {

  isUpdation = false;
  isError: boolean = false;
  isSuccess: boolean = false;
  p: number = 1;
  isForm: boolean = false;
  isTable: boolean = false;
  isCreation: boolean = false;
  interfaceConfigObj = new InterfaceConfigurationMaster();
  configType: any;
  ip: any;
  port: any;
  username: any;
  password: any;
  protocol: any;
  metadataPath: any;
  keyStoreAlias: any;
  keyStoreFile: any;
  keyStorePassword: any;
  organizationUnit: any;
  domainComponent1: any;
  domainComponent2: any;
  applicationList: any;
  caCertificate: any;
  elkId: any;
  emailTest: any;
  senderEmail: any;
  isElasticAuthEnabled: any;
  isCAcertificate: any;
  interConfigID: any;
  user = new User();
  allInterfaceConfigurations: any;
  isDesc: boolean = false;
  column: any;
  configTypeDel: any;
  alertMessage: any; //alert modal var
  sortparam: any;
  applicationId: any;
  userTypeCrudMap = new UserTypeCrudMapObject();
  sessionObject: Session = new Session();
  browserRefresh: any = false;
  // For Jira Integration
  jiraToolId: any = "";
  projectKey: any = "";
  showTable = false;
  showForm = true;
  searchText = '';
  page = 1;
  pageSize = 8;
  totalPages = 0;
  pagedInterfaces: any[] = [];
  filteredInterfaces: any[] = [];
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  showError = false;
  showSuccess = false;
  showUpdateSuccess = false;
  errorMessage = '';
  successMessage = '';
  updateMessage = '';
  showDelete = false;
  deleteMessage = '';
  // fieldTextType = false;
  showMainPassword = false;
  showSmtpPassword = false;
  showElkPassword = false;
  showKeyStorePassword = false;
  showJiraPassword = false;
  isDeleting = false;
  deleteModalRef: any;
  selectedInterface!: InterfaceConfigurationMaster;



  constructor(private decoderService: DecoderService
    , private interfaceConfigService: InterfaceConfigurationService
    , private applicationService: ApplicationService
    , private router: Router, private loggerService: LoggerService, private loaderService: LoaderService,
    private modalService: NgbModal,
    private sanitizationService: SanitizationService) { }

  protected readonly Math = Math;

  ngOnInit(): void {

    this.isForm = true;
    this.isTable = false;
    this.isCreation = true;
    this.isUpdation = false;
    this.protocol = 'Select';
    this.configType = 'Select';

    const storedUser = sessionStorage.getItem('currentUser');
    this.user = storedUser
      ? this.decoderService.decryptJson(JSON.parse(storedUser))
      : null;

    if (!this.user) {
      console.error('User missing from session');
      return;
    }

    const interfaceMapping = (this.user as any)?.['crudData']?.['Admin-Config']?.['interfaceConfig'];
    if (interfaceMapping) {
      this.userTypeCrudMap = new UserTypeCrudMapObject();
      this.userTypeCrudMap.create = interfaceMapping.create === 'true';
      this.userTypeCrudMap.edit = interfaceMapping.edit === 'true';
      this.userTypeCrudMap.delete = interfaceMapping.delete === 'true';
    }

    // ---- DEBUG LOG ----
    // console.log('[InterfaceConfig] User:', this.user.userId, '|', this.user.userType);
    // console.log('[InterfaceConfig] Permissions → Create:', this.userTypeCrudMap?.create, '| Edit:', this.userTypeCrudMap?.edit, '| Delete:', this.userTypeCrudMap?.delete);

    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config";
    this.sessionObject.configTab = "Interface Configuration";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');

    const browser = this.loggerService.getBrowserNameAndVersion();
    this.sessionObject.browserName = browser.name;
    this.sessionObject.browserVersion = browser.version;

    this.getApplicationByUserId();
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  openCreateForm() {

    // show form
    this.isForm = true;
    this.showForm = true;
    this.showTable = false;

    // creation mode
    this.isCreation = true;
    this.isUpdation = false;

    // clear primary key
    this.interConfigID = null;

    // reset all fields
    this.resetForm();

    // reset dropdown defaults
    this.configType = 'Select';
    this.protocol = 'Select';

    // clear banners
    this.resetBanners();
  }


  refreshConfiguration() {
    this.protocol = "Select";
    this.ip = "";
    this.port = "";
    this.username = "";
    this.password = "";
    this.metadataPath = "";
    this.keyStoreFile = "";
    this.keyStoreAlias = "";
    this.keyStorePassword = "";
    this.organizationUnit = "";
    this.domainComponent1 = "";
    this.domainComponent2 = "";
    this.jiraToolId = "";
    this.projectKey = "";
  }

  createInterface() {
    if (!this.validateInterface()) return;

    this.mapFormToDTO('create');

    const safePayload = this.sanitizationService.sanitizePayload(this.interfaceConfigObj);

    this.interfaceConfigService.createInterfaceConfiguration(safePayload).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus === 'Success') {
        this.showSuccessBanner('Interface created successfully');
        this.resetForm();
        return;
      }
      if (typeof response.serviceResponse === 'string') {
        this.showErrorBanner(response.serviceResponse);
      } else {
        this.showErrorBanner('Create failed');
      }
    });
  }

  validateEmail(email: string): boolean {
    if (!email) {
      return true;
    }

    const regex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    return regex.test(email);
  }


  validateIP(value: string): boolean {
    if (!value) {
      return true;
    }

    // ---------- IPv4 ----------
    const ipRegex =
      /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

    // ---------- DOMAIN ----------
    const domainRegex =
      /^(?=.{1,253}$)(?!-)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;

    return ipRegex.test(value) || domainRegex.test(value);
  }


  validateNumber(num: string) {
    if (num) {
      const re = /^[0-9]{1,5}$/;
      // console.log(re.test(ip));
      return re.test(num);
    }
    else {
      return true;
    }

  }

  validatePort(num: any) {
    if (num != undefined && num != "") {
      if (num > 0 && num <= 65535) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  getApplicationByUserId() {
    let userId = this.user.userId;
    this.user.sessionDTO = this.sessionObject;
    this.applicationService.getAllApplicationsByUserID(this.user).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.applicationList = response.serviceResponse;
        this.applicationList.sort(function (a: { applicationName: string; }, b: { applicationName: string; }) {
          return a.applicationName.toLowerCase().localeCompare(b.applicationName.toLowerCase());
        });
      }
    });
  }

  testConnection() {

    // ---------- PROTOCOL ----------
    if (!this.protocol || this.protocol === 'Select') {
      this.showErrorBanner('Kindly provide Protocol');
      return;
    }

    // ---------- IP / DOMAIN ----------
    if (!this.ip) {
      this.showErrorBanner('Kindly provide IP / Domain');
      return;
    }

    if (!this.validateIP(this.ip)) {
      this.showErrorBanner('Kindly provide valid IP / Domain');
      return;
    }

    // ---------- PORT ----------
    if (this.configType !== 'SFTP') {

      if (!this.port) {
        this.showErrorBanner('Kindly provide Port');
        return;
      }

      if (!this.validateNumber(this.port) || !this.validatePort(this.port)) {
        this.showErrorBanner('Kindly provide valid Port');
        return;
      }
    }

    if (this.username) {
      const regex = /^[a-zA-Z0-9_.@-]*$/;
      if (!regex.test(this.username)) {
        this.showErrorBanner(
          "Username allows only alphanumeric and '@ - _ .' characters"
        );
        return;
      }
    }

    // ---------- ELK AUTH ----------
    if (this.configType === 'ELK' && this.isElasticAuthEnabled === 'yes') {

      if (!this.username) {
        this.showErrorBanner('Kindly provide Username');
        return;
      }

      if (!this.password) {
        this.showErrorBanner('Kindly provide Password');
        return;
      }
    }

    // ---------- ELK CA CERT ----------
    if (
      this.configType === 'ELK' &&
      this.isCAcertificate === 'yes' &&
      !this.caCertificate
    ) {
      this.showErrorBanner('Kindly provide CA / SSL Certificate');
      return;
    }

    this.callTestConnectionApi();
  }

  private callTestConnectionApi() {

    this.loaderService.requestStarted();

    this.interfaceConfigObj = {
      configType: this.configType,
      ip: this.ip,
      port: this.port,
      username: this.username,
      password: this.password,
      protocol: this.protocol,
      metadataPath: this.metadataPath,
      keyStoreAlias: this.keyStoreAlias,
      keyStoreFile: this.keyStoreFile,
      keyStorePassword: this.keyStorePassword,
      createdBy: this.user.userId,
      organizationUnit: this.organizationUnit,
      domainComponent1: this.domainComponent1,
      domainComponent2: this.domainComponent2,
      applicationId: this.applicationId,
      caCertificate: this.caCertificate,
      sessionDTO: this.sessionObject
    } as InterfaceConfigurationMaster;

    if (this.configType === 'ELK' && this.isElasticAuthEnabled === 'no') {
      this.interfaceConfigObj.username = null;
      this.interfaceConfigObj.password = null;
    }

    if (this.configType === 'ELK' && this.isCAcertificate === 'no') {
      this.interfaceConfigObj.caCertificate = null;
    }

    this.interfaceConfigService
      .testConnectionToElastic(this.interfaceConfigObj)
      .pipe(first())
      .subscribe((response: any) => {

        this.loaderService.requestEnded();

        if (response.serviceStatus === 'Success') {
          this.isError = false;
          this.isSuccess = true;
          this.showSuccessBanner('Connection Tested Successfully!')
        } else {
          this.isError = true;
          this.isSuccess = false;
          this.showErrorBanner(response.serviceResponse);
        }
      });
  }

  testMessage() {

    // ---------- PROTOCOL ----------
    if (!this.protocol || this.protocol === 'Select') {
      this.showErrorBanner('Kindly provide Protocol');
      return;
    }

    // ---------- IP ----------
    if (!this.ip) {
      this.showErrorBanner('Kindly provide IP / Domain');
      return;
    }

    if (!this.validateIP(this.ip)) {
      this.showErrorBanner('Kindly provide valid IP / Domain');
      return;
    }

    // ---------- PORT ----------
    if (this.configType !== 'SFTP') {

      if (!this.port) {
        this.showErrorBanner('Kindly provide Port');
        return;
      }

      if (!this.validateNumber(this.port) || !this.validatePort(this.port)) {
        this.showErrorBanner('Kindly provide valid Port');
        return;
      }
    }

    if (this.username) {
      const regex = /^[a-zA-Z0-9_.@-]*$/;
      if (!regex.test(this.username)) {
        this.showErrorBanner(
          "Username allows only alphanumeric and '@ - _ .' characters"
        );
        return;
      }
    }


    // ---------- SMTP AUTH ----------
    if (this.configType === 'SMTP' && this.isElasticAuthEnabled === 'yes') {

      if (!this.username) {
        this.showErrorBanner('Kindly provide Username');
        return;
      }

      if (!this.password) {
        this.showErrorBanner('Kindly provide Password');
        return;
      }
    }

    // ---------- EMAIL ----------
    if (!this.senderEmail) {
      this.showErrorBanner('Kindly provide Sender Email Address');
      return;
    }

    if (!this.validateEmail(this.senderEmail)) {
      this.showErrorBanner('Kindly provide valid Sender Email');
      return;
    }

    if (this.emailTest && !this.validateEmail(this.emailTest)) {
      this.showErrorBanner('Kindly provide valid Test Email');
      return;
    }

    this.callTestMessageApi();
  }

  private callTestMessageApi() {

    this.loaderService.requestStarted();

    this.interfaceConfigObj = {
      ip: this.ip,
      port: this.port,
      username: this.username,
      password: this.password,
      senderEmail: this.senderEmail,
      emailTest: this.emailTest,
      protocol: this.protocol,
      configType: this.configType,
      sessionDTO: this.sessionObject
    } as InterfaceConfigurationMaster;

    if (this.configType === 'SMTP' && this.isElasticAuthEnabled === 'no') {
      this.interfaceConfigObj.username = null;
      this.interfaceConfigObj.password = null;
    }

    this.interfaceConfigService
      .testMessage(this.interfaceConfigObj)
      .pipe(first())
      .subscribe((response: any) => {

        this.loaderService.requestEnded();

        if (response.serviceStatus === 'Success') {
          this.isError = false;
          this.isSuccess = true;
          this.showSuccessBanner(response.serviceResponse);
        } else {
          this.isError = true;
          this.isSuccess = false;
          this.showErrorBanner(response.serviceResponse);
        }
      });
  }

  testJiraConnection() {

    // ---------- CONFIG TYPE ----------
    if (!this.configType || this.configType === 'Select') {
      this.showErrorBanner('Kindly provide Configuration Type');
      return;
    }

    // ---------- JIRA TOOL ----------
    if (this.configType === 'JIRA' && !this.jiraToolId) {
      this.showErrorBanner('Kindly provide Jira Tool Id');
      return;
    }

    if (this.configType === 'JIRA' && !this.projectKey) {
      this.showErrorBanner('Kindly provide Jira Project Key');
      return;
    }

    // ---------- PROTOCOL ----------
    if (!this.protocol || this.protocol === 'Select') {
      this.showErrorBanner('Kindly provide Protocol');
      return;
    }

    // ---------- IP ----------
    if (!this.ip) {
      this.showErrorBanner('Kindly provide IP / Domain');
      return;
    }

    if (!this.validateIP(this.ip)) {
      this.showErrorBanner('Kindly provide valid IP / Domain');
      return;
    }

    if (this.username) {
      const regex = /^[a-zA-Z0-9_.@-]*$/;
      if (!regex.test(this.username)) {
        this.showErrorBanner(
          "Username allows only alphanumeric and '@ - _ .' characters"
        );
        return;
      }
    }

    // ---------- AUTH ----------
    if (this.configType === 'JIRA' && !this.username) {
      this.showErrorBanner('Kindly provide Username');
      return;
    }

    if (this.configType === 'JIRA' && !this.password) {
      this.showErrorBanner('Kindly provide Password');
      return;
    }
    this.callTestJiraApi();
  }

  private callTestJiraApi() {

    this.loaderService.requestStarted();

    const interfaceConfigDTO = {
      configType: this.configType,
      ip: this.ip,
      protocol: this.protocol,
      username: this.username,
      password: this.password,
      jiraId: this.jiraToolId,
      projectKey: this.projectKey,
      sessionDTO: this.sessionObject
    } as InterfaceConfigurationMaster;

    this.interfaceConfigService
      .testConnectionToJira(interfaceConfigDTO)
      .pipe(first())
      .subscribe((response: any) => {

        this.loaderService.requestEnded();

        if (response.serviceStatus === 'Success') {
          this.isError = false;
          this.isSuccess = true;
          this.showSuccessBanner(response.serviceResponse);
        } else {
          this.isError = true;
          this.isSuccess = false;
          this.showErrorBanner(response.serviceError);
        }
      });
  }


  getAllInterfaceConfigurations() {
    this.interfaceConfigService
      .getAllInterfaceConfigurations(this.sessionObject)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus === 'Success') {
          this.allInterfaceConfigurations = response.serviceResponse;
          this.page = 1;
          this.applyFilterAndPagination();
        }
      });
  }

  updateInterface() {

    if (!this.interConfigID) {
      this.showErrorBanner('Invalid Interface selected');
      return;
    }

    if (!this.validateInterface()) return;

    this.mapFormToDTO('update');

    const safePayload = this.sanitizationService.sanitizePayload(this.interfaceConfigObj);

    this.interfaceConfigService
      .updateInterfaceConfiguration(safePayload)
      .pipe(first())
      .subscribe((response: any) => {

        if (response.serviceStatus === 'Success') {

          this.interfaceConfigObj = new InterfaceConfigurationMaster();
          this.showUpdateBanner('Interface updated successfully');
          this.resetForm();
          this.showInterfaceTable();
          return;
        }
        this.showErrorBanner(
          response.serviceResponse || 'Update failed'
        );
      });
  }

  resetForm() {
    this.configType = 'Select';
    this.ip = this.port = this.username = this.password = null;
    this.protocol = 'Select';
    this.metadataPath = null;
    this.keyStoreAlias = null;
    this.keyStoreFile = null;
    this.keyStorePassword = null;
    this.organizationUnit = null;
    this.domainComponent1 = null;
    this.domainComponent2 = null;
    this.jiraToolId = null;
    this.projectKey = null;
    this.elkId = null;
    this.senderEmail = null;
    this.caCertificate = null;
    this.isElasticAuthEnabled = 'no';
    this.isCAcertificate = 'no';
  }


  applyFilterAndPagination() {
    const term = this.searchText?.toLowerCase().trim() || '';

    let list = this.allInterfaceConfigurations.filter((i: any) =>
      i.configType?.toLowerCase().includes(term) ||
      i.protocol?.toLowerCase().includes(term) ||
      i.ip?.toLowerCase().includes(term) ||
      i.port?.toString().includes(term) ||
      i.username?.toLowerCase().includes(term) ||
      i.metadataPath?.toLowerCase().includes(term) ||
      i.keyStoreAlias?.toLowerCase().includes(term) ||
      i.keyStoreFile?.toLowerCase().includes(term) ||
      i.createdBy?.toLowerCase().includes(term) ||
      (i.createdOn ? new Date(i.createdOn).toLocaleDateString('en-GB') : '').includes(term)
    );

    if (this.sortColumn) {
      list = list.sort((a: any, b: any) => {
        const valA = (a[this.sortColumn] || '').toString().toLowerCase();
        const valB = (b[this.sortColumn] || '').toString().toLowerCase();

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.filteredInterfaces = list;

    this.totalPages = Math.ceil(this.filteredInterfaces.length / this.pageSize) || 1;

    if (this.page > this.totalPages) this.page = 1;

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.pagedInterfaces = this.filteredInterfaces.slice(start, end);
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyFilterAndPagination();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.applyFilterAndPagination();
    }
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilterAndPagination();
  }

  showInterfaceTable() {
    this.searchText = '';
    this.isForm = false;
    this.showTable = true;
    this.showForm = false;
    this.page = 1;
    this.getAllInterfaceConfigurations();
  }

  editInterface(ic: InterfaceConfigurationMaster) {

    // UI mode
    this.isForm = true;
    this.showForm = true;
    this.showTable = false;
    this.isCreation = false;
    this.isUpdation = true;

    // Primary key (MOST IMPORTANT)
    this.interConfigID = ic.interConfigID;

    // Common fields
    this.configType = ic.configType;
    this.ip = ic.ip;
    this.port = ic.port;
    this.protocol = ic.protocol;
    this.username = ic.username;
    this.password = ic.password;
    this.metadataPath = ic.metadataPath;
    this.keyStoreAlias = ic.keyStoreAlias;
    this.keyStoreFile = ic.keyStoreFile;
    this.keyStorePassword = ic.keyStorePassword;
    this.organizationUnit = ic.organizationUnit;
    this.domainComponent1 = ic.domainComponent1;
    this.domainComponent2 = ic.domainComponent2;
    this.applicationId = ic.applicationId;
    this.senderEmail = ic.senderEmail;

    // ELK
    if (ic.configType === 'ELK') {
      this.elkId = ic.elkId;

      this.isElasticAuthEnabled = ic.username ? 'yes' : 'no';
      this.isCAcertificate = ic.caCertificate ? 'yes' : 'no';
      this.caCertificate = ic.caCertificate;
    }

    // SMTP
    if (ic.configType === 'SMTP') {
      this.isElasticAuthEnabled = ic.username ? 'yes' : 'no';
    }

    // JIRA
    if (ic.configType === 'JIRA') {
      this.jiraToolId = ic.jiraId;
      this.projectKey = ic.projectKey;
    }
  }

  removeReadonly(event: any) {
    event.target.removeAttribute('readonly');
  }

  private resetBanners() {
    // No-op as we use SweetAlert2 now
  }

  showErrorBanner(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonColor: '#2563eb'
    });
  }

  showSuccessBanner(message = 'Interface created successfully') {
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: message,
      confirmButtonColor: '#2563eb'
    });
  }

  showUpdateBanner(message = 'Interface updated successfully') {
    Swal.fire({
      icon: 'success',
      title: 'Updated',
      text: message,
      confirmButtonColor: '#2563eb'
    });
  }

  showDeleteBanner(message = 'Interface deleted successfully') {
    Swal.fire({
      icon: 'success',
      title: 'Deleted',
      text: message,
      confirmButtonColor: '#2563eb'
    });
  }

  private validateInterface(): boolean {

    // ---------- Common ----------
    if (!this.configType || this.configType === 'Select') {
      this.showErrorBanner('Kindly provide Configuration Type');
      return false;
    }

    if (this.configType !== 'JIRA') {
      if (!this.protocol || this.protocol === 'Select') {
        this.showErrorBanner('Kindly provide Protocol');
        return false;
      }
    }

    if (!this.ip) {
      this.showErrorBanner('Kindly provide IP / Domain');
      return false;
    }

    if (!this.validateIP(this.ip)) {
      this.showErrorBanner('Kindly provide valid IP / Domain');
      return false;
    }

    if (this.configType !== 'SFTP' && this.configType !== 'JIRA') {
      if (!this.port) {
        this.showErrorBanner('Kindly provide Port');
        return false;
      }
      if (!this.validateNumber(this.port) || !this.validatePort(this.port)) {
        this.showErrorBanner('Kindly provide valid Port');
        return false;
      }
    }

    if (this.username) {
      const usernameRegex = /^[a-zA-Z0-9_.@-]*$/;
      if (!usernameRegex.test(this.username)) {
        this.showErrorBanner(
          "Username allows only alphanumeric and '@ - _ .' characters"
        );
        return false;
      }
    }

    // ---------- Username / Password (DEFAULT CASE) ----------
    const requiresCredentials =
      !['SMTP', 'ELK', 'ADFS'].includes(this.configType);

    if (requiresCredentials) {
      if (!this.username) {
        this.showErrorBanner('Kindly provide Username');
        return false;
      }
      if (!this.password) {
        this.showErrorBanner('Kindly provide Password');
        return false;
      }
    }

    // ---------- LDAP ----------
    if (this.configType === 'LDAP') {
      if (!this.organizationUnit || !this.domainComponent1 || !this.domainComponent2) {
        this.showErrorBanner('Kindly provide complete LDAP details');
        return false;
      }
    }

    // ---------- SMTP ----------
    if (this.configType === 'SMTP') {
      if (!this.senderEmail) {
        this.showErrorBanner('Kindly provide Sender Email');
        return false;
      }

      if (!this.validateEmail(this.senderEmail)) {
        this.showErrorBanner('Kindly provide valid Sender Email');
        return false;
      }

      if (this.emailTest && !this.validateEmail(this.emailTest)) {
        this.showErrorBanner('Kindly provide valid Test Email');
        return false;
      }

      if (this.isElasticAuthEnabled === 'yes') {
        if (!this.username || !this.password) {
          this.showErrorBanner('Kindly provide SMTP credentials');
          return false;
        }
      }
    }

    // ---------- ELK ----------
    if (this.configType === 'ELK') {
      if (!this.elkId) {
        this.showErrorBanner('Kindly provide Elastic ID / Name');
        return false;
      }

      if (this.isElasticAuthEnabled === 'yes') {
        if (!this.username || !this.password) {
          this.showErrorBanner('Kindly provide ELK credentials');
          return false;
        }
      }

      if (this.isCAcertificate === 'yes' && !this.caCertificate) {
        this.showErrorBanner('Kindly provide CA / SSL Certificate');
        return false;
      }
    }

    // ---------- ADFS ----------
    if (this.configType === 'ADFS') {
      if (!this.metadataPath || !this.keyStoreFile || !this.keyStoreAlias || !this.keyStorePassword) {
        this.showErrorBanner('Kindly provide complete ADFS details');
        return false;
      }
    }

    // ---------- JIRA ----------
    if (this.configType === 'JIRA') {
      if (!this.jiraToolId || !this.projectKey) {
        this.showErrorBanner('Kindly provide Jira details');
        return false;
      }
      if (!this.username || !this.password) {
        this.showErrorBanner('Kindly provide Jira credentials');
        return false;
      }
    }

    return true;
  }


  private mapFormToDTO(mode: 'create' | 'update') {

    this.interfaceConfigObj = new InterfaceConfigurationMaster();

    if (mode === 'update') {
      this.interfaceConfigObj.interConfigID = this.interConfigID;
      this.interfaceConfigObj.updatedBy = this.user.userId;
    } else {
      this.interfaceConfigObj.createdBy = this.user.userId;
    }

    Object.assign(this.interfaceConfigObj, {
      configType: this.configType,
      ip: this.ip,
      port: this.port,
      protocol: this.protocol,
      username: this.isElasticAuthEnabled === 'no' ? null : this.username,
      password: this.isElasticAuthEnabled === 'no' ? null : this.password,
      metadataPath: this.metadataPath,
      keyStoreAlias: this.keyStoreAlias,
      keyStoreFile: this.keyStoreFile,
      keyStorePassword: this.keyStorePassword,
      organizationUnit: this.organizationUnit,
      domainComponent1: this.domainComponent1,
      domainComponent2: this.domainComponent2,
      applicationId: this.applicationId,
      caCertificate: this.isCAcertificate === 'no' ? null : this.caCertificate,
      elkId: this.elkId,
      senderEmail: this.senderEmail,
      jiraId: this.jiraToolId,
      projectKey: this.projectKey,
      sessionDTO: this.sessionObject
    });
  }

  openDeleteModal(
    row: InterfaceConfigurationMaster,
    template?: TemplateRef<any>
  ) {
    this.selectedInterface = row;

    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        this.confirmDelete();
      }
    });
  }

  confirmDelete() {
    if (!this.selectedInterface?.interConfigID) {
      this.showErrorBanner('Invalid interface selected');
      return;
    }

    this.isDeleting = true;
    const dto = { ...this.selectedInterface };

    dto.updatedBy = this.user.userId;
    dto.sessionDTO = this.sessionObject;

    this.interfaceConfigService
      .deleteInterfaceConfiguration(dto)
      .pipe(first())
      .subscribe({
        next: (response: any) => {
          this.isDeleting = false;
          if (response.serviceStatus === 'Success') {
            this.showDeleteBanner('Interface deleted successfully');
            this.getAllInterfaceConfigurations();
            return;
          }
          this.showErrorBanner(response.serviceResponse || 'Delete failed');
        },
        error: () => {
          this.isDeleting = false;
          this.showErrorBanner('Delete failed');
        }
      });
  }

  onPortChange(value: string) {
    if (!value) {
      this.port = value;
      return;
    }
    if (!this.validateNumber(value)) {
      this.port = value.slice(0, -1);
      return;
    }
    if (!this.validatePort(value)) {
      return;
    }

    this.port = value;
  }

  onUsernameChange(value: string) {
    if (!value) {
      this.username = value;
      return;
    }
    const regex = /^[a-zA-Z0-9_.@-]*$/;
    if (!regex.test(value)) {
      this.username = value.slice(0, -1);
      return;
    }

    this.username = value;
  }

  onIpChange(value: string) {

    if (!value) {
      this.ip = value;
      return;
    }
    const allowed = /^[a-zA-Z0-9.-]*$/;

    if (!allowed.test(value)) {
      this.ip = value.slice(0, -1);
      return;
    }

    this.ip = value;
  }


  onEmailChange(value: string) {

    if (!value) {
      this.emailTest = value;
      return;
    }
    const allowed = /^[a-zA-Z0-9._%+-@]*$/;

    if (!allowed.test(value)) {
      this.emailTest = value.slice(0, -1);
      return;
    }

    this.emailTest = value;
  }


}
