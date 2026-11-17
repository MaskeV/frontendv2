import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Session } from '../../../../models/session';
import { User } from '../../../../models/user';
import { Role } from '../../../../models/Role';
import { UserService } from '../../../../services/user.service';
import { first } from 'rxjs';
import { DecoderService } from '../../../../services/decoder.service';
import { Router } from '@angular/router';
import { LoggerService } from '../../../../services/logger.service';
import { UserTypeCrudMapObject } from '../../../../models/UserTypeCrudMapObject';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../services/sanitization.service';

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SanitizeInputDirective],
  templateUrl: './user-new.component.html',
  styleUrl: './user-new.component.css'
})
export class UserNewComponent implements OnInit {

  step = 1;
  userForm: FormGroup;
  sessionObject: Session = new Session();
  userObj: User = new User();
  roleObj: Role = new Role();
  allApproverList: any;
  approverList: any;
  isCreation: boolean = false;
  isUpdation: boolean = false;
  currentUser!: User;
  allActiveUsersList: any;
  allRolesList: any;
  regexEmailLC = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  regexMobile = /^[0-9]{10}$/;
  regex = /^[a-zA-Z0-9._@-]*$/;
  userType: any;
  userType1: any;
  userType2: any;
  status: any;
  user: User | null = null;
  userTypeCrudMap = new UserTypeCrudMapObject();
  showUsersTable = false;
  showForm = true;
  searchText = '';
  page = 1;
  pageSize = 8;
  totalPages = 0;
  pagedUsers: any[] = [];
  filteredUsers: any[] = [];
  showError = false;
  showSuccess = false;
  showUpdateSuccess = false;
  showDelete = false;
  isDeleting = false
  errorMessage = '';
  updateMessage = '';
  selectedUserToDelete!: User;
  deleteModalRef: any;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';


