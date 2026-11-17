import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IisMonitoringComponent } from './iis-monitoring.component';

describe('IisMonitoringComponent', () => {
  let component: IisMonitoringComponent;
  let fixture: ComponentFixture<IisMonitoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IisMonitoringComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IisMonitoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
