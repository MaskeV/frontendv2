import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-flame-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flame-view.component.html',
  styleUrl: './flame-view.component.css'
})

export class FlameViewComponent implements OnInit {
  @Input() hierarchicalList: any[] = [];
  @Output() itemSelected = new EventEmitter<any>();

  ngOnInit(): void {
    if (!this.hierarchicalList?.length) return;
    this.hierarchicalList = this.buildHierarchy(this.hierarchicalList);
  }

  /** Build tree hierarchy */
  buildHierarchy(flatList: any[]): any[] {
    const idMap: { [key: string]: any } = {};
    const roots: any[] = [];

    flatList.forEach(span => {
      span.children = [];
      idMap[span.spanId] = span;
    });

    flatList.forEach(span => {
      if (span.parentSpanId !== -1 && idMap[span.parentSpanId]) {
        const parent = idMap[span.parentSpanId];
        parent.children.push(span);
        span.parent = parent;
      } else {
        roots.push(span);
      }
    });

    return roots;
  }

  /** Duration of a span */
  getDuration(span: any): number {
    return span.endTime - span.startTime;
  }

  /** Position relative to parent */
  getRelativeLeft(span: any): number {
    if (!span.parent) return 0;
    const parentDuration = span.parent.endTime - span.parent.startTime;
    return ((span.startTime - span.parent.startTime) / parentDuration) * 100;
  }

  /** Width relative to parent */
  getRelativeWidth(span: any): number {
    if (!span.parent) return 100;
    const parentDuration = span.parent.endTime - span.parent.startTime;
    return ((span.endTime - span.startTime) / parentDuration) * 100;
  }

  /** Recursive flatten for rendering */
  flattenTree(spans: any[], level: number = 0): any[] {
    let result: any[] = [];
    for (let span of spans) {
      span.level = level;
      result.push(span);
      if (span.children?.length) {
        result = result.concat(this.flattenTree(span.children, level + 1));
      }
    }
    return result;
  }

  get flattenedSpans(): any[] {
    return this.flattenTree(this.hierarchicalList);
  }
}
