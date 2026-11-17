import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import * as bootstrap from 'bootstrap';
import { from, Subject, switchMap, takeUntil } from 'rxjs';
import { Session } from '../../../../models/session';
import { User } from '../../../../models/user';
import { Router } from '@angular/router';
import { ApplicationService } from '../../../../services/application.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { DecoderService } from '../../../../services/decoder.service';
import { LoggerService } from '../../../../services/logger.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApmApiService } from '../../../../services/apm-api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoleService } from '../../../../services/role.service';

@Component({
    selector: 'app-health-score-metric-config',
    imports: [CommonModule, FormsModule],
    templateUrl: './health-score-metric-config.component.html',
    styleUrl: './health-score-metric-config.component.css'
})
export class HealthScoreMetricConfigComponent implements OnInit, OnDestroy, AfterViewInit {
  user = new User();
  currentUser: User = new User();
  sessionObject: Session = new Session();

  private destroy$ = new Subject<void>();
userTypeCrudMapList: any = null;
  configMetricForm: boolean = true;
  seeAllTable: boolean = false;

  selectedAppType = '';
  applicationNames: any[] = [];

  selectedAppId: any = '';
  technology: any = ""
  ipAddresses: any[] = [];
  infraId: string = '';
  selectedIps: string[] = [];

  metricList: any[] = [];
  selectedMetric = '';
  selectedMetrics: { id: number, name: string; weight: number, initialWt: number }[] = [];

  isLoading: boolean = false;
  metricsDetails: any[] = [];

  isEditMode: boolean = false;
 productList: string[] = [];
   technologyList: { technologyType: string; id: number }[] = [];
  constructor(
    private decoderService: DecoderService,
    private applicationService: ApplicationService,
    private loggerService: LoggerService,
    private router: Router,
    private authService: AuthenticationService,
    private apmApiService: ApmApiService,
    private snackBar: MatSnackBar,
    private roleService: RoleService
  ) {
    this.authService.currentUser.subscribe(x => this.currentUser = x || new User());
  }

  ngOnInit(): void {
    this.user = this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) as User;

    if (!this.currentUser) {
      this.currentUser = new User();
    }

    this.user.sessionDTO = this.sessionObject;

    this.sessionObject.featureName = "HTML Report";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.currentUser.sessionDTO = this.sessionObject;
this.getUserTypeCrudMapping()
    this.loadProducts()
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

   getUserTypeCrudMapping() {
  if (!this.user["crudData"]["Alert"]) return;

  this.userTypeCrudMapList = this.user["crudData"]["Alert"];

  Object.keys(this.userTypeCrudMapList).forEach(key => {
    const item = this.userTypeCrudMapList[key];
    item.create = item.create === 'true';
    item.edit = item.edit === 'true';
    item.delete = item.delete === 'true';
    item.view = item.view === 'true';
  });

}

