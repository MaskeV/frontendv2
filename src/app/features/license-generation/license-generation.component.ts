import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientManagementService } from '../../services/client-management.service';
import { ApiUserService } from '../../services/api-user.service';
import { LicenseService } from '../../services/license.service';
import { UserTypeCrudMapObject } from '../../models/UserTypeCrudMapObject';
import { DecoderService } from '../../services/decoder.service';
import { SanitizationService } from '../../services/sanitization.service';

interface Client {
  id: number;
  name: string;
  mailId: string;
  domainName: string;
  clientContactName1: string;
  clientContactNumber1: string;
  clientContactMailId1: string;
  clientContactName2: string;
  clientContactNumber2: string;
  clientContactMailId2: string;
  clientContactName3: string;
  clientContactNumber3: string;
  clientContactMailId3: string;
}

interface Units {
  fullstack: number;
  modules: number;
  ndu: number;
  users: number;
}

interface Validity {
  years: number;
  months: number;
  days: number;
}

interface LicenseRecord {
  id: number;
  licenseKey: string;
  issuedTo: string;
  issuedBy: string;
  createdBy: string;
  userEmail: string;
  clientDetails: any;
  issuedOn: string;
  licenseUnits: string;
  expiresOn: string;
  expiresRange: string;
  status: string;
  createdOn: string;
  updatedOn: string;
}

@Component({
  selector: 'app-license-generation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './license-generation.component.html',
  styleUrls: ['./license-generation.component.css']
})
export class LicenseGenerationComponent implements OnInit {

  private clientService = inject(ClientManagementService);
  private apiUserService = inject(ApiUserService);
  private licenseService = inject(LicenseService);
  private decoderService = inject(DecoderService);
  private sanitizationService = inject(SanitizationService);

  userTypeCrudMap = new UserTypeCrudMapObject();

  currentUser: any;
  userId: string = '';

  clients: Client[] = [];

  selectedClient: number | null = null;
  clientAddress: string = '';

  generatedLicenseId: number | null = null;
  showDownloadButton: boolean = false;

  // Edit mode
  isEditMode: boolean = false;
  editingLicenseId: number | null = null;

  // See All panel
  showAllLicenses: boolean = false;
  allLicenses: LicenseRecord[] = [];
  licensesLoading: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  readonly Math = Math;

  get totalPages(): number {
    return Math.ceil(this.allLicenses.length / this.pageSize) || 1;
  }

