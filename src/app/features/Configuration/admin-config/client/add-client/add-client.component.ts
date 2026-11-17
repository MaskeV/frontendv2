import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientManagementService } from '../../../../../services/client-management.service';
import { ApiUserService } from '../../../../../services/api-user.service';
import Swal from 'sweetalert2';
import { SanitizeInputDirective } from '../../../../../utility/sanitize-input.directive';
import { DecoderService } from '../../../../../services/decoder.service';
import { SanitizationService } from '../../../../../services/sanitization.service';

interface Client {
  clientId: number;
  clientName: string;
  domainName: string;
  domainTypeId?: number;
  isActive: string;
  createdBy: any;
  createdOn: string;
  createdByName?: string;
  updatedBy: any;
  updatedOn: string;
  updatedByName?: string;
  dataRetention?: string;
  dataRetentionValue?: number;
  dataRetentionUnit?: string;
  clientContactName1?: string;
  clientContactNumber1?: string;
  clientContactMailId1?: string;
  clientContactName2?: string;
  clientContactNumber2?: string;
  clientContactMailId2?: string;
  clientContactName3?: string;
  clientContactNumber3?: string;
  clientContactMailId3?: string;
  isEditing?: boolean;
}

@Component({
    selector: 'app-add-client',
    imports: [CommonModule, FormsModule,SanitizeInputDirective],
    templateUrl: './add-client.component.html',
    styleUrl: './add-client.component.css'
})
export class AddClientComponent implements OnInit {

  private clientService = inject(ClientManagementService);
  private apiUserService = inject(ApiUserService);
  private decoderService = inject(DecoderService);
  private sanitizationService = inject(SanitizationService);

  view: 'form' | 'table' = 'table'; // Defaulting to table to see list first

  currentUser: any;
  userId: string = '';

  clientObj = {
    clientName: '',
    domainTypeId: null as number | null,
    isActive: 'Y',
    clientContactName1: null as string | null,
    clientContactNumber1: null as string | null,
    clientContactMailId1: null as string | null,
    clientContactName2: null as string | null,
    clientContactNumber2: null as string | null,
    clientContactMailId2: null as string | null,
    clientContactName3: null as string | null,
    clientContactNumber3: null as string | null,
    clientContactMailId3: null as string | null,
    dataRetentionValue: null as number | null,
    dataRetentionUnit: ''
  };

  // Pagination and Search/Sort
  p: number = 1;
  itemsPerPage: number = 10;
  Math = Math;
  paginatedData: Client[] = [];
  filteredClients: Client[] = [];
  searchText: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  sortParam: string = '';

  canCreate: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;


  domainList: { id: number; domainName: string }[] = [];
  clientTableData: Client[] = [];

  get totalPages(): number {
    return Math.ceil((this.filteredClients?.length || 0) / Number(this.itemsPerPage));
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.p;
    if (total <= 5) return Array(total).fill(0).map((x, i) => i + 1);
    let start = Math.max(current - 2, 1);
    let end = Math.min(start + 4, total);
    if (end === total) start = Math.max(end - 4, 1);
    return Array.from({ length: (end - start + 1) }, (_, i) => start + i);
  }

  ngOnInit(): void {
    this.currentUser = this.apiUserService.getCurrentUser();
    this.userId = this.currentUser?.userId || this.currentUser?.userid || this.currentUser?.userName || '';

    // Security Redirect: Only Super Admin should access this component
    const userType = (this.currentUser?.userType || this.currentUser?.usertype || '').toString().trim();
    if (userType !== 'Super Admin') {
      const routerService = inject(Router);
      routerService.navigate(['/admin-config/client/clientappmapping']);
      return;
    }
    // ---- CRUD PERMISSIONS ----
    const clientMapping = (this.currentUser as any)?.['crudData']?.['Admin-Config']?.['client'];
    if (clientMapping) {
      this.canCreate = this.decoderService.decryptJson(clientMapping.create) === 'true';
      this.canEdit = this.decoderService.decryptJson(clientMapping.edit) === 'true';
      this.canDelete = this.decoderService.decryptJson(clientMapping.delete) === 'true';
    }

    this.loadDomains();
    this.loadClients();
  }

