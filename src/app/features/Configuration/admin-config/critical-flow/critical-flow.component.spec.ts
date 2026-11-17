import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CriticalFlowComponent } from './critical-flow.component';

describe('CriticalFlowComponent', () => {
  let component: CriticalFlowComponent;
  let fixture: ComponentFixture<CriticalFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CriticalFlowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CriticalFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