  get pagedLicenses(): LicenseRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.allLicenses.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const cur = this.currentPage;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (cur > 3) pages.push(-1);

    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (cur < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  units: Units = {
    fullstack: 0,
    modules: 0,
    ndu: 0,
    users: 0,
  };

  validity: Validity = {
    years: 0,
    months: 0,
    days: 0,
  };

  readonly MAX_UNITS = 9999;

  ngOnInit(): void {
    this.currentUser = this.apiUserService.getCurrentUser();

    this.userId =
      this.currentUser?.userId ||
      this.currentUser?.userid ||
      this.currentUser?.userName ||
      '';

    const licenseMapping = (this.currentUser as any)?.['crudData']?.['Admin-Config']?.['LicenseGeneration'];
    if (licenseMapping) {
      this.userTypeCrudMap = new UserTypeCrudMapObject();
      this.userTypeCrudMap.create = licenseMapping.create === 'true';
      this.userTypeCrudMap.edit = licenseMapping.edit === 'true';
      this.userTypeCrudMap.delete = licenseMapping.delete === 'true';
      this.userTypeCrudMap.view = licenseMapping.tabVisibility === 'true';
    }

    this.loadClients();
  }

  loadClients(): void {
    this.clientService.getAllClientDetails(this.userId).subscribe({
      next: (res: any) => {
        if (res.serviceStatus === 'Success') {
          this.clients = res.data.map((c: any) => ({
            id: c.client_id,
            name: c.client_name,
            mailId: c.mail_id,
            domainName: c.domain_name,
            clientContactName1: c.client_contact_name1,
            clientContactNumber1: c.client_contact_number1,
            clientContactMailId1: c.client_contact_mail_id1,
            clientContactName2: c.client_contact_name2,
            clientContactNumber2: c.client_contact_number2,
            clientContactMailId2: c.client_contact_mail_id2,
            clientContactName3: c.client_contact_name3,
            clientContactNumber3: c.client_contact_number3,
            clientContactMailId3: c.client_contact_mail_id3,
          }));
        }
      },
      error: (err: any) => {
        console.error('Error loading clients:', err);
      }
    });
  }

  // ─── Unit controls ────────────────────────────────────────────────────────

  increment(type: keyof Units): void {
    if (this.units[type] < this.MAX_UNITS) {
      this.units[type]++;
    }
  }

  decrement(type: keyof Units): void {
    if (this.units[type] > 0) {
      this.units[type]--;
    }
  }

  getPercent(type: keyof Units): number {
    return Math.min((this.units[type] / this.MAX_UNITS) * 100, 100);
  }

  // ─── Validity helpers ─────────────────────────────────────────────────────

  hasValiditySet(): boolean {
    return this.validity.years > 0 || this.validity.months > 0 || this.validity.days > 0;
  }

  getValidityText(): string {
    const parts: string[] = [];
    if (this.validity.years > 0) parts.push(`${this.validity.years} yr`);
    if (this.validity.months > 0) parts.push(`${this.validity.months} mo`);
    if (this.validity.days > 0) parts.push(`${this.validity.days} day`);
    return parts.join(' ');
  }

  hasAnySummary(): boolean {
    return this.units.fullstack > 0 || this.units.modules > 0 || this.units.ndu > 0 || this.units.users > 0;
  }

  isFormValid(): boolean {
    return !!this.selectedClient && this.hasValiditySet() && this.hasAnySummary();
  }

  onValidityChange(type: 'years' | 'months' | 'days'): void {
    if (type === 'years' && this.validity.years > 0) {
      this.validity.months = 0;
      this.validity.days = 0;
    }
    if (type === 'months' && this.validity.months > 0) {
      this.validity.years = 0;
      this.validity.days = 0;
    }
    if (type === 'days' && this.validity.days > 0) {
      this.validity.years = 0;
      this.validity.months = 0;
    }
  }

  getExpiryRange(): string {
    if (this.validity.years > 0) return `${this.validity.years} YEAR`;
    if (this.validity.months > 0) return `${this.validity.months} MONTH`;
    if (this.validity.days > 0) return `${this.validity.days} DAY`;
    return '';
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  resetForm(): void {
    this.selectedClient = null;
    this.clientAddress = '';
    this.showDownloadButton = false;
    this.generatedLicenseId = null;
    this.isEditMode = false;
    this.editingLicenseId = null;

    this.units = { fullstack: 0, modules: 0, ndu: 0, users: 0 };
    this.validity = { years: 0, months: 0, days: 0 };
  }

  // ─── Submit (Generate / Update) ───────────────────────────────────────────

  submitLicense(): void {
    if (!this.isFormValid()) return;

    const selectedClientData = this.clients.find(c => c.id === this.selectedClient);

    const payload = {
      issuedTo: `${selectedClientData?.name}`,
      clientId: this.selectedClient,
      issuedBy: 'ApMoSys',
      fullstackAllocated: this.units.fullstack,
      modulesAllocated: this.units.modules,
      nduAllocated: this.units.ndu,
      usersAllocated: this.units.users,
      userEmail: this.currentUser?.email || this.currentUser?.mailId || 'test@test.com',
      createdBy: this.currentUser?.userName || this.currentUser?.username || 'Admin',
      expiryRange: this.getExpiryRange(),
      clientAddress: this.clientAddress,
      clientContactName1: `${selectedClientData?.clientContactName1}`,
      clientContactNumber1: `${selectedClientData?.clientContactNumber1}`,
      clientContactMailId1: `${selectedClientData?.clientContactMailId1}`,
      clientContactName2: `${selectedClientData?.clientContactName2}`,
      clientContactNumber2: `${selectedClientData?.clientContactNumber2}`,
      clientContactMailId2: `${selectedClientData?.clientContactMailId2}`,
      clientContactName3: `${selectedClientData?.clientContactName3}`,
      clientContactNumber3: `${selectedClientData?.clientContactNumber3}`,
      clientContactMailId3: `${selectedClientData?.clientContactMailId3}`,
    };

    const sanitizedPayload = this.sanitizationService.sanitizePayload(payload);

    if (this.isEditMode && this.editingLicenseId !== null) {
      // ── Edit path: call generateLicenseWithID ──
      this.licenseService.generateLicenseWithID(this.editingLicenseId, payload).subscribe({
        next: (res: any) => {
          console.log('Update License Response:', res);
          if (res.serviceStatus === 'Success') {
            this.generatedLicenseId = res.id || res.data?.id || res.serviceResponse?.id || this.editingLicenseId;
            this.showDownloadButton = true;
            // Refresh the table if it is open
            if (this.showAllLicenses) {
              this.getAllLicensesDetails();
            }
          }
        },
        error: (err: any) => {
          console.error('Update License Error:', err);
        }
      });
    } else {
      // ── Create path ──
      this.licenseService.generateLicense(payload).subscribe({
        next: (res: any) => {
          console.log('Generate License Response:', res);
          if (res.serviceStatus === 'Success') {
            this.generatedLicenseId = res.id || res.data?.id || res.serviceResponse?.id;
            this.showDownloadButton = true;
          }
        },
        error: (err: any) => {
          console.error('Generate License Error:', err);
        }
      });
    }
  }

  downloadLicense(): void {
    if (!this.generatedLicenseId) return;
    this.licenseService.licenseFilesApi(this.generatedLicenseId);
  }

  // ─── See All Licenses ─────────────────────────────────────────────────────

  toggleAllLicenses(): void {
    this.showAllLicenses = !this.showAllLicenses;
    if (this.showAllLicenses && this.allLicenses.length === 0) {
      this.getAllLicensesDetails();
    }
  }

  getAllLicensesDetails(): void {
    this.licensesLoading = true;
    this.licenseService.getAllLicensesDetails().subscribe({
      next: (res: any) => {
        this.licensesLoading = false;
        if (res.serviceStatus === 'Success') {
          this.allLicenses = res.serviceResponse || [];
          this.currentPage = 1;
        }
      },
      error: (err: any) => {
        this.licensesLoading = false;
        console.error('Error loading licenses details:', err);
      }
    });
  }

  // ─── Edit a license row ───────────────────────────────────────────────────

  editLicense(license: LicenseRecord): void {
    this.isEditMode = true;
    this.editingLicenseId = license.id;
    this.showDownloadButton = false;
    this.generatedLicenseId = null;

    // Parse units from the licenseUnits string:
    // "{fullstackAllocated=10, modulesAllocated=100, nduAllocated=100000, usersAllocated=100}"
    const unitsStr = license.licenseUnits || '';
    this.units = {
      fullstack: this.parseUnitValue(unitsStr, 'fullstackAllocated'),
      modules: this.parseUnitValue(unitsStr, 'modulesAllocated'),
      ndu: this.parseUnitValue(unitsStr, 'nduAllocated'),
      users: this.parseUnitValue(unitsStr, 'usersAllocated'),
    };

    // Parse validity from expiresRange e.g. "1 MONTH", "18 DAY", "2 YEAR"
    this.validity = { years: 0, months: 0, days: 0 };
    const rangeMatch = (license.expiresRange || '').match(/^(\d+)\s+(YEAR|MONTH|DAY)S?$/i);
    if (rangeMatch) {
      const val = parseInt(rangeMatch[1], 10);
      const unit = rangeMatch[2].toUpperCase();
      if (unit === 'YEAR') this.validity.years = val;
      else if (unit === 'MONTH') this.validity.months = val;
      else if (unit === 'DAY') this.validity.days = val;
    }

    // Pre-select client by issuedTo name (best effort)
    const matchedClient = this.clients.find(c => c.name === license.issuedTo);
    this.selectedClient = matchedClient ? matchedClient.id : null;

    // Pre-fill address and URL from clientDetails if available
    if (license.clientDetails) {
      this.clientAddress = license.clientDetails.clientAddress || '';
    } else {
      this.clientAddress = '';
    }

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private parseUnitValue(unitsStr: string, key: string): number {
    const match = unitsStr.match(new RegExp(`${key}=(\\d+)`));
    return match ? parseInt(match[1], 10) : 0;
  }

  // ─── Table helpers ────────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return dateStr.split(' ')[0]; // show only date portion
  }

  getStatusClass(status: string): string {
    return status?.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
  }
}