  loadDomains(): void {
    this.clientService.getDomainsList(this.userId).subscribe({
      next: (res: any) => {
        if (res.serviceStatus === 'Success') {
          this.domainList = res.data.map((d: any) => ({
            id: d.domain_id,
            domainName: d.domain_name
          }));
        }
      },
      error: (err: any) => console.error('Error loading domains:', err)
    });
  }

  loadClients(): void {
    this.clientService.getAllClientDetails(this.userId).subscribe({
      next: (res: any) => {
        if (res.serviceStatus === 'Success') {
          this.clientTableData = res.data.map((c: any) => {
            const retention = c.data_retention;

            let value = null;
            let unit = null;

            if (retention) {
              const parts = retention.split(' ');
              value = Number(parts[0]);
              unit = parts[1]?.replace('S', '');
            }

            const tableData = {
              clientId: c.client_id,
              clientName: c.client_name,
              domainName: c.domain_name,
              domainTypeId: c.domain_type_id,
              isActive: c.is_active,
              createdBy: c.created_by,
              createdOn: c.created_on ? c.created_on.split('T')[0] : '',
              createdByName: c.created_by_name,
              updatedBy: c.updated_by,
              updatedOn: c.updated_on ? c.updated_on.split('T')[0] : '',
              updatedByName: c.updated_by_name,
              dataRetention: retention,
              clientContactName1: c.client_contact_name1,
              clientContactNumber1: c.client_contact_number1,
              clientContactMailId1: c.client_contact_mail_id1,
              clientContactName2: c.client_contact_name2,
              clientContactNumber2: c.client_contact_number2,
              clientContactMailId2: c.client_contact_mail_id2,
              clientContactName3: c.client_contact_name3,
              clientContactNumber3: c.client_contact_number3,
              clientContactMailId3: c.client_contact_mail_id3,
              dataRetentionValue: value,
              dataRetentionUnit: unit
            }

            console.log("Table data: ", tableData);

            return tableData;
          });

          this.filteredClients = [...this.clientTableData];
          this.updatePaginatedData();
        }
      },
      error: (err: any) => console.error('Error loading clients:', err)
    });
  }

  showTable(): void {
    this.view = 'table';
    this.p = 1;
    this.searchText = '';
    this.filteredClients = [...this.clientTableData];
    this.updatePaginatedData();
  }
  showForm(): void { this.view = 'form'; }

  companyContact: any[] = [{}];

  addCompanyContact(): void {
    if (this.companyContact.length < 3) {
      this.companyContact.push({});
    }
  }

  removeCompanyContact(index: number): void {
    if (this.companyContact.length > 1) {
      this.companyContact.splice(index, 1);
    }
  }

