import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SubFeatureMaster } from '../../../../models/subFeatureMaster';
import { Session } from '../../../../models/session';
import { SubFeature, User } from '../../../../models/user';
import { FeatureService } from '../../../../services/feature-services.service';
import { DecoderService } from '../../../../services/decoder.service';
import { Router } from '@angular/router';
import { LoggerService } from '../../../../services/logger.service';
import { Feature } from '../../../../models/feature';
import { ApplicationService } from '../../../../services/application.service';
import { first, from, switchMap } from 'rxjs';
import { FeatureMaster } from '../../../../models/feature-master';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../../../environments/environment';


@Component({
  selector: 'app-features',
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './features.component.html',
  styleUrl: './features.component.css'
})
export class FeaturesComponent {

  form = {
    featureType: 'Component',
    applicationName: '',
    featureName: '',
    subFeatureName: '',
    displayType: 'color',
    color: '#ff4fd8',
    image: ''
  };

  subFeatures: SubFeatureMaster[] = [
    this.createEmptySubFeature()
  ];
  applicationList: any;
  sessionObject: Session = new Session();
  currentUser!: User;
  featureObj: Feature = new Feature();
  subFeature: SubFeatureMaster = new SubFeatureMaster();
  updatefeatureObj: SubFeatureMaster = new SubFeatureMaster();
  subFeatureNameRegex = /^[A-Za-z0-9_()\s-]*$/;
  routeRegex = /^[a-zA-Z0-9-]*$/;
  regex_imageUrl = /.*\S.*/;
  showSuccess = false;
  showDelete = false;
  showError = false;
  errorMessage = '';
  subFeatureList: SubFeatureMaster[] = [this.subFeature];
  selectedApplicationId!: any;
  viewAllFeatureList: any;
  allFeatureList: any;
  roleFeatureArray: FeatureMaster[] = [];
  showFeaturesTable = false;
  showFeatureForm = true;
  filteredFeatureList: any[] = [];
  pagedFeatureList: any[] = [];
  selectedFeature: any = null;
  searchText: string = '';
  page = 1;
  pageSize = 10;
  totalPages = 1;
  showCloneForm = false;
  cloneSourceSubFeature: any = null;
  cloneTargetApplication: any = null;
  cloneSubFeatureName: string = '';
  cloneGraphs: number[] = [];
  clonesubFeatureList: any
  graphList: any[] = [];
  subFeaturesByFeatureName: any[] = [];
  check: 'APP' | 'PRODUCT' | '' = '';
  isSubFeatureLoading = false;
  subFeatureSearchText: string = '';
  filteredSubFeatures: any[] = [];
  pagedSubFeatures: any[] = [];
  subFeaturePage = 1;
  subFeaturePageSize = 5;
  subFeatureTotalPages = 1;
  isEditMode = false;
  editFeatureId: any = null;
  showUpdateSuccess = false;
  updateMessage = '';
  deleteSubFeatureObj!: SubFeatureMaster;
  isDeleting = false;


  canCreate: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;

  constructor(/*  */
    private featureService: FeatureService,
    private decoderService: DecoderService,
    private router: Router,
    private loggerService: LoggerService,
    private applicationService: ApplicationService,
    private modalService: NgbModal,
  ) { }

