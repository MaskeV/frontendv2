
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';


interface CriteriaRow {
  condition: string;
  column: string;
  type: string;
  value: string;
}


@Component({
    selector: 'app-custom-report-form',
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './custom-report-form.component.html',
    styleUrl: './custom-report-form.component.css'
})

export class CustomReportFormComponent {
  @Output() closeForm = new EventEmitter<void>();
  @ViewChild('selectedBox') selectedBox!: ElementRef<HTMLDivElement>;
  criteriaRows: CriteriaRow[] = [
    { condition: 'AND', column: '', type: '', value: '' }
  ];


  onSaveOrCancel() {
    this.closeForm.emit();
  }

  availableColumns: { group: string, items: string[] }[] = [
    { group: 'Hardware', items: ['Hardware Name', 'Hardware Detected Time', 'Hardware Type', 'Manufacturer', 'Serial Number', 'Hardware Status'] },
    { group: 'Printer', items: ['Printer Driver Name', 'Printer Port Name', 'Printer Type', 'Printer Status', 'Print Queue', 'Default Printer'] },
    { group: 'Network Adapter', items: ['NW Adapter Domain', 'NW Adapter Host', 'IP Address', 'MAC Address', 'Connection Type', 'Link Speed'] },
    { group: 'CPU', items: ['Processor Name', 'Core Count', 'Thread Count', 'Clock Speed', 'Architecture', 'Cache Size'] },
    { group: 'Memory', items: ['Total RAM', 'Available RAM', 'Memory Type', 'Memory Speed', 'Memory Slots Used'] },
    { group: 'Storage', items: ['Disk Name', 'Disk Type', 'Total Space', 'Free Space', 'Partition Count', 'Disk Status'] },
    { group: 'Operating System', items: ['OS Name', 'OS Version', 'OS Architecture', 'Install Date', 'Last Boot Time'] },
    { group: 'User Info', items: ['User Name', 'User Domain', 'Login Time', 'User Role', 'Session Duration'] },
    { group: 'Software', items: ['Installed Applications', 'Antivirus Name', 'Firewall Status', 'Update Status'] },
    { group: 'Display', items: ['Monitor Name', 'Resolution', 'Refresh Rate', 'Graphics Card', 'Display Port'] }
  ];

  selectedColumns: string[] = [];

  selectedFromAvailable: string[] = [];
  selectedFromSelected: string[] = [];

  isMouseDown = false;



  addCriteriaRow(): void {
    this.criteriaRows.push({ condition: 'AND', column: '', type: '', value: '' });
  }


  removeCriteriaRow(index: number): void {
    if (this.criteriaRows.length > 1) {
      this.criteriaRows.splice(index, 1);
    }
  }
  toggleAvailableSelection(item: string, event: MouseEvent, isHover = false) {
    if (isHover && !this.isMouseDown) return;

    const index = this.selectedFromAvailable.indexOf(item);
    if (index > -1 && isHover) return; // don't unselect while dragging

    if (index > -1) {
      this.selectedFromAvailable.splice(index, 1);
    } else {
      this.selectedFromAvailable.push(item);
    }
  }

  toggleSelectedSelection(item: string, event: MouseEvent, isHover = false) {
    if (isHover && !this.isMouseDown) return;

    const index = this.selectedFromSelected.indexOf(item);
    if (index > -1 && isHover) return;

    if (index > -1) {
      this.selectedFromSelected.splice(index, 1);
    } else {
      this.selectedFromSelected.push(item);
    }
  }

  moveToSelected() {
    this.selectedColumns.push(...this.selectedFromAvailable);
    this.selectedColumns = Array.from(new Set(this.selectedColumns));
    this.selectedFromAvailable = [];
  }

  deleteFromSelected() {
    this.selectedColumns = this.selectedColumns.filter(
      item => !this.selectedFromSelected.includes(item)
    );
    this.selectedFromSelected = [];
    this.isMouseDown = false;
  }

  onMouseDown() {
    this.isMouseDown = true;
  }

  onMouseUp() {
    this.isMouseDown = false;
  }

  scrollSelectedBox(direction: 'up' | 'down') {
    const scrollAmount = 50;
    if (this.selectedBox) {
      this.selectedBox.nativeElement.scrollBy({
        top: direction === 'up' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }


}
