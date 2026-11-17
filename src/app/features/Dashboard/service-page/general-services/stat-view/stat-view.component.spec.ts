import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatViewComponent } from './stat-view.component';

describe('StatViewComponent', () => {
  let component: StatViewComponent;
  let fixture: ComponentFixture<StatViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatViewComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(StatViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate self execution time recursively', () => {
    const parent = {
      startTime: 0, endTime: 100,
      spanId: 1, segmentId: 's1', parentSpanId: -1,
      children: []
    };

    const child = {
      startTime: 20, endTime: 60,
      spanId: 2, segmentId: 's1', parentSpanId: 1,
      children: []
    };

    component.traceMetaData = [parent, child];

    const parentSelf = component.calculateSelfExecTime(parent);
    const childSelf = component.calculateSelfExecTime(child);

    expect(childSelf).toBe(40); // 60-20
    expect(parentSelf).toBe(60); // 100-0 - child(40)
  });

  it('should aggregate trace metadata correctly', () => {
    const spans = [
      {
        endpointName: 'A',
        startTime: 100,
        endTime: 200,
        spanId: "1",
        segmentId: "s1",
        parentSpanId: "-1",
        isError: false
      },
      {
        endpointName: 'A',
        startTime: 120,
        endTime: 180,
        spanId: "2",
        segmentId: "s1",
        parentSpanId: "1",
        isError: false
      }
    ];
    component.traceMetaData = spans;
    component.ngOnInit();
    const a = component.aggregatedData.find(a => a.endpointName === 'A');
    expect(a.maxTime).toBe(60);
    expect(a.minTime).toBe(40);
    expect(a.sumTime).toBe(100);
    expect(a.avgTime).toBe(50);
  });

  it('should mark endpoint as error if any span has isError=true', () => {
    const spans = [
      { endpointName: 'A', startTime: 0, endTime: 10, spanId: 1, segmentId: 's1', parentSpanId: -1, isError: false, children: [] },
      { endpointName: 'A', startTime: 10, endTime: 20, spanId: 2, segmentId: 's1', parentSpanId: -1, isError: true, children: [] }
    ];

    component.traceMetaData = spans;
    component.ngOnInit();

    const endpointA = component.aggregatedData[0];
    expect(endpointA.isError).toBe(true);
  });

  it('should handle empty traceMetaData', () => {
    component.traceMetaData = [];
    component.ngOnInit();
    expect(component.aggregatedData.length).toBe(0);
  });

});
