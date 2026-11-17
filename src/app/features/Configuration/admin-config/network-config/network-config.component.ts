import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NetworkService } from '../../../../services/network.service';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { from, switchMap } from 'rxjs';
import { DecoderService } from '../../../../services/decoder.service';
import { Router } from '@angular/router';
import { LoggerService } from '../../../../services/logger.service';
import { ApplicationService } from '../../../../services/application.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';


interface NetworkInterfaceUI {
  interfaceId?: number;
  ipAddr: string;
  dnsName: string;
  port: string;
  connectTo: 'IP' | 'DNS';
  type: number;
  maxRepetitions: number;
  contextName: string;
  securityName: string;
  securityLevel: string;
  authProtocol: string;
  authPassphrase: string;
  privProtocol: string;
  privPassphrase: string;
  bulk: string;
  monitoredBy: number;
  status: string;
}

@Component({
    selector: 'app-network-config',
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './network-config.component.html',
    styleUrl: './network-config.component.css'
})
export class NetworkConfigComponent implements OnInit {
 
file!: File;
form = {
  createMissing: true,
  updateExisting: true,
  deleteMissing: true
};

  showImportModal = false;
  showError = false;
  showSuccess = false;
  showUpdateSuccess = false;
  errorMessage = '';
  successMessage = '';
  updateMessage = '';
  showDelete = false;
  deleteMessage = '';
  isForm: boolean = false;
  selectedApplication: any;
  networkList: any;
  currentUser = new User();
  sessionObject: Session = new Session();
  hostName: string = '';
  visibleName: string = '';
  isVisibleNameModified: boolean = false;
  showTempDropdown: boolean = false;
  selectedTemplateIds: string[] = [];
  hostGroups: any[] = [];
  templates: { id: string; name: string }[] = [];
  originalSelectedTemp: { [key: string]: string[] } = {};
  selectedHostGroups: any[] = [];
  showHostDropdown = false;
  showAddHostGroupForm = false;
  statusBoolean: boolean = false;
  newHostGroupName = '';
  user = new User();
  description: any;
  interfaces: NetworkInterfaceUI[] = [
    {
      ipAddr: '',
      dnsName: '',
      port: '161',
      connectTo: 'IP',
      type: 2,
      maxRepetitions: 10,
      contextName: '',
      securityName: '',
      securityLevel: '0',
      authProtocol: '',
      authPassphrase: '',
      privProtocol: '',
      privPassphrase: '',
      bulk: '1',
      monitoredBy: 0,
      status: '0'
    }
  ];

  snmpVersion = '2';
  snmpCommunity = '';
  contextName = '';
  securityName = '';
  securityLevel = '0';
  authProtocol = '';
  authPassphrase = '';
  privProtocol = '';
  privPassphrase = '';
  useCombinedRequests = false;
  isUpdation: boolean = false;
  showInfraTable: boolean = false;
  searchText: string = '';
  page: number = 1;
  pageSize: number = 5;
  totalPages: number = 0;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  seeAllTable: any[] = [];
  filteredNetGroups: any[] = [];
  pagedNetwork: any[] = [];
  editingHostId: number | null = null;
  isEditMode = false;
  isDeleting: boolean = false;
  selectedHostId: number | null = null;

  constructor(
    private networkService: NetworkService,
    private decoderService: DecoderService,
    private router: Router,
    private loggerService: LoggerService,
    private applicationService: ApplicationService,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    const storedUser = sessionStorage.getItem('currentUser');
    if (!storedUser) {
      console.error('Current user not found in session storage');
      return;
    }
    const decryptedUser = this.decoderService.decryptJson(
      JSON.parse(storedUser)
    );
    this.user = decryptedUser as User;
    this.currentUser.userId = this.user.userId;
    this.sessionObject.featureName = "Configuration";
    this.sessionObject.menu = "Admin Config";
    this.sessionObject.configTab = "Application & IP Mapping";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName =
      this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion =
      this.loggerService.getBrowserNameAndVersion().version;
    this.isForm = true;
    this.showInfraTable = false;
    this.getTemplate();
    this.getHostGroup();
    this.getApplicationNames('NETWORK');
  }


