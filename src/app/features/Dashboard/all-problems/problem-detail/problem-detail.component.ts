import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationService } from '../../../../services/application.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-problem-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './problem-detail.component.html',
  styleUrl: './problem-detail.component.css'
})
export class ProblemDetailComponent implements OnInit {
  pid: number | null = null;
  triggerRows: any[] = [];
  sortedRows: any[] = [];
  loading = true;
  error = '';
  currentUser: any = null;
  sortDirection: 'asc' | 'desc' = 'asc'; // default: oldest first

  get lastRow(): any {
    return this.triggerRows.length ? this.triggerRows[this.triggerRows.length - 1] : {};
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private applicationService: ApplicationService,
    private authService: AuthenticationService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.authService.currentUser.subscribe((user: any) => {
      this.currentUser = user;
      this.route.paramMap.subscribe(params => {
        const pidParam = params.get('pid');
        if (pidParam) {
          this.pid = +pidParam;
          this.loadTriggerDetails(this.pid);
        }
      });
    });
  }

  loadTriggerDetails(pid: number) {
    if (!this.currentUser) return;
    this.loading = true;
    this.error = '';
    this.applicationService.getProblemTriggerDetails(pid, this.currentUser.userId, this.currentUser.userType).subscribe({
      next: (res: any) => {
        this.triggerRows = res?.serviceResponse || [];
        this.sortedRows = [...this.triggerRows];
        this.sortRows();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load problem details.';
        this.loading = false;
      }
    });
  }

  toggleSort() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortRows();
  }

  sortRows() {
    this.sortedRows = [...this.triggerRows].sort((a, b) => {
      const getTime = (row: any) => {
        // prefer a dedicated createdOn field if present, fallback to parsing HTML
        if (row.createdOn) return new Date(row.createdOn).getTime();
        const m = (row.currentThresholdValue || '').match(/(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/);
        return m ? new Date(m[1]).getTime() : 0;
      };
      return this.sortDirection === 'asc' ? getTime(a) - getTime(b) : getTime(b) - getTime(a);
    });
  }


  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  goBack() {
    this.router.navigate(['/allProblems']);
  }

  getThresholdClass(type: string): string {
    if (!type) return 'badge-normal';
    const t = type.toLowerCase();
    if (t === 'critical') return 'badge-critical';
    if (t === 'warning') return 'badge-warning';
    return 'badge-normal';
  }

  getStateClass(state: string): string {
    if (!state) return 'state-closed';
    return state.toLowerCase() === 'open' ? 'state-open' : 'state-closed';
  }

  getMailsForRow(row: any): { level: string; levelNum: number; cls: string; email: string }[] {
    const result = [];
    if (row.level1MailId) result.push({ level: 'L1', levelNum: 1, cls: 'l1', email: row.level1MailId });
    if (row.level2MailId) result.push({ level: 'L2', levelNum: 2, cls: 'l2', email: row.level2MailId });
    if (row.level3MailId) result.push({ level: 'L3', levelNum: 3, cls: 'l3', email: row.level3MailId });
    return result;
  }
}