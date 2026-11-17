import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { from, switchMap } from 'rxjs';
import Swal from 'sweetalert2';

import { CriticalFlowService } from '../../../../services/critical-flow.service';
import { ApplicationService } from '../../../../services/application.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { LoggerService } from '../../../../services/logger.service';
import { DecoderService } from '../../../../services/decoder.service';
import { SanitizationService } from '../../../../services/sanitization.service';
import { ApmApiService } from '../../../../services/apm-api.service';
import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';

import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { UserTypeCrudMapObject } from '../../../../models/UserTypeCrudMapObject';

@Component({
  selector: 'app-critical-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SanitizeInputDirective],
  templateUrl: './critical-flow.component.html',
  styleUrl: './critical-flow.component.css'
})
export class CriticalFlowComponent implements OnInit {

  isForm: boolean = false;
  isUpdation: boolean = false;
  showTable: boolean = true;

  criticalFlows: any[] = [];
  filteredCriticalFlows: any[] = [];
  pagedCriticalFlows: any[] = [];
  availableApplications: any[] = [];

  searchText: string = '';
  page: number = 1;
  pageSize: number = 5;
  totalPages: number = 0;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  currentUser!: User;
  sessionObject: Session = new Session();
  userTypeCrudMap: UserTypeCrudMapObject = new UserTypeCrudMapObject();

  criticalFlowForm!: FormGroup;
  expandedFlows: { [id: number]: boolean } = {};
  stepEndpoints: { [stepIndex: number]: string[] } = {};
  stepEndpointsLoading: { [stepIndex: number]: boolean } = {};
  draggedIndex: number | null = null;
  dragOverIndex: number | null = null;

