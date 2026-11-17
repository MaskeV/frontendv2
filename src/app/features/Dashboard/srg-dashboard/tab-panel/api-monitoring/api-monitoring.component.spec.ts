import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiMonitoringComponent } from './api-monitoring.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ApiMonitoringComponent', () => {
  let component: ApiMonitoringComponent;
  let fixture: ComponentFixture<ApiMonitoringComponent>;

  beforeEach(async () => {
    // Mock sessionStorage with currentUser before TestBed initialization
    const mockUser = {
      userId: 'testUserId',
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    await TestBed.configureTestingModule({
      imports: [ApiMonitoringComponent,
        HttpClientTestingModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApiMonitoringComponent);
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
