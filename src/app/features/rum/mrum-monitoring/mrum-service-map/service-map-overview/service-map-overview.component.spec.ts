import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceMapOverviewComponent } from './service-map-overview.component';

describe('ServiceMapOverviewComponent', () => {
  let component: ServiceMapOverviewComponent;
  let fixture: ComponentFixture<ServiceMapOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceMapOverviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ServiceMapOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