  showSnack(message: string): void {
    this.snackBar.open(message, '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  onReset(): void {
    this.selectedAppType = '';
    this.selectedAppId = '';
    this.infraId = '';
    this.selectedIps = [];
    this.metricList = [];
    this.selectedMetric = '';
    this.selectedMetrics = [];
    this.metricsDetails = [];
  }

  onSeeAll(): void {
    this.onReset();
    this.configMetricForm = false;
    this.seeAllTable = true;
  }

  onGoBack(): void {
    this.onReset();
    this.configMetricForm = true;
    this.seeAllTable = false;
  }

  onAppTypeChange(): void {
    this.loadTechnology(this.selectedAppType);
    this.technology = ''
  
  
  }

  getAllAppListByUserID(appType: any): void {
    this.selectedAppId = '';
    this.infraId = '';
    this.selectedIps = [];
    this.metricList = [];
    this.selectedMetric = '';
    this.selectedMetrics = [];
    this.applicationService.getAllAppListByUserID(this.currentUser, appType).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.applicationNames = response.serviceResponse;
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getAllApplicationsByUserIDFeatureType(appType: any): void {
    this.selectedAppId = '';
    this.infraId = '';
    this.selectedIps = [];
    this.metricList = [];
    this.selectedMetric = '';
    this.selectedMetrics = [];
    this.applicationService.getAllApplicationsByUserIDFeatureType(this.currentUser, 'infra', appType).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.applicationNames = response.serviceResponse;
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  onAppNameChange(): void {
    this.destroy$.next();
    switch (this.selectedAppType.toUpperCase()) {
      case 'SERVICE':
        this.getMetricName();
        break;
      case 'HOST':
        this.getAllIpAddressListByApllicationIDAndIpType();
        break;
      case 'RELATIONAL':
        this.getMetricName();
        break;
    }
  }

  getAllIpAddressListByApllicationIDAndIpType(): void {
    this.infraId = '';
    this.selectedIps = [];
    this.metricList = [];
    this.selectedMetric = '';
    this.selectedMetrics = [];
    this.applicationService.getAllIpAddressListByApllicationIDAndIpType(this.currentUser, this.technology, this.selectedAppId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.ipAddresses = response.serviceResponse;
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getMetricName(): void {
    this.metricList = [];
    this.selectedMetric = '';
    this.selectedMetrics = [];

    const userType = this.user.userType;

    const infraId = this.selectedAppType.toUpperCase() === 'HOST' ? this.infraId : null;

    console.log("Payload: ", userType, this.selectedAppType, this.selectedAppId, infraId)

    this.apmApiService.getMetricName(userType, this.technology ? this.technology : this.selectedAppType, this.selectedAppId, infraId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.metricList = data;
          this.metricList.sort((a, b) =>
            a.metric_name.localeCompare(b.metric_name)
          );
        },
        error: (err) => {
          console.error("API Error:", err);
        }
      });
  }


  addMetric(): void {
    if (!this.selectedMetric) return;

    const index = this.metricList.findIndex(
      m => m.metric_name === this.selectedMetric
    );

    if (index === -1) return;

    const metric = this.metricList[index];

    this.selectedMetrics.push({
      id: metric.id,
      name: metric.metric_name,
      weight: metric.default_weight,
      initialWt: metric.default_weight
    });

    this.metricList.splice(index, 1);

    this.selectedMetric = '';
  }

  removeMetric(index: number) {
    const removedMetric = this.selectedMetrics[index];

    this.metricList.push({
      metric_name: removedMetric.name,
      default_weight: removedMetric.weight
    });

    this.selectedMetrics.splice(index, 1);
  }

  saveConfig() {
    const payload = {
      serviceType: this.technology ? this.technology : this.selectedAppType,
      appId: this.selectedAppId,
      infraId: this.selectedAppType.toUpperCase() === 'HOST' ? this.infraId : null,
      metrics: this.selectedMetrics.map(m => ({
        globalMetricId: m.id,
        customWeight: m.weight
      }))
    };

    this.apmApiService.createHealthScoreMetricConfig(this.user.userType, payload)
      .subscribe({
        next: (res) => {
          this.showSnack("Metric Weight for Health Score Saved Successfully");
          console.log("Saved successfully", res);
          this.onReset();
        },
        error: (err) => {
          this.showSnack("Save Failed");
          console.error("Save failed", err);
        }
      });
  }

  onAppNameChange2(): void {
    this.destroy$.next();
    switch (this.selectedAppType.toUpperCase()) {
      case 'SERVICE':
        this.getHealthScoreMetrics();
        break;
      case 'HOST':
        this.getAllIpAddressListByApllicationIDAndIpType();
        break;
      case 'RELATIONAL':
        this.getHealthScoreMetrics();
        break;
    }
  }

  getHealthScoreMetrics(): void {
    this.isLoading = true;
    const userType = this.user.userType;
    const infraId = this.selectedAppType.toUpperCase() === 'HOST' ? this.infraId : null;
    this.apmApiService.getHealthScoreMetrics(userType, this.technology ? this.technology : this.selectedAppType, this.selectedAppId, infraId).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.metricsDetails = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error("API Error:", err);
          this.isLoading = false;
        }
      });
  }

