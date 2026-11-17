import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthScoreMetricConfigComponent } from './health-score-metric-config.component';

describe('HealthScoreMetricConfigComponent', () => {
  let component: HealthScoreMetricConfigComponent;
  let fixture: ComponentFixture<HealthScoreMetricConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthScoreMetricConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HealthScoreMetricConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
