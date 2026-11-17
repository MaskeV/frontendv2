import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApmosysSrgComponent } from './apmosys-srg.component';

describe('ApmosysSrgComponent', () => {
  let component: ApmosysSrgComponent;
  let fixture: ComponentFixture<ApmosysSrgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApmosysSrgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApmosysSrgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
