import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProxyDashboardComponent } from './proxy-dashboard.component';

describe('ProxyDashboardComponent', () => {
  let component: ProxyDashboardComponent;
  let fixture: ComponentFixture<ProxyDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProxyDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProxyDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
