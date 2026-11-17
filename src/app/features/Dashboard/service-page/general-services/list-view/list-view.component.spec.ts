import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListViewComponent } from './list-view.component';

describe('ListViewComponent', () => {
  let component: ListViewComponent;
  let fixture: ComponentFixture<ListViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListViewComponent]
    })
    .compileComponents();
    fixture = TestBed.createComponent(ListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build correct hierarchy with levels and children', () => {
  const flat = [
    { spanId: 1, parentSpanId: -1 },
    { spanId: 2, parentSpanId: 1 },
    { spanId: 3, parentSpanId: 2 }
  ];
  const result = component.buildHierarchy(flat);
  expect(result.length).toBe(1);
  expect(result[0].children[0].spanId).toBe(2);
  expect(result[0].children[0].children[0].spanId).toBe(3);
  expect(result[0].level).toBe(0);
  expect(result[0].children[0].level).toBe(1);
  expect(result[0].children[0].children[0].level).toBe(2);
});

it('should calculate earliest start time and max duration', () => {
  component.hierarchicalList = [
    { startTime: 100, endTime: 200, spanId: 1, parentSpanId: -1 },
    { startTime: 120, endTime: 300, spanId: 2, parentSpanId: 1 }
  ];
  component.ngOnInit();
  expect(component.earliestStartTime).toBe(100);
  expect(component.maxDuration).toBe(180); 
});

it('should return visible spans respecting expansion state', () => {
  component.hierarchicalList = [
    {
      spanId: 1,
      expanded: true,
      children: [
        { spanId: 2, expanded: true, children: [] }
      ]
    }
  ];
  const result = component.visibleSpans;
  expect(result.map(s => s.spanId)).toEqual([1, 2]);
  component.hierarchicalList[0].expanded = false;
  const collapsed = component.visibleSpans;
  expect(collapsed.map(s => s.spanId)).toEqual([1]);
});

it('should calculate self execution time correctly', () => {
  const span = {
    startTime: 0,
    endTime: 20,
    children: [
      { startTime: 5, endTime: 10 },
      { startTime: 12, endTime: 15 }
    ]
  };
  const self = component.calculateSelfExecTime(span);
  expect(self).toBe(20 - (5 + 3)); 
});

it('should return same color for same spanId', () => {
  const color1 = component.getColorBySpanId(100, 0);
  const color2 = component.getColorBySpanId(100, 5);
  expect(color1).toBe(color2);
});

it('should generate ticks for maxDuration', () => {
  const ticks = component.getTicks(1000);
  expect(ticks.length).toBe(6); 
  expect(ticks[0].label).toBe('0 ms');
  expect(ticks[5].label).toBe('1000 ms');
});

it('should return sidebar data sorted and without zero execTime', () => {
  component.hierarchicalList = [
    { spanId: 1, startTime: 0, endTime: 10, children: [] },
    { spanId: 2, startTime: 5, endTime: 5, children: [] }
  ];
  const result = component.getSidebarData();
  expect(result.length).toBe(1);
  expect(result[0].span.spanId).toBe(1);
});

it('should emit selected item', () => {
  jest.spyOn(component.itemSelected, 'emit');
  const span = { spanId: 1 };
  component.onItemClick(span);
  expect(component.itemSelected.emit).toHaveBeenCalledWith(span);
});

});
