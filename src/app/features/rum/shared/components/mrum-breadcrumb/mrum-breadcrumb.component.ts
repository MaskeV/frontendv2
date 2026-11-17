import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  queryParams?: any;
  queryParamsHandling?: 'merge' | 'preserve' | '';
  isClickableBack?: boolean;
}

@Component({
  selector: 'app-mrum-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mrum-breadcrumb.component.html',
  styleUrl: './mrum-breadcrumb.component.css',
})
export class MrumBreadcrumbComponent {
  @Input() breadcrumbs: BreadcrumbItem[] = [];
  @Output() backClicked = new EventEmitter<void>();

  onBackClick(event: Event) {
    event.preventDefault();
    this.backClicked.emit();
  }
}
