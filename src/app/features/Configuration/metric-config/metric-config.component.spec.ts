import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricConfigComponent } from './metric-config.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MetricConfigComponent', () => {
  let component: MetricConfigComponent;
  let fixture: ComponentFixture<MetricConfigComponent>;

  beforeEach(async () => {
    const mockUser = {
      userId: 'testUserId',
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    await TestBed.configureTestingModule({
      imports: [MetricConfigComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetricConfigComponent);
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
