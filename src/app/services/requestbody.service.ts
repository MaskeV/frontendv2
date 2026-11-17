// @ts-nocheck
import { Injectable } from '@angular/core';
import { datasourceDetails } from '../models/datasource';
import { Metric, Query } from '../models/Query';

@Injectable({
  providedIn: 'root'
})

export class RequestbodyService {

  refreshRequestBody(queryDetailsList: Query[], datasource: datasourceDetails) {

    console.log(queryDetailsList);

    let queryCounter = 0;
    let requestBody = "";
    let multiQueryRequestBody = "";
    let lte = "0000000000000";
    let gte = "1111111111111";
    let timeFieldName = "";
    let multipleQueryStringList = new Array();
    let URLforAPI = "_msearch?max_concurrent_shard_requests=5";
    let requestBodyAndURL = new Array();
    let metricAggs = 1;
    let luceneQuery = "";
    if (datasource != null) {
      if (queryDetailsList.length) {
        URLforAPI = datasource.datasourceURL + "/" + URLforAPI;

        queryDetailsList.forEach((queryDetails, index) => {
          let queryMetricListLength = queryDetails.queryMetricList.length;
          let aggsCounter = queryMetricListLength + 1;
          requestBody = "";
          queryCounter++;
          let metricList: Metric[] = [];
          metricList = queryDetails.queryMetricList;
          let closingBrackets = "}";
          let metricListBracket = 0;

          if (datasource.timeFieldName != null) {
            timeFieldName = datasource.timeFieldName;
          } else {
            timeFieldName = "timestamp";
          }

          requestBody = "{\"search_type\":\"query_then_fetch\",\"ignore_unavailable\":true,\"index\":\"" + datasource.indexName + "\"}\n";

          if (queryDetails.isQueryRawData) {
            if (queryDetails.rawDataSize == null || queryDetails.rawDataSize == "No Limit") {
              queryDetails.rawDataSize = 500;
            }
            requestBody = requestBody + "{\"size\":" + queryDetails.rawDataSize + ",\"query\":{\"bool\":{\"filter\":[{\"range\":{\"" +
              timeFieldName + "\":{\"gte\":" + gte + ",\"lte\":" + lte + ",\"format\":\"epoch_millis\"}}}]}},\"sort\":[{\"" +
              timeFieldName + "\":{\"order\":\"desc\",\"unmapped_type\":\"boolean\"}},{\"_doc\":{\"order\":\"desc\"}}],\"script_fields\":{}}";
          } else {
            requestBody = requestBody + "{\"size\":0,\"query\":{\"bool\":{\"filter\":[{\"range\":{\"" + timeFieldName + "\":{\"gte\":" + gte
              + ",\"lte\":" + lte + ",\"format\":\"epoch_millis\"}}}";

            if (queryDetails.luceneQuery != null) {
              luceneQuery = queryDetails.luceneQuery;
              luceneQuery = luceneQuery.split("\"").join("\\\"");
              luceneQuery = ",{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"" + luceneQuery + "\"}}]}},";
              requestBody = requestBody + luceneQuery;
            } else {
              requestBody = requestBody + "]}},";
            }

            if (queryDetails.queryGroupByList.length > 0) {
              let queryGroupTempList = queryDetails.queryGroupByList;
              queryGroupTempList.forEach((queryGroupByTemp, index) => {
                aggsCounter++;
                let termsOrder = "";
                let termsField = "";
                let termsSize = "";
                let termsMinDocCount = "";
                let dateHistogram = "";
                let filters = "";
                let filterQuery = "";
                if (queryGroupByTemp.groupBy.length > 0) {
                  if (queryGroupByTemp.groupBy == "Terms") {
                    if (queryGroupByTemp.termsSize == null || queryGroupByTemp.termsSize == "No Limit") {
                      queryGroupByTemp.termsSize = 500;
                    }
                    termsField = "\"aggs\":{\"" + aggsCounter + "\":{\"terms\":{\"field\":\"" + queryGroupByTemp.termsField + "\",";
                    termsSize = "\"size\":" + queryGroupByTemp.termsSize + ",";

                    if (queryGroupByTemp.termsOrder == "Bottom") {
                      termsOrder = "\"order\":{\"_key\":\"asc\"},";
                    } else {
                      termsOrder = "\"order\":{\"_key\":\"desc\"}";
                    }
                    if (queryGroupByTemp.termsMinDocCount != null) {
                      termsMinDocCount = ",\"min_doc_count\":" + queryGroupByTemp.termsMinDocCount + "},";
                    }
                    requestBody = requestBody + termsField + termsSize + termsOrder + termsMinDocCount;

                  } else if (queryGroupByTemp.groupBy == "Filters") {
                    filterQuery = queryGroupByTemp.filtersQuery;
                    if (filterQuery != null) {
                      filterQuery = filterQuery.split("\"").join("\\\"");
                    }

                    if (queryGroupByTemp.filtersLabel != null) {
                      filters = "\"aggs\":{\"" + aggsCounter + "\":{\"filters\":{\"filters\":{\"" + queryGroupByTemp.filtersLabel
                        + "\":{\"query_string\":{\"query\":\"" + filterQuery
                        + "\",\"analyze_wildcard\":true}}}},";
                      requestBody = requestBody + filters;
                    } else {
                      filters = "\"aggs\":{\"" + aggsCounter + "\":{\"filters\":{\"filters\":{\"" + filterQuery
                        + "\":{\"query_string\":{\"query\":\"" + filterQuery
                        + "\",\"analyze_wildcard\":true}}}},";
                      requestBody = requestBody + filters;
                    }

                  } else if (queryGroupByTemp.groupBy == "DateHistogram") {
                    if( queryGroupByTemp.interval != null ||  queryGroupByTemp.interval != undefined ||  queryGroupByTemp.interval != ""){
                    dateHistogram = "\"aggs\":{\"" + aggsCounter + "\":{\"date_histogram\":{\"field\": \""
                      + queryGroupByTemp.dateHistogramField + "\",\"min_doc_count\":"
                      + queryGroupByTemp.dateHistogramMinDocCount
                      + ",\"extended_bounds\":{\"min\":" + gte + ",\"max\":" + lte
                      + "},\"format\":\"epoch_millis\",\"fixed_interval\":\""+ queryGroupByTemp.interval +"\"},";
                   } else{
                      dateHistogram = "\"aggs\":{\"" + aggsCounter + "\":{\"date_histogram\":{\"field\": \""
                      + queryGroupByTemp.dateHistogramField + "\",\"min_doc_count\":"
                      + queryGroupByTemp.dateHistogramMinDocCount
                      + ",\"extended_bounds\":{\"min\":" + gte + ",\"max\":" + lte
                      + "},\"format\":\"epoch_millis\",\"fixed_interval\":\"1d\"},";
                    }

                    requestBody = requestBody + dateHistogram;
                  }

                }
              });
            }

            if (queryMetricListLength > 0) {
              let metricList = queryDetails.queryMetricList;
              if (queryMetricListLength == 1) {
                metricList.forEach((metric, index) => {
                  let metricType = "";
                  if (metric.metricType == "Count") {
                    requestBody = requestBody + "\"aggs\":{}";
                  } else {
                    if (metric.metricType == "Average") {
                      metricType = "avg";
                    } else if (metric.metricType == "Min") {
                      metricType = "min";
                    } else if (metric.metricType == "Max") {
                      metricType = "max";
                    } else if (metric.metricType == "Sum") {
                      metricType = "sum";
                    }
                    requestBody = requestBody + "\"aggs\":{\"" + metricAggs + "\":{\""
                      + metricType + "\":{\"field\":\"" + metric.metricField + "\"}}}";
                  }
                });
                metricListBracket = 0;
              } else {
                closingBrackets = closingBrackets + "}"
                requestBody = requestBody + "\"aggs\":{\"";
                let i = 0;
                let counter = 2;
                metricList.forEach((metric, index) => {
                  counter++;
                  if (metric.metricType == "Count") {
                    metricListBracket--;
                  }
                  if (metric.metricType != "Count") {
                    let metricType = "";
                    if (metric.metricType == "Average") {
                      metricType = "avg";
                    } else if (metric.metricType == "Min") {
                      metricType = "min";
                    } else if (metric.metricType == "Max") {
                      metricType = "max";
                    } else if (metric.metricType == "Sum") {
                      metricType = "sum";
                    } else if (metric.metricType == "Derivative") {
                      metricType = "derivative";
                    }
                    else if (metric.metricType == "BucketScript") {
                      metricType = "bucket_script";
                    }
                    if (i == 0) {
                      requestBody = requestBody + metricAggs + "\":{\""
                        + metricType + "\":{\"field\":\"" + metric.metricField + "\"}},\"";
                      metric.previousMetricNo = null;
                      metric.previousMetricNo = metric.metricNo;
                      metric.metricNo = metricAggs;
                    }
                    else if (index == queryMetricListLength - 1) {
                      if (metric.metricType == "Derivative") {
                        let tempCounter = this.getAggsCounter(queryDetails, metric, queryMetricListLength);
                        if (metric.derivateUnit != undefined || metric.derivateUnit != null) {
                          requestBody = requestBody + metric.metricNo + "\":{\""
                            + metricType + "\":{\"buckets_path\":\"" + tempCounter + "\",\"unit\": \"" + metric.derivateUnit + "\"}}";
                          // metric.metricNo = i + 1;
                        } else {
                          requestBody = requestBody + metric.metricNo + "\":{\""
                            + metricType + "\":{\"buckets_path\":\"" + tempCounter + "\"}}";
                          // metric.metricNo = i + 1;
                        }

                      } else if (metric.metricType == "BucketScript") {
                        let bucketScriptVariables = this.getBucketScriptVariables(queryDetails, metric, queryMetricListLength);
                        requestBody = requestBody + metric.metricNo + "\":{\""
                          + metricType + "\":{\"buckets_path\": {" + bucketScriptVariables + "}\,\"script\"\:\"" + metric.bucketScriptValue + "\"}}";
                      } else {
                        requestBody = requestBody + metric.metricNo + "\":{\""
                          + metricType + "\":{\"field\":\"" + metric.metricField + "\"}}";
                        // metric.metricNo = i + 1;
                      }
                    } else {
                      if (metric.metricType == "Derivative") {
                        let tempCounter = this.getAggsCounter(queryDetails, metric, queryMetricListLength);
                        if (metric.derivateUnit != undefined || metric.derivateUnit != null) {
                          requestBody = requestBody + metric.metricNo + "\":{\""
                            + metricType + "\":{\"buckets_path\":\"" + tempCounter + "\",\"unit\": \"" + metric.derivateUnit + "\"}},\"";
                          // metric.metricNo = i + 1;
                        } else {
                          requestBody = requestBody + metric.metricNo + "\":{\""
                            + metricType + "\":{\"buckets_path\":\"" + tempCounter + "\"}},\"";
                          // metric.metricNo = i + 1;
                        }
                      } else if (metric.metricType == "BucketScript") {
                        let bucketScriptVariables = this.getBucketScriptVariables(queryDetails, metric, queryMetricListLength);
                        requestBody = requestBody + metric.metricNo + "\":{\""
                          + metricType + "\":{\"buckets_path\": {" + bucketScriptVariables + "}\,\"script\"\:\"" + metric.bucketScriptValue + "\"}},\"";
                      } else {
                        requestBody = requestBody + metric.metricNo + "\":{\""
                          + metricType + "\":{\"field\":\"" + metric.metricField + "\"}},\"";
                        // metric.metricNo = i + 1;
                      }
                    }
                    i++;
                    metricListBracket++;
                  }
                });
              }
            }
            aggsCounter = aggsCounter - (queryMetricListLength + 1);
            let closingBracketLoopLength = aggsCounter * 2;
            for (let j = 0; j < closingBracketLoopLength; j++) {
              closingBrackets = closingBrackets + "}";
            }
            requestBody = requestBody + closingBrackets;
          }
        });
      }
      if (queryCounter > 1) {
        multipleQueryStringList.forEach((query, index) => {
          if (multipleQueryStringList.indexOf(query) == 0) {
            multiQueryRequestBody = query;
          } else {
            multiQueryRequestBody = multiQueryRequestBody + "\n" + query;
          }
        });
        requestBodyAndURL.push(multiQueryRequestBody);
        requestBodyAndURL.push(URLforAPI);
      } else {
        requestBodyAndURL.push(requestBody);
        requestBodyAndURL.push(URLforAPI);
      }
    }
    return requestBodyAndURL;
  }

