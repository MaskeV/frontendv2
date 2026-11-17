import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-topology-modal',
    imports: [FormsModule, CommonModule],
    templateUrl: './topology-modal.component.html',
    styleUrl: './topology-modal.component.css'
})
export class TopologyModalComponent {

  @Input() node: any;
  @Input() nodes!: any[];
  @Output() inspectNode = new EventEmitter<any>();

  constructor(
    public activeModal: NgbActiveModal,
    private router: Router
  ) { }

  options = [
    // 'Inspect',
    'Alerting',
    'Service Dashboard',
    'Instance Dashboard',
    'Endpoint Dashboard'
  ];

  handleOptionClick(option: string) {
    switch (option) {
      case 'Alerting':
        this.router.navigate(['/alert-notification']);
        this.activeModal.close();
        break;
      case 'Service Dashboard':
        // this.router.navigate(['/service-page/general-service']);
        const overviewTab = document.querySelector('.nav-link[href="#overview"]') as HTMLElement;
        if (overviewTab) {
          overviewTab.click();
        }
        this.activeModal.close();
        break;
      case 'Instance Dashboard':
        this.router.navigate(['/service-page/general-service/general-instance']);
        this.activeModal.close();
        break;
      case 'Endpoint Dashboard':
        this.router.navigate(['/service-page/general-service/general-endpoint']);
        this.activeModal.close();
        break;
      case 'Inspect':
        this.inspectNode.emit(this.node);
        this.activeModal.close('Inspect');
        break;
      default:
        this.activeModal.close();
        break;
    }
  }
}
