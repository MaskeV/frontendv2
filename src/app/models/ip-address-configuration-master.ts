import { ApplicationMaster } from "./application-master";
import { Session } from "./session";

export class IpAddressConfigurationMaster {

    ipAddrID:any="";
    ipAddress:any="";
    ipType:any="";
    environment:any="";
    createdOn:any;
    updatedOn:any;
    createdBy:any;
    updatedBy:any;
    applicationID:any;
    apm!:ApplicationMaster;
  
    sessionDTO: Session = new Session();
}
