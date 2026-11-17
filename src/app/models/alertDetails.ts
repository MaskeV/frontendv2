import { Session } from "./session";

export class AlertDetails {
   
    id:any;
    alertName: any;
    applicationId:any;
    applicationType:string = '';
    customAlertName!:string;
    params!:object;
    healthRuleId:any;
    serviceTypeId: any;
    ipAddressId: any;
    dataSource:any;
    query:any;
    requestBody:any;
    createdBy: any;
    createdOn: any;
    editedBy:any;
    editedOn:any;
    sessionDTO: Session = new Session();
    currentValue :any;
    applicationName:any;
    label:any;
    metric:any;
    status :any;
    isMetricColumnAggregated : any;
    ipAddress!: string;
    port!: string;
    dbName!: string;
    dbType: string="";
    dbUsername!: string;
    dbPassword!: string;
    itemId: any;
    healthRuleName!:any
  
}