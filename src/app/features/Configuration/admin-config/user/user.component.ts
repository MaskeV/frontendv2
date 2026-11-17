import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../../../models/user';

import { UserTypeCrudMapObject } from '../../../../models/UserTypeCrudMapObject';
import { Session } from '../../../../models/session';
import { AppComponent, browserRefresh } from '../../../../app.component';
import moment from 'moment';
import { UserService } from '../../../../services/user.service';

import { Router } from '@angular/router';
import { LoggerService } from '../../../../services/logger.service';
import { DecoderService } from '../../../../services/decoder.service';
import { NgbModalModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxPaginationModule } from 'ngx-pagination';
import { GrdFilterPipe } from '../../../../grd-filter.pipe';
import { SortPipe } from '../../../../sort.pipe';
import { AuthenticationService } from '../../../../services/authentication.service';
import { ExcelService } from '../../../../services/excel.service';
import { SessionService } from '../../../../services/session.service';
import { ApplicationService } from '../../../../services/application.service';
import { first } from 'rxjs';
import { ClientManagementService } from '../../../../services/client-management.service';
import Swal from 'sweetalert2';
import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../services/sanitization.service';


@Component({
  selector: 'app-user',
  imports: [CommonModule, ReactiveFormsModule, NgbModalModule, FormsModule,
    NgxPaginationModule,
    GrdFilterPipe,
    SortPipe,
  SanitizeInputDirective],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {

  displayedColumns: string[] = ["UserId", "Full Name", "Mail Id", "Mobile No.", "Approver", "User Type", "Role", "Created On", "Created By", "Updated On", "Updated By",];
  p: number = 1;
  itemsPerPage: number = 10;
  searchText: any;
  isForm!: boolean;
  isTable!: boolean;
  isCreation!: boolean;
  isUpdation!: boolean;
  userObj: User = new User();
  users: User[] = [];
  filteredUsers: any[] = [];
  Math = Math;

  get totalPages(): number {
    return Math.ceil((this.filteredUsers?.length || 0) / Number(this.itemsPerPage));
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.p;

    if (total <= 5) {
      return Array(total).fill(0).map((x, i) => i + 1);
    }

    let start = Math.max(current - 2, 1);
    let end = Math.min(start + 4, total);

    if (end === total) {
      start = Math.max(end - 4, 1);
    }

    return Array.from({ length: (end - start + 1) }, (_, i) => start + i);
  }

  allActiveUsersList: any;
  allApproverList: any;
  approverList: any;
  allRolesList: any;
  roleIDs: any;
  alertMessage: any = "";
  isDesc!: boolean;
  column: any;
  currentUser: User | null = null;
  user = new User();
  isError!: boolean;
  isSuccess!: boolean;
  userTypeCrudMap = new UserTypeCrudMapObject();
  userType: any;
  userType1: any;
  userType2: any;
  allUserList: any;
  userStatus: any;
  regexEmailLC = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/;
  regexMobile = /^\d{10}$/;
  sortDirection: 'asc' | 'desc' = 'asc';
  sortparam: any;
  status: any;
  excelJsonData: any;
  approverValue: boolean = false;
  sessionObject: Session = new Session();
  browserRefresh: any = false;
  isRoleEditable: boolean = true;
  allClientList: any[] = [];



  // Master Lists for Role Creation

  constructor(private userService: UserService, private modalService: NgbModal, private router: Router, private loggerService: LoggerService, private decoderService: DecoderService,
    public appComponenet: AppComponent, private authService: AuthenticationService, private excelService: ExcelService, private sessionService: SessionService,
    private applicationService: ApplicationService, private clientService: ClientManagementService,
    private sanitizationService: SanitizationService) {
    this.authService.currentUser.subscribe(x => {
      this.currentUser = x;
      if (this.currentUser?.userType === 'Super Admin') {
        this.getAllClients();
      }
    });
  }





  onPageSizeChange(value: any) {
    const newValue = parseInt(value, 10);
    if (!isNaN(newValue) && newValue > 0) {
      this.itemsPerPage = newValue;
      this.p = 1; // Reset to first page
      this.updatePaginatedUsers();
    }
  }

  updatePaginatedUsers() {
    if (!this.filteredUsers) {
      this.users = [];
      return;
    }
    const startIndex = (this.p - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.users = this.filteredUsers.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.p < this.totalPages) {
      this.p++;
      this.updatePaginatedUsers();
    }
  }

  prevPage() {
    if (this.p > 1) {
      this.p--;
      this.updatePaginatedUsers();
    }
  }

  goToPage(page: number) {
    this.p = page;
    this.updatePaginatedUsers();
  }

  // Access Control Helpers
  canEditUser(targetUser: any): boolean {
    if (!this.currentUser) return false;

    // Super Admin has full access
    if (this.currentUser.userType === 'Super Admin') return true;

    // Admin Access Rules
    if (this.currentUser.userType === 'Admin') {
      // Can edit regular Users
      if (targetUser.userType === 'User') return true;
      // Can edit OWN account (Self)
      if (targetUser.userType === 'Admin' && String(targetUser.id) === String(this.currentUser.id)) return true;
      // Cannot edit other Admins or Super Admins
      return false;
    }

    return false;
  }

  canDeleteUser(targetUser: any): boolean {
    if (!this.currentUser) return false;
    if (!this.userTypeCrudMap.delete) return false; // Respect global CRUD settings

    // Super Admin has full access
    if (this.currentUser.userType === 'Super Admin') return true;

    // Admin Access Rules
    if (this.currentUser.userType === 'Admin') {
      // Can delete regular Users
      if (targetUser.userType === 'User') return true;
      // Cannot delete admins (even self)
      return false;
    }

    return false;
  }

  canLockUnlockUser(targetUser: any): boolean {
    if (!this.currentUser) return false;
    if (!this.userTypeCrudMap.edit) return false; // Using edit permission for lock/unlock

    // Super Admin has full access
    if (this.currentUser.userType === 'Super Admin') return true;

    // Admin Access Rules
    if (this.currentUser.userType === 'Admin') {
      // Can lock/unlock regular Users
      if (targetUser.userType === 'User') return true;
      // Cannot lock/unlock admins (even self)
      return false;
    }

    return false;
  }

  getUserTypeClass(userType: string): string {
    switch (userType) {
      case 'Super Admin':
        return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50';
      case 'Admin':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800/50';
      case 'Regular User':
      case 'User':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  }

  getRoleClass(roleName: any): string {
    if (!roleName) return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';

    const lowerRole = roleName.toLowerCase();

    if (lowerRole.includes('infra') || lowerRole.includes('admin')) {
      return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50';
    } else if (lowerRole.includes('custom') || lowerRole.includes('edit')) {
      return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/50';
    } else if (lowerRole.includes('view') || lowerRole.includes('read')) {
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/50';
    }

    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  }

  ngOnInit(): void {
    this.browserRefresh = browserRefresh;
    if (!this.browserRefresh) {
      sessionStorage.setItem("onPageNavigateTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
    }
    this.isForm = true;
    this.isTable = false;
    this.isCreation = true;
    this.isUpdation = false;
    this.userObj.authentication = "Select";
    this.userObj.userType = "Select";
    this.userObj.approver = "Select";
    this.userObj.role = "Select";
    this.userObj.sessionLogout = "15";

    // 1. Initialize user first from session storage
    const storedUser = sessionStorage.getItem('currentUser');
    this.user = storedUser
      ? this.decoderService.decryptJson(JSON.parse(storedUser)) as User
      : new User();

    // ---- CRUD PERMISSIONS ----
    const userMapping = (this.user as any)?.['crudData']?.['Admin-Config']?.['user'];
    if (userMapping) {
      this.userTypeCrudMap.create = userMapping.create === 'true';
      this.userTypeCrudMap.edit = userMapping.edit === 'true';
      this.userTypeCrudMap.delete = userMapping.delete === 'true';
    }

    // console.log('[User] Permissions → Create:', this.userTypeCrudMap.create, '| Edit:', this.userTypeCrudMap.edit, '| Delete:', this.userTypeCrudMap.delete);

    // 2. Prepare session object before any API calls
    this.prepareSessionObject();

    // 3. Now make API calls that depend on sessionObject
    this.getAllRoles();
    this.checkUserStatus();
    this.getAllApprovers();

    this.status = this.currentUser?.userType ?? null;

    this.loadUserTableData(); // Populate allActiveUsersList for mapping

    const storedCrudMap = sessionStorage.getItem("userTypeCrudMapList");
    this.userTypeCrudMap = storedCrudMap
      ? new UserTypeCrudMapObject(JSON.parse(storedCrudMap).user)
      : new UserTypeCrudMapObject();

    if (this.currentUser?.userType === 'Super Admin') {
      this.getAllClients();
    }
  }

  getAllClients() {
    if (!this.currentUser?.userId) {
      return;
    }
    this.clientService.getAllClients(this.currentUser.userId, this.sessionObject).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus === "Success" || response.serviceStatus === "200") {
        const rawData = response.serviceResponse || response.data || [];
        this.allClientList = rawData.map((c: any) => {
          if (Array.isArray(c)) {
            return {
              client_id: c[0],
              client_name: c[1],
              mailId: c[2]
            };
          } else {
            return {
              client_id: c.client_id || c.clientId || c.id || 0,
              client_name: c.client_name || c.clientName || c.name || '',
              mailId: c.mailId || c.email || c.mail_id || ''
            };
          }
        });
      }
    });
  }

  prepareSessionObject() {
    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config";
    this.sessionObject.configTab = "User";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser?.userId ?? this.user?.userId ?? null;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
  }





  showTable() {
    this.isTable = true;
    this.isForm = false;
    this.isCreation = false;
    this.isUpdation = false;

    this.p = 1;
    this.searchText = "";

    this.filteredUsers = [];
    this.users = [];

    this.loadUserTableData();
  }

  discardChanges() {
    this.showForm();
  }

  showForm() {
    this.isForm = true;
    this.isTable = false;
    this.isCreation = true;
    this.isUpdation = false;

    this.searchText = "";
    this.approverValue = false;

    this.userObj = new User();
    this.userObj.authentication = "Select";
    this.userObj.userType = "Select";
    this.userObj.approver = "Select";
    this.userObj.role = "Select";
    this.userObj.sessionLogout = "15";
    this.isRoleEditable = true;

    this.getAllRoles();
  }

  getApproversByUserType() {
    this.userObj.role = "Select";
    this.allApproverList = null;

    // If creating a "User" (and we are not Super Admin), auto-assign self as approver
    if (this.userObj.userType === 'User' && this.currentUser?.userType !== 'Super Admin') {
      this.userObj.approver = this.currentUser?.id;
      this.approverList = [];
      return;
    }

    const payload: any = {
      userType: this.userObj.userType,
      sessionDTO: this.sessionObject
    };

    this.userService.getApproversByUserType(payload).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        const rawList = response.serviceResponse || [];
        // Secondary filter: ensure only Super Admins are in allApproverList
        this.allApproverList = rawList.filter((u: any) => u.userType === 'Super Admin' || !u.userType);
        if (this.isCreation) {
          this.userObj.approver = "Select";
          this.approverList = this.allApproverList.filter(
            (item: { id: any }) => !this.currentUser || item.id !== this.currentUser.id
          );
        }
      }
    });
  }

  getAllApprovers() {
    if (!this.currentUser) {
      return;
    }
    this.allApproverList = null;
    const payload: any = {
      id: this.currentUser.id,
      userId: this.currentUser.userId,
      sessionDTO: this.sessionObject
    };

    this.userService.getAllApprovers(payload).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        const rawList = response.serviceResponse || [];
        // Secondary filter: ensure only Super Admins are in allApproverList
        this.allApproverList = rawList.filter((u: any) => u.userType === 'Super Admin' || !u.userType);
        if (this.isCreation) {
          this.approverList = this.allApproverList.filter(
            (item: { id: any }) => !this.currentUser || item.id !== this.currentUser.id
          );
        }
      }
    });
  }

  loadUserTableData() {
    this.allActiveUsersList = null;
    if (!this.sessionObject.userId) {
      console.warn("No user ID found in session for fetching user list");
      return;
    }
    this.userService.getAllUserListByUserType(this.sessionObject).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus === "Success") {
        this.allActiveUsersList = response.serviceResponse;
        this.allActiveUsersList.forEach((user: any) => {
          const approver = this.allActiveUsersList.find((u: any) => u.id === user.approver);
          if (approver) {
            user.approverName = approver.fullName;
          }
        });
        this.filteredUsers = [...this.allActiveUsersList];
        this.updatePaginatedUsers();
      } else {
        this.allActiveUsersList = [];
        this.filteredUsers = [];
        this.updatePaginatedUsers();
      }
    }, (error) => {
      console.error("Error fetching users:", error);
      this.allActiveUsersList = [];
      this.filteredUsers = [];
      this.updatePaginatedUsers();
    });
  }

  getAllRoles() {
    console.log('💎 [DEBUG] Calling userService.getAllRoles NOW');
    console.trace('Tracing getAllRoles call source');
    this.userService.getAllRoles(this.sessionObject).pipe(first()).subscribe((response: any) => {
      console.log('💎 [DEBUG] Received response for getAllRoles:', response);
      if (response.serviceStatus == "Success") {
        this.allRolesList = (response.serviceResponse || []).map((r: any) => ({
          ...r,
          id: String(r.id)
        }));
      }
    });
  }

  createUser() {
    console.log(this.userObj);
    const regex = /^[a-zA-Z0-9._@-]*$/;

    if (this.userObj.userId == "" || this.userObj.userId == null) {
      Swal.fire('Validation Error', "Kindly provide your User ID !!", 'warning');
      return;
    }

    if (!regex.test(this.userObj.userId)) {
      Swal.fire('Validation Error', "UserID can be Alphanumeric and special characters( _ , @ , - , . ) are allowed !!", 'warning');
      return;
    }
    if (this.userObj.fullName == "" || this.userObj.fullName == null) {
      Swal.fire('Validation Error', "Kindly provide your User Name !!", 'warning');
      return;
    }

    if (this.userObj.mailId == "" || this.userObj.mailId == undefined) {
      Swal.fire('Validation Error', "Kindly provide your Email ID !!", 'warning');
      return;
    }
    if (!this.regexEmailLC.test(this.userObj.mailId)) {
      Swal.fire('Validation Error', "Kindly provide valid Email ID !!", 'warning');
      return;
    }

    if (this.userObj.mobileNo == "" || this.userObj.mobileNo == undefined) {
      Swal.fire('Validation Error', "Kindly provide valid mobile number !!", 'warning');
      return;
    }
    else if (!this.regexMobile.test(this.userObj.mobileNo)) {
      Swal.fire('Validation Error', "Kindly provide valid mobile number !!", 'warning');
      return;
    }

    if (this.userObj.authentication == "Select" || this.userObj.authentication == undefined || this.userObj.authentication == null) {
      Swal.fire('Validation Error', "Kindly provide Authentication !!", 'warning');
      return;
    }
    if (this.userObj.userType == "Select" || this.userObj.userType == undefined || this.userObj.userType == null) {
      Swal.fire('Validation Error', "Kindly provide UserType !!", 'warning');
      return;
    }
    if (this.currentUser?.userType !== 'Super Admin') {
      if (this.currentUser?.userType === 'Admin') {
        this.userObj.clientId = this.currentUser.clientId;
        console.log('✅ Admin creating user, inherited clientId:', this.userObj.clientId);
      }
      if (this.userObj.approver == "Select" || this.userObj.approver == undefined || this.userObj.approver == null) {
        Swal.fire('Validation Error', "Kindly provide Approver !!", 'warning');
        return;
      }
    } else {
      // Auto-assign Super Admin as approver
      this.userObj.approver = this.currentUser?.id;
    }

    if (this.currentUser?.userType === 'Super Admin') {
      if (this.userObj.clientId == undefined || this.userObj.clientId == null || this.userObj.clientId == "undefined") {
        Swal.fire('Validation Error', "Kindly provide Client !!", 'warning');
        return;
      }
    }

    // Role Handling
    this.proceedWithUserCreation();
  }




  proceedWithUserCreation() {
    // Existing Role Validation
    if (this.userObj.userType == "Super Admin") {
      this.userObj.role = "0";
    }
    else if (this.userObj.userType != "Super Admin" && (this.userObj.role == undefined || this.userObj.role == null || this.userObj.role == "Select" || this.userObj.role == "0")) {
      Swal.fire('Validation Error', "Kindly provide Role !!", 'warning');
      return;
    }

    this.userObj['createdBy'] = this.user.userId;
    this.userObj.sessionDTO = this.sessionObject;

    const payload = {
      ...this.userObj,
      clientId: this.userObj.clientId,
      role: Number(this.userObj.role)
    };
    console.log('🚀 Sending User Creation Payload:', payload);

    const safePayload = this.sanitizationService.sanitizePayload(payload);

    this.userService.createUser(safePayload).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        Swal.fire('Success', response.serviceResponse, 'success');
        this.userObj = new User();
        this.loadUserTableData();
        this.showForm();
      } else if (response.serviceError === 'LICENSE_LIMIT_EXCEEDED') {
        const licenseLabels: any = {
          FULLSTACK: 'Fullstack license limit exceeded',
          MODULES: 'Module license limit exceeded',
          NDU: 'NDU license limit exceeded',
          USERS: 'User license limit exceeded'
        };
        const violations: any[] = Array.isArray(response.serviceResponse) ? response.serviceResponse : [];
        const message = violations.map((v: any) =>
          `${licenseLabels[v.licenseType] || v.licenseType} (Remaining: ${v.remaining})`
        ).join('\n') || 'License limit exceeded';
        Swal.fire('License Error', message, 'error');
      } else {
        Swal.fire('Error', response.serviceResponse, 'error');
      }
    });
  }

  openUpdateUser(userUpdateObj: any) {
    this.isForm = true;
    this.isTable = false;
    this.isCreation = false;
    this.isUpdation = true;

    // Use Object.assign for robust mapping of all properties
    this.userObj = new User();
    Object.assign(this.userObj, userUpdateObj);

    console.log('📋 User Data for update:', userUpdateObj);

    // Map role ID for dropdown binding (select expects ID as string)
    if (userUpdateObj.roleId || userUpdateObj.roleName) {
      if (userUpdateObj.roleId) {
        this.userObj.role = String(userUpdateObj.roleId);
      } else if (userUpdateObj.roleName) {
        const matchingRole = this.allRolesList?.find((r: any) => r.roleName === userUpdateObj.roleName);
        this.userObj.role = matchingRole ? String(matchingRole.id) : "Select";
      }
    } else {
      this.userObj.role = "Select";
    }

    // Fix: Approver mapping (Need ID for dropdown)
    if (userUpdateObj.approver) {
      const isAlreadyId = !isNaN(Number(userUpdateObj.approver)) && String(userUpdateObj.approver).trim() !== "";

      if (isAlreadyId) {
        this.userObj.approver = userUpdateObj.approver;
      } else {
        // Find approver ID by name
        const searchName = String(userUpdateObj.approver).trim().toLowerCase();
        const searchLists = [this.allActiveUsersList, this.allApproverList, this.approverList];
        let approverUser = null;

        for (const list of searchLists) {
          if (!list || !Array.isArray(list)) continue;
          approverUser = list.find((u: any) =>
            (u.fullName && u.fullName.trim().toLowerCase() === searchName) ||
            (u.userId && u.userId.trim().toLowerCase() === searchName) ||
            (u.mailId && u.mailId.trim().toLowerCase() === searchName)
          );
          if (approverUser) break;
        }
        if (approverUser) {
          this.userObj.approver = approverUser.id;
        }
      }
    } else {
      this.userObj.approver = "Select";
    }

    this.approverValue = true;

    // Set defaults for missing metadata if needed (Object.assign should have covered them)
    if (!this.userObj.authentication) this.userObj.authentication = "Select";
    if (!this.userObj.userType) this.userObj.userType = "Select";

    // Normalize sessionLogout: null → "15" (default), number → string so <select> binding matches
    if (this.userObj.sessionLogout === null || this.userObj.sessionLogout === undefined) {
      this.userObj.sessionLogout = "15";
    } else {
      this.userObj.sessionLogout = String(this.userObj.sessionLogout);
    }

    // Set UI control states based on permissions
    const targetRoleName = (userUpdateObj.role && typeof userUpdateObj.role === 'object') ? (userUpdateObj.role.roleName?.toLowerCase() || '') : '';
    const targetUserType = userUpdateObj.userType || '';

    if (this.currentUser?.userType === 'Super Admin') {
      this.userStatus = false;
      this.isRoleEditable = true;
    } else if (this.currentUser?.userType === 'Admin') {
      this.userStatus = true;
      if (targetUserType === 'Admin' || targetRoleName.includes('admin') || targetRoleName.includes('useradmin')) {
        this.isRoleEditable = false;
      } else {
        this.isRoleEditable = true;
      }
    } else {
      this.userStatus = true;
      this.isRoleEditable = false;
    }

    // Ensure all roles are loaded for the dropdown
    this.getAllRoles();
  }

  updateUser() {
    console.log(this.userObj);
    const regex = /^[a-zA-Z0-9._@-]*$/;

    if (this.userObj.userId == "" || this.userObj.userId == null) {
      Swal.fire('Validation Error', "Kindly provide your User ID !!", 'warning');
      return;
    }

    if (!regex.test(this.userObj.userId)) {
      Swal.fire('Validation Error', "UserID can be Alphanumeric and special characters( _ , @ , - , . ) are allowed !!", 'warning');
      return;
    }

    if (this.userObj.fullName == "" || this.userObj.fullName == null) {
      Swal.fire('Validation Error', "Kindly provide your User Name !!", 'warning');
      return;
    }

    if (this.userObj.mailId == "" || this.userObj.mailId == undefined) {
      Swal.fire('Validation Error', "Kindly provide your Email ID !!", 'warning');
      return;
    }

    if (!this.regexEmailLC.test(this.userObj.mailId)) {
      Swal.fire('Validation Error', "Kindly provide valid Email ID !!", 'warning');
      return;
    }

    if (this.userObj.mobileNo == "" || this.userObj.mobileNo == undefined) {
      Swal.fire('Validation Error', "Kindly provide valid mobile number !!", 'warning');
      return;
    }
    else if (!this.regexMobile.test(this.userObj.mobileNo)) {
      Swal.fire('Validation Error', "Kindly provide valid mobile number !!", 'warning');
      return;
    }

    if (this.userObj.authentication == "Select" || this.userObj.authentication == undefined || this.userObj.authentication == null) {
      Swal.fire('Validation Error', "Kindly provide Authentication !!", 'warning');
      return;
    }
    if (this.userObj.userType == "Select" || this.userObj.userType == undefined || this.userObj.userType == null) {
      Swal.fire('Validation Error', "Kindly provide UserType !!", 'warning');
      return;
    }
    if (this.userObj.approver == "Select" || this.userObj.approver == undefined || this.userObj.approver == null) {
      Swal.fire('Validation Error', "Kindly provide Approver !!", 'warning');
      return;
    }

    if (this.currentUser?.userType === 'Super Admin') {
      if (this.userObj.clientId == undefined || this.userObj.clientId == null || this.userObj.clientId == "undefined") {
        Swal.fire('Validation Error', "Kindly provide Client !!", 'warning');
        return;
      }
    }

    // Fix: Only force role to '0' for Super Admin if NO role is selected
    if (this.userObj.userType === "Super Admin" && (this.userObj.role === "Select" || !this.userObj.role)) {
      this.userObj.role = "0";
    }
    else if (this.userObj.userType != "Super Admin" && (this.userObj.role == undefined || this.userObj.role == null || this.userObj.role == "Select" || this.userObj.role == "0")) {
      Swal.fire('Validation Error', "Kindly provide Role !!", 'warning');
      return;
    }
    else if (this.userObj.userType != "Super Admin") {
      this.userObj.preferredSubfeature = null;
      this.userObj['enablePreferredDashboard'] = false;
    }

    this.userObj['updatedByUsername'] = this.currentUser?.userId ?? this.user.userId;
    this.userObj.editedBy = this.currentUser?.userId ?? this.user.userId;
    this.userObj.sessionDTO = this.sessionObject;

    // Clean payload of read-only fields
    const payload = {
      ...this.userObj,
      id: this.userObj.id,
      clientId: this.userObj.clientId,
      role: Number(this.userObj.role)
    };
    console.log('🚀 Sending User Update Payload:', payload);
    delete (payload as any)['createdOn'];
    delete (payload as any)['createdByUsername'];
    delete payload.approverName;
    delete payload.updatedOn;
    delete payload.isActive;
    payload.multiRole = null;

    const safePayload = this.sanitizationService.sanitizePayload(payload);

    this.userService.updateUser(safePayload).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        Swal.fire('Success', response.serviceResponse, 'success');
        this.isCreation = false;
        this.isUpdation = false;
        this.userObj = new User();
        this.roleIDs = null;
        this.showTable();
      } else {
        Swal.fire('Error', response.serviceResponse, 'error');
      }
    });
  }

  deleteUser() {
    // Prepare payload with only required fields
    const deletePayload = {
      userId: this.userObj.userId,
      editedBy: this.currentUser?.userId ?? this.user.userId,
      sessionDTO: this.sessionObject
    };

    const safePayload = this.sanitizationService.sanitizePayload(deletePayload);

    this.userService.deleteUser(safePayload as any).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        this.cancelRequest();
        Swal.fire('Deleted', "User Deleted Successfully ...", 'success');
      }
      else {
        this.cancelRequest();
        Swal.fire('Error', response.serviceError, 'error');
      }
      this.loadUserTableData();
      this.cancelRequest();
      this.userObj = new User();
    });
  }


  toggleLockUser() {
    console.log('\ud83d\udd10 Toggling lock status for user:', this.userObj.userId);
    console.log('\ud83d\udd10 Current count:', this.userObj.count, 'Threshold:', this.userObj.actualLockCount);

    // Send only required fields to avoid type mismatch errors
    const payload = {
      userId: this.userObj.userId,
      id: this.userObj.id,
      sessionDTO: this.sessionObject
    };

    const safePayload = this.sanitizationService.sanitizePayload(payload);

    this.userService.toggleLockUser(safePayload).pipe(first()).subscribe((response: any) => {
      console.log('\ud83d\udd10 Toggle Lock API Response:', response);
      if (response.serviceStatus == "Success") {
        this.cancelRequest();
        Swal.fire('Success', response.serviceResponse, 'success');
      }
      else {
        this.cancelRequest();
        Swal.fire('Error', response.serviceError, 'error');
      }
      this.loadUserTableData();
      this.cancelRequest();
      this.userObj = new User();
    });
  }

  cancelRequest() {
    this.modalService.dismissAll();
  }


  openDeleteUser(template: TemplateRef<any>, user: any) {
    this.modalService.open(template, { size: 'lg', backdrop: 'static', centered: true });
    this.userObj = user;
  }

  openToggleLockUser(template: TemplateRef<any>, user: any) {
    this.userObj = user;
    this.modalService.open(template, { size: 'lg', backdrop: 'static', centered: true });
  }



  sortByCol(event: { currentTarget: any; }, property: string | number, tableData: any) {
    console.log(tableData)
    this.isDesc = !this.isDesc;
    this.column = property;
    let direction = this.isDesc ? 1 : -1;

    let target = event.currentTarget,
      classList = target.classList;

    if (classList.contains("fa-chevron-up")) {
      classList.remove("fa-chevron-up");
      classList.add("fa-chevron-down");

    } else {
      classList.add("fa-chevron-up");
      classList.remove("fa-chevron-down");

    }

    let dataArray = tableData;
    console.log(dataArray);
    dataArray.sort(function (a: { [x: string]: number; }, b: { [x: string]: number; }) {
      if (a[property] < b[property]) {
        return -1 * direction;
      }
      else if (a[property] > b[property]) {
        return 1 * direction;
      }
      else {
        return 0;
      }
    });
    return dataArray;
  };

  validateUserId(value: any) {
    if (!value) {
      return;
    }
    const regex = new RegExp(/[^\)/!%,(~`"%'{}:;><#\[\]]+/,);
    if (!regex.test(value)) {
      Swal.fire('Validation Error', "Only Alphanumeric and special characters(_ , @ , - , .,$,&,*,\\,+,-,=,?,^,|) allowed !!", 'warning');
    }
  }

  validateFullName(value: any) {
    // Validation removed to allow all characters in full name
  }

  validateMailId() {
    var expr = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/gm
    if (!expr.test(this.userObj.mailId)) {
      Swal.fire('Validation Error', "Enter Valid Mail ID", 'warning');
    }
  }

  validateEmail(email: string | undefined) {
    const re = this.regexEmailLC;
    if (email == "" || email == undefined) {
      return true;
    }
    else if (re.test(String(email))) {
      return true;
    }
    else {
      return false;
    }
  }

  validateMobileNum(mobileNo: string | undefined) {
    const re = this.regexMobile;
    if (mobileNo == "" || mobileNo == undefined) {
      return true;
    }
    else if (re.test(String(mobileNo))) {
      return true;
    }
    else {
      return false;
    }
  }

  search() {
    this.p = 1;
    if (!this.searchText) {
      this.filteredUsers = this.allActiveUsersList;
    } else {
      const lower = this.searchText.toLowerCase();
      this.filteredUsers = this.allActiveUsersList.filter((u: any) =>
        (u.userId && u.userId.toLowerCase().includes(lower)) ||
        (u.fullName && u.fullName.toLowerCase().includes(lower)) ||
        (u.mailId && u.mailId.toLowerCase().includes(lower)) ||
        (u.mobileNo && String(u.mobileNo).toLowerCase().includes(lower)) ||
        (u.roleName && u.roleName.toLowerCase().includes(lower)) ||
        (u.userType && u.userType.toLowerCase().includes(lower))
      );
    }
    this.updatePaginatedUsers();
  }

  pageChange($event: number) {
    this.p = $event;
  }

  checkUserStatus() {
    if (this.currentUser?.userType == "Super Admin") {
      this.userType = false;
      this.userType1 = false;
      this.userType2 = false;
    }
    if (this.currentUser?.userType == "Admin") {
      this.userType = true;
      this.userType1 = false;
      this.userType2 = false;
    }
    if (this.currentUser?.userType == "User") {
      this.userType = true;
      this.userType1 = true;
      this.userType2 = false;
    }
  }

  sortBy(value: string) {
    if (this.sortparam === value) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortDirection = 'asc';
      this.sortparam = value;
    }

    this.filteredUsers.sort((a: any, b: any) => {
      let valA = a[value];
      let valB = b[value];

      // Handle role property
      if (value === 'role' || value === 'roleName') {
        valA = a.roleName || (a.role ? a.role.roleName : '');
        valB = b.roleName || (b.role ? b.role.roleName : '');
      }

      // Handle case-insensitive string comparison
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      } else if (valA > valB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });

    this.updatePaginatedUsers();
  }

  exportAsXLSX(): void {
    this.userService.getAllUsers(this.sessionObject).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        console.log(response.serviceResponse);
        response.serviceResponse.unshift(this.displayedColumns);
        console.log(response.serviceResponse);
        this.excelService.exportAsExcelFile(response.serviceResponse, "sample");
      }
    });
  }

  omit_special_char_pwd(event: any) {
    var pattern = new RegExp(/[^\)/!%,(~`"%'{}:;><\[\]\s]+/,);
    var result = pattern.test(event.key);
    return (result);
  }

  omit_special_char(event: any) {
    var pattern = new RegExp(/[^\)/!%,(~`"%'{}:;><#\[\]]+/,);
    var result = pattern.test(event.key);
    if (!result) {
      Swal.fire('Validation Error', "Only Alphanumeric and special characters(...) allowed !!", 'warning');
    }
    return result;
  }

  omit_special_char_mail(event: any) {
    var pattern = new RegExp(/[^\)/!%(~`"'{}:;><#\[\]]+/,);
    var result = pattern.test(event.key);
    console.log("first" + result);
    return (result);
  }

  onPaste(event: ClipboardEvent) {
    let pastedText = event.clipboardData?.getData('text') ?? '';
    let count = 0;
    for (let i = 0; i < pastedText.length; i++) {
      let a = pastedText[i];
      var pattern = new RegExp(/[^\)/%,(~`"%'{}:;><#\[\]]+/,);
      var result = pattern.test(a);
      if (result) count++;
    }
    if (count !== pastedText.length) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  ngOnDestroy() {
    if (!this.browserRefresh) {
      sessionStorage.setItem("onPageExitTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));
      this.loggerService.logMyInfo(this.sessionObject, '/user');
    }
  }

}
