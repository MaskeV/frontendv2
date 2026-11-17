import { Session } from "./session";

export class FirewallConfigurationMaster {
    id: any;
    applicationId: any;
    firewallName: any;
    firewallType:any;
    firewallURL: any;
    isFirewallAuthEnabled:any;
    firewallUsername: any;
    firewallPassword: any;
    isCAcertificate:any;
    caCertificate:any;
    ipAddress: any;
    port: any;
    dbName: any;
    dbUsername: any;
    dbPassword: any;
    isActive: any;
    frequency: any;
    createdOn: any;
    createdBy: any;
    updatedOn: any;
    updatedBy: any;
    sessionDTO : Session
}