  updateHealthScoreMetricConfig() {
    const payload = {
      serviceType: this.technology ? this.technology : this.selectedAppType,
      appId: this.selectedAppId,
      infraId: this.selectedAppType.toUpperCase() === 'HOST' ? this.infraId : null,
      metrics: this.metricsDetails.map(m => ({
        globalMetricId: m.global_metric_id,
        customWeight: m.custom_weight
      }))
    };

    this.apmApiService.updateHealthScoreMetricConfig(this.user.userType, payload)
      .subscribe({
        next: (res) => {
          this.showSnack("Metric Weight for Health Score Updated Successfully");
          console.log("Updated successfully", res);
          this.onReset();
        },
        error: (err) => {
          this.showSnack("Save Failed");
          console.error("Save failed", err);
        }
      });
  }

  enableEdit(): void {
    this.isEditMode = true;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.getHealthScoreMetrics();
  }

  isDeleteMode = false;
  selectedMetricIds = new Set<number>();

  enableDeleteMode(): void {
    this.isDeleteMode = true;
    this.selectedMetricIds.clear();
  }

  toggleMetricSelection(metricId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedMetricIds.add(metricId);
    } else {
      this.selectedMetricIds.delete(metricId);
    }
  }

  confirmDelete(): void {
    const payload = {
      appId: this.selectedAppId,
      infraId: this.selectedAppType.toUpperCase() === 'HOST' ? this.infraId : null,
      globalMetricIds: Array.from(this.selectedMetricIds)
    };

    this.apmApiService.deleteHealthScoreMetricConfig(this.user.userType, payload)
      .subscribe({
        next: (res: any) => {
          this.showSnack(res.message);
          this.cancelDelete();
        },
        error: (err) => {
          this.showSnack(err.error?.message || 'Delete failed');
        }
      });
  }

  cancelDelete(): void {
    this.isDeleteMode = false;
    this.selectedMetricIds.clear();
    this.getHealthScoreMetrics();
  }

  loadProducts(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      const userId = user.userId;
      const userType = user.userType;
      const tool = sessionStorage.getItem('tool') || 'APM'; 

      this.roleService.findAppType(userId, userType, tool).subscribe({
        next: (res: any) => {
          this.productList = res.products || [];
        },
        error: () => {
          this.productList = [];
        }
      });
    }
  }

    loadTechnology(appType: string): void {
      
    this.applicationService.getTechnologyBySubFeature(appType).subscribe({
      next: (res: any) => {
        this.technologyList = res?.serviceResponse || [];

        if(this.technologyList.length==0){
          this.loadApp();
        }
      },
      error: () => {
        this.technologyList = [];
        this.loadApp();
      }
    });
  }

   onTechChange(selectedValue: string): void {
    this.destroy$.next();
    this.selectedAppId = '';
    this.infraId = '';
    this.selectedIps = [];
    this.metricList = [];
    this.selectedMetric = '';
    this.selectedMetrics = [];
    this.technology = selectedValue;

    this.applicationService
      .getFullApplicationData(
        this.currentUser.userId,
        this.selectedAppType,
        this.sessionObject,
        selectedValue
      )
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.applicationNames = response?.serviceResponse?.applications || [];
      });

  }

  loadApp(){
       this.destroy$.next();
    this.selectedAppId = '';
    this.infraId = '';
    this.selectedIps = [];
    this.metricList = [];
    this.selectedMetric = '';
    this.selectedMetrics = [];
    
     this.applicationService
      .getFullApplicationData(
        this.currentUser.userId,
        this.selectedAppType,
        this.sessionObject
      )
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.applicationNames = response?.serviceResponse?.applications || [];
      });
  }

}
