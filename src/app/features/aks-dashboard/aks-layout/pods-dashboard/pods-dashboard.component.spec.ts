import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PodsDashboardComponent } from './pods-dashboard.component';

describe('PodsDashboardComponent', () => {
  let component: PodsDashboardComponent;
  let fixture: ComponentFixture<PodsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PodsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
