import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchTablePipe } from "../../../../../pipes/search-table.pipe";


@Component({
    selector: 'app-table-view',
    imports: [CommonModule, FormsModule, SearchTablePipe],
    providers: [DatePipe],
    templateUrl: './table-view.component.html',
    styleUrl: './table-view.component.css'
})
export class TableViewComponent implements OnInit {

  @Input() traceMetaData: any[] = [];
  @Input() traceId: any = "";
  @Input() searchTableData: string = '';
  @Output() itemSelected = new EventEmitter<any>();
  sortColumn: string = '';
  sortOrder: 'asc' | 'desc' = 'asc';
  searchText: any;
   

  constructor(private datePipe: DatePipe, private router : Router,) { }

  ngOnInit(): void {
   }

  calculateExecTime(startTime: number, endTime: number): number {
    return endTime - startTime;
  }
  
  onItemClick(trace: any): void {
    this.itemSelected.emit(trace);
  }

  formatDate(epochTime: number): string {
    return this.datePipe.transform(epochTime, 'yyyy-MM-dd HH:mm:ss.SSS') || '';
  }

  sortData(column: string): void {
    if (this.sortColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortOrder = 'asc';
    }
    this.traceMetaData.sort((a, b) => {
      let valueA: number, valueB: number;
      if (column === 'execTime') {
        valueA = this.calculateExecTime(a.startTime, a.endTime);
        valueB = this.calculateExecTime(b.startTime, b.endTime);
      } else if (column === 'selfExecTime') {
        valueA = this.calculateSelfExecTime(a);
        valueB = this.calculateSelfExecTime(b);
      } else if (column === 'startTime') {
        valueA = a.startTime;
        valueB = b.startTime;
      }
      else if (column === 'isError') {
        valueA = a.isError;
        valueB = b.isError;
      }else if (column === 'method') {
        valueA = a.endpointName;
        valueB = b.endpointName;
      }else {
        return 0;  // You can extend this for other columns as needed
      }
      if (valueA === valueB) return 0;
      return this.sortOrder === 'asc' ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
    });
  }
  
  calculateSelfExecTime(span: any): number {
    const totalExecTime = this.calculateExecTime(span.startTime, span.endTime);
    let childExecTime = 0;
    const uniqueSpanId = `${span.segmentId}_${span.spanId}`;    
    // Handling case when parentSpanId is -1 and refs are present
    let uniqueParentSpanId = span.parentSpanId === -1 && span.refs?.length > 0
      ? `${span.refs[0].parentSegmentId}_${span.refs[0].parentSpanId}`
      : `${span.segmentId}_${span.parentSpanId}`;  
    // Find child spans by comparing parentSpanId in traceMetaData
    this.traceMetaData.forEach(childSpan => {
      const childUniqueParentSpanId = `${childSpan.segmentId}_${childSpan.parentSpanId}`;
      if (childUniqueParentSpanId === uniqueSpanId) {
        childExecTime += this.calculateExecTime(childSpan.startTime, childSpan.endTime);
      }
    });
    return totalExecTime - childExecTime;
  }  


  getStatusColorClass(isError: boolean): string {
    switch (isError) {
      case true: return 'bg-danger';
      case false: return 'bg-success';
      default: return 'bg-light';
    }
  }

}
