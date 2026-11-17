import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { first, from, switchMap } from 'rxjs';
import { CustomAlert } from '../../../models/CustomAlert';
import { ApplicationService } from '../../../services/application.service';
import { DecoderService } from '../../../services/decoder.service';
import { Session } from '../../../models/session';
import { User } from '../../../models/user';
import { Router } from '@angular/router';
import { LoggerService } from '../../../services/logger.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { AlertService } from '../../../services/alert.service';
import { CustomAlertConfig } from '../../../models/CustomAlertConfig';
import { CustomAlertService } from '../../../services/custom-alert.service';
import { ApmApiService } from '../../../services/apm-api.service';

@Component({
    selector: 'app-custom-alert',
    imports: [
        FormsModule,
        NgbModule,
        CommonModule,
        NgbDropdownModule
    ],
    templateUrl: './custom-alert.component.html',
    styleUrl: './custom-alert.component.css'
})
export class CustomAlertComponent implements OnInit {

  selectedTime: string | null = null;

  user = new User();
  currentUser!: User;

  sessionObject: Session = new Session();

  isAlertsForm: boolean = true;
  isAlertsTable: boolean = false;
  isAlertsUpdateForm: boolean = false;

  selectedAppType = 'Select';

  allApplications: any;
  serviceList: any[] = [];
  infraList: any[] = [];
  networkList: any[] = [];
  databaseList: any[] = [];

  customAlerts: CustomAlert[] = [new CustomAlert()];
  alertForm: CustomAlertConfig = new CustomAlertConfig();
  availableMetricsMap: { [key: number]: { id: number; metricName: string; metricLabel?: string }[] } = {};


  alertTableData: any[] = [];
  filteredTableData: any[] = [];
  pagedAlertTable: any[] = [];

  searchQuery = '';

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 0;

  alertDeleted = false;
  alertNotDeleted = false;

  toast = {
    visible: false,
    message: '',
    type: ''
  };
  selectedId!: number;

  constructor(
    private applicationService: ApplicationService,
    private decoderService: DecoderService,
    private router: Router,
    private loggerService: LoggerService,
    private authService: AuthenticationService,
    private alertService: AlertService,
    private customAlertService: CustomAlertService,
    private apmApiService: ApmApiService,
  ) {
    this.authService.currentUser.subscribe(x => {
      if (x) {
        this.currentUser = x;
      }
    });
  }

  ngOnInit(): void {
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
  }

  showAlertForm(): void {
    this.isAlertsForm = true;
    this.isAlertsTable = false;
    this.isAlertsUpdateForm = false;
    this.alertForm = new CustomAlertConfig;
    this.customAlerts = [new CustomAlert()];
  }

  showAlertTable(): void {
    this.isAlertsForm = false;
    this.isAlertsTable = true;
    this.isAlertsUpdateForm = false;
    this.getAllAlerts();
  }

  showAlertUpdateForm(id: number): void {
    this.isAlertsForm = false;
    this.isAlertsTable = false;
    this.isAlertsUpdateForm = true;
    this.selectedId = id;
    this.getAlertById(id);
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toast.message = message;
    this.toast.type = type;
    this.toast.visible = true;
    setTimeout(() => this.toast.visible = false, 3000);
  }

  setAppType(event: Event, alert: CustomAlert): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    alert.applicationType = selectedValue;
    alert.module = [];
    alert.applicationID = '';
    alert.applicationName = '';

