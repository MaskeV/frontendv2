import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-list-view',
    imports: [CommonModule, FormsModule],
    providers: [DatePipe],
    templateUrl: './list-view.component.html',
    styleUrls: ['./list-view.component.css']
})
export class ListViewComponent implements OnInit {
 @Input() hierarchicalList: any[] = [];
  @Output() itemSelected = new EventEmitter<any>(); 

  earliestStartTime: number = 0;
  maxDuration: number = 0;
  colorMap: Map<string, string> = new Map();

  constructor(public datePipe: DatePipe) {}

  ngOnInit(): void {
    if (!this.hierarchicalList?.length) return;
    this.hierarchicalList = this.buildHierarchy(this.hierarchicalList);
    const allSpans = this.getAllSpans(this.hierarchicalList);
    this.earliestStartTime = Math.min(...allSpans.map(s => s.startTime));
    this.maxDuration = Math.max(...allSpans.map(s => s.endTime - s.startTime));
  }

  getAllSpans(spans: any[]): any[] {
    let result: any[] = [];
    for (let span of spans) {
      result.push(span);
      if (span.children?.length) {
        result = result.concat(this.getAllSpans(span.children));
      }
    }
    return result;
  }

  buildHierarchy(flatList: any[]): any[] {
    const idMap: { [key: string]: any } = {};
    const roots: any[] = [];

    flatList.forEach(span => {
      span.children = [];
      span.expanded = true;
      span.level = 0;
      idMap[span.spanId] = span;
    });

    flatList.forEach(span => {
      if (span.parentSpanId !== -1 && idMap[span.parentSpanId]) {
        const parent = idMap[span.parentSpanId];
        parent.children.push(span);
        span.parent = parent;
        span.level = parent.level + 1;
      } else {
        roots.push(span);
      }
    });

    return roots;
  }

  toggleExpand(span: any) {
    span.expanded = !span.expanded;
  }

  get visibleSpans(): any[] {
    const result: any[] = [];
    const traverse = (spans: any[]) => {
      for (let span of spans) {
        result.push(span);
        if (span.expanded && span.children?.length) {
          traverse(span.children);
        }
      }
    };
    traverse(this.hierarchicalList);
    return result;
  }

  calculateSelfExecTime(span: any): number {
    const total = span.endTime - span.startTime;
    const childTotal = (span.children || []).reduce(
      (acc: number, c: any) => acc + (c.endTime - c.startTime),
      0
    );
    return total - childTotal;
  }

  getColorBySpanId(spanId: string | number, index: number): string {
    if (this.colorMap.has(spanId.toString())) {
      return this.colorMap.get(spanId.toString())!;
    }
    let hue = (index * 137) % 360; // distinct colors
    if (hue < 20 || hue > 340) hue = (hue + 40) % 360;
    if (hue >= 200 && hue <= 230) hue = (hue + 40) % 360;
    const saturation = 55;
    const lightness = 55;
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    this.colorMap.set(spanId.toString(), color);
    return color;
  }

  getColor(span: any, index: number): string {
    return this.getColorBySpanId(span.spanId, index);
  }

  getTicks(maxDuration: number): { position: number; label: string }[] {
    const numberOfTicks = 5;
    const ticks = [];
    for (let i = 0; i <= numberOfTicks; i++) {
      const value = Math.round((maxDuration / numberOfTicks) * i);
      const position = (i / numberOfTicks) * 93;
      ticks.push({ position, label: `${value} ms` });
    }
    return ticks;
  }

  formatIST(epoch: number): string {
    return (
      this.datePipe.transform(
        new Date(epoch),
        'yyyy-MM-dd HH:mm:ss.SSS',
        '+0530'
      ) ?? ''
    );
  }

  onItemClick(item: any): void {
    this.itemSelected.emit(item);
  }

/** Returns spans sorted ascending by exec time for sidebar, excluding zero exec time */
getSidebarData(): any[] {
  const spans = this.getAllSpans(this.hierarchicalList);
  return spans
    .map((span, index) => ({
      span,
      execTime: this.calculateSelfExecTime(span),
      color: this.getColor(span, index)
    }))
    .filter(data => data.execTime > 0) // <-- filter out zero exec time spans
    .sort((a, b) => a.execTime - b.execTime);
}

}


// Since each spanId is unique within a trace
// spanId=1 → green (DB queries)

// spanId=2 → blue (cache)

// spanId=3 → purple (external API)
// When you see the same span repeated, the same color immediately tells you it’s the same operation.
// spanId ensures you can track exactly which operation was slow.