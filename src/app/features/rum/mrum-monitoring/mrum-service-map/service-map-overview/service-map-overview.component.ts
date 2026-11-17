import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-service-map-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-map-overview.component.html',
  styleUrl: './service-map-overview.component.css'
})
export class ServiceMapOverviewComponent {
  @Input() context: any;

  get selectedMetric() { return this.context?.selectedMetric || 'usagePercent'; }
  set selectedMetric(val: string) { if (this.context) this.context.selectedMetric = val; }
  
  get sortField() { return this.context?.sortField || ''; }
  get sortDirection() { return this.context?.sortDirection || ''; }
  get paginatedData() { return this.context?.paginatedData || []; }
  get countryData() { return this.context?.countryData || []; }
  get mapCurrentPage() { return this.context?.mapCurrentPage || 1; }
  get totalPagesArray() { return this.context?.totalPagesArray || []; }
  get totalPages() { return this.context?.totalPages || 0; }
  
  updateMap() { return this.context?.updateMap(); }
  setSort(field: string) { return this.context?.setSort(field); }
  changePage(page: number) { return this.context?.changePage(page); }
}