  getAggsCounter(queryDetails: Query, metric: Metric, queryMetricListLength) {
    let aggsCounter;
    let i = 0;
    console.log(metric);
    if (metric.derivateField == "Count") {
      aggsCounter = "_count";
    } else {
      if (metric.derivativeMetricIndexNo == 0) {
        aggsCounter = 1;
      } else {
        for (let k = 0; k < queryMetricListLength; k++) {
          if (queryDetails.queryMetricList[k].metricType != "Count") {
            if (metric.derivativeMetricIndexNo == queryDetails.queryMetricList[k].previousMetricNo) {
              aggsCounter = queryDetails.queryMetricList[k].metricNo;
              break;
            }
            if (queryDetails.queryMetricList[k].metricNo == metric.derivativeMetricIndexNo) {
              aggsCounter = queryDetails.queryMetricList[k].metricNo;
              break;
            }
          }
        }
      }
    }
    return aggsCounter;
  }

  getBucketScriptVariables(queryDetails: Query, metric: Metric, queryMetricListLength) {
    console.log(metric);
    let bucketScriptVariable = "";
    let tempVar = "";
    let bucketScriptListLength = metric.metricBucketScriptList.length;
    if (bucketScriptListLength > 0) {
      for (let i = 0; i < bucketScriptListLength; i++) {
        let tempVar2 = "\"" + metric.metricBucketScriptList[i].bucketScriptVariable + "\": \"";
        let aggsCounter;
        let m = 0;
        if (metric.metricBucketScriptList[i].bucketScriptField == "Count") {
          aggsCounter = "_count";
        } else {
          if (metric.metricBucketScriptList[i].derivativeMetricIndexNo == 0) {
            aggsCounter = 1;
          } else {
            for (let k = 0; k < queryMetricListLength; k++) {
              if (queryDetails.queryMetricList[k].metricType != "Count") {
                m++;
                if (queryDetails.queryMetricList[k].metricNo == metric.metricBucketScriptList[i].derivativeMetricIndexNo) {
                  aggsCounter = queryDetails.queryMetricList[k].metricNo;
                  break;
                }
              }
            }
          }

        }
        if (i == bucketScriptListLength - 1) {
          tempVar2 = tempVar2 + aggsCounter + "\""
        } else {
          tempVar2 = tempVar2 + aggsCounter + "\","
        }
        tempVar = tempVar + tempVar2;
      }
      bucketScriptVariable = tempVar;
    } else {
      bucketScriptVariable = "";
    }
    return bucketScriptVariable;
  }
}