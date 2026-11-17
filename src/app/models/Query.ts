import { QueryGroupBy } from "./QueryGroupBy";

export class Query {
    id: any;
    queryMetricList: Metric[] = [];
    rawDataSize: any;
    dataSourceId: any;
    queryGroupByList: QueryGroupBy[] = [];
    luceneQuery: any;
    isQueryRawData!: boolean;
    derivativeFieldList: String[] = [];
    
}

export class Metric {
    metricType: any;
    metricField: any;
    metricNo: any;
    previousSelectedMetricType :any= "Select";
    previousSelectedMetricField:any ="Select";
    previoudSelectedDerivativeField:any ="Select";
    isQueryMetricNotSelected!: boolean;
    derivateField: any;
    derivateUnit: any;
    derivativeMetricIndexNo:any;
    bucketScriptValue: any;
    metricBucketScriptList:BucketScript[] = [];
    queryMetricId:any;
    previousMetricNo:any;
}

export class BucketScript {
    bucketScriptVariable: any;
    bucketScriptField: any;
    derivativeMetricIndexNo:any;
}