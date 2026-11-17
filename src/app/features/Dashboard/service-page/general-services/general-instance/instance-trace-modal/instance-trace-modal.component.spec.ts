import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceTraceModalComponent } from './instance-trace-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InstanceTraceModalComponent', () => {
  let component: InstanceTraceModalComponent;
  let fixture: ComponentFixture<InstanceTraceModalComponent>;

  beforeEach(async () => {
    // Mock sessionStorage with currentUser before TestBed initialization
    const mockUser = {
      userId: 'testUserId',
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    await TestBed.configureTestingModule({
      imports: [InstanceTraceModalComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstanceTraceModalComponent);
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
