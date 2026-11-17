import { CommonModule } from '@angular/common';
import { Component, TemplateRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { datasourceDetails } from '../../../../models/datasource';
import moment from 'moment';
import { SessionService } from '../../../../services/session.service';
import { DecoderService } from '../../../../services/decoder.service';
import { DatasourceService } from '../../../../services/datasource.service';
import { LoggerService } from '../../../../services/logger.service';
import { Router } from '@angular/router';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { first } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-datasource',
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './datasource.component.html',
    styleUrl: './datasource.component.css'
})
export class DatasourceComponent {

  showError = false;
  showSuccess = false;
  showUpdateSuccess = false;
  errorMessage = '';
  successMessage = '';
  updateMessage = '';
  showDelete = false;
  deleteMessage = '';
  isForm: boolean = false;
  isUpdation: boolean = false;
  isCreation: boolean = false;
  isTable: boolean = false;
  datasourceObj: datasourceDetails = new datasourceDetails();
  updateDatasourceObject: any;
  deleteDatasourceObj: datasourceDetails = new datasourceDetails();
  isDatasourceAuthEnabled: boolean = false;
  isCAcertificate: boolean = false;
  fieldTextType: boolean = false;
  currentUser!: User;
  sessionObject: Session = new Session();
  searchText: string = '';
  page: number = 1;
  pageSize: number = 5;
  totalPages: number = 0;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  allDatasourceList: any;
  filteredDatasourceList: any[] = [];
  pagedDatasourceList: any[] = [];
  isDeleting: boolean = false;
  selectedDatasource: any = null;



  constructor(private sessionService: SessionService, private decoderService: DecoderService, private modalService: NgbModal,
    private datasourceService: DatasourceService, private loggerService: LoggerService, private router: Router) { }


  ngOnInit(): void {

    sessionStorage.setItem(
      "onPageNavigateTime",
      moment(new Date()).format("DD-MM-YYYY HH:mm:ss")
    );

    const userData = sessionStorage.getItem('currentUser');

    if (!userData) {
      throw new Error('User session expired');
    }

    this.currentUser = this.decoderService.decryptJson(
      JSON.parse(userData)
    ) as User;

    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config";
    this.sessionObject.configTab = "Datasource";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.browserName =
      this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion =
      this.loggerService.getBrowserNameAndVersion().version;

    this.isForm = true;
    this.isCreation = true;
    this.isUpdation = false;
    this.isTable = false;
    this.datasourceObj.sourceType = "ElasticSearch";

  }

