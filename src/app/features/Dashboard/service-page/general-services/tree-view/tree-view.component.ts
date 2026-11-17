import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Span } from '../../../../../models/traceData';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TreeNode {
  name: string;
  children: TreeNode[];
  span: Span;
}


@Component({
    selector: 'app-tree-view',
    imports: [CommonModule, FormsModule],
    templateUrl: './tree-view.component.html',
    styleUrl: './tree-view.component.css'
})

export class TreeViewComponent implements OnChanges {

  @Input() traceData!: Array<Span>;
  @Output() selectedNode = new EventEmitter<Span>();
  private treeData: any;
  uniqueServiceCodes: string[] = [];
  serviceColorMap: { [serviceCode: string]: string } = {};
  private gradientColors: string[] = [
    '#4B0082',
    '#6A0DAD',
    '#4169E1',
    '#48BFE3',
    '#00A86B',
    '#32CD32',
    '#FFD700'
  ];

  ngOnChanges(changes: SimpleChanges): void {
    d3.select("#treeContainer").select("svg").remove();
    this.traceData = changes['traceData'].currentValue;
    const serviceCodeSet = new Set(this.traceData.map((item: any) => item.serviceCode));
    this.uniqueServiceCodes = Array.from(serviceCodeSet);
    this.generateServiceColors();
    let tempData = JSON.parse(JSON.stringify(this.traceData));
    this.initializeTree(tempData);
  }


  private initializeTree(traceData: Array<Span> | null | undefined): void {
    if (!traceData || traceData.length === 0) {
      return;
    }

    console.log(traceData[0]);

    const headers: Array<Span> = [];
    let root: Span | undefined;

    const connectedData = traceData.map((data: Span) => {
      const spanIdStr = data.spanId !== undefined ? data.spanId.toString() : '';
      data.spanId = (data.segmentId ?? '') + spanIdStr;

      if (data.refs && data.refs.length !== 0) {
        const ref = data.refs[0];
        const parentSegmentId = ref.parentSegmentId ?? '';
        const parentSpanId = ref.parentSpanId ?? '';
        data.parentSpanId = parentSegmentId + parentSpanId;
        headers.push(data);
      } else if (data.parentSpanId === -1) {
        data.parentSpanId = data.traceId ?? '';
        root = data;
      } else {
        const parentSpanIdStr =
          data.parentSpanId !== undefined ? data.parentSpanId.toString() : '';
        data.parentSpanId = (data.segmentId ?? '') + parentSpanIdStr;
      }

      return data;
    });

    if (!root) {
      // No root span found
      return;
    }

    const connectedDataCopy = connectedData.slice();
    const children = this.getChildren(connectedDataCopy, root.traceId ?? '');

    for (const span of headers) {
      const temp = connectedData.slice(connectedData.indexOf(span));
      if (temp.length > 0) {
        const child = this.getChildren(temp, temp[0].spanId ?? '');
        children.push({ name: span.endpointName ?? '', children: child, span });
      }
    }

    this.treeData = { name: root.traceId ?? '', children, span: null };
    this.createTree();
  }


  private breakIntoSegments(data: Array<Span>): Span[][] {
    let segmentId = '';
    const segmentList: Span[][] = [];
    let nodes: Span[] = [];

    data.forEach((span: Span) => {
      const currentSegmentId = span.segmentId ?? '';
      if (currentSegmentId === segmentId) {
        nodes.push(span);
      } else {
        if (nodes.length > 0) {
          segmentList.push(nodes);
        }
        nodes = [span];
        segmentId = currentSegmentId;
      }
    });

    // push last group
    if (nodes.length > 0) {
      segmentList.push(nodes);
    }

    return segmentList;
  }

  private getChildren(segment: Span[], spanId: string | number | undefined): Array<{ name: string; children: any[]; span: Span }> {
    const children: Array<{ name: string; children: any[]; span: Span }> = [];

    while (segment.find((span: Span) => span.parentSpanId === spanId)) {
      const child = segment.find((span: Span) => span.parentSpanId === spanId);
      if (!child) {
        break;
      }

      // remove the child from the segment list
      segment.splice(segment.indexOf(child), 1);

      // recursively get grandchildren
      const childChildren = this.getChildren(segment, child.spanId);

      children.push({
        name: child.endpointName ?? '',
        children: childChildren,
        span: child,
      });
    }

    return children;
  }


