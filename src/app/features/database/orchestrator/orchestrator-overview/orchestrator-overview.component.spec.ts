import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrchestratorOverviewComponent } from './orchestrator-overview.component';

describe('OrchestratorOverviewComponent', () => {
  let component: OrchestratorOverviewComponent;
  let fixture: ComponentFixture<OrchestratorOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrchestratorOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrchestratorOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
