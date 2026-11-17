import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dependency-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dependency-overview.component.html',
  styleUrl: './dependency-overview.component.css'
})
export class DependencyOverviewComponent {
  @Input() context: any;

  get dependencyFilters() { return this.context?.dependencyFilters || {}; }
  get versionList() { return this.context?.versionList || []; }
  get deviceList() { return this.context?.deviceList || []; }
  get osversionList() { return this.context?.osversionList || []; }
  get paginatedDependency() { return this.context?.paginatedDependency || []; }
  get totalDependencyPages() { return this.context?.totalDependencyPages || 0; }
  get currentDependencyPage() { return this.context?.currentDependencyPage || 1; }
  get dependencyPaginationPages() { return this.context?.dependencyPaginationPages || []; }
  getDependencies() { return this.context?.getDependencies(); }
  changeDependencyPage(page: number) { return this.context?.changeDependencyPage(page); }
  buildQueryParamsDependencies(dep: string) { return this.context?.buildQueryParamsDependencies(dep) || {}; }
}
