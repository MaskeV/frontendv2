import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContainerMonitoringComponent } from './container-monitoring.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ContainerMonitoringComponent', () => {
  let component: ContainerMonitoringComponent;
  let fixture: ComponentFixture<ContainerMonitoringComponent>;

  beforeEach(async () => {
    // Mock sessionStorage with currentUser before TestBed initialization
    const mockUser = {
      userId: 'testUserId',
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    await TestBed.configureTestingModule({
      imports: [ContainerMonitoringComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContainerMonitoringComponent);
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
