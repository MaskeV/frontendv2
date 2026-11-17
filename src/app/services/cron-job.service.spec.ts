import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CronJob } from '../models/cron-job';
import { JasmineModel } from '../models/jasmineModel';

import { CronJobService } from './cron-job.service';

describe('CronJobService', () => {
  let service: CronJobService;
  let httpTestController: HttpTestingController;
  let request: JasmineModel[] = [{ id: 1, name: 'CapacityPlannerService_data' }];
  let cronJobObj: CronJob;
  let featureName: String

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        HttpClientTestingModule

      ],
    });
    service = TestBed.inject(CronJobService);
    httpTestController = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('updateCronjob() is working', () => {
    const result = service.updateCronjob(cronJobObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/updateCronjob');
    req.flush(request);
  })

  it('checkDBconnection() is working', () => {
    const result = service.checkDBconnection(cronJobObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/checkDBconnection');
    req.flush(request);
  })

  it('deleteCronjob() is working', () => {
    const result = service.deleteCronjob(cronJobObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/deleteCronjob');
    req.flush(request);
  })

  it('getAllCronJob() is working', () => {
    const result = service.getAllCronJob(featureName).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/getAllCronJob');
    req.flush(request);
  })

  it('createCronJob() is working', () => {
    const result = service.createCronJob(cronJobObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/createCronJob');
    req.flush(request);
  })


});
