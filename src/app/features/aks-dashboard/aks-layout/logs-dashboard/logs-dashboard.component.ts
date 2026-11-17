import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { KubernetesService } from '../../../../services/kubernetes.service';
import { DateService } from '../../../../services/date.service';
import { filter, Subject, Subscription, switchMap } from 'rxjs';

@Component({
    selector: 'app-logs-dashboard',
    imports: [CommonModule, HighchartsChartModule, FormsModule],
    templateUrl: './logs-dashboard.component.html',
    styleUrl: './logs-dashboard.component.css',
    encapsulation: ViewEncapsulation.None // Needed for dynamic HTML styles
})
export class LogsDashboardComponent implements OnInit {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;

  Highcharts: typeof Highcharts = Highcharts;
  logsChartOptions!: Highcharts.Options;

  constructor(
    private k8sService: KubernetesService,
    private sanitizer: DomSanitizer,
    private dateService: DateService
  ) { }

  // Filters
  filters: { key: string; value: string }[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalHits = 0;
  nextPageToken: string | null = null;
  Math = Math; // For pagination calculation in template
  logs: any[] = [];

  // Sidebar State
  isSidebarOpen = false;
  selectedLog: any = null;
  sidebarWidth = 600;
  sidebarTab: 'table' | 'json' = 'table';

  // Sidebar Fields Table
  allFields: { key: string; value: any }[] = [];
  displayedFields: { key: string; value: any }[] = [];
  fieldSearch = '';
  fieldPage = 1;
  fieldPageSize = 25;
  totalFields = 0;

  // Resizing state
  isResizing = false;
  startX = 0;
  startWidth = 0;

  hostName!: string;

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForLogsDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForLogsDashboard')!;
    this.dateService.setActiveComponent('LogsDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'LogsDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.initChart();
        this.fetchLogs();
      });

  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  openSidebar(log: any) {
    this.selectedLog = log;
    this.isSidebarOpen = true;
    this.flattenLog(log);
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    this.selectedLog = null;
  }

  switchSidebarTab(tab: 'table' | 'json') {
    this.sidebarTab = tab;
  }

  startResize(event: MouseEvent) {
    this.isResizing = true;
    this.startX = event.clientX;
    this.startWidth = this.sidebarWidth;
    document.addEventListener('mousemove', this.resize);
    document.addEventListener('mouseup', this.stopResize);
  }

  resize = (event: MouseEvent) => {
    if (this.isResizing) {
      const dx = this.startX - event.clientX;
      this.sidebarWidth = Math.max(300, Math.min(this.startWidth + dx, 1000));
    }
  };

