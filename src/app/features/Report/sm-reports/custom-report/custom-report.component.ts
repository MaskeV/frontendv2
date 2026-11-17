import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomReportFormComponent } from './custom-report-form/custom-report-form.component';


interface CriteriaRow {
  condition: string;
  column: string;
  type: string;
  value: string;
}

@Component({
    selector: 'app-custom-report',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        CustomReportFormComponent
    ],
    templateUrl: './custom-report.component.html',
    styleUrl: './custom-report.component.css'
})


export class CustomReportComponent implements OnInit{
  allData = [
    {
      hardwareName: 'Microsoft Print to PDF',
      detectedTime: '2025-07-20 10:45:00',
      manufacturer: 'Microsoft',
      networkInstallations: 2,
      managedInstallations: 2,
      driverName: 'Microsoft Print To PDF',
      portName: 'PortPrompt',
      defaultPrinter: 'No',
      printerType: 'Local Printer'
    },
    {
      hardwareName: 'Microsoft Print to PDF',
      detectedTime: '2025-07-20 10:45:00',
      manufacturer: 'Microsoft',
      networkInstallations: 2,
      managedInstallations: 2,
      driverName: 'Microsoft Print To PDF',
      portName: 'PortPrompt',
      defaultPrinter: 'No',
      printerType: 'Local Printer'
    },
    {
      hardwareName: 'Microsoft Print to PDF',
      detectedTime: '2025-07-20 10:45:00',
      manufacturer: 'Microsoft',
      networkInstallations: 2,
      managedInstallations: 2,
      driverName: 'Microsoft Print To PDF',
      portName: 'PortPrompt',
      defaultPrinter: 'No',
      printerType: 'Local Printer'
    },
    {
      hardwareName: 'Microsoft Print to PDF',
      detectedTime: '2025-07-20 10:45:00',
      manufacturer: 'Microsoft',
      networkInstallations: 2,
      managedInstallations: 2,
      driverName: 'Microsoft Print To PDF',
      portName: 'PortPrompt',
      defaultPrinter: 'No',
      printerType: 'Local Printer'
    },
    {
      hardwareName: 'Microsoft Print to PDF',
      detectedTime: '2025-07-20 10:45:00',
      manufacturer: 'Microsoft',
      networkInstallations: 2,
      managedInstallations: 2,
      driverName: 'Microsoft Print To PDF',
      portName: 'PortPrompt',
      defaultPrinter: 'No',
      printerType: 'Local Printer'
    },
    {
      hardwareName: 'Microsoft Print to PDF',
      detectedTime: '2025-07-20 10:45:00',
      manufacturer: 'Microsoft',
      networkInstallations: 2,
      managedInstallations: 2,
      driverName: 'Microsoft Print To PDF',
      portName: 'PortPrompt',
      defaultPrinter: 'No',
      printerType: 'Local Printer'
    },
    {
      hardwareName: 'Microsoft Print to PDF',
      detectedTime: '2025-07-20 10:45:00',
      manufacturer: 'Microsoft',
      networkInstallations: 2,
      managedInstallations: 2,
      driverName: 'Microsoft Print To PDF',
      portName: 'PortPrompt',
      defaultPrinter: 'No',
      printerType: 'Local Printer'
    },
    {
      hardwareName: 'Microsoft Print to PDF',
      detectedTime: '2025-07-20 10:45:00',
      manufacturer: 'Microsoft',
      networkInstallations: 2,
      managedInstallations: 2,
      driverName: 'Microsoft Print To PDF',
      portName: 'PortPrompt',
      defaultPrinter: 'No',
      printerType: 'Local Printer'
    },
    // Add more records here...
  ];


  addReport:boolean=false
  pageSizeOptions = [5, 10, 20];
  pageSize = 5;
  currentPage = 1;
  totalItems = 0;
  totalPages = 0;
  pagedData: any[] = [];

  ngOnInit() {
    this.totalItems = this.allData.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.updatePagedData();
  }

  updatePagedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = this.currentPage * this.pageSize;
    this.pagedData = this.allData.slice(start, end);
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedData();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagedData();
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }
  addNew(): void {
   this.addReport=true
  }

  handleCloseForm() {
  this.addReport = false;
}


}
