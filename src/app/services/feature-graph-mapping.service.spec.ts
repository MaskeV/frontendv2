import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Graph } from '../models/feature-graph-mapping';
import { JasmineModel } from '../models/jasmineModel';

import { FeatureGraphMappingService } from './feature-graph-mapping.service';

describe('FeatureGraphMappingService', () => {
  let service: FeatureGraphMappingService;
  let httpTestController: HttpTestingController;
  let graphObj: Graph;
  let featureObj: any;
  let request: JasmineModel[] = [{ id: 1, name: 'FeatureGraphMappingService_data' }]

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        HttpClientTestingModule

      ],
    });
    service = TestBed.inject(FeatureGraphMappingService);
    httpTestController = TestBed.inject(HttpTestingController);
  });

  // it('should be created', () => {
  //   expect(service).toBeTruthy();
  // });

  it('createGraphFeatureMap() is working', () => {
    const result = service.createGraphFeatureMap(graphObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/ruambot/' + 'api/createGraph');
    req.flush(request);
  })

  it('updateGraphFeatureMap() is working', () => {
    const result = service.updateGraphFeatureMap(graphObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/ruambot/' + 'api/updateGraph');
    req.flush(request);
  })

  it('deleteGraph() is working', () => {
    const result = service.deleteGraph(graphObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/ruambot/' + 'api/deleteGraph');
    req.flush(request);
  })

  it('getAllFeatures() is working', () => {
    const result = service.getAllFeatures().subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/ruambot/' + 'api/getAllFeatures');
    req.flush(request);
  })

  it('getAllFeatureByFeatureType() is working', () => {
    const result = service.getAllFeatureByFeatureType(featureObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/ruambot/' + 'api/getFeatureByFeatureType');
    req.flush(request);
  })

  it('getSubFeaturesByFeatureId() is working', () => {
    const result = service.getSubFeaturesByFeatureId(featureObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/ruambot/' + 'api/getSubFeaturesByFeatureId');
    req.flush(request);
  })

  it('getSubFeaturesByFeatureName() is working', () => {
    const result = service.getSubFeaturesByFeatureName(featureObj).subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/ruambot/' + 'api/getSubFeaturesByFeatureName');
    req.flush(request);
  })

  it(' getAllGraphs() is working', () => {
    const result = service.getAllGraphs().subscribe((response: any) => {
      expect(response).toEqual(request);
      console.log(response);
    });
    const req = httpTestController.expectOne('/ruambot/' + 'api/getAllGraph');
    req.flush(request);
  })

});
