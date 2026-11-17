import { DTApi } from "./DTApi";
import { Session } from "./session";

export class CronJob {
    /* code by Prasad More */

    /*Code update by RG*/
    userid:any;
    featureName: any;
    jobname: any;
    frequency: any;
    applicationName: any;
    applicationId: any;
    sourceType: any;
    controllerIP: any;
    controllerUsername: any;
    controllerPassword: any;
    controllerPort: any;
    fetchapiquery: any;
    destinationType: any;
    destinationSchemaIndex: any;
    destinationIP: any;
    destinationUsername: any;
    destinationPassword: any;
    destinationPort: any;
    destinationQueryApi: any;
    timestampType: any;
    sourceUrl: any;
    sourceHeaders: any;
    sourcedbtype: any;
    sourcedbschema: any;
    appID: any;
    /*Code update by RG for update*/
    application_name: any;
    application_id: any;
    destination_ip: any;
    destination_password: any;
    destination_port: any;
    destination_schema_index: any;
    destination_type: any;
    destination_userid: any;
    feature_name: any;
    feature_type: any;
    fetch_api_query: any;
    insert_api_query: any;
    source_dbschema: any;
    source_dbtype: any;
    source_headers: any;
    source_ip: any;
    source_password: any;
    source_port: any;
    source_type: any;
    source_url: any;
    source_userid: any;
    timestamp_type: any;
    fetchapi: any;
    /*code update by suraj */
    isactive: string = 'N';
    sessionDTO: Session = new Session();
    restApiToken:any;
    elkId:any;
    createdByUsername:any;
    cronJobApiList : DTApi[]=[];
    jobModule:any;
}