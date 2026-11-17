import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SoftwareMeteringComponent } from './software-metering.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SoftwareMeteringComponent', () => {
  let component: SoftwareMeteringComponent;
  let fixture: ComponentFixture<SoftwareMeteringComponent>;

  beforeEach(async () => {
    // Mock sessionStorage with currentUser before TestBed initialization
    const mockUser = {
      userId: 'testUserId',
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    await TestBed.configureTestingModule({
      imports: [SoftwareMeteringComponent, HttpClientTestingModule]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SoftwareMeteringComponent);
    component = fixture.componentInstance;
    // Prepare dummy series data (minimal valid data)
    const dummySeries = [{
      name: 'Test',
      data: [{ x: Date.now(), y: 10 }],
      type: 'line'
    }];

    // Initialize chart options to avoid undefined xAxis errors
    component.topUsedSoftwareHeatMap(dummySeries);
    component.usageTrendChart(dummySeries);
    component.unusedSoftwareChart(dummySeries.map(s => ({ name: 'Software A', y: 20 })));
    component.leastUsedSoftwareHeatMap(dummySeries);
    // component.dailyNewDeviceDiscoveryChart(dummySeries);
    component.dormantDevicesChart(dummySeries.map(s => ({ name: 'Device A', y: 5 })));
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up mock after each test to avoid side effects
    sessionStorage.removeItem('currentUser');
    // console.warn = originalWarn;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
