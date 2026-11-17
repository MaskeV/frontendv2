import { Session } from "./session";

export class datasourceDetails {

id:any;
datasourceName:any;
indexName:any;
datasourceURL:any;
datasourceUsername:any;
datasourcePassword:any;
createdBy:any;
createdOn:any;
sessionDTO :Session | undefined;
sourceType:any;
authenticationEnabled:any;
timeFieldName:any;
isCAcertificate: any;
caCertificate: any;
}