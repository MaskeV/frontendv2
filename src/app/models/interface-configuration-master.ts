import { Session } from "./session";

export class InterfaceConfigurationMaster {
    interConfigID:any;
    configType:any;
    username:any;
    password:any;
    ip:any;
    port:any;
    createdOn:any;
    updatedOn:any;
    createdBy:any;
    updatedBy:any;
    metadataPath:any;
    protocol:any;
    keyStoreFile:any;
    keyStoreAlias:any;
    keyStorePassword:any;
    organizationUnit:any;
    domainComponent1:any;
    domainComponent2:any;
    applicationId:any;
    caCertificate:any;
    elkId:any;
    emailTest:any;
    senderEmail:any;
    jiraId:any;
    projectKey:any;
    sessionDTO: Session = new Session();
}
