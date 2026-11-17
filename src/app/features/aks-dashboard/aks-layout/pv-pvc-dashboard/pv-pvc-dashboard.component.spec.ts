import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PvPvcDashboardComponent } from './pv-pvc-dashboard.component';

describe('PvPvcDashboardComponent', () => {
  let component: PvPvcDashboardComponent;
  let fixture: ComponentFixture<PvPvcDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PvPvcDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PvPvcDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
