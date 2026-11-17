import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DaemonsetsDashboardComponent } from './daemonsets-dashboard.component';

describe('DaemonsetsDashboardComponent', () => {
  let component: DaemonsetsDashboardComponent;
  let fixture: ComponentFixture<DaemonsetsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DaemonsetsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DaemonsetsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
