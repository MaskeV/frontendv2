import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatefulsetsDashboardComponent } from './statefulsets-dashboard.component';

describe('StatefulsetsDashboardComponent', () => {
  let component: StatefulsetsDashboardComponent;
  let fixture: ComponentFixture<StatefulsetsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatefulsetsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatefulsetsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