  protected readonly Math = Math;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private criticalFlowService: CriticalFlowService,
    private applicationService: ApplicationService,
    private authService: AuthenticationService,
    private loggerService: LoggerService,
    private decoderService: DecoderService,
    private sanitizationService: SanitizationService,
    private apmApiService: ApmApiService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.initializeCriticalFlowModule();
      }
    });
  }

  private initForm() {
    this.criticalFlowForm = this.fb.group({
      id: [null as number | null],
      featureName: ['', [Validators.required]],
      description: [''],
      steps: this.fb.array([])
    });
  }

  get steps(): FormArray {
    return this.criticalFlowForm.get('steps') as FormArray;
  }

  createStepGroup(step?: any): FormGroup {
    return this.fb.group({
      id: [step?.id || null],
      stepOrder: [step?.stepOrder || (this.steps.length + 1)],
      applicationId: [step?.applicationId || '', Validators.required],
      endpoint: [step?.endpoint || '', [Validators.required]],
      stepName: [step?.stepName || '', Validators.required]
    });
  }

  addStep(step?: any) {
    const index = this.steps.length;
    this.steps.push(this.createStepGroup(step));
    if (step && step.applicationId) {
      this.fetchEndpointsForStep(index, step.applicationId);
    }
  }

  removeStep(index: number) {
    this.steps.removeAt(index);
    this.steps.controls.forEach((ctrl, i) => {
      ctrl.get('stepOrder')?.setValue(i + 1);
    });

    const newStepEndpoints: { [stepIndex: number]: string[] } = {};
    const newStepEndpointsLoading: { [stepIndex: number]: boolean } = {};
    for (let i = 0; i < this.steps.length; i++) {
      const oldIndex = i >= index ? i + 1 : i;
      newStepEndpoints[i] = this.stepEndpoints[oldIndex] || [];
      newStepEndpointsLoading[i] = this.stepEndpointsLoading[oldIndex] || false;
    }
    this.stepEndpoints = newStepEndpoints;
    this.stepEndpointsLoading = newStepEndpointsLoading;
  }

  onApplicationChange(index: number) {
    const stepGroup = this.steps.at(index);
    const appId = stepGroup.get('applicationId')?.value;
    stepGroup.get('endpoint')?.setValue('');
    if (!appId) {
      this.stepEndpoints[index] = [];
      return;
    }
    this.fetchEndpointsForStep(index, appId);
  }

  formatToYyyyMMddHHmm(d: Date): number {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const str = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
    return parseInt(str);
  }

  fetchEndpointsForStep(index: number, appId: number | string) {
    const app = this.availableApplications.find(a => String(a.applicationId) === String(appId));
    if (!app) {
      this.stepEndpoints[index] = [];
      return;
    }
    const serviceName = app.applicationName || app.ipAddress;
    const entityId = btoa(serviceName) + '.1';
    
    const now = new Date();
    const past = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const et = this.formatToYyyyMMddHHmm(now);
    const st = this.formatToYyyyMMddHHmm(past);
    
    this.stepEndpointsLoading[index] = true;
    this.apmApiService.getEndpoint(entityId, st, et, -1, -1)
      .pipe(switchMap(data => from(this.decoderService.decodeObject(data))))
      .subscribe({
        next: (res: any) => {
          const key = Object.keys(res)[0];
          this.stepEndpoints[index] = key ? (res[key] as string[]) : [];
          this.stepEndpointsLoading[index] = false;
        },
        error: (err) => {
          console.error(`Failed to fetch endpoints for step ${index}`, err);
          this.stepEndpoints[index] = [];
          this.stepEndpointsLoading[index] = false;
        }
      });
  }

  initializeCriticalFlowModule() {
    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config";
    this.sessionObject.configTab = "Critical Flow";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    try {
      const adminConfig = (this.currentUser as any)?.['crudData']?.['Admin-Config'];
      const crudMapping = adminConfig?.['criticalFlow'] ?? adminConfig?.['controlFlow'] ?? adminConfig?.['controlZone'];
      if (crudMapping) {
        this.userTypeCrudMap = new UserTypeCrudMapObject();
        this.userTypeCrudMap.create = crudMapping.create === 'true' || crudMapping.create === true;
        this.userTypeCrudMap.edit   = crudMapping.edit   === 'true' || crudMapping.edit   === true;
        this.userTypeCrudMap.delete = crudMapping.delete === 'true' || crudMapping.delete === true;
      } else {
        this.userTypeCrudMap = new UserTypeCrudMapObject();
        if (this.currentUser?.userType === 'Super Admin') {
          this.userTypeCrudMap.create = true;
          this.userTypeCrudMap.edit = true;
          this.userTypeCrudMap.delete = true;
        }
      }
    } catch {
      this.userTypeCrudMap = new UserTypeCrudMapObject();
    }

    this.isForm = false;
    this.showTable = true;
    this.isUpdation = false;

    this.loadApplications();
    this.loadCriticalFlows();
  }

  loadApplications() {
    this.applicationService.getFullApplicationData(String(this.currentUser.userId), 'Service', this.sessionObject)
      .subscribe({
        next: (response: any) => {
          if (response && response.serviceStatus === 'Success') {
            const resData = response.serviceResponse || {};
            const apps = resData.applications || [];
            this.availableApplications = apps.map((a: any) => ({
              applicationId: a.applicationId,
              applicationName: a.applicationName
            })).sort((a: any, b: any) => a.applicationName.localeCompare(b.applicationName));
          } else {
            this.availableApplications = [];
          }
        },
        error: (err) => {
          console.error('Failed to load applications', err);
          this.availableApplications = [];
        }
      });
  }

  loadCriticalFlows() {
    this.criticalFlowService.getAllCriticalFlows(this.sessionObject).subscribe({
      next: (response: any) => {
        if (response && response.serviceStatus === 'Success') {
          this.criticalFlows = response.serviceResponse || [];
          this.applyFilterAndPagination();
        } else {
          this.criticalFlows = [];
          this.applyFilterAndPagination();
        }
      },
      error: () => {
        this.criticalFlows = [];
        this.applyFilterAndPagination();
      }
    });
  }

  applyFilterAndPagination() {
    let data = [...this.criticalFlows];
    if (this.searchText) {
      const txt = this.searchText.toLowerCase();
      data = data.filter(cf =>
        String(cf.featureName ?? '').toLowerCase().includes(txt) ||
        String(cf.description ?? '').toLowerCase().includes(txt) ||
        String(cf.createdby ?? '').toLowerCase().includes(txt)
      );
    }
    if (this.sortColumn) {
      data.sort((a: any, b: any) => {
        const valA = a[this.sortColumn] ?? '';
        const valB = b[this.sortColumn] ?? '';
        return this.sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    this.filteredCriticalFlows = data;
    this.totalPages = Math.ceil(data.length / this.pageSize);
    const start = (this.page - 1) * this.pageSize;
    this.pagedCriticalFlows = data.slice(start, start + this.pageSize);
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

  toggleExpand(id: number) {
    this.expandedFlows[id] = !this.expandedFlows[id];
  }

  getApplicationName(appId: number): string {
    const app = this.availableApplications.find(a => a.applicationId === appId);
    return app ? app.applicationName : 'Unknown Application (' + appId + ')';
  }

  openCreateForm() {
    this.isForm = true;
    this.showTable = false;
    this.isUpdation = false;
    this.criticalFlowForm.reset();
    this.steps.clear();
    this.stepEndpoints = {};
    this.stepEndpointsLoading = {};
    this.addStep();
  }

  openUpdateForm(flow: any) {
    this.isForm = true;
    this.showTable = false;
    this.isUpdation = true;

    this.criticalFlowForm.patchValue({
      id: flow.id,
      featureName: flow.featureName,
      description: flow.description
    });

    this.steps.clear();
    this.stepEndpoints = {};
    this.stepEndpointsLoading = {};
    if (flow.criticalFlowSteps && flow.criticalFlowSteps.length > 0) {
      const sortedSteps = [...flow.criticalFlowSteps].sort((a, b) => a.stepOrder - b.stepOrder);
      sortedSteps.forEach(s => this.addStep(s));
    } else {
      this.addStep();
    }
  }

  showTableList() {
    this.isForm = false;
    this.showTable = true;
    this.isUpdation = false;
    this.loadCriticalFlows();
  }

  resetForm() {
    if (this.isUpdation) {
      const id = this.criticalFlowForm.get('id')?.value;
      const flow = this.criticalFlows.find(f => f.id === id);
      if (flow) {
        this.openUpdateForm(flow);
      }
    } else {
      this.openCreateForm();
    }
  }

  saveCriticalFlow() {
    this.criticalFlowForm.markAllAsTouched();
    if (this.criticalFlowForm.invalid) {
      Swal.fire('Validation Error', 'Please complete all required fields correctly.', 'warning');
      return;
    }

    if (this.steps.length < 2) {
      Swal.fire('Validation Error', 'At least 2 steps must be created.', 'warning');
      return;
    }

    const formValue = this.criticalFlowForm.value;
    const payload = {
      id: formValue.id || undefined,
      featureName: formValue.featureName,
      description: formValue.description,
      createdby: this.isUpdation ? undefined : Number(this.currentUser.id),
      updatedby: Number(this.currentUser.id),
      criticalFlowStepDTO: (formValue.steps || []).map((s: any) => ({
        id: s.id || undefined,
        stepOrder: s.stepOrder,
        applicationId: Number(s.applicationId),
        endpoint: s.endpoint,
        stepName: s.stepName
      })),
      sessionDTO: this.sessionObject
    };

    const sanitizedPayload = this.sanitizationService.sanitizePayload(payload);

    if (this.isUpdation && formValue.id) {
      this.criticalFlowService.updateCriticalFlow(formValue.id, sanitizedPayload).subscribe({
        next: (response: any) => {
          if (response && response.serviceStatus === 'Success') {
            Swal.fire('Updated!', 'Critical Flow updated successfully.', 'success');
            this.showTableList();
          } else {
            Swal.fire('Error', response?.serviceResponse || 'Update failed', 'error');
          }
        },
        error: () => {
          Swal.fire('Error', 'Something went wrong while updating critical flow.', 'error');
        }
      });
    } else {
      this.criticalFlowService.createCriticalFlow(sanitizedPayload).subscribe({
        next: (response: any) => {
          if (response && response.serviceStatus === 'Success') {
            Swal.fire('Created!', 'Critical Flow created successfully.', 'success');
            this.showTableList();
          } else {
            Swal.fire('Error', response?.serviceResponse || 'Creation failed', 'error');
          }
        },
        error: () => {
          Swal.fire('Error', 'Something went wrong while creating critical flow.', 'error');
        }
      });
    }
  }

  moveStep(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= this.steps.length) return;

    const originalOrderMap = this.steps.controls.map((ctrl, idx) => ({
      group: ctrl,
      endpoints: this.stepEndpoints[idx] || [],
      loading: this.stepEndpointsLoading[idx] || false
    }));

    const targetGroup = this.steps.at(fromIndex);
    this.steps.removeAt(fromIndex);
    this.steps.insert(toIndex, targetGroup);

    const newEndpoints: { [stepIndex: number]: string[] } = {};
    const newLoading: { [stepIndex: number]: boolean } = {};

    this.steps.controls.forEach((ctrl, idx) => {
      const originalInfo = originalOrderMap.find(item => item.group === ctrl);
      if (originalInfo) {
        newEndpoints[idx] = originalInfo.endpoints;
        newLoading[idx] = originalInfo.loading;
      }
      
      ctrl.get('stepOrder')?.setValue(idx + 1);
    });

    this.stepEndpoints = newEndpoints;
    this.stepEndpointsLoading = newLoading;
  }

  onDragStart(index: number, event: DragEvent) {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onDragOver(index: number, event: DragEvent) {
    event.preventDefault();
  }

  onDragEnter(index: number, event: DragEvent) {
    event.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      this.dragOverIndex = index;
    }
  }

  onDragLeave(index: number, event: DragEvent) {
    if (this.dragOverIndex === index) {
      this.dragOverIndex = null;
    }
  }

  onDrop(index: number, event: DragEvent) {
    event.preventDefault();
    this.dragOverIndex = null;
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      this.moveStep(this.draggedIndex, index);
    }
  }

  onDragEnd() {
    this.draggedIndex = null;
    this.dragOverIndex = null;
  }

  deleteCriticalFlow(flow: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete critical flow "${flow.featureName}". This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.criticalFlowService.deleteCriticalFlow(flow.id, this.sessionObject).subscribe({
          next: (response: any) => {
            if (response && response.serviceStatus === 'Success') {
              Swal.fire('Deleted!', 'Critical Flow deleted successfully.', 'success');
              this.loadCriticalFlows();
            } else {
              Swal.fire('Error', response?.serviceResponse || 'Delete failed', 'error');
            }
          },
          error: () => {
            Swal.fire('Error', 'Something went wrong while deleting critical flow.', 'error');
          }
        });
      }
    });
  }

}
