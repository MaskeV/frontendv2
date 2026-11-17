import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { JasmineModel } from '../models/jasmineModel';

import { HaedwareTrendServiceService } from './haedware-trend-service.service';

describe('HaedwareTrendServiceService', () => {
  let service: HaedwareTrendServiceService;
  let request: JasmineModel[] = [{ id: 1, name: 'HaedwareTrendServiceService_data' }];
  let httpTestController: HttpTestingController;
  let fromDateNew: any;
  let tillDateNew: any;
  let DateRange: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        HttpClientTestingModule

      ],
    });
    service = TestBed.inject(HaedwareTrendServiceService);
    httpTestController = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it(' plotCpuHealth() is working', () => {
    const result = service.plotCpuHealth(fromDateNew, tillDateNew, DateRange).subscribe((response: any) => {
      expect(response).toEqual(request);
    });
    const req = httpTestController.expectOne('/BBPS/api' + '/cpuHealthTrendHW?fromDate=undefined&tillDate=undefined&DateRange=undefined');
    req.flush(request);
  })

  it(' plotMemoryHealth is working', () => {
    const result = service.plotMemoryHealth(fromDateNew, tillDateNew, DateRange).subscribe((response: any) => {
      expect(response).toEqual(request);
    });
    const req = httpTestController.expectOne('/BBPS/api' + '/memoryHealthTrendHW?fromDate=undefined&tillDate=undefined&DateRange=undefined');
    req.flush(request);
  })
});
