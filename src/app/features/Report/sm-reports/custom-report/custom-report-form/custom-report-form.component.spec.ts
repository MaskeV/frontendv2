import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomReportFormComponent } from './custom-report-form.component';

describe('CustomReportFormComponent', () => {
  let component: CustomReportFormComponent;
  let fixture: ComponentFixture<CustomReportFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomReportFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomReportFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
