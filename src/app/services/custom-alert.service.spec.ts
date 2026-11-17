import { TestBed } from '@angular/core/testing';
import { CustomAlertService } from './custom-alert.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CustomAlertService', () => {
  let service: CustomAlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(CustomAlertService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
