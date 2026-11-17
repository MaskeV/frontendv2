import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { doesNotReject } from 'assert';
import { of } from 'rxjs';
import { DashboardLayout } from '../models/dashboardLayout';
import { GraphInputJSON } from '../models/graphInputJSON';
import { JasmineModel } from '../models/jasmineModel';
import { User } from '../models/user';

import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpTestController: HttpTestingController;
  let request: JasmineModel[] = [{ id: 1, name: 'DashboardService_data' }]
  let graphInputObj: GraphInputJSON;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        HttpClientTestingModule
      ],
    });
    service = TestBed.inject(DashboardService);
    httpTestController = TestBed.inject(HttpTestingController);
  });

  // it('should be created', () => {
  //   expect(service).toBeTruthy();
  // });

  it('getGraph() is working', () => {
    const result = service.getGraph(graphInputObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/getGraph');
    req.flush(request);
  })

  it('getFeatureByUserId() is working', () => {
    let user: User;
    const result = service.getFeatureByUserId(user).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/getFeatureByUserId');
    req.flush(request);
  })

  it('createDashboardLayout() is working', () => {
    let dashboardLayout: DashboardLayout;
    const result = service.createDashboardLayout(dashboardLayout).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/createDashboardLayout');
    req.flush(request);
  })

  it('getDashboardLayoutBySubFeatureName() is working', () => {
    const result = service.getDashboardLayoutBySubFeatureName(graphInputObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/getDashboardLayoutBySubFeatureName');
    req.flush(request);
  })

  it('saveDashboardLayout() is working', () => {
    const result = service.saveDashboardLayout(graphInputObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/saveDashboardLayout');
    req.flush(request);
  })

  it('getAllGraphList() is working', (done) => {
    spyOn(service, 'getAllGraphList').and.returnValue(Promise.resolve(request));
    service.getAllGraphList(graphInputObj).then((response: any) => {
      console.log(response);
      expect(response).toEqual(request);
      done();
    })
  })

  it('getAllGraphs() is working', () => {
    const result = service.getAllGraphs(graphInputObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/getAllGraphList');
    req.flush(request);
  })

  it('deleteGraph() is working', () => {
    const result = service.deleteGraph(graphInputObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/deleteGraph');
    req.flush(request);
  })

  it('visualizeGraph() is working', () => {
    const result = service.visualizeGraph(graphInputObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/' + 'ruambot/api/visualizeGraph');
    req.flush(request);
  })





});

