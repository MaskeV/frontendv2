import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ProxyConfigurationService } from '../../../../services/proxy-configuration.service';
import { DecoderService } from '../../../../services/decoder.service';
import { ApiUserService } from '../../../../services/api-user.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { User } from '../../../../models/user';
import { SanitizeInputDirective } from '../../../../utility/sanitize-input.directive';
import { SanitizationService } from '../../../../services/sanitization.service';


@Component({
  selector: 'app-proxy-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, SanitizeInputDirective],
  templateUrl: './proxy-configuration.component.html',
  styleUrl: './proxy-configuration.component.css'
})
export class ProxyConfigurationComponent implements OnInit {

  allowedIps: string[] = [];
  selectedIps: Set<string> = new Set();

  isLoading = false;
  isDeleting = false;
  isAdding = false;
  isRestarting = false;

  newIpInput = '';
  addError = '';
  addSuccess = '';
  deleteError = '';
  deleteSuccess = '';
  fetchError = '';

  canCreate: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;
  // currentUser: any;


  private currentUser: User | null = null;

  // currentUser.id is the encrypted numeric id — e.g. "U2FsdGVkX1/MhFJrjo3..."
  // It is typed as number to match the backend DTO expectation
  private get userId(): number {
    return this.currentUser?.id ?? 0;
  }


  constructor(private proxyService: ProxyConfigurationService, private apiUserService: ApiUserService,
    private decoderService: DecoderService,  private authService: AuthenticationService,
    private sanitizationService: SanitizationService) {
        this.authService.currentUser.subscribe(user => this.currentUser = user);
     }

  ngOnInit(): void {
    this.currentUser = this.apiUserService.getCurrentUser();

    // ---- CRUD PERMISSIONS ----
    const proxyMapping = (this.currentUser as any)?.['crudData']?.['Admin-Config']?.['proxy-config'];
    if (proxyMapping) {
      this.canCreate = this.decoderService.decryptJson(proxyMapping.create) === 'true';
      this.canEdit = this.decoderService.decryptJson(proxyMapping.edit) === 'true';
      this.canDelete = this.decoderService.decryptJson(proxyMapping.delete) === 'true';
    }

    // ---- DEBUG LOG ----
    // console.log('[ProxyConfig] User:', this.currentUser?.userId, '|', this.currentUser?.userType);
    // console.log('[ProxyConfig] Permissions → Create:', this.canCreate, '| Edit:', this.canEdit, '| Delete:', this.canDelete);

    this.fetchAllowedIps();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private showAuditingLoader(): void {
    Swal.fire({
      title: 'Auditing...',
      text: 'Verifying action with audit service.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });
  }

  private handleError(err: any, auditFailMsg: string, actionFailMsg: string): void {
    const isAuditFail = err?.message?.toLowerCase().includes('audit failed');
    Swal.fire({
      icon: 'error',
      title: isAuditFail ? 'Audit Failed' : 'Action Failed',
      text: isAuditFail ? auditFailMsg : actionFailMsg
    });
    console.error(err);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  fetchAllowedIps(): void {
    this.isLoading = true;
    this.fetchError = '';
    this.proxyService.getAllowedIps().subscribe({
      next: (ips) => {
        this.allowedIps = ips;
        this.selectedIps.clear();
        this.isLoading = false;
      },
      error: (err) => {
        this.fetchError = 'Failed to fetch IPs. Check server connection.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  toggleSelect(ip: string): void {
    this.selectedIps.has(ip) ? this.selectedIps.delete(ip) : this.selectedIps.add(ip);
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    checked
      ? this.allowedIps.forEach(ip => this.selectedIps.add(ip))
      : this.selectedIps.clear();
  }

  get isAllSelected(): boolean {
    return this.allowedIps.length > 0 && this.selectedIps.size === this.allowedIps.length;
  }

  get isIndeterminate(): boolean {
    return this.selectedIps.size > 0 && this.selectedIps.size < this.allowedIps.length;
  }

  // ── Add IPs ───────────────────────────────────────────────────────────────

  addIps(): void {
    this.addError = '';
    this.addSuccess = '';

    const raw = this.newIpInput.trim();
    if (!raw) { this.addError = 'Please enter at least one IP address.'; return; }

    const ips = raw.split(/[\s,\n]+/).map(ip => ip.trim()).filter(Boolean);
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const invalid = ips.filter(ip => !ipRegex.test(ip));
    if (invalid.length) { this.addError = `Invalid IP format: ${invalid.join(', ')}`; return; }

    this.isAdding = true;

    const safeIps = this.sanitizationService.sanitizePayload(ips);

    this.proxyService.addAllowedIps(safeIps, this.userId).subscribe({
      next: () => {
        this.isAdding = false;
        this.addSuccess = `${ips.length} IP(s) added successfully.`;
        this.newIpInput = '';
        this.fetchAllowedIps();
        setTimeout(() => this.addSuccess = '', 3000);
      },
      error: (err) => {
        this.isAdding = false;
        const isAuditFail = err?.message?.toLowerCase().includes('audit failed');
        this.addError = isAuditFail
          ? 'Audit service rejected this action. IPs were not added.'
          : 'Failed to add IPs. Please try again.';
        console.error(err);
      }
    });
  }

  // ── Delete IPs ────────────────────────────────────────────────────────────

  deleteSelected(): void {
    if (this.selectedIps.size === 0) {
      Swal.fire({ icon: 'warning', title: 'No IP Selected', text: 'Please select at least one IP to delete.' });
      return;
    }

    const ipsToDelete = Array.from(this.selectedIps);

    Swal.fire({
      title: 'Are you sure?',
      html: `
        <div style="text-align:left">
          <p>You are about to delete the following IP(s):</p>
          <ul style="max-height:150px;overflow:auto">
            ${ipsToDelete.map(ip => `<li>${ip}</li>`).join('')}
          </ul>
        </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.isDeleting = true;
      this.deleteError = '';
      this.deleteSuccess = '';
      this.showAuditingLoader();

      const safeIpsToDelete = this.sanitizationService.sanitizePayload(ipsToDelete);

      this.proxyService.deleteAllowedIps(safeIpsToDelete, this.userId).subscribe({
        next: () => {
          this.isDeleting = false;
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `${ipsToDelete.length} IP(s) deleted successfully.`,
            timer: 2000,
            showConfirmButton: false
          });
          this.fetchAllowedIps();
        },
        error: (err) => {
          this.isDeleting = false;
          this.handleError(err,
            'Audit service rejected this action. Delete was not performed.',
            'Failed to delete IPs. Please try again.'
          );
        }
      });
    });
  }

  // ── Restart HAProxy ───────────────────────────────────────────────────────

  restartHaproxy(): void {
    Swal.fire({
      title: 'Restart HAProxy?',
      html: `<div style="text-align:center">This action will restart the HAProxy service immediately.</div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Restart',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.isRestarting = true;
      this.showAuditingLoader();

      this.proxyService.restartHaproxy(this.userId).subscribe({
        next: () => {
          this.isRestarting = false;
          Swal.fire({
            icon: 'success',
            title: 'HAProxy Restarted',
            text: 'HAProxy service restarted successfully.',
            timer: 2200,
            showConfirmButton: false
          });
          this.fetchAllowedIps();
        },
        error: (err) => {
          this.isRestarting = false;
          this.handleError(err,
            'Audit service rejected this action. HAProxy was not restarted.',
            'Failed to restart HAProxy. Please try again.'
          );
        }
      });
    });
  }
}