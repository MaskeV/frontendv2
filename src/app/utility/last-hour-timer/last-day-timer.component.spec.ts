import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LastDayTimerComponent } from './last-day-timer.component';

describe('LastHourTimerComponent', () => {
  let component: LastDayTimerComponent;
  let fixture: ComponentFixture<LastDayTimerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LastDayTimerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LastDayTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
