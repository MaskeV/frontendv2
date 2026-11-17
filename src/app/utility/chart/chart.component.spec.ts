import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartComponent } from './chart.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ChartComponent', () => {
  let component: ChartComponent;
  let fixture: ComponentFixture<ChartComponent>;

  beforeEach(async () => {
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 1000,
      height: 600,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => { },
    });
    await TestBed.configureTestingModule({
      imports: [ChartComponent, HttpClientTestingModule]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ChartComponent);
    component = fixture.componentInstance;
    component.chartType = 'line';
    component.lineChartOptions = {
      title: { text: 'Test Chart' },
      xAxis: { categories: ['A', 'B', 'C'] },
      series: [{
        type: 'line',  // <-- add this!
        data: [1, 2, 3]
      }]
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