  saveClient(): void {
    if (!this.clientObj.clientName || !this.clientObj.domainTypeId) {
      Swal.fire('Validation Error', 'Please fill mandatory fields', 'warning');
      return;
    }

    const contacts = this.companyContact;
    this.clientObj.clientContactName1 = contacts[0]?.name || null;
    this.clientObj.clientContactNumber1 = contacts[0]?.number || null;
    this.clientObj.clientContactMailId1 = contacts[0]?.email || null;
    this.clientObj.clientContactName2 = contacts[1]?.name || null;
    this.clientObj.clientContactNumber2 = contacts[1]?.number || null;
    this.clientObj.clientContactMailId2 = contacts[1]?.email || null;
    this.clientObj.clientContactName3 = contacts[2]?.name || null;
    this.clientObj.clientContactNumber3 = contacts[2]?.number || null;
    this.clientObj.clientContactMailId3 = contacts[2]?.email || null;

    // Email validation
    const emailsToCheck = [
      this.clientObj.clientContactMailId1,
      this.clientObj.clientContactMailId2,
      this.clientObj.clientContactMailId3,
    ];
    if (emailsToCheck.some(e => e && !this.isValidEmail(e))) {
      Swal.fire('Validation Error', 'Please enter a valid email address', 'warning');
      return;
    }

    // Number validation
    const numbersToCheck = [
      this.clientObj.clientContactNumber1,
      this.clientObj.clientContactNumber2,
      this.clientObj.clientContactNumber3,
    ];
    if (numbersToCheck.some(e => e && !this.isValidPhoneNumber(e))) {
      Swal.fire('Validation Error', 'Please enter a valid phone number', 'warning');
      return;
    }

    const payload = {
      ...this.clientObj,
      createdBy: this.currentUser?.id || 0
    };

    const safePayload = this.sanitizationService.sanitizePayload(payload);

    this.clientService.createClient(this.userId, safePayload).subscribe({
      next: (res: any) => {
        if (res.serviceStatus === '201' || res.serviceStatus === 'Success') {
          Swal.fire('Success', 'Client saved successfully', 'success');
          this.resetForm();
          this.loadClients();
          this.showTable();
        } else {
          Swal.fire('Error', res.message || 'Failed to save client', 'error');
        }
      },
      error: (err: any) => console.error('Error saving client:', err)
    });
  }

  resetForm(): void {
    this.clientObj = { clientName: '', domainTypeId: null, isActive: 'Y', dataRetentionValue: null,  clientContactName1: null, clientContactNumber1: null, clientContactMailId1: null, clientContactName2: null, clientContactNumber2: null, clientContactMailId2: null, clientContactName3: null, clientContactNumber3: null, clientContactMailId3: null, dataRetentionUnit: '' };
    this.companyContact = [{}];
  }

  enableEdit(client: Client): void {
    this.clientTableData.forEach(c => c.isEditing = false);
    client.isEditing = true;
  }

  saveEdit(client: Client): void {
    const payload = {
      clientName: client.clientName,
      domainTypeId: client.domainTypeId,
      isActive: client.isActive,
      dataRetentionValue: client.dataRetentionValue,
      dataRetentionUnit: client.dataRetentionUnit,
      clientContactName1: client.clientContactName1,
      clientContactNumber1: client.clientContactNumber1,
      clientContactMailId1: client.clientContactMailId1,
      clientContactName2: client.clientContactName2,
      clientContactNumber2: client.clientContactNumber2,
      clientContactMailId2: client.clientContactMailId2,
      clientContactName3: client.clientContactName3,
      clientContactNumber3: client.clientContactNumber3,
      clientContactMailId3: client.clientContactMailId3,
      updatedBy: this.currentUser?.id || 0
    };

    // Email validation
    const emailsToCheck = [
      payload.clientContactMailId1,
      payload.clientContactMailId2,
      payload.clientContactMailId3,
    ];
    if (emailsToCheck.some(e => e && !this.isValidEmail(e))) {
      Swal.fire('Validation Error', 'Please enter a valid email address', 'warning');
      return;
    }

    // Number validation
    const numbersToCheck = [
      payload.clientContactNumber1,
      payload.clientContactNumber2,
      payload.clientContactNumber3,
    ];
    if (numbersToCheck.some(e => e && !this.isValidPhoneNumber(e))) {
      Swal.fire('Validation Error', 'Please enter a valid phone number', 'warning');
      return;
    }

    console.log("Payload for Save Edit: ", payload);

    const safePayload = this.sanitizationService.sanitizePayload(payload);

    this.clientService.updateClient(client.clientId, this.userId, safePayload).subscribe({
      next: (res: any) => {
        if (res.serviceStatus === 'Success') {
          Swal.fire('Success', 'Client updated successfully', 'success');
          client.isEditing = false;
          this.loadClients();
        } else {
          Swal.fire('Error', res.message || 'Failed to update client', 'error');
        }
      },
      error: (err: any) => console.error('Error updating client:', err)
    });
  }

