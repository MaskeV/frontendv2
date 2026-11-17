import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiServerDashboardComponent } from './api-server-dashboard.component';

describe('ApiServerDashboardComponent', () => {
  let component: ApiServerDashboardComponent;
  let fixture: ComponentFixture<ApiServerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiServerDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApiServerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