  private createTree(): void {
    const container = d3.select('#treeContainer').node() as HTMLElement;
    const tooltip = d3.select('#tooltip');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const initialScale = 0.8;
    const initialWidth = containerWidth / initialScale;
    const initialHeight = containerHeight / 2*initialScale;
    const margin = { left: 200, top: 50, right: 10, bottom: 10 };
    const svg = d3
      .select('#treeContainer')
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .attr(
        'viewBox',
        `${-1 * margin.left} ${-1 * margin.top} ${initialWidth} ${initialHeight}`
      )
      .call(
        d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.7, 3])
          .on('zoom', (event) => {
            g.attr('transform', event.transform);
          })
      )
      .append('g')


    const tree = d3
      .tree()
      .nodeSize([150, 170])
      .separation(function (a, b) {
        return a.parent == b.parent ? 0.25 : 1;
      });
    const data = this.treeData;
    const root = d3.hierarchy(data);
    tree(root);
    const g = svg.append('g');

    // Links
    const link = g
      .selectAll('.link')
      .data(root.descendants().slice(1))
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr(
        'd',
        (d) => {
          if (!d.parent || d.parent.x === undefined || d.parent.y === undefined) {
            return ''; 
          }
          return `
      M${d.y},${d.x}
      C${(d.y! + d.parent.y) / 2},${d.x}
       ${(d.y! + d.parent.y) / 2},${d.parent.x}
       ${d.parent.y},${d.parent.x}
    `;
        }
      )
      .style('fill', 'none')
      .style('stroke', '#555')
      .style('stroke-opacity', '0.4')
      .style('stroke-width', '1.5px')
    // Nodes
    const node = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => 'translate(' + d.y + ',' + d.x + ')')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        tooltip.classed('hide-div', true);
        if (d.data.span) {
          this.selectedNode.emit(d.data.span);
        }
      })
      
      .on('mouseover', (event, d) => {
        tooltip.classed('hide-div', false);
        tooltip.transition().duration(100).style('opacity', 1);

        tooltip.html(
          d.data.span
            ? `<b>${d.data.name}</b><br>${d.data.span.layer}-${d.data.span.component}<br><br>TotalDuration: ${d.data.span.endTime - d.data.span.startTime}ms`
            : d.data.name
        );

        const tipNode = (tooltip.node() as HTMLElement);
        tipNode.style.display = 'block';
        const tipW = tipNode.offsetWidth;
        const tipH = tipNode.offsetHeight;

        const target = event.currentTarget as SVGGraphicsElement;
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        let left = (targetRect.left + targetRect.width / 2) - containerRect.left - (tipW / 2);
        let top = targetRect.top - containerRect.top - tipH - 10;

        // Boundary checks relative to the container
        if (left < 5) left = 5;
        if (left + tipW > containerRect.width - 5) left = containerRect.width - tipW - 5;
        
        // If it goes above the container boundary, show it below the node
        if (top < 0) {
            top = targetRect.bottom - containerRect.top + 10;
        }

        tooltip
          .style('left', left + 'px')
          .style('top', top + 'px');
      })
      .on('mouseout', (event, d) => {
        tooltip.transition().duration(100).style('opacity', 0)
          .on('end', () => {
            tooltip.classed('hide-div', true);
            const tipNode = (tooltip.node() as HTMLElement);
            if (tipNode) tipNode.style.display = 'none';
          });
      });


    node
      .append('circle')
      .attr('r', 10)
      .style('fill', '#edf2f4')
      // .style('stroke', (d: any) => {
      //   if (d.data?.span?.serviceCode && this.serviceColorMap[d.data.span.serviceCode]) {
      //     return this.serviceColorMap[d.data.span.serviceCode];
      //   }
      //   return '#6e40aa';
      // })
      .style('stroke', (d: any) => {
        if (d.data?.span?.isError) {
          return '#ff0000';
        }

        if (
          d.data?.span?.serviceCode &&
          this.serviceColorMap[d.data.span.serviceCode]
        ) {
          return this.serviceColorMap[d.data.span.serviceCode];
        }

        return '#6e40aa';
      })
      .style('stroke-width', '3px')

    node
      .append('text')
      .attr('dy', '.35em')
      .attr('x', (d) => (d.children ? -16 : 13))
      .attr('y', (d) => (d.children ? -15 : -10))
      .style('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .each(function (d) {
        const self = d3.select(this);
        const maxWidth = 100;
        let text = d.data.name;
        self.text(text);
        const node = self.node();
        if (!node) return;

        // if (node.getComputedTextLength() > maxWidth) {
        //   let truncatedText = text;
        //   while (truncatedText.length > 0 && node.getComputedTextLength() > maxWidth) {
        //     truncatedText = truncatedText.slice(0, -1);
        //     self.text(truncatedText + '...');
        //   }
        // }

        if (node.getComputedTextLength() > maxWidth) {
          const separators = ['.', '/'];
          let splitIndex = -1;
          separators.forEach(sep => {
            const idx = text.lastIndexOf(sep);
            if (idx > splitIndex) {
              splitIndex = idx;
            }
          });
          if (splitIndex !== -1) {
            const lastPart = text.substring(splitIndex);
            let prefix = text.substring(0, splitIndex);
            let truncatedText = prefix + '...' + lastPart;
            self.text(truncatedText);
            while (
              prefix.length > 0 &&
              node.getComputedTextLength() > maxWidth
            ) {
              prefix = prefix.slice(0, -1);
              truncatedText = prefix + '...' + lastPart;
              self.text(truncatedText);
            }
          }
        }
      });
    node
      .append('line')
      .attr('x1', (d) => (d.children ? -16 : 13))
      .attr('y1', (d) => (d.children ? 0 : 0))
      .attr('x2', (d) => (d.children ? -70 : 70))
      .attr('y2', (d) => (d.children ? 0 : 0))
      .style('stroke', '#6e40aa')
      .style('stroke-width', '3px');
    node
      .append('text')
      .attr('dy', '.35em')
      .attr('x', (d) => (d.children ? -16 : 13))
      .attr('y', (d) => (d.children ? 15 : 10))
      .style('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .each(function (d) {
        if (!d.data.span) {
          return
        }
        const self = d3.select(this);
        const maxWidth = 100;
        let text = d.data.span.layer + "-" + d.data.span.component;
        self.text(text);
        const node = self.node();
        if (!node) {
          return;
        }

        if (node.getComputedTextLength() > maxWidth) {
          let truncatedText = text;

          while (truncatedText.length > 0 && node.getComputedTextLength() > maxWidth) {
            truncatedText = truncatedText.slice(0, -1);
            self.text(truncatedText + '...');
          }
        }

      });
  }

  private generateServiceColors() {
    const filteredColors = this.gradientColors.filter(color => color !== '#4B0082');

    const colorScale = d3.scaleOrdinal<string>()
      .domain(this.uniqueServiceCodes)
      .range(filteredColors);

    this.serviceColorMap = {};
    this.uniqueServiceCodes.forEach(service => {
      this.serviceColorMap[service] = colorScale(service) as string;
    });
  }

}