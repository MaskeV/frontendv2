import { TestBed } from '@angular/core/testing';

import { SingleValueService } from './single-value.service';

describe('SingleValueService', () => {
  let service: SingleValueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SingleValueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('buildChartObject() is working', () => {
    let response = "<div id='123-graph-div' class='text-center text-light' style='height: 100%;'><h3 id='123-graph-title'>undefined</h3><h1 id='123-graph-content'>myChartData</h1></div>";

    let jsonObject = { "chartId": 123, "chartData": "myChartData" }
    let result = service.buildChartObject(jsonObject);
    expect(result).toBe(response);
    console.log(result);
  });

});
