import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableViewComponent } from './table-view.component';

describe('TableViewComponent', () => {
  let component: TableViewComponent;
  let fixture: ComponentFixture<TableViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableViewComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TableViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate exec time correctly', () => {
    expect(component.calculateExecTime(100, 150)).toBe(50);
  });

  it('should calculate self exec time by subtracting child spans', () => {
    component.traceMetaData = [
      {
        startTime: 100, endTime: 200,
        spanId: "1", segmentId: "s1", parentSpanId: -1, refs: []
      },
      {
        startTime: 120, endTime: 160,
        spanId: "2", segmentId: "s1", parentSpanId: "1", refs: []
      }
    ];
    const parent = component.traceMetaData[0];
    const result = component.calculateSelfExecTime(parent);
    expect(result).toBe(60);
  });

  it('should sort trace metadata by execTime', () => {
    component.traceMetaData = [
      { startTime: 100, endTime: 150 },
      { startTime: 200, endTime: 210 }
    ];
    component.sortData('execTime');
    expect(component.traceMetaData[0]).toEqual({ startTime: 200, endTime: 210 });
    component.sortData('execTime');
    expect(component.traceMetaData[0]).toEqual({ startTime: 100, endTime: 150 });
  });

  it('should format date using DatePipe', () => {
    const spy = jest.spyOn(component['datePipe'], 'transform')
      .mockReturnValue('2025-01-01 10:00:00');
    const result = component.formatDate(123456);
    expect(result).toBe('2025-01-01 10:00:00');
    expect(spy).toHaveBeenCalled();
  });

  it('should emit selected trace on row click', () => {
    const mockTrace = { id: 1 };
    const spy = jest.spyOn(component.itemSelected, 'emit');
    component.onItemClick(mockTrace);
    expect(spy).toHaveBeenCalledWith(mockTrace);
  });

});
