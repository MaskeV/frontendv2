import { TestBed } from '@angular/core/testing';
import { CapacityPlannerService } from './capacity-planner.service';
import { HttpClientTestingModule } from '@angular/common/http/testing'; 

describe('CapacityPlannerService', () => {
  let service: CapacityPlannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CapacityPlannerService
      ]
    });
    service = TestBed.inject(CapacityPlannerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
