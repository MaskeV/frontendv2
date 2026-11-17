import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatePickerSMeteringComponent } from './date-picker-smetering.component';

describe('DatePickerSMeteringComponent', () => {
  let component: DatePickerSMeteringComponent;
  let fixture: ComponentFixture<DatePickerSMeteringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatePickerSMeteringComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatePickerSMeteringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