  onSearch() {
    this.page = 1;
    this.applyFilterSortPagination();
  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection =
        this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applyFilterSortPagination();
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyPagination();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.applyPagination();
    }
  }

  applyFilterSortPagination() {

    const text = (this.searchText || '').toLowerCase();

    this.filteredDatasourceList = (this.allDatasourceList || []).filter((d: any) => {

      const datasourceName = String(d.datasourceName ?? '').toLowerCase();
      const sourceType = String(d.sourceType ?? '').toLowerCase();
      const indexName = String(d.indexName ?? '').toLowerCase();
      const datasourceURL = String(d.datasourceURL ?? '').toLowerCase();
      const createdBy = String(d.createdBy ?? '').toLowerCase();

      return (
        datasourceName.includes(text) ||
        sourceType.includes(text) ||
        indexName.includes(text) ||
        datasourceURL.includes(text) ||
        createdBy.includes(text)
      );
    });
    if (this.sortColumn) {
      this.filteredDatasourceList.sort((a: any, b: any) => {

        const valA = String(a[this.sortColumn] ?? '').toLowerCase();
        const valB = String(b[this.sortColumn] ?? '').toLowerCase();

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    this.totalPages = Math.ceil(
      this.filteredDatasourceList.length / this.pageSize
    );

    this.applyPagination();
  }


  applyPagination() {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.pagedDatasourceList =
      this.filteredDatasourceList.slice(start, end);
  }

  openCreateDatasource() {
  this.datasourceObj = new datasourceDetails();
  this.datasourceObj.sourceType = 'ElasticSearch';
  this.isDatasourceAuthEnabled = false;
  this.isCAcertificate = false;
  this.fieldTextType = false;
  this.isCreation = true;
  this.isUpdation = false;
  this.isForm = true;
  this.isTable = false;
  this.selectedDatasource = null;
}

  showDatasourceList() {
    this.isTable = true;
    this.isCreation = false;
    this.isUpdation = false;
    this.isForm = false;
    this.allDatasourceList = [];
    this.datasourceService.getAllDatasourceList(this.sessionObject).pipe(first()).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.allDatasourceList = response.serviceResponse;
        this.applyFilterSortPagination();
      }
    });
  }

  showErrorBanner(message: string) {
    this.resetBanners();
    this.errorMessage = message;
    this.showError = true;

    setTimeout(() => this.showError = false, 3000);
  }

  showSuccessBanner(message = 'Interface created successfully') {
    this.resetBanners();
    this.successMessage = message;
    this.showSuccess = true;

    setTimeout(() => this.showSuccess = false, 3000);
  }

  showUpdateBanner(message = 'Interface updated successfully') {
    this.resetBanners();
    this.updateMessage = message;
    this.showUpdateSuccess = true;

    setTimeout(() => this.showUpdateSuccess = false, 4000);
  }

  showDeleteBanner(message = 'Interface deleted successfully') {
    this.resetBanners();
    this.deleteMessage = message;
    this.showDelete = true;

    setTimeout(() => this.showDelete = false, 3000);
  }

  private resetBanners() {
    this.showError = false;
    this.showSuccess = false;
    this.showUpdateSuccess = false;
  }

  addDatasource() {

    if (!this.datasourceObj.datasourceName?.trim()) {
      this.showErrorBanner('Kindly provide Datasource name !!');
      return;
    }

    if (!this.datasourceObj.indexName?.trim()) {
      this.showErrorBanner('Kindly provide Index name !!');
      return;
    }

    if (!this.datasourceObj.datasourceURL?.trim()) {
      this.showErrorBanner('Kindly provide Datasource URL !!');
      return;
    }

    if (!this.datasourceObj.timeFieldName?.trim()) {
      this.showErrorBanner('Kindly provide Time field name !!');
      return;
    }

    const payload: any = {
      sourceType: 'ElasticSearch',
      datasourceName: this.datasourceObj.datasourceName,
      datasourceURL: this.datasourceObj.datasourceURL,
      indexName: this.datasourceObj.indexName,
      timeFieldName: this.datasourceObj.timeFieldName,
      createdBy: Number(this.currentUser.id),
      sessionDTO: this.sessionObject
    };

    if (this.isDatasourceAuthEnabled) {

      if (!this.datasourceObj.datasourceUsername?.trim()) {
        this.showErrorBanner('Kindly provide Datasource Username !!');
        return;
      }

      if (!this.datasourceObj.datasourcePassword?.trim()) {
        this.showErrorBanner('Kindly provide Datasource Password !!');
        return;
      }

      payload.authenticationEnabled = true;
      payload.datasourceUsername = this.datasourceObj.datasourceUsername;
      payload.datasourcePassword = this.datasourceObj.datasourcePassword;

    } else {
      payload.authenticationEnabled = false;
    }

    if (this.isCAcertificate) {

      if (!this.datasourceObj.caCertificate?.trim()) {
        this.showErrorBanner('Kindly provide CA / SSL Certificate !!');
        return;
      }

      payload.isCAcertificate = 'yes';
      payload.caCertificate = this.datasourceObj.caCertificate;

    } else {
      payload.isCAcertificate = 'no';
      payload.caCertificate = null;
    }

    this.datasourceService
      .createDatasource(payload)
      .pipe(first())
      .subscribe({

        next: (response: any) => {

          if (response.serviceStatus === 'Success') {
            this.showSuccessBanner(response.serviceResponse);
            this.resetDatasourceForm();
          }
          else {
            this.showErrorBanner(response.serviceResponse);
          }
        },

        error: () => {
          this.showErrorBanner('Server error while creating datasource');
        }
      });
  }

  testConnection() {

    let datasourceObjTest: any;
    if (!this.isUpdation) {

      if (!this.datasourceObj.datasourceName?.trim()) {
        this.showErrorBanner('Kindly provide Datasource name !!');
        return;
      }

      if (!this.datasourceObj.indexName?.trim()) {
        this.showErrorBanner('Kindly provide Index name !!');
        return;
      }

      if (!this.datasourceObj.datasourceURL?.trim()) {
        this.showErrorBanner('Kindly provide Datasource URL !!');
        return;
      }

      if (this.isDatasourceAuthEnabled) {

        if (!this.datasourceObj.datasourceUsername?.trim()) {
          this.showErrorBanner('Kindly provide Datasource Username !!');
          return;
        }

        if (!this.datasourceObj.datasourcePassword?.trim()) {
          this.showErrorBanner('Kindly provide Datasource Password !!');
          return;
        }
      }

      datasourceObjTest = { ...this.datasourceObj };
    }
    else {

      if (!this.updateDatasourceObject.datasourceName?.trim()) {
        this.showErrorBanner('Kindly provide Datasource name !!');
        return;
      }

      if (!this.updateDatasourceObject.indexName?.trim()) {
        this.showErrorBanner('Kindly provide Index name !!');
        return;
      }

      if (!this.updateDatasourceObject.datasourceURL?.trim()) {
        this.showErrorBanner('Kindly provide Datasource URL !!');
        return;
      }

      if (this.updateDatasourceObject.authenticationEnabled) {

        if (!this.updateDatasourceObject.datasourceUsername?.trim()) {
          this.showErrorBanner('Kindly provide Datasource Username !!');
          return;
        }

        if (!this.updateDatasourceObject.datasourcePassword?.trim()) {
          this.showErrorBanner('Kindly provide Datasource Password !!');
          return;
        }
      }

      datasourceObjTest = { ...this.updateDatasourceObject };
    }

    datasourceObjTest.sourceType = 'ElasticSearch';

    datasourceObjTest.authenticationEnabled = this.isDatasourceAuthEnabled;

    datasourceObjTest.isCAcertificate =
      this.isCAcertificate ? 'yes' : 'no';

    datasourceObjTest.sessionDTO = this.sessionObject;

    this.datasourceService
      .dataSourceTestConnection(datasourceObjTest)
      .pipe(first())
      .subscribe({

        next: (response: any) => {

          if (response.serviceStatus === 'Success') {
            this.showSuccessBanner(
              response.serviceResponse || 'Connection successful'
            );
          }
          else {
            this.showErrorBanner(
              response.serviceResponse || 'Connection failed'
            );
          }
        },

        error: () => {
          this.showErrorBanner('Unable to test datasource connection');
        }
      });
  }

  openUpdateDatasource(updateDatasourceObject: any) {
    this.isForm = true;
    this.isTable = false;
    this.isCreation = false;
    this.isUpdation = true;
    this.updateDatasourceObject = { ...updateDatasourceObject };
    this.datasourceObj = this.updateDatasourceObject;
    this.isDatasourceAuthEnabled =
      this.updateDatasourceObject.authenticationEnabled === true;
    this.isCAcertificate =
      this.updateDatasourceObject.isCAcertificate === 'yes';
  }

  updateDatasource() {

    if (!this.datasourceObj.datasourceName?.trim()) {
      this.showErrorBanner('Kindly provide Datasource name !!');
      return;
    }

    if (!this.datasourceObj.indexName?.trim()) {
      this.showErrorBanner('Kindly provide Index name !!');
      return;
    }

    if (!this.datasourceObj.datasourceURL?.trim()) {
      this.showErrorBanner('Kindly provide Datasource URL !!');
      return;
    }

    if (this.isDatasourceAuthEnabled) {

      if (!this.datasourceObj.datasourceUsername?.trim()) {
        this.showErrorBanner('Kindly provide Datasource Username !!');
        return;
      }

      if (!this.datasourceObj.datasourcePassword?.trim()) {
        this.showErrorBanner('Kindly provide Datasource Password !!');
        return;
      }

    } else {
      this.datasourceObj.datasourceUsername = null;
      this.datasourceObj.datasourcePassword = null;
    }

    if (this.isCAcertificate) {

      if (!this.datasourceObj.caCertificate?.trim()) {
        this.showErrorBanner('Kindly provide CA / SSL Certificate !!');
        return;
      }

    } else {
      this.datasourceObj.caCertificate = null;
    }
    this.datasourceObj.sourceType = 'ElasticSearch';

    this.datasourceObj.authenticationEnabled =
      this.isDatasourceAuthEnabled;

    this.datasourceObj.isCAcertificate =
      this.isCAcertificate ? 'yes' : 'no';

    (this.datasourceObj as any).editedBy = this.currentUser.id;
    this.datasourceObj.sessionDTO = this.sessionObject;

    this.datasourceService
      .updateDatasource(this.datasourceObj)
      .pipe(first())
      .subscribe({

        next: (response: any) => {

          if (response.serviceStatus === 'Success') {

            this.showUpdateBanner(
              response.serviceResponse || 'Datasource updated successfully'
            );

            this.isForm = false;
            this.isUpdation = false;
            this.isCreation = false;
            this.isTable = true;

            this.showDatasourceList();
          }
          else {
            this.showErrorBanner(response.serviceResponse);
          }
        },

        error: () => {
          this.showErrorBanner('Server error while updating datasource');
        }
      });
  }


  resetDatasourceForm() {
    this.datasourceObj = new datasourceDetails();
    this.isDatasourceAuthEnabled = false;
    this.isCAcertificate = false;
    this.fieldTextType = false;
    this.isCreation = true;
    this.isUpdation = false;
    this.isForm = true;
    this.datasourceObj.sourceType = "ElasticSearch";
  }

  openDeleteConfirm(datasource: any, template: TemplateRef<any>) {
    this.selectedDatasource = datasource;
    this.modalService.open(template, {
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }

  deleteDatasource() {

    if (!this.selectedDatasource) return;

    this.isDeleting = true;

    this.deleteDatasourceObj = {
      ...this.selectedDatasource,
      sessionDTO: this.sessionObject
    };

    this.datasourceService
      .deleteDatasource(this.deleteDatasourceObj)
      .pipe(first())
      .subscribe({

        next: (response: any) => {

          this.isDeleting = false;

          if (response.serviceStatus === 'Success') {
            this.closeDeleteModal();
            this.showDeleteBanner(
              response.serviceResponse || 'Datasource deleted successfully'
            );
            this.showDatasourceList();
          }
          else {
            this.showErrorBanner(
              response.serviceResponse || 'Unable to delete datasource'
            );
          }
        },

        error: () => {
          this.isDeleting = false;
          this.showErrorBanner('Server error while deleting datasource');
        }
      });
  }

  closeDeleteModal() {
  this.modalService.dismissAll();
}

}