  stopResize = () => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.resize);
    document.removeEventListener('mouseup', this.stopResize);
  };

  /* ================= FIELD FLATTENING & SEARCH ================= */
  flattenLog(log: any) {
    this.allFields = [];

    const recurse = (obj: any, prefix = '') => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const val = obj[key];
          const newKey = prefix ? `${prefix}.${key}` : key;

          if (val && typeof val === 'object' && !Array.isArray(val)) {
            recurse(val, newKey);
          } else {
            this.allFields.push({ key: newKey, value: val });
          }
        }
      }
    };

    recurse(log);
    // Sort alphabetically by key
    this.allFields.sort((a, b) => a.key.localeCompare(b.key));
    this.filterFields();
  }

  filterFields() {
    let filtered = this.allFields;

    // Filter by search
    if (this.fieldSearch) {
      const searchLower = this.fieldSearch.toLowerCase();
      filtered = filtered.filter(f =>
        f.key.toLowerCase().includes(searchLower) ||
        String(f.value).toLowerCase().includes(searchLower)
      );
    }

    this.totalFields = filtered.length;

    // Pagination
    const start = (this.fieldPage - 1) * this.fieldPageSize;
    const end = start + this.fieldPageSize;
    this.displayedFields = filtered.slice(start, end);
  }

  onFieldSearchChange() {
    this.fieldPage = 1;
    this.filterFields();
  }

  changeFieldPage(page: number) {
    this.fieldPage = page;
    this.filterFields();
  }

  /* ================= FILTERS ================= */
  addFilter() {
    this.filters.push({ key: '', value: '' });
  }

  removeFilter(index: number) {
    this.filters.splice(index, 1);
  }

  applyFilters() {
    this.currentPage = 1;
    this.fetchLogs();
  }

  /* ================= PAGINATION ================= */
  changePage(page: number) {
    this.currentPage = page;
    this.fetchLogs();
  }

  /* ================= FETCH LOGS ================= */
  fetchLogs() {
    // Hardcoded params for now as per user request example
    const hostName = this.hostName;
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();

    this.k8sService.getLogsList(
      hostName,
      st,
      et,
      this.pageSize,
      this.currentPage,
      this.filters
    ).subscribe((data: any) => {
      this.logs = data.logs;
      this.totalHits = data.totalHits;
      this.nextPageToken = data.nextPageToken;
    });
  }

  toggleRow(log: any) {
    this.openSidebar(log);
  }

  private initChart() {
    // Hardcoded params for now as per user request example
    const hostName = this.hostName;
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();

    this.k8sService.getLogsLevelsOverTime(hostName, st, et).subscribe((data: any[]) => {
      const categories = data.map(d => this.formatTime(d.time_bucket));
      const infoSeries = data.map(d => d.info_count);
      const errorSeries = data.map(d => d.error_count);
      const warnSeries = data.map(d => d.warn_count);

        if (data.length === 0) {
          this.logsChartOptions = undefined as any;
          return;
        }

        this.logsChartOptions = {
          chart: { type: 'column', height: 220, style: { fontSize: '12px' } },
          title: { text: undefined },
          xAxis: {
            categories: categories,
            title: { text: 'Time' }
          },
          yAxis: { title: { text: 'Log Count' } },
          /* ================= SAME PREMIUM TOOLTIP ================= */
          tooltip: {
            shared: true,
            useHTML: true,
            outside: false,
            stickOnContact: true,
            hideDelay: 200,

            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 10,
            shadow: false,

            formatter: function () {
              const ctx: any = this;

              let html = `
              <div style="
                max-height:160px;
                overflow-y:auto;
                padding:8px 10px;
                font-size:11.5px;
                font-family:Inter,system-ui,sans-serif;
                color:#0f172a;
                border-radius:10px;
                box-shadow:
                  0 8px 20px rgba(0,0,0,0.08),
                  0 2px 6px rgba(0,0,0,0.04);
              ">
                <div style="font-weight:600;margin-bottom:8px">
                  ${ctx.points[0].key}
                </div>
            `;

              ctx.points.forEach((p: any) => {
                html += `
                <div style="
                  display:flex;
                  align-items:center;
                  gap:6px;
                  margin-bottom:4px;
                ">
                  <span style="color:${p.color};font-size:12px;">●</span>
                  <span>
                    ${p.series.name} :
                    <b>${p.y}</b>
                  </span>
                </div>
              `;
              });

              return html + `</div>`;
            }
          },
        plotOptions: {
          column: {
            stacking: 'normal',
            borderRadius: 3
          }
        },
        colors: ['#2f7ed8', '#0d233a', '#d9534f', '#f0ad4e'], // Colors for Total, Info, Error, Warn
        series: [
          { type: 'column', name: 'Info', data: infoSeries, color: '#3b82f6' },
          { type: 'column', name: 'Error', data: errorSeries, color: '#ef4444' },
          { type: 'column', name: 'Warn', data: warnSeries, color: '#f59e0b' }
        ],
        credits: { enabled: false }
      };
    });
  }

  private formatTime(timeBucket: string): string {
  if (!timeBucket) {
    return '';
  }

  if(timeBucket.length === 8){
    const dd = timeBucket.substring(6,8);
    return `${dd}`
  }

  // Hour-level: YYYYMMDDHH
  if (timeBucket.length === 10) {
    const hh = timeBucket.substring(8, 10);
    return `${hh}:00`;
  }

  // Minute-level: YYYYMMDDHHmm
  if (timeBucket.length === 12) {
    const hh = timeBucket.substring(8, 10);
    const mm = timeBucket.substring(10, 12);
    return `${hh}:${mm}`;
  }

  console.warn('Unknown time_bucket format:', timeBucket);
  return timeBucket;
}


  getFormattedLog(): SafeHtml {
    if (!this.selectedLog) return '';
    const jsonString = JSON.stringify(this.selectedLog, undefined, 2);
    const highlighted = this.syntaxHighlight(jsonString);
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  private syntaxHighlight(json: string): string {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  }
}
