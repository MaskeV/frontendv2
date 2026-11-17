import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-trace-details-modal',
    imports: [CommonModule, FormsModule],
    templateUrl: './trace-details-modal.component.html',
    styleUrl: './trace-details-modal.component.css'
})
export class TraceDetailsModalComponent {

  @Input() modalData: any;  // Single input for modal data

  @Output() closeModal = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void { }

  onCloseModal(): void {
    this.closeModal.emit();
  }

  getFormattedTags(): string {
    if (!this.modalData?.tags || this.modalData.tags.length === 0) {
      return 'No tags available';
    }
    return this.modalData.tags.map((tag: { key: any; value: any; }) => `${tag.key}:${tag.value}`).join('\n');
  }

  getFormattedLogs(): string {
    if (!this.modalData?.logs || this.modalData.logs.length === 0) {
      return 'No Logs available';
    }
    return this.modalData.logs.map((logEntry: any) => logEntry.data.map((log: { key: any; value: any }) => `${log.key} ==> ${log.value}`).join('\n')).join('\n\n');
  }

  getClassFromEndpoint(): string {
    // Check if endpointName contains '/' and split it
    const parts = this.modalData?.endpointName?.split('/') || [];
    // Return the second last part if it exists, otherwise 'N/A'
    return (parts.length > 1 && this.modalData.endpointName.includes('/'))
      ? parts[parts.length - 2]
      : 'N/A';
  }

  getMethodFromEndpoint(): string {
    // Check if endpointName contains '/' and split it
    const parts = this.modalData?.endpointName?.split('/') || [];
    // Return the last part if it exists, otherwise 'N/A'
    return (parts.length > 0 && this.modalData.endpointName.includes('/'))
      ? parts[parts.length - 1]
      : 'N/A';
  }

}