  getApplicationNames(featureType: string) {
    this.currentUser.sessionDTO = this.sessionObject;
    console.log("User Object:", this.currentUser);
    this.networkService.getAllAppListByUserID(this.currentUser, featureType).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).subscribe((response: any) => {
      this.networkList = response.serviceResponse;
      console.log("NETWORK APPLICATIONS:", this.networkList);
    });
  }

  onHostNameChange() {
    if (!this.isVisibleNameModified) {
      this.visibleName = this.hostName;
    }
  }

  onVisibleNameChange() {
    this.isVisibleNameModified = true;
  }

  toggleTempDropdown(event: Event) {
    event.stopPropagation();
    this.showTempDropdown = !this.showTempDropdown;
  }

  toggleTemplateSelection(templateId: string) {
    const index = this.selectedTemplateIds.indexOf(templateId);

    if (index === -1) {
      this.selectedTemplateIds.push(templateId);
    } else {
      this.selectedTemplateIds.splice(index, 1);
    }
  }

  getSelectedTemplateNames(): string[] {
    return this.templates
      .filter(t => this.selectedTemplateIds.includes(t.id))
      .map(t => t.name);
  }

  getTemplate() {
    this.networkService.postTemplate().subscribe(response => {
      if (response.body?.serviceResponse) {
        this.templates = response.body.serviceResponse.map((t: any) => ({
          id: t.templateId,
          name: t.templateName
        }));
      }
    });
  }

  getHostGroup() {
    this.networkService.postHostGroup().subscribe(response => {
      if (response.body?.serviceResponse) {
        this.hostGroups = response.body.serviceResponse.map((hostGroup: any) => ({
          id: hostGroup.hostGroupId,
          name: hostGroup.hostGroupName,
          uuid: hostGroup.uuid
        }));
      }
    });
  }

  toggleHostDropdown(event: Event) {
    event.stopPropagation();
    this.showHostDropdown = !this.showHostDropdown;
  }

  openAddHostGroup(event: Event) {
    event.stopPropagation();
    this.showAddHostGroupForm = true;
  }

  closeAddHostGroup(event: Event) {
    event.stopPropagation();
    this.showAddHostGroupForm = false;
    this.newHostGroupName = '';
  }

  submitHostGroupInline(event: Event) {
    event.stopPropagation();

    if (!this.newHostGroupName.trim()) {
      alert('Host Group Name cannot be empty');
      return;
    }

    this.networkService.createHostGroup(this.newHostGroupName).subscribe(
      (response) => {
        if (response.body?.serviceStatus === 'success') {

          const newId = response.body.serviceResponse?.hostGroupId
            || response.body.serviceResponse?.id;
          this.getHostGroup();

          setTimeout(() => {
            if (newId) {
              this.selectedHostGroups.push(newId);
            }
          }, 300);

          this.newHostGroupName = '';
          this.showAddHostGroupForm = false;
        }
      }
    );
  }

  toggleHostGroup(id: string) {
    const index = this.selectedHostGroups.indexOf(id);

    if (index === -1) {
      this.selectedHostGroups.push(id);
    } else {
      this.selectedHostGroups.splice(index, 1);
    }
  }

  getSelectedHostGroupNames(): string[] {
    return this.hostGroups
      .filter(h => this.selectedHostGroups.includes(h.id))
      .map(h => h.name);
  }

  toggleConnectTo(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    this.interfaces[0].connectTo = checked ? 'DNS' : 'IP';
  }

  getAllNetwork() {
    this.applicationService.getAllNetworkHost(this.currentUser).subscribe(
      (response: any) => {
        this.seeAllTable = response?.serviceResponse || [];
        this.page = 1;
        this.applyFilterAndPagination();
      },
      () => {
        this.seeAllTable = [];
        this.applyFilterAndPagination();
      }
    );
  }

  toggleTableView() {
    this.isForm = false;
    this.showInfraTable = true;
    this.page = 1;
    this.getAllNetwork();
  }

  applyFilterAndPagination() {
    let data = [...this.seeAllTable];

    if (this.searchText.trim()) {
      const text = this.searchText.toLowerCase();

      data = data.filter(item =>
        (item.name || '').toLowerCase().includes(text) ||
        (item.ipAddress || '').toLowerCase().includes(text) ||
        (item.dnsName || '').toLowerCase().includes(text) ||
        (item.portNumber || '').toString().includes(text)
      );
    }

    if (this.sortColumn) {
      data.sort((a, b) => {
        const valA = a[this.sortColumn] ?? '';
        const valB = b[this.sortColumn] ?? '';

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    this.filteredNetGroups = data;
    this.totalPages = Math.ceil(data.length / this.pageSize);

    const startIndex = (this.page - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.pagedNetwork = data.slice(startIndex, endIndex);
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

  openUpdateNetwork(item: any) {
    this.isForm = true;
    this.showInfraTable = false;

    this.isUpdation = true;
    this.isEditMode = true;

    this.editingHostId = item.hostId;

    this.resetForm();

    this.networkService.getHostByHostId(item.hostId).subscribe(
      (response: any) => {

        if (response.body?.serviceStatus !== 'success') {
          return;
        }

        const data = response.body.serviceResponse;
        this.selectedApplication = data.applicationId;
        this.hostName = data.host;
        this.visibleName = data.name;
        this.description = data.description;
        this.statusBoolean = data.status === '0';
        this.selectedTemplateIds =
          data.templates?.map((t: any) => t.templateId) || [];
        this.selectedHostGroups =
          data.groups?.map((g: any) => g.groupId) || [];
        const intf = data.interfaces?.[0];

        if (intf) {
          this.interfaces = [{
            interfaceId: intf.interfaceId,
            ipAddr: intf.ip,
            dnsName: intf.dns,
            port: intf.port,
            connectTo: intf.useIp ? 'IP' : 'DNS',
            type: intf.type,
            maxRepetitions: intf.details?.maxRepetitions || 10,
            contextName: intf.details?.contextName || '',
            securityName: intf.details?.securityName || '',
            securityLevel: intf.details?.securityLevel || '0',
            authProtocol: intf.details?.authProtocol || '',
            authPassphrase: intf.details?.authPassphrase || '',
            privProtocol: intf.details?.privProtocol || '',
            privPassphrase: intf.details?.privPassphrase || '',
            bulk: intf.details?.bulk || '1',
            monitoredBy: 0,
            status: '0'
          }];
        }
        this.snmpVersion = intf?.details?.version || '2';
        this.snmpCommunity = intf?.details?.community || '';
        this.contextName = intf?.details?.contextName || '';
        this.securityName = intf?.details?.securityName || '';
        this.securityLevel = intf?.details?.securityLevel || '0';
        this.authProtocol = intf?.details?.authProtocol || '';
        this.authPassphrase = intf?.details?.authPassphrase || '';
        this.privProtocol = intf?.details?.privProtocol || '';
        this.privPassphrase = intf?.details?.privPassphrase || '';
        this.useCombinedRequests = intf?.details?.bulk === '1';

      }
    );
  }

  resetForm() {
    this.selectedApplication = null;
    this.hostName = '';
    this.visibleName = '';
    this.description = '';
    this.statusBoolean = false;

    this.selectedTemplateIds = [];
    this.selectedHostGroups = [];

    this.interfaces = [{
      ipAddr: '',
      dnsName: '',
      port: '161',
      connectTo: 'IP',
      type: 2,
      maxRepetitions: 10,
      contextName: '',
      securityName: '',
      securityLevel: '0',
      authProtocol: '',
      authPassphrase: '',
      privProtocol: '',
      privPassphrase: '',
      bulk: '1',
      monitoredBy: 0,
      status: '0'
    }];
  }

  openCreateNetwork() {
    this.isForm = true;
    this.showInfraTable = false;
    this.isUpdation = false;
    this.isEditMode = false;
    this.editingHostId = null;
    this.resetForm();
    this.snmpVersion = '2';
    this.snmpCommunity = '';
    this.contextName = '';
    this.securityName = '';
    this.securityLevel = '0';
    this.authProtocol = '';
    this.authPassphrase = '';
    this.privProtocol = '';
    this.privPassphrase = '';
    this.useCombinedRequests = false;
    this.showError = false;
    this.showSuccess = false;
    this.showUpdateSuccess = false;
    this.showDelete = false;
  }

  createNetworkConfig() {
    const missingFields: string[] = [];

    if (!this.selectedApplication) {
      missingFields.push('Network Type');
    }
    if (!this.hostName) {
      missingFields.push('Host Name');
    }
    if (!this.selectedHostGroups || this.selectedHostGroups.length === 0) {
      missingFields.push('Host Groups');
    }
    if (!this.snmpVersion) {
      missingFields.push('SNMP Version');
    }
    if (this.snmpVersion === '1' || this.snmpVersion === '2') {
      if (!this.snmpCommunity) {
        missingFields.push('SNMP Community');
      }
    }

    if (this.snmpVersion === '3') {
      if (!this.securityName) {
        missingFields.push('SNMP Security Name');
      }

      const secLevel = Number(this.securityLevel);

      if ((secLevel === 1 || secLevel === 2) &&
        (!this.authProtocol || !this.authPassphrase)) {
        missingFields.push('SNMP Auth Protocol / Passphrase');
      }

      if (secLevel === 2 &&
        (!this.privProtocol || !this.privPassphrase)) {
        missingFields.push('SNMP Priv Protocol / Passphrase');
      }
    }

    if (!this.interfaces || this.interfaces.length === 0) {
      missingFields.push('At least one Interface');
    }

    if (missingFields.length > 0) {
      this.showError = true;
      this.errorMessage =
        'Please fill in the following required fields:\n• ' +
        missingFields.join('\n• ');
      return;
    }

    const interfacesPayload = this.interfaces.map(intf => {
      const base: any = {
        type: intf.type,
        main: 1,
        useIp: intf.connectTo === 'IP' ? 1 : 0,
        ip: intf.connectTo === 'IP' ? intf.ipAddr : '',
        dns: intf.connectTo === 'DNS' ? intf.dnsName : '',
        port: intf.port,
        monitoredBy: 0,
        status: this.statusBoolean ? '0' : '1'
      };

      if (intf.type === 2) {
        base.details = {
          version: Number(this.snmpVersion),
          bulk: this.useCombinedRequests ? 1 : 0
        };

        if (this.snmpVersion === '1' || this.snmpVersion === '2') {
          base.details.community = this.snmpCommunity;
          if (this.snmpVersion === '2') {
            base.details.maxRepetitions = 10;
          }
        }

        if (this.snmpVersion === '3') {
          base.details.contextName = this.contextName || '';
          base.details.securityName = this.securityName;
          base.details.securityLevel = Number(this.securityLevel);

          if (Number(this.securityLevel) >= 1) {
            base.details.authProtocol = Number(this.authProtocol);
            base.details.authPassphrase = this.authPassphrase;
          }

          if (Number(this.securityLevel) === 2) {
            base.details.privProtocol = Number(this.privProtocol);
            base.details.privPassphrase = this.privPassphrase;
          }
        }
      }

      return base;
    });
    const payload: any = {
      appId: this.selectedApplication,
      host: this.hostName,
      name: this.visibleName,
      description: this.description,
      templates: this.selectedTemplateIds.map(id => ({ templateId: id })),
      groups: this.selectedHostGroups.map(id => ({ groupId: id })),
      interfaces: interfacesPayload,
      monitoredBy: 0,
      status: this.statusBoolean ? '0' : '1'
    };
    // console.log('CREATE PAYLOAD:', payload);
    this.networkService.createHost(payload).subscribe(
      (response: any) => {
        const body = response?.body || response;
        if (body?.serviceStatus === 'fail') {
          this.showSuccess = false;
          this.showError = true;
          this.errorMessage =
            body?.serviceError || 'Failed to create network';
          this.autoHideBanners();
          return;
        }
        this.showError = false;
        this.showSuccess = true;
        this.successMessage =
          body?.serviceMessage || 'Network created successfully';

        this.resetForm();
      },
      (error) => {
        this.showSuccess = false;
        this.showError = true;
        this.errorMessage =
          error?.error?.serviceMessage ||
          error?.error?.serviceError ||
          'Failed to create network';
        this.autoHideBanners();
      }
    );

  }

  updateNetworkConfig() {
    const missingFields: string[] = [];

    if (!this.hostName) missingFields.push('Host Name');
    if (!this.selectedHostGroups || this.selectedHostGroups.length === 0) {
      missingFields.push('Host Groups');
    }

    const snmpVersionNum = Number(this.snmpVersion);

    if (snmpVersionNum === 1 || snmpVersionNum === 2) {
      if (!this.snmpCommunity) missingFields.push('SNMP Community');
    }

    if (snmpVersionNum === 3) {
      if (!this.securityName) missingFields.push('SNMP Security Name');

      const secLevel = Number(this.securityLevel);

      if ((secLevel === 1 || secLevel === 2) &&
        (!this.authProtocol || !this.authPassphrase)) {
        missingFields.push('SNMP Auth Protocol and Passphrase');
      }

      if (secLevel === 2 &&
        (!this.privProtocol || !this.privPassphrase)) {
        missingFields.push('SNMP Priv Protocol and Passphrase');
      }
    }

    if (!this.interfaces || this.interfaces.length === 0) {
      missingFields.push('At least one Interface');
    }

    if (missingFields.length > 0) {
      this.showError = true;
      this.errorMessage =
        'Please fill in the following required fields:\n• ' +
        missingFields.join('\n• ');
      return;
    }

    const interfacesUpdate = this.interfaces.map(intf => {
      const base: any = {
        interfaceId: (intf as any).interfaceId,
        type: intf.type,
        main: 1,
        useIp: intf.connectTo === 'IP' ? 1 : 0,
        ip: intf.connectTo === 'IP' ? intf.ipAddr : '',
        dns: intf.connectTo === 'DNS' ? intf.dnsName : '',
        port: intf.port
      };

      if ((intf as any).interfaceId) {
        base.interfaceId = (intf as any).interfaceId;
      }

      if (intf.type === 2) {
        base.details = {
          version: snmpVersionNum,
          bulk: this.useCombinedRequests ? 1 : 0
        };

        if (snmpVersionNum === 1 || snmpVersionNum === 2) {
          base.details.community = this.snmpCommunity;
          if (snmpVersionNum === 2) {
            base.details.maxRepetitions = 10;
          }
        }

        if (snmpVersionNum === 3) {
          base.details.contextName = this.contextName || '';
          base.details.securityName = this.securityName;
          base.details.securityLevel = Number(this.securityLevel);

          if (Number(this.securityLevel) >= 1) {
            base.details.authProtocol = Number(this.authProtocol);
            base.details.authPassphrase = this.authPassphrase || '';
          }

          if (Number(this.securityLevel) === 2) {
            base.details.privProtocol = Number(this.privProtocol);
            base.details.privPassphrase = this.privPassphrase || '';
          }
        }
      }

      return base;
    });
    const payload: any = {
      appId: null,
      hostId: this.editingHostId,
      host: this.hostName,
      name: this.visibleName,
      description: this.description,
      templates: this.selectedTemplateIds.map(id => ({ templateId: id })),
      groups: this.selectedHostGroups.map(id => ({ groupId: id })),
      interfaces: interfacesUpdate,
      monitoredBy: 0,
      status: this.statusBoolean ? '0' : '1'
    };

    // console.log('UPDATE PAYLOAD:', payload);
    this.networkService.updateHost(payload).subscribe(
      (response: any) => {
        const body = response?.body || response;
        if (body?.serviceStatus === 'fail') {
          this.showUpdateSuccess = false;
          this.showError = true;
          this.errorMessage =
            body?.serviceError || 'Failed to update network';
          this.autoHideBanners();
          return;
        }
        this.showUpdateSuccess = true;
        this.showError = false;
        this.updateMessage =
          response?.body?.serviceMessage || 'Network updated successfully';
        this.autoHideBanners();
        this.isUpdation = false;
        this.isEditMode = false;
        this.getAllNetwork();
      },
      (error) => {
        this.showError = true;
        this.errorMessage =
          error?.error?.serviceMessage ||  error?.error?.serviceError || 'Failed to update network';
        this.autoHideBanners();
      }
    );
  }

  openDeleteModal(template: any, item: any) {
    this.selectedHostId = item.hostId;
    this.isDeleting = false;
    this.modalService.open(template, {
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }

  deleteNetworkConfig() {
    if (!this.selectedHostId) return;

    this.isDeleting = true;

    const hostIds = [this.selectedHostId];

    this.networkService.deleteHost(hostIds).subscribe(
      () => {
        this.seeAllTable = this.seeAllTable.filter(
          item => item.hostId !== this.selectedHostId
        );

        this.applyFilterAndPagination();
        this.showDelete = true;
        this.deleteMessage = 'Network configuration deleted successfully';
        this.autoHideBanners();
        this.modalService.dismissAll();
        this.selectedHostId = null;
        this.isDeleting = false;
        this.getAllNetwork();
      },
      error => {
        console.error('Error deleting host:', error);
        this.isDeleting = false;
      }
    );
  }

  private autoHideBanners(delay = 4000) {
    setTimeout(() => {
      this.showError = false;
      this.showSuccess = false;
      this.showUpdateSuccess = false;
      this.showDelete = false;
    }, delay);
  }


  @HostListener('document:click')
  closeDropdowns() {
    this.showHostDropdown = false;
    this.showTempDropdown = false;
    this.showAddHostGroupForm = false;
  }


onFileChange(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const ext = file.name.split('.').pop()?.toLowerCase();

  if (!['yaml', 'yml'].includes(ext)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid file',
      text: 'Only .yaml or .yml files are allowed'
    });
    event.target.value = '';
    return;
  }

  this.file = file;
}

onSubmit() {

  if (!this.file) {
    Swal.fire({
      icon: 'warning',
      title: 'Missing file',
      text: 'Please select a YAML file'
    });
    return;
  }

  const formData = new FormData();

  formData.append('format', 'yaml');
  formData.append('file', this.file);

  formData.append('createMissing', String(this.form.createMissing));
  formData.append('updateExisting', String(this.form.updateExisting));
  formData.append('deleteMissing', String(this.form.deleteMissing));

  this.networkService.importTemplate(formData)
    .subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Imported',
          text: res.serviceMessage || 'Template imported successfully'
        });
        this.getTemplate();
        this.reset(); 
        this.closeImport();
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Import failed',
          text: err?.error?.message || 'Something went wrong'
        });
      }
    });
}

reset() {
  this.form = {
    createMissing: true,
    updateExisting: true,
    deleteMissing: true
  };

  this.file = undefined as any;

  const fileInput = document.querySelector('.import-file') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
}

closeImport() {
  this.showImportModal = false;
}

openImportModal() {
  this.showImportModal = true;
}

}