  constructor(private fb: FormBuilder, private userService: UserService, private decoderService: DecoderService, private router: Router, private loggerService: LoggerService, private modalService: NgbModal, private sanitizationService: SanitizationService) {
    this.userForm = this.fb.group({
      // Step 1
      userId: ['', Validators.required],
      userName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],

      // Step 2
      authentication: [{ value: 'RUAMBOT', disabled: true }, Validators.required],
      userType: ['', Validators.required],
      approver: ['', Validators.required],
      role: ['', Validators.required],
      timeout: ['', Validators.required]
    });
  }

  ngOnInit(): void {

    // Load current user FIRST
    const userStr = sessionStorage.getItem('currentUser');
    this.user = userStr
      ? this.decoderService.decryptJson(JSON.parse(userStr))
      : null;

    if (!this.user) {
      console.error("Current user missing from session");
      return;
    }

    this.currentUser = this.user;

    //Build session object exactly like old UI
    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config";
    this.sessionObject.configTab = "User";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    // Set flags
    this.isCreation = true;
    this.isUpdation = false;

    // Default values
    this.userObj.authentication = "Select";
    this.userObj.userType = "Select";
    this.userObj.approver = "Select";
    this.userObj.role = "Select";
    this.userObj.sessionLogout = "15";

    // Load CRUD mapping
    const crudMapStr = sessionStorage.getItem("userTypeCrudMapList");
    if (crudMapStr) {
      this.userTypeCrudMap = JSON.parse(crudMapStr).user;
    }

    //Load role & approver lists (NOW backend will work)
    this.getAllRoles();
    this.getAllApprovers();

    // Hook reactive UserType → old backend logic
    this.userForm.get('userType')!.valueChanges.subscribe(val => {
      this.userObj.userType = val;
      this.getApproversByUserType();
      if (val === 'Super Admin') {
        this.userForm.get('role')!.setValue('0');
        this.userForm.get('role')!.disable();
      } else {
        this.userForm.get('role')!.enable();
        this.userForm.get('role')!.setValue('');
      }
    });

    // Apply user-type restrictions
    this.checkUserStatus();
  }


  get f() {
    return this.userForm.controls;
  }

  // Step validation blocks
  goToPermissions() {
    this.mapFormToUserObj();
    if (!this.validateStep1()) return;
    this.step = 2;
  }

  private validateStep1(): boolean {
    // Temporarily blank step-2 fields so main validator ignores them
    const temp = {
      authentication: this.userObj.authentication,
      userType: this.userObj.userType,
      approver: this.userObj.approver,
      role: this.userObj.role,
      sessionLogout: this.userObj.sessionLogout
    };

    this.userObj.authentication = 'RUAMBOT';
    this.userObj.userType = 'TEMP';
    this.userObj.approver = 'TEMP';
    this.userObj.role = 'TEMP';
    this.userObj.sessionLogout = '15';

    const isValid = this.validateUserPayload();

    // Restore real values
    Object.assign(this.userObj, temp);

    return isValid;
  }


  goToReview() {
    this.mapFormToUserObj();
    if (!this.validateStep2()) return;
    this.step = 3;
  }

  private validateStep2(): boolean {
    // Force step-1 to be valid too
    if (!this.validateStep1()) return false;

    // Now validate full payload
    return this.validateUserPayload();
  }


  back() {
    this.step--;
  }

  getApproversByUserType() {
    this.allApproverList = null;
    this.userObj.role = "Select";

    const user = new User();
    user.userType = this.userObj.userType;
    user.sessionDTO = this.sessionObject;

    this.userService.getApproversByUserType(user).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus === "Success") {
        this.allApproverList = response.serviceResponse;

        this.approverList = this.allApproverList.filter(
          (x: any) => x.id !== this.currentUser.id
        );

        if (this.isCreation) {
          this.userForm.get('approver')!.setValue('');
        }
      }
    });
  }

  getAllApprovers() {
    this.allApproverList = null;

    this.currentUser.sessionDTO = this.sessionObject;   // 🔥 REQUIRED

    this.userService.getAllApprovers(this.currentUser).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        this.allApproverList = response.serviceResponse;

        // Exclude logged-in user
        this.approverList = this.allApproverList.filter(
          (x: any) => x.id !== this.currentUser.id
        );
      }
    });
  }


  getAllActiveUsers() {
    this.allActiveUsersList = null;
    this.userService.getAllUsers(this.sessionObject).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        this.allActiveUsersList = response.serviceResponse;
        this.allApproverList = response.serviceResponse;
        this.page = 1;
        this.applyFilterAndPagination();
        if (this.isUpdation) {
          for (let x of this.allActiveUsersList) {
            if (this.userObj.approver == x.id) {
              console.log(x.userId);
              this.userObj.approver = x.userId
              console.log(this.userObj.approver);
            }
          }
        }
      }

    });

  }

  getAllRoles() {
    this.userService.getAllRolesForUser(this.sessionObject).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus === "Success") {
        this.allRolesList = response.serviceResponse;
      }
    });
  }

  getRoleNameById(id: any): string {
    if (!id || !this.allRolesList) return '';
    const role = this.allRolesList.find((r: any) => r.id == id);
    return role ? role.roleName : '';
  }


  private mapFormToUserObj() {
    this.userObj.userId = this.f['userId'].value;
    this.userObj.fullName = this.f['userName'].value;
    this.userObj.mailId = this.f['email'].value;
    this.userObj.mobileNo = this.f['mobile'].value;
    this.userObj.authentication = 'RUAMBOT';
    this.userObj.userType = this.f['userType'].value;
    this.userObj.approver = this.f['approver'].value;
    this.userObj.role = this.f['role'].value;
    this.userObj.sessionLogout = this.f['timeout'].value;
    this.userObj.sessionDTO = this.sessionObject;
    this.userObj['createdBy'] = this.currentUser.userId;
  }

  checkUserStatus() {
    // this.userService.checkUserStatus(this.sessionObject).pipe(first()).subscribe((response: any) => {
    //   if (response.serviceStatus == "Success") {
    //     console.log(response.serviceResponse);
    //   }
    //   else {
    //     console.log(response.serviceResponse);

    //   }
    // });
    if (this.currentUser.userType == "Super Admin") {
      this.userType = false;
      this.userType1 = false;
      this.userType2 = false;

    }
    if (this.currentUser.userType == "Admin") {
      this.userType = true;
      this.userType1 = false;
      this.userType2 = false;
    }
    if (this.currentUser.userType == "User") {
      this.userType = true;
      this.userType1 = true;
      this.userType2 = false;

    }


  }

  private validateUserPayload(): boolean {
    const regex = /^[a-zA-Z0-9._@-]*$/;
    const regexFullName = /^[a-zA-Z][a-zA-Z ]*$/;

    if (!this.userObj.userId) {
      this.showErrorBanner("Kindly provide your User ID !!");
      return false;
    }

    if (!regex.test(this.userObj.userId)) {
      this.showErrorBanner("UserID can be Alphanumeric and special characters( _ , @ , - , . ) are allowed !!");
      return false;
    }

    if (!this.userObj.fullName) {
      this.showErrorBanner("Kindly provide your User Name !!");
      return false;
    }

    if (!regexFullName.test(this.userObj.fullName)) {
      this.showErrorBanner("User Name can contain Alphabets and Space only !!");
      return false;
    }

    // Email validation
    if (!this.userObj.mailId) {
      this.showErrorBanner("Kindly provide Email ID !!");
      return false;
    }

    const email = this.userObj.mailId.trim().toLowerCase();

    // Standard email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      this.showErrorBanner("Please enter a valid email address");
      return false;
    }

    // Mobile number validation
    if (!this.userObj.mobileNo) {
      this.showErrorBanner("Kindly provide mobile number !!");
      return false;
    }

    const mobile = this.userObj.mobileNo.toString().trim();

    // Must be exactly 10 digits
    if (!/^[0-9]{10}$/.test(mobile)) {
      this.showErrorBanner("Mobile number must be exactly 10 digits");
      return false;
    }

    // Must start with 9, 8, 7, or 6
    if (!/^[6-9]/.test(mobile)) {
      this.showErrorBanner("Mobile number must start with 9, 8, 7 or 6");
      return false;
    }

    if (!this.userObj.authentication) {
      this.showErrorBanner("Kindly provide Authentication !!");
      return false;
    }

    if (!this.userObj.userType) {
      this.showErrorBanner("Kindly provide UserType !!");
      return false;
    }

    if (!this.userObj.approver) {
      this.showErrorBanner("Kindly provide Approver !!");
      return false;
    }

    if (this.userObj.userType === "Super Admin") {
      this.userObj.role = "0";
    }
    else if (!this.userObj.role) {
      this.showErrorBanner("Kindly provide Role !!");
      return false;
    }

    return true;
  }

  createUser() {

    // Move reactive form values → old userObj
    this.mapFormToUserObj();

    // Run old validation logic
    if (!this.validateUserPayload()) {
      return;
    }

    const safePayload = this.sanitizationService.sanitizePayload(this.userObj);

    // Backend call (unchanged)
    this.userService.createUser(safePayload).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus === "Success") {
        this.showSuccessBanner(response.serviceResponse);
        this.userForm.reset();
        this.searchText = '';
        this.step = 1;
        this.getAllActiveUsers();
      } else {
        this.showErrorBanner(response.serviceResponse);
      }
    });
  }

  showUserTable() {
    this.searchText = '';
    this.showUsersTable = true;
    this.showForm = false;
    this.step = 1;
    this.page = 1;
    this.getAllActiveUsers();
  }

  // goToCreateForm() {
  //   this.showUsersTable = false;
  //   this.showForm = true;
  //   this.userForm.reset();
  //   this.userForm.get('userId')!.enable();
  //   this.step = 1;
  // }

  goToCreateForm() {
    this.showUsersTable = false;
    this.showForm = true;
    this.step = 1;

    this.userForm.reset({
      authentication: 'RUAMBOT'
    });

    this.userForm.get('authentication')!.disable();
    this.userForm.get('userId')!.enable();

    this.isCreation = true;
    this.isUpdation = false;
  }


  applyFilterAndPagination() {
    const term = this.searchText.toLowerCase().trim();

    let list = this.allActiveUsersList.filter((u: any) =>
      u.userId?.toLowerCase().includes(term) ||
      u.fullName?.toLowerCase().includes(term) ||
      u.mailId?.toLowerCase().includes(term) ||
      u.mobileNo?.includes(term) ||
      u.userType?.toLowerCase().includes(term)
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

    this.filteredUsers = list;

    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize) || 1;

    if (this.page > this.totalPages) {
      this.page = 1;
    }

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.pagedUsers = this.filteredUsers.slice(start, end);
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

  updateUserOld() {

    this.userObj['editedBy'] = this.currentUser.userId;
    this.userObj.sessionDTO = this.sessionObject;

    const safePayload = this.sanitizationService.sanitizePayload(this.userObj);

    this.userService.updateUser(safePayload)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus === "Success") {
          this.showUpdateBanner(response.serviceResponse);
          this.isUpdation = false;
          this.isCreation = true;

          this.userForm.enable();
          this.userForm.reset();
          this.step = 1;

          this.showUsersTable = true;
          this.showForm = false;
          this.searchText = '';
          this.getAllActiveUsers();
        } else {
          this.showErrorBanner(response.serviceResponse);
        }
      });
  }

  submitUser() {

    this.mapFormToUserObj();

    if (!this.validateUserPayload()) return;

    if (this.isUpdation) {
      this.updateUserOld();
    } else {
      this.createUser();
    }
  }

  openUpdateUserFromNewUI(u: any) {

    // Switch UI to form mode
    this.showUsersTable = false;
    this.showForm = true;
    this.searchText = '';
    this.isCreation = false;
    this.isUpdation = true;

    this.step = 1; // start from Basic Info

    // Load row into old userObj (exactly like legacy)
    this.userObj.id = u.id;
    this.userObj.userId = u.userId;
    this.userObj.fullName = u.fullName;
    this.userObj.mailId = u.mailId;
    this.userObj.mobileNo = u.mobileNo;
    this.userObj.authentication = u.authentication;
    this.userObj.userType = u.userType;
    this.userObj.role = u.role;
    this.userObj.sessionLogout = u.sessionLogout?.toString() || "15";
    this.userObj.approver = u.approver;

    // Patch reactive form (so UI reflects it)
    this.userForm.patchValue({
      userId: u.userId,
      userName: u.fullName,
      email: u.mailId,
      mobile: u.mobileNo,
      authentication: u.authentication || 'RUAMBOT',
      userType: u.userType,
      approver: u.approver,
      role: u.role,
      timeout: u.sessionLogout?.toString() || "15"
    });

    // Disable UserId during update (like old UI)
    this.userForm.get('userId')!.disable();
    this.userForm.get('authentication')!.disable();

    // Load approvers for this user type
    this.getApproversByUserType();
  }

  showErrorBanner(message: string) {
    this.errorMessage = message;
    this.showError = true;
    this.showSuccess = false;
    this.showUpdateSuccess = false;
    this.showDelete = false;

    setTimeout(() => {
      this.showError = false;
    }, 3000);
  }

  showSuccessBanner(message = 'User created successfully') {
    this.showSuccess = true;
    this.showError = false;
    this.showUpdateSuccess = false;
    this.showDelete = false;

    setTimeout(() => {
      this.showSuccess = false;
    }, 3000);
  }

  showUpdateBanner(message: string) {
    this.updateMessage = message;
    this.showUpdateSuccess = true;
    this.showSuccess = false;
    this.showError = false;
    this.showDelete = false;

    setTimeout(() => {
      this.showUpdateSuccess = false;
    }, 4000);
  }

  showDeleteBanner(message: string) {
    this.updateMessage = message;
    this.showDelete = true;
    this.showSuccess = false;
    this.showError = false;
    this.showUpdateSuccess = false;

    setTimeout(() => {
      this.showDelete = false;
    }, 3000);
  }

  openDeleteModal(template: any, user: User) {
    this.selectedUserToDelete = user;
    this.isDeleting = false;
    this.searchText = '';
    this.deleteModalRef = this.modalService.open(template, {
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }

  confirmDelete(modal: any) {
    if (!this.selectedUserToDelete) return;

    this.isDeleting = true;

    this.userObj = this.selectedUserToDelete;
    this.userObj['editedBy'] = this.currentUser.userId;
    this.userObj.sessionDTO = this.sessionObject;

    const safePayload = this.sanitizationService.sanitizePayload(this.userObj);

    this.userService.deleteUser(safePayload)
      .pipe(first())
      .subscribe((response: any) => {
        this.isDeleting = false;
        modal.close();
        if (response.serviceStatus === "Success") {
          this.searchText = '';
          this.showDeleteBanner("User deleted successfully");
          this.getAllActiveUsers();
        } else {
          this.showErrorBanner(response.serviceError || "Delete failed");
        }
        this.userObj = new User();
        this.selectedUserToDelete = undefined as any;
      });
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



}
