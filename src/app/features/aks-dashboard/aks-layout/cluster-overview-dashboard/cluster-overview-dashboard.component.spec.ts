import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClusterOverviewDashboardComponent } from './cluster-overview-dashboard.component';

describe('ClusterOverviewDashboardComponent', () => {
  let component: ClusterOverviewDashboardComponent;
  let fixture: ComponentFixture<ClusterOverviewDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClusterOverviewDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClusterOverviewDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