    switch (selectedValue) {
      case 'APM':
        this.getServiceNames();
        break;
      case 'Infra':
        this.getInfraNames();
        break;
      case 'Network':
        this.getNetworkNames();
        break;
      case 'Database':
        this.getDbNames();
        break;
      default:
        break;
    }
  }

  getServiceNames(): void {
    const featureType = 'APM';
    this.applicationService.getAllApplicationsByUserIDFeatureType(this.currentUser, featureType)
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.serviceList = response.serviceResponse;
      });
  }

  getInfraNames(): void {
    const featureType = 'infra';
    this.applicationService.getAllApplicationsByUserIDFeatureType(this.currentUser, featureType)
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.infraList = response.serviceResponse;
      });
  }

  getNetworkNames(): void {
    const featureType = 'network';
    this.applicationService.getAllApplicationsByUserIDFeatureType(this.currentUser, featureType)
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.networkList = response.serviceResponse;
      });
  }

  getDbNames(): void {
    const featureType = 'database';
    this.applicationService.getAllApplicationsByUserIDFeatureType(this.currentUser, featureType)
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.databaseList = response.serviceResponse;
      });
  }

  onApplicationChange(applicationType: string, alert: CustomAlert, index: number): void {
    alert.module = [];
    alert.applicationName = '';

    let listToSearch = [];
    if (applicationType === 'APM') listToSearch = this.serviceList;
    else if (applicationType === 'Infra') listToSearch = this.infraList;
    else if (applicationType === 'Network') listToSearch = this.networkList;
    else if (applicationType === 'Database') listToSearch = this.databaseList;

    const selectedApp = listToSearch.find(a => a.appID == alert.applicationID);
    if (selectedApp) {
      alert.applicationName = selectedApp.applicationName;
      alert.technologyType = selectedApp.technologyType || '';
    }

    if (alert.applicationID && alert.applicationType) {
      const techType = selectedApp?.technologyType || '';
      this.getCustomMetrics(applicationType, techType, 0, alert, index);
    } else {
      this.availableMetricsMap[index] = [];
    }
  }

  getCustomMetrics(applicationType: string, technologyType: string, healthRuleTypeID: number, alert: CustomAlert, index: number): void {
    alert.module = [];
    this.alertService.getCustomMetrics(this.sessionObject, applicationType, technologyType, alert.applicationID, healthRuleTypeID)
      .pipe(first())
      .subscribe((data: any) => {
        const metrics = data.serviceStatus === 'Fail' ? [] : data.serviceResponse;
        this.availableMetricsMap[index] = metrics;
      });
  }

  isMetricSelected(metric: { id: number; metricName: string; metricLabel?: string }, alert: CustomAlert): boolean {
    return alert.module.some(m => m.id === metric.id);
  }

  getMetricNames(modules: { id: number; name: string }[]): string[] {
    return modules.map(m => m.name);
  }

  toggleMetricSelection(metric: { id: number; metricName: string; metricLabel?: string }, alert: CustomAlert): void {
    const index = alert.module.findIndex(m => m.id === metric.id);
    if (index > -1) {
      alert.module.splice(index, 1);
    } else {
      alert.module.push({ id: metric.id, name: metric.metricLabel || metric.metricName });
    }
  }

  selectAllMetrics(alert: CustomAlert, index: number): void {
    const allMetrics = this.availableMetricsMap[index] || [];
    alert.module = allMetrics.map((m: any) => ({ id: m.id, name: m.metricLabel || m.metricName }));
  }


  clearAllMetrics(alert: CustomAlert): void {
    alert.module = [];
  }

  addRow(): void {
    this.customAlerts.push(new CustomAlert());
  }

  removeRow(index: number): void {
    if (this.customAlerts.length > 1) {
      this.customAlerts.splice(index, 1);
    }
  }

  isLastRowValid(): boolean {
    if (!this.customAlerts.length) return false;

    const last = this.customAlerts[this.customAlerts.length - 1];
    return !!(
      last.applicationType &&
      last.applicationID &&
      last.module.length > 0 &&
      !this.isDuplicateCombination(last.applicationType, last.applicationID, this.customAlerts.length - 1)
    );
  }

  isDuplicateCombination(applicationType: string, applicationID: any, index: number): boolean {
    return this.customAlerts.some((item, i) =>
      i !== index &&
      item.applicationType === applicationType &&
      item.applicationID === applicationID
    );
  }

  saveCustomAlerts(): void {
    const hasEmpty = this.customAlerts.some(row =>
      !row.applicationType || !row.applicationID || row.module.length === 0
    );

    const hasDuplicate = this.customAlerts.some((row, i) =>
      this.customAlerts.some((other, j) =>
        i !== j &&
        row.applicationType === other.applicationType &&
        row.applicationID === other.applicationID
      )
    );

    if (!this.alertForm.name?.trim() || !this.alertForm.email?.trim() || !this.alertForm.time) {
      alert('Please fill Name, Email, and Time.');
      return;
    }

    if (hasEmpty) {
      alert('Please fill all Application Type, Application Name, and select at least one Metric in each row.');
      return;
    }

    if (hasDuplicate) {
      alert('Duplicate Application Type and Application Name combination found. Each pair must be unique.');
      return;
    }

    this.alertForm.targets = this.customAlerts;

    this.customAlertService.createAlert(this.alertForm).subscribe({
      next: (response) => {
        this.showToast('Alert saved successfully!', 'success');
        this.alertForm = new CustomAlertConfig;
        this.customAlerts = [new CustomAlert()];
      },
      error: (error) => {
        this.showToast('Failed to save Alert.', 'error');
      }
    });

  }

  // TABLE

  getAllAlerts(): void {
    this.customAlertService.getAllAlerts().subscribe((data: any) => {
      const responseData = data;

      if (Array.isArray(responseData)) {
        this.alertTableData = responseData;
      } else {
        this.alertTableData = [];
      }

      this.filteredTableData = [...this.alertTableData];
      this.calculatePagination();
    });
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredTableData.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA == null || valueB == null) return 0;

      let comparison: number;

      const dateRegex = /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/;
      const isDate = dateRegex.test(valueA) && dateRegex.test(valueB);

      if (isDate) {
        const parseDate = (value: string) => {
          const [datePart, timePart] = value.split(', ');
          const [day, month, year] = datePart.split('/').map(Number);
          const [hour, minute, second] = timePart.split(':').map(Number);
          return new Date(year, month - 1, day, hour, minute, second);
        };
        const dateA = parseDate(valueA);
        const dateB = parseDate(valueB);
        comparison = dateA.getTime() - dateB.getTime();
      } else if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = valueA.toString().localeCompare(valueB.toString(), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.currentPage = 1;
    this.calculatePagination();
  }

  onSearch(): void {
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      this.filteredTableData = this.alertTableData.filter(app =>
        app.name.toLowerCase().includes(query)
      );
    } else {
      this.filteredTableData = [...this.alertTableData];
    }
    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTableData.length / this.itemsPerPage);
    this.pagedAlertTable = this.filteredTableData.slice(
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

  goToPage(page: any): void {
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
    return Math.min(this.currentPage * this.itemsPerPage, this.alertTableData.length);
  }

  deleteAlert(id: number) {
    if (confirm('Are you sure you want to delete this host?')) {
      this.customAlertService.deleteAlert(id).subscribe(
        response => {
          const index = this.pagedAlertTable.findIndex(item => item.id === id);
          if (index !== -1) {
            this.pagedAlertTable.splice(index, 1);
          }
          this.showToast('Alert deleted successfully!', 'success');
        },
        error => {
          console.error('Error deleting item:', error);
          this.showToast('Failed to delete alert.', 'error');
        }
      );
    }
  }

  callApi(): void {
    this.getServiceNames();
    this.getInfraNames();
    this.getNetworkNames();
    this.getDbNames();
  }

  getAlertById(id: number): void {
    this.customAlertService.getAlertById(id).subscribe((data: any) => {
      this.callApi();

      this.alertForm = new CustomAlertConfig();
      this.alertForm.name = data.name;
      this.alertForm.email = data.email;
      this.alertForm.time = data.time;
      this.alertForm.enabled = data.enabled;

      this.customAlerts = data.targets.map((target: any, index: number) => {
        const alert = new CustomAlert();
        alert.applicationType = target.applicationType;
        alert.applicationID = target.applicationID;
        alert.applicationName = target.applicationName;
        alert.technologyType = target.technologyType || '';

        this.getCustomMetrics(alert.applicationType, target.technologyType || '', 0, alert, index); // Use correct healthRuleTypeID

        setTimeout(() => {
          alert.module = target.module;
        }, 100);

        return alert;
      });
    });
  }

  updateCustomAlert(): void {
    const hasEmpty = this.customAlerts.some(row =>
      !row.applicationType || !row.applicationID || row.module.length === 0
    );

    const hasDuplicate = this.customAlerts.some((row, i) =>
      this.customAlerts.some((other, j) =>
        i !== j &&
        row.applicationType === other.applicationType &&
        row.applicationID === other.applicationID
      )
    );

    if (!this.alertForm.name?.trim() || !this.alertForm.email?.trim() || !this.alertForm.time) {
      alert('Please fill Name, Email, and Time.');
      return;
    }

    if (hasEmpty) {
      alert('Please fill all Application Type, Application Name, and select at least one Metric in each row.');
      return;
    }

    if (hasDuplicate) {
      alert('Duplicate Application Type and Application Name combination found. Each pair must be unique.');
      return;
    }

    this.alertForm.targets = this.customAlerts;

    this.customAlertService.updateAlert(this.selectedId, this.alertForm).subscribe({
      next: (response) => {
        this.showToast('Alert updated successfully!', 'success');
        this.alertForm = new CustomAlertConfig;
        this.customAlerts = [new CustomAlert()];
        this.showAlertTable();
      },
      error: (error) => {
        console.error('Failed to save alert:', error);
        this.showToast('Failed to update Alert.', 'error');
      }
    });

  }

  goToAlert(): void {
    this.router.navigate(['/alert-notification']);
  }


}

