import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomAlertComponent } from './custom-alert.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DecoderService } from '../../../services/decoder.service';

class MockDecoderService {
  decryptJson(data: any) {
    return data; // Just return raw data
  }
}

describe('CustomAlertComponent', () => {
  let component: CustomAlertComponent;
  let fixture: ComponentFixture<CustomAlertComponent>;

  beforeEach(async () => {
    const mockUser = {
      userId: 'testUserId',
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    await TestBed.configureTestingModule({
      imports: [CustomAlertComponent, HttpClientTestingModule],
      providers: [
        { provide: DecoderService, useClass: MockDecoderService }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CustomAlertComponent);
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