  ngOnInit(): void {
    // this.browserRefresh = browserRefresh;
    // if(!this.browserRefresh){
    // sessionStorage.setItem("onPageNavigateTime", moment(new Date()).format("DD-MM-YYYY HH:mm:ss"));	
    // }
    // this.isCardBody = true;
    // this.isCreateForm = true;
    // this.currentUser = <User>(JSON.parse(sessionStorage.getItem('currentUser')));
    const storedUser = sessionStorage.getItem('currentUser');

    if (!storedUser) {
      throw new Error('Current user not found in session');
    }
    this.currentUser = this.decoderService.decryptJson(
      JSON.parse(storedUser)
    ) as User;
    // ---- CRUD PERMISSIONS ----
    const featureMapping = (this.currentUser as any)?.['crudData']?.['Admin-Config']?.['feature'];
    if (featureMapping) {
      this.canCreate = featureMapping.create === 'true';
      this.canEdit = featureMapping.edit === 'true';
      this.canDelete = featureMapping.delete === 'true';
    }

    // console.log('[Feature] User:', this.currentUser.userId, '| Permissions → Create:', this.canCreate, '| Edit:', this.canEdit, '| Delete:', this.canDelete);

    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config"
    this.sessionObject.configTab = "Feature"
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    // this.sessionObject.apiCalled = sessionStorage.getItem('apiCalled');
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');

    // Default Select
    this.featureObj.featureType = "Select";
    this.featureObj.applicationId = null;
    this.featureObj.featureName = "Select";
    this.subFeature.bgType = "color";
    // this.subFeature.bgColor = '#808080';
    // $(".spinner-border").show();

    if (this.currentUser.userType == 'Super Admin' || this.currentUser.userType == 'Admin') {
      this.getApplicationByUserId();
    }


  }


  onImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.form.image = reader.result as string;
      this.form.displayType = 'image';
    };
    reader.readAsDataURL(file);
  }

  createEmptySubFeature(): SubFeatureMaster {
    const sf = new SubFeatureMaster();
    sf.subFeatureName = '';
    sf.bgType = 'color';
    sf.bgColor = '#808080';
    sf.bgImageType = 'image-url'; // DEFAULT like old UI
    sf.bgURL = null;
    sf.image = null;
    sf.imageFileName = null;
    sf.hideTimepicker = 'No';
    return sf;
  }


  addSubFeature() {
    this.subFeatures.push(this.createEmptySubFeature());
  }

  removeSubFeature(index: number) {
    this.subFeatures.splice(index, 1);
  }

  async createFeature() {

    if (!this.validateBeforeCreate()) {
      return;
    }

    const sanitizedSubFeatures = this.subFeatures.map(sf => {
      const copy = { ...sf };

      // backend NEVER expects this in create API
      delete copy.image;

      return copy;
    });


    const payload = {
      sessionDTO: this.sessionObject,          // same as old
      featureType: 'APP',                      // or from form
      applicationId: this.selectedApplicationId,
      featureName: 'Dashboard',
      createdBy: this.currentUser.id,
      routeName: '',
      subFeatures: sanitizedSubFeatures
    };

    // 🔁 Upload images first (old behavior)
    for (let i = 0; i < this.subFeatures.length; i++) {
      const sf = this.subFeatures[i];

      if (sf.bgType === 'image' && sf.bgImageType === 'image-file') {
        await this.uploadImage(i, sf.image);
      }
    }

    this.featureService
      .createFeature(payload as Feature)
      .pipe(first())
      .subscribe({
        next: (response: any) => {
          if (response.serviceStatus === 'Success') {
            this.showSuccessBanner(response.serviceResponse);
          } else {
            this.showErrorBanner(response.serviceResponse);
          }
        },
        error: (err) => {
          console.error(err);
        }
      });

  }

  onSubFeatureImageUpload(event: Event, index: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.subFeatures[index].image = file;
    this.subFeatures[index].imageFileName = file.name;
    this.subFeatures[index].bgImageType = 'image-file';
    this.subFeatures[index].bgURL = file.name; // 🔥 REQUIRED by backend
  }

  onBgTypeChange(index: number, type: 'color' | 'image') {
    const sf = this.subFeatures[index];
    sf.bgType = type;

    if (type === 'color') {
      // Preserve color (old behavior)
      sf.bgImageType = null;
      sf.bgURL = null;
      sf.image = null;
      sf.imageFileName = null;
    }

    if (type === 'image') {
      sf.bgImageType = sf.bgImageType || 'image-url';
    }
  }

  onImageTypeChange(index: number) {
    const sf = this.subFeatures[index];

    sf.bgURL = null;
    sf.image = null;
    sf.imageFileName = null;
  }

  getApplicationByUserId() {
    // let userId = this.currentUser.userId;
    this.currentUser.sessionDTO = this.sessionObject;
    this.applicationService.getAllApplicationsByUserID(this.currentUser).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.applicationList = response.serviceResponse;
        this.applicationList.sort(function (a: { applicationName: string; }, b: { applicationName: string; }) {
          return a.applicationName.toLowerCase().localeCompare(b.applicationName.toLowerCase());
        });

      }
    });
  }

  uploadImage(i: number, image: File) {
    const sf = this.subFeatures[i];

    if (!sf || !image) return;

    sf.bgURL = sf.imageFileName;

    const formData = new FormData();
    formData.append('image', image);

    this.featureService
      .uploadImage(this.sessionObject, formData)
      .pipe(first())
      .subscribe({
        next: (response: any) => {
          if (response.serviceStatus === 'Success') {
            console.log('Image uploaded:', response.serviceResponse);
          }
        },
        error: err => console.error(err)
      });
  }


  getPreviewStyle(sf: SubFeatureMaster) {
    if (sf.bgType === 'color') {
      return {
        backgroundColor: sf.bgColor
      };
    }

    if (sf.bgType === 'image' && sf.bgImageType === 'image-url' && sf.bgURL) {
      return {
        backgroundImage: `url(${sf.bgURL})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain'
      };
    }

    if (sf.bgType === 'image' && sf.bgImageType === 'image-file') {

      //CREATE MODE (new upload)
      if (sf.image) {
        return {
          backgroundImage: `url(${URL.createObjectURL(sf.image)})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain'
        };
      }

      //  EDIT MODE (existing image)
      if (sf.bgURL) {
        return {
          backgroundImage: `url(${sf.bgURL})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain'
        };
      }
    }


    return {};
  }

  showErrorBanner(message: string) {
    this.errorMessage = message;
    this.showError = true;
    this.showSuccess = false;

    setTimeout(() => {
      this.showError = false;
    }, 3000);
  }

  showSuccessBanner(message = 'Sub Feature created successfully') {
    this.showSuccess = true;
    this.showError = false;

    setTimeout(() => {
      this.showSuccess = false;
    }, 3000);
  }

  showDeleteBanner(message = 'Sub Feature deleted successfully') {
    this.showDelete = true;
    this.showError = false;

    setTimeout(() => {
      this.showDelete = false;
    }, 3000);
  }

  validateBeforeCreate(): boolean {

    // 2️⃣ Application name required
    if (
      this.selectedApplicationId === undefined ||
      this.selectedApplicationId === null ||
      this.selectedApplicationId === 'Select'
    ) {
      this.showErrorBanner('Please select an Application');
      return false;
    }


    if (!this.subFeatures.length) {
      this.showErrorBanner('At least one Sub-Feature is required');
      return false;
    }

    const names = new Set<string>();

    for (let i = 0; i < this.subFeatures.length; i++) {
      const sf = this.subFeatures[i];

      // 2️⃣ Sub-feature name required
      if (!sf.subFeatureName || !sf.subFeatureName.trim()) {
        this.showErrorBanner(`Sub-Feature ${i + 1} name is required`);
        return false;
      }

      // 1️⃣ Regex: sub-feature name
      if (!this.subFeatureNameRegex.test(sf.subFeatureName)) {
        this.showErrorBanner(
          'Sub-Feature name can contain only alphanumeric, space, hyphen, underscore & ()'
        );
        return false;
      }

      // 4️⃣ Duplicate sub-feature name
      const key = sf.subFeatureName.trim().toLowerCase();
      if (names.has(key)) {
        this.showErrorBanner('Duplicate Sub-Feature names are not allowed');
        return false;
      }
      names.add(key);

      // 3️⃣ Image validations
      if (sf.bgType === 'image') {

        if (!sf.bgImageType) {
          this.showErrorBanner(`Select image source for Sub-Feature ${i + 1}`);
          return false;
        }

        if (sf.bgImageType === 'image-url') {
          if (!sf.bgURL || sf.bgURL.startsWith('data:image')) {
            this.showErrorBanner(
              `Only image URL is allowed for Sub-Feature ${i + 1}`
            );
            return false;
          }
        }


        if (sf.bgImageType === 'image-file') {
          if (!sf.image) {
            this.showErrorBanner(`Image file required for Sub-Feature ${i + 1}`);
            return false;
          }
        }
      }
    }

    return true;
  }

  canAddSubFeature(): boolean {
    if (!this.subFeatures.length) return true;

    const last = this.subFeatures[this.subFeatures.length - 1];

    if (last.bgType === 'image') {
      if (last.bgImageType === 'image-url') {
        return !!last.bgURL;
      }
      if (last.bgImageType === 'image-file') {
        return !!last.image;
      }
    }

    return true;
  }

  getAllFeatures() {
    this.featureService
      .getAllFeatures(this.sessionObject)
      .pipe(switchMap(data => from(this.decoderService.decodeObject(data))))
      .subscribe((response: any) => {
        if (response.serviceStatus === 'Success') {
          this.allFeatureList = response.serviceResponse || [];
          this.filteredFeatureList = [...this.allFeatureList];
          this.page = 1;
          this.updatePagination();
        }
      });
  }


  getAllFeaturesByRole() {
    this.roleFeatureArray = (this.currentUser.subFeatures ?? []).map((sf: SubFeature) => ({
      ...sf,
      sessionDTO: this.sessionObject
    })) as unknown as FeatureMaster[];
    for (let x of this.roleFeatureArray) {
      x.sessionDTO = this.sessionObject;
    }
    this.featureService
      .getAllFeaturesByRole(this.roleFeatureArray)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus === 'Success') {
          this.allFeatureList = response.serviceResponse || [];
          this.filteredFeatureList = [...this.allFeatureList];
          this.page = 1;
          this.updatePagination();
        }
      });
  }

  toggleFeatureTable() {
    this.showFeaturesTable = true;
    this.showFeatureForm = false;
    this.showCloneForm = false;
    this.isEditMode = false;
    if (this.showFeaturesTable) {
      this.loadFeatures();
    }
  }

  loadFeatures() {
    if (this.currentUser.userType === 'Super Admin') {
      this.getAllFeatures();
    } else if (this.currentUser.userType === 'Admin') {
      this.getAllFeaturesByRole();
    }
  }

  updatePagination() {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.pagedFeatureList = this.filteredFeatureList.slice(start, end);
    this.totalPages = Math.ceil(this.filteredFeatureList.length / this.pageSize);
  }

  openSubFeatureModal(feature: any, modal: any) {
    this.selectedFeature = feature;
    this.fetchSubFeatures(feature);
    this.modalService.open(modal, { size: 'lg', centered: true });
  }

  editSubFeature(sf: any) {
    console.log('Edit sub-feature', sf);
    // reuse your existing edit flow
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

  onSearch(): void {
    const value = this.searchText.trim().toLowerCase();

    if (!value) {
      // reset
      this.filteredFeatureList = [...this.allFeatureList];
    } else {
      this.filteredFeatureList = this.allFeatureList.filter((feature: { featureName: string; featureType: string; }) =>
        feature.featureName?.toLowerCase().includes(value) ||
        feature.featureType?.toLowerCase().includes(value)
      );
    }

    // reset pagination
    this.page = 1;
    this.updatePagination();
  }

  openCloneForm() {
    this.showCloneForm = true;
    this.showFeaturesTable = false;
    this.showFeatureForm = true;
    this.cloneSourceSubFeature = null;
    this.cloneTargetApplication = null;
    this.cloneSubFeatureName = '';
    this.cloneGraphs = [];
    this.clonesubFeatureList = [];
    this.graphList = [];

  }


  getSubfeatureNameFromAppId(applicationId: any) {
    this.featureObj.id = "Select";
    let fm = new FeatureMaster();
    fm.applicationId = applicationId;
    fm.sessionDTO = this.sessionObject;
    this.featureService.getSubfeatureNameFromAppId(fm).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.clonesubFeatureList = response.serviceResponse;
        console.log(this.clonesubFeatureList);
      }
    });
  }

  getgraphNameFromAppIdandsubfeatureid(id: any, applicationId: any,) {
    this.featureObj.id = id;
    this.featureObj.applicationId = applicationId;
    this.featureObj.sessionDTO = this.sessionObject;
    this.featureService.getgraphNameFromAppIdandsubfeatureid(this.featureObj).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.graphList = response.serviceResponse;
        console.log(this.graphList, "graph list");
      }
    });
  }

  onGraphToggle(graphId: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      if (!this.cloneGraphs.includes(graphId)) {
        this.cloneGraphs.push(graphId);
      }
    } else {
      this.cloneGraphs = this.cloneGraphs.filter(id => id !== graphId);
    }

    console.log('Selected graphs:', this.cloneGraphs);
  }

  cloneFeature() {

    // VALIDATIONS (same as old code, modernized)
    if (!this.selectedApplicationId || this.selectedApplicationId === 'Select') {
      this.showErrorBanner('Kindly select Application !!');
      return;
    }

    if (!this.cloneSourceSubFeature || this.cloneSourceSubFeature === 'Select') {
      this.showErrorBanner('Kindly select subFeature !!');
      return;
    }

    if (!this.cloneTargetApplication || this.cloneTargetApplication === 'Select') {
      this.showErrorBanner('Kindly select Clone Application !!');
      return;
    }

    if (!this.cloneSubFeatureName || !this.cloneSubFeatureName.trim()) {
      this.showErrorBanner('Kindly add Clone Sub Feature Name !!');
      return;
    }

    if (!this.cloneGraphs || !this.cloneGraphs.length) {
      this.showErrorBanner('Kindly select Clone graph(s) !!');
      return;
    }

    // BUILD BACKEND PAYLOAD (EXACT OLD CONTRACT)
    this.featureObj.applicationId = this.selectedApplicationId;
    this.featureObj.id = this.cloneSourceSubFeature;
    this.featureObj.applicationCloneid = this.cloneTargetApplication;
    this.featureObj.subFeaturesClone = this.cloneSubFeatureName;
    this.featureObj.nodeGraphId = [...this.cloneGraphs]; // IMPORTANT
    this.featureObj.createdBy = this.currentUser.id;
    this.featureObj.sessionDTO = this.sessionObject;

    //  CALL OLD API
    this.featureService
      .createClone(this.featureObj)
      .pipe(first())
      .subscribe({
        next: (response: any) => {
          if (response.serviceStatus === 'Success') {
            this.showSuccessBanner(response.serviceResponse);
            this.resetCloneForm();
          } else {
            this.showErrorBanner(response.serviceResponse);
          }
        },
        error: () => {
          this.showErrorBanner('Clone failed. Please try again.');
        }
      });
  }

  resetCloneForm() {
    this.showCloneForm = false;
    this.cloneSourceSubFeature = null;
    this.cloneTargetApplication = null;
    this.cloneSubFeatureName = '';
    this.cloneGraphs = [];
    this.clonesubFeatureList = [];
    this.graphList = [];
  }

  fetchSubFeatures(feature: any) {
    this.check = feature.featureType;
    this.isSubFeatureLoading = true;
    this.subFeaturesByFeatureName = [];

    const featureReq = new Feature();
    featureReq.sessionDTO = this.sessionObject;
    featureReq.featureName = feature.featureName;

    // SUPER ADMIN
    if (this.currentUser.userType === 'Super Admin') {
      this.featureService.getSubFeature(featureReq)
        .pipe(first())
        .subscribe((response: any) => {
          if (response.serviceStatus === 'Success') {
            this.subFeaturesByFeatureName = response.serviceResponse || [];
            this.filteredSubFeatures = [...this.subFeaturesByFeatureName];
            this.subFeaturePage = 1;
            this.updateSubFeaturePagination();
          }
          this.isSubFeatureLoading = false;
        });
    }

    // ADMIN
    else {
      const roleReq: any = {
        id: this.currentUser['userRole']?.[0]?.roleId,
        featureId: feature.id,
        sessionDTO: this.sessionObject
      };

      this.featureService
        .getSubFeaturesByRoleIdAndFeatureId(roleReq)
        .pipe(first())
        .subscribe((response: any) => {
          if (response.serviceStatus === 'Success') {
            this.subFeaturesByFeatureName = response.serviceResponse || [];
          }
          this.isSubFeatureLoading = false;
        });
    }
  }

  updateSubFeaturePagination() {
    const start = (this.subFeaturePage - 1) * this.subFeaturePageSize;
    const end = start + this.subFeaturePageSize;

    this.pagedSubFeatures = this.filteredSubFeatures.slice(start, end);
    this.subFeatureTotalPages = Math.ceil(
      this.filteredSubFeatures.length / this.subFeaturePageSize
    );
  }

  nextSubFeaturePage() {
    if (this.subFeaturePage < this.subFeatureTotalPages) {
      this.subFeaturePage++;
      this.updateSubFeaturePagination();
    }
  }

  prevSubFeaturePage() {
    if (this.subFeaturePage > 1) {
      this.subFeaturePage--;
      this.updateSubFeaturePagination();
    }
  }

  onSubFeatureSearch() {
    const value = this.subFeatureSearchText.trim().toLowerCase();

    if (!value) {
      this.filteredSubFeatures = [...this.subFeaturesByFeatureName];
    } else {
      this.filteredSubFeatures = this.subFeaturesByFeatureName.filter(sf =>
        sf.subFeatureName?.toLowerCase().includes(value) ||
        sf.createdByName?.toLowerCase().includes(value)
      );
    }

    this.subFeaturePage = 1;
    this.updateSubFeaturePagination();
  }

  backFromClone() {
    this.resetCloneForm(); // already exists
    this.showFeatureForm = true;
  }


  onEditSubFeature(subFeature: SubFeatureMaster, modal: any) {
    modal.dismiss();

    this.isEditMode = true;
    this.showFeaturesTable = false;
    this.showCloneForm = false;
    this.showFeatureForm = true;

    this.updatefeatureObj = JSON.parse(JSON.stringify(subFeature));
    this.selectedApplicationId = subFeature.applicationId;
    this.check = subFeature.featureType;

    const cloned = new SubFeatureMaster();
    Object.assign(cloned, subFeature);

    // Clear image/file references for edit mode
    cloned.image = null;
    cloned.imageFileName = null;

    if (cloned.bgType === 'image' && cloned.bgImageType === 'image-file') {
      // For image-file, convert to server URL
      cloned.imageFileName = cloned.bgURL;
      cloned.bgURL = this.getServerImageUrl(cloned.bgURL);
    }

    // For image-url, bgURL stays as-is from backend

    this.subFeatures = [cloned];
  }


  updateFeature() {

    if (!this.validateBeforeUpdate()) return;

    const ui = this.subFeatures[0];          // what user edited
    const backend = this.updatefeatureObj;  // what server expects

    // Copy UI → backend object
    backend.subFeatureName = ui.subFeatureName;
    backend.routeName = ui.routeName;
    backend.bgType = ui.bgType;
    backend.bgImageType = ui.bgImageType;
    backend.bgColor = ui.bgColor;
    backend.hideTimepicker = ui.hideTimepicker;
    backend.featureType = this.check;
    backend.applicationId = this.selectedApplicationId;

    if (ui.bgType === 'image') {
      if (ui.bgImageType === 'image-url') {
        backend.bgURL = ui.bgURL;          // real URL
      }

      if (ui.bgImageType === 'image-file') {
        // if user uploaded new file
        if (ui.image) {
          backend.bgURL = ui.imageFileName; // same as old screen
          this.uploadImage(0, ui.image);
        }
        // else keep existing backend.bgURL (old image)
      }
    } else {
      backend.bgURL = null;
      backend.bgImageType = null;
    }

    // attach session (old screen)
    this.sessionObject.applicationName = backend.applicationName;
    backend.sessionDTO = this.sessionObject;

    console.log('FINAL UPDATE PAYLOAD', backend);

    this.featureService.updateFeature(backend).pipe(first()).subscribe({
      next: (res: any) => {
        if (res.serviceStatus === 'Success') {
          this.showUpdateBanner(res.serviceResponse);
          this.resetEditMode();
          this.toggleFeatureTable();
        } else {
          this.showErrorBanner(res.serviceResponse);
        }
      },
      error: () => this.showErrorBanner('Update failed')
    });
  }

  resetEditMode() {
    this.isEditMode = false;
    this.editFeatureId = null;
    this.subFeatures = [this.createEmptySubFeature()];
  }

  getServerImageUrl(fileName: string): string {
    return `/feature/images/${fileName}`;
  }

  validateBeforeUpdate(): boolean {

    const sf = this.subFeatures[0];

    if (!sf.subFeatureName) {
      this.showErrorBanner('Kindly add Sub-Feature!!');
      return false;
    }

    if (!this.subFeatureNameRegex.test(sf.subFeatureName)) {
      this.showErrorBanner('Sub Feature can only be AlphaNumeric,Hyphen,Underscore,Space & Round bracket are allowed');
      return false;
    }

    if (this.check === 'PRODUCT') {
      if (!sf.routeName) {
        this.showErrorBanner('Kindly add Route Name!!');
        return false;
      }
      if (!this.routeRegex.test(sf.routeName)) {
        this.showErrorBanner('Route name can be Alphanumeric and hyphen only !!');
        return false;
      }
    }

    if (sf.bgType === 'color') {
      if (!sf.bgColor) {
        this.showErrorBanner('Kindly Select background Color!!');
        return false;
      }
    }

    if (sf.bgType === 'image') {
      if (!sf.bgImageType) {
        this.showErrorBanner('Kindly select background image type!!');
        return false;
      }

      if (sf.bgImageType === 'image-url') {
        if (!sf.bgURL || !this.regex_imageUrl.test(sf.bgURL)) {
          this.showErrorBanner('Kindly add Valid Image URL!!');
          return false;
        }
      }

      if (sf.bgImageType === 'image-file') {
        if (!sf.image && !this.updatefeatureObj.bgURL) {
          this.showErrorBanner('Kindly add Image!!');
          return false;
        }
      }
    }

    return true;
  }


  showUpdateBanner(message: string) {
    this.updateMessage = message;
    this.showUpdateSuccess = true;
    this.showSuccess = false;
    this.showError = false;

    setTimeout(() => {
      this.showUpdateSuccess = false;
    }, 4000);
  }

  goToCreateFeature() {
    this.showFeaturesTable = false;
    this.showFeatureForm = true;
    this.showCloneForm = false;
    this.isEditMode = false;

    // Reset everything to create mode
    this.selectedFeature = null;
    this.updatefeatureObj = new SubFeatureMaster();
    this.subFeatures = [this.createEmptySubFeature()];
    this.selectedApplicationId = null;
  }

  openDeleteConfirm(sf: SubFeatureMaster, template: TemplateRef<any>) {
    this.deleteSubFeatureObj = sf;
    this.modalService.open(template, { centered: true, backdrop: 'static' });
  }

  deleteSubFeature(template: TemplateRef<any>) {
    this.isDeleting = true;

    // attach session (OLD CONTRACT)
    this.deleteSubFeatureObj.sessionDTO = this.sessionObject;

    this.featureService
      .deleteSubFeature(this.deleteSubFeatureObj)
      .pipe(first())
      .subscribe({
        next: (response: any) => {
          this.isDeleting = false;

          if (response.serviceStatus === 'Success') {

            // remove from UI list like your old showObj splice
            this.subFeaturesByFeatureName = this.subFeaturesByFeatureName.filter(
              sf => sf.id !== this.deleteSubFeatureObj.id
            );

            this.filteredSubFeatures = [...this.subFeaturesByFeatureName];
            this.updateSubFeaturePagination();

            this.modalService.dismissAll();

            this.showDeleteBanner(response.serviceResponse);
          }
          else {
            this.showErrorBanner(response.serviceResponse);
          }
        },
        error: () => {
          this.isDeleting = false;
          this.showErrorBanner('Delete failed. Please try again.');
        }
      });
  }

  confirmDelete(template: TemplateRef<any>) {
    this.deleteSubFeature(template);
  }


}
