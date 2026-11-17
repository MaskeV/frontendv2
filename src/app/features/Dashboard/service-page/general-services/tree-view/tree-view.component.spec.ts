import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreeViewComponent } from './tree-view.component';
import * as d3 from 'd3';

describe('TreeViewComponent', () => {
  let component: TreeViewComponent;
  let fixture: ComponentFixture<TreeViewComponent>;

  beforeEach(async () => {
    const sharedMockSelection: any = {
      append: jest.fn(),
      selectAll: jest.fn(),
      data: jest.fn(),
      enter: jest.fn(),
      attr: jest.fn(),
      style: jest.fn(),
      text: jest.fn(),
      remove: jest.fn(),
      call: jest.fn(),
      on: jest.fn(),
      classed: jest.fn(),
      html: jest.fn(),
      transition: jest.fn(),
      duration: jest.fn(),
      each: jest.fn(),
      select: jest.fn(),
      node: jest.fn().mockReturnValue({
        clientWidth: 1000,
        clientHeight: 800,
        getComputedTextLength: jest.fn().mockReturnValue(50)
      })
    };

    Object.keys(sharedMockSelection).forEach(key => {
      if (typeof sharedMockSelection[key] === 'function' && key !== 'node') {
        sharedMockSelection[key].mockReturnValue(sharedMockSelection);
      }
    });

    jest.spyOn(d3, 'select').mockReturnValue(sharedMockSelection);

    jest.spyOn(d3, 'zoom').mockReturnValue((() => {
      const z: any = () => z;
      z.on = jest.fn().mockReturnThis();
      z.scaleExtent = jest.fn().mockReturnThis();
      return z;
    })());

    jest.spyOn(d3, 'tree').mockReturnValue((() => {
      const t: any = (root: any) => root;
      t.nodeSize = jest.fn().mockReturnThis();
      t.separation = jest.fn().mockReturnThis();
      return t;
    })());

    jest.spyOn(d3, 'hierarchy').mockReturnValue({
      descendants: jest.fn().mockReturnValue([
        { x: 0, y: 0, data: { name: 'root', span: null }, parent: null, children: [] },
        { x: 100, y: 100, data: { name: 'child', span: {} }, parent: { x: 0, y: 0 }, children: null }
      ])
    } as any);

    jest.spyOn(d3, 'scaleOrdinal').mockReturnValue((() => {
      const scale: any = (val: string) => '#4B0082';
      scale.domain = jest.fn().mockReturnThis();
      scale.range = jest.fn().mockReturnThis();
      return scale;
    })());

    await TestBed.configureTestingModule({
      imports: [TreeViewComponent]
    })
      .compileComponents();
    fixture = TestBed.createComponent(TreeViewComponent);
    component = fixture.componentInstance;
    const container = document.createElement('div');
    container.id = 'treeContainer';
    document.body.appendChild(container);
    const tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    document.body.appendChild(tooltip);
    fixture.detectChanges();
  });

  afterEach(() => {
    const container = document.getElementById('treeContainer');
    if (container) container.remove();
    const tooltip = document.getElementById('tooltip');
    if (tooltip) tooltip.remove();
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should extract unique service codes on ngOnChanges', () => {
    component.traceData = [
      { serviceCode: 'A', segmentId: 'S1', spanId: 1, parentSpanId: -1, traceId: 'T1' } as any,
      { serviceCode: 'B', segmentId: 'S1', spanId: 2, parentSpanId: 1, traceId: 'T1' } as any,
      { serviceCode: 'A', segmentId: 'S1', spanId: 3, parentSpanId: 1, traceId: 'T1' } as any,
    ];
    component.ngOnChanges({
      traceData: {
        currentValue: component.traceData,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    expect(component.uniqueServiceCodes).toContain('A');
    expect(component.uniqueServiceCodes).toContain('B');
    expect(component.uniqueServiceCodes.length).toBe(2);
  });

  it('should generate colors for each unique service code', () => {
    component.uniqueServiceCodes = ['A', 'B', 'C'];
    (component as any).generateServiceColors();
    expect(Object.keys(component.serviceColorMap)).toEqual(['A', 'B', 'C']);
    expect(component.serviceColorMap['A']).toBeTruthy();
  });

  it('should identify tree root on initializeTree', () => {
    const mockData = [
      { traceId: 'T1', segmentId: 'S1', spanId: 0, parentSpanId: -1, endpointName: 'Root' } as any,
      { traceId: 'T1', segmentId: 'S1', spanId: 1, parentSpanId: 0, endpointName: 'Child' } as any
    ];
    component['initializeTree'](mockData);
    expect(component['treeData'].name).toBe('T1');
  });

  it('should correctly build children for a span', () => {
    const spans = [
      { spanId: 1, parentSpanId: 0, endpointName: 'Root' },
      { spanId: 2, parentSpanId: 1, endpointName: 'Child1' },
      { spanId: 3, parentSpanId: 1, endpointName: 'Child2' },
    ] as any[];
    const result = component['getChildren']([...spans], 1);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Child1');
    expect(result[1].name).toBe('Child2');
  });

  it('should emit selected span when node is clicked', () => {
    const span = { spanId: 1 } as any;
    const emitSpy = jest.spyOn(component.selectedNode, 'emit');
    component.selectedNode.emit(span);
    expect(emitSpy).toHaveBeenCalledWith(span);
  });

  it('should skip tree initialization when traceData is empty', () => {
    const spy = jest.spyOn<any, any>(component, 'initializeTree');
    component.traceData = [];
    component.ngOnChanges({
      traceData: { currentValue: [], previousValue: null, firstChange: true, isFirstChange: () => true }
    });
    expect(spy).toHaveBeenCalledWith([]);
  });

  it('should render SVG tree when traceData is provided', () => {
    component.traceData = [
      { spanId: 0, parentSpanId: -1, segmentId: 'S1', traceId: 'T1', endpointName: 'Root', serviceCode: 'A' } as any,
      { spanId: 1, parentSpanId: 0, segmentId: 'S1', traceId: 'T1', endpointName: 'Child', serviceCode: 'A' } as any,
    ];
    component.ngOnChanges({
      traceData: {
        currentValue: component.traceData,
        previousValue: null,
        isFirstChange: () => true,
        firstChange: true
      }
    });
    expect(d3.select).toHaveBeenCalledWith('#treeContainer');
    expect(component['treeData']).toBeDefined();
    expect(component['treeData'].name).toBe('T1');
  });
});