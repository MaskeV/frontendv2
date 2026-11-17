import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CapacityPlannerComponent } from './capacity-planner.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CapacityPlannerComponent', () => {
  let component: CapacityPlannerComponent;
  let fixture: ComponentFixture<CapacityPlannerComponent>;

  beforeEach(async () => {
    const mockUser = {
      userId: 'testUserId',
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    await TestBed.configureTestingModule({
      imports: [CapacityPlannerComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CapacityPlannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up mock after each test to avoid side effects
    sessionStorage.removeItem('currentUser');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
