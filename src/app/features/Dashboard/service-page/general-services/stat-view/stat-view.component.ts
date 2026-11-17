import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchTablePipe } from '../../../../../pipes/search-table.pipe';

@Component({
    selector: 'app-stat-view',
    imports: [CommonModule, FormsModule, SearchTablePipe],
    templateUrl: './stat-view.component.html',
    styleUrl: './stat-view.component.css'
})
export class StatViewComponent implements OnInit {

  @Input() traceMetaData: any[] = [];
  @Input() searchTableData: string = '';

  searchText: any;

  aggregatedData: any[] = [];
  sortColumn: string = '';
  sortOrder: 'asc' | 'desc' = 'asc';

  constructor() { }

  ngOnInit(): void {
    this.aggregatedData = this.aggregateTraceData(this.traceMetaData);
  }

  calculateSelfExecTime(span: any): number {
    const totalExecTime = span.endTime - span.startTime;
    let childExecTime = 0;
    const uniqueSpanId = `${span.segmentId}_${span.spanId}`;

    let uniqueParentSpanId = span.parentSpanId === -1 && span.refs?.length > 0
      ? `${span.refs[0].parentSegmentId}_${span.refs[0].parentSpanId}`
      : `${span.segmentId}_${span.parentSpanId}`;

    this.traceMetaData.forEach(childSpan => {
      const childUniqueParentSpanId = `${childSpan.segmentId}_${childSpan.parentSpanId}`;
      if (childUniqueParentSpanId === uniqueSpanId) {
        childExecTime += this.calculateSelfExecTime(childSpan);
      }
    });

    return totalExecTime - childExecTime;
  }


  // aggregateTraceData(spans: any[]): any[] {
  //   const traceMap: { [key: string]: any } = {};

  //   spans.forEach(span => {
  //     const { endpointName } = span;
  //     const selfExecTime = this.calculateSelfExecTime(span);

  //     if (!traceMap[endpointName]) {
  //       traceMap[endpointName] = {
  //         endpointName,
  //         maxTime: 0,
  //         minTime: Infinity,
  //         sumTime: 0,
  //         count: 0,
  //       };
  //     }

  //     const trace = traceMap[endpointName];
  //     trace.maxTime = Math.max(trace.maxTime, selfExecTime);
  //     trace.minTime = Math.min(trace.minTime, selfExecTime);
  //     trace.sumTime += selfExecTime;
  //     trace.count += 1;
  //   });

  //   return Object.values(traceMap).map(trace => ({
  //     ...trace,
  //     avgTime: trace.count === 0 ? 0 : Math.round(trace.sumTime / trace.count),
  //     hits: trace.count,
  //   }));
  // }  

  aggregateTraceData(spans: any[]): any[] {
    const traceMap: { [key: string]: any } = {};

    spans.forEach(span => {
      const { endpointName, isError } = span;
      const selfExecTime = this.calculateSelfExecTime(span);

      if (!traceMap[endpointName]) {
        traceMap[endpointName] = {
          endpointName,
          maxTime: 0,
          minTime: Infinity,
          sumTime: 0,
          count: 0,
          isError: false, // default
        };
      }

      const trace = traceMap[endpointName];
      trace.maxTime = Math.max(trace.maxTime, selfExecTime);
      trace.minTime = Math.min(trace.minTime, selfExecTime);
      trace.sumTime += selfExecTime;
      trace.count += 1;

      if (isError) {
        trace.isError = true;
      }
    });

    const aggregated = Object.values(traceMap).map(trace => ({
      ...trace,
      avgTime: trace.count === 0 ? 0 : Math.round(trace.sumTime / trace.count),
      hits: trace.count,
    }));

    console.log("Aggregated trace data:", aggregated);

    return aggregated;
  }

  sortData(column: string): void {
    if (this.sortColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortOrder = 'asc';
    }

    this.aggregatedData.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA === valueB) return 0;

      if (this.sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

}