  cancelEdit(client: Client): void {
    client.isEditing = false;
    this.loadClients();
  }

  deleteClient(clientId: number): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to delete this client?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        this.clientService.deleteClient(clientId, this.userId).subscribe({
          next: (res: any) => {
            if (res.serviceStatus === 'Success') {
              Swal.fire('Deleted!', 'Client deleted successfully.', 'success');
              this.loadClients();
            } else {
              Swal.fire('Error', res.message || 'Failed to delete client', 'error');
            }
          },
          error: (err: any) => {
            console.error('Error deleting client:', err);
            Swal.fire('Error', 'An error occurred while deleting', 'error');
          }
        });
      }
    });
  }

  isLicenseModalOpen: boolean = false;
  licenseDetails: any = null;
  selectedClientForLicense: any = null;

  isDetailsModalOpen: boolean = false;
  detailsModalTitle: string = '';
  detailsModalType: string = '';
  detailsModalData: any[] = [];
  searchModalText: string = '';
  allDetailsModalData: any[] = [];

  // Fullstack License Host Grouping state variables
  fullstackHostGroups: any[] = [];
  filteredFullstackHostGroups: any[] = [];
  expandedHosts: { [key: string]: boolean } = {};

  normalizeCategory(value: string): string {
    if (!value) return '';
    const v = value.toUpperCase().replace(/[\s\-]/g, '_').trim();
    if (v === 'NONRELATIONAL') return 'NON-RELATIONAL';
    if (v === 'NON_RELATIONAL') return 'NON-RELATIONAL';
    return v;
  }

  getProductIcon(product: string): string {
    const p = this.normalizeCategory(product);
    const predefinedIcons: { [key: string]: string } = {
      'SERVICE': 'ri-pulse-line',
      'HOST': 'ri-server-line',
      'DATABASE': 'ri-database-2-line',
      'RELATIONAL': 'ri-database-2-line',
      'NON-RELATIONAL': 'ri-database-2-fill',
      'LINUX': 'ri-linux-line',
      'WINDOWS': 'ri-microsoft-line',
      'MSSQL': 'ri-database-2-line',
      'MYSQL': 'ri-database-2-line',
      'POSTGRESQL': 'ri-database-2-line',
      'ORACLE': 'ri-database-2-line',
      'MONGODB': 'ri-database-2-fill'
    };
    return predefinedIcons[p] || 'ri-server-line';
  }

  toggleHost(hostKey: string): void {
    this.expandedHosts[hostKey] = !this.expandedHosts[hostKey];
  }



  openDetailsModal(type: string): void {
    this.detailsModalType = type;
    if (type === 'Fullstack') {
      this.detailsModalTitle = 'Fullstack License Applications ';
    } else if (type === 'Modules') {
      this.detailsModalTitle = 'Modules License Applications ';
    } else if (type === 'NDU') {
      this.detailsModalTitle = 'NDU License Applications ';
    } else if (type === 'Users') {
      this.detailsModalTitle = 'Users License';
    }

    if (this.selectedClientForLicense?.clientId) {
      this.expandedHosts = {}; // Reset expanded host states
      const userType = this.currentUser?.userType || this.currentUser?.usertype || '';

      this.clientService.getClientMappedDataByClientId(this.selectedClientForLicense.clientId, this.userId, userType).subscribe({
        next: (mappedRes: any) => {
          const validHostNames = new Set<string>();
          if (mappedRes.serviceStatus === 'Success' && mappedRes.data && mappedRes.data.length > 0) {
            const clientData = mappedRes.data[0];
            const licenseTypeObj = (clientData.licenseTypes || []).find((lt: any) => 
              (lt.licenseType || '').toLowerCase() === type.toLowerCase()
            );
            if (licenseTypeObj) {
              (licenseTypeObj.applications || []).forEach((app: any) => {
                if ((app.applicationType || '').toUpperCase() === 'HOST') {
                  validHostNames.add(app.applicationName);
                }
              });
            }
          }

          this.clientService.getClientLicenseTypeDetails(this.selectedClientForLicense.clientId, type).subscribe({
            next: (res: any) => {
              if (res.serviceStatus === 'Success') {
                if (type === 'Fullstack') {
                  const rawGroups = res.fullstackLicenseApplicationsMap || [];
                  const processedGroups: any[] = [];
                  const noAssociatedApps: any[] = [];

                  rawGroups.forEach((group: any) => {
                    const hostName = group.hostName || '';
                    const apps = group.apps || [];

                    const isNoAssociatedHost = hostName === 'No Associated Host Application';
                    const isValidHost = validHostNames.has(hostName);

                    if (isNoAssociatedHost || isValidHost) {
                      processedGroups.push(group);
                    } else {
                      noAssociatedApps.push(...apps);
                    }
                  });

                  if (noAssociatedApps.length > 0) {
                    let noAssocGroup = processedGroups.find(g => g.hostName === 'No Associated Host Application');
                    if (!noAssocGroup) {
                      noAssocGroup = {
                        hostName: 'No Associated Host Application',
                        ipAddress: '',
                        apps: []
                      };
                      processedGroups.push(noAssocGroup);
                    }
                    const existingAppKeys = new Set(noAssocGroup.apps.map((app: any) => app.name + '_' + app.type));
                    noAssociatedApps.forEach((app: any) => {
                      const key = app.name + '_' + app.type;
                      if (!existingAppKeys.has(key)) {
                        noAssocGroup.apps.push(app);
                        existingAppKeys.add(key);
                      }
                    });
                  }

                  this.fullstackHostGroups = processedGroups;
                  this.filteredFullstackHostGroups = [...this.fullstackHostGroups];

                  this.detailsModalData = this.fullstackHostGroups;
                  this.allDetailsModalData = [...this.detailsModalData];
                  this.searchModalText = '';
                  this.isDetailsModalOpen = true;
                } else if (type === 'Modules') {
                  this.detailsModalData = res.modulesLicenseApplicationsMap || [];
                  this.allDetailsModalData = [...this.detailsModalData];
                  this.searchModalText = '';
                  this.isDetailsModalOpen = true;
                } else if (type === 'NDU') {
                  this.detailsModalData = res.nduLicenseApplicationsMap || [];
                  this.allDetailsModalData = [...this.detailsModalData];
                  this.searchModalText = '';
                  this.isDetailsModalOpen = true;
                } else if (type === 'Users') {
                  this.detailsModalData = res.usersLicenseMap || [];
                  this.allDetailsModalData = [...this.detailsModalData];
                  this.searchModalText = '';
                  this.isDetailsModalOpen = true;
                } else {
                  this.detailsModalData = [];
                  this.allDetailsModalData = [...this.detailsModalData];
                  this.searchModalText = '';
                  this.isDetailsModalOpen = true;
                }
              } else {
                Swal.fire('Error', res.message || 'Failed to load details', 'error');
              }
            },
            error: () => {
              Swal.fire('Error', 'Failed to communicate with server', 'error');
            }
          });
        },
        error: () => {
          Swal.fire('Error', 'Failed to communicate with server', 'error');
        }
      });
    } else {
      this.detailsModalData = [];
      this.allDetailsModalData = [];
      this.searchModalText = '';
      this.isDetailsModalOpen = true;
    }
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    this.detailsModalData = [];
    this.allDetailsModalData = [];
    this.searchModalText = '';
  }

  filterModalData(): void {
    const query = this.searchModalText ? this.searchModalText.toLowerCase().trim() : '';
    if (!query) {
      this.detailsModalData = [...this.allDetailsModalData];
      this.filteredFullstackHostGroups = [...this.fullstackHostGroups];
      return;
    }

    if (this.detailsModalType === 'Fullstack') {
      this.filteredFullstackHostGroups = this.fullstackHostGroups.filter(group => {
        const matchesHost = (group.hostName || '').toLowerCase().includes(query) ||
                            (group.ipAddress || '').toLowerCase().includes(query);
        const matchesApps = (group.apps || []).some((app: any) =>
          (app.name || '').toLowerCase().includes(query) ||
          (app.type || '').toLowerCase().includes(query)
        );
        return matchesHost || matchesApps;
      });
    } else {
      this.detailsModalData = this.allDetailsModalData.filter(item => {
        if (this.detailsModalType === 'Users') {
          return (item.userName || '').toLowerCase().includes(query) || 
                 (item.roleName || '').toLowerCase().includes(query);
        } else {
          return (item.applicationName || '').toLowerCase().includes(query) || 
                 (item.applicationType || '').toLowerCase().includes(query);
        }
      });
    }
  }

  viewLicense(client: any): void {
    this.selectedClientForLicense = client;
    this.clientService.getClientLicenseDetails(client.clientId).subscribe({
      next: (res: any) => {
        if (res.serviceStatus === 'Success') {
          this.licenseDetails = res.clientLicenseDetails;
          this.isLicenseModalOpen = true;
        } else {
          Swal.fire('Error', res.message || 'Failed to load license details', 'error');
        }
      },
      error: (err: any) => {
        console.error('Error fetching license details:', err);
        Swal.fire('Error', 'An error occurred while fetching license details', 'error');
      }
    });
  }

  closeLicenseModal(): void {
    this.isLicenseModalOpen = false;
    this.licenseDetails = null;
    this.selectedClientForLicense = null;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhoneNumber(phone: string): boolean {
    return /^\d{10}$/.test((phone || '').trim());
  }

  onPageSizeChange(value: any) {
    this.itemsPerPage = parseInt(value, 10);
    this.p = 1;
    this.updatePaginatedData();
  }

  updatePaginatedData() {
    const startIndex = (this.p - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.filteredClients.slice(startIndex, endIndex);
  }

  search() {
    const term = this.searchText.toLowerCase().trim();
    if (!term) {
      this.filteredClients = [...this.clientTableData];
    } else {
      this.filteredClients = this.clientTableData.filter(c =>
        (c.clientName?.toLowerCase().includes(term)) ||
        (c.clientContactName1?.toLowerCase().includes(term)) ||
        (c.clientContactName2?.toLowerCase().includes(term)) ||
        (c.clientContactName3?.toLowerCase().includes(term)) ||
        (c.clientContactMailId1?.toLowerCase().includes(term)) ||
        (c.clientContactMailId2?.toLowerCase().includes(term)) ||
        (c.clientContactMailId3?.toLowerCase().includes(term))
      );
    }
    this.p = 1;
    this.updatePaginatedData();
  }

  sortBy(column: string) {
    if (this.sortParam === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortParam = column;
      this.sortDirection = 'asc';
    }

    if (column === 'dataRetention') {
      this.filteredClients.sort((a: any, b: any) => {

        const getDays = (val: string) => {
          if (!val) return 0;

          const parts = val.split(' ');
          const num = Number(parts[0]);
          const unit = parts[1];

          switch (unit) {
            case 'DAY':
              return num;
            case 'MONTH':
              return num * 30;
            case 'YEAR':
              return num * 365;
            default:
              return 0;
          }
        };

        const valA = getDays(a.dataRetention);
        const valB = getDays(b.dataRetention);

        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      });

      this.updatePaginatedData();
      return;
    } else {
      this.filteredClients.sort((a: any, b: any) => {
        let valA = a[column];
        let valB = b[column];

        // Handle null/undefined
        if (valA == null) valA = '';
        if (valB == null) valB = '';

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      this.p = 1;
      this.updatePaginatedData();

    }
  }

  nextPage() {
    if (this.p < this.totalPages) {
      this.p++;
      this.updatePaginatedData();
    }
  }

  prevPage() {
    if (this.p > 1) {
      this.p--;
      this.updatePaginatedData();
    }
  }

  goToPage(page: number) {
    this.p = page;
    this.updatePaginatedData();
  }
}