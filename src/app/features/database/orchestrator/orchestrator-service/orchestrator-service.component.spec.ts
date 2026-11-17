import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrchestratorServiceComponent } from './orchestrator-service.component';

describe('OrchestratorServiceComponent', () => {
  let component: OrchestratorServiceComponent;
  let fixture: ComponentFixture<OrchestratorServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrchestratorServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrchestratorServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
