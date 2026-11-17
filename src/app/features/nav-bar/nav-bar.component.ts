import { CommonModule } from '@angular/common';
import { Component, ViewChild, HostListener, ElementRef, Renderer2, OnInit, TemplateRef, OnDestroy, AfterViewInit } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { ProfileSideBarComponent } from '../../utility/profile-side-bar/profile-side-bar.component';
import { DatePickerComponent } from '../../utility/date-picker/date-picker.component';
import { DatePickerSMeteringComponent } from '../../utility/date-picker-smetering/date-picker-smetering.component';
import { User, SubFeature } from '../../models/user';
import { Session } from '../../models/session';
import { LoggerService } from '../../services/logger.service';
import { AuthenticationService } from '../../services/authentication.service';
import { NgbModalModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { first, Subscription } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { AutoRefreshService } from '../../services/auto-refresh.service';
import { DateService } from '../../services/date.service';
import * as bootstrap from 'bootstrap';
import { ControlZoneManagementComponent } from '../../utility/control-zone-managment/control-zone-managment.component';

@Component({
  selector: 'app-nav-bar',
  imports: [
    CommonModule,
    ProfileSideBarComponent,
    DatePickerComponent,
    ControlZoneManagementComponent,
    RouterOutlet,
    RouterModule,
    DatePickerSMeteringComponent,
    NgbModalModule
  ],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css']
})
export class NavBarComponent implements OnInit, OnDestroy, AfterViewInit {

  // @ViewChild(ProfileSideBarComponent) sidebar!: ProfileSideBarComponent;
  @ViewChild(ProfileSideBarComponent) profileSidebar!: ProfileSideBarComponent;
  @ViewChild('menuContainer') menuRef!: ElementRef;
  @ViewChild(DatePickerComponent) datePicker!: DatePickerComponent;
  @ViewChild(ControlZoneManagementComponent) controlZonePicker!: ControlZoneManagementComponent;
  @ViewChild('datePickerContainer') datePickerContainer!: ElementRef;
  @ViewChild(DatePickerSMeteringComponent) datePickerSM!: DatePickerSMeteringComponent;
  @ViewChild('datePickerSMContainer') datePickerSMContainer!: ElementRef;

  isPendingApprovalOpen = false;
  emptyImg: any;
  alert_messageuser!: TemplateRef<any>;

  private storageSub: Subscription = new Subscription();
  isAutoRefreshEnabled: boolean = false;
  isAutoRefreshPanelOpen = false;
  refreshInterval: number = 30;
  private refreshIntervalId: any;

  isDarkTheme = true;
  isVolumeOn = true;

  isAlert = true;
  isSidebarCollapsed = true;
  activeNestedSubmenu: any = null;
  expandedMenu: string | null = null;

  user: User = new User();
  currentUser: User | null = null;
  userObj: User = new User();

  approvalUser: User = new User();
  isAlertOpen = false;

  isApprovalConfirmOpen = false;
  pendinglist: any;
  pendingApprovalCount: any;
  alertMessage: any;

  menuList: any;

  isDashboard: boolean = false;
  isTrendDashboard: boolean = false;
  isService: boolean = false;
  lastLogin: any;
  sessionObject: Session = new Session();

  hasExpired: boolean = false;
  showMessage: boolean = false;
  expiryMessage: string = '';

  private pendingApprovalModalRef: any = null;
  private confirmModalRef: any = null;
  private alertModalRef: any = null;

  constructor(
    private router: Router,
    private loggerService: LoggerService,
    private authService: AuthenticationService,
    private modalService: NgbModal,
    private autoRefresh: AutoRefreshService,
    private dateService: DateService,
  ) { }

  ngOnInit() {
    this.authService.currentUser.subscribe((x: User | null) => (this.currentUser = x));
    if (this.currentUser) {
      this.user = this.currentUser;
    }

    this.userObj.themeColour = sessionStorage.getItem("themeColour");
    this.lastLogin = sessionStorage.getItem('lastLogin');
    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.showLicenseAlert();

    this.getMenuList();
    this.getAllPendingApprovals();
    this.isDarkTheme = false;
    sessionStorage.setItem('themeColour', 'dark');
    this.updateBodyClass();
    // Auto Refresh 
    this.loadInitialValues();
    this.manageAutoRefresh();
    this.storageSub = this.autoRefresh.getStorageSub().subscribe((data) => {
      if (data.key === 'RefreshEnability') {
        this.isAutoRefreshEnabled = JSON.parse(data.value);
        this.manageAutoRefresh();
      }
      if (data.key === 'RefreshInterval') {
        this.refreshInterval = Number(data.value);
        this.manageAutoRefresh();
      }
    });
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  ngOnDestroy(): void {
    if (this.storageSub) {
      this.storageSub.unsubscribe();
    }
    this.clearAutoRefresh();
  }

  showLicenseAlert(): void {
    const expiry = Number(sessionStorage.getItem("LicenseDaysLeft"));
    this.showMessage = sessionStorage.getItem("ShowLicenseAlert") === 'true';

    if (expiry <= 0) {
      this.hasExpired = true;
      this.expiryMessage = "License has expired";
    } else if (expiry <= 30) {
      this.hasExpired = false;
      this.expiryMessage = `License will expire in ${expiry} day(s)`;
    }
  }

  closeLicenseAlert(): void {
    sessionStorage.setItem("ShowLicenseAlert", "false");
    this.showMessage = false;
  }

  getMenuList(): void {
    if (this.currentUser && this.currentUser.subFeatures) {
      console.log(this.currentUser.subFeatures, "submenu list")
      let menu: SubFeature[] = [];

      this.currentUser.subFeatures.forEach((feature: SubFeature) => {
        if (feature.name === 'Home') {
          const subNames = feature.subFeature?.map(sf => sf.name.toUpperCase()) || [];
          if (
            subNames.includes('SRG') ||
            subNames.includes('SERVICE') ||
            subNames.includes('OVERVIEW')
          ) {
            menu.push(feature);
          } else if (
            feature.subFeature?.length === 1 &&
            ['SRG', 'SERVICE', 'OVERVIEW'].includes(feature.subFeature[0].name.toUpperCase())
          ) {
            menu.push(feature);
          }

          this.isDashboard = true;
        } else if (feature.name === 'Trend Dashboard') {
          this.isTrendDashboard = true;
        } else if (feature.name === 'Services') {
          this.isService = true;
        } else if (feature.name === 'Alert') {
          if (!feature.subFeature) {
            feature.subFeature = [];
          }
          menu.push(feature);
        } else {
          if (feature.name === 'Report') {
            feature.subFeature?.forEach((sub: SubFeature) => {
              if (sub.name === 'SM Reports') {
                sub.subFeature = [
                  {
                    name: 'Custom Reports',
                    routeName: 'custom-reports',
                    subFeatureID: '4021'
                  }
                ];
              }
            });
          }
          menu.push(feature);
        }
      });



      this.menuList = this.reorderMenu(menu);
    }
  }

  reorderMenu(menu: any[]): any[] {
    const desiredOrder = [
      'Home',
      'Dashboard',
      'Infrastructure',
      'Database',
      'RUM',
      'Cloud',
      'Message Queue',
      'Report',
      'Alert',
      'Configuration'
    ];
    const orderMap = new Map(desiredOrder.map((item, index) => [item, index]));
    const orderedItems: any[] = [];
    const otherItems: any[] = [];

    menu.forEach(item => {
      if (orderMap.has(item.name)) {
        orderedItems.push(item);
      } else {
        otherItems.push(item);
      }
    });

    orderedItems.sort((a, b) => {
      const aIndex = orderMap.get(a.name) ?? Infinity;
      const bIndex = orderMap.get(b.name) ?? Infinity;
      return aIndex - bIndex;
    });
    return [...orderedItems, ...otherItems];
  }

  activeSubmenu: any = null;
  menuHeading: any = null;
  submenuTopPosition: number = 50;
  private hideDelay: any;

  showSubmenu(item: any, index: number) {
    if (item.subFeature) {
      this.activeSubmenu = item;
      this.activeNestedSubmenu = null;

      const menuItem = document.querySelectorAll('.nav-item')[index];
      if (menuItem) {
        const rect = menuItem.getBoundingClientRect();
        this.submenuTopPosition = rect.top;
      }
      this.clearHideTimeout();
    }
  }

  clearHideTimeout() {
    if (this.hideDelay) {
      clearTimeout(this.hideDelay);
      this.hideDelay = null;
    }
  }


  hideSubmenu() {
    this.hideDelay = setTimeout(() => {
      this.activeSubmenu = null;
      this.activeNestedSubmenu = null;
    }, 300);
  }

  keepSubmenuVisible() {
    this.clearHideTimeout();
  }

  toggleTheme(event: Event) {
    this.isDarkTheme = (event.target as HTMLInputElement).checked;
    sessionStorage.setItem('themeColour', this.isDarkTheme ? 'dark' : 'light');
    this.updateBodyClass();
  }

  updateBodyClass() {
    document.body.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
  }

  shouldShowDatePicker(): boolean {
    return !this.router.url.includes('softwareMetering');
  }

  toggleSidebar() {
    if (this.profileSidebar) {
      this.profileSidebar.toggleSidebar();
    }
  }

  toggleSidebar2() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    document.body.classList.toggle(
      'sidebar-collapsed',
      this.isSidebarCollapsed
    );
    document.body.classList.toggle(
      'sidebar-expanded',
      !this.isSidebarCollapsed
    );
  }

  turnOnVolume() {
    this.isVolumeOn = true;
  }

  turnOffVolume() {
    this.isVolumeOn = false;
  }

  isAlertTrue() {
    this.isAlert = true;
  }

  isAlertFalse() {
    this.isAlert = false;
  }

  toggleSubmenu(label: string) {
    this.expandedMenu = this.expandedMenu === label ? null : label;
  }

  showNestedSubmenu(sub: any) {
    if (sub.subFeature) {
      this.activeNestedSubmenu = sub;
      this.clearHideTimeout();
    } else {
      this.activeNestedSubmenu = null;
    }
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (this.menuRef && !this.menuRef.nativeElement.contains(event.target)) {
      this.expandedMenu = null;
    }

    // Close Date Picker panel if clicked outside
    if (this.datePicker && this.datePickerContainer &&
      !this.datePickerContainer.nativeElement.contains(event.target)) {
      this.datePicker.showCard2 = false;
      this.controlZonePicker.dropdownOpen = false;
    }

    // Close SM Date Picker dropdown if clicked outside
    if (this.datePickerSM && this.datePickerSMContainer && !this.datePickerSMContainer.nativeElement.contains(event.target)) {
      this.datePickerSM.dropdownOpen = false;
    }
  }

  openPendingApproval() {
    this.getAllPendingApprovals();
    this.isPendingApprovalOpen = true;
  }

  closePendingApprovalModal() {
    this.isPendingApprovalOpen = false;
  }


  // openPendingApproval(template: TemplateRef<any>) {
  //   this.getAllPendingApprovals();
  //   this.pendingApprovalModalRef = this.modalService.open(template, {
  //     size: 'lg',
  //     backdrop: 'static',
  //     centered: false,
  //     windowClass: 'slide-left-modal',
  //      container: '#sidebar-modal-container'
  //   });
  // }

  // closePendingApprovalModal() {
  //   if (this.pendingApprovalModalRef) {
  //     this.pendingApprovalModalRef.close();
  //     this.pendingApprovalModalRef = null;
  //   }
  // }

  openConfirmModal(template: TemplateRef<any>, user: any) {
    this.approvalUser = user;
    this.confirmModalRef = this.modalService.open(template, {
      size: 'lg',
      backdrop: 'static',
    });
  }

  // closeConfirmModal() {
  //   if (this.confirmModalRef) {
  //     this.confirmModalRef.close();
  //     this.confirmModalRef = null;
  //   }
  // }

  closeConfirmModal() {
    this.isApprovalConfirmOpen = false;
  }


  getAllPendingApprovals() {
    let user: User = new User();
    user.id = this.user.id
    user.userId = this.setEncryption(this.user.userId);
    user.sessionDTO = this.sessionObject;
    console.log("ENTERED GET ALL PENDING APPROVALS!!!!!!!!!!!");
    this.authService.getAllPendingApproval(user).pipe(first()).subscribe((response: any) => {
      this.pendinglist = response.serviceResponse;
      this.pendingApprovalCount = this.pendinglist.length;
      console.log("ENTERED GET ALL PENDING APPROVALS SUBSCRIBE!!!!!!!!!!!");
    });
  }

  setEncryption(value: any) {
    let salt = this.createSalt();
    value = value + salt;
    var key = CryptoJS.enc.Utf8.parse("IjfgGhpOiLjbrtJf");
    var iv = CryptoJS.enc.Utf8.parse("pOiJlKmmHgFvdStf");
    var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(value.toString()), key, {
      keySize: 128 / 8,
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  }

  createSalt() {
    let length = 24
    var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < length; i++) {
      result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
  }

  // openModal(template: TemplateRef<any>, user: any) {
  //   this.approvalUser = user;
  //   this.confirmModalRef = this.modalService.open(template, {
  //     size: 'lg',
  //     backdrop: 'static',
  //   });
  //   console.log("APPROVAL USER: ", user);
  // }

  openModal(user: any) {
    this.approvalUser = user;
    this.isApprovalConfirmOpen = true;
    console.log("APPROVAL USER: ", user);
  }

  confirmApproveUser(template: TemplateRef<any>) {
    this.approvalUser['approveStatus'] = "Approved";
    this.approvalUser.sessionDTO = this.sessionObject;
    this.authService.approveUser(this.approvalUser).pipe(first()).subscribe((response: any) => {
      this.closeConfirmModal();
      this.openAlertMod(response.serviceResponse);
      this.closePendingApprovalModal();
      this.getAllPendingApprovals();
    });
  }

  confirmRejectUser(template: TemplateRef<any>) {
    this.approvalUser['approveStatus'] = "Rejected";
    this.approvalUser.sessionDTO = this.sessionObject;
    this.authService.approveUser(this.approvalUser).pipe(first()).subscribe((response: any) => {
      this.closeConfirmModal();
      this.openAlertMod(response.serviceResponse);
      this.closePendingApprovalModal();
      this.getAllPendingApprovals();
    });
  }

  // openAlertMod(template: TemplateRef<any>, message: string) {
  //   this.alertMessage = message;
  //   this.alertModalRef = this.modalService.open(template, {
  //     size: 'lg',
  //     backdrop: 'static',
  //   });
  // }

  // closeAlertModal() {
  //   if (this.alertModalRef) {
  //     this.alertModalRef.close();
  //     this.alertModalRef = null;
  //   }
  // }

  openAlertMod(message: string) {
    this.alertMessage = message;
    this.isAlertOpen = true;
  }

  closeAlertModal() {
    this.isAlertOpen = false;
  }


  cancelRequest() {
    this.modalService.dismissAll();
  }

  // Auto Refresh methods

  private loadInitialValues() {
    const storedState = localStorage.getItem('RefreshEnability');
    const storedInterval = localStorage.getItem('RefreshInterval');
    if (storedState !== null) {
      this.isAutoRefreshEnabled = JSON.parse(storedState);
    }
    if (storedInterval !== null) {
      this.refreshInterval = Number(storedInterval);
    }
  }

  private manageAutoRefresh() {
    this.clearAutoRefresh();

    if (this.isAutoRefreshEnabled) {
      this.refreshIntervalId = setInterval(() => {
        this.reloadPage();
      }, this.refreshInterval * 1000);
    }
  }

  private clearAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  setFeatureType(subFeatureName: string) {
    sessionStorage.setItem('featureType', subFeatureName);
  }

  reloadPage() {
    this.dateService.triggerFunctionCall();
  }

  onSetButtonClick() {
    this.autoRefresh.setItems('RefreshEnability', String(this.isAutoRefreshEnabled));
    this.autoRefresh.setItems('RefreshInterval', String(this.refreshInterval));
    this.manageAutoRefresh();
  }

  onIntervalChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.refreshInterval = Number(input.value);
    this.autoRefresh.setItems('RefreshInterval', String(this.refreshInterval));
    this.manageAutoRefresh();
  }

  onToggleAutoRefresh(event: Event) {
    const input = event.target as HTMLInputElement;
    this.isAutoRefreshEnabled = input.checked;
    this.autoRefresh.setItems('RefreshEnability', String(this.isAutoRefreshEnabled));
    this.manageAutoRefresh();
  }

  toggleAutoRefreshPanel(event?: Event) {
    event?.stopPropagation();
    this.isAutoRefreshPanelOpen = !this.isAutoRefreshPanelOpen;
  }

  closeAutoRefreshPanel() {
    this.isAutoRefreshPanelOpen = false;
  }


}
