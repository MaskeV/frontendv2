import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TraceDetailsModalComponent } from './trace-details-modal.component';

describe('TraceDetailsModalComponent', () => {
  let component: TraceDetailsModalComponent;
  let fixture: ComponentFixture<TraceDetailsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TraceDetailsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TraceDetailsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
