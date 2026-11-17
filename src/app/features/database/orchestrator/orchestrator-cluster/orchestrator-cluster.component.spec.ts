import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrchestratorClusterComponent } from './orchestrator-cluster.component';

describe('OrchestratorClusterComponent', () => {
  let component: OrchestratorClusterComponent;
  let fixture: ComponentFixture<OrchestratorClusterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrchestratorClusterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrchestratorClusterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
