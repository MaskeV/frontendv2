import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDashboardPageComponent } from './custom-dashboard-page.component';

describe('CustomDashboardPageComponent', () => {
  let component: CustomDashboardPageComponent;
  let fixture: ComponentFixture<CustomDashboardPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDashboardPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomDashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
