import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MrumMonitoringComponent } from './mrum-monitoring.component';

describe('MrumMonitoringComponent', () => {
  let component: MrumMonitoringComponent;
  let fixture: ComponentFixture<MrumMonitoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MrumMonitoringComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MrumMonitoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
