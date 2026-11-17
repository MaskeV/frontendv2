import { Session } from "./session";

export class SchedulerDetails {

    query: any;
    mailId: any;
    password: any;
    port: any;
    startFromDate: any;
    startFromTime: any;
    monthStartDate: any;
    monthEndDate: any;
    days: any;
    months: any;
    includeHolidays: any;
    ipAddress: any;
    report: any;
    userName: any;
    isActive: any;
    category: any;
    dbName: any;
    createdOn: any;
    createdBy: any;
    schedularID: any;
    reportName: any;
    mailIds: any;
    dbType:any;
    schedularStatus:any;
    weeklyMonthlySchedulerCheck:any;
    applicationId:any;
    applicationName:any;
    isSftpEnable:any;
	sourceType:any;
    api:any;
    requestBody:any;
    apiTimestampType:any;
    apiStartTime:any;    
    apiEndTime:any;
    isExcelEnable:any;
    isCsvEnable:any;
    sessionDTO: Session = new Session();
    elasticUser:any;
    elasticPassword:any;
    caCertificate:any;
    isElasticAuthEnabled:any;
